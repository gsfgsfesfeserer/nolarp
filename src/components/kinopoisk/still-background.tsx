"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const SWAP_MS = 7000;

function stillsFor(id: string, count: number): string[] {
  return Array.from({ length: Math.max(1, count) }, (_, i) => `/stills/${id}/${i + 1}.jpg`);
}

/**
 * Фон в стиле Кинопоиска: несколько кадров из самого тайтла,
 * которые плавно сменяют друг друга (с медленным наездом камеры).
 */
export function StillBackground({
  id,
  stills,
  poster,
  active,
}: {
  id: string;
  stills: number;
  poster: string;
  active: boolean;
}) {
  const frames = stills > 0 ? stillsFor(id, stills) : [];
  const [idx, setIdx] = useState(0);
  const pausedRef = useRef(false);

  // сброс слайда при смене тайтла (сброс во время рендера — без эффекта)
  const [prevId, setPrevId] = useState(id);
  if (prevId !== id) {
    setPrevId(id);
    setIdx(0);
  }

  useEffect(() => {
    if (!active || frames.length <= 1) return;
    const t = setInterval(() => {
      if (!pausedRef.current) setIdx((v) => (v + 1) % frames.length);
    }, SWAP_MS);
    return () => clearInterval(t);
  }, [active, frames.length]);

  const current = frames.length ? frames[idx] : null;

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#07060a]" aria-hidden="true">
      <AnimatePresence mode="sync">
        {current ? (
          <motion.div
            key={`${id}-${idx}`}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, scale: 1.06 }}
            exit={{ opacity: 0 }}
            transition={{
              opacity: { duration: 1.6, ease: "easeInOut" },
              scale: { duration: 8, ease: "linear" },
            }}
          >
            <Image
              src={current}
              alt=""
              fill
              priority={idx === 0}
              sizes="100vw"
              className="object-cover"
              onError={() => setIdx((v) => (v + 1) % Math.max(1, frames.length))}
            />
          </motion.div>
        ) : (
          poster && (
            <motion.div
              key={`${id}-poster`}
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, scale: 1.08 }}
              transition={{ duration: 1.2 }}
            >
              <Image src={poster} alt="" fill priority sizes="100vw" className="object-cover opacity-60 blur-md" />
            </motion.div>
          )
        )}
      </AnimatePresence>

      {/* градиенты: тёмный низ, левая панель под текст, лёгкая виньетка */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#07060a] via-[#07060a]/35 to-[#07060a]/55" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#07060a] via-[#07060a]/72 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(7,6,10,0.55)_100%)]" />

      {/* точки-кадры */}
      {frames.length > 1 && (
        <div className="absolute bottom-5 right-5 z-10 flex items-center gap-1.5">
          {frames.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                pausedRef.current = true;
                setIdx(i);
                setTimeout(() => (pausedRef.current = false), SWAP_MS);
              }}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === idx ? "w-6 bg-[#ff2b4a]" : "w-1.5 bg-white/25 hover:bg-white/50"
              }`}
              aria-label={`Кадр ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
