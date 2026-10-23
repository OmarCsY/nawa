# نَوء · Nawa web app

The web front-end of **Nawa** (نَوء), the engine that forecasts household food-waste seasons and sends the right
plan, built with Litadoom. Vite + React 19 + TypeScript + Tailwind 4, Arabic and right-to-left throughout.
The product spec is [`../docs/nawa_idea.md`](../docs/nawa_idea.md); this file covers the code.

## The pages

| Route | Page | What it is | Data |
|---|---|---|---|
| `/` | **المحادثة** | The WhatsApp bot, in a phone on the page (full-screen below 768px). Voice notes, quick replies, cards for items / event / plan / result, a presenter bar (قدّم يومين · بعد المناسبة · ابدأ من جديد) and, from 1024px, a "وراء الكواليس" panel replaying the engine pipeline with a QR code. | The engine (`/v1/channels/web/inbound`, `/v1/demo/advance-time`), or the in-browser mock |
| `/dashboard` | **لوحة لتدوم** | Litadoom's dashboard: the three KPIs, cycle funnel, critical-weeks heat map, live feed, cohort trend, waste by item. Aggregates only. | Supabase views `v_*` and Realtime on `live_feed` |
| `/n/:id` | **نشرة هدر بيتك** | A household's weekly bulletin, opened from a WhatsApp link (try `/n/h_show`). | Supabase RPC `fn_nashra` |
| `/docs` | **بوابة ال API** | Swagger UI for the engine, loaded lazily, with a ready example and a pre-filled demo key on every endpoint. | `public/openapi.yaml` |
| `*` | 404 | A friendly not-found page. | — |

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check (tsc -b) + production build into dist/
npm run preview    # serve dist/ locally
npm run typecheck
```

Node 20+ recommended. Copy `.env.example` to `.env` first (see below).

## Environment variables

Only four, all read through `src/lib/env.ts` (never use `import.meta.env` elsewhere):

| Variable | Used for | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | Dashboard, bulletin | Your Supabase project URL. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Dashboard, bulletin | The **publishable** key only. It may select from `v_*` views, subscribe to inserts on `live_feed`, and call `fn_nashra`. The service key never goes in the front-end. |
| `VITE_ENGINE_URL` | Chat, `/docs` | Base URL of the n8n webhooks, no trailing slash (e.g. `https://your-n8n-host/webhook`). The `/v1/...` paths are appended to it. |
| `VITE_USE_MOCK` | Chat | `true` answers the chat from `src/mocks` instead of the network. |

All four are baked in at build time: change one, rebuild.

## Switching from the mock to the real engine

1. In `.env`: `VITE_USE_MOCK=false` and `VITE_ENGINE_URL=https://<your-n8n-host>/webhook`. Restart `npm run dev`.
2. Allow the site's origin in the engine's CORS settings (the chat sends JSON and multipart voice notes from the browser).
3. If the real response format differs from the mock's, edit **only `src/lib/engineAdapter.ts`**. It is the single place that
   builds requests and maps responses into the UI's own types (`BotMessage`, `EngineTurn`):
   - requests: `sendText`, `sendVoice`, `advanceDays`;
   - responses: `toMessages` (one engine reply becomes one or more `BotMessage`s).

   Screens never see the wire format. `src/lib/engine.ts` is just the transport (URL, timeout, errors).
4. Open `/` and walk the story: voice note, "الخميس عندنا عزيمة 14 نفر", تمام, قدّم يومين, بطبقها, بعد المناسبة, طبقتها, voice note.
   The "وراء الكواليس" panel is rebuilt from the normalized messages (`src/pages/chat/pipeline.ts`), so it follows any engine.

Things to confirm with the engine owner:

- **`change_pct` unit.** The mock and `public/openapi.yaml` use a signed fraction (`-0.62` = "أقل 62%"); the Supabase
  `fn_nashra` RPC returns whole percents (`-62`). The adapter accepts either, but pick one.
- **The demo household** is `h_demo` (`src/lib/demo.ts`). "ابدأ من جديد" resets the mock; against a live engine it only
  clears the screen, because there is no reset endpoint.
- **`/n/h_demo` in Supabase** is a quiet week, so the bulletin link in the mock story does not show Thursday in red.
  `/n/h_show` has the high-risk gathering; the nav and the dashboard's "مثال نشرة أسرة" link use it.

## The API docs

`public/openapi.yaml` is OpenAPI 3.1 for all 15 endpoints of §8.2: Arabic and English summaries, examples from the `h_demo`
story, error responses, and an `x-api-key` scheme. Lint it after editing:

```bash
npx @redocly/cli lint public/openapi.yaml
```

The page pre-authorizes the **demo key** `nawa_demo_key_2026` and, when `VITE_ENGINE_URL` is set, swaps the spec's
placeholder server (`https://engine.nawa.example`) for it. Without it, «Try it out» has nothing real to call, and the page says so.
Swagger's own look lives in `src/pages/docs/swagger-theme.css`, scoped to `.nawa-swagger`.

## Layout

```
src/
  App.tsx            routes (lazy), per-route title/description
  components/        AppShell (nav + mobile menu), Card, RiskDot, RiskStrip, states, ...
  lib/               env, supabase, engine (transport), engineAdapter, format, theme, nav, pageMeta
  pages/             one file per route; pages/chat, pages/dashboard, pages/nashra, pages/docs hold their parts
  mocks/             the in-browser engine used when VITE_USE_MOCK=true
public/              openapi.yaml, favicon.svg, og.png, apple-touch-icon.png
```

## Design rules

- Colors are tokens in `src/index.css` (`@theme`). Tailwind's default palette is wiped, so there is no stray blue, navy or default green.
- WhatsApp's colors (`wa-*` tokens) exist **only inside the chat phone**. The only blue anywhere is WhatsApp's read tick.
- Numbers inside Arabic text go through `<Num>` (or the `formatNumber` family) so signs and `%` never flip in RTL.
- Every screen that shows numbers carries the `DemoBadge`.

## Performance

Every route is its own chunk. ECharts loads only on `/dashboard`; Swagger UI (~1.4 MB) and its CSS only on `/docs`
(the page lazy-loads `SwaggerReference`); `@supabase/supabase-js` only on pages that read Supabase.
`dist/index.html` should preload nothing but the entry and a tiny JSX runtime. Check this after dependency changes.
Do not add `codeSplitting` groups for `swagger-ui` or `@supabase` in `vite.config.ts`: shared helpers land in the group and
the entry then preloads the whole thing.

## Deploying

`vercel.json` and `public/_redirects` rewrite every path to `index.html`, so `/n/h_show` and `/docs` work on refresh.
Link previews (WhatsApp, X) read `index.html` without running the app; its Open Graph image is `/og.png`.
Once the production domain is known, make `og:image` and `twitter:image` absolute URLs: some crawlers ignore relative ones.
