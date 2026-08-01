# BOSS BATTLE

A tiny two-page web app for the boss battle at Camp Shipyard.

## Pages

| File | What it does |
| --- | --- |
| `index.html` | Sparkly animated **BOSS BATTLE** title, plus two buttons: one that goes nowhere, and **next**. |
| `hotdog.html` | "You might be the Weiner!!" with a hotdog drawn in SVG. |
| `style.css` | Shared styling — the shimmer animation, sparkles, and buttons. |

## Run it on your own computer

Just open `index.html` in a browser. No build step, no installing anything.

## How the sparkle works

The title has a rainbow gradient *inside* the letters (`background-clip: text`), and the
`shimmer` animation slides that gradient sideways forever. The little stars floating
around are 40 tiny divs the script drops at random spots on the page.
