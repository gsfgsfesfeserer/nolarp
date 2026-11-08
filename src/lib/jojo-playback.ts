/**
 * Мэппинг серий JoJo для плеера Kodik.
 * Части 1–6 анимированы, 7-я (Steel Ball Run) — анонс.
 * epMap: локальная серия части i ∈ [from..to] → параметр episode = i + shift
 * у соответствующего Shikimori-тайтла в Kodik.
 */
export interface JoJoEpMap {
  shikimoriId: number;
  from: number;
  to: number;
  shift: number;
}

export const JOJO_EP_MAP: Record<string, JoJoEpMap[]> = {
  "phantom-blood": [{ shikimoriId: 14719, from: 1, to: 9, shift: 0 }],
  "battle-tendency": [{ shikimoriId: 14719, from: 1, to: 17, shift: 9 }],
  "stardust-crusaders": [
    { shikimoriId: 20899, from: 1, to: 24, shift: 0 },
    { shikimoriId: 26055, from: 25, to: 48, shift: -24 },
  ],
  "diamond-is-unbreakable": [{ shikimoriId: 31933, from: 1, to: 39, shift: 0 }],
  "golden-wind": [{ shikimoriId: 37991, from: 1, to: 39, shift: 0 }],
  "stone-ocean": [
    { shikimoriId: 48661, from: 1, to: 12, shift: 0 },
    { shikimoriId: 51367, from: 13, to: 24, shift: -12 },
    { shikimoriId: 53273, from: 25, to: 38, shift: -25 },
  ],
};

export function jojoPlayerUrl(partKey: string, episode: number): string | null {
  const maps = JOJO_EP_MAP[partKey];
  if (!maps) return null;
  const m = maps.find((x) => episode >= x.from && episode <= x.to);
  if (!m) return null;
  return `https://kodik.cc/find-player?shikimoriID=${m.shikimoriId}&episode=${episode + m.shift}`;
}

export const JOJO_MAIN_SHIKI_ID = 14719;
