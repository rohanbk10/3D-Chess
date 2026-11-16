# Wizard's Chess 3D

A 3D chess game set in a gothic cathedral: polished marble against dark obsidian. Pieces shatter when captured, the camera shakes harder for bigger pieces, and there are 8-bit victory and defeat tunes. You can play against a web-worker AI (Easy, Normal or Hard) or a friend on the same device, with spell hints, undo and automatic save.

It is a plain static site (HTML, CSS and JavaScript), so there is nothing to build to run or host it.

## Features

- Full chess rules: castling, en passant, promotion, check, checkmate, stalemate, threefold repetition, fifty-move rule and insufficient material
- Procedural 3D pieces, a classic checkered board with A-H and 1-8 labels, and last-move, check and hint highlights
- AI opponent with three difficulty levels, running in a web worker so the page never freezes
- Pass & Play mode: the camera swings round to the side that is about to move
- Spell Hint, Undo, move log, captured-piece tally and material difference
- Capture screen shake scaled by piece (pawn smallest, queen largest)
- Procedural sound effects and 8-bit victory and defeat tunes
- Autosave in the browser, keyboard shortcuts, touch support with pinch zoom
- Works offline: every library, font and icon is bundled locally

## Tech stack

| Area | Technology |
| --- | --- |
| Language | Vanilla JavaScript (classic scripts, no framework, no bundler) |
| 3D rendering | [three.js](https://threejs.org/) r128 (WebGL) |
| Chess rules | [chess.js](https://github.com/jhlywa/chess.js) 0.10.3 (locally patched, see below) |
| AI | Custom engine: negamax with alpha-beta pruning, iterative deepening, quiescence search, piece-square tables, run in a Web Worker |
| Audio | [Tone.js](https://tonejs.github.io/) 14.8.49 (procedural synths, no audio files) |
| Styling | Tailwind CSS 3.4 (build-time only, output committed) plus hand-written CSS |
| Fonts | Inter and Cinzel, self-hosted as woff2 |
| Icons | Material Design icons, inlined as SVG |
| Persistence | `localStorage` (game, mode, difficulty, sound) |
| Hosting | GitHub Pages (static) |

## Project structure

```
.
├── index.html               Page markup: HUD, modals, script loading order
├── favicon.svg              Tab icon
├── README.md                This file
├── package.json             Dev scripts (build:css, serve); Tailwind is the only dev dependency
├── tailwind.config.js       Tailwind content paths and the colour theme
├── .nojekyll                Tells GitHub Pages to serve files as-is
├── .gitignore               Ignores node_modules and OS files
│
├── css/
│   ├── tailwind.css         Generated utility classes (committed, rebuilt with npm run build:css)
│   ├── style.css            Hand-written styles: glass panels, buttons, icons, scrollbars
│   └── fonts.css            @font-face rules for the bundled fonts
│
├── src/
│   └── input.css            Tailwind entry file (only used when rebuilding tailwind.css)
│
├── js/                      Game code, loaded in this order by index.html
│   ├── boot.js              Loading overlay and friendly fatal-error messages
│   ├── icons.js             Inline SVG icon set and the setIcon helper
│   ├── engine-core.js       Chess AI: search, evaluation, difficulty-independent logic
│   ├── engine-worker.js     Web Worker wrapper that runs the AI off the main thread
│   ├── audio.js             Tone.js sound effects and the victory and defeat tunes
│   ├── scene.js             three.js scene, lighting, cathedral, board, labels, highlight tiles
│   ├── pieces.js            Builds the 3D marble and obsidian pieces
│   ├── animations.js        Piece glide, knight leap, capture lunge and shatter shards
│   ├── game.js              Game state and flow: rules, moves, AI turns, hints, undo, save and load
│   ├── ui.js                HUD updates, banners, modals, move log, captured pieces
│   ├── controls.js          Camera presets, orbit, pinch zoom, Pass & Play camera follow, click picking
│   ├── loop.js              Render loop: camera, idle animation, moves, shards, screen shake
│   └── main.js              Startup, event wiring, keyboard shortcuts
│
├── vendor/                  Third-party libraries and their licences
│   ├── three.min.js         three.js r128
│   ├── chess.js             chess.js 0.10.3 with a small `_raw` patch for fast move generation
│   ├── Tone.js              Tone.js 14.8.49
│   └── *.LICENSE            Licence files
│
├── fonts/                   Inter and Cinzel (woff2) with their licences
│
└── tests/
    └── engine.test.js       Node script that sanity-checks the AI
```

## What each file does

### Page and styling

- **`index.html`**: all the markup. It holds the top bar (mode, difficulty, hint, undo, sound, help, new game), the captured-pieces and move-log panels, the promotion, game-over and help dialogs, the camera bar, and the `<script>` tags in dependency order.
- **`css/style.css`**: the glass-panel look, button and chip styles, the select box, icon sizing and scrollbar styling.
- **`css/tailwind.css`**: generated from `src/input.css` and `tailwind.config.js`. Do not edit it by hand.
- **`css/fonts.css`**: declares the Inter and Cinzel fonts from `fonts/`.

### Game code (`js/`)

- **`boot.js`**: runs first. Shows the loading screen, hides it when the game is ready, and shows a readable error if WebGL or a script fails.
- **`icons.js`**: holds the SVG paths for every icon and the `setIcon` and `hydrateIcons` helpers.
- **`engine-core.js`**: the AI. It generates moves with the patched chess.js, scores positions (material plus piece-square tables, with a separate king table for endgames), and searches with alpha-beta. A noise setting makes Easy and Normal play less than perfectly.
- **`engine-worker.js`**: loads chess.js and `engine-core.js` inside a Web Worker and answers move requests. If workers are unavailable (for example when opened from `file://`), `game.js` runs the engine on the main thread instead.
- **`audio.js`**: builds the Tone.js synths and plays the move, select, capture, shatter and check sounds plus the two 8-bit jingles. Audio starts after the first click, as browsers require.
- **`scene.js`**: creates the renderer, camera, lights, the gothic cathedral (columns, arches, rose window), the board with its squares, border and A-H and 1-8 labels, and the per-square highlight markers.
- **`pieces.js`**: `createPieceMesh(type, colour)` builds each piece from simple geometry, with marble and obsidian materials and a floating crown or crest.
- **`animations.js`**: starts piece movement, including the capture lunge, and spawns the stone shards when a piece shatters.
- **`game.js`**: the core controller. It owns the chess.js game, validates clicks into moves, handles castling, en passant and promotion, detects game end, asks the engine for AI moves and hints, and handles undo, reset, mode and difficulty changes and saving to `localStorage`.
- **`ui.js`**: keeps the HUD in sync with the game (turn badge, captured pieces, material difference, move log) and controls the banner and dialogs.
- **`controls.js`**: camera presets, drag-to-orbit, scroll and pinch zoom, click-to-square picking with a raycaster, the Pass & Play camera follow, and window resizing.
- **`loop.js`**: the per-frame loop. It moves the camera, bobs idle pieces, advances the active move animation, updates shard physics and applies the capture screen shake.
- **`main.js`**: starts everything, binds buttons and keyboard shortcuts, and restores a saved game.

### Other

- **`vendor/chess.js`**: the upstream library plus a small, clearly marked `_raw` block that exposes fast move generation to the AI.
- **`tests/engine.test.js`**: checks that the AI finds mate in one, wins a free queen, and plays 60 legal plies against itself.
- **`package.json`**: scripts for rebuilding the CSS and serving the folder locally.

## Play locally

Open `index.html` directly, or serve the folder (recommended, so the AI runs in a web worker):

```
python3 -m http.server 8080
```

Then visit http://localhost:8080.

## Host on GitHub Pages

1. Push this repo to GitHub (branch `main`).
2. Open **Settings > Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, select `main` and `/ (root)`, then save.
4. After a minute the game is live at `https://<your-user>.github.io/<repo-name>/`.

## Development

```
node tests/engine.test.js     # check the AI
npm install                   # only needed to rebuild the CSS
npm run build:css             # after changing classes in index.html or js/
```

## Controls

| Action | Input |
| --- | --- |
| Move a piece | Click a piece, then a highlighted square |
| Orbit the camera | Drag |
| Zoom | Scroll or pinch |
| Spell Hint | `H` |
| Undo | `U` |
| Sound on or off | `M` |
| Camera presets | `1` to `4` |
| Deselect or close a dialog | `Esc` |

## Credits

three.js, chess.js and Tone.js (see `vendor/` for licences), Inter and Cinzel fonts (SIL Open Font License, see `fonts/`), and Material Design icons (Apache 2.0).
