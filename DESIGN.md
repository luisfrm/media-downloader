---
name: StreamGrab
colors:
  surface: '#0d1320'
  surface-dim: '#0d1320'
  surface-bright: '#333948'
  surface-container-lowest: '#080e1b'
  surface-container-low: '#161b29'
  surface-container: '#1a1f2d'
  surface-container-high: '#242a38'
  surface-container-highest: '#2f3543'
  on-surface: '#dde2f5'
  on-surface-variant: '#bac9cc'
  inverse-surface: '#dde2f5'
  inverse-on-surface: '#2a303f'
  outline: '#849396'
  outline-variant: '#3b494c'
  surface-tint: '#00daf3'
  primary: '#c3f5ff'
  on-primary: '#00363d'
  primary-container: '#00e5ff'
  on-primary-container: '#00626e'
  inverse-primary: '#006875'
  secondary: '#b4c5ff'
  on-secondary: '#002a78'
  secondary-container: '#0053db'
  on-secondary-container: '#cdd7ff'
  tertiary: '#cdf3ff'
  on-tertiary: '#003640'
  tertiary-container: '#60e1ff'
  on-tertiary-container: '#006273'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#9cf0ff'
  primary-fixed-dim: '#00daf3'
  on-primary-fixed: '#001f24'
  on-primary-fixed-variant: '#004f58'
  secondary-fixed: '#dbe1ff'
  secondary-fixed-dim: '#b4c5ff'
  on-secondary-fixed: '#00174b'
  on-secondary-fixed-variant: '#003ea8'
  tertiary-fixed: '#acedff'
  tertiary-fixed-dim: '#4cd7f6'
  on-tertiary-fixed: '#001f26'
  on-tertiary-fixed-variant: '#004e5c'
  background: '#0d1320'
  on-background: '#dde2f5'
  surface-variant: '#2f3543'
typography:
  headline-xl:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Geist
    fontSize: 15px
    fontWeight: '500'
    lineHeight: 22px
  body-lg:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  data-mono-sm:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '400'
    lineHeight: 14px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-compact: 0.75rem
  margin: 1.5rem
  margin-compact: 1rem
  space-2xs: 0.125rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
  space-2xl: 2rem
---

## Brand & Style

The design system establishes a high-performance, precision utility interface tailored for power users, content creators, and archivists who handle high-volume media extraction across modern platforms. The visual character rejects cluttered, ad-laden freeware tropes in favor of an ergonomic, dark-mode native desktop aesthetic reminiscent of professional developer tools and digital audio workstations.

The aesthetic fuses **Precision Minimalism** with **Atmospheric Layering**:
- Deep oceanic slate environments establish focused, eye-strain-free working sessions.
- Vibrant royal blue and electric cyan accents guide the eye instantaneously to action vectors, stream extraction statuses, and bandwidth telemetries.
- Sharp, low-noise informational hierarchy prioritizing speed, tactile confirmation, and instant media parsing.
- The tactile sensation conveys low-latency speed: immediate URL recognition, crisp platform badging, and fluid progress indicators.

## Colors

The palette leverages an atmospheric deep oceanic canvas offset by electric luminescent highlights designed specifically for dark-mode desktop interfaces.

- **Primary (`#00E5FF` - Electric Cyan):** Used for dynamic active states, high-priority download progress bars, active network counters, and real-time link detection pulses.
- **Secondary (`#2563EB` - Royal Blue):** Anchors primary call-to-actions, batch start triggers, and selected navigation states, offering stable grounding against the dark canvas.
- **Tertiary (`#06B6D4` - Deep Cyan):** Applied to secondary metrics, active platform protocol tags, and subtle audio/video codec indicators.
- **Neutral Canvas (`#0B111E` - Deep Oceanic Slate):** Serves as the bedrock dark window background. Layered tiers step upward through `#111A2E` (Sidebar and Toolbars) to `#17233D` (Cards and Utility Surfaces).
- **Functional Semantics:**
  - Success/Complete: `#10B981` (Emerald)
  - Error/Expired Link: `#F43F5E` (Rose)
  - Warning/Rate Limited: `#F59E0B` (Amber)
  - Border Subdued: `rgba(255, 255, 255, 0.08)`
  - Border Active/Focus: `rgba(0, 229, 255, 0.4)`

## Typography

The type system prioritizes micro-legibility, tabular alignment, and fast parsing. It relies on a three-tier hierarchy:
- **Headings (Geist):** Clean, geometric neo-grotesque headers that deliver an authoritative, native OS desktop presence.
- **Body & Controls (Inter):** Highly legible neutral body text with balanced horizontal proportions, preventing eye fatigue across dense media lists.
- **Data & Telemetry (JetBrains Mono):** Reserved for technical metrics including bitrates, download speeds (`MB/s`), timestamps, durations, file sizes, and URL protocol tags. Monospaced tabular figures prevent UI jitter during dynamic counter updates.

## Layout & Spacing

