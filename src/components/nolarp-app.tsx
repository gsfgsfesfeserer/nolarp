"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useScroll,
  useSpring,
} from "framer-motion";
import {
  ChevronsDown,
  Clapperboard,
  Dices,
  GraduationCap,
  Home,
  Library,
  Swords,
} from "lucide-react";
import type { Anime, AnimeMeta } from "@/lib/anime-data";
import { useAnime } from "@/lib/use-anime";
import { useCreated } from "@/lib/use-created";
import { Petals } from "./petals";
import { Intro, useIntroFinished } from "./intro";
import { Catalog } from "./catalog";
import { Onboarding } from "./onboarding";
import { TitleHero } from "./kinopoisk/title-hero";
import { RetellingPanel } from "./kinopoisk/retelling-panel";
import { PlayerModal } from "./kinopoisk/player-modal";
import { CreateDialog } from "./kinopoisk/create-dialog";

const FEATURED = [
  "frieren",
  "fullmetal-alchemist-brotherhood",
  "attack-on-titan",
  "steins-gate",
  "jojo",
];

function pickFeatured(meta: AnimeMeta[]): AnimeMeta[] {
  const byId = new Map(meta.map((m) => [m.id, m]));
  const picks = FEATURED.map((id) => byId.get(id)).filter(Boolean) as AnimeMeta[];
  if (picks.length >= 5) return picks;
  // фоллбэк: топ по рейтингу
  return [...meta].sort((a, b) => b.score - a.score).slice(0, 5);
}

/* анимированный счётчик */
function CountUp({ to, ready, format }: { to: number; ready: boolean; format?: (v: number) => string }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!ready) return;
    const controls = animate(0, to, {
      duration: 1.4,
      ease: [0.2, 0.8, 0.2, 1],
      onUpdate: (x) => setV(x),
    });
    return () => controls.stop();
  }, [ready, to]);
  return <>{format ? format(v) : Math.round(v)}</>;
}

const EASE_OUT = [0.2, 0.8, 0.2, 1] as const;

