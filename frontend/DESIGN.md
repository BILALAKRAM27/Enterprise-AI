# DESIGN.md
## Enterprise Knowledge AI Assistant — Design Specification

**Version 1.0** · React Native + Expo + Expo Router + TypeScript + NativeWind
**Platforms:** iOS, Android, Web (single codebase, responsive)

This document is the single source of truth for visual and interaction design. It contains no implementation code. Every screen, component, state, and token is specified so an engineer or coding agent can build the UI without inventing decisions. Where a decision is not explicit, use the nearest documented pattern rather than improvising.

---

## 0. Design Thesis

The product's job is to make a wall of internal documents feel like a single trustworthy conversation. Two things must never be confused: **what the product does** (navigate, upload, organize — decisive, structural) and **what the AI says** (retrieved, probabilistic, sourced — alive but accountable).

That distinction is the spine of the whole system:

- **Ink** (indigo) is the color of the product — navigation, primary actions, structure. Confident, static, never animated.
- **Signal** (teal) is the color of the AI — thinking indicators, streaming text, citation confidence. It is the only color allowed to pulse, glow, or animate on its own.

Every AI-generated answer carries a citation. The **signature element** of this system is the **Confidence Ribbon**: a 3px gradient hairline across the top edge of every citation card, its saturation mapped directly to the retrieval similarity score. Weak matches render as a thin, pale, almost-gray line; strong matches render as a saturated, fuller teal line. Nowhere else in the product does color encode a number — this is the one place trust is made visible at a glance, before anyone reads a word.

The rest of the interface stays quiet on purpose: neutral surfaces, one type family per role, restrained motion. The Ribbon is the accessory we don't remove.

---

## 1. Foundations

### 1.1 Color Tokens

All colors are defined as tokens, never hard-coded hex in components. Token names are theme-agnostic; the value swaps between Light/Dark. **Only colors change between themes — layout, spacing, and component structure are identical.**

#### 1.1.1 Neutral Scale (Zinc-based, shared ramp)

| Token | Hex | Usage |
|---|---|---|
| `neutral.0` | `#FFFFFF` | Pure white, light-theme surfaces |
| `neutral.50` | `#FAFAFA` | Light background |
| `neutral.100` | `#F4F4F5` | Light subtle fill, hover on light |
| `neutral.200` | `#E4E4E7` | Light borders, dividers |
| `neutral.300` | `#D4D4D8` | Disabled borders |
| `neutral.400` | `#A1A1AA` | Placeholder text, secondary icons |
| `neutral.500` | `#71717A` | Secondary text |
| `neutral.600` | `#52525B` | Body text on light (secondary emphasis) |
| `neutral.700` | `#3F3F46` | Dark-theme borders |
| `neutral.800` | `#27272A` | Dark-theme elevated surface |
| `neutral.900` | `#18181B` | Primary text on light, dark-theme surface |
| `neutral.950` | `#0B0D12` | Dark background (blue-black, not pure black) |

#### 1.1.2 Brand — Ink (product/navigation/actions)

| Token | Light | Dark | Usage |
|---|---|---|---|
| `ink.subtle` | `#EEF1FF` | `#161B33` | Selected-row fill, badge backgrounds |
| `ink.default` | `#3652E3` | `#6E85FF` | Primary buttons, links, active nav, focus ring |
| `ink.strong` | `#2A3FB8` | `#8C9AFF` | Pressed state, primary button:active |
| `ink.text` | `#2A3FB8` | `#AAB6FF` | Text-on-subtle, inline links |

#### 1.1.3 Signal — Teal (AI-only accent)

| Token | Light | Dark | Usage |
|---|---|---|---|
| `signal.subtle` | `#E6FBF9` | `#0E2624` | Thinking-indicator background, AI message rail |
| `signal.default` | `#0EA5A5` | `#2DD4C6` | Streaming cursor, thinking dots, "AI" tag |
| `signal.strong` | `#0B8383` | `#5CE8DB` | High-confidence ribbon, active streaming glow |
| `signal.faint` | `#B9EFEA` | `#1B4C48` | Low-confidence ribbon end of gradient |

The Confidence Ribbon gradient always runs from `signal.faint` → `signal.default` → `signal.strong` as similarity increases from 0 → 100%. See §7 Citations.

#### 1.1.4 Semantic / Status

| Token | Light | Dark | Usage |
|---|---|---|---|
| `success.bg` | `#EAF7EE` | `#122A18` | Success toast, ready badge bg |
| `success.fg` | `#1B8A3D` | `#4ADE80` | Success icon/text |
| `warning.bg` | `#FDF4E7` | `#2E2410` | Processing badge bg |
| `warning.fg` | `#B4690E` | `#F5A623` | Processing icon/text |
| `danger.bg` | `#FCEBEB` | `#301213` | Error banners, failed badge bg |
| `danger.fg` | `#C2281F` | `#F87171` | Error icon/text |
| `info.bg` | `#EAF1FE` | `#111E33` | Informational banners |
| `info.fg` | `#2563EB` | `#7BA5FF` | Informational icon/text |

Status colors are visually distinct from `ink` (product) and `signal` (AI) so a glance always tells the user which "layer" they're looking at: product chrome, AI content, or system status.

#### 1.1.5 Surface & Structure Tokens

