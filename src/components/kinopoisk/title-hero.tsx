"use client";

import Image from "next/image";
import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpenText, Dices, Film, Play, Sparkles, Tv } from "lucide-react";
import type { Anime, AnimeMeta } from "@/lib/anime-data";
import { StillBackground } from "./still-background";
import { Petals } from "../petals";

const EASE = [0.2, 0.8, 0.2, 1] as const;

function normalizeType(t: string): string {
  const s = (t || "").toLowerCase();
  if (s.includes("франшиз")) return "Франшиза";
  if (s.includes("тв") || s === "tv") return "ТВ-сериал";
  if (s.includes("фильм") || s.includes("movie")) return "Фильм";
  return t;
}

/** Персонаж «по пояс» с вырезанным фоном, стоит справа. */
function CharacterStand({ id, accent }: { id: string; accent: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <motion.div
      className="pointer-events-none absolute bottom-0 right-[3%] z-[5] hidden h-[78%] select-none lg:block"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 0.35, ease: EASE }}
      aria-hidden="true"
    >
      <div className="floaty-slow relative h-full">
        {/* glow-подставка под персонажем */}
        <div
          className="absolute -bottom-2 left-1/2 h-8 w-[70%] -translate-x-1/2 rounded-[100%] blur-xl"
          style={{ background: `${accent}44` }}
        />
        <Image
          src={`/chars/${id}.png`}
          alt=""
          width={640}
          height={880}
          onError={() => setFailed(true)}
          className="h-full w-auto object-contain object-bottom"
          style={{
            filter: `drop-shadow(0 22px 34px rgba(0,0,0,0.55)) drop-shadow(0 0 46px ${accent}30)`,
          }}
          priority={false}
        />
      </div>
    </motion.div>
  );
}

