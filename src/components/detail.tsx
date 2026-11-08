"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Quote,
  Sparkles,
  TriangleAlert,
  X,
} from "lucide-react";
import type { Anime, AnimeMeta, AnimeTrack } from "@/lib/anime-data";
import { normalizeTypeLabel } from "./catalog";
import { WatchOnline } from "./player";

const clientCache = new Map<string, Anime>();

function trackQuery(t: AnimeTrack, anime: Anime): string {
  return `${t.title} ${t.artist ?? ""} ${anime.title} ${anime.titleEn}`.trim();
}

function MusicCard({
  label,
  track,
  anime,
  accent,
}: {
  label: string;
  track: AnimeTrack;
  anime: Anime;
  accent: string;
}) {
  const q = encodeURIComponent(trackQuery(track, anime));
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.07] bg-card p-5">
      <div className="flex items-center gap-2.5">
        <span
          className="w-fit rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em]"
          style={{ background: `${accent}22`, color: accent }}
        >
          {label}
        </span>
        <span className="eq" style={{ color: accent }} aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </span>
      </div>
      <div>
        <h4 className="font-display text-lg font-bold leading-snug">{track.title}</h4>
        {track.artist && <p className="mt-0.5 text-sm text-muted-foreground">{track.artist}</p>}
      </div>
      {track.note && <p className="text-sm leading-relaxed text-foreground/70">{track.note}</p>}
      <div className="mt-auto flex flex-wrap gap-2 pt-1">
        <a
          href={`https://www.youtube.com/results?search_query=${q}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3.5 py-1.5 text-xs font-semibold text-foreground/85 transition-colors hover:border-[#ff2b4a]/60 hover:text-[#ff5c73]"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Слушать на YouTube
        </a>
        <a
          href={`https://music.yandex.ru/search?text=${q}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3.5 py-1.5 text-xs font-semibold text-foreground/85 transition-colors hover:border-[#f2c14e]/60 hover:text-[#f2c14e]"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Яндекс Музыка
        </a>
      </div>
    </div>
  );
}

