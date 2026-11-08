// «Крейт»: создаёт личную вкладку по названию любого аниме/фильма из интернета.
// POST { query } → { id } (вкладка создаётся сразу, контент пишется в фоне)
// GET  ?id=     → статус + данные (поллинг с клиента)
import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import ZAI from "z-ai-web-dev-sdk";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const g = globalThis as unknown as { __prisma?: PrismaClient };
const prisma = g.__prisma ?? new PrismaClient();
g.__prisma = prisma;

const ROOT = process.cwd();
const UA = { "User-Agent": "NoLarp catalog builder 1.0" };
const SHIKI = "https://shikimori.one";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type AnyRec = Record<string, unknown>;

async function setStatus(id: string, status: string, message?: string) {
  await prisma.createdTab.update({
    where: { id },
    data: { status, message: message ?? null, updatedAt: new Date() },
  }).catch(() => undefined);
}

function scoreCandidate(c: AnyRec, q: string): number {
  const ru = String(c.russian ?? "").toLowerCase();
  const name = String(c.name ?? "").toLowerCase();
  const qq = q.toLowerCase();
  const core = qq.replace(/\s*\([^)]*\)\s*/g, "").trim(); // «Начало (Inception)» → «начало»
  // латинские слова запроса: «inception», «john wick»…
  const latin = (qq.match(/[a-z][a-z0-9'’-]{2,}/g) ?? []).filter((w) => !["the", "and", "no"].includes(w));

  let s = 0;
  if (core) {
    if (ru === core) s += 60;
    else if (ru.startsWith(core)) s += 30;
    else if (ru.includes(core)) s += 15;
    else if (name.includes(core) && core.length >= 4) s += 10;
  }
  if (latin.length) {
    const esc = (w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const hits = latin.filter((w) => new RegExp(`\\b${esc(w)}\\b`).test(name)).length;
    // запрос содержит латиницу, а у кандидата её нет — почти наверняка не тот тайтл
    if (hits === 0) s -= 80;
    else if (hits === latin.length) s += 70;
    else s -= 10; // частичное совпадение латиницы — подозрительно
  }
  // популярность как мягкий тир-брейк
  s += Math.min(20, Math.log10(Math.max(10, Number(c.members ?? 10))));
  return s;
}

async function shikiSearch(q: string): Promise<AnyRec | null> {
  const variants = [...new Set([q, q.replace(/\s*\([^)]*\)\s*/g, " ").trim()])].filter(Boolean);
  let best: AnyRec | null = null;
  let bestScore = -Infinity;
  for (const v of variants.slice(0, 2)) {
    const url = `${SHIKI}/api/animes?search=${encodeURIComponent(v)}&limit=10&order=popularity`;
    for (let i = 0; i < 4; i++) {
      try {
        const r = await fetch(url, { headers: UA });
        if (r.status === 429) { await sleep(12000); continue; }
        if (!r.ok) { await sleep(4000); continue; }
        const list = (await r.json()) as Array<AnyRec>;
        if (Array.isArray(list)) {
          for (const c of list) {
            const sc = scoreCandidate(c, q);
            if (sc > bestScore) { bestScore = sc; best = c; }
          }
        }
        break;
      } catch { await sleep(5000); }
    }
  }
  return bestScore >= 20 ? best : null;
}

async function shikiFull(id: number): Promise<AnyRec | null> {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(`${SHIKI}/api/animes/${id}`, { headers: UA });
      if (r.ok) return (await r.json()) as AnyRec;
      if (r.status === 429) { await sleep(12000); continue; }
      await sleep(4000);
    } catch { await sleep(5000); }
  }
  return null;
}

/* ---------------- автопересказ ---------------- */

const SCHEMA_HINT = `Верни СТРОГО валидный JSON без markdown-обёрток:
{
 "accent": "#rrggbb",
 "tagline": "слоган одной фразой",
 "synopsis": "аннотация 2-3 предложения без спойлеров",
 "plot": { "intro": "вводка 2-3 предложения", "chapters": [ { "title": "глава", "text": "подробный пересказ 150-220 слов, с концовкой" } ] },
 "characters": [ { "name": "Имя (рус)", "original": "Original Name", "role": "главный герой", "desc": "кто это и его роль, 2-3 предложения", "quote": "известная фраза" } ],
 "music": { "opening": { "title": "название", "artist": "исполнитель" }, "ending": { "title": "название", "artist": "исполнитель" } },
 "fact": "интересный факт об аниме/фильме, 1-2 предложения"
}
Требования: ровно 4 главы; synopsis — без спойлеров; главы — с полными спойлерами до концовки; 4 персонажа; тексты на русском.`;