export function NoLarpApp({ meta }: { meta: AnimeMeta[] }) {
  /* ---------- состояние ---------- */
  const [activeId, setActiveId] = useState<string | null>(null);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [retellingOpen, setRetellingOpen] = useState(false);
  const [crateOpen, setCrateOpen] = useState(false);

  const ready = useIntroFinished();
  const heroRef = useRef<HTMLElement>(null);

  const isCreated = Boolean(activeId?.startsWith("cr-"));

  // данные тайтла: из каталога (useAnime) или из крейта (useCreated)
  const { anime: catalogAnime, loading: catalogLoading } = useAnime(
    activeId && !isCreated ? activeId : null
  );
  const created = useCreated(isCreated ? activeId : null);

  const anime: Anime | null = isCreated ? (created?.data ?? null) : catalogAnime;
  const animeLoading = isCreated
    ? !created || (created.status !== "ready" && !created.data)
    : catalogLoading;
  const createMessage = created?.message ?? created?.error ?? undefined;

  const metaEntry = useMemo(
    () => meta.find((m) => m.id === activeId) ?? null,
    [meta, activeId]
  );

  /* ---------- параллакс за курсором в герое ---------- */
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const clusterX = useSpring(mx, { stiffness: 55, damping: 18 });
  const clusterY = useSpring(my, { stiffness: 55, damping: 18 });

  const onHeroMove = (e: React.MouseEvent) => {
    const r = heroRef.current?.getBoundingClientRect();
    if (!r) return;
    mx.set(((e.clientX - r.left) / r.width - 0.5) * 18);
    my.set(((e.clientY - r.top) / r.height - 0.5) * 14);
  };

  /* ---------- прогресс прокрутки ---------- */
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 130, damping: 28, restDelta: 0.001 });

  const totalWords = useMemo(
    () => meta.reduce((s, m) => s + (m.plotWords || 0), 0),
    [meta]
  );
  const featured = useMemo(() => pickFeatured(meta), [meta]);

  /* ---------- навигация (hash) ---------- */
  const open = useCallback((id: string) => {
    setActiveId(id);
    setPlayerOpen(false);
    setRetellingOpen(false);
    try {
      history.replaceState(null, "", `#${id}`);
    } catch {
      /* no-op */
    }
    window.scrollTo({ top: 0 });
  }, []);

  const close = useCallback(() => {
    setActiveId(null);
    setPlayerOpen(false);
    setRetellingOpen(false);
    try {
      history.replaceState(null, "", location.pathname + location.search);
    } catch {
      /* no-op */
    }
  }, []);

  // глубокая ссылка через хэш
  useEffect(() => {
    const apply = () => {
      const h = decodeURIComponent(location.hash.replace(/^#/, ""));
      if (h && (meta.some((m) => m.id === h) || h.startsWith("cr-"))) {
        setActiveId(h);
      } else {
        setActiveId(null);
      }
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, [meta]);

  const replay = useCallback(() => {
    window.dispatchEvent(new CustomEvent("nolarp:replay"));
  }, []);

  const surprise = useCallback(() => {
    if (!meta.length) return;
    open(meta[Math.floor(Math.random() * meta.length)].id);
  }, [meta, open]);

  const openTour = useCallback(() => {
    window.dispatchEvent(new CustomEvent("nolarp:tour"));
  }, []);

  // ESC на странице тайтла — вернуться на главную (если ничего не открыто)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && activeId && !playerOpen && !retellingOpen && !crateOpen) {
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeId, playerOpen, retellingOpen, crateOpen, close]);

  const hidden = { opacity: 0, y: 24 };
  const shown = (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay, ease: EASE_OUT },
  });

  /* ======================= РЕНДЕР ======================= */

  return (
    <div className="relative flex min-h-screen flex-col">
      {/* прогресс прокрутки страницы */}
      <motion.div
        className="fixed inset-x-0 top-0 z-[80] h-[3px] origin-left bg-gradient-to-r from-[#ff2b4a] via-[#ff5c73] to-[#d4af37]"
        style={{ scaleX: progress }}
      />

      <Intro />
      <Onboarding />

      {/* ---------- ГЛАВНОЕ МЕНЮ ---------- */}
      <header className="fixed inset-x-0 top-0 z-40 border-b border-white/[0.06] bg-[#07060a]/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (activeId) close();
              else window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="font-display flex items-baseline gap-1 text-lg font-black tracking-tight"
          >
            NO<span className="logo-slash text-[#ff2b4a]">LARP</span>
            <span className="font-jp ml-2 hidden text-[10px] font-bold tracking-[0.3em] text-muted-foreground sm:inline">
              いいえ
            </span>
          </a>

          <nav className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground sm:gap-3 sm:tracking-[0.18em]">
            {/* Главная */}
            <a
              href="#"
              data-tour="nav-home"
              onClick={(e) => {
                e.preventDefault();
                if (activeId) close();
                else window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className={`hidden items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors hover:text-foreground sm:inline-flex ${
                !activeId ? "text-[#ff5c73]" : ""
              }`}
            >
              <Home className="h-3.5 w-3.5" />
              Главная
            </a>

            {/* Каталог / меню тайтлов */}
            <a
              href="#catalog"
              data-tour="nav-catalog"
              className={`hidden items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors hover:text-foreground md:inline-flex ${
                !activeId ? "" : "text-[#ff5c73]"
              }`}
            >
              <Library className="h-3.5 w-3.5" />
              Тайтлы
            </a>

            {/* Крейт */}
            <button
              onClick={() => setCrateOpen(true)}
              data-tour="nav-crate"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#d4af37]/50 bg-[#d4af37]/10 px-3 py-1.5 text-[#f2c14e] transition-all hover:border-[#d4af37] hover:bg-[#d4af37]/20"
            >
              <Clapperboard className="h-3.5 w-3.5" />
              Крейт
            </button>

            {/* Случайное */}
            <button
              onClick={surprise}
              className="hidden items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 transition-colors hover:border-[#ff2b4a]/60 hover:text-foreground lg:inline-flex"
              aria-label="Случайное аниме"
            >
              <Dices className="h-3.5 w-3.5 text-[#f2c14e]" />
              Случайное
            </button>

            {/* Обучение */}
            <button
              onClick={openTour}
              className="hidden items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 transition-all hover:border-[#d4af37]/60 hover:text-[#f2c14e] xl:inline-flex"
            >
              <GraduationCap className="h-3.5 w-3.5" />
              Обучение
            </button>

            <span className="hidden rounded-full border border-[#ff2b4a]/40 bg-[#ff2b4a]/10 px-3 py-1.5 text-[#ff5c73] sm:inline">
              {meta.length} тайтлов
            </span>
          </nav>
        </div>
      </header>

      {/* ================= ГЛАВНАЯ ================= */}
      {!activeId && (
        <section
          id="top"
          ref={heroRef}
          onMouseMove={onHeroMove}
          className="relative flex min-h-[100svh] items-center overflow-hidden pt-16"
        >
          <Petals count={12} />
          <div className="scanline" aria-hidden="true" />
          <div className="pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-[#ff2b4a]/10 blur-[120px]" />
          <div className="pointer-events-none absolute -right-24 bottom-1/4 h-80 w-80 rounded-full bg-[#d4af37]/8 blur-[110px]" />

          {/* вертикальная японская подпись */}
          <span className="font-jp vertical-jp pointer-events-none absolute right-6 top-1/2 hidden -translate-y-1/2 text-sm font-bold text-white/15 lg:block">
            これはアニメです
          </span>

          <div className="relative mx-auto grid w-full max-w-7xl gap-14 px-4 py-16 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:items-center">
            <div>
              <motion.p
                className="font-jp mb-5 inline-flex items-center gap-2 rounded-full border border-[#ff2b4a]/30 bg-[#ff2b4a]/[0.07] px-4 py-1.5 text-xs font-bold tracking-[0.3em] text-[#ff5c73]"
                initial={hidden}
                animate={ready ? shown(0.1) : hidden}
              >
                いいえ — это значит «нет»
              </motion.p>

              <motion.h1
                className="font-display text-[clamp(2.6rem,7vw,5.2rem)] font-black leading-[1.02] tracking-tight"
                initial={hidden}
                animate={ready ? shown(0.22) : hidden}
              >
                АНИМЕ,
                <br />
                <span className="text-[#ff2b4a]">БЕЗ РОЛЕВЫХ</span>
                <br />ИГР.
              </motion.h1>

              <motion.p
                className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg"
                initial={hidden}
                animate={ready ? shown(0.36) : hidden}
              >
                Здесь нет косплея, ларпа и игр в аниме-персонажей. Есть{" "}
                <b className="text-foreground">{meta.length} тайтлов</b> с полными пересказами
                сюжета — честно, с концовками,{" "}
                <b className="text-foreground">{(totalWords / 1000).toFixed(0)} 000+ слов</b>{" "}
                вместо рецензий. Герои, цитаты, опенинги — всё внутри. И плеер: смотрите
                прямо здесь.
              </motion.p>

              <motion.div
                className="mt-9 flex flex-wrap items-center gap-4"
                initial={hidden}
                animate={ready ? shown(0.5) : hidden}
              >
                <a
                  href="#catalog"
                  data-tour="cta-catalog"
                  className="btn-pulse group inline-flex items-center gap-2.5 rounded-full bg-[#ff2b4a] px-7 py-3.5 text-sm font-bold uppercase tracking-wider text-white transition-all"
                >
                  Открыть каталог
                  <ChevronsDown className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
                </a>
                <button
                  onClick={() => setCrateOpen(true)}
                  data-tour="cta-crate"
                  className="inline-flex items-center gap-2.5 rounded-full border border-[#d4af37]/50 bg-[#d4af37]/10 px-7 py-3.5 text-sm font-bold uppercase tracking-wider text-[#f2c14e] transition-all hover:border-[#d4af37] hover:bg-[#d4af37]/20"
                >
                  <Clapperboard className="h-4 w-4" />
                  Создать вкладку
                </button>
                <button
                  onClick={replay}
                  className="inline-flex items-center gap-2.5 rounded-full border border-white/12 px-7 py-3.5 text-sm font-bold uppercase tracking-wider text-foreground/80 transition-colors hover:border-[#ff2b4a]/50 hover:text-foreground"
                >
                  <Swords className="h-4 w-4 text-[#ff2b4a]" />
                  Разрезать LARP ещё раз
                </button>
              </motion.div>

              {/* статистика */}
              <motion.dl
                className="mt-12 grid max-w-xl grid-cols-3 divide-x divide-white/[0.07]"
                initial={{ opacity: 0 }}
                animate={ready ? { opacity: 1, transition: { duration: 0.7, delay: 0.65 } } : { opacity: 0 }}
              >
                <div className="px-5 first:pl-0">
                  <dt className="font-display text-2xl font-black text-foreground sm:text-3xl">
                    <CountUp to={meta.length} ready={ready} />
                  </dt>
                  <dd className="mt-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    тайтлов
                  </dd>
                </div>
                <div className="px-5 first:pl-0">
                  <dt className="font-display text-2xl font-black text-foreground sm:text-3xl">
                    <CountUp to={totalWords} ready={ready} format={(v) => `${(v / 1000).toFixed(1)}k`} />
                  </dt>
                  <dd className="mt-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    слов пересказа
                  </dd>
                </div>
                <div className="px-5 first:pl-0">
                  <dt className="font-display text-2xl font-black text-[#ff2b4a] sm:text-3xl">
                    0
                  </dt>
                  <dd className="mt-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    ларпа
                  </dd>
                </div>
              </motion.dl>
            </div>

            {/* плавающие постеры избранного (с параллаксом) */}
            <motion.div
              className="relative mx-auto hidden h-[480px] w-full max-w-md sm:block lg:h-[560px]"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={ready ? { opacity: 1, scale: 1, transition: { duration: 0.8, delay: 0.4 } } : { opacity: 0, scale: 0.94 }}
              aria-hidden="true"
            >
              <motion.div className="absolute inset-0" style={{ x: clusterX, y: clusterY }}>
                {featured.map((f, i) => {
                  const spots = [
                    { left: "4%", top: "6%", rot: -8, w: 168, z: 5 },
                    { left: "38%", top: "0%", rot: 5, w: 190, z: 6 },
                    { left: "64%", top: "22%", rot: 10, w: 158, z: 4 },
                    { left: "14%", top: "48%", rot: 6, w: 176, z: 7 },
                    { left: "44%", top: "42%", rot: -5, w: 196, z: 8 },
                  ];
                  const s = spots[i % spots.length];
                  return (
                    <motion.button
                      key={f.id}
                      onClick={() => open(f.id)}
                      className="floaty absolute overflow-hidden rounded-xl border border-white/10 shadow-2xl transition-[border-color,box-shadow] duration-500 hover:z-20 hover:!rotate-0 hover:scale-105 hover:border-white/25"
                      style={
                        {
                          left: s.left,
                          top: s.top,
                          width: s.w,
                          zIndex: s.z,
                          rotate: s.rot,
                          "--float-dur": `${5 + (i % 3)}s`,
                          "--float-delay": `${i * 0.7}s`,
                        } as unknown as React.CSSProperties
                      }
                      initial={{ opacity: 0, y: 40 }}
                      animate={ready ? { opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.5 + i * 0.1 } } : { opacity: 0 }}
                      whileHover={{ zIndex: 30 }}
                      tabIndex={0}
                    >
                      <Image
                        src={f.poster}
                        alt=""
                        width={400}
                        height={600}
                        className="h-auto w-full object-cover"
                      />
                      <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/90 to-transparent px-2 pb-2 pt-6 text-left text-[10px] font-bold text-white">
                        {f.title}
                      </span>
                    </motion.button>
                  );
                })}
              </motion.div>
            </motion.div>
          </div>

          {/* стрелка вниз */}
          <motion.a
            href="#catalog"
            className="absolute bottom-6 left-1/2 -translate-x-1/2 text-muted-foreground transition-colors hover:text-[#ff2b4a]"
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            aria-label="Прокрутить к каталогу"
          >
            <ChevronsDown className="h-6 w-6" />
          </motion.a>
        </section>
      )}

      {/* ================= СТРАНИЦА ТАЙТЛА (Кинопоиск) ================= */}
      {activeId && (
        <TitleHero
          anime={anime}
          meta={metaEntry ?? undefined}
          loading={animeLoading}
          creating={isCreated && !anime}
          createMessage={createMessage}
          onWatch={() => setPlayerOpen(true)}
          onRetelling={() => setRetellingOpen(true)}
          onRandom={surprise}
        />
      )}

      {/* ---------- каталог / рекомендации ---------- */}
      <Catalog
        key={activeId ?? "home"}
        meta={meta}
        onSelect={open}
        heading={activeId ? "Рекомендации" : "Каталог"}
        jp={activeId ? "おすすめ · РЕКОМЕНДАЦИИ" : "目録 · МОКУРОКУ"}
        subheading={
          activeId
            ? `${meta.length} тайтлов каталога: ищите похожие по жанрам и рейтингу.`
            : undefined
        }
      />

      {/* ---------- футер ---------- */}
      <footer className="mt-auto border-t border-white/[0.06] bg-[#090810]">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 py-12 text-center sm:px-6">
          <p className="font-display text-xl font-black">
            NO<span className="logo-slash text-[#ff2b4a]">LARP</span>
          </p>
          <p className="font-jp text-xs tracking-[0.5em] text-muted-foreground">
            アニメ、いいえラープ
          </p>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            Каталог составлен по официальным данным тайтлов и общедоступным источникам.
            Все пересказы — художественные, со спойлерами по расписанию: сразу и целиком.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={replay}
              className="rounded-full border border-white/10 px-5 py-2.5 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:border-[#ff2b4a]/50 hover:text-foreground"
            >
              Повторить интро с катаной
            </button>
            <button
              onClick={openTour}
              className="rounded-full border border-white/10 px-5 py-2.5 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:border-[#d4af37]/60 hover:text-[#f2c14e]"
            >
              Обучение
            </button>
            <button
              onClick={() => setCrateOpen(true)}
              className="rounded-full border border-[#d4af37]/40 px-5 py-2.5 text-xs font-bold uppercase tracking-[0.2em] text-[#f2c14e]/90 transition-colors hover:border-[#d4af37] hover:text-[#f2c14e]"
            >
              Крейт
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground/60">
            © {new Date().getFullYear()} NoLarp. いいえ、ラープ。
          </p>
        </div>
      </footer>

      {/* ---------- панели страницы тайтла ---------- */}
      <AnimatePresence>
        {activeId && anime && retellingOpen && (
          <RetellingPanel key={`rt-${anime.id}`} anime={anime} onClose={() => setRetellingOpen(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeId && anime && playerOpen && (
          <PlayerModal key={`pm-${anime.id}`} anime={anime} onClose={() => setPlayerOpen(false)} />
        )}
      </AnimatePresence>

      {/* ---------- крейт ---------- */}
      <CreateDialog
        open={crateOpen}
        onClose={() => setCrateOpen(false)}
        onOpenTab={(id) => open(id)}
      />
    </div>
  );
}
