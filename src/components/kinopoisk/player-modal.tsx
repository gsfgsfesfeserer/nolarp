"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Maximize,
  Minimize,
  Play,
  Sparkles,
  X,
} from "lucide-react";
import type { Anime } from "@/lib/anime-data";
import { jojoPlayerUrl } from "@/lib/jojo-playback";

const EASE = [0.2, 0.8, 0.2, 1] as const;

/**
 * Плеер-модалка в стиле Кинопоиска: Kodik + лента серий.
 * Для франшиз (JoJo) — выбор части, все серии в одной вкладке.
 */
export function PlayerModal({
  anime,
  onClose,
}: {
  anime: Anime;
  onClose: () => void;
}) {
  const accent = anime.accent || "#ff2b4a";
  const parts = anime.franchise?.parts ?? [];
  const isFranchise = parts.length > 0;
  const firstReal = parts.find((p) => !p.upcoming);

  const [partNo, setPartNo] = useState<number>(firstReal?.no ?? 1);
  const [ep, setEp] = useState(1);
  const [fs, setFs] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const part = isFranchise ? parts.find((p) => p.no === partNo) ?? firstReal : null;
  const isMovie = !isFranchise && /фильм|movie/i.test(String(anime.type));
  const totalEps = isFranchise
    ? part?.episodes ?? 0
    : parseInt(String(anime.episodes ?? "0"), 10) || (isMovie ? 1 : 12);

  const shikimoriId = (anime as Anime & { shikimoriId?: number | null }).shikimoriId
    ?? null;
  const kodikTitle = (anime as Anime & { kodikTitle?: string | null }).kodikTitle ?? null;

  // сброс серии при смене тайтла/части (сброс во время рендера)
  const partKey = `${anime.id}|${partNo}`;
  const [prevKey, setPrevKey] = useState(partKey);
  if (prevKey !== partKey) {
    setPrevKey(partKey);
    setEp(1);
  }

  useEffect(() => {
    const onFs = () => setFs(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.fullscreenElement) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    document
      .getElementById(`pm-ep-chip-${ep}`)
      ?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [ep]);

  const src = useMemo<string | null>(() => {
    if (isFranchise) {
      if (!part || part.upcoming) return null;
      return jojoPlayerUrl(part.key, ep);
    }
    if (shikimoriId) {
      return `https://kodik.cc/find-player?shikimoriID=${shikimoriId}${
        isMovie || totalEps <= 1 ? "" : `&episode=${ep}`
      }`;
    }
    if (kodikTitle) {
      return `https://kodik.cc/find-player?title=${encodeURIComponent(kodikTitle)}`;
    }
    return null;
  }, [isFranchise, part, ep, shikimoriId, kodikTitle, isMovie, totalEps]);

  const toggleFs = () => {
    if (!document.fullscreenElement) void boxRef.current?.requestFullscreen?.();
    else void document.exitFullscreen();
  };

  const canSwitch = !isFranchise && !isMovie && totalEps > 1;
  const isUpcoming = isFranchise && (!part || part.upcoming);

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !document.fullscreenElement) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`Плеер — ${anime.title}`}
    >
      <motion.div
        className="w-[min(1080px,100%)]"
        initial={{ opacity: 0, y: 26, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.985 }}
        transition={{ duration: 0.35, ease: EASE }}
      >
        {/* заголовок */}
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: accent }} />
              <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: accent }} />
            </span>
            <span className="truncate text-sm font-bold">
              {isFranchise ? `JoJo · ${part?.label ?? ""}` : anime.title}
            </span>
            {isMovie && (
              <span className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold" style={{ background: `${accent}1f`, color: accent }}>
                Полный фильм
              </span>
            )}
            {!isMovie && totalEps > 1 && !isUpcoming && (
              <span className="hidden shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold sm:inline" style={{ background: `${accent}1f`, color: accent }}>
                {ep} серия из {totalEps}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-white/15 p-2 text-foreground/80 transition-colors hover:border-[#ff2b4a]/60 hover:text-[#ff5c73]"
            aria-label="Закрыть плеер"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* экран */}
        <div
          ref={boxRef}
          className="overflow-hidden rounded-2xl border bg-black shadow-2xl"
          style={{ borderColor: `${accent}55`, boxShadow: `0 24px 90px -20px ${accent}66` }}
        >
          <div className="player-frame relative aspect-video w-full bg-[#0a0910]">
            {!isUpcoming && src ? (
              <iframe
                key={src}
                src={src}
                title={`Плеер — ${anime.titleEn || anime.title}`}
                className="absolute inset-0 h-full w-full"
                allow="autoplay *; fullscreen *; encrypted-media *; picture-in-picture *"
                allowFullScreen
                referrerPolicy="origin"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
                {isUpcoming ? (
                  <>
                    <span className="font-jp text-2xl" style={{ color: accent }}>準備中</span>
                    <p className="text-sm text-muted-foreground">
                      {part?.label} — аниме официально анонсировано. Серий пока нет, зато весь
                      пересказ уже в панели справа.
                    </p>
                  </>
                ) : (
                  <>
                    <Play className="h-8 w-8 opacity-40" />
                    <p className="text-sm text-muted-foreground">
                      Плеер для этого тайтла пока не подключён.
                    </p>
                    <a
                      href={`https://shikimori.one/animes?search=${encodeURIComponent(anime.titleEn || anime.title)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs font-bold transition-colors hover:border-[#ff2b4a]/60 hover:text-[#ff5c73]"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Найти на Shikimori
                    </a>
                  </>
                )}
              </div>
            )}
          </div>

          {/* части франшизы */}
          {isFranchise && (
            <div className="flex items-center gap-1.5 overflow-x-auto border-t border-white/[0.07] bg-white/[0.03] px-3 py-2.5 [scrollbar-width:thin]">
              {parts.map((p) => (
                <button
                  key={p.key}
                  onClick={() => !p.upcoming && setPartNo(p.no)}
                  disabled={p.upcoming}
                  className={`h-9 shrink-0 rounded-lg px-3 text-xs font-bold transition-all ${
                    p.upcoming
                      ? "cursor-not-allowed border border-dashed border-white/12 text-muted-foreground/50"
                      : p.no === partNo
                        ? "scale-105 text-white shadow-lg"
                        : "border border-white/10 text-muted-foreground hover:border-white/30 hover:text-foreground"
                  }`}
                  style={p.no === partNo && !p.upcoming ? { background: accent } : undefined}
                  aria-pressed={p.no === partNo}
                  title={p.upcoming ? "Анонс" : `${p.ru} — ${p.episodes} эп.`}
                >
                  {p.no}
                  {p.upcoming ? " · анонс" : ""}
                </button>
              ))}
              <span className="ml-2 hidden shrink-0 text-[11px] text-muted-foreground sm:block">
                {part && !part.upcoming ? `${part.ru} · ${part.year}` : "Steel Ball Run — скоро"}
              </span>
            </div>
          )}

          {/* лента серий */}
          {(canSwitch || (isFranchise && part && !part.upcoming && part.episodes > 1)) && (
            <div className="flex items-center gap-1.5 overflow-x-auto border-t border-white/[0.07] bg-white/[0.02] px-3 py-2.5 [scrollbar-width:thin]">
              {canSwitch && (
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
                    onClick={() => setEp((v) => Math.min(totalEps, v + 1))}
                    disabled={ep >= totalEps}
                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground disabled:opacity-30"
                    aria-label="Следующая серия"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </>
              )}
              {Array.from({ length: totalEps }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  id={`pm-ep-chip-${n}`}
                  onClick={() => setEp(n)}
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
              <button
                onClick={toggleFs}
                className="ml-auto rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
                aria-label={fs ? "Выйти из полного экрана" : "Полный экран"}
              >
                {fs ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </button>
            </div>
          )}
        </div>

        {/* подпись */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <p>Плеер предоставлен сторонним сервисом. Приятного просмотра!</p>
          {shikimoriId ? (
            <a
              href={`https://shikimori.one/animes/${shikimoriId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-semibold transition-colors hover:text-[#ff5c73]"
            >
              <ExternalLink className="h-3 w-3" /> Страница на Shikimori
            </a>
          ) : (
            <span className="inline-flex items-center gap-1.5 opacity-60">
              <Sparkles className="h-3 w-3" /> Вкладка создана автоматически
            </span>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
