// Пересборка data/anime-index.json: 100 тайтлов из data/anime/*.json
// + shikimoriId (shiki.json + _new_found.json + jojo), счётчик стиллов, флаг франшизы.
import fs from "fs";
import path from "path";

const ROOT = "/home/z/my-project";
const UA = { "User-Agent": "NoLarp catalog builder 1.0" };
const SHIKI = "https://shikimori.one";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const shikiMap = JSON.parse(fs.readFileSync(path.join(ROOT, "data/shiki.json"), "utf8"));
const found = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts/_new_found.json"), "utf8"));
const idMap = { ...shikiMap, ...(found.created ?? found) };

const JOJO_MAIN = 14719; // часть 1 — постер и стиллы франшизы

async function jget(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: UA });
      if (r.status === 429) { await sleep(15000); continue; }
      if (!r.ok) { await sleep(3000); continue; }
      return await r.json();
    } catch { await sleep(5000); }
  }
  return null;
}

// JoJo: докачать постер и стиллы, если их нет
async function ensureJojoMedia() {
  const poster = path.join(ROOT, "public/posters/jojo.jpg");
  if (!fs.existsSync(poster)) {
    const meta = await jget(`${SHIKI}/api/animes/${JOJO_MAIN}`);
    const url = meta?.image?.original
      ? `${SHIKI}${meta.image.original.split("?")[0]}`
      : `${SHIKI}/system/animes/original/${JOJO_MAIN}.jpg`;
    const r = await fetch(url, { headers: UA });
    if (r.ok) fs.writeFileSync(poster, Buffer.from(await r.arrayBuffer()));
    console.log("jojo: постер скачан");
  }
  const dir = path.join(ROOT, "public/stills/jojo");
  const have = fs.existsSync(dir) ? fs.readdirSync(dir).length : 0;
  if (have < 4) {
    fs.mkdirSync(dir, { recursive: true });
    const shots = await jget(`${SHIKI}/api/animes/26055/screenshots`); // Stardust Crusaders — самый зрелищный арт
    if (Array.isArray(shots)) {
      let n = 0;
      for (const s of shots) {
        if (n >= 6) break;
        try {
          const r = await fetch(s.original.startsWith("http") ? s.original : `${SHIKI}${s.original}`, { headers: UA });
          if (!r.ok) continue;
          fs.writeFileSync(path.join(dir, `${n + 1}.jpg`), Buffer.from(await r.arrayBuffer()));
          n++;
        } catch {}
        await sleep(500);
      }
      console.log(`jojo: стиллов скачано ${n}`);
    }
  }
}

await ensureJojoMedia();

const normGenre = (g) => {
  const s = String(g ?? "").trim();
  return s ? s[0].toUpperCase() + s.slice(1) : "";
};
const normGenres = (x) => [...new Set((Array.isArray(x) ? x : []).map(normGenre).filter(Boolean))];

const files = fs.readdirSync(path.join(ROOT, "data/anime")).filter((f) => f.endsWith(".json")).sort();
const out = [];
for (const f of files) {
  const d = JSON.parse(fs.readFileSync(path.join(ROOT, "data/anime", f), "utf8"));
  const rec = idMap[d.id];
  const stillsDir = path.join(ROOT, "public/stills", d.id);
  const stills = fs.existsSync(stillsDir) ? fs.readdirSync(stillsDir).filter((x) => x.endsWith(".jpg")).length : 0;
  out.push({
    id: d.id,
    title: d.title,
    titleEn: d.titleEn ?? "",
    original: d.original ?? "",
    year: d.year,
    yearEnd: d.yearEnd ?? null,
    type: d.type,
    episodes: d.episodes,
    studio: d.studio ?? "",
    genres: normGenres(d.genres),
    score: d.score,
    tagline: d.tagline ?? "",
    synopsis: d.synopsis ?? "",
    accent: d.accent ?? "#f7566c",
    chapters: d.plot?.chapters?.length ?? 0,
    plotWords: d._totalWords ?? (d.plot ? JSON.stringify(d.plot).split(/\s+/).length : 0),
    charCount: d.characters?.length ?? 0,
    poster: `/posters/${d.id}.jpg`,
    shikimoriId: d.id === "jojo" ? JOJO_MAIN : (rec?.shikimoriId ?? null),
    stills,
    isFranchise: Boolean(d.franchise),
  });
}

fs.writeFileSync(path.join(ROOT, "data/anime-index.json"), JSON.stringify(out, null, 1));
const franchise = out.filter((x) => x.isFranchise).map((x) => x.id);
const noStills = out.filter((x) => x.stills < 2).map((x) => `${x.id}(${x.stills})`);
console.log(`Индекс: ${out.length} тайтлов; франшизы: ${franchise.join(",") || "нет"}; мало стиллов: ${noStills.join(",") || "нет"}`);