export function DetailOverlay({
  id,
  meta,
  onClose,
  onNavigate,
}: {
  id: string;
  meta: AnimeMeta[];
  onClose: () => void;
  onNavigate: (id: string) => void;
}) {
  // оверлей монтируется заново на каждый id (key={activeId} у родителя),
  // поэтому стартовое состояние безопасно брать из кэша один раз
  const [anime, setAnime] = useState<Anime | null>(() => clientCache.get(id) ?? null);
  const [loading, setLoading] = useState(() => !clientCache.has(id));
  const scrollRef = useRef<HTMLDivElement>(null);
  const index = meta.findIndex((m) => m.id === id);
  const prev = index > 0 ? meta[index - 1] : null;
  const next = index >= 0 && index < meta.length - 1 ? meta[index + 1] : null;

  // загрузка (только если данных ещё нет в кэше)
  useEffect(() => {
    if (clientCache.has(id)) return;
    let alive = true;
    fetch(`/api/anime/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: Anime) => {
        clientCache.set(id, data);
        if (alive) setAnime(data);
      })
      .catch(() => {
        if (alive) setAnime(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id]);

  // блокируем прокрутку фона + ESC
  useEffect(() => {
    const was = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && prev) onNavigate(prev.id);
      if (e.key === "ArrowRight" && next) onNavigate(next.id);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = was;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, onNavigate, prev, next]);

  // прокрутка вверх при смене тайтла
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [id]);

  const accent = anime?.accent || meta[index]?.accent || "#ff2b4a";

  // параллакс обложки при прокрутке оверлея
  const { scrollYProgress } = useScroll({ container: scrollRef });
  const coverY = useTransform(scrollYProgress, [0, 1], ["0%", "16%"]);
  const coverScale = useTransform(scrollYProgress, [0, 1], [1.1, 1.3]);
  const posterY = useTransform(scrollYProgress, [0, 1], [0, 70]);

  return (
    <motion.div
      ref={scrollRef}
      className="fixed inset-0 z-[60] overflow-y-auto overscroll-contain bg-[#07060a]"
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 28 }}
      transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
      role="dialog"
      aria-modal="true"
      aria-label={anime?.title ?? "Аниме"}
    >
      {/* верхняя панель */}
      <div className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-white/[0.06] bg-[#07060a]/85 px-4 py-3 backdrop-blur-xl sm:px-6">
        <button
          onClick={onClose}
          className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-foreground/80 transition-colors hover:border-[#ff2b4a]/60 hover:text-[#ff5c73]"
        >
          <ArrowLeft className="h-4 w-4" /> Каталог
        </button>
        <div className="hidden min-w-0 flex-1 items-center justify-center gap-3 sm:flex">
          <span className="truncate text-sm text-muted-foreground">
            {anime ? anime.title : "…"}
          </span>
          {anime && (
            <span className="font-jp shrink-0 text-xs text-muted-foreground/60">
              {anime.original}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => prev && onNavigate(prev.id)}
            disabled={!prev}
            className="rounded-full border border-white/10 p-2 text-foreground/70 transition-colors hover:border-[#ff2b4a]/60 disabled:opacity-30"
            aria-label="Предыдущее аниме"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => next && onNavigate(next.id)}
            disabled={!next}
            className="rounded-full border border-white/10 p-2 text-foreground/70 transition-colors hover:border-[#ff2b4a]/60 disabled:opacity-30"
            aria-label="Следующее аниме"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="rounded-full border border-white/10 p-2 text-foreground/70 transition-colors hover:border-[#ff2b4a]/60 hover:text-[#ff5c73]"
            aria-label="Закрыть"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {loading && !anime && (
        <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4">
          <span className="font-jp animate-pulse text-3xl text-[#ff2b4a]">読み込み中</span>
          <p className="text-sm text-muted-foreground">Открываем свиток сюжета…</p>
        </div>
      )}

      {anime && (
        <motion.article
          key={anime.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35 }}
        >
          {/* ---------- обложка ---------- */}
          <header className="relative overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
              <motion.div className="absolute inset-0" style={{ y: coverY, scale: coverScale }}>
                <Image
                  src={meta[index]?.poster ?? ""}
                  alt=""
                  fill
                  priority
                  sizes="100vw"
                  className="object-cover opacity-25 blur-2xl"
                />
              </motion.div>
              <div className="absolute inset-0 bg-gradient-to-b from-[#07060a]/40 via-[#07060a]/75 to-[#07060a]" />
            </div>

            <div className="relative mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 md:flex-row md:items-end md:py-16">
              {/* постер (с лёгким параллаксом) */}
              <motion.div
                className="relative mx-auto w-44 shrink-0 sm:w-56 md:mx-0"
                style={{ y: posterY }}
              >
                <Image
                  src={meta[index]?.poster ?? ""}
                  alt={`Постер — ${anime.title}`}
                  width={448}
                  height={672}
                  priority
                  className="w-full rounded-2xl border border-white/10 shadow-2xl"
                  style={{ boxShadow: `0 24px 70px -18px ${accent}66` }}
                />
              </motion.div>

              {/* инфо */}
              <div className="min-w-0 flex-1">
                <p className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  <span style={{ color: accent }}>{anime.studio}</span>
                  <span>·</span>
                  <span>
                    {anime.year}
                    {anime.yearEnd && anime.yearEnd !== anime.year ? `–${anime.yearEnd}` : ""}
                  </span>
                  <span>·</span>
                  <span>{normalizeTypeLabel(anime.type)}</span>
                  <span>·</span>
                  <span>{anime.episodes} эп.</span>
                </p>

                <h1 className="font-display text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
                  {anime.title}
                </h1>
                <p className="mt-1.5 text-base text-muted-foreground sm:text-lg">
                  {anime.titleEn}
                  {anime.original && (
                    <span className="font-jp ml-3 text-sm opacity-70">{anime.original}</span>
                  )}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span
                    className="rounded-xl border px-3 py-1.5 text-sm font-bold text-[#f2c14e]"
                    style={{ borderColor: "rgba(242,193,78,0.4)", background: "rgba(242,193,78,0.08)" }}
                  >
                    ★ {anime.score}
                  </span>
                  {anime.genres.map((g) => (
                    <span
                      key={g}
                      className="rounded-full border px-3 py-1 text-xs font-medium"
                      style={{ borderColor: `${accent}44`, color: accent, background: `${accent}0d` }}
                    >
                      {g}
                    </span>
                  ))}
                </div>

                {anime.tagline && (
                  <p
                    className="mt-5 max-w-2xl border-l-2 pl-4 text-base italic leading-relaxed text-foreground/85 sm:text-lg"
                    style={{ borderColor: accent }}
                  >
                    «{anime.tagline}»
                  </p>
                )}
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            {/* ---------- смотреть онлайн ---------- */}
            {(() => {
              const m = meta[index];
              const isMovie = /фильм|movie/i.test(`${anime.type} ${m?.type ?? ""}`);
              const eps =
                parseInt(String(anime.episodes ?? m?.episodes ?? "0"), 10) ||
                (isMovie ? 1 : 12);
              return (
                <WatchOnline
                  shikimoriId={m?.shikimoriId ?? null}
                  episodes={eps}
                  isMovie={isMovie}
                  accent={accent}
                  titleEn={anime.titleEn}
                />
              );
            })()}

            {/* ---------- предупреждение о спойлерах ---------- */}
            <div
              className="my-8 flex items-start gap-3.5 rounded-2xl border p-4 sm:p-5"
              style={{ borderColor: "rgba(255,43,74,0.35)", background: "rgba(255,43,74,0.07)" }}
            >
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#ff2b4a]" />
              <p className="text-sm leading-relaxed text-foreground/85">
                <b className="font-bold text-[#ff5c73]">Полный пересказ сюжета.</b> Ниже — вся
                история, включая концовку. Спойлеры здесь намеренные: это не рецензия, а
                художественный пересказ.
              </p>
            </div>

            {/* ---------- сюжет ---------- */}
            <section className="mb-16">
              <div className="mb-8 flex items-end justify-between gap-4">
                <div>
                  <p className="font-jp mb-2 text-xs tracking-[0.45em]" style={{ color: accent }}>
                    物語 · ИСТОРИЯ
                  </p>
                  <h2 className="font-display text-2xl font-extrabold sm:text-3xl">Сюжет</h2>
                </div>
                <span className="font-display text-stroke shrink-0 text-4xl font-black opacity-70 sm:text-5xl">
                  {anime.plot.chapters.length.toString().padStart(2, "0")}
                </span>
              </div>
              <motion.div
                className="mb-8 h-px w-full origin-left"
                style={{ background: `linear-gradient(90deg, ${accent}88, transparent)` }}
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
              />

              <p className="text-base leading-[1.85] text-foreground/85 sm:text-lg">
                {anime.plot.intro}
              </p>

              <div className="mt-12 flex flex-col gap-12">
                {anime.plot.chapters.map((ch, i) => (
                  <motion.section
                    key={i}
                    initial={{ opacity: 0, y: 26 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
                  >
                    <div className="mb-4 flex items-start gap-4">
                      <span
                        className="font-display shrink-0 text-4xl font-black leading-none opacity-90 sm:text-5xl"
                        style={{ color: "transparent", WebkitTextStroke: `1.5px ${accent}88` }}
                        aria-hidden="true"
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <h3 className="font-display pt-1 text-xl font-bold leading-snug sm:text-2xl">
                        {ch.title}
                      </h3>
                    </div>
                    {ch.text.split(/\n+/).map((para, j) => (
                      <p
                        key={j}
                        className="mb-4 text-[15px] leading-[1.85] text-foreground/80 sm:text-base"
                      >
                        {para}
                      </p>
                    ))}
                    {i < anime.plot.chapters.length - 1 && (
                      <div className="slash-divider mt-10 opacity-40" aria-hidden="true" />
                    )}
                  </motion.section>
                ))}
              </div>
            </section>

            {/* ---------- герои ---------- */}
            {anime.characters.length > 0 && (
              <section className="mb-16">
                <div className="mb-8">
                  <p className="font-jp mb-2 text-xs tracking-[0.45em]" style={{ color: accent }}>
                    登場人物 · ГЕРОИ
                  </p>
                  <h2 className="font-display text-2xl font-extrabold sm:text-3xl">Персонажи</h2>
                </div>
                <motion.div
                  className="mt-3 h-px w-full origin-left"
                  style={{ background: `linear-gradient(90deg, ${accent}88, transparent)` }}
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  {anime.characters.map((c, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 22 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-40px" }}
                      transition={{ duration: 0.45, delay: (i % 4) * 0.06 }}
                      className="flex flex-col rounded-2xl border border-white/[0.07] bg-card p-5 transition-colors hover:border-white/[0.14]"
                    >
                      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                        <h3 className="font-display text-base font-bold">{c.name}</h3>
                        {c.original && (
                          <span className="font-jp text-xs text-muted-foreground/70">
                            {c.original}
                          </span>
                        )}
                      </div>
                      {c.role && (
                        <span
                          className="mb-2.5 w-fit rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]"
                          style={{ background: `${accent}1c`, color: accent }}
                        >
                          {c.role}
                        </span>
                      )}
                      <p className="text-sm leading-relaxed text-foreground/75">{c.desc}</p>
                      {c.quote && (
                        <blockquote
                          className="mt-4 flex gap-2.5 rounded-xl p-3.5 text-sm italic leading-relaxed text-foreground/85"
                          style={{ background: `${accent}0d`, borderLeft: `2px solid ${accent}` }}
                        >
                          <Quote className="h-4 w-4 shrink-0 rotate-180 opacity-60" style={{ color: accent }} />
                          <span>{c.quote}</span>
                        </blockquote>
                      )}
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {/* ---------- музыка ---------- */}
            <section className="mb-16">
              <div className="mb-8">
                <p className="font-jp mb-2 text-xs tracking-[0.45em]" style={{ color: accent }}>
                  音楽 · МУЗЫКА
                </p>
                <h2 className="font-display text-2xl font-extrabold sm:text-3xl">Опенинги и эндинги</h2>
              </div>
              <motion.div
                className="mb-8 h-px w-full origin-left"
                style={{ background: `linear-gradient(90deg, ${accent}88, transparent)` }}
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                {anime.music.opening && (
                  <MusicCard label="Опенинг" track={anime.music.opening} anime={anime} accent={accent} />
                )}
                {anime.music.ending && (
                  <MusicCard label="Эндинг" track={anime.music.ending} anime={anime} accent={accent} />
                )}
              </div>
              {anime.music.insert && anime.music.insert.length > 0 && (
                <div className="mt-4 rounded-2xl border border-white/[0.07] bg-card p-5">
                  <span className="mb-3 inline-block rounded-full bg-white/[0.06] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/70">
                    Вставные песни
                  </span>
                  <ul className="flex flex-col gap-2">
                    {anime.music.insert.map((t, i) => (
                      <li key={i} className="flex items-baseline gap-2 text-sm">
                        <span className="opacity-40" style={{ color: accent }}>
                          ♪
                        </span>
                        <span className="font-semibold">{t.title}</span>
                        {t.artist && <span className="text-muted-foreground">— {t.artist}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            {/* ---------- факт ---------- */}
            {anime.fact && (
              <section className="mb-16">
                <div
                  className="rounded-2xl border p-5 sm:p-6"
                  style={{ borderColor: "rgba(212,175,55,0.35)", background: "rgba(212,175,55,0.06)" }}
                >
                  <div className="mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[#d4af37]" />
                    <span className="font-display text-xs font-bold uppercase tracking-[0.25em] text-[#d4af37]">
                      Знаете ли вы
                    </span>
                  </div>
                  <p className="text-sm leading-[1.8] text-foreground/85 sm:text-base">{anime.fact}</p>
                </div>
              </section>
            )}

            {/* ---------- назад / вперёд ---------- */}
            <nav className="mb-16 grid gap-3 sm:grid-cols-2">
              {prev ? (
                <button
                  onClick={() => onNavigate(prev.id)}
                  className="group flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-card p-4 text-left transition-colors hover:border-[#ff2b4a]/40"
                >
                  <ArrowLeft className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:-translate-x-1" />
                  <Image
                    src={prev.poster}
                    alt=""
                    width={56}
                    height={84}
                    className="h-[84px] w-14 rounded-lg object-cover"
                  />
                  <span className="min-w-0">
                    <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                      Предыдущее
                    </span>
                    <span className="font-display mt-1 block truncate text-sm font-bold">
                      {prev.title}
                    </span>
                  </span>
                </button>
              ) : (
                <span />
              )}
              {next && (
                <button
                  onClick={() => onNavigate(next.id)}
                  className="group flex items-center justify-end gap-4 rounded-2xl border border-white/[0.07] bg-card p-4 text-right transition-colors hover:border-[#ff2b4a]/40"
                >
                  <span className="min-w-0">
                    <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                      Следующее
                    </span>
                    <span className="font-display mt-1 block truncate text-sm font-bold">
                      {next.title}
                    </span>
                  </span>
                  <Image
                    src={next.poster}
                    alt=""
                    width={56}
                    height={84}
                    className="h-[84px] w-14 rounded-lg object-cover"
                  />
                  <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </button>
              )}
            </nav>
          </div>
        </motion.article>
      )}

      {loading && anime && (
        <div className="pointer-events-none fixed inset-x-0 top-0 h-0.5 overflow-hidden">
          <div className="h-full w-1/3 animate-[slide_1s_ease-in-out_infinite] bg-[#ff2b4a]" />
        </div>
      )}
      <style jsx>{`
        @keyframes slide {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(400%);
          }
        }
      `}</style>
    </motion.div>
  );
}
