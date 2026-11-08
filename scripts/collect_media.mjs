// Сбор данных с Shikimori: мета, постеры, кадры (screenshots) для всех тайтлов
// + поиск ID новых 23 тайтлов и частей JoJo.
import fs from "fs";
import path from "path";

const ROOT = "/home/z/my-project";
const PUB = path.join(ROOT, "public");
const UA = { "User-Agent": "NoLarp catalog builder 1.0" };
const SHIKI = "https://shikimori.one";

const NEW_TITLES = [
  { id: "spirited-away", q: "Spirited Away", want: "movie" },
  { id: "princess-mononoke", q: "Princess Mononoke", want: "movie" },
  { id: "howls-moving-castle", q: "Howl's Moving Castle", want: "movie" },
  { id: "my-neighbor-totoro", q: "My Neighbor Totoro", want: "movie" },
  { id: "grave-of-the-fireflies", q: "Grave of the Fireflies", want: "movie" },
  { id: "castle-in-the-sky", q: "Castle in the Sky Laputa", want: "movie" },
  { id: "mugen-train", q: "Demon Slayer Mugen Train", want: "movie" },
  { id: "jujutsu-kaisen-0", q: "Jujutsu Kaisen 0", want: "movie" },
  { id: "evangelion-3-0-1-0", q: "Evangelion 3.0+1.0", want: "movie" },
  { id: "suzume", q: "Suzume no Tojimari", want: "movie" },
  { id: "one-piece-film-red", q: "One Piece Film Red", want: "movie" },
  { id: "summer-wars", q: "Summer Wars", want: "movie" },
  { id: "wolf-children", q: "Wolf Children", want: "movie" },
  { id: "girl-who-leapt-through-time", q: "The Girl Who Leapt Through Time", want: "movie" },
  { id: "vinland-saga", q: "Vinland Saga", want: "tv" },
  { id: "parasyte", q: "Kiseijuu Sei no Kakuritsu", want: "tv" },
  { id: "erased", q: "Boku dake ga Inai Machi", want: "tv" },
  { id: "mob-psycho-100", q: "Mob Psycho 100", want: "tv" },
  { id: "gto", q: "Great Teacher Onizuka", want: "tv" },
  { id: "grand-blue", q: "Grand Blue", want: "tv" },
  { id: "fire-force", q: "Enen no Shouboutai", want: "tv" },
  { id: "noragami", q: "Noragami", want: "tv" },
  { id: "classroom-of-the-elite", q: "Youkoso Jitsuryoku Shijou Shugi no Kyoushitsu e", want: "tv" },
];

const JOJO_PARTS = [
  { key: "p12", q: "JoJo's Bizarre Adventure", year: 2012 },
  { key: "p3", q: "JoJo's Bizarre Adventure: Stardust Crusaders", year: null },
  { key: "p3e", q: "Stardust Crusaders: Battle in Egypt", year: null },
  { key: "p4", q: "JoJo's Bizarre Adventure: Diamond is Unbreakable", year: null },
  { key: "p5", q: "JoJo's Bizarre Adventure: Golden Wind", year: null },
  { key: "p6", q: "JoJo's Bizarre Adventure: Stone Ocean", year: null },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function jget(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: UA });
      if (r.status === 429) {
        await sleep(3000);
        continue;
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) {
      if (i === tries - 1) throw e;
      await sleep(1500);
    }
  }
}

async function download(url, dest, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: UA });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length < 2000) throw new Error("too small");
      fs.writeFileSync(dest, buf);
      return true;
    } catch (e) {
      if (i === tries - 1) {
        console.log(`  !! download failed ${url}: ${e.message}`);
        return false;
      }
      await sleep(1500);
    }
  }
}

async function searchAnime(q, want) {
  const list = await jget(`${SHIKI}/api/animes?search=${encodeURIComponent(q)}&limit=5`);
  if (!Array.isArray(list) || !list.length) return null;
  const sorted = [...list].sort((a, b) => {
    const typeOk = (x) => (want === "movie" ? x.kind === "movie" : x.kind === "tv");
    return (typeOk(b) ? 1 : 0) - (typeOk(a) ? 1 : 0) || (b.score || 0) - (a.score || 0);
  });
  return sorted[0];
}

