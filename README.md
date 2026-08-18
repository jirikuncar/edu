# Amber Sea

Two offline learning voyages for children, sharing one design system, one
language switch and one installable app shell.

- **The Golden Compass** — fifteen olympiad-style maths puzzles (Kangaroo
  Pre-Ecolier / Ecolier level), each guarded by a character on an island.
- **Atlas Drill** — flags, capitals and country outlines for all 195 UN member
  and observer states, weighted so the ones you keep missing come back.

Live at <https://jirikuncar.github.io/edu/>.

## What it does

- **Works offline.** A service worker precaches every page, font and the 756 kB
  world atlas, so after the first visit there is nothing left to fetch.
- **Installs like an app.** Manifest, maskable icons, Apple touch icon and
  shortcuts; "Add to Home Screen" in Safari and "Install app" in Chrome.
- **English and Spanish**, including country and capital names. The choice is
  made on the hub and follows you into both games.
- **Nothing leaves the device.** Progress, player names and high scores live in
  `localStorage` under the `edu:` prefix. No accounts, analytics or network
  calls at runtime.
- **One screen deep.** Every question and every answered state fits an
  iPhone 13 without scrolling, in both languages, even with the longest
  country and capital names in the data set. Illustrations, the map and the
  hands-on props are sized in viewport units and step back once answered;
  the next step always sits in a sticky bar at the bottom of the screen.
- **Accessible.** Landmarks, live regions, managed focus, keyboard play
  (number keys answer, Enter advances), 44px touch targets and WCAG AA
  contrast on every text tier — checked by axe in the test suite.
- **Haptics** on answers, with a switch on the hub to turn them off. Android
  gets patterned vibration through `navigator.vibrate`; iOS has no such API,
  so Safari 17.4+ gets a single system tick by toggling a hidden `switch`
  control inside the tap. Everywhere else it is a no-op and the setting says
  so.

## Working on it

```sh
pnpm install
pnpm dev          # http://localhost:5173/edu/
pnpm build        # -> dist/
pnpm test         # tests run against dist/, so build first
```

`pnpm test` serves `dist/` from the test process itself and drives a real
Chromium through both games: full playthroughs, offline reloads, the install
manifest, phone layouts down to 280px, virtual-keyboard layout and an axe
audit of every screen in both languages, and it measures every screen for
vertical overflow so a question can never quietly grow past the fold. The
files run in parallel and the whole suite takes about five seconds.

Two generators are checked in and rarely need re-running:

```sh
pnpm icons                     # public/icons/* from one inline SVG
node scripts/fetch-fonts.mjs   # re-pull the self-hosted font subsets
```

## Layout

```
index.html            hub
compass/, atlas/      the two games (Vite multi-page entries)
src/lib/              shell, i18n, storage, haptics — shared by all three
src/styles/app.css    design tokens and shared components
src/compass/          puzzle data, screens, the toll tray, star field
src/atlas/            country data (EN/ES), TopoJSON decoding, React app
public/data/          world-atlas countries-50m.json, served locally
.github/workflows/    build, test and deploy to Pages
```

Deployment happens on every push to `main`: the workflow builds, runs the
browser suite, and publishes `dist/` to GitHub Pages. The site is served from
`/edu/`, which is set as `base` in `vite.config.js` — change it there if the
repository is renamed or moved to a custom domain.
