"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";

type TourStep = {
  title: string;
  text: string;
  selector?: string; // если нет — карточка по центру экрана
};

const STEPS: TourStep[] = [
  {
    title: "いらっしゃいませ!",
    text: "Это NoLarp — каталог честных пересказов аниме. Без рецензий и воды: сразу сюжет с концовкой, герои, музыка и плеер. Проведём короткую экскурсию — 6 шагов.",
  },
  {
    selector: '[data-tour="cta-catalog"]',
    title: "Каталог",
    text: "Все тайтлы — в каталоге. Листайте сетку или сразу жмите «Случайное аниме», если выбора слишком много.",
  },
  {
    selector: '[data-tour="search"]',
    title: "Поиск",
    text: "Ищите по русскому, английскому или японскому названию: «клинок», «Steins;Gate», «涼宮» — найдётся всё, что есть в каталоге.",
  },
  {
    selector: '[data-tour="genres"]',
    title: "Фильтры",
    text: "Жанры и типы комбинируются: выберите «Драма» и «Фильм» — каталог мгновенно пересоберётся. Сортировка — рядом.",
  },
  {
    selector: '[data-tour="anime-card"]',
    title: "Карточка тайтла",
    text: "Клик по карточке открывает страницу тайтла: полный пересказ сюжета со спойлерами, персонажи с цитатами, опенинги… и плеер — аниме можно смотреть прямо на сайте.",
  },
  {
    title: "Готово — смотрите!",
    text: "Внутри каждой страницы есть раздел «Смотреть онлайн»: выбирайте серию и включайте. Вернуть экскурсию можно кнопкой «Обучение» в шапке. いいえ、ラープ!",
  },
];

const TOUR_KEY = "nolarp-tour-done";

type Rect = { top: number; left: number; width: number; height: number } | null;

export function Onboarding() {
  const [step, setStep] = useState<number | null>(null);
  const [rect, setRect] = useState<Rect>(null);
  const [tipH, setTipH] = useState(250);
  const rafRef = useRef<number>(0);
  const tipRef = useRef<HTMLDivElement>(null);

  const finish = useCallback(() => {
    setStep(null);
    setRect(null);
    try {
      localStorage.setItem(TOUR_KEY, "1");
    } catch {
      /* приватный режим */
    }
  }, []);

  const start = useCallback((force = false) => {
    try {
      if (!force && localStorage.getItem(TOUR_KEY) === "1") return;
    } catch {
      /* приватный режим — всё равно показываем */
    }
    setStep(0);
  }, []);

  /* автостарт после интро (первый визит) */
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onDone = () => {
      timer = setTimeout(() => start(false), 900);
    };
    window.addEventListener("nolarp:intro-done", onDone, { once: true });
    // если интро уже закончилось до монтирования (или его не будет)
    try {
      if (sessionStorage.getItem("nolarp-intro") === "1") {
        timer = setTimeout(() => start(false), 700);
      }
    } catch {
      /* no-op */
    }
    return () => {
      window.removeEventListener("nolarp:intro-done", onDone);
      clearTimeout(timer);
    };
  }, [start]);

  /* ручной запуск из шапки */
  useEffect(() => {
    const onTour = () => start(true);
    window.addEventListener("nolarp:tour", onTour);
    return () => window.removeEventListener("nolarp:tour", onTour);
  }, [start]);

  /* измерение цели текущего шага (постоянно, пока тур открыт) */
  useEffect(() => {
    if (step === null) return;
    const target = STEPS[step]?.selector
      ? (document.querySelector(STEPS[step].selector) as HTMLElement | null)
      : null;

    if (!target) {
      // отложенный сброс — синхронный setState в эффекте вызывает каскад рендеров
      const raf = requestAnimationFrame(() => setRect(null));
      return () => cancelAnimationFrame(raf);
    }

    // докручиваем цель в центр, если она вне вьюпорта
    const r0 = target.getBoundingClientRect();
    if (r0.top < 70 || r0.bottom > window.innerHeight - 24) {
      target.scrollIntoView({ block: "center", behavior: "smooth" });
    }

    const measure = () => {
      const el = document.querySelector(STEPS[step]?.selector ?? "") as HTMLElement | null;
      if (!el) return setRect(null);
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };

    const loop = () => {
      measure();
      const th = tipRef.current?.offsetHeight;
      if (th && th > 60) setTipH(th);
      rafRef.current = window.setTimeout(loop, 180) as unknown as number;
    };
    loop();
    return () => window.clearTimeout(rafRef.current);
  }, [step]);

  /* ESC — пропустить тур */
  useEffect(() => {
    if (step === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      if (e.key === "ArrowRight" && step < STEPS.length - 1) setStep(step + 1);
      if (e.key === "ArrowLeft" && step > 0) setStep(step - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, finish]);

  if (step === null) return null;

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];
  const centered = !rect;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;

  // позиция подсказки (без transform — framer его перезаписывает)
  let tipStyle: React.CSSProperties = {};
  if (!centered && rect) {
    const tipW = Math.min(360, vw - 32);
    const tipBelow = rect.top + rect.height + tipH + 32 < vh;
    const left = Math.min(
      Math.max(16, rect.left + rect.width / 2 - tipW / 2),
      vw - tipW - 16
    );
    tipStyle = tipBelow
      ? { top: rect.top + rect.height + 16, left, width: tipW }
      : { top: Math.max(84, rect.top - 16 - tipH), left, width: tipW };
  }

  return (
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-label="Обучение">
      {/* затемнение + прожектор */}
      {rect ? (
        <div
          className="tour-spot pointer-events-none absolute rounded-2xl transition-all duration-300"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
          }}
        />
      ) : (
        <div className="pointer-events-none absolute inset-0 bg-[#050409]/85" />
      )}

      {/* подсказка */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 14, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
          className={
            centered
              ? "absolute left-1/2 top-1/2 w-[min(420px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2"
              : "absolute"
          }
          style={centered ? undefined : tipStyle}
        >
          <div
            ref={tipRef}
            className="relative rounded-2xl border border-[#ff2b4a]/35 bg-[#12101a]/95 p-5 shadow-[0_20px_70px_-15px_rgba(255,43,74,0.4)] backdrop-blur-xl sm:p-6"
          >
            <span className="font-jp pointer-events-none absolute -top-3 right-4 text-xs tracking-[0.4em] text-[#ff2b4a]/70">
              案内
            </span>

            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
                Шаг {step + 1} из {STEPS.length}
              </span>
              <button
                onClick={finish}
                className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
                aria-label="Пропустить обучение"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <h3 className="font-display text-lg font-extrabold text-foreground sm:text-xl">
              {current.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-foreground/75">{current.text}</p>

            {/* прогресс-точки */}
            <div className="mt-4 flex items-center gap-1.5">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === step ? "w-6 bg-[#ff2b4a]" : "w-1.5 bg-white/15"
                  }`}
                />
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              {step > 0 ? (
                <button
                  onClick={() => setStep(step - 1)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/12 px-4 py-2 text-xs font-bold text-foreground/80 transition-colors hover:border-white/30"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Назад
                </button>
              ) : (
                <span />
              )}
              <button
                onClick={() => (isLast ? finish() : setStep(step + 1))}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#ff2b4a] px-5 py-2 text-xs font-bold text-white shadow-[0_8px_28px_-8px_rgba(255,43,74,0.8)] transition-transform hover:scale-105 active:scale-95"
              >
                {isLast ? (
                  <>
                    <Check className="h-3.5 w-3.5" /> Понятно
                  </>
                ) : (
                  <>
                    Далее <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
