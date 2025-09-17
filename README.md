
# README

A Vue 3 financial dashboard where users place multiple widgets (charts/tables) on a page, switch between saved **views** (date ranges, chart type), and see **live presence + cursors** of other users (Figma-style). Charts use **random demo data** until a real backend is connected.

---

## Quick start (install & run)

```bash
# Node 20+ recommended
npm i
npm run dev
```

Open the shown URL in **two tabs** to see live presence & cursors.
(With the current local transport, both tabs must be on the **same device & origin**.)

---

## Tech stack (and why)

- **Vue 3 + Vite** – fast DX, HMR, modern build.
- **Pinia** – app state for dashboards → widgets → views, with Save/Reset & dirty indicators.
- **PrimeVue v4** – quality UI components (Card, Tabs, Button, Tag, InputText, SelectButton, Avatar) + Tooltip directive.
- **Tailwind CSS** – utility styling; CSS layers configured so PrimeVue’s theme wins over resets.
- **ECharts** – robust charts (line, bar, donut) and resize API.
- **Y.js Awareness** – multiplayer primitives (presence, cursors) for now, backend-agnostic.
- **BroadcastChannel** – local tabs-only realtime (dev).
- **IndexedDB** (`idb`) – local persistence for Save/Reset snapshots.

---

## Features

- **State model:** dashboards → widgets → views; each view stores `state` (e.g., `dateRange`, `chartKind`).
- **Dirty indicators** per widget & dashboard; Save and Reset actions.
- **Charts:** Line, Bar, Donut. Random data by design (until backend).
- **PresenceBar:** avatars of all online users; tooltip shows name or **“You”**.
- **CursorsOverlay:** global live cursors (Figma-style), non-blocking (`pointer-events: none`).
- **Chart sizing resilience:** init only when active/visible; `ResizeObserver`, `visibilitychange`, `chart.resize()`.

---

## Project structure

```
src/
  components/
    DashboardPage.vue
    WidgetFrame.vue
    PresenceBar.vue
    CursorsOverlay.vue
    chart/
      ChartView.vue        # line
      BarChartView.vue     # bar
      DonutChartView.vue   # donut
  collab/
    provide.ts             # provide/inject doc+awareness
    names.ts               # auto “savanna” identities + color
    usePresence.ts         # start/stop presence service + usePresence()
    useLocalBroadcast.ts   # BroadcastChannel transport (dev)
    # useSupabaseYjs.ts    # (ready to plug for cross-browser realtime)
  lib/
    idb.ts                 # IndexedDB helpers (typed)
    deterministic.ts       # (optional; not required while using random data)
  stores/
    dashboard.ts           # Pinia store (state + actions)
  style.css                # Tailwind + CSS layer order
main.ts
```

---

## Tailwind + PrimeVue theme (important)

Ensure PrimeVue’s theme isn’t overridden by Tailwind’s base. Example setup:

**`main.ts`**

```ts
import 'primeicons/primeicons.css'
import './style.css' // import before app.use

import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'

createApp(App).use(PrimeVue, {
  theme: { preset: Aura, options: { cssLayer: true } }
}).mount('#app')
```

**`src/style.css`** (Tailwind v4)

```css
@layer base, primeui, components, utilities;
@import "tailwindcss";
```

If styles ever look “unstyled”, inject the `@layer` line early in `index.html` `<head>`.

---

## Environment (optional)

Local tabs-only realtime:

```ini
# .env.local
VITE_USE_LOCAL_BC=true
```

When you’re ready to go cross-browser/device, switch transport to Supabase Realtime (see `useSupabaseYjs.ts`) and set:

```ini
VITE_SB_URL=...
VITE_SB_ANON_KEY=...
```

---

## What moves to the backend later

- **Realtime:** replace BroadcastChannel with Supabase Realtime (or y-websocket/custom WS). Presence, cursors, and Y updates then sync across browsers/devices.
- **Persistence & data:** replace IndexedDB and random chart data with Postgres (e.g., Supabase) and real time-series endpoints.
- **Auth & security:** Supabase Auth + RLS; store `views.state` as JSONB; expose Save/Reset via REST/GraphQL.

---

## Build & deploy

```bash
npm run build
```

- Output: `dist/`
- Vercel:
  - **Build Command:** `npm run build`
  - **Output Directory:** `dist`
  - Node 20.x

TypeScript build fixes already included:

- Exact `idb` store name union (`StoreNames<DB>`).
- Explicit Y.js map casts.
- No implicit `any` in callbacks.

---

## Troubleshooting

- **PrimeVue theme overridden:** verify CSS layer order and `cssLayer: true`.
- **Bar/Donut appear ~100px wide on tab switch:** fixed by delayed init + resize observers; if it resurfaces, ensure charts call `resize()` on `visibilitychange` and container resize.
- **Presence not visible across browsers:** expected with `VITE_USE_LOCAL_BC=true`. Switch to Supabase provider for networked realtime.

---

## License

MIT.
