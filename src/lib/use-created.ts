"use client";

import { useEffect, useState } from "react";
import type { Anime } from "./anime-data";

export interface CreatedRecord {
  id: string;
  query: string;
  status: "searching" | "media" | "writing" | "ready" | "failed";
  message?: string;
  title?: string;
  data?: Anime;
  error?: string;
  createdAt?: string;
}

const cache = new Map<string, CreatedRecord>();

/** Подписка на статус созданной вкладки (крейт) с поллингом. */
export function useCreated(id: string | null) {
  const [record, setRecord] = useState<CreatedRecord | null>(
    id ? cache.get(id) ?? null : null
  );

  useEffect(() => {
    if (!id) {
      setRecord(null);
      return;
    }
    let alive = true;
    if (cache.has(id)) setRecord(cache.get(id) ?? null);

    const tick = async () => {
      try {
        const r = await fetch(`/api/create?id=${encodeURIComponent(id)}`, { cache: "no-store" });
        if (!r.ok) throw new Error(String(r.status));
        const rec: CreatedRecord = await r.json();
        cache.set(id, rec);
        if (alive) setRecord(rec);
        return rec.status === "ready" || rec.status === "failed";
      } catch {
        return false;
      }
    };

    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const loop = async () => {
      const done = await tick();
      if (stopped) return;
      timer = setTimeout(loop, done ? 60000 : 2500);
      if (done) {
        // после готовности ещё пара опросов не нужна — останавливаем
        clearTimeout(timer);
      }
    };
    void loop();

    return () => {
      stopped = true;
      clearTimeout(timer);
      alive = false;
    };
  }, [id]);

  return record;
}

const LIST_KEY = "nolarp-created";

export function rememberCreated(id: string, title: string) {
  try {
    const raw = localStorage.getItem(LIST_KEY);
    const list: Array<{ id: string; title: string }> = raw ? JSON.parse(raw) : [];
    const next = [{ id, title }, ...list.filter((x) => x.id !== id)].slice(0, 12);
    localStorage.setItem(LIST_KEY, JSON.stringify(next));
  } catch {
    /* приватный режим */
  }
}

export function listCreated(): Array<{ id: string; title: string }> {
  try {
    return JSON.parse(localStorage.getItem(LIST_KEY) ?? "[]");
  } catch {
    return [];
  }
}
