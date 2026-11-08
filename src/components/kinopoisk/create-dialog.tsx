"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Plus, SearchX, Sparkles, X } from "lucide-react";
import { listCreated, rememberCreated, useCreated } from "@/lib/use-created";
import type { Anime } from "@/lib/anime-data";

const EASE = [0.2, 0.8, 0.2, 1] as const;

/**
 * «Крейт»: вводишь название аниме или фильма — создаётся личная вкладка
 * с плеером; автопересказ с фотками дописывается в фоне.
 */
export function CreateDialog({
  open,
  onClose,
  onOpenTab,
}: {
  open: boolean;
  onClose: () => void;
  onOpenTab: (id: string, title: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<Array<{ id: string; title: string }>>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const record = useCreated(pendingId);

  // открыть вкладку, как только данные готовы (в эффекте — не во время рендера)
  const openedFor = useRef<string | null>(null);
  useEffect(() => {
    if (
      record?.status === "ready" &&
      record.data &&
      pendingId &&
      openedFor.current !== pendingId
    ) {
      openedFor.current = pendingId;
      rememberCreated(pendingId, record.data.title || record.query);
      setRecent(listCreated());
      onOpenTab(pendingId, record.data.title || record.query);
      onClose();
    }
  }, [record, pendingId, onOpenTab, onClose]);

  const refreshRecent = () => setRecent(listCreated());

  const submit = async () => {
    const q = query.trim();
    if (!q || pendingId) return;
    setError(null);
    try {
      const r = await fetch("/api/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const j = await r.json();
      if (!r.ok || !j.id) throw new Error(j.error || "Не удалось создать вкладку");
      setPendingId(j.id);
      refreshRecent();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка сети");
    }
  };

  // фокус в поле при открытии
  const wasOpen = useRef(false);
  if (open && !wasOpen.current) {
    wasOpen.current = true;
    refreshRecent();
    setTimeout(() => inputRef.current?.focus(), 120);
  } else if (!open) {
    wasOpen.current = false;
  }

  const statusText =
    record?.message ||
    (record?.status === "writing"
      ? "пересказ пишется…"
      : record?.status === "media"
        ? "Загружаем постер и кадры…"
        : record?.status === "searching"
          ? "Ищем тайтл на Shikimori…"
          : record?.status === "failed"
            ? "Не получилось. Попробуйте другое название."
            : null);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[75] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Создать вкладку"
        >
          <motion.div
            className="w-[min(540px,100%)] overflow-hidden rounded-3xl border border-white/10 bg-[#0d0b13] shadow-2xl"
            initial={{ opacity: 0, y: 26, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.32, ease: EASE }}
          >
            <div className="flex items-center justify-between border-b border-white/[0.07] px-6 py-4">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[#ff2b4a]/15">
                  <Sparkles className="h-4 w-4 text-[#ff2b4a]" />
                </span>
                <div>
                  <h2 className="font-display text-base font-black">Крейт</h2>
                  <p className="text-[11px] text-muted-foreground">
                    Личная вкладка по любому названию
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-full border border-white/10 p-2 text-foreground/70 transition-colors hover:border-[#ff2b4a]/60 hover:text-[#ff5c73]"
                aria-label="Закрыть"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 py-6">
              <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                Напишите название аниме или фильма — например{" "}
                <button className="text-foreground/90 underline decoration-[#ff2b4a]/50 underline-offset-4" onClick={() => setQuery("Матрица")}>
                  «Матрица»
                </button>{" "}
                или{" "}
                <button className="text-foreground/90 underline decoration-[#ff2b4a]/50 underline-offset-4" onClick={() => setQuery("Hajime no Ippo")}>
                  «Hajime no Ippo»
                </button>
                . Вкладка с плеером появится сразу, пересказ с картинками допишется автоматически.
              </p>

              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  placeholder="Название аниме или фильма…"
                  maxLength={120}
                  disabled={Boolean(pendingId)}
                  className="h-12 min-w-0 flex-1 rounded-xl border border-white/12 bg-black/40 px-4 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-[#ff2b4a]/60"
                />
                <button
                  onClick={submit}
                  disabled={!query.trim() || Boolean(pendingId)}
                  className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-[#ff2b4a] px-5 text-sm font-bold uppercase tracking-wider text-white transition-all hover:brightness-110 disabled:opacity-40"
                >
                  {pendingId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Создать
                </button>
              </div>

              {error && (
                <p className="mt-3 flex items-center gap-2 text-sm text-[#ff5c73]">
                  <SearchX className="h-4 w-4" /> {error}
                </p>
              )}

              {/* прогресс создания */}
              <AnimatePresence>
                {pendingId && record && record.status !== "ready" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="flex items-center gap-3">
                        {record.status === "failed" ? (
                          <SearchX className="h-5 w-5 shrink-0 text-[#ff5c73]" />
                        ) : (
                          <Loader2 className="h-5 w-5 shrink-0 animate-spin text-[#ff2b4a]" />
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {record.title || record.query}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {record.error || statusText}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                        <div className="h-full w-1/3 animate-[slide_1.4s_ease-in-out_infinite] rounded-full bg-[#ff2b4a]" />
                      </div>
                      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground/70">
                        Вкладку можно открыть сразу после готовности — плеер уже работает, пока
                        пересказ дописывается.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* недавно созданные */}
              {recent.length > 0 && (
                <div className="mt-5">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                    Ваши вкладки
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {recent.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => {
                          onOpenTab(r.id, r.title);
                          onClose();
                        }}
                        className="rounded-full border border-white/10 px-3.5 py-1.5 text-xs font-semibold text-foreground/80 transition-colors hover:border-[#d4af37]/60 hover:text-[#f2c14e]"
                      >
                        {r.title || r.id}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