| Token | Light | Dark |
|---|---|---|
| `bg.canvas` | `neutral.50` `#FAFAFA` | `neutral.950` `#0B0D12` |
| `bg.surface` | `neutral.0` `#FFFFFF` | `neutral.800` `#27272A` |
| `bg.surface.raised` | `#FFFFFF` + shadow.sm | `#2E2E33` |
| `bg.sidebar` | `#F7F7F8` | `#101215` |
| `bg.chat.user` | `ink.subtle` | `ink.subtle` |
| `bg.chat.assistant` | `neutral.0` | `neutral.800` |
| `bg.input` | `neutral.0` | `#1C1E23` |
| `border.default` | `neutral.200` | `neutral.700` |
| `border.strong` | `neutral.300` | `#4B4B52` |
| `border.focus` | `ink.default` | `ink.default` |
| `text.primary` | `neutral.900` | `neutral.50` |
| `text.secondary` | `neutral.500` | `neutral.400` |
| `text.disabled` | `neutral.300` | `neutral.700` |
| `text.inverse` | `neutral.0` | `neutral.950` |
| `overlay.scrim` | `rgba(17,17,20,0.48)` | `rgba(0,0,0,0.64)` |

State layers (applied as overlays on any interactive surface, not separate colors):

- **Hover** (web/desktop pointer only): `+4%` black light / `+6%` white dark, opacity overlay
- **Pressed**: `+8%` black light / `+12%` white dark
- **Disabled**: element at `48%` opacity, no state layers respond
- **Focus**: 2px `border.focus` outline, 2px offset, never suppressed

### 1.2 Typography

Three type roles, each with a distinct purpose — this is a functional decision, not decoration: headings need presence at a glance in a dense information product, body needs to disappear into legibility, and numeric/source data (page numbers, similarity scores, timestamps, filenames) needs to be scannable and unambiguous (tabular figures).

| Role | Typeface | Fallback stack | Used for |
|---|---|---|---|
| **Display/Heading** | Inter Tight | `-apple-system, Segoe UI, Roboto, sans-serif` | Page titles, section headers, dashboard stat numbers |
| **Body** | Inter | same | All paragraph text, buttons, labels, chat content |
| **Mono/Data** | JetBrains Mono | `ui-monospace, Menlo, monospace` | Page numbers, similarity %, timestamps, file sizes, code blocks in chat |

#### Type Scale

| Token | Size / Line height | Weight | Role |
|---|---|---|---|
| `display.lg` | 32 / 40 | 700 | Dashboard hero greeting |
| `display.md` | 26 / 34 | 700 | Screen titles (Documents, Settings) |
| `display.sm` | 20 / 28 | 600 | Section headers, modal titles |
| `body.lg` | 17 / 26 | 400 | Chat message text |
| `body.md` | 15 / 22 | 400 | Default UI text, list items |
| `body.sm` | 13 / 18 | 400 | Secondary/meta text, timestamps |
| `label.md` | 14 / 20 | 600 | Buttons, form labels, tabs |
| `label.sm` | 12 / 16 | 600 | Badges, eyebrows, all-caps micro-labels |
| `mono.md` | 13 / 20 | 500 | Citation metadata, code inline |
| `mono.sm` | 11 / 16 | 500 | Timestamps, file sizes |

Letter-spacing: headings `-0.01em`, `label.sm` all-caps micro-labels `+0.04em`, everything else `0`.

### 1.3 Spacing Scale (4pt base)

`space.0=0, space.1=4, space.2=8, space.3=12, space.4=16, space.5=20, space.6=24, space.7=32, space.8=40, space.9=48, space.10=64`

Rule of thumb: `space.3` (12) between related elements inside a component, `space.4`–`space.5` between components in a group, `space.7`+ between distinct sections.

### 1.4 Radius Scale

`radius.sm=6` (badges, inline chips) · `radius.md=10` (buttons, inputs) · `radius.lg=14` (cards) · `radius.xl=20` (modals, bottom sheets, chat bubbles) · `radius.full=9999` (avatars, pills, FAB)

### 1.5 Elevation / Shadow Scale

Shadows are used sparingly — the product leans on borders + flat surfaces first, shadow only where something floats above the canvas (modals, dropdowns, FAB, toasts).

| Token | Light | Dark (border-based instead) |
|---|---|---|
| `shadow.xs` | `0 1px 2px rgba(16,24,40,0.06)` | `1px solid neutral.700` |
| `shadow.sm` | `0 2px 6px rgba(16,24,40,0.08)` | `1px solid neutral.700` + `0 2px 6px rgba(0,0,0,0.4)` |
| `shadow.md` | `0 6px 16px rgba(16,24,40,0.10)` | `0 6px 16px rgba(0,0,0,0.5)` |
| `shadow.lg` | `0 16px 32px rgba(16,24,40,0.14)` | `0 16px 32px rgba(0,0,0,0.6)` |

Dark theme relies primarily on a 1px lightened border to separate surfaces (shadows read poorly on dark), boosted with a soft shadow only for true overlays (modal, bottom sheet).

### 1.6 Iconography

- **Set:** Lucide (or Phosphor as fallback) — outline style, 1.5px stroke, consistent with Linear/Notion/GitHub visual language.
- **Sizes:** `icon.xs=14` (inline in text) · `icon.sm=16` (buttons, list rows) · `icon.md=20` (nav, toolbars) · `icon.lg=24` (empty states, section headers) · `icon.xl=40` (empty-state hero, splash)
- Icons inherit `currentColor`; never hard-code icon color separately from adjacent text/label.
- The one exception: AI-context icons (sparkle for "AI suggestion," the thinking indicator) always render in `signal.default`, regardless of surrounding text color, to keep the Ink/Signal distinction consistent.

### 1.7 Animation

| Token | Duration | Curve | Usage |
|---|---|---|---|
| `motion.instant` | 100ms | ease-out | Press/tap feedback, checkbox toggle |
| `motion.fast` | 150ms | ease-out | Hover states, small fades |
| `motion.base` | 220ms | cubic-bezier(0.2,0,0,1) | Screen transitions, modal enter, card expand |
| `motion.slow` | 360ms | cubic-bezier(0.2,0,0,1) | Bottom sheet, success animation, theme cross-fade |
| `motion.spring` | stiffness 260, damping 24 | spring | Button press scale, FAB, drag interactions, tab indicator |

