"use client";

import { useEffect, useState } from "react";
import type { Anime } from "./anime-data";

const clientCache = new Map<string, Anime>();

/** Загрузка полных данных тайтла на клиенте (с кэшем). */
export function useAnime(id: string | null) {
  const [anime, setAnime] = useState<Anime | null>(
    id ? clientCache.get(id) ?? null : null
  );
  const [loading, setLoading] = useState(Boolean(id) && !(id && clientCache.has(id)));

  // смена тайтла — сброс состояния во время рендера
  const [prevId, setPrevId] = useState(id);
  if (prevId !== id) {
    setPrevId(id);
    setAnime(id ? clientCache.get(id) ?? null : null);
    setLoading(Boolean(id) && !(id && clientCache.has(id)));
  }

  useEffect(() => {
    if (!id) return;
    if (clientCache.has(id)) return;
    // loading/anime уже сброшены при смене id во время рендера
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

  return { anime, loading };
}

export function prefetchAnime(id: string) {
  if (clientCache.has(id)) return;
  fetch(`/api/anime/${id}`)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((data: Anime) => clientCache.set(id, data))
    .catch(() => {
      /* молча */
    });
}
