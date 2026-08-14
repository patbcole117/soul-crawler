# SOULRIFT — War for the Ashen Veil

A loot-hunting dungeon crawler in the spirit of Diablo, built as a single static
site with no build step and no dependencies. 27 hand-themed dungeons, each with
its own boss, a final Devil King, procedurally generated loot with six rarity
tiers, and animated opening/ending cutscenes telling the story of a war between
Heaven and Hell for the soul of the universe.

Everything runs client-side (plain HTML/CSS/JS ES modules) and saves progress
to `localStorage`, so it works equally well as a normal web page or embedded in
an `<iframe>`.

## Running it locally

No build step needed — just serve the folder statically, e.g.:

```
python3 -m http.server 8080
```

then open `http://localhost:8080`. (Opening `index.html` directly via
`file://` won't work because it uses ES module `<script type="module">`
imports, which browsers block on the `file://` protocol.)

## Deploying to GitHub Pages

1. Create a new GitHub repository and push this folder to it:
   ```
   git init
   git add .
   git commit -m "SOULRIFT: initial release"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git push -u origin main
   ```
2. On GitHub, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to `Deploy from a branch`,
   branch `main`, folder `/ (root)`. Save.
4. After a minute or two your game will be live at:
   `https://<your-username>.github.io/<your-repo>/`

## Embedding in an Obsidian note

Once the GitHub Pages URL is live, embed it in any note with a raw HTML
`iframe` (Obsidian renders inline HTML in Reading/Live Preview mode):

```html
<iframe src="https://<your-username>.github.io/<your-repo>/" width="100%" height="800" style="border:none; border-radius:8px;"></iframe>
```

Progress is saved in the browser's `localStorage`, scoped to the GitHub Pages
origin — so it persists across sessions as long as Obsidian doesn't clear
site data for that origin.

## Game structure

- `index.html` — entry point, loads `css/style.css` and `js/main.js`.
- `js/data.js` — rarities, affixes, item bases, and all 27 dungeon themes.
- `js/items.js` — procedural loot generation (rarity roll, affixes, naming).
- `js/player.js` — player stats, leveling, equipment, inventory.
- `js/combat.js` — turn resolution, crit/dodge/lifesteal, enemy scaling.
- `js/dungeon.js` — procedural grid generation, fog of war.
- `js/cutscenes.js` — opening/ending slide data + canvas particle field.
- `js/save.js` — localStorage persistence.
- `js/ui.js` — small HTML templating helpers (item cards, bars, paperdoll).
- `js/main.js` — app state machine, screen rendering, event wiring.

## Design notes

- All 27 dungeons + the final Rift of Souls are procedurally generated grids
  (drunkard's-walk carving + BFS for boss placement), themed with hand-written
  names/flavor/enemy pools, and scale in size and enemy power by depth.
- Loot has 6 rarity tiers (Common → Mythic) with a prefix/suffix affix system
  across 7 equipment slots, so no two runs feel the same.
- Dungeons unlock sequentially but stay replayable afterward ("Farm") for
  grinding better gear before the final boss.
- Combat has a manual mode and an Auto-battle toggle for faster grinding
  across 27+ dungeons.
