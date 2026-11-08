"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { Dices, Play, Search, SlidersHorizontal, X } from "lucide-react";
import type { AnimeMeta } from "@/lib/anime-data";

export type SortKey = "score" | "year-desc" | "year-asc" | "title" | "words";

const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: "score", label: "По рейтингу" },
  { key: "year-desc", label: "Год ↓" },
  { key: "year-asc", label: "Год ↑" },
  { key: "title", label: "А–Я" },
  { key: "words", label: "Объём пересказа" },
];

function normalizeType(t: string): string {
  const s = (t || "").toLowerCase();
  if (s.includes("франшиз")) return "Франшиза";
  if (s.includes("фильм") || s.includes("movie")) return "Фильм";
  if (s.includes("тв") || s.includes("tv") || s.includes("сериал")) return "ТВ-сериал";
  return t;
}

export function normalizeTypeLabel(t: string): string {
  return normalizeType(t);
}

/* ---------------- карточка ---------------- */
function AnimeCard({
  item,
  onSelect,
  index,
}: {
  item: AnimeMeta;
  onSelect: (id: string) => void;
  index: number;
}) {
  const accent = item.accent || "#ff2b4a";
  // 3D-наклон за курсором
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 220, damping: 22 });
  const sry = useSpring(ry, { stiffness: 220, damping: 22 });
  const boxRef = useRef<HTMLButtonElement>(null);

  const onMove = (e: React.MouseEvent) => {
    const r = boxRef.current?.getBoundingClientRect();
    if (!r) return;
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    ry.set(px * 9);
    rx.set(-py * 9);
  };
  const onLeave = () => {
    rx.set(0);
    ry.set(0);
  };

  return (
    <motion.button
      layout
      ref={boxRef}
      data-tour={index === 0 ? "anime-card" : undefined}
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay: Math.min(index % 12, 8) * 0.04, ease: [0.2, 0.8, 0.2, 1] }}
      whileHover={{ y: -7, scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onClick={() => onSelect(item.id)}
      className="glow-card group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-card text-left will-change-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={{ ["--ac" as string]: accent, rotateX: srx, rotateY: sry, transformPerspective: 800 }}
      aria-label={`${item.title}, ${item.year}`}
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden">
        <Image
          src={item.poster}
          alt={`Постер — ${item.title}`}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.07]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#07060a] via-transparent to-transparent opacity-80" />

        {/* рейтинг */}
        <div className="absolute right-2.5 top-2.5 rounded-lg border border-white/10 bg-black/65 px-2 py-1 text-xs font-bold text-[#f2c14e] backdrop-blur">
          ★ {item.score.toFixed(1)}
        </div>

        {/* объём пересказа */}
        <div className="absolute left-2.5 top-2.5 rounded-lg bg-black/65 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/70 backdrop-blur">
          {item.plotWords.toLocaleString("ru-RU")} слов
        </div>

        {/* кнопка «смотреть» при наведении */}
        <div className="pointer-events-none absolute inset-0 grid place-items-center opacity-0 transition-all duration-300 group-hover:opacity-100">
          <span
            className="grid h-12 w-12 scale-75 place-items-center rounded-full text-white shadow-xl transition-transform duration-300 group-hover:scale-100"
            style={{ background: accent, boxShadow: `0 10px 30px -6px ${accent}cc` }}
          >
            <Play className="ml-0.5 h-5 w-5" fill="currentColor" />
          </span>
        </div>

        {/* жанры при наведении */}
        <div className="absolute inset-x-0 bottom-0 flex flex-wrap gap-1.5 p-3 opacity-0 transition-all duration-400 group-hover:opacity-100">
          {item.genres.slice(0, 3).map((g) => (
            <span
              key={g}
              className="rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-medium text-white/85 backdrop-blur"
            >
              {g}
            </span>
          ))}
        </div>

        <span className="card-shine" aria-hidden="true" />
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3.5">
        <h3 className="font-display line-clamp-2 text-[13px] font-semibold leading-snug text-foreground transition-colors group-hover:text-[var(--ac)]">
          {item.title}
        </h3>
        <p className="line-clamp-1 text-[11px] text-muted-foreground">{item.titleEn}</p>
        <div className="mt-auto flex items-center gap-2 pt-1.5 text-[11px] text-muted-foreground">
          <span className="font-semibold text-foreground/80">{item.year}</span>
          <span className="h-1 w-1 rounded-full bg-[var(--ac)]" />
          <span className="truncate">{normalizeType(item.type)}</span>
        </div>
      </div>

      {/* свечение по акценту тайтла */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ boxShadow: `0 0 0 1px ${accent}66, 0 14px 48px -8px ${accent}66` }}
      />
    </motion.button>
  );
}

