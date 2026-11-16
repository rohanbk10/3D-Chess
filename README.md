# Wizard's Chess 3D

A 3D chess game set in a gothic cathedral: polished marble against dark obsidian, shattering captures, a web-worker AI with three difficulty levels, local two-player mode, spell hints, undo, and automatic save. It is a plain static site (HTML, CSS, JS), so there is nothing to build to run or host it.

## Play locally

Open `index.html` directly, or serve the folder for the best behaviour (the AI then runs in a web worker):

```
python3 -m http.server 8080   # then visit http://localhost:8080
```

## Host on GitHub Pages

1. Push this repo to GitHub (branch `main`).
2. In the repo go to **Settings > Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, select `main` and `/ (root)`, then **Save**.
4. After a minute the game is live at `https://<your-user>.github.io/<repo-name>/`.

All libraries, fonts and icons are bundled locally, so the game makes no third-party requests.

## Project layout

| Path | What it is |
| --- | --- |
| `index.html` | Page markup and HUD |
| `css/` | `style.css` (custom), `fonts.css`, `tailwind.css` (generated, committed) |
| `js/scene.js`, `pieces.js`, `animations.js`, `loop.js`, `controls.js` | Three.js scene, pieces, move and shatter animation, camera and input |
| `js/game.js`, `ui.js`, `main.js` | Rules and game flow, HUD, startup and event wiring |
| `js/engine-core.js`, `engine-worker.js` | Negamax / alpha-beta AI, run in a web worker (main-thread fallback) |
| `vendor/` | three.js r128, chess.js 0.10.3 (small local patch, see the header), Tone.js |
| `tests/engine.test.js` | `node tests/engine.test.js` sanity-checks the AI (mate in one, free queen, legal self-play) |

## Changing the styling

Tailwind is used only at build time. After editing classes in `index.html` or `js/`:

```
npm install
npm run build:css
```

## Controls

Click a piece, then a highlighted square. Drag to orbit, scroll or pinch to zoom.
Keys: `H` hint, `U` undo, `M` sound, `1`-`4` camera presets, `Esc` deselect.
