// Генерация полных пересказов для 23 новых тайтлов + JoJo-франшизы через z-ai-web-dev-sdk
import fs from "fs";
import path from "path";
import ZAI from "z-ai-web-dev-sdk";

const ROOT = "/home/z/my-project";
const OUT = path.join(ROOT, "data", "anime");
fs.mkdirSync(OUT, { recursive: true });

// Корректировки ID (первый сезон вместо сиквелов)
const CORRECT = {
  "vinland-saga": 37521,
  "mob-psycho-100": 32182,
  "grand-blue": 37105,
  "fire-force": 38671,
  "classroom-of-the-elite": 35507,
};

const TITLES = [
  { id: "spirited-away", en: "Spirited Away", ru: "Унесённые призраками", type: "Фильм" },
  { id: "princess-mononoke", en: "Princess Mononoke", ru: "Принцесса Мононоке", type: "Фильм" },
  { id: "howls-moving-castle", en: "Howl's Moving Castle", ru: "Ходячий замок", type: "Фильм" },
  { id: "my-neighbor-totoro", en: "My Neighbor Totoro", ru: "Мой сосед Тоторо", type: "Фильм" },
  { id: "grave-of-the-fireflies", en: "Grave of the Fireflies", ru: "Могила светлячков", type: "Фильм" },
  { id: "castle-in-the-sky", en: "Castle in the Sky", ru: "Небесный замок Лапута", type: "Фильм" },
  { id: "mugen-train", en: "Demon Slayer: Mugen Train", ru: "Клинок, рассекающий демонов: Поезд «Бесконечный»", type: "Фильм" },
  { id: "jujutsu-kaisen-0", en: "Jujutsu Kaisen 0", ru: "Магическая битва 0", type: "Фильм" },
  { id: "evangelion-3-0-1-0", en: "Evangelion: 3.0+1.0 Thrice Upon a Time", ru: "Евангелион: 3.0+1.0", type: "Фильм" },
  { id: "suzume", en: "Suzume no Tojimari", ru: "Судзумэ, закрывающая двери", type: "Фильм" },
  { id: "one-piece-film-red", en: "One Piece Film: Red", ru: "One Piece Film: Red", type: "Фильм" },
  { id: "summer-wars", en: "Summer Wars", ru: "Летние войны", type: "Фильм" },
  { id: "wolf-children", en: "Wolf Children", ru: "Волчьи дети", type: "Фильм" },
  { id: "girl-who-leapt-through-time", en: "The Girl Who Leapt Through Time", ru: "Девочка, покорившая время", type: "Фильм" },
  { id: "vinland-saga", en: "Vinland Saga", ru: "Сага о Винланде", type: "ТВ-сериал" },
  { id: "parasyte", en: "Parasyte -the maxim-", ru: "Паразит: Учение о жизни", type: "ТВ-сериал" },
  { id: "erased", en: "ERASED (Boku dake ga Inai Machi)", ru: "Город, в котором меня нет", type: "ТВ-сериал" },
  { id: "mob-psycho-100", en: "Mob Psycho 100", ru: "Моб Психо 100", type: "ТВ-сериал" },
  { id: "gto", en: "Great Teacher Onizuka", ru: "Крутой учитель Онидзука", type: "ТВ-сериал" },
  { id: "grand-blue", en: "Grand Blue", ru: "Grand Blue: Жажда приключений", type: "ТВ-сериал" },
  { id: "fire-force", en: "Fire Force", ru: "Пламенная бригада пожарных", type: "ТВ-сериал" },
  { id: "noragami", en: "Noragami", ru: "Бездомный бог", type: "ТВ-сериал" },
  { id: "classroom-of-the-elite", en: "Classroom of the Elite", ru: "Класс превосходных", type: "ТВ-сериал" },
];

const SYSTEM = `Ты — главный редактор русского аниме-каталога «NoLarp». Ты пишешь ПОЛНЫЕ художественные пересказы сюжетов аниме и фильмов на русском языке: честно, со всеми спойлерами, включая концовку. Стиль живой, кинематографичный, без канцелярита, без воды, без оценочных рецензий — только пересказ сюжета и факты. Ты идеально знаешь мировую анимацию и внимательно относишься к фактам (имена, названия, годы, студии, композиторы). Отвечай ТОЛЬКО валидным JSON без markdown-обёрток, без комментариев, без лишнего текста.`;