/* ---------------- каталог ---------------- */
export function Catalog({
  meta,
  onSelect,
  heading = "Каталог",
  jp = "目録 · МОКУРОКУ",
  subheading,
}: {
  meta: AnimeMeta[];
  onSelect: (id: string) => void;
  heading?: string;
  jp?: string;
  subheading?: string;
}) {
  const [query, setQuery] = useState("");
  const [genres, setGenres] = useState<string[]>([]);
  const [type, setType] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("score");

  const allGenres = useMemo(() => {
    const m = new Map<string, number>();
    meta.forEach((a) => a.genres.forEach((g) => m.set(g, (m.get(g) ?? 0) + 1)));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [meta]);

  const allTypes = useMemo(
    () => [...new Set(meta.map((a) => normalizeType(a.type)))].sort(),
    [meta]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = meta.filter((a) => {
      if (
        q &&
        !`${a.title} ${a.titleEn} ${a.original} ${a.tagline}`.toLowerCase().includes(q)
      )
        return false;
      if (genres.length && !genres.every((g) => a.genres.includes(g))) return false;
      if (type && normalizeType(a.type) !== type) return false;
      return true;
    });
    list = [...list];
    switch (sort) {
      case "score":
        list.sort((a, b) => b.score - a.score);
        break;
      case "year-desc":
        list.sort((a, b) => b.year - a.year);
        break;
      case "year-asc":
        list.sort((a, b) => a.year - b.year);
        break;
      case "title":
        list.sort((a, b) => a.title.localeCompare(b.title, "ru"));
        break;
      case "words":
        list.sort((a, b) => b.plotWords - a.plotWords);
        break;
    }
    return list;
  }, [meta, query, genres, type, sort]);

  const toggleGenre = (g: string) =>
    setGenres((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));

  const surprise = () => {
    if (!filtered.length) return;
    const pick = filtered[Math.floor(Math.random() * filtered.length)];
    onSelect(pick.id);
  };

  const hasFilters = query || genres.length > 0 || type;

  return (
    <section id="catalog" className="relative mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
      {/* заголовок секции */}
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="font-jp mb-2 text-xs tracking-[0.45em] text-[#ff2b4a]">{jp}</p>
          <h2 className="font-display text-3xl font-extrabold sm:text-4xl">{heading}</h2>
        </div>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
          {subheading ?? `${meta.length} тайтлов, честно пересказанных до конца. Выбирайте, фильтруйте, открывайте — спойлеры уже внутри, так и задумано.`}
        </p>
      </div>

      {/* панель управления */}
      <div className="sticky top-[64px] z-30 -mx-4 mb-8 border-y border-white/[0.06] bg-[#07060a]/85 px-4 py-4 backdrop-blur-xl sm:mx-0 sm:rounded-2xl sm:border sm:px-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          {/* поиск */}
          <label data-tour="search" className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Найти аниме: «клинок», «Ghibli», «Steins;Gate»…"
              className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] pl-10 pr-9 text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors focus:border-[#ff2b4a]/50 focus:outline-none focus:ring-2 focus:ring-[#ff2b4a]/20"
              aria-label="Поиск аниме"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Очистить поиск"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </label>

          {/* сортировка + случайное */}
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5" role="radiogroup" aria-label="Сортировка">
            <SlidersHorizontal className="h-4 w-4 shrink-0 text-muted-foreground" />
            {SORTS.map((s) => (
              <button
                key={s.key}
                role="radio"
                aria-checked={sort === s.key}
                onClick={() => setSort(s.key)}
                className={`relative shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
                  sort === s.key
                    ? "text-white"
                    : "border border-white/[0.08] text-muted-foreground hover:border-white/25 hover:text-foreground"
                }`}
              >
                {sort === s.key && (
                  <motion.span
                    layoutId="sort-pill"
                    className="absolute inset-0 rounded-full bg-[#ff2b4a] shadow-[0_4px_18px_-4px_rgba(255,43,74,0.6)]"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="relative z-10">{s.label}</span>
              </button>
            ))}
            <button
              onClick={surprise}
              className="group ml-1 inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#d4af37]/40 bg-[#d4af37]/10 px-3.5 py-2 text-xs font-bold text-[#f2c14e] transition-all hover:border-[#d4af37]/70 hover:bg-[#d4af37]/20"
              title="Случайное аниме"
            >
              <motion.span
                className="inline-flex"
                whileTap={{ rotate: 360 }}
                transition={{ duration: 0.5 }}
              >
                <Dices className="h-4 w-4 transition-transform duration-500 group-hover:rotate-180" />
              </motion.span>
              Случайное
            </button>
          </div>
        </div>

        {/* типы */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setType(null)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
              !type
                ? "bg-foreground text-background"
                : "border border-white/[0.08] text-muted-foreground hover:border-white/25"
            }`}
          >
            Всё ({meta.length})
          </button>
          {allTypes.map((t) => {
            const n = meta.filter((a) => normalizeType(a.type) === t).length;
            return (
              <button
                key={t}
                onClick={() => setType(type === t ? null : t)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  type === t
                    ? "bg-foreground text-background"
                    : "border border-white/[0.08] text-muted-foreground hover:border-white/25"
                }`}
              >
                {t} ({n})
              </button>
            );
          })}
        </div>

        {/* жанры */}
        <div data-tour="genres" className="mt-3 flex flex-wrap items-center gap-1.5">
          {allGenres.map(([g, n]) => {
            const active = genres.includes(g);
            return (
              <motion.button
                key={g}
                onClick={() => toggleGenre(g)}
                aria-pressed={active}
                whileTap={{ scale: 0.88 }}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-all ${
                  active
                    ? "bg-[#ff2b4a]/15 text-[#ff5c73] ring-1 ring-inset ring-[#ff2b4a]/50"
                    : "text-muted-foreground hover:bg-white/[0.05] hover:text-foreground"
                }`}
              >
                {g} <span className="opacity-50">{n}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* счётчик и сброс */}
      <div className="mb-5 flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Найдено: <b className="text-foreground">{filtered.length}</b>
        </span>
        {hasFilters && (
          <button
            onClick={() => {
              setQuery("");
              setGenres([]);
              setType(null);
            }}
            className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-[#ff2b4a]/50 hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" /> Сбросить фильтры
          </button>
        )}
      </div>

      {/* сетка */}
      {filtered.length > 0 ? (
        <motion.div layout className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {filtered.map((item, i) => (
            <AnimeCard key={item.id} item={item} onSelect={onSelect} index={i} />
          ))}
        </motion.div>
      ) : (
        <motion.div
          className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/10 py-20 text-center"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <span className="font-jp animate-pulse text-4xl text-[#ff2b4a]/60">ない</span>
          <p className="text-muted-foreground">Ничего не нашлось. Такого даже у нас нет.</p>
          <button
            onClick={() => {
              setQuery("");
              setGenres([]);
              setType(null);
            }}
            className="mt-2 rounded-full bg-[#ff2b4a] px-5 py-2 text-sm font-semibold text-white transition-transform hover:scale-105 active:scale-95"
          >
            Показать всё
          </button>
        </motion.div>
      )}
    </section>
  );
}
