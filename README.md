# NoLarp

Аниме-каталог в стиле Кинопоиска: ретеллинги, персонажи, плеер (Kodik) и «Крейт» — генерация личной вкладки по любому тайтлу из интернета.

## Стек

Next.js 16 · TypeScript · Tailwind · shadcn/ui · Prisma (SQLite) · framer-motion · bun

## Запуск

```bash
bun install
cp .env.example .env
bun run db:generate
bun run db:push
bun run dev        # http://localhost:3000
```

## Структура

- `data/anime/*.json` — данные тайтлов (главы, персонажи, опенинги, франшизы)
- `public/stills`, `public/posters`, `public/chars` — стоп-кадры, постеры, портреты персонажей
- `src/components` — UI: каталог, детальная страница, интро, плеер
- `src/app/api/create` — «Крейт»: поиск через Shikimori + фоновая генерация вкладки
- `src/lib/jojo-playback.ts` — маппинг серий JoJo по частям для Kodik
- `scripts/` — инструменты сборки данных (сбор медиа, генерация ретеллингов)

Для «Крейта» нужен рабочий `z-ai-web-dev-sdk`.