async function llmJson(zai: Awaited<ReturnType<typeof ZAI.create>>, prompt: string, tries = 3): Promise<AnyRec | null> {
  for (let i = 0; i < tries; i++) {
    try {
      const c = await zai.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        thinking: { type: "disabled" },
      });
      const raw = (c.choices[0]?.message?.content ?? "").trim()
        .replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("no json");
      return JSON.parse(m[0]) as AnyRec;
    } catch (e) {
      console.log(`[create] llm try ${i + 1} failed:`, (e as Error).message);
      await sleep(18000 + i * 12000);
    }
  }
  return null;
}

/* ---------------- медиа ---------------- */

async function saveMedia(id: string, shikiId: number, zai: Awaited<ReturnType<typeof ZAI.create>> | null, title: string) {
  const dir = path.join(ROOT, "public", "created", id);
  await fs.mkdir(dir, { recursive: true }).catch(() => undefined);

  // постер
  try {
    const r = await fetch(`${SHIKI}/system/animes/original/${shikiId}.jpg`, { headers: UA });
    if (r.ok) await fs.writeFile(path.join(dir, "poster.jpg"), Buffer.from(await r.arrayBuffer()));
  } catch { /* постер не критичен */ }

  // кадры
  let n = 0;
  try {
    const r = await fetch(`${SHIKI}/api/animes/${shikiId}/screenshots`, { headers: UA });
    if (r.ok) {
      const shots = (await r.json()) as Array<{ original?: string }>;
      for (const s of (shots ?? []).slice(0, 6)) {
        if (!s.original) continue;
        try {
          const ir = await fetch(s.original.startsWith("http") ? s.original : `${SHIKI}${s.original}`, { headers: UA });
          if (!ir.ok) continue;
          await fs.writeFile(path.join(dir, `${n + 1}.jpg`), Buffer.from(await ir.arrayBuffer()));
          n++;
        } catch { /* пропуск кадра */ }
        await sleep(400);
      }
    }
  } catch { /* кадры не критичны */ }

  // fallback: автоиллюстрации, если кадров нет
  if (n === 0 && zai) {
    for (let k = 0; k < 3; k++) {
      try {
        const res = await zai.images.generations.create({
          prompt: `${title}, anime key visual, cinematic scene, high detail, no text`,
          size: "1344x768",
        });
        const b64 = res.data[0]?.base64;
        if (!b64) break;
        await fs.writeFile(path.join(dir, `${k + 1}.jpg`), Buffer.from(b64, "base64"));
        n++;
      } catch (e) {
        console.log("[create] image gen failed:", (e as Error).message);
        break;
      }
    }
  }
  return n;
}

/* ---------------- автомедиа (когда Shikimori не нашёл) ---------------- */

async function genImages(id: string, title: string, zai: Awaited<ReturnType<typeof ZAI.create>>) {
  const dir = path.join(ROOT, "public", "created", id);
  await fs.mkdir(dir, { recursive: true }).catch(() => undefined);

  // постер (вертикальный, с фоллбэком на горизонтальный)
  try {
    const res = await zai.images.generations.create({
      prompt: `${title}, anime movie poster art, vertical composition, key visual, no text`,
      size: "768x1344",
    });
    const b64 = res.data[0]?.base64;
    if (b64) await fs.writeFile(path.join(dir, "poster.jpg"), Buffer.from(b64, "base64"));
  } catch {
    try {
      const res = await zai.images.generations.create({
        prompt: `${title}, anime movie poster art, key visual, no text`,
        size: "1344x768",
      });
      const b64 = res.data[0]?.base64;
      if (b64) await fs.writeFile(path.join(dir, "poster.jpg"), Buffer.from(b64, "base64"));
    } catch (e) {
      console.log("[create] poster gen failed:", (e as Error).message);
    }
  }

  // кадры
  let n = 0;
  for (let k = 0; k < 3; k++) {
    try {
      const res = await zai.images.generations.create({
        prompt: `${title}, anime cinematic still, scene ${k + 1}, dramatic lighting, high detail, no text`,
        size: "1344x768",
      });
      const b64 = res.data[0]?.base64;
      if (!b64) break;
      await fs.writeFile(path.join(dir, `${k + 1}.jpg`), Buffer.from(b64, "base64"));
      n++;
    } catch {
      break;
    }
  }
  return n;
}