Rules:
- Respect `prefers-reduced-motion` / OS reduce-motion setting: replace spring/slide with a 120ms opacity cross-fade everywhere.
- Only `signal` (teal) elements are allowed continuous/looping animation (thinking dots, streaming cursor blink). Everything else animates on state change only, then stops.
- Theme switching (§1.8): a 220ms color cross-fade on `bg` and `text` tokens only — no layout shift, no re-mount.

### 1.8 Opacity Levels

`opacity.disabled=0.48` · `opacity.overlayLight=0.04` · `opacity.overlayMed=0.08` · `opacity.overlayStrong=0.12` · `opacity.scrim=0.48–0.64` (theme-dependent, §1.1.5) · `opacity.skeletonPulse` animates 0.5 ↔ 1.0

### 1.9 Component Sizing

| Token | Height | Usage |
|---|---|---|
| `control.sm` | 32 | Compact buttons, chip filters |
| `control.md` | 44 | Default buttons, inputs (meets 44pt touch target) |
| `control.lg` | 52 | Primary CTA on auth screens |
| `touch.min` | 44×44 | Absolute minimum tappable area, all platforms |
| `topbar.height` | 56 (mobile) / 64 (web) | |
| `bottomnav.height` | 64 + safe-area-bottom | |
| `sidebar.width.collapsed` | 72 | icon-only rail |
| `sidebar.width.expanded` | 264 | |

---

## 2. Theming

- **Modes:** Light, Dark, System (default = System on first launch).
- Theme is stored per-device; switching is instant with the 220ms cross-fade described in §1.7 — no screen re-navigation, no flash of unstyled content.
- Every token in §1.1 has both a Light and Dark value; component specs below reference tokens only, never raw hex, so theme switching requires no per-screen logic.
- Status bar / system chrome (Android nav bar, iOS status bar) adapts automatically: light content on dark theme, dark content on light theme.
- Images/document thumbnails get a subtle `neutral.900 @ 6%` overlay in dark mode to prevent glare from white document previews.

---

## 3. Layout & Breakpoints

### 3.1 Breakpoints

| Name | Width | Device class |
|---|---|---|
| `xs` | < 380 | Small phones |
| `sm` | 380–599 | Large phones |
| `md` | 600–899 | Tablets (portrait), foldables |
| `lg` | 900–1279 | Tablets (landscape), small desktop/web |
| `xl` | ≥ 1280 | Desktop web, wide monitors |

### 3.2 Navigation Shell by Breakpoint

- **xs/sm (phone):** Bottom Navigation (5 items max: Dashboard, Documents, Chats, Search, Profile) + Top Bar per-screen (title + contextual actions). Settings lives under Profile, not in the bottom nav.
- **md (tablet portrait):** Bottom Navigation retained, Top Bar gains more breathing room, two-column layout appears inside Documents/Chat List (list + preview pane) when width allows.
- **lg/xl (web/desktop):** Persistent left **Sidebar** replaces bottom nav entirely (collapsed 72px icon rail by default, expandable to 264px, user-toggled and remembered). Top Bar becomes a slim 64px header for search + account menu only. Content area uses a max-width of 1120px, centered, with generous side margins beyond that on ultra-wide monitors — the app never stretches full-bleed on a 4K display.

### 3.3 Grid & Margins

- Mobile: 16px screen margin, 8px gutter, single column.
- Tablet: 24px margin, 12-column grid conceptually, content typically split 40/60 (list/detail) at `md`+.
- Desktop/web: Sidebar (fixed) + content max-width 1120px, 32px margin, 12-column grid, 24px gutter. Chat screen content column caps at 720px for readability even on ultra-wide.

### 3.4 Safe Areas

All screens respect `SafeAreaView`/safe-area-context insets. Bottom Navigation and any floating action button add the device's bottom inset on top of their own padding. Modals and bottom sheets on iOS respect the home-indicator inset with an extra 8px buffer.

---

## 4. Navigation Architecture (Expo Router)

```
app/
├── (auth)/
│   ├── splash.tsx
│   ├── login.tsx
│   ├── register.tsx
│   └── forgot-password.tsx
├── (app)/
│   ├── _layout.tsx           → Sidebar (web/lg+) or Bottom Tabs (mobile)
│   ├── dashboard/index.tsx
│   ├── documents/
│   │   ├── index.tsx         → Document list
│   │   ├── upload.tsx        → Upload flow (modal on web, screen on mobile)
│   │   └── [id].tsx          → Document details
│   ├── chats/
│   │   ├── index.tsx         → Chat list / conversation history
│   │   └── [id].tsx          → Chat screen
│   ├── search/index.tsx
│   ├── profile/index.tsx
│   └── settings/
│       ├── index.tsx
│       └── about.tsx
└── +not-found.tsx            → 404
```

- **Unauthenticated stack:** Splash → (auto-check session) → Login. Register and Forgot Password are pushed modally from Login on mobile, as side-by-side split screens on web (form left, brand panel right).
- **Authenticated shell:** one persistent layout that swaps between Bottom Tabs (< `lg`) and Sidebar (≥ `lg`) — same route tree, different chrome, per §3.2.
- **Transitions:** Tab switches use a 150ms cross-fade (no slide, tabs are peers, not a stack). Pushing into detail (Document Details, Chat screen from list) uses a native slide-from-right on mobile (iOS) / fade-through on Android (Material) / no transition, just route swap, on web. Modals (Upload, Settings sub-pages on web) slide up from bottom on mobile, center-fade-scale on web.

---

## 5. Screen Specifications

Each entry: Purpose → Hierarchy → Layout → Components → Interactions → Responsive.

### 5.1 Splash

- **Purpose:** Brand moment + session check, sub-1s.
- **Hierarchy:** Wordmark centered, nothing else competes.
- **Layout:** `bg.canvas`, logo mark (32px icon + wordmark) vertically centered, small `signal.default` pulse dot beneath as a loading affordance (not a spinner — a single soft-pulsing dot, 1.6s cycle).
- **Interactions:** Auto-navigates to Dashboard (valid session) or Login (none) after session check resolves; no user input.
- **Responsive:** Identical centered composition at all sizes.

### 5.2 Login

- **Purpose:** Fast, low-friction credential entry; trust-building for an enterprise tool.
- **Hierarchy:** Wordmark → "Welcome back" (`display.sm`) → email/password fields → primary CTA → secondary links.
- **Layout (mobile):** Single column, 24px margins, form vertically centered with extra top weight (60/40 split above/below center). Keyboard-avoiding: form scrolls up smoothly, CTA stays visible above keyboard.
- **Layout (web ≥ `lg`):** Split screen — left 45% form on `bg.surface`, right 55% `bg.sidebar` panel with a static abstract pattern built from thin Confidence-Ribbon-style gradient lines (brand echo, no stock imagery, no photos of "office people").
- **Components:** Text Input ×2 (email, password w/ show-hide toggle), Primary Button ("Sign in"), Ghost link ("Forgot password?"), divider "or", SSO button placeholder (Google/Microsoft — common in enterprise), footer link to Register.
- **Interactions:** Inline validation on blur, not on every keystroke. Invalid submit shakes the field with a 2px `danger.fg` border and inline helper text below (never a toast for field-level errors). Loading state: Primary Button label swaps to a small spinner, button width does not change (prevents layout jump).
- **Error state:** Wrong credentials → single `danger.bg` inline banner above the form: "That email or password isn't right." No account enumeration.
- **Responsive:** Below `lg`, right panel is dropped entirely (not shrunk/hidden — removed from the tree).

### 5.3 Register

- Same shell as Login. Adds Name, Confirm Password, and a Terms checkbox (required, inline link to Terms). Password field shows a lightweight strength meter: 3 segments filling `danger.fg` → `warning.fg` → `success.fg` as strength increases, label beneath ("Weak / Good / Strong"), width doesn't reflow.

### 5.4 Forgot Password

- Single-column, single field (email), primary CTA "Send reset link." On submit, form cross-fades (`motion.base`) into a confirmation state in the same card: check-circle icon (`success.fg`), "Check your email," Ghost button "Back to login" — never navigates away, so the user isn't left wondering if it worked.

### 5.5 Dashboard

- **Purpose:** Orientation + fastest path into the two core actions (ask, upload).
- **Hierarchy:** Welcome Header → Quick Actions → Statistics row → Recent Chats → Recent Documents → AI Suggestions.
- **Layout (mobile):** Single scrolling column, `space.5` between sections.
  1. **Welcome Header:** "Good afternoon, {first name}" (`display.lg`), subdued subtext with today's date, avatar top-right (tap → Profile).
  2. **Quick Actions:** two large tappable cards side-by-side, equal width: "Ask a question" (ink-tinted icon, opens Chat) and "Upload document" (opens Upload flow). These are the only two `ink.default`-filled surfaces on the dashboard — everything else is neutral, so the two primary actions visually lead.
  3. **Statistics row:** 3 compact stat cards (Documents indexed, Questions answered this week, Avg. response time), number in `display.md` + `mono.sm` trend delta beneath, horizontally scrollable on narrow phones.
  4. **Recent Chats:** horizontal-scroll card list, each card = conversation title + last message preview (1 line, truncated) + relative timestamp (`mono.sm`).
  5. **Recent Documents:** vertical list, 3–4 items, "View all" link to Documents screen.
  6. **AI Suggestions:** a single quiet card, `signal.subtle` background, sparkle icon in `signal.default`, e.g. "3 new documents haven't been asked about yet — explore them," with a text button.
- **Motion:** On load, sections fade+rise in a fast staggered sequence (40ms stagger, `motion.fast`, translateY 8px→0) — the "alive with subtle motion" requirement, kept to a single one-time entrance, never repeating on re-focus.
- **Layout (web ≥ `lg`):** Two-column: main column (Quick Actions, Stats, Recent Chats/Documents) at ~68% width, right rail (~32%) holds AI Suggestions + a compact activity feed, sticky within viewport.
- **Empty states:** New account with zero documents → Quick Actions and Stats remain, but Recent Documents/Chats sections are replaced by a single combined empty-state card: "Nothing here yet — upload your first document to get started" + CTA (see §9 Empty States).

### 5.6 Documents

- **Purpose:** Manage the knowledge corpus; primary secondary-task screen.
- **Layout (mobile):** Sticky Top Bar with title + search icon (expands into inline search bar on tap) + filter icon. Below: horizontal filter chips (All, PDF, DOCX, TXT, Failed). List of Document Cards, pull-to-refresh, FAB (Upload) bottom-right.
- **Document Card contents:** file-type icon (colored by type: PDF=`danger.fg`-tinted icon container, DOCX=`info.fg`-tinted, TXT=`neutral.500`), filename (`body.md`, single line truncate with ellipsis mid-string if needed to preserve extension), upload date (`mono.sm`, relative: "2d ago"), Status Badge (Ready=`success`, Processing=`warning` + animated progress ring, Failed=`danger`), row chevron.
- **Sort/Filter:** Sort control in Top Bar overflow menu (Name, Date, Size, Status). Filters are chips, multi-select, active chip filled `ink.subtle` bg + `ink.text`.
- **Layout (web ≥ `lg`):** Table-like list (not literal `<table>`, still cards) with column headers (Name, Type, Date, Status, Size), sortable by clicking header. Optional right preview pane on `xl` showing the selected document's details inline instead of navigating away.
- **Interactions:** Swipe-left on mobile card reveals Delete (destructive, `danger.fg` bg) — confirm via Confirmation Dialog, never instant-delete. Tap card → Document Details.

### 5.7 Upload Document

- **Purpose:** Make ingestion feel premium and legible — this is a trust-building moment (their internal documents, AI processing).
- **Mobile:** Presented as a modal sheet (`radius.xl` top corners, slide up `motion.slow`). Step 1: native Document Picker button, large dashed-border drop target styled area even though drag isn't native on mobile (tap-to-browse), icon + "Choose a file or take a photo of a document." Accepts PDF/DOCX/TXT, shows accepted types + max size beneath.
- **Web:** Full drag-and-drop zone, dashed `border.strong`, becomes `ink.subtle` filled + solid `ink.default` border on drag-over. Click-to-browse also available.
- **Progress:** Once a file is chosen, the drop zone morphs (`motion.base`, shared-element style) into a progress card: filename, file-size (`mono.sm`), a **Processing Timeline** — 3 horizontal steps with connecting line: `Uploading → Extracting text → Indexing`. Each step: neutral circle → fills `ink.default` with a checkmark on completion, current step shows a small `signal.default` pulsing ring (this is AI/processing work, so it borrows the Signal color, not Ink). Overall percentage shown as `mono.md` top-right of the card, tied to a determinate progress bar beneath the filename (not the timeline itself — timeline is stage-based, bar is byte-based, they update independently since they measure different things).
- **Success:** Timeline's final step checkmark triggers a brief `success.fg` check-circle scale-in (spring, 1.0→1.15→1.0) and the card cross-fades into the new Document Card, which then animates (slide+fade) into place at the top of the Documents list if the modal is dismissed.
- **Failure:** Timeline step where it failed turns `danger.fg` with an X, card shows inline reason ("File exceeds 25MB limit" / "Unsupported format" / "Couldn't extract text — file may be corrupted or scanned at low quality"), primary action becomes "Try again," secondary "Remove."
- **Multiple files:** Each file gets its own progress card, stacked, can complete independently and out of order.

### 5.8 Document Details

- **Purpose:** Confirm what the AI knows about a specific source; jumping-off point to "ask about this doc."
- **Layout:** Header block — large file-type icon, filename (`display.sm`), metadata row (`mono.sm`: type · size · uploaded date · uploaded by, if multi-user). Status Badge prominent. Primary Button: "Ask about this document" (opens Chat pre-scoped to this doc, shown as a removable chip in the chat's context bar). Secondary actions in overflow menu: Download original, Re-process, Delete.
- Below: **Processing Summary** card (pages/sections indexed, chunk count, last indexed timestamp — all `mono` styled since they're data) and, once available, an **AI-generated summary** of the document (clearly labeled with the sparkle/Signal treatment, 3–5 sentence abstract) so users can sanity-check ingestion without opening chat.
- **Web:** Two-column — metadata/actions left rail (320px), summary + (future) inline preview right.

### 5.9 Chat List / Conversation History

- **Purpose:** Resume or browse past conversations; secondary to starting new ones.
- **Layout:** Top Bar with "+ New chat" action (icon button, top-right, always reachable). List of conversation rows: title (auto-generated from first question, or user-renamed), last-message preview (1 line), relative timestamp (`mono.sm`), optional scoped-document chip if the whole thread was scoped to one doc.
- Grouped by recency headers: Today / Yesterday / Previous 7 days / Older (`label.sm`, uppercase, `text.secondary`) — this is a real sequence (time), so section labels are justified here (unlike arbitrary numbered steps).
- **Interactions:** Swipe (mobile) / hover-reveal (web) → Rename, Delete. Search icon in Top Bar filters this list live by title/content match.
- **Web:** This list IS the Sidebar's secondary panel when Chats is the active section (list at 280px next to the active Chat Screen) — i.e. on web, Chat List and Chat Screen render side by side rather than as separate navigations.

### 5.10 Chat Screen

- **Purpose:** The core product experience. Must feel as fluent as ChatGPT/Claude while staying legible for dense enterprise answers (tables, code, long citations).
- **Layout:** Top Bar: conversation title (editable inline on tap), optional scoped-document chip(s) with an ✕ to remove scope, overflow menu (Rename, Export, Delete). Below: scrollable message list, bottom-anchored Composer.
- **Message bubbles:**
  - **User message:** right-aligned (mobile) or right-leaning within the 720px column (web), `bg.chat.user` (`ink.subtle`) fill, `radius.xl` with a flattened corner on the tail side, `body.lg` text, no avatar (context makes it obvious).
  - **Assistant message:** left-aligned, `bg.chat.assistant` (near-white/near-black surface, not tinted — this is where the Ink/Signal rule matters most: the AI's *words* are neutral, only its *process and provenance* get the Signal color), small sparkle glyph avatar in `signal.default`. Full Markdown support: headings, bold/italic, ordered/unordered lists, tables (horizontally scrollable if wide, styled with `border.default` hairlines, header row `label.sm` uppercase), inline code (`mono.sm` on `neutral.100`/`neutral.800` chip), fenced code blocks (dark-surface block regardless of theme — code blocks are always dark, like GitHub/Linear — with a language label + Copy button top-right), and links (`ink.text`, underline on hover/focus).
  - Below each assistant message: an icon-button row (`icon.sm`, `text.secondary`, brighten to `text.primary` on hover) — Copy, Regenerate, thumbs-up, thumbs-down. Feedback buttons toggle filled + brief toast ("Thanks for the feedback") on tap, mutually exclusive.
  - **Citations** render as a horizontal row of compact **Citation Chips** directly beneath the message text (before the icon row) — see §7 for the full spec.
- **Thinking / streaming states:**
  - Before any tokens arrive: a **Thinking Indicator** — three dots in `signal.default`, sequential opacity pulse (staggered 120ms), label "Thinking…" fading in/out isn't used (dots alone are enough; text label adds noise). Max shown for the duration of retrieval; if it exceeds ~6s, a secondary microcopy line fades in beneath: "Searching {n} documents…"
  - During streaming: text appends with no per-character animation (avoid gimmicky typewriter jitter at scale) but the **caret** — a 2px `signal.default` blinking bar — sits at the end of the in-progress text, and the message container's left rail shows a 2px `signal.default` accent line for the duration of streaming only, removed on completion. This is the one place "the AI is actively working" is visible in peripheral vision.
  - Auto-scroll: locked to bottom while streaming unless the user manually scrolls up, in which case auto-scroll suspends and a small "↓ New message" pill appears bottom-center until tapped or the user scrolls back down themselves.
- **Composer:** `bg.input` surface, `radius.xl`, expands vertically up to 6 lines then internally scrolls. Left: attach/scope-document icon button. Right: Send button — disabled/neutral when empty, fills `ink.default` with an up-arrow when text is present, morphs to a stop-square (`danger.fg`) while a response is streaming (tap to cancel generation).
- **Responsive:** Web caps message column width at 720px (centered) even inside a wider viewport for reading comfort; Composer matches that same column width, not the full window.

### 5.11 Search

- **Purpose:** Cross-cutting search across documents and past conversations (distinct from in-chat questions — this is lookup, not Q&A).
- **Layout:** Prominent search field at top (auto-focused on screen entry), segmented control beneath: "All / Documents / Chats". Results list grouped by type with small type-icon, matched snippet with the query term bolded (never highlighted with background color — bold is enough and stays legible in both themes).
- **Empty query state:** Recent searches (chips, tappable) + "Try asking a question instead" nudge linking to a new Chat.

### 5.12 Profile

- **Layout:** Centered avatar (large, `radius.full`, tap to change), name (`display.sm`), email (`body.sm`, `text.secondary`), "Member since {date}" (`mono.sm`). Two compact stat pills beneath (Documents uploaded, Chats started). List section below: Account Settings, and a destructive-styled Logout row at the very bottom, separated by extra spacing (`space.7`) so it's never mis-tapped.

### 5.13 Settings

- **Layout:** Grouped list (iOS-settings-style sections with `label.sm` uppercase group headers): 
  - **Appearance:** Theme selector as a 3-segment control (System / Light / Dark) with live preview swatch beside each.
  - **General:** Language (placeholder, shows "English" with a disabled chevron + "More languages coming soon" badge), Notifications (placeholder toggle rows, visually complete but can be non-functional per product scope).
  - **Legal:** Privacy Policy, Terms of Service (external link rows, chevron + external-link icon).
  - **About:** version number (`mono.sm`), link to About screen.
  - Logout (destructive row, isolated at bottom as in Profile).
- **Web:** Rendered as a settings panel within the main content area (sidebar nav still visible), not a full takeover.

### 5.14 About

- App icon, name, version (`mono.sm`), one-paragraph description, links (Website, Support email), licenses link. Quiet, centered, minimal — this screen earns no visual embellishment.

### 5.15 404 / Not Found

- Centered composition: large `display.lg` "404" in `mono` (numeric, so mono is correct here), "This page doesn't exist" (`body.md`, `text.secondary`), Primary Button "Back to Dashboard." No illustration — keep it fast and undecorated, consistent with enterprise tone (avoid cutesy 404 mascots).

---

## 6. Dashboard Motion Detail (cross-reference §5.5)

To satisfy "alive with subtle motion" without becoming gimmicky:

- Stat numbers count up from 0 on first mount only (`motion.base`, ease-out, 600ms total, not per-digit), never re-triggers on tab refocus.
- The AI Suggestions card's sparkle icon has a very slow (3s), very subtle (scale 1.0↔1.04) idle breathing animation — the only ambient/looping motion permitted outside the Chat screen's thinking/streaming states, because it's Signal-colored AI content.
- Pull-to-refresh (mobile) uses a custom refresh glyph: a small circular progress ring in `ink.default` that fills as the user pulls past threshold, releases into a 400ms spin-then-fade.

---

## 7. Citations (Signature System)

Citations appear as a horizontal scroll row of **Citation Chips** under any assistant message that used retrieved content. Tapping a chip expands it in place into a full **Citation Card** (accordion-style, `motion.base`, pushes subsequent content down rather than overlaying).

**Citation Chip (collapsed):** pill, `radius.full`, `border.default`, contains: small file-type glyph, truncated document name (max ~18 chars + ellipsis), page number in `mono.sm` ("p. 14"). The **Confidence Ribbon** appears here too, as a 2px arc along the chip's bottom edge rather than a full top bar (space-constrained), same gradient logic as the full card.

**Citation Card (expanded):**
- Top edge: the **Confidence Ribbon** — full-width 3px gradient bar, `signal.faint → signal.default → signal.strong` mapped linearly to the 0–100% similarity score. A numeric badge top-right of the card shows the exact score in `mono.sm` (e.g. "92% match") so the color is reinforced, never the sole signal (accessibility, §9).
- Body: Document name (`label.md`) + page number (`mono.sm`) on one row; beneath, the **snippet** — the actual retrieved passage, `body.sm`, max 3 lines with a fade-to-transparent mask at the bottom if truncated, quotation-styled with a thin left rule in `neutral.300`/`neutral.700` (a quiet, document-like treatment, not a speech bubble — this is a source, not a person talking).
- Footer row: Ghost Button "Open document" (icon: external-link) → navigates to Document Details, optionally scrolled/highlighted to that page if the platform supports in-app preview.
- Multiple citations under one message each get their own card; expanding one does not collapse others.

This system is deliberately restrained: one gradient, one accent color family, used nowhere else in the product for a numeric encoding. That restraint is what makes it legible as "the trust indicator" rather than one more colorful UI element.

---

## 8. Component Library

For each: default, hover (web only), pressed, disabled, and focus specs. All controls meet `touch.min` (44×44) tappable area even when the visible control is smaller (invisible padding).

### 8.1 Buttons

- **Primary:** `ink.default` fill, `text.inverse` label (`label.md`), `radius.md`, height `control.md`, horizontal padding `space.5`. Hover: `ink.strong` fill (web). Pressed: `ink.strong` fill + scale 0.98 (`motion.instant` spring). Disabled: `neutral.200`/`neutral.700` fill, `text.disabled` label, no state layers. Focus: 2px `border.focus` outline, 2px offset.
- **Secondary:** transparent fill, 1.5px `border.strong`, `text.primary` label. Hover: `bg.surface` → `neutral.100`/`neutral.800`. Pressed: same + scale 0.98.
- **Ghost:** transparent, no border, `ink.text` label for actionable ghost buttons or `text.secondary` for neutral ones. Hover: `opacity.overlayLight` background tint.
- **Icon Button:** `radius.full` or `radius.md` (context-dependent — nav icons are `full`, toolbar icons are `md`), 40×40 default hit area, icon `icon.md` centered.
- **Destructive:** same shape as Secondary but `danger.fg` border+label; filled variant (`danger.fg` bg, white label) reserved for final confirm step inside Confirmation Dialogs only, never as a first-touch action.

### 8.2 Inputs & Search Bar

- Height `control.md`, `radius.md`, 1px `border.default`, `space.4` horizontal padding, `body.md` text. Focus: border becomes `border.focus` 2px, subtle `ink.subtle` glow (4px, low-opacity, web only). Error: border `danger.fg`, helper text beneath in `danger.fg` `body.sm`. Search Bar adds a leading search icon (`text.secondary`) and, when active, a trailing clear (✕) button.

### 8.3 Dropdown / Select

- Trigger styled as an Input with a trailing chevron. Menu: `bg.surface.raised`, `shadow.md`, `radius.md`, max-height with internal scroll, options `control.md` height, selected option shows a leading checkmark in `ink.default`, hover row `neutral.100`/`neutral.800`.

### 8.4 Card

- Base: `bg.surface`, `radius.lg`, `shadow.xs` (light) / border (dark), `space.4` internal padding. Interactive cards (Document Card, chat list item) add a hover lift (`shadow.sm`, web only) and pressed scale 0.99.

### 8.5 Modal

- Web: centered, max-width 480px (small confirms) or 640px (forms like Upload details), `radius.xl`, `shadow.lg`, scrim `overlay.scrim`, enters with scale 0.96→1.0 + fade (`motion.base`). Mobile: full-screen or large sheet depending on content weight (simple confirms = compact centered card even on mobile; multi-field forms = full screen with a Cancel/X top-left and primary action top-right).

### 8.6 Bottom Sheet

- Mobile only (web uses Modal instead for equivalent flows, except where drag-to-dismiss is genuinely useful, e.g. quick document actions). `radius.xl` top corners only, drag handle bar (`neutral.300`/`neutral.700`, 36×4px) centered top, enters with slide-up spring (`motion.spring`), dismiss via drag-down past threshold or scrim tap.

### 8.7 Toast / Snackbar

- Bottom-anchored (above bottom nav / composer), `bg.surface.raised`, `shadow.md`, `radius.md`, max-width 420px on web (centered-bottom) or full-width minus margins on mobile. Auto-dismiss 4s, swipe-to-dismiss (mobile), single optional action link (e.g. "Undo"). Only one toast visible at a time; new ones queue.

### 8.8 Badge (Status)

- `radius.sm`, `label.sm`, `space.1`×`space.2` padding, colored per §1.1.4 semantic tokens (bg+fg pair, never fg-only on transparent — always has its tinted background for scannability at a glance).

### 8.9 Avatar

- `radius.full`, sizes 24/32/40/64 matching context (list row / header / profile). Fallback: initials on a deterministic `ink.subtle`-family tinted background (hashed from user id, not random — same user always gets same color).

### 8.10 Tabs / Segmented Control

- Tabs (e.g. Search's All/Documents/Chats): underline style, `label.md`, active tab `text.primary` + 2px `ink.default` underline sliding between tabs on change (`motion.spring`, not instant snap). Segmented Control (e.g. Theme selector): pill container `neutral.100`/`neutral.900`, active segment a `radius.full` white/dark chip sliding beneath the label (`motion.spring`).

### 8.11 Document Card / Chat Bubble / Citation Card

Fully specified in §5.6, §5.10, §7 respectively.

### 8.12 Skeleton Loader & Spinner

- Skeleton: `neutral.100`/`neutral.800` blocks matching the shape of real content (never generic gray rectangles unrelated to layout — a skeleton Document Card has an icon-shaped block, a text-line-shaped block, a badge-shaped block), pulsing opacity 0.5↔1.0 over 1.2s ease-in-out loop.
- Spinner: reserved for short, indeterminate waits inside buttons only (not full-screen) — full-screen/section loads always use Skeletons instead, per §9.

### 8.13 Empty State / Error State / Confirmation Dialog

Specified in full in §9.

---

## 9. Async, Empty, Loading & Error States

No screen shows a truly blank white/black frame while waiting. Every async boundary below is designed explicitly.

| State | Treatment |
|---|---|
| **Initial load (list screens)** | Skeleton cards matching final layout (3–5 placeholders), no spinner |
| **Initial load (Dashboard)** | Skeletons per-section, staggered in as each section's data resolves independently (sections don't all wait for the slowest one) |
| **Pull-to-refresh** | Custom ring glyph, §6 |
| **Optimistic updates** | Renaming a chat/document, toggling feedback thumbs: UI updates instantly, silently reconciles on server confirm; on failure, reverts with a brief inline `danger.fg` note + toast "Couldn't save — try again," never a blocking alert for low-stakes actions |
| **Retry (network blip)** | Inline retry affordance directly where the content would be — a card with an icon, "Something went wrong," Secondary Button "Retry" — not a full-screen takeover unless the entire screen depends on that one request |
| **Offline** | Persistent slim banner at the very top (below Top Bar), `warning.bg`, "You're offline — showing saved data," auto-dismisses on reconnect with a brief `success.bg` flash ("Back online") that fades after 2s |
| **Timeout** | Same visual language as Retry, copy specifies "This is taking longer than expected" |
| **Server error (5xx)** | Full-section error card: icon, "We hit a snag on our end," Secondary Button "Try again," never blames the user |
| **Auth expired** | Non-destructive modal (can't be dismissed by scrim tap): "Your session expired — sign in again to continue," Primary Button routes to Login, any in-progress composer text is preserved in local state and restored after re-auth |
| **Reconnect (websocket/stream drop mid-answer)** | Chat message shows a small inline note beneath the truncated text: "Connection dropped — " + Ghost Button "Regenerate," rather than pretending the answer finished |
| **Empty: No documents** | Illustration-free icon (`icon.xl`, `text.secondary`, e.g. a stacked-documents glyph), "No documents yet," subtext, Primary Button "Upload your first document" |
| **Empty: No chats** | Same pattern, "Ask your first question," Primary Button "New chat" |
| **Empty: No search results** | "No results for '{query}'," subtext suggesting broader terms, no CTA (nothing to push toward) |
| **Empty: No AI answer found** | Distinct from a normal answer: assistant message renders in the normal bubble but with a `text.secondary` icon prefix instead of the sparkle, copy along the lines of "I couldn't find anything about this in your documents," and a Secondary Button "Search anyway" or "Rephrase your question" — this must never look like a system error, since the AI answering honestly that it doesn't know is a successful, trustworthy outcome, not a failure state |

Empty-state copy always tells the user the one next action available; error copy always states what happened in plain terms and how to recover — never apologetic, never vague, per the writing guidance in §11.

---

## 10. Accessibility (WCAG 2.2 AA baseline)

- **Contrast:** All text/background pairs in §1.1 meet 4.5:1 (body) / 3:1 (large text ≥24px or ≥19px bold). Status colors always pair with an icon or text label, never color-alone (e.g. Status Badges carry the word "Ready/Processing/Failed," not just a colored dot).
- **Touch targets:** minimum 44×44 (`touch.min`) on every interactive element regardless of visible size.
- **Focus states:** every focusable element gets a visible 2px `border.focus` outline with 2px offset; never `outline: none` without a replacement. Web keyboard navigation follows visual reading order; modals/sheets trap focus and return it to the triggering element on close.
- **Screen readers:** all icon-only buttons carry an accessible label (e.g. "Copy response," "Regenerate response," "Remove document scope"). Streaming chat text is announced in reasonable chunks (not per-token, which would be unusable) — batch live-region updates roughly every 1–2 seconds or on sentence completion. Citation Confidence Ribbon's meaning is always duplicated as the visible percentage text, so the accessible name includes the number, not just a color description.
- **Reduced motion:** per §1.7, all spring/slide motion degrades to a simple opacity fade; looping animations (thinking dots, streaming caret) reduce to a static state indicator with text ("Thinking…", "Streaming…") when the OS setting is enabled.
- **Text scaling:** layouts tolerate up to 200% platform font-scaling without clipping — use flexible containers, not fixed heights, for any row containing user-scalable text.

---

## 11. Content & Voice Guidelines

- Buttons name the action, not a generic verb: "Upload document," not "Submit." "Ask about this document," not "Continue."
- Errors state what happened and how to fix it, no apology, no blame: "File exceeds 25MB limit" not "Oops! Something went wrong with your file :(".
- Empty states are invitations: always paired with the one next action, never just "Nothing here."
- The assistant's own uncertainty is stated plainly, never hedged into vagueness: "I couldn't find anything about this in your documents" rather than a soft non-answer.
- Status Badge labels are single words: Ready, Processing, Failed — no punctuation, no exclamation points anywhere in system copy.

---

## 12. Summary of Non-Negotiables for Implementation

1. Theme switch changes color tokens only — never layout, spacing, or component structure.
2. `ink` (indigo) = product/navigation/actions. `signal` (teal) = AI process, streaming, and citation confidence. Never swap these roles.
3. The Confidence Ribbon gradient + numeric badge is the only place a number is encoded as color intensity — reserve that pattern exclusively for citations.
4. No screen is ever a blank frame during load — Skeletons matching final content shape, per §9.
5. All interactive elements meet 44×44 touch target and visible focus states, even on web.
6. Continuous/looping animation is reserved for Signal-colored elements only (thinking indicator, streaming caret, the one AI-suggestion breathing icon on Dashboard).
