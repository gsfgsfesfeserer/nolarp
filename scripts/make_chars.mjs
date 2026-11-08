// Скачивает главного персонажа каждого тайтла с Shikimori (/roles) → /tmp/chars-raw/{id}.jpg
// Для JoJo — первый главный герой 1-й части (Jonathan Joestar, ID части 14719).
import fs from "fs";
import path from "path";

const ROOT = "/home/z/my-project";
const OUT = "/tmp/chars-raw";
const UA = { "User-Agent": "NoLarp catalog builder 1.0" };
const SHIKI = "https://shikimori.one";
fs.mkdirSync(OUT, { recursive: true });

// Карта shikimoriId: shiki.json (77 оригинальных) + _new_found.json (23 новых)
const shikiMap = JSON.parse(fs.readFileSync(path.join(ROOT, "data/shiki.json"), "utf8"));
const found = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts/_new_found.json"), "utf8"));
const created = found.created ?? found;
const idMap = { ...shikiMap, ...created };

const files = fs.readdirSync(path.join(ROOT, "data/anime")).filter((f) => f.endsWith(".json"));
const list = files.map((f) => {
  const d = JSON.parse(fs.readFileSync(path.join(ROOT, "data/anime", f), "utf8"));
  const rec = idMap[d.id];
  return { id: d.id, shikimoriId: rec?.shikimoriId ?? d.shikimoriId };
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

async function pickChar(shikimoriId) {
  const roles = await jget(`${SHIKI}/api/animes/${shikimoriId}/roles`);
  if (!roles || !Array.isArray(roles)) return null;
  // Первый персонаж с ролью Main, иначе первый вообще
  const main = roles.find((r) => r.character && r.roles?.includes("Main"));
  const pick = main ?? roles.find((r) => r.character);
  if (!pick?.character?.image?.original) return null;
  return `https://shikimori.one${pick.character.image.original.split("?")[0]}`;
}

async function download(url, dest) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  fs.writeFileSync(dest, buf);
  return buf.length;
}

let ok = 0, skip = 0, fail = 0;
for (const t of list) {
  const dest = path.join(OUT, `${t.id}.jpg`);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 10000) { skip++; continue; }
  // JoJo — франшиза, берём 1-ю часть
  const shikiId = t.id === "jojo" ? 14719 : t.shikimoriId;
  if (!shikiId) { console.log(`[${t.id}] нет shikimoriId`); fail++; continue; }
  try {
    const url = await pickChar(shikiId);
    if (!url) { console.log(`[${t.id}] персонаж не найден`); fail++; continue; }
    const size = await download(url, dest);
    console.log(`[${t.id}] OK ${(size / 1024).toFixed(0)}KB`);
    ok++;
  } catch (e) {
    console.log(`[${t.id}] FAIL ${e.message}`);
    fail++;
  }
  await sleep(700);
}
console.log(`\nИтог: ok=${ok} skip=${skip} fail=${fail}`);