function buildPromptA(t, shikiInfo, shikiDesc) {
  return `Составь карточку тайтла «${t.en}» (${t.ru}).

Известные факты (используй, но исправь, если знаешь точнее): ${JSON.stringify(shikiInfo)}
Описание с Shikimori (для справки): ${shikiDesc || "нет"}

Верни JSON строго такой структуры (ЭТО ПЕРВАЯ ПОЛОВИНА — только начало карточки):
{
  "title": "русское название (как принято у русскоязычных зрителей)",
  "titleEn": "латинское название",
  "original": "японское название иероглифами",
  "year": <число, год начала>,
  "yearEnd": <число или null>,
  "type": "${t.type}",
  "episodes": <число серий, для фильма 1>,
  "studio": "студия",
  "genres": ["3-4 жанра по-русски, каждое с заглавной буквы"],
  "score": <число 6.0-9.5>,
  "accent": "#hex-цвет в стиле этого тайтла, не синий и не индиго",
  "tagline": "слоган до 12 слов, цепляющий",
  "synopsis": "2-4 предложения — завязка БЕЗ больших спойлеров",
  "plot": {
    "intro": "80-120 слов — начало: кто герой, что случилось",
    "chapters": [
      { "title": "короткий заголовок главы", "text": "320-450 слов с спойлерами" }
    ]
  }
}

Требования: РОВНО 3 главы в chapters (начало и середина сюжета, хронологически). Каждая глава ОБЯЗАНА быть 320-450 слов — это жёсткое требование, короткие главы не принимаются. Пиши только правду о тайтле.`;
}

function buildPromptB(t, partA) {
  const begun = (partA.plot?.chapters || []).map((c, i) => `${i + 1}. ${c.title} — ${String(c.text).slice(0, 90)}…`).join("\n");
  return `Продолжение карточки тайтла «${t.en}» (${t.ru}).

Первая половина уже написана:
Интро: ${String(partA.plot?.intro || "").slice(0, 150)}…
Главы 1-3:
${begun}

Верни JSON строго такой структуры (ЭТО ВТОРАЯ ПОЛОВИНА):
{
  "chapters": [
    { "title": "заголовок главы", "text": "320-450 слов, полные спойлеры" }
  ],
  "characters": [
    { "name": "Имя Фамилия (рус.)", "original": "японское или латиница", "role": "роль в 2-4 словах", "desc": "2-3 предложения о персонаже и его судьбе", "quote": "известная реплика на русском" }
  ],
  "music": {
    "opening": { "title": "название опенинга латиницей", "artist": "исполнитель" },
    "ending": { "title": "название эндинга", "artist": "исполнитель" },
    "insert": [ { "title": "вставная песня/лейтмотив", "artist": "исполнитель", "note": "где звучит" } ]
  },
  "fact": "2-4 предложения — интересный факт о производстве/рецепции"
}

Требования:
- Это финальные главы: РОВНО ${t.type === "Фильм" ? 2 : 3} главы, продолжают главы 1-3, ПОСЛЕДНЯЯ глава раскрывает концовку целиком, включая судьбу каждого ключевого героя.
- Каждая глава ОБЯЗАНА быть 320-450 слов — жёсткое требование.
- 5-6 персонажей, включая антагониста, цитаты реальные и узнаваемые.
- music.opening обязателен. Только реальные факты.`;
}

function extractJson(text) {
  let s = String(text || "").trim();
  s = s.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const a = s.indexOf("{");
  const b = s.lastIndexOf("}");
  if (a === -1 || b === -1) throw new Error("no JSON found");
  return JSON.parse(s.slice(a, b + 1));
}

function words(s) {
  return String(s || "").trim().split(/\s+/).filter(Boolean).length;
}