/* ---------------- фоновый пайплайн ---------------- */

async function run(id: string, query: string) {
  try {
    await setStatus(id, "searching", "Ищем тайтл на Shikimori…");

    const hit = await shikiSearch(query);

    // === Путь БЕЗ Shikimori: любой фильм/сериал из интернета ===
    if (!hit) {
      await setStatus(id, "writing", "На Shikimori не нашли — пересказ пишется по описанию…");
      const zai = await ZAI.create().catch(() => null);
      if (!zai) {
        await prisma.createdTab.update({
          where: { id },
          data: { status: "failed", error: "генерация недоступна. Попробуйте ещё раз." },
        });
        return;
      }
      const data = await llmJson(zai, `Ты — редактор энциклопедии кино и аниме. Известен ли тебе фильм/сериал/аниме «${query}»? Если да — напиши по нему пересказ по своей базе знаний (если это реальное произведение — строго факты о нём; если не находишь такое — честно верни {"notfound": true} и всё).\n\nДополнительно укажи meta: titleEn (оригинальное название латиницей), year (год выпуска), kind ("movie" или "tv"), genres (3-5 жанров по-русски).\n\n${SCHEMA_HINT}`);

      if (!data || data.notfound) {
        await prisma.createdTab.update({
          where: { id },
          data: { status: "failed", error: `произведение не распознано «${query}». Попробуйте уточнить название или латиницу.` },
        });
        return;
      }

      await setStatus(id, "media", "постер генерируется и кадры…");
      let stills = 0;
      try {
        stills = await genImages(id, query, zai);
      } catch (e) {
        console.log("[create] ai media failed:", (e as Error).message);
      }

      const ruTitle = String(data.title ?? "") || query;
      const anime: AnyRec = {
        id,
        title: ruTitle || query,
        titleEn: String(data.titleEn ?? query),
        original: "",
        year: String(data.year ?? "—"),
        yearEnd: null,
        type: data.kind === "tv" ? "ТВ-сериал" : "Фильм",
        episodes: data.kind === "tv" ? "?": 1,
        studio: "",
        genres: Array.isArray(data.genres) ? (data.genres as unknown[]).map(String).slice(0, 5) : [],
        score: 0,
        tagline: String(data.tagline ?? ""),
        synopsis: String(data.synopsis ?? ""),
        accent: /^#[0-9a-f]{6}$/i.test(String(data.accent ?? "")) ? String(data.accent) : "#f7566c",
        plot: data.plot,
        characters: Array.isArray(data.characters) ? data.characters : [],
        music: data.music ?? {},
        fact: String(data.fact ?? ""),
        shikimoriId: null,
        kodikTitle: query,
        poster: `/created/${id}/poster.jpg`,
        stills,
      };

      await prisma.createdTab.update({
        where: { id },
        data: {
          status: "ready",
          title: ruTitle || query,
          message: "Готово (автоиллюстрации)",
          data: JSON.stringify(anime),
          updatedAt: new Date(),
        },
      });
      console.log(`[create] ${id} ready (no-shiki) — «${ruTitle}», stills=${stills}`);
      return;
    }

    // === Обычный путь: тайтл найден на Shikimori ===
    const shikiId = Number(hit.id);
    const meta = (await shikiFull(shikiId)) ?? hit;

    await setStatus(id, "writing", "пересказ пишется…");

    const zai = await ZAI.create().catch(() => null);
    const ruName = String(meta.russian || hit.russian || query);
    const info = `Название: ${ruName} (${String(meta.name ?? "")}). Тип: ${meta.kind === "movie" ? "фильм" : "аниме-сериал"}. Год: ${String(meta.aired_on ?? "").slice(0, 4)}. Эпизодов: ${meta.episodes ?? 1}. Жанры: ${(Array.isArray(meta.genres) ? (meta.genres as Array<AnyRec>).map((x) => String(x.russian ?? x.name)).join(", ") : "")}. Описание с Shikimori: ${String(meta.description ?? meta.description_en ?? "")}`;

    const data = await llmJson(zai as NonNullable<typeof zai>, `Ты — редактор аниме-энциклопедии. По данным ниже напиши пересказ тайтла «${ruName}».\n\n${info}\n\n${SCHEMA_HINT}`);

    const plot = (data?.plot ?? null) as { chapters?: unknown } | null;
    const chapterCount = Array.isArray(plot?.chapters) ? plot.chapters.length : 0;
    if (!data || chapterCount < 2) {
      await prisma.createdTab.update({
        where: { id },
        data: { status: "failed", error: "не удалось написать пересказ. Попробуйте ещё раз." },
      });
      return;
    }

    await setStatus(id, "media", "Загружаем постер и кадры…");
    let stills = 0;
    try {
      stills = await saveMedia(id, shikiId, zai, ruName);
    } catch (e) {
      console.log("[create] media failed:", (e as Error).message);
    }

    const anime: AnyRec = {
      id,
      title: ruName,
      titleEn: String(meta.name ?? query),
      original: String(meta.japanese ?? ""),
      year: String(meta.aired_on ?? "").slice(0, 4) || "—",
      yearEnd: null,
      type: meta.kind === "movie" ? "Фильм" : "ТВ-сериал",
      episodes: Number(meta.episodes) || 1,
      studio: (Array.isArray(meta.studios) && meta.studios.length ? String((meta.studios[0] as AnyRec).name ?? "") : ""),
      genres: Array.isArray(meta.genres) ? (meta.genres as Array<AnyRec>).map((x) => String(x.russian ?? x.name ?? "")).filter(Boolean).slice(0, 5) : [],
      score: Number(meta.score) || 0,
      tagline: String(data.tagline ?? ""),
      synopsis: String(data.synopsis ?? info),
      accent: /^#[0-9a-f]{6}$/i.test(String(data.accent ?? "")) ? String(data.accent) : "#f7566c",
      plot: data.plot,
      characters: Array.isArray(data.characters) ? data.characters : [],
      music: data.music ?? {},
      fact: String(data.fact ?? ""),
      shikimoriId: shikiId,
      poster: `/created/${id}/poster.jpg`,
      stills,
    };

    await prisma.createdTab.update({
      where: { id },
      data: {
        status: "ready",
        title: ruName,
        message: stills > 0 ? "Готово" : "Готово (автоиллюстрации)",
        data: JSON.stringify(anime),
        updatedAt: new Date(),
      },
    });
    console.log(`[create] ${id} ready — «${ruName}», stills=${stills}`);
  } catch (e) {
    console.error(`[create] ${id} failed:`, e);
    await prisma.createdTab.update({
      where: { id },
      data: { status: "failed", error: "Что-то сломалось при создании вкладки. Попробуйте ещё раз." },
    }).catch(() => undefined);
  }
}

/* ---------------- маршруты ---------------- */

export async function POST(req: Request) {
  let query = "";
  try {
    const body = (await req.json()) as { query?: string };
    query = String(body.query ?? "").trim().slice(0, 120);
  } catch { /* пустое тело */ }
  if (!query) {
    return NextResponse.json({ error: "Введите название аниме или фильма" }, { status: 400 });
  }

  const id = `cr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  await prisma.createdTab.create({
    data: { id, query, status: "searching", message: "Создаём вкладку…" },
  });

  // фоном (не await): клиент опрашивает GET /api/create?id=
  void run(id, query);

  return NextResponse.json({ id });
}

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!id || !/^[a-z0-9-]+$/i.test(id)) {
    return NextResponse.json({ error: "bad_id" }, { status: 400 });
  }
  const rec = await prisma.createdTab.findUnique({ where: { id } });
  if (!rec) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const data = rec.data ? (JSON.parse(rec.data) as AnyRec) : undefined;
  return NextResponse.json({
    id: rec.id,
    query: rec.query,
    status: rec.status,
    message: rec.message ?? undefined,
    title: rec.title ?? undefined,
    error: rec.error ?? undefined,
    createdAt: rec.createdAt,
    data,
  });
}
