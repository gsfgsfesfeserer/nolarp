// Тест скоринга поиска Shikimori для крейта
const UA = { "User-Agent": "NoLarp catalog builder 1.0" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function scoreCandidate(c, q) {
  const ru = String(c.russian ?? "").toLowerCase();
  const name = String(c.name ?? "").toLowerCase();
  const qq = q.toLowerCase();
  const core = qq.replace(/\s*\([^)]*\)\s*/g, "").trim();
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
    if (hits === 0) s -= 80;
    else if (hits === latin.length) s += 70;
    else s -= 10;
  }
  s += Math.min(20, Math.log10(Math.max(10, Number(c.members ?? 10))));
  return s;
}

async function search(q) {
  const r = await fetch("https://shikimori.one/api/animes?search=" + encodeURIComponent(q) + "&limit=10&order=popularity", { headers: UA });
  const list = await r.json();
  let best = null, bs = -Infinity;
  for (const c of list) { const sc = scoreCandidate(c, q); if (sc > bs) { bs = sc; best = c; } }
  const label = bs >= 20 ? `${best.russian ?? best.name} [${best.name}] ${String(best.aired_on ?? "").slice(0, 4)}` : "→ AI-путь";
  console.log(`${q}  ⇒  ${label}  (score ${bs.toFixed(0)})`);
}

const queries = process.argv.slice(2);
for (const q of queries) { await search(q); await sleep(1200); }
