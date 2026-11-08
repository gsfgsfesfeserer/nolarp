"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Maximize,
  Minimize,
  Play,
} from "lucide-react";

/**
 * Встроенный плеер: аниме смотрят прямо на сайте.
 * Источник — Kodik (find-player по Shikimori ID), как на большинстве
 * русскоязычных аниме-площадок. Фоллбэк — страница тайтла на Shikimori.
 */
export function WatchOnline({
  shikimoriId,
  episodes,
  isMovie,
  accent,
  titleEn,
}: {
  shikimoriId?: number | null;
  episodes: number;
  isMovie: boolean;
  accent: string;
  titleEn: string;
}) {
  const [ep, setEp] = useState(1);
  const [loaded, setLoaded] = useState(false);
  const [fs, setFs] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // сброс серии при смене тайтла (сброс во время рендера)
  const [prevKey, setPrevKey] = useState(shikimoriId);
  if (prevKey !== shikimoriId) {
    setPrevKey(shikimoriId);
    setEp(1);
    setLoaded(false);
  }

  useEffect(() => {
    const onFs = () => setFs(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // подсветка активной серии в ленте
  useEffect(() => {
    document
      .getElementById(`ep-chip-${ep}`)
      ?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [ep]);

  const hasPlayer = Boolean(shikimoriId);
  const src = hasPlayer
    ? `https://kodik.cc/find-player?shikimoriID=${shikimoriId}${
        isMovie || episodes <= 1 ? "" : `&episode=${ep}`
      }`
    : null;

  const toggleFs = () => {
    if (!document.fullscreenElement) void boxRef.current?.requestFullscreen?.();
    else void document.exitFullscreen();
  };

  return (
    <motion.section
      className="mb-10"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.15, ease: [0.2, 0.8, 0.2, 1] }}
      aria-label="Смотреть онлайн"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="mb-2 text-xs font-bold tracking-[0.45em]" style={{ color: accent }}>
            再生 · ПЛЕЕР
          </p>
          <h2 className="font-display flex items-center gap-2.5 text-2xl font-extrabold sm:text-3xl">
            <Play className="h-6 w-6" style={{ color: accent }} />
            Смотреть онлайн
          </h2>
        </div>
        {!isMovie && episodes > 1 && (
          <span
            className="rounded-full px-3.5 py-1.5 text-xs font-bold"
            style={{ background: `${accent}1c`, color: accent }}
          >
            {ep} серия из {episodes}
          </span>
        )}
        {isMovie && (
          <span
            className="rounded-full px-3.5 py-1.5 text-xs font-bold"
            style={{ background: `${accent}1c`, color: accent }}
          >
            Полный фильм
          </span>
        )}
      </div>

      <div
        ref={boxRef}
        className="overflow-hidden rounded-2xl border bg-black shadow-2xl transition-colors"
        style={{
          borderColor: `${accent}55`,
          boxShadow: `0 18px 70px -22px ${accent}77`,
        }}
      >
        {/* верхняя панель плеера */}
        <div className="flex items-center justify-between gap-2 border-b border-white/[0.07] bg-white/[0.03] px-3 py-2">
          <div className="flex min-w-0 items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span
                className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                style={{ background: accent }}
              />
              <span
                className="relative inline-flex h-2 w-2 rounded-full"
                style={{ background: accent }}
              />
            </span>
            <span className="truncate">Kodik · онлайн</span>
          </div>
          <div className="flex items-center gap-1.5">
            {!isMovie && episodes > 1 && (
              <>
                <button
                  onClick={() => setEp((v) => Math.max(1, v - 1))}
                  disabled={ep <= 1}
                  className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground disabled:opacity-30"
                  aria-label="Предыдущая серия"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setEp((v) => Math.min(episodes, v + 1))}
                  disabled={ep >= episodes}
                  className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground disabled:opacity-30"
                  aria-label="Следующая серия"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}
            <button
              onClick={toggleFs}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
              aria-label={fs ? "Выйти из полного экрана" : "Полный экран"}
            >
              {fs ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* экран */}
        <div className="player-frame relative aspect-video w-full bg-[#0a0910]">
          {!loaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-white/70" />
              <p className="font-jp animate-pulse text-sm text-muted-foreground">読み込み中…</p>
            </div>
          )}
          {src ? (
            <iframe
              key={src}
              src={src}
              title={`Плеер — ${titleEn}`}
              className="absolute inset-0 h-full w-full"
              allow="autoplay *; fullscreen *; encrypted-media *; picture-in-picture *"
              allowFullScreen
              referrerPolicy="origin"
              onLoad={() => setLoaded(true)}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="text-sm text-muted-foreground">
                Плеер для этого тайтла пока не подключён.
              </p>
              <a
                href={`https://shikimori.one/animes?search=${encodeURIComponent(titleEn)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-foreground/85 transition-colors hover:border-[#ff2b4a]/60 hover:text-[#ff5c73]"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Найти на Shikimori
              </a>
            </div>
          )}
        </div>

        {/* лента серий */}
        {hasPlayer && !isMovie && episodes > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto border-t border-white/[0.07] bg-white/[0.02] px-3 py-2.5 [scrollbar-width:thin]">
            {Array.from({ length: episodes }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                id={`ep-chip-${n}`}
                onClick={() => {
                  setEp(n);
                  setLoaded(false);
                }}
                className={`h-8 min-w-8 shrink-0 rounded-lg px-2 text-xs font-bold transition-all ${
                  n === ep
                    ? "scale-105 text-white shadow-lg"
                    : "border border-white/10 text-muted-foreground hover:border-white/30 hover:text-foreground"
                }`}
                style={n === ep ? { background: accent } : undefined}
                aria-label={`Серия ${n}`}
                aria-pressed={n === ep}
              >
                {n}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <p>Плеер предоставлен сторонним сервисом. Приятного просмотра!</p>
        {shikimoriId && (
          <a
            href={`https://shikimori.one/animes/${shikimoriId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-semibold transition-colors hover:text-[#ff5c73]"
          >
            <ExternalLink className="h-3 w-3" /> Страница на Shikimori
          </a>
        )}
      </div>
    </motion.section>
  );
}