export function TitleHero({
  anime,
  meta,
  loading,
  creating,
  createMessage,
  onWatch,
  onRetelling,
  onRandom,
}: {
  anime: Anime | null;
  meta?: AnimeMeta;
  loading: boolean;
  creating?: boolean;
  createMessage?: string;
  onWatch: () => void;
  onRetelling: () => void;
  onRandom: () => void;
}) {
  const id = anime?.id ?? meta?.id ?? "";
  const accent = anime?.accent || meta?.accent || "#ff2b4a";
  const poster = anime?.poster || meta?.poster || "";
  const stills = meta?.stills ?? 0;
  const isFranchise = Boolean(anime?.franchise);

  if (loading && !anime) {
    return (
      <section className="relative flex min-h-[92svh] items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[#07060a]" />
        <div className="relative flex flex-col items-center gap-4">
          <span className="font-jp animate-pulse text-3xl text-[#ff2b4a]">読み込み中</span>
          <p className="text-sm text-muted-foreground">Открываем страницу тайтла…</p>
        </div>
      </section>
    );
  }

  return (
    <section className="relative flex min-h-[92svh] items-stretch overflow-hidden" id="top">
      <StillBackground id={id} stills={stills} poster={poster} active />
      <Petals count={10} />

      <CharacterStand id={id} accent={accent} />

      <div className="relative z-10 mx-auto flex w-full max-w-7xl items-center px-4 pb-24 pt-28 sm:px-6 lg:pb-28">
        <div className="flex w-full flex-col gap-8 md:flex-row md:items-end">
          {/* постер */}
          <motion.div
            className="relative mx-auto w-40 shrink-0 sm:w-48 lg:w-52"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: EASE }}
          >
            {poster ? (
              <Image
                src={poster}
                alt={`Постер — ${anime?.title ?? ""}`}
                width={416}
                height={624}
                priority
                className="w-full rounded-2xl border border-white/12 object-cover shadow-2xl"
                style={{ boxShadow: `0 26px 80px -20px ${accent}77` }}
              />
            ) : (
              <div
                className="grid aspect-[2/3] w-full place-items-center rounded-2xl border border-white/10 p-4 text-center"
                style={{ background: `linear-gradient(160deg, ${accent}30, #100e15 70%)` }}
              >
                <Sparkles className="h-8 w-8 opacity-50" style={{ color: accent }} />
              </div>
            )}
          </motion.div>

          {/* текстовая колонка */}
          <div className="min-w-0 max-w-2xl flex-1">
            {/* название произведения — над блоком пересказа */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.18, ease: EASE }}
            >
              <p className="mb-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                {isFranchise ? (
                  <Film className="h-3.5 w-3.5" style={{ color: accent }} />
                ) : (
                  <Tv className="h-3.5 w-3.5" style={{ color: accent }} />
                )}
                <span style={{ color: accent }}>{anime?.studio || (creating ? "…" : "")}</span>
                {anime?.year ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>
                      {anime.year}
                      {anime.yearEnd && anime.yearEnd !== anime.year ? `–${anime.yearEnd}` : ""}
                    </span>
                  </>
                ) : null}
                {anime?.type ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{normalizeType(anime.type)}</span>
                  </>
                ) : null}
                {anime?.episodes ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>
                      {isFranchise ? "~" : ""}
                      {anime.episodes} эп.
                    </span>
                  </>
                ) : null}
              </p>

              <h1 className="font-display text-[clamp(1.9rem,4.6vw,3.6rem)] font-black leading-[1.05] tracking-tight">
                {anime?.title || "…"}
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground sm:text-base">
                {anime?.titleEn}
                {anime?.original ? (
                  <span className="font-jp ml-3 text-[13px] opacity-70">{anime.original}</span>
                ) : null}
              </p>

              <div className="mt-3.5 flex flex-wrap items-center gap-2">
                {anime?.score ? (
                  <span className="rounded-lg border border-[#f2c14e]/40 bg-[#f2c14e]/10 px-2.5 py-1 text-sm font-bold text-[#f2c14e]">
                    ★ {anime.score}
                  </span>
                ) : null}
                {(anime?.genres || []).slice(0, 4).map((g) => (
                  <span
                    key={g}
                    className="rounded-full border px-3 py-1 text-xs font-medium"
                    style={{ borderColor: `${accent}44`, color: accent, background: `${accent}0d` }}
                  >
                    {g}
                  </span>
                ))}
              </div>
            </motion.div>

            {/* кнопки: плеер и пересказ */}
            <motion.div
              className="mt-7 flex flex-wrap items-center gap-3"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.3, ease: EASE }}
            >
              <button
                onClick={onWatch}
                data-tour="cta-watch"
                className="btn-pulse group inline-flex items-center gap-2.5 rounded-full px-7 py-3.5 text-sm font-bold uppercase tracking-wider text-white transition-all"
                style={{ background: accent, boxShadow: `0 12px 34px -8px ${accent}cc` }}
              >
                <Play className="h-4 w-4 fill-current" />
                Смотреть
              </button>
              <button
                onClick={onRetelling}
                data-tour="cta-retelling"
                className="inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-black/30 px-7 py-3.5 text-sm font-bold uppercase tracking-wider text-foreground/90 backdrop-blur transition-colors hover:border-[#d4af37]/60 hover:text-[#f2c14e]"
              >
                <BookOpenText className="h-4 w-4 text-[#d4af37]" />
                Пересказ
              </button>
              <button
                onClick={onRandom}
                className="inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-black/30 px-5 py-3.5 text-sm font-bold uppercase tracking-wider text-foreground/80 backdrop-blur transition-colors hover:border-[#ff2b4a]/50 hover:text-foreground"
                aria-label="Случайное аниме"
              >
                <motion.span className="inline-flex" whileTap={{ rotate: 360 }} transition={{ duration: 0.6 }}>
                  <Dices className="h-4 w-4 text-[#f2c14e]" />
                </motion.span>
                <span className="hidden sm:inline">Случайное</span>
              </button>
            </motion.div>

            {/* небольшой пересказ — снизу слева */}
            <motion.div
              className="mt-8"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.42, ease: EASE }}
            >
              {creating ? (
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 p-4 backdrop-blur">
                  <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-white/15 border-t-[#ff2b4a]" />
                  <p className="text-sm text-muted-foreground">{createMessage || "пересказ пишется…"}</p>
                </div>
              ) : (
                anime?.synopsis && (
                  <div className="relative max-w-xl">
                    <div className="absolute -left-4 top-1 bottom-1 w-[3px] rounded-full" style={{ background: accent }} />
                    <p className="text-[15px] leading-[1.75] text-foreground/85 line-clamp-3 sm:text-base">
                      {anime.synopsis}
                    </p>
                    <button
                      onClick={onRetelling}
                      className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.16em] transition-colors"
                      style={{ color: accent }}
                    >
                      Пересказ полностью
                      <span aria-hidden="true">→</span>
                    </button>
                  </div>
                )
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* скролл-подсказка вниз к рекомендациям */}
      <motion.a
        href="#catalog"
        className="absolute bottom-5 left-1/2 z-10 -translate-x-1/2 text-muted-foreground transition-colors hover:text-[#ff2b4a]"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        aria-label="Прокрутить к рекомендациям"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </motion.a>
    </section>
  );
}
