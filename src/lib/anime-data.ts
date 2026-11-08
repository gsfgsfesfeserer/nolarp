import { promises as fs } from "fs";
import path from "path";

export interface AnimeChapter {
  title: string;
  text: string;
}

export interface AnimeCharacter {
  name: string;
  original?: string;
  role?: string;
  desc: string;
  quote?: string;
}

export interface AnimeTrack {
  title: string;
  artist?: string;
  note?: string;
}

export interface FranchisePart {
  no: number;
  key: string;
  label: string;
  ru: string;
  entries?: Array<{ shikimoriId: number; from: number; to: number }>;
  episodes: number;
  year: string;
  upcoming?: boolean;
  intro: string;
  chapters: AnimeChapter[];
  characters?: AnimeCharacter[];
  openings?: AnimeTrack[];
  fact?: string;
}

export interface Franchise {
  parts: FranchisePart[];
}

export interface Anime {
  id: string;
  title: string;
  titleEn: string;
  original: string;
  year: string | number;
  yearEnd: string | number | null;
  type: string;
  episodes: string | number;
  studio: string;
  genres: string[];
  score: string | number;
  tagline: string;
  synopsis: string;
  accent: string;
  plot: { intro: string; chapters: AnimeChapter[] };
  characters: AnimeCharacter[];
  music: {
    opening?: AnimeTrack;
    ending?: AnimeTrack;
    insert?: AnimeTrack[];
  };
  fact: string;
  franchise?: Franchise;
  // путь к постеру (у созданных через крейт — /created/{id}/poster.jpg)
  poster?: string;
  // для плеера: ID на Shikimori (find-player) или точное название для поиска Kodik
  shikimoriId?: number | null;
  kodikTitle?: string | null;
}

export interface AnimeMeta {
  id: string;
  title: string;
  titleEn: string;
  original: string;
  year: number;
  yearEnd: number | null;
  type: string;
  episodes: string;
  studio: string;
  genres: string[];
  score: number;
  tagline: string;
  synopsis: string;
  accent: string;
  poster: string;
  shikimoriId?: number | null;
  plotWords: number;
  charCount: number;
  stills?: number;
  isFranchise?: boolean;
}

const DATA_DIR = path.join(process.cwd(), "data");

function normGenre(g: string): string {
  const s = (g ?? "").trim();
  return s ? s[0].toUpperCase() + s.slice(1) : "";
}

function normGenres(x: unknown): string[] {
  if (!Array.isArray(x)) return [];
  return [...new Set(x.map((g) => normGenre(String(g))).filter(Boolean))];
}

function asTrack(x: AnimeTrack | string | unknown): AnimeTrack {
  if (typeof x === "string") return { title: x };
  const o = (x ?? {}) as Record<string, unknown>;
  return {
    title: String(o.title ?? ""),
    artist: o.artist ? String(o.artist) : undefined,
    note: o.note ? String(o.note) : undefined,
  };
}

export function normalizeAnime(raw: unknown): Anime {
  const d = raw as Record<string, unknown>;
  const music = (d.music ?? {}) as Record<string, unknown>;
  let insert: AnimeTrack[] | undefined;
  if (typeof music.insert === "string") {
    insert = [asTrack(music.insert)];
  } else if (Array.isArray(music.insert)) {
    insert = music.insert.map(asTrack);
  } else if (music.insert) {
    insert = [asTrack(music.insert)];
  }
  return {
    id: String(d.id),
    title: String(d.title),
    titleEn: String(d.titleEn ?? d.title),
    original: String(d.original ?? ""),
    year: d.year as string | number,
    yearEnd: (d.yearEnd as string | number | null) ?? null,
    type: String(d.type ?? ""),
    episodes: String(d.episodes ?? ""),
    studio: String(d.studio ?? ""),
    genres: normGenres(d.genres),
    score: d.score as string | number,
    tagline: String(d.tagline ?? ""),
    synopsis: String(d.synopsis ?? ""),
    accent: String(d.accent ?? "#ff2b4a"),
    plot: {
      intro: String((d.plot as Record<string, unknown>)?.intro ?? ""),
      chapters: Array.isArray((d.plot as Record<string, unknown>)?.chapters)
        ? ((d.plot as Record<string, unknown>).chapters as AnimeChapter[])
        : [],
    },
    characters: Array.isArray(d.characters) ? (d.characters as AnimeCharacter[]) : [],
    music: {
      opening: music.opening ? asTrack(music.opening) : undefined,
      ending: music.ending ? asTrack(music.ending) : undefined,
      insert,
    },
    fact: String(d.fact ?? ""),
    poster: d.poster ? String(d.poster) : undefined,
    shikimoriId:
      d.shikimoriId === null || d.shikimoriId === undefined
        ? null
        : Number(d.shikimoriId) || null,
    kodikTitle: d.kodikTitle ? String(d.kodikTitle) : null,
    franchise:
      d.franchise && Array.isArray((d.franchise as Franchise).parts)
        ? (d.franchise as Franchise)
        : undefined,
  };
}

const animeCache = new Map<string, Anime | null>();
let metaCache: AnimeMeta[] | null = null;

export async function listAnimeMeta(): Promise<AnimeMeta[]> {
  if (metaCache) return metaCache;
  const raw = await fs.readFile(path.join(DATA_DIR, "anime-index.json"), "utf8");
  metaCache = JSON.parse(raw) as AnimeMeta[];
  return metaCache;
}

export async function getAnime(id: string): Promise<Anime | null> {
  if (!/^[a-z0-9-]+$/.test(id)) return null;
  if (animeCache.has(id)) return animeCache.get(id) ?? null;
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, "anime", `${id}.json`), "utf8");
    const anime = normalizeAnime(JSON.parse(raw));
    animeCache.set(id, anime);
    return anime;
  } catch {
    animeCache.set(id, null);
    return null;
  }
}
