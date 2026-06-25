# Toshokan — Asset Manifest

Every remaining placeholder in the interface is a dashed, striped slot tagged
with a `data-asset-slot="<label>"` attribute. Search the rendered DOM for
`[data-asset-slot]` to locate each one in place.

Windows 11 supports display scaling up to 200%, so raster assets are specced
at 2× their largest on-screen appearance. SVG is preferred wherever the art is
vector-friendly (substrate texture, illustration).

---

## 1. Project icons — DONE (v2 artwork, June 12)

Masters at `toshokan/assets/icon-<id>.png` — 512 px, checkerboard stripped,
cropped — plus `icon-<id>-dark.png` dark-theme variants generated with a
**saturation-gated lightness inversion** (neutral plaque/strokes invert,
saturated art — glow nodes, food colors — keeps its hue and lightness).

Rendered sizes were increased across the interface:

| Placement            | Old | New |
|----------------------|-----|-----|
| Catalog tile         | 62  | 84  |
| Detail header        | 96  | 128 |
| Catalog list row     | 36  | 44  |
| Subproject card      | 34  | 44  |
| Services table row   | 32  | 40  |

512 px masters cover the 128 px placement at 200% scaling with headroom.

### Plaque blending — no background asset needed

Icons render with `mix-blend-mode: multiply` (light theme) / `screen` (dark
theme), so the white glass plaque adopts whatever surface it sits on —
including the signal-tinted card of a **selected** project — and reads as
engraved into the surface rather than pasted on as a white square. Selection
additionally gets the signal drop-shadow glow.

This supersedes the idea of a designed icon backplate: **no separate
selected/unselected background assets are required.** (If a physical backplate
is ever wanted instead, the spec would be a 256 px octagonal plate in two
states — default and selected — but the blend approach covers both for free.)

**STILL NEEDED: 2 subproject icons** — *Idolmancy – Megane* and *Xhungus*.
These render as striped octagon placeholders in subproject cards and the
Services table.

## 2. Application / brand identity — DONE

The supplied app logo (fox-with-book octagon plaque) is the master for all
brand placements; same blend treatment as project icons.

| Placement                | File                                   | Size used |
|--------------------------|----------------------------------------|-----------|
| Win11 title bar          | `assets/app-icon.png` (+ `-dark`)      | 18 px     |
| Nav-rail base emblem     | same master                            | 64 px     |

Still worth producing outside this prototype: a real `.ico`
(16/32/48/256) for the Windows taskbar build.

## 3. Decorative substrate artwork ("Digital Strata" texture)

| Slot label                             | Appears in                    | Status |
|----------------------------------------|-------------------------------|--------|
| `substrate art: contour + trace field` | Bottom of nav rail (vertical) | REPLACED — superseded by the unified `rail-emblem` (shield + fox-reading mark), `assets/rail-emblem.png` (+ `-dark`). Replaces both the old contour substrate and the separate brand emblem at the rail base. |
| `substrate art: vein trace`            | (removed)                     | REMOVED — the band's middle column now shows the selected project's live service status instead of decoration |

## 4. Illustration

| Slot label                                           | Appears in                 | Deliver at           |
|------------------------------------------------------|----------------------------|----------------------|
| `illustration: empty survey field / specimen outline`| No-project-selected state  | SVG, or 600 × 340 px |

---

## Removed — no asset needed

- **Technology / language logo glyphs** (`logo: <Tech>`). Tech chips are
  text-only.
- **`substrate art: corner trace`** (status-strip corner). Too small to
  register as texture; removed.
- **`emblem: octagon specimen`** — superseded by the real app logo.
- **Icon backplate (selected/unselected)** — superseded by blend-mode
  rendering (see §1).

### Summary of remaining asset needs
- 2 subproject master icons (Idolmancy – Megane, Xhungus)
- 1 substrate texture piece (vein trace, "Recent" band)
- 1 empty-state illustration
- (.ico packaging of the app icon, for the real Windows build)
