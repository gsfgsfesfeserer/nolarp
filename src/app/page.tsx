import { listAnimeMeta } from "@/lib/anime-data";
import { NoLarpApp } from "@/components/nolarp-app";

export const dynamic = "force-dynamic";

export default async function Home() {
  const meta = await listAnimeMeta();
  return <NoLarpApp meta={meta} />;
}