The layout model implements an ergonomic desktop split-pane architecture utilizing fluid flex layouts with strict minimum boundaries:
- **Shell Structure:**
  - **Left Rail (Collapsible):** Width shifts between `240px` (expanded state with labeled icons and queue groupings) and `64px` (collapsed icon-only mode with floating tooltips).
  - **Main Canvas:** Fluid single-column utility area anchored by an upper fixed Quick-Paste zone, followed by scrollable virtualized queue lists.
  - **Right Telemetry / Inspector Drawer (Optional):** Fixed `320px` slide-out panel for single-item asset inspects (codec selection, audio extraction toggles, thumbnail selection).
- **Rhythm & Grid:**
  - Component gaps and padding stick strictly to an 8pt base scale with 4pt half-steps (`space-xs`, `space-sm`) for dense desktop controls.
  - Media queue rows use a dense `0.75rem` vertical rhythm to display at least 8 to 12 visible tasks simultaneously on standard 1080p desktop windows.

## Elevation & Depth

Visual hierarchy operates via **Tonal Surface Stacking** combined with micro-diffused dark-ambient shadows and high-precision ghost borders. Traditional heavy drop shadows are avoided to maintain crisp interface borders.

- **Base Window Canvas (`#0B111E`):** Bottom-most visual surface.
- **Structural Chrome / Panes (`#111A2E`):** Outer panels, sidebars, and title bar header. Separated from content by `1px solid rgba(255, 255, 255, 0.06)`.
- **Card & List Items (`#17233D`):** Interactive download cards and floating URL input bar. Surface sits +1 step higher, featuring `1px solid rgba(255, 255, 255, 0.08)`.
- **Overlays / Dropdowns (`#1D2B4A`):** Modals, format picker context menus, and tooltips. Elevated using an ambient shadow: `0 12px 32px -4px rgba(2, 6, 17, 0.65), 0 0 0 1px rgba(0, 229, 255, 0.15)`.
- **Active State Glow:** Focused or actively downloading elements cast a subtle electric cyan ambient glow: `box-shadow: 0 0 16px -2px rgba(0, 229, 255, 0.25)`.

## Shapes

The design system maintains a **Soft (`1`)** shape language designed for technical utilities. This geometry balances software precision with ergonomic warmth.

- **Standard Elements (Buttons, Inputs, Badges, Dropdowns):** `0.25rem` (4px) to `0.375rem` (6px) corner radius, preserving clean architectural alignment along grid boundaries.
- **Surface Cards & Modals:** `0.5rem` (8px) corner radius (`rounded-lg`), delivering subtle separation from straight window frame edges without feeling toy-like.
- **Status Pills & Dynamic Platform Tags:** `9999px` (full pill) exclusively for auto-detected platform badges (e.g., YouTube, TikTok, X) and active state indicator capsules.

## Components

### Quick-Paste URL Input Bar
- Elevated persistent input container sitting at the top of the queue view.
- Contains an automatic clipboard listening toggle, a monospaced input field, and a right-aligned "Fetch Media" trigger.
- **Auto-Detection Badge Slot:** Dynamically renders an animated platform badge (YouTube red, X black/white, TikTok cyan/magenta, Instagram gradient tint) inside the input prefix slot immediately upon URL string match.
- Focused state activates an electric cyan border with `0 0 12px rgba(0, 229, 255, 0.2)` blur glow.

### Platform Badges & Chips
- Compact, high-utility metadata tags displaying origin source, format resolution (4K, 1080p, MP3, FLAC), and file size.
- Background uses 10% opacity tints of the source color with a solid 1px inner stroke.
- Text rendered in `data-mono-sm` for immediate recognition.

### Media Queue Cards & Rows
- Horizontal modular cards with multi-column tabular alignment:
  1. Compact 16:9 media thumbnail with embedded duration badge (`JetBrains Mono`).
  2. Title block with two-line truncation and publisher handle.
  3. Format selection dropdown chip (e.g., `MP4 • 1080p60` or `Audio Only • 320kbps`).
  4. Dual-state progress bar: `2px` hairline track (`rgba(255, 255, 255, 0.1)`) with Electric Cyan fill (`#00E5FF`) and indeterminate shimmer when merging streams.
  5. Metrics block displaying current speed (`MB/s`), downloaded/total size, and ETA.
  6. Action cluster: Pause/Resume, Open Folder, and Remove icon buttons.

### Download Queue Counters
- Compact header-level stat indicators displaying total queue progress (e.g., `3 Active | 12 Queued | 1.4 GB Remaining`).
- Dynamic overall speed counter rendered in `Geist` medium with an Electric Cyan indicator dot that pulses in cadence with active sockets.

### Buttons & Action Triggers
- **Primary:** Royal Blue (`#2563EB`) background, white text, smooth hover transition to `#1D4ED8` with a fine `0 0 8px rgba(37, 99, 235, 0.4)` glow.
- **Accent (Fetch/Download):** Electric Cyan (`#00E5FF`) background with dark oceanic slate text (`#0B111E`), delivering maximum visual contrast for trigger actions.
- **Ghost/Icon Buttons:** Transparent with subtle hover wash (`rgba(255, 255, 255, 0.06)`), 4px border radius, strictly sized at 32x32px for tactile cursor targeting.

### Checkboxes & Segmented Controls
- Minimal squircle checkboxes with custom cyan checks.
- Segmented format toggles (`Video`, `Audio`, `Thumbnails`, `Subtitles`) built with an inset container (`#0B111E`) and an active sliding pill surface (`#17233D`).