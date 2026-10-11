# CaféPulse — PRD & Architecture V2: UI Refinement & Polish

## 0. Executive Summary & Objective
This specification addresses user feedback and visual audit findings from CaféPulse V1:
1. **Terminology Humanization**: Replace confusing mathematical and statistical notation (`μ`, `σ`, `P50`, `P85`, `P95`, `85th pct`) with welcoming, intuitive café layman terminology across both Customer and Barista surfaces while preserving underlying mathematical rigor.
2. **SVG Geometric Realignment & Deconfliction**: Eliminate overlapping graphics and boundary clipping across hand-rolled SVG components:
   - **Gauge.jsx**: Eliminate needle pivot circle collision with the sentiment score text.
   - **Radar.jsx**: Eliminate label collisions with polygon vertices and viewport edge clipping.
   - **BellCurve.jsx**: Eliminate right-edge label clipping and resolve top-edge spacing collisions between the mean and pin markers.
3. **Warm Modern Café Aesthetic & Design Token Overhaul**: Transform the dark theme from a muddy, low-contrast brown into a sophisticated modern artisanal café aesthetic (crisp dark roasted espresso base, warm crema and milk foam typography, luminous bronze/amber highlights, earthy matcha and terracotta status accents, subtle glassmorphic surfaces).
4. **Fluid Multi-Viewport Responsiveness**: Ensure seamless usability across compact mobile devices (360px+), tablets (640px–1023px), and wide desktop displays (1024px+).

---

## 1. Clarification & Risk Register

| Risk / Question | Analysis | Architectural Decision |
|---|---|---|
| **R1: Math Engine Compatibility** | Does changing display labels to layman terms affect the statistical calculation engine? | **Zero engine changes**. `src/engine/waittime.js` continues calculating `mu`, `sigma`, `p50`, `p85`, `p95`. Mapping occurs purely at the presentation / component layer. |
| **R2: Test Suite Breakage** | `src/test/render.test.jsx` asserts `"11 min · 85th pct"`. Will changing the label break CI? | **Synchronous test update**. Update the assertion in `src/test/render.test.jsx` to expect `"11 min · Expected"`. All other 58 tests in `npm test` remain intact and passing. |
| **R3: PhoneFrame Layout Trap** | The desktop Customer view had a fixed height of `844px` with inner scroll which clipped cards on smaller laptop screens. | Re-architect `PhoneFrame.jsx`: Full-bleed on mobile (<640px) with comfortable padding; on desktop (≥640px), render as an elegant centered container (`max-w-[420px]`) with fluid min-height, avoiding inner scroll traps. |
| **R4: High-Contrast Accessibility** | Dark themes often suffer from low text contrast (WCAG AA failure). | Elevated text contrast tokens: Primary text `#fdfaf4` (15.8:1 contrast on dark surface), Secondary text `#e6d6c3` (10.5:1), Muted labels `#c5b29c` (6.8:1). All exceed WCAG AA requirements (4.5:1). |

---

## 2. Non-Goals & Scope Boundaries
- **Non-Goal 1**: Modifying the internal probabilistic calculation models (Acklam quantile approximation, Abramowitz-Stegun erf, Reciprocal Rank Fusion, or BM25).
- **Non-Goal 2**: Introducing heavy chart libraries (e.g. Recharts, Chart.js, D3). All charts remain lightweight, zero-dependency hand-rolled SVGs.
- **Non-Goal 3**: Backend database or multi-tenant user synchronization.

---

## 3. Specification 1: Layman Terminology Mapping

### Exact Terminology Mappings Across Application

| Original Symbol / String | New Layman Term | Target Component(s) | UX Rationale |
|---|---|---|---|
| `{T} min · 85th pct` | `{T} min · Expected` | `BellCurve.jsx`, `ProgressTracker.jsx`, `render.test.jsx` | Communicates the realistic promised pickup time without requiring statistics knowledge. |
| `μ {mu.toFixed(1)}` | `Avg {mu.toFixed(1)}m` | `BellCurve.jsx` | Clear indicator of average wait time on the distribution curve. |
| `μ min` | `Avg Wait` | `QueueAnalytics.jsx` | Replaces Greek mu with plain English average wait time. |
| `σ` | `Variation` | `QueueAnalytics.jsx` | Standard deviation translated to queue fluctuation / consistency. |
| `P50` | `Typical` (or `Typical (50%)`) | `WaitPanel.jsx` | Median wait time under standard flow. |
| `P85` | `Est. Wait (85%)` | `WaitPanel.jsx`, `QueueAnalytics.jsx` | Safe promised wait time accounting for minor delays. |
| `P95` | `Rush Peak (95%)` | `WaitPanel.jsx`, `QueueAnalytics.jsx` | Upper bound wait time during unexpected rush. |
| `μ {b.mu} → {a.mu} · P85 {b.p85} → {a.p85}` | `Avg {b.mu}m → {a.mu}m · Est. {b.p85}m → {a.p85}m` | `InterventionLevers.jsx` | Clear before/after operational lever impact. |

### Test Specification Update
- File: `src/test/render.test.jsx`
- Old line 18-21:
  ```jsx
  it("bell curve labels the pin "{T} min · 85th pct" (AC13)", () => {
    const html = renderToString(<BellCurve mu={8} sigma={2} p85={10.1} promised={11} />);
    expect(html).toContain("11 min · 85th pct");
  });
  ```
- New line 18-21:
  ```jsx
  it("bell curve labels the pin "{T} min · Expected" (AC13)", () => {
    const html = renderToString(<BellCurve mu={8} sigma={2} p85={10.1} promised={11} />);
    expect(html).toContain("11 min · Expected");
  });
  ```

---

## 4. Specification 2: SVG Alignment & Geometric Deconfliction

### 4.1 Gauge.jsx (Sentiment Dial)
**Problem**: Needle pivot circle (`<circle cx="100" cy="100" r="6" />`) overlapped score text (`<text x="100" y="118">71</text>`) due to a cramped viewBox (`0 0 200 120`) and lack of vertical clearance.
**Architectural Blueprint**:
- **ViewBox**: `0 0 200 135` (providing 15px extra vertical space).
- **Arc Center**: `cx = 100, cy = 88` with radius `r = 68`, arc thickness `strokeWidth = 12`.
- **Needle Pivot**: Center at `(100, 88)` with pivot circle `r = 4.5`.
- **Needle Length**: Radius `52px` (`nx = 100 + 52 * cos(pi * (1 - v/100))`, `ny = 88 - 52 * sin(pi * (1 - v/100))`).
- **Score Typography Placement**:
  - Score baseline: `y = 120` with `fontSize="24"`, font-weight `800`, font-family `Fraunces`.
  - Clearance between needle pivot (y=88) and score text (y=120): **32px of clean vertical separation**.
  - Dynamic Arc Coloring:
    - `v >= 70`: Vibrant Matcha (`#6e9b5f`)
    - `45 <= v < 70`: Warm Honey Amber (`#e59546`)
    - `v < 45`: Terracotta Rust (`#d95d39`)
  - Track color: Deep roasted mocha (`#2d1f17`).

### 4.2 Radar.jsx (5-Axis Room Dimensions)
**Problem**: Text labels (`Temp`, `Noise`, `Clean`, `Seats`, `Coffee`) clipped past the 180px boundary and collided with polygon vertices when scores reached 80-100%.
**Architectural Blueprint**:
- **ViewBox**: Expand to `0 0 240 220` (w: 240, h: 220).
- **Center**: `cx = 120, cy = 112`.
- **Outer Grid Radius**: `R = 64`.
- **Axis-Specific Radial Offsets & Text Anchors**:
  ```javascript
  const AXIS_CONFIG = [
    { key: "temperature", label: "Temp",   angleIdx: 0, textAnchor: "middle", dx: 0,   dy: -14 },
    { key: "noise",       label: "Noise",  angleIdx: 1, textAnchor: "start",  dx: 12,  dy: 3 },
    { key: "cleanliness", label: "Clean",  angleIdx: 2, textAnchor: "start",  dx: 12,  dy: 6 },
    { key: "seating",     label: "Seats",  angleIdx: 3, textAnchor: "end",    dx: -12, dy: 6 },
    { key: "coffee",      label: "Coffee", angleIdx: 4, textAnchor: "end",    dx: -12, dy: 3 },
  ];
  ```
- **Polygon Vertex Highlights**: Render visible micro-dots (`<circle r="3" fill="#e59546" />`) on data points.
- **Result**: Label `Noise` starts at x=192 and extends comfortably to ~225 (well within 240). Label `Coffee` ends at x=48 and starts around x=15 (well within 0). Zero edge clipping, zero overlap with vertices.

### 4.3 BellCurve.jsx (Wait Time Distribution)
**Problem**: Top edge was cramped (`PAD.t = 22`), causing `μ` label at y=14 to nearly collide with the top SVG boundary, and the pin label text clipped the right edge on higher wait times.
**Architectural Blueprint**:
- **Dimensions & Padding**: `W = 380, H = 175`, `PAD = { l: 20, r: 24, t: 36, b: 28 }`.
- **Mean Indicator**:
  - Vertical dashed line from `y1 = 24` to `y2 = H - PAD.b`.
  - Label: `<text x={xs(mu)} y={18} textAnchor="middle" fontSize="10" fill="#e6d6c3" fontFamily="DM Mono">Avg {mu.toFixed(1)}m</text>`.
- **Pin & Promised Label**:
  - Pin line from `y1 = 32` to `y2 = H - PAD.b` in warm amber `#e59546`.
  - Pin marker circle: `cx={pinX}, cy=32, r=4.5`.
  - Dynamic Pin Text Anchor & Offset:
    - If `pinX > W - 110`: `textAnchor="end"`, `x = pinX - 8` (safely inside right border).
    - Else if `pinX < PAD.l + 80`: `textAnchor="start"`, `x = pinX + 8` (safely inside left border).
    - Else: `textAnchor="start"`, `x = pinX + 8`.
  - Pin text baseline: `y = 36`, `fontSize="11"`, font-weight `700`.
  - Label text: `${promised ?? Math.ceil(p85)} min · Expected`.

---

## 5. Specification 3: Visual Design Tokens & Aesthetic Overhaul

### 5.1 Color Palette & Theme Tokens
Replace the muddy grey-brown palette with rich, warm artisanal café tones:

| Token Name | Hex Code | Purpose / Usage |
|---|---|---|
| **espresso.950** | `#120d0a` | Deepest obsidian espresso (app background) |
| **espresso.900** | `#1b130e` | Dark roast coffee (card surface background) |
| **espresso.850** | `#241a13` | Elevated surface / input background |
| **espresso.800** | `#32231b` | Card borders, secondary containers |
| **espresso.700** | `#463227` | Muted borders, divider lines |
| **crema.50** | `#fdfaf4` | Fresh steamed whole milk (primary high-contrast text) |
| **crema.100** | `#f5ecdc` | Rich crema (secondary headlines, button text) |
| **crema.200** | `#e6d6c3` | Oat foam (subtitles, secondary body text) |
| **crema.300** | `#c5b29c` | Toasted oat (captions, labels, timestamps) |
| **amber.400** | `#f2a65a` | Golden honey (interactive hover, badge highlights) |
| **amber.500** | `#e59546` | Warm café bronze / amber (primary accent, buttons) |
| **amber.600** | `#c9782e` | Deep caramelized amber (active states, pressed buttons) |
| **matcha.500** | `#6e9b5f` | Fresh green tea / sage (in-stock, ready, high sentiment) |
| **terracotta.500** | `#d95d39` | Warm baked clay / rust (alerts, out of stock, errors) |

### 5.2 CSS Components (`src/index.css`)
- **Body Background**: Subtle radial gradient:
  `radial-gradient(ellipse at 50% 0%, #2a1a12 0%, #120d0a 75%)`
- **Cards (`.card`)**:
  `rounded-2xl border border-espresso-800 bg-espresso-900/90 p-4 shadow-xl shadow-black/30 backdrop-blur-md transition-all`
- **Buttons (`.btn`)**:
  `inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-espresso-950 shadow-md shadow-amber-950/40 transition hover:bg-amber-400 active:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed`
- **Ghost Buttons (`.btn-ghost`)**:
  `inline-flex items-center justify-center gap-1.5 rounded-xl border border-espresso-700 bg-espresso-850/60 px-3.5 py-2 text-sm font-medium text-crema-100 transition hover:bg-espresso-800 hover:border-espresso-600`
- **Labels (`.label`)**:
  `font-mono text-[11px] font-semibold uppercase tracking-wider text-crema-300`

---

## 6. Specification 4: Fluid Multi-Viewport Responsiveness

### 6.1 Viewport Breakpoints & Behavioral Targets
- **Mobile (<640px)**:
  - PhoneFrame renders full-bleed without rigid height restrictions or nested frames.
  - Header: Compact branding, icon-friendly switch controls.
  - BaristaView: Single-column clean stack.
  - Analytics cards: 2x2 grid for stats instead of crowded 4-columns.
- **Tablet (640px - 1023px)**:
  - BaristaView: 2-column layout.
  - CustomerView: Centered device preview with fluid padding.
- **Desktop (≥1024px)**:
  - BaristaView: 3-column dashboard grid (`lg:grid-cols-3`).
  - CustomerView: Centered phone frame with max-width `420px` and elegant device bezel styling.

---

## 7. Acceptance Criteria & Test Matrix

| ID | Category | Requirement / Verification Check | Validation Method |
|---|---|---|---|
| **AC-V2-1** | Layman Terminology | Bell curve pin displays `{T} min · Expected` (e.g. `11 min · Expected`). | `npm test` (`render.test.jsx`) & UI inspection |
| **AC-V2-2** | Layman Terminology | Bell curve mean line displays `Avg {mu}m` instead of `μ`. | UI visual check |
| **AC-V2-3** | Layman Terminology | Customer `WaitPanel` displays `Typical`, `Est. Wait (85%)`, and `Rush Peak (95%)` (replacing `P50`, `P85`, `P95`). | Component render check |
| **AC-V2-4** | Layman Terminology | Customer `ProgressTracker` displays `Promised in {mm:ss} · {T} min · Expected`. | Component render check |
| **AC-V2-5** | Layman Terminology | Barista `QueueAnalytics` displays `Avg Wait`, `Variation`, `Est. Wait (85%)`, and `Rush Peak (95%)` in a responsive grid. | Component render check |
| **AC-V2-6** | Layman Terminology | Barista `InterventionLevers` displays `Avg {b}m → {a}m · Est. {b}m → {a}m`. | Component render check |
| **AC-V2-7** | SVG Deconfliction | `Gauge.jsx` needle pivot circle and score typography have ≥25px vertical clearance with zero visual overlap. | Visual audit & SVG coordinate verification |
| **AC-V2-8** | SVG Deconfliction | `Radar.jsx` labels (`Temp`, `Noise`, `Clean`, `Seats`, `Coffee`) have zero clipping outside viewBox and do not overlap vertices. | Visual audit across 0%, 50%, and 100% scores |
| **AC-V2-9** | SVG Deconfliction | `BellCurve.jsx` label does not clip at the right edge when promised time is high, and mean label has clear headspace. | Visual audit across varying mu/sigma values |
| **AC-V2-10** | Aesthetics | Dark theme uses warm artisanal café tokens (deep espresso, warm crema text, amber accents, matcha/terracotta status indicators). | Visual audit & Tailwind token verification |
| **AC-V2-11** | Responsiveness | Customer and Barista views render without horizontal scrolling or text clipping down to 360px viewport width. | Viewport responsive testing (360px, 768px, 1280px) |
| **AC-V2-12** | Test Integrity | `npm test` passes 100% (all 59 tests) and `npm run build` completes with 0 errors. | CLI command execution |

---

## 8. Implementation Plan for SA3 (Builder)

### Ordered File Changes:
1. **`tailwind.config.js`**:
   - Update color tokens with the warm modern café palette (refined espresso, crema, amber, matcha, terracotta).
2. **`src/index.css`**:
   - Update body background, card glassmorphism, buttons, and label styles.
3. **`src/components/shared/Gauge.jsx`**:
   - Re-architect viewBox to `0 0 200 135`, center to `(100, 88)`, radius 68, score at `y=120` with zero overlap.
4. **`src/components/shared/Radar.jsx`**:
   - Re-architect viewBox to `0 0 240 220`, center to `(120, 112)`, radius 64, axis-specific text anchors and offsets, vertex dots.
5. **`src/components/shared/BellCurve.jsx`**:
   - Re-architect viewBox to `0 0 380 175`, update PAD to `{ l: 20, r: 24, t: 36, b: 28 }`, replace `μ` with `Avg {mu.toFixed(1)}m`, replace `85th pct` with `Expected`, clamp pin label.
6. **`src/test/render.test.jsx`**:
   - Update AC13 test assertion from `11 min · 85th pct` to `11 min · Expected`.
7. **`src/components/customer/ProgressTracker.jsx`**:
   - Replace `85th pct` with `Expected`.
8. **`src/components/customer/WaitPanel.jsx`**:
   - Replace `P50`, `P85`, `P95` with `Typical`, `Est. Wait (85%)`, `Rush Peak (95%)`.
9. **`src/components/barista/QueueAnalytics.jsx`**:
   - Replace `μ min`, `σ`, `P85`, `P95` with `Avg Wait`, `Variation`, `Est. Wait (85%)`, `Rush Peak (95%)`, with responsive 2x2/4x1 grid.
10. **`src/components/barista/InterventionLevers.jsx`**:
    - Replace `μ ... · P85 ...` with `Avg ...m · Est. ...m`.
11. **`src/components/shared/PhoneFrame.jsx`**:
    - Modernize responsiveness: full bleed on mobile (<640px), fluid centered phone container on desktop (≥640px).
12. **Run Verification**:
    - Execute `npm test` and `npm run build` to verify zero regressions.