async function collectOne(id, shikimoriId) {
  const out = { id, shikimoriId, stills: 0 };
  const meta = await jget(`${SHIKI}/api/animes/${shikimoriId}`);
  out.meta = {
    russian: meta.russian || null,
    name: meta.name,
    japanese: meta.japanese || null,
    year: meta.aired_on ? parseInt(meta.aired_on) : null,
    episodes: meta.episodes || meta.episodes_aired || null,
    episodeDuration: meta.duration || null,
    studio: meta.studios?.[0]?.name || null,
    genres: (meta.genres || []).map((g) => g.russian || g.name).slice(0, 4),
    score: meta.score || null,
    kind: meta.kind,
    description: (meta.description || "").slice(0, 1200),
  };
  const posterDir = path.join(PUB, "posters");
  fs.mkdirSync(posterDir, { recursive: true });
  const posterDest = path.join(posterDir, `${id}.jpg`);
  if (!fs.existsSync(posterDest) || fs.statSync(posterDest).size < 2000) {
    const pUrl = meta.image?.original
      ? `${SHIKI}${meta.image.original}`
      : `${SHIKI}/system/animes/original/${shikimoriId}.jpg`;
    await download(pUrl, posterDest);
  }
  out.posterLocal = `/posters/${id}.jpg`;
  const stillDir = path.join(PUB, "stills", id);
  fs.mkdirSync(stillDir, { recursive: true });
  try {
    const shots = await jget(`${SHIKI}/api/animes/${shikimoriId}/screenshots`);
    const take = shots.slice(0, 6);
    let n = 0;
    for (const s of take) {
      const dest = path.join(stillDir, `${n + 1}.jpg`);
      if (!fs.existsSync(dest) || fs.statSync(dest).size < 2000) {
        const ok = await download(`${SHIKI}${s.original}`, dest);
        if (!ok) continue;
      }
      n++;
    }
    out.stills = n;
  } catch (e) {
    console.log(`  !! stills failed for ${id}: ${e.message}`);
  }
  return out;
}

async function main() {
  const [phase = "all", startArg = "0", endArg = "999"] = process.argv.slice(2);
  const start = parseInt(startArg, 10) || 0;
  const end = parseInt(endArg, 10) || 999;
  const result = { existing: {}, created: {}, jojo: {} };

  console.log("== Поиск 23 новых тайтлов ==");
  if (!fs.existsSync(path.join(ROOT, "scripts", "_new_found.json"))) {
    for (const t of NEW_TITLES) {
      try {
        const found = await searchAnime(t.q, t.want);
        if (!found) {
          console.log(`  !! NOT FOUND: ${t.id} (${t.q})`);
          continue;
        }
        result.created[t.id] = { shikimoriId: found.id, name: found.name, russian: found.russian, kind: found.kind, score: found.score, episodes: found.episodes, year: found.aired_on?.slice(0, 4) };
        console.log(`  ${t.id} -> ${found.id} ${found.name} (${found.kind}, ${found.score})`);
      } catch (e) {
        console.log(`  !! search failed ${t.id}: ${e.message}`);
      }
      await sleep(900);
    }
    fs.writeFileSync(path.join(ROOT, "scripts", "_new_found.json"), JSON.stringify(result.created, null, 2));
  } else {
    Object.assign(result.created, JSON.parse(fs.readFileSync(path.join(ROOT, "scripts", "_new_found.json"), "utf8")));
    console.log("  (пропущено, _new_found.json уже есть)");
  }

  console.log("== Поиск JoJo частей ==");
  const jojoReportPath = path.join(ROOT, "scripts", "_jojo_found.json");
  if (!fs.existsSync(jojoReportPath)) {
    for (const p of JOJO_PARTS) {
      try {
        const found = await searchAnime(p.q, "tv");
        if (found) {
          result.jojo[p.key] = { shikimoriId: found.id, name: found.name, russian: found.russian, episodes: found.episodes, year: found.aired_on?.slice(0, 4) };
          console.log(`  ${p.key} -> ${found.id} ${found.name} (${found.episodes} эп.)`);
        }
      } catch (e) {
        console.log(`  !! jojo search failed ${p.key}: ${e.message}`);
      }
      await sleep(900);
    }
    fs.writeFileSync(jojoReportPath, JSON.stringify(result.jojo, null, 2));
  } else {
    Object.assign(result.jojo, JSON.parse(fs.readFileSync(jojoReportPath, "utf8")));
    console.log("  (пропущено, _jojo_found.json уже есть)");
  }

  console.log("== Медиа новых тайтлов ==");
  const newIds = Object.keys(result.created).slice(start, end);
  for (const id of newIds) {
    const info = result.created[id];
    try {
      const one = await collectOne(id, info.shikimoriId);
      result.created[id].media = one;
      console.log(`  ${id}: poster ok, stills ${one.stills}`);
    } catch (e) {
      console.log(`  !! media failed ${id}: ${e.message}`);
    }
    await sleep(900);
  }

  console.log("== Медиа существующих тайтлов ==");
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "anime-index.json"), "utf8"));
  const slice = index.slice(start, end);
  for (const m of slice) {
    try {
      const one = await collectOne(m.id, m.shikimoriId);
      result.existing[m.id] = { stills: one.stills, posterLocal: one.posterLocal };
      process.stdout.write(`  ${m.id}: stills ${one.stills}\n`);
    } catch (e) {
      result.existing[m.id] = { stills: 0, error: e.message };
      console.log(`  !! ${m.id}: ${e.message}`);
    }
    await sleep(700);
  }

  fs.writeFileSync(path.join(ROOT, "scripts", "_media_report.json"), JSON.stringify(result, null, 2));
  console.log("DONE");
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
