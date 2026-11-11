# Storefront overrides (homepage, category pages, product page)

These rules override `../MASTER.md` for every public shop page. They come from two
sources: the reference reel the owner supplied, and focused searches run with the
UI/UX Pro Max skill on 2026-11-10. Admin pages use MASTER as generated.

## Why MASTER is overridden here

MASTER was generated for "E-commerce Luxury". Its style (Minimalism & Swiss), palette
and spacing fit the reel and stay in force. Three parts do not fit and are replaced:

| MASTER says | Override | Reason |
|---|---|---|
| Cormorant + Montserrat | **Syne** (brand display) + **Manrope** (everything else) | Reel uses a heavy neutral grotesk, not a serif. Pairing is the skill's "Fashion Forward" result (`--domain typography`). |
| Page pattern "Feature-Rich Showcase" | Three interactive scenes (below) plus editorial sections | That pattern is a SaaS feature grid. The reel is a product-led campaign. |
| Gold accent `#A16207` on primary buttons | Primary buttons are `#0C0A09` on white; gold only for Sale and New Release badges | Reel is black on white with no coloured buttons. |
| Card radius 12px, button radius 8px, card shadows | Radius 0 to 2px, no card shadows; products sit directly on the page | Reel shows cut-out products floating on a flat background. |

## Type

- Wordmark and hero display: Syne 800, uppercase, tracking -0.02em. The name is always `DISTRICT 19`.
- Product names: Manrope 800, uppercase, tight leading (0.95), as in the reel's top-left title.
- Body and UI: Manrope 400/500, 16px minimum, line-height 1.5.
- Prices: Manrope 500 with tabular figures. Currency is BDT, shown as `৳ 2,450`.
- Load with `next/font/google` (skill, `--stack nextjs`), never a `<link>` tag.

## Backgrounds

- Default: `#FFFFFF` page, `#FAFAF9` for alternate bands.
- Rail scene only: soft pastel gradient, mint to lilac to peach, slowly drifting
  (`background-position` over 30s). Static when reduced motion is on.

## Scene 1: the rail (hero, New Releases, shirts)

Seen in the reel at 5s to 9s.

- Garments hang from a thin horizontal line on hangers, about 10 visible on desktop, evenly spaced.
- The rail drags and scrolls sideways. Arrow buttons and keyboard arrows do the same (skill: `dragging-alternative`).
- Hover: the garment swings a few degrees from the hanger hook (transform-origin at the top centre) and settles with a spring.
- Click: the chosen garment moves to the centre and scales up about 2.2x; the others blur and fade to about 25%; background lightens. 600ms, `expo.inOut`.
- Then the route changes to the product page with the garment as the single shared element (skill gsap preset "Page Transition, Complex", one Flip pair only).
- Mobile: 3 garments visible, snap scrolling, tap replaces hover.

## Scene 2: the float (shoes)

Seen in the reel at 0s to 2s.

- White field, 5 to 7 cut-out shoes at different sizes and depths, each drifting slowly on its own loop and shifting slightly with the pointer (parallax by depth).
- Large product name and price at top left. Hovering or focusing a shoe swaps the title with a short crossfade; the hovered shoe scales up and the rest dim slightly.
- A thin scrubber at bottom centre pages through more shoes; small grid of dots at bottom right jumps to a page.
- Click goes to the product page.
- Mobile: shoes stack in a looser 2-column drift, title follows the shoe nearest the centre of the screen.

## Scene 3: Try the Look (pants, outfits)

Seen in the reel at 2s to 5s.

- Heading "Try the Look." top left. A row of full-body model cut-outs on white.
- Hover lifts one model slightly and dims the rest.
- Click: the row slides away, the chosen model centres and scales up, and a list of the pieces in that outfit (thumbnail, name, price) appears on the right, staggered 40ms.
- Each piece links to its product page. A close control returns to the row.
- Mobile: horizontal snap row; the piece list opens as a bottom sheet.

## Product page

Seen in the reel at 8s to 10s.

- Left: the product alone on white. It turns around its vertical axis once on arrival (front photo and back photo on the two faces of a flat plane), then rests. Drag or the arrow buttons turn it by hand.
- Right: name, price, size buttons, colour swatches, quantity, one black full-width "Add to cart" button, stock status.
- Below: gallery, description, size guide, related products.

## Motion tokens

| Token | Value | Use |
|---|---|---|
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` (expo.out) | Things arriving |
| `--ease-in-out` | `cubic-bezier(0.87, 0, 0.13, 1)` (expo.inOut) | Scene and route transitions |
| `--dur-fast` | 180ms | Hover, press |
| `--dur-base` | 400ms | Reveals, title swaps |
| `--dur-scene` | 600ms | Rail focus, look zoom, route transition |

- Exits run at about 65% of the matching enter duration.
- Headline reveals split by character only for short headlines (under 8 words).
- Transform and opacity only. No animated width, height, top or left.
- `prefers-reduced-motion`: no drift, no swing, no spin, no parallax; crossfades of 150ms only.
- Every hover effect has a focus and a tap equivalent.