function validate(d, isMovie) {
  const errs = [];
  if (!d.title || !d.titleEn) errs.push("no title");
  if (!d.plot?.intro || words(d.plot.intro) < 40) errs.push("intro short");
  const chs = d.plot?.chapters || [];
  if (chs.length < (isMovie ? 4 : 5)) errs.push(`chapters ${chs.length}`);
  const total = words(d.plot?.intro) + chs.reduce((s, c) => s + words(c.text), 0);
  if (total < 650) errs.push(`total words ${total}`);
  if (chs.some((c) => words(c.text) < 110)) errs.push("chapter too short");
  if ((d.characters || []).length < 4) errs.push("characters");
  if (!d.music?.opening?.title) errs.push("music.opening");
  if (!d.fact) errs.push("fact");
  if (!/^#[0-9a-fA-F]{6}$/.test(d.accent || "")) errs.push("accent");
  return { errs, total };
}

async function genTitle(zai, t, shikiInfo, shikiDesc, attempt = 1) {
  const isMovie = t.type === "Фильм";
  const press = attempt > 1 ? "\n\nВАЖНО: пиши максимально развёрнуто." : "";
  const call = async (prompt) => {
    for (let i = 0; i < 5; i++) {
      try {
        const c = await zai.chat.completions.create({
          messages: [
            { role: "assistant", content: SYSTEM },
            { role: "user", content: prompt + (i > 1 ? press : "") },
          ],
          thinking: { type: "disabled" },
        });
        return extractJson(c.choices[0]?.message?.content || "");
      } catch (e) {
        const msg = String(e?.message || "");
        if (msg.includes("429") || msg.toLowerCase().includes("too many")) {
          await new Promise((r) => setTimeout(r, 20000 + i * 10000));
          continue;
        }
        if (i >= 1) throw e;
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
    throw new Error("call failed after retries");
  };

  // 1. метаданные
  const meta = await call(`Карточка тайтла «${t.en}» (${t.ru}).
Факты со Shikimori (используй, но исправь, если знаешь точнее): ${JSON.stringify(shikiInfo)}
Описание с Shikimori (справка): ${shikiDesc || "нет"}

Верни JSON: {
  "title": "русское название (как принято у зрителей)",
  "titleEn": "латинское название",
  "original": "японское название иероглифами или оригинал",
  "year": <год>, "yearEnd": <год окончания или null>,
  "type": "${t.type}", "episodes": <число серий, фильм 1>,
  "studio": "студия",
  "genres": ["3-4 жанра по-русски, с заглавной"],
  "score": <6.0-9.5>,
  "accent": "#hex в стиле тайтла, не синий",
  "tagline": "слоган до 12 слов",
  "synopsis": "2-4 предложения, завязка без больших спойлеров"
}
Только реальные факты.${press}`);

  // 2. интро + план глав
  const plan = await call(`Тайтл: «${meta.titleEn || t.en}» (${meta.title || t.ru}), ${meta.year}, ${meta.episodes} эп.

Верни JSON: {
  "intro": "80-120 слов — завязка сюжета: кто герой, что случилось, без концовки",
  "outline": [
    { "title": "заголовок главы", "brief": "одно предложение — что в главе" }
  ]
}
Требования: РОВНО ${isMovie ? 5 : 6} глав по ${isMovie ? "актам фильма" : "аркам сериала"}, хронологически, последняя глава — концовка целиком. Только реальные события тайтла.${press}`);

  const outline = (plan.outline || []).slice(0, isMovie ? 5 : 6);
  if (outline.length < (isMovie ? 4 : 5)) throw new Error("мало глав в плане");

  // 3. главы — по одному вызову на главу
  const chapters = [];
  for (let i = 0; i < outline.length; i++) {
    const isLast = i === outline.length - 1;
    const prev = chapters.map((c, j) => `${j + 1}. ${c.title}`).join("; ") || "нет";
    const ch = await call(`Глава ${i + 1} из ${outline.length} пересказа «${meta.titleEn || t.en}» (${meta.title || t.ru}).

План всей истории: ${outline.map((o, j) => `${j + 1}) ${o.title} — ${o.brief}`).join("; ")}
Уже написаны: ${prev}
Это глава «${outline[i].title}»: ${outline[i].brief}
${isLast ? "ЭТО ФИНАЛЬНАЯ ГЛАВА — раскрой концовку целиком, включая судьбу каждого ключевого героя." : "Не раскрывай концовку, закончи переходом к следующей главе."}

Верни JSON: { "title": "${outline[i].title}", "text": "художественный пересказ этой главы, 280-400 слов, ${isLast ? "полные спойлеры" : "со спойлерами по ходу"}" }
Пиши живо, кинематографично, только реальные события тайтла.${press}`);
    chapters.push({ title: String(ch.title || outline[i].title), text: String(ch.text || "") });
  }

  // 4. персонажи, музыка, факт
  const extras = await call(`Тайтл: «${meta.titleEn || t.en}» (${meta.title || t.ru}).

Верни JSON: {
  "characters": [
    { "name": "Имя Фамилия (рус.)", "original": "оригинал", "role": "роль в 2-4 словах", "desc": "2-3 предложения о персонаже и его судьбе", "quote": "известная реплика на русском" }
  ],
  "music": {
    "opening": { "title": "опенинг латиницей", "artist": "исполнитель" },
    "ending": { "title": "эндинг", "artist": "исполнитель" },
    "insert": [ { "title": "вставная песня", "artist": "исполнитель", "note": "где звучит" } ]
  },
  "fact": "2-4 предложения — интересный факт о производстве/рецепции/деталь для фанатов"
}
Требования: 5-6 персонажей включая антагониста, цитаты реальные и узнаваемые, music.opening обязателен. Только реальные факты.${press}`);

  const data = {
    ...meta,
    plot: { intro: String(plan.intro || ""), chapters },
    characters: extras.characters || [],
    music: extras.music || {},
    fact: String(extras.fact || ""),
  };
  if (isMovie && !data.episodes) data.episodes = 1;
  data.yearEnd = data.yearEnd ?? (isMovie ? data.year : null);
  const { errs, total } = validate(data, isMovie);
  if (errs.length) throw new Error(`validation: ${errs.join(", ")} (total ${total} слов)`);
  data.id = t.id;
  return data;
}

async function main() {
  const zai = await ZAI.create();
  const found = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts", "_new_found.json"), "utf8"));
  let report = {};
  if (fs.existsSync(path.join(ROOT, "scripts", "_gen_report.json"))) {
    report = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts", "_gen_report.json"), "utf8"));
  }

  // ---- 23 тайтла ----
  const limit = parseInt(process.argv[2], 10) || 999;
  const queue = TITLES.filter((t) => !fs.existsSync(path.join(OUT, `${t.id}.json`))).slice(0, limit);
  console.log(`К генерации: ${queue.length} тайтлов`);
  const workers = 1;
  let idx = 0;
  async function worker(n) {
    while (idx < queue.length) {
      const t = queue[idx++];
      const info = found[t.id] || {};
      const corrected = CORRECT[t.id] || info.shikimoriId;
      let shikiDesc = "";
      try {
        const UA = { "User-Agent": "NoLarp catalog builder 1.0" };
        const r = await fetch(`https://shikimori.one/api/animes/${corrected}`, { headers: UA });
        const j = await r.json();
        shikiDesc = (j.description || "").replace(/\[.*?\]/g, "").slice(0, 900);
      } catch { /* не критично */ }
      const shikiInfo = { russian: info.russian, name: info.name, kind: info.kind, score: info.score, episodes: info.episodes, year: info.year };
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`[${t.id}] попытка ${attempt}...`);
          const data = await genTitle(zai, t, shikiInfo, shikiDesc, attempt);
          fs.writeFileSync(path.join(OUT, `${t.id}.json`), JSON.stringify(data, null, 1));
          report[t.id] = { ok: true, words: validate(data, t.type === "Фильм").total };
          console.log(`[${t.id}] OK — ${report[t.id].words} слов`);
          break;
        } catch (e) {
          console.log(`[${t.id}] FAIL: ${e.message.slice(0, 160)}`);
          if (attempt === 3) report[t.id] = { ok: false, error: e.message.slice(0, 300) };
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
      fs.writeFileSync(path.join(ROOT, "scripts", "_gen_report.json"), JSON.stringify(report, null, 2));
      await new Promise((r) => setTimeout(r, 6000));
    }
  }
  await Promise.all(Array.from({ length: workers }, (_, i) => worker(i)));

  // ---- JoJo ----
  if (!fs.existsSync(path.join(OUT, "jojo.json"))) {
    console.log("== JoJo ==");
    const parts = [
      { no: 1, key: "phantom-blood", label: "Phantom Blood", ru: "Призрачная кровь", entries: [{ shikimoriId: 14719, from: 1, to: 9 }], episodes: 9, year: "2012" },
      { no: 2, key: "battle-tendency", label: "Battle Tendency", ru: "Боевая тенденция", entries: [{ shikimoriId: 14719, from: 10, to: 26 }], episodes: 17, year: "2012" },
      { no: 3, key: "stardust-crusaders", label: "Stardust Crusaders", ru: "Крестоносцы звёздной пыли", entries: [{ shikimoriId: 20899, from: 1, to: 24 }, { shikimoriId: 26055, from: 25, to: 48 }], episodes: 48, year: "2014–2015" },
      { no: 4, key: "diamond-is-unbreakable", label: "Diamond is Unbreakable", ru: "Несокрушимый алмаз", entries: [{ shikimoriId: 31933, from: 1, to: 39 }], episodes: 39, year: "2016" },
      { no: 5, key: "golden-wind", label: "Golden Wind", ru: "Золотой ветер", entries: [{ shikimoriId: 37991, from: 1, to: 39 }], episodes: 39, year: "2018–2019" },
      { no: 6, key: "stone-ocean", label: "Stone Ocean", ru: "Каменный океан", entries: [{ shikimoriId: 48661, from: 1, to: 12 }, { shikimoriId: 51367, from: 13, to: 24 }, { shikimoriId: 53273, from: 25, to: 38 }], episodes: 38, year: "2021–2022" },
      { no: 7, key: "steel-ball-run", label: "Steel Ball Run", ru: "Steel Ball Run", entries: [{ shikimoriId: 61469, from: 0, to: 0 }], episodes: 0, year: "анонс", upcoming: true },
    ];
    const jojo = {
      id: "jojo",
      title: "JoJo's Bizarre Adventure",
      titleEn: "JoJo's Bizarre Adventure",
      original: "ジョジョの奇妙な冒険",
      year: 2012,
      yearEnd: 2022,
      type: "Франшиза",
      episodes: 190,
      studio: "David Production",
      genres: ["Экшен", "Приключения", "Сёнэн", "Сверхъестественное"],
      score: 8.5,
      accent: "#c9a84c",
      tagline: "Судьба рода Джостаров не изгибается — она закручивается в спираль.",
      synopsis: "Сага семьи Джостаров: восемь поколений, каждое со своим врагом, своей Стенд-способностью и своим стилем поз. От викторианской Англии до флоридской тюрьмы — кровь Джостаров всегда находит путь к свету.",
      plot: { intro: "", chapters: [] },
      characters: [],
      music: { opening: undefined, ending: undefined, insert: [] },
      fact: "",
      franchise: { parts: [] },
    };
    for (const p of parts.filter((x) => !x.upcoming)) {
      try {
        const completion = await zai.chat.completions.create({
          messages: [
            { role: "assistant", content: SYSTEM },
            {
              role: "user",
              content: `Часть ${p.no} JoJo's Bizarre Adventure — «${p.label}» (${p.ru}, ${p.year}, ${p.episodes} серий).

Верни JSON строго такой структуры:
{
  "intro": "80-120 слов — завязка этой части: кто главный герой-Джостар, его напарники, враг, ставки",
  "chapters": [ { "title": "заголовок", "text": "230-300 слов с полными спойлерами" } ],
  "characters": [ { "name": "рус.", "original": "латиница/катакана", "role": "роль", "desc": "1-2 предложения", "quote": "реплика" } ],
  "openings": [ { "title": "название опенинга латиницей", "artist": "исполнитель" } ],
  "fact": "1-2 предложения — известный факт/мем об этой части"
}
Требования: 3-4 главы, последняя глава обязана раскрывать финал части целиком. 2-3 ключевых персонажа (герой, ключевой напарник, главный враг). Опенинги — реальные, из аниме David Production. Только реальные факты.`,
            },
          ],
          thinking: { type: "disabled" },
        });
        const d = extractJson(completion.choices[0]?.message?.content || "");
        if (!d.chapters?.length || !d.intro) throw new Error("bad part data");
        jojo.franchise.parts.push({
          no: p.no, key: p.key, label: p.label, ru: p.ru,
          entries: p.entries, episodes: p.episodes, year: p.year, upcoming: false,
          intro: d.intro, chapters: d.chapters, characters: d.characters,
          openings: d.openings, fact: d.fact,
        });
        console.log(`[jojo ${p.no}] OK`);
      } catch (e) {
        console.log(`[jojo ${p.no}] FAIL: ${e.message.slice(0, 160)}`);
      }
      fs.writeFileSync(path.join(OUT, "jojo.json"), JSON.stringify(jojo, null, 1));
      await new Promise((r) => setTimeout(r, 1000));
    }
    // анонс SBR
    jojo.franchise.parts.push({
      no: 7, key: "steel-ball-run", label: "Steel Ball Run", ru: "Steel Ball Run",
      entries: [{ shikimoriId: 61469, from: 0, to: 0 }], episodes: 0, year: "анонс", upcoming: true,
      intro: "Седьмая часть и полный перезапуск вселенной: гонка через Америку 1890-х от Сан-Диего до Нью-Йорка. Джонни Джостар, бывший жокей в инвалидном кресле, и Джайро Цеппели со стальными шарами против президента Фанни Валентайна и всех участников забега. Аниме официально анонсировано.",
      chapters: [], characters: [], openings: [],
      fact: "Steel Ball Run — единственная часть, действие которой происходит в перезапущенной вселенной, и первая, где Джостара зовут Джонни.",
    });
    // общие поля
    const tw = jojo.franchise.parts.reduce((s, p) => s + (p.intro || "").split(/\s+/).length + (p.chapters || []).reduce((a, c) => a + (c.text || "").split(/\s+/).length, 0), 0);
    jojo.plot = {
      intro: "Восемь поколений семьи Джостаров против зла, которое меняет облик каждую эпоху: вампиры, каменные маски, Стенды, поклоны-позы и неизменное «Yare yare daze». Каждая часть — новый герой, новый континент, новый стиль.",
      chapters: jojo.franchise.parts.filter((p) => !p.upcoming).flatMap((p) =>
        [{ title: `Часть ${p.no}. ${p.label}`, text: p.intro }, ...(p.chapters || []).map((c) => ({ title: `${p.label}: ${c.title}`, text: c.text }))]
      ),
    };
    jojo.characters = jojo.franchise.parts.filter((p) => !p.upcoming).flatMap((p) => (p.characters || []).map((c) => ({ ...c, part: p.no })));
    jojo.music = {
      insert: jojo.franchise.parts.filter((p) => !p.upcoming).flatMap((p) => (p.openings || []).map((o) => ({ title: o.title, artist: o.artist, note: `Опенинг части ${p.no}` }))),
    };
    jojo.fact = "David Production специально меняет дизайн и стиль под каждую часть, а опенинги честно рассказывают сюжет сезона. Фраза «Yare yare daze» Джотаро и позы из части 3 стали одними из самых узнаваемых мемов аниме-культуры.";
    jojo._totalWords = tw;
    fs.writeFileSync(path.join(OUT, "jojo.json"), JSON.stringify(jojo, null, 1));
    report["jojo"] = { ok: true, words: tw, parts: jojo.franchise.parts.length };
    fs.writeFileSync(path.join(ROOT, "scripts", "_gen_report.json"), JSON.stringify(report, null, 2));
  }

  console.log("GEN DONE");
  console.log(JSON.stringify(report, null, 1));
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
