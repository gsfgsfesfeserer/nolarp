"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Music, Quote, Sparkles, TriangleAlert, X } from "lucide-react";
import type { Anime } from "@/lib/anime-data";

/**
 * Правая панель с большим пересказом: сюжет по главам, персонажи,
 * музыка и факт. Всплывает справа по кнопке «Пересказ».
 */
export function RetellingPanel({
  anime,
  onClose,
}: {
  anime: Anime;
  onClose: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const accent = anime.accent || "#ff2b4a";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [anime.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const parts = anime.franchise?.parts?.filter((p) => !p.upcoming) ?? [];

  return (
    <>
      {/* затемнение */}
      <motion.div
        className="fixed inset-0 z-[64] bg-black/55 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={onClose}
        aria-hidden="true"
      />
      <motion.aside
        ref={scrollRef}
        className="fixed inset-y-0 right-0 z-[65] w-[min(620px,96vw)] overflow-y-auto overscroll-contain border-l border-white/[0.08] bg-[#0b0912]/[0.985] shadow-2xl"
        initial={{ x: "104%" }}
        animate={{ x: 0 }}
        exit={{ x: "104%" }}
        transition={{ duration: 0.42, ease: [0.2, 0.8, 0.2, 1] }}
        role="dialog"
        aria-modal="true"
        aria-label={`Пересказ — ${anime.title}`}
      >
        {/* шапка панели */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/[0.07] bg-[#0b0912]/95 px-5 py-4 backdrop-blur-xl">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: accent }}>
              物語 · ПОЛНЫЙ ПЕРЕСКАЗ
            </p>
            <h2 className="font-display mt-1 truncate text-lg font-black">{anime.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-white/10 p-2 text-foreground/70 transition-colors hover:border-[#ff2b4a]/60 hover:text-[#ff5c73]"
            aria-label="Закрыть пересказ"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-6 sm:px-7">
          {/* предупреждение о спойлерах */}
          <div
            className="mb-7 flex items-start gap-3 rounded-2xl border p-4"
            style={{ borderColor: "rgba(255,43,74,0.35)", background: "rgba(255,43,74,0.07)" }}
          >
            <TriangleAlert className="mt-0.5 h-4.5 w-4.5 shrink-0 text-[#ff2b4a]" />
            <p className="text-[13px] leading-relaxed text-foreground/85">
              <b className="font-bold text-[#ff5c73]">Всё сразу и целиком.</b> Это не рецензия,
              а художественный пересказ со спойлерами по расписанию: концовка — в конце.
            </p>
          </div>

          {/* вступление */}
          {anime.plot.intro && (
            <p className="mb-9 text-[15px] leading-[1.85] text-foreground/90 sm:text-base">
              {anime.plot.intro}
            </p>
          )}

          {/* главы сюжета (для франшизы — по частям) */}
          {parts.length > 0 ? (
            <div className="flex flex-col gap-12">
              {parts.map((p) => (
                <section key={p.key}>
                  <div className="mb-4 flex items-baseline gap-3">
                    <span
                      className="font-display text-3xl font-black opacity-90"
                      style={{ color: "transparent", WebkitTextStroke: `1.5px ${accent}99` }}
                    >
                      {p.no}
                    </span>
                    <div>
                      <h3 className="font-display text-xl font-bold leading-snug">{p.label}</h3>
                      <p className="text-xs text-muted-foreground">
                        {p.ru} · {p.year} · {p.episodes} эп.
                      </p>
                    </div>
                  </div>
                  <p className="mb-5 text-[15px] leading-[1.8] text-foreground/85">{p.intro}</p>
                  <div className="flex flex-col gap-6">
                    {p.chapters.map((ch, i) => (
                      <ChapterBlock key={i} index={i} title={ch.title} text={ch.text} accent={accent} />
                    ))}
                  </div>
                  {p.fact && (
                    <p className="mt-5 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3.5 text-[13px] leading-relaxed text-foreground/70">
                      <Sparkles className="mr-1.5 inline h-3.5 w-3.5 text-[#d4af37]" />
                      {p.fact}
                    </p>
                  )}
                </section>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-10">
              {anime.plot.chapters.map((ch, i) => (
                <ChapterBlock key={i} index={i} title={ch.title} text={ch.text} accent={accent} />
              ))}
            </div>
          )}

          {/* персонажи */}
          {anime.characters.length > 0 && (
            <section className="mt-14">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: accent }}>
                登場人物 · ГЕРОИ
              </p>
              <h3 className="font-display mb-5 text-xl font-extrabold">Персонажи</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {anime.characters.slice(0, 10).map((c, i) => (
                  <div
                    key={i}
                    className="flex flex-col rounded-2xl border border-white/[0.07] bg-card p-4 transition-colors hover:border-white/[0.14]"
                  >
                    <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-2">
                      <h4 className="font-display text-sm font-bold">{c.name}</h4>
                      {c.original && (
                        <span className="font-jp text-[11px] text-muted-foreground/70">{c.original}</span>
                      )}
                    </div>
                    {c.role && (
                      <span
                        className="mb-2 w-fit rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em]"
                        style={{ background: `${accent}1c`, color: accent }}
                      >
                        {c.role}
                      </span>
                    )}
                    <p className="text-[13px] leading-relaxed text-foreground/75">{c.desc}</p>
                    {c.quote && (
                      <blockquote
                        className="mt-3 flex gap-2 rounded-lg p-2.5 text-[13px] italic leading-relaxed text-foreground/85"
                        style={{ background: `${accent}0d`, borderLeft: `2px solid ${accent}` }}
                      >
                        <Quote className="h-3.5 w-3.5 shrink-0 rotate-180 opacity-60" style={{ color: accent }} />
                        <span>{c.quote}</span>
                      </blockquote>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* музыка */}
          {(anime.music.opening || anime.music.ending || (anime.music.insert?.length ?? 0) > 0) && (
            <section className="mt-14">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: accent }}>
                音楽 · МУЗЫКА
              </p>
              <h3 className="font-display mb-5 text-xl font-extrabold">Опенинги и эндинги</h3>
              <div className="flex flex-col gap-2.5">
                {anime.music.opening && (
                  <MusicRow label="OP" track={anime.music.opening} accent={accent} />
                )}
                {anime.music.ending && (
                  <MusicRow label="ED" track={anime.music.ending} accent={accent} />
                )}
                {(anime.music.insert ?? []).map((t, i) => (
                  <MusicRow key={i} label="♪" track={t} accent={accent} muted />
                ))}
              </div>
            </section>
          )}

          {/* факт */}
          {anime.fact && (
            <section className="mt-14">
              <div
                className="rounded-2xl border p-5"
                style={{ borderColor: "rgba(212,175,55,0.35)", background: "rgba(212,175,55,0.06)" }}
              >
                <div className="mb-2.5 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#d4af37]" />
                  <span className="font-display text-xs font-bold uppercase tracking-[0.25em] text-[#d4af37]">
                    Знаете ли вы
                  </span>
                </div>
                <p className="text-sm leading-[1.8] text-foreground/85">{anime.fact}</p>
              </div>
            </section>
          )}

          <div className="h-10" />
        </div>
      </motion.aside>
    </>
  );
}

function ChapterBlock({
  index,
  title,
  text,
  accent,
}: {
  index: number;
  title: string;
  text: string;
  accent: string;
}) {
  return (
    <div>
      <div className="mb-2.5 flex items-start gap-3">
        <span
          className="font-display shrink-0 text-3xl font-black leading-none"
          style={{ color: "transparent", WebkitTextStroke: `1.4px ${accent}88` }}
          aria-hidden="true"
        >
          {String(index + 1).padStart(2, "0")}
        </span>
        <h4 className="font-display pt-0.5 text-base font-bold leading-snug sm:text-lg">{title}</h4>
      </div>
      {String(text)
        .split(/\n+/)
        .map((para, j) => (
          <p key={j} className="mb-3 text-[14px] leading-[1.85] text-foreground/80">
            {para}
          </p>
        ))}
    </div>
  );
}

function MusicRow({
  label,
  track,
  accent,
  muted,
}: {
  label: string;
  track: { title: string; artist?: string; note?: string };
  accent: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/[0.07] bg-card px-4 py-3">
      <span
        className="mt-0.5 shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold"
        style={{ background: muted ? "rgba(255,255,255,0.07)" : `${accent}1f`, color: muted ? "rgba(242,239,231,0.6)" : accent }}
      >
        {muted ? <Music className="h-3 w-3" /> : label}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{track.title}</p>
        {track.artist && <p className="truncate text-xs text-muted-foreground">{track.artist}</p>}
        {track.note && <p className="mt-0.5 text-xs leading-relaxed text-foreground/60">{track.note}</p>}
      </div>
    </div>
  );
}
