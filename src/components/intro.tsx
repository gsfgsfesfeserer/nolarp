"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Petals } from "./petals";

const EASE_CUT = [0.85, 0, 0.05, 1] as const;
const EASE_OUT = [0.2, 0.8, 0.2, 1] as const;
const LETTERS = ["L", "A", "R", "P"];
const IIE = ["い", "い", "え"];

/* --- внешнее состояние "интро показано в этой сессии" --- */
let forced = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function subscribeIntro(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getIntroDone(): boolean {
  if (forced) return false;
  try {
    return sessionStorage.getItem("nolarp-intro") === "1";
  } catch {
    return true;
  }
}

function getServerIntroDone(): boolean {
  return true; // на сервере интро не рендерим
}

function finishIntro() {
  forced = false; // сбрасываем форс-повтор, иначе интро не закроется после реплея
  try {
    sessionStorage.setItem("nolarp-intro", "1");
  } catch {
    /* приватный режим */
  }
  notify();
  // сигнал для онбординга: сайт открылся
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("nolarp:intro-done"));
  }
}

export function triggerReplay() {
  forced = true;
  try {
    sessionStorage.removeItem("nolarp-intro");
  } catch {
    /* no-op */
  }
  notify();
}

/** true, когда сайт открыт (интро закончилось или отключено) */
export function useIntroFinished() {
  return useSyncExternalStore(subscribeIntro, getIntroDone, getServerIntroDone);
}

type Phase = "word" | "cut" | "engulf" | "iie";

/* капли, стекающие с разреза */
const STREAKS = [
  { left: "8%", w: 3, h: 46, fall: "16vh", dur: "1.15s", delay: "0.10s" },
  { left: "22%", w: 2, h: 74, fall: "22vh", dur: "1.35s", delay: "0.22s" },
  { left: "37%", w: 4, h: 38, fall: "14vh", dur: "1.05s", delay: "0.06s" },
  { left: "52%", w: 3, h: 88, fall: "26vh", dur: "1.45s", delay: "0.30s" },
  { left: "66%", w: 2, h: 52, fall: "18vh", dur: "1.2s", delay: "0.16s" },
  { left: "79%", w: 4, h: 66, fall: "20vh", dur: "1.3s", delay: "0.26s" },
  { left: "91%", w: 3, h: 44, fall: "15vh", dur: "1.1s", delay: "0.12s" },
];

