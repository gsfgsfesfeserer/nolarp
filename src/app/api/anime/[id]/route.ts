import { NextResponse } from "next/server";
import { getAnime, listAnimeMeta } from "@/lib/anime-data";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const anime = await getAnime(id);
  if (!anime) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  // shikimoriId хранится в индексе — добавляем, если в самом файле его нет
  if (!anime.shikimoriId) {
    const meta = (await listAnimeMeta()).find((m) => m.id === id);
    if (meta?.shikimoriId) anime.shikimoriId = meta.shikimoriId;
  }
  return NextResponse.json(anime);
}