export function Intro() {
  const prefersReduced = useReducedMotion();
  const done = useSyncExternalStore(subscribeIntro, getIntroDone, getServerIntroDone);
  const [phase, setPhase] = useState<Phase>("word");
  const visible = !done && !prefersReduced;

  // таймлайн: слово -> разрез+плавление -> поглощение -> いいえ -> сайт
  useEffect(() => {
    if (!visible) return;
    const t1 = setTimeout(() => setPhase("cut"), 1200);
    const t2 = setTimeout(() => setPhase("engulf"), 2350);
    const t3 = setTimeout(() => setPhase("iie"), 2900);
    const t4 = setTimeout(() => finishIntro(), 4900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [visible]);

  // при reduced-motion интро пропускаем, но магазин должен знать, что сайт открыт
  useEffect(() => {
    if (prefersReduced) finishIntro();
  }, [prefersReduced]);

  // повтор по событию из кнопок сайта
  useEffect(() => {
    const replay = () => {
      setPhase("word");
      triggerReplay();
    };
    window.addEventListener("nolarp:replay", replay);
    return () => window.removeEventListener("nolarp:replay", replay);
  }, []);

  const cut = phase === "cut";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="intro"
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#050409]"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04, filter: "blur(8px)" }}
          transition={{ duration: 0.75, ease: "easeInOut" }}
          aria-hidden="true"
        >
          {/* тусклое красное зарево */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-1/2 h-[80vmin] w-[80vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,43,74,0.13),transparent_65%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.75)_100%)]" />
          </div>

          <Petals count={12} />

          {/* ---------- СЦЕНА 1+2: LARP строго по центру, разрез и плавление ---------- */}
          {(phase === "word" || cut) && (
            <>
              {/* «реальность» плавится: фон размывается и насыщается по мере разреза */}
              {cut && <div className="melt-reality" />}

              {/* рвущие полосы реальности */}
              {cut && (
                <>
                  <span className="reality-tear" style={{ top: "26%", animationDelay: "0.15s" }} />
                  <span className="reality-tear" style={{ top: "64%", animationDelay: "0.45s" }} />
                  <span className="reality-tear" style={{ top: "82%", animationDelay: "0.7s" }} />
                </>
              )}

              <div className="relative">
                {/* целое слово (до разреза) */}
                <motion.h1
                  className="font-display select-none whitespace-nowrap text-[clamp(4rem,19vw,15rem)] font-black leading-none tracking-tight text-[#f2efe7]"
                  initial={{ opacity: 0, filter: "blur(14px)", scale: 1.06 }}
                  animate={
                    cut
                      ? { opacity: 0, transition: { duration: 0.01 } }
                      : { opacity: 1, filter: "blur(0px)", scale: 1 }
                  }
                  transition={{ duration: 0.35 }}
                  aria-label="LARP"
                >
                  {LETTERS.map((l, i) => (
                    <motion.span
                      key={l + i}
                      className="inline-block"
                      initial={{ opacity: 0, y: 34, filter: "blur(16px)" }}
                      animate={
                        cut
                          ? { opacity: 0 }
                          : { opacity: 1, y: 0, filter: "blur(0px)" }
                      }
                      transition={{
                        duration: 0.55,
                        delay: cut ? 0 : 0.18 + i * 0.11,
                        ease: EASE_OUT,
                      }}
                    >
                      {l}
                    </motion.span>
                  ))}
                </motion.h1>

                {/* верхняя половина — ровно до середины слова */}
                <motion.h1
                  className={`font-display intro-slice-top absolute inset-0 select-none whitespace-nowrap text-[clamp(4rem,19vw,15rem)] font-black leading-none tracking-tight text-[#f2efe7] ${
                    cut ? "" : "invisible"
                  }`}
                  style={{ transformOrigin: "50% 100%" }}
                  initial={{ opacity: 1 }}
                  animate={
                    cut
                      ? {
                          y: [0, -14, -24],
                          scaleY: [1, 1.07, 1.55],
                          opacity: [1, 1, 0],
                          filter: ["blur(0px)", "blur(2px)", "blur(13px)"],
                        }
                      : { opacity: 1 }
                  }
                  transition={{ duration: 1.15, times: [0, 0.2, 1], ease: EASE_OUT }}
                  aria-hidden="true"
                >
                  LARP
                </motion.h1>

                {/* нижняя половина — ровно от середины слова */}
                <motion.h1
                  className={`font-display intro-slice-bottom absolute inset-0 select-none whitespace-nowrap text-[clamp(4rem,19vw,15rem)] font-black leading-none tracking-tight text-[#f2efe7] ${
                    cut ? "" : "invisible"
                  }`}
                  style={{ transformOrigin: "50% 0%" }}
                  initial={{ opacity: 1 }}
                  animate={
                    cut
                      ? {
                          y: [0, 16, 34],
                          scaleY: [1, 1.12, 1.8],
                          opacity: [1, 1, 0],
                          filter: ["blur(0px)", "blur(3px)", "blur(16px)"],
                        }
                      : { opacity: 1 }
                  }
                  transition={{ duration: 1.15, times: [0, 0.2, 1], ease: EASE_OUT }}
                  aria-hidden="true"
                >
                  LARP
                </motion.h1>

                {/* раскалённый шов разреза — ровно по центру слова */}
                {cut && (
                  <motion.div
                    className="absolute left-[-15%] top-1/2 h-[3px] w-[130%] origin-left rounded-full bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_26px_7px_rgba(255,43,74,0.9)]"
                    initial={{ scaleX: 0.12, opacity: 0 }}
                    animate={{
                      scaleX: [0.12, 1.06, 1.16],
                      opacity: [0, 1, 0.85],
                    }}
                    transition={{ duration: 0.5, times: [0, 0.35, 1], ease: EASE_CUT }}
                  />
                )}

                {/* капли-потёки: реальность стекает с разреза */}
                {cut &&
                  STREAKS.map((s, i) => (
                    <span
                      key={i}
                      className="melt-streak"
                      style={
                        {
                          left: s.left,
                          width: s.w,
                          height: s.h,
                          "--md-fall": s.fall,
                          "--md-dur": s.dur,
                          "--md-delay": s.delay,
                        } as React.CSSProperties
                      }
                    />
                  ))}

                {/* искры вдоль разреза */}
                {cut &&
                  [-0.36, -0.14, 0.12, 0.34].map((x, i) => (
                    <motion.span
                      key={i}
                      className="absolute h-1.5 w-1.5 rounded-full bg-[#ffd9a0] shadow-[0_0_10px_3px_rgba(255,120,60,0.8)]"
                      style={{ left: `calc(50% + ${x * 100}%)`, top: "50%" }}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{
                        opacity: [0, 1, 0],
                        scale: [0, 1.4, 0.3],
                        x: [0, (i % 2 ? 1 : -1) * (30 + i * 18)],
                        y: [-6 - i * 8, -40 - i * 16],
                      }}
                      transition={{ duration: 0.8, delay: 0.05 + i * 0.04, ease: "easeOut" }}
                    />
                  ))}
              </div>

              {/* катана — идеальная горизонталь через середину экрана */}
              {cut && (
                <motion.div
                  className="absolute left-[-20%] top-1/2 h-[3px] w-[140%] origin-left rounded-full bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_30px_9px_rgba(255,43,74,0.85)]"
                  initial={{ scaleX: 0, opacity: 1 }}
                  animate={{ scaleX: 1, opacity: [1, 1, 0] }}
                  transition={{
                    scaleX: { duration: 0.12, ease: EASE_CUT },
                    opacity: { duration: 0.8, times: [0, 0.5, 1] },
                  }}
                />
              )}

              {/* белая вспышка удара */}
              {cut && (
                <motion.div
                  className="pointer-events-none absolute inset-0 bg-white"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.8, 0] }}
                  transition={{ duration: 0.28, times: [0, 0.12, 1] }}
                />
              )}
            </>
          )}

          {/* ---------- СЦЕНА 3: разрез растягивается и пожирает всё ---------- */}
          {(phase === "engulf" || phase === "iie") && (
            <motion.div
              className="absolute left-1/2 top-1/2 z-30"
              style={{
                x: "-50%",
                y: "-50%",
                width: "190vw",
                height: "115vh",
                background:
                  "linear-gradient(to bottom, rgba(255,43,74,0.95) 0%, #ffffff 46%, #ffffff 54%, rgba(255,43,74,0.95) 100%)",
                boxShadow: "0 0 140px 50px rgba(255,43,74,0.55)",
              }}
              initial={{ scaleY: 0.004, scaleX: 0.3, opacity: 1, filter: "blur(10px)" }}
              animate={
                phase === "engulf"
                  ? {
                      scaleY: [0.004, 1.08, 1.22],
                      scaleX: [0.3, 1, 1.05],
                      filter: ["blur(10px)", "blur(0px)", "blur(3px)"],
                    }
                  : {
                      opacity: 0,
                      scale: 1.35,
                      filter: "blur(24px)",
                      transition: { duration: 1.0, ease: "easeIn" },
                    }
              }
              transition={{
                duration: phase === "engulf" ? 0.55 : 1.0,
                times: phase === "engulf" ? [0, 0.7, 1] : undefined,
                ease: EASE_CUT,
              }}
            />
          )}

          {/* ---------- СЦЕНА 4: いいえ ---------- */}
          {phase === "iie" && (
            <div className="relative z-40 flex flex-col items-center">
              {/* энсо — красный круг кистью */}
              <motion.svg
                viewBox="0 0 200 200"
                className="absolute left-1/2 top-1/2 h-[min(60vmin,420px)] w-[min(60vmin,420px)] -translate-x-1/2 -translate-y-1/2 -rotate-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                aria-hidden="true"
              >
                <motion.circle
                  cx="100"
                  cy="100"
                  r="86"
                  fill="none"
                  stroke="rgba(255,43,74,0.9)"
                  strokeWidth="5"
                  strokeLinecap="round"
                  pathLength={1}
                  transform="rotate(-80 100 100)"
                  style={{ filter: "drop-shadow(0 0 14px rgba(255,43,74,0.55))" }}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 0.92 }}
                  transition={{ duration: 0.75, ease: [0.3, 0, 0.3, 1] }}
                />
              </motion.svg>

              <div className="font-jp flex items-baseline gap-[0.15em] text-[clamp(3.2rem,11vw,7.5rem)] font-black text-[#f6f3ea]">
                {IIE.map((ch, i) => (
                  <motion.span
                    key={i}
                    className="inline-block drop-shadow-[0_0_22px_rgba(255,43,74,0.35)]"
                    initial={{ opacity: 0, scale: 1.5, filter: "blur(10px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    transition={{ duration: 0.4, delay: 0.12 + i * 0.14, ease: EASE_OUT }}
                  >
                    {ch}
                  </motion.span>
                ))}
              </div>

              <motion.p
                className="font-display mt-8 text-[clamp(0.62rem,1.4vw,0.8rem)] font-semibold uppercase tracking-[0.42em] text-[#928d9c]"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                Нет. Здесь только аниме.
              </motion.p>
            </div>
          )}

          {/* пропустить */}
          <motion.button
            onClick={finishIntro}
            className="group absolute bottom-7 right-7 z-50 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#928d9c] backdrop-blur transition-colors hover:border-[#ff2b4a]/60 hover:text-[#f2efe7]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.5 }}
          >
            Пропустить
            <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
