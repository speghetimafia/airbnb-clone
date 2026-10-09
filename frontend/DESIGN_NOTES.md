# Airbnb Clone — Frontend Design Notes & Token Specification

Study based on `https://www.airbnb.co.in` (Desktop @ 1440px and Mobile @ 375px viewport).

---

## 1. Brand & Palette

| Token / Usage | Hex / Value | Description |
|---|---|---|
| **Primary Brand (Rausch)** | `#FF385C` | Airbnb signature accent, heart wishlists, badges, pins |
| **Brand Dark (Hover/Active)** | `#E00B41` | Hover state for solid brand elements |
| **Brand CTA Gradient** | `linear-gradient(to right, #E61E4D 0%, #E31C5F 50%, #D70466 100%)` | Used on all primary buttons ("Reserve", "Search", "Confirm and pay") |
| **Brand Gradient Hover** | `brightness(0.95)` | Interactive button feedback |
| **Text Primary (Ink)** | `#222222` | Headings, titles, active tabs, prominent copy |
| **Text Secondary (Muted)** | `#6A6A6A` | Subtitles, location descriptions, caption labels |
| **Text Tertiary (Light)** | `#717171` / `#B0B0B0` | Placeholder text, disabled dates |
| **Border Default (Line)** | `#DDDDDD` | Card dividers, section borders, standard inputs |
| **Border Active / Dark** | `#222222` | Selected inputs, active pills, modal focus rings |
| **Border Subdued** | `#EBEBEB` | Soft divider lines, category bar separator |
| **Background Base** | `#FFFFFF` | Main canvas background |
| **Background Soft** | `#F7F7F7` | User menus, highlight cards, search popovers |
| **Success / Positive** | `#008A05` / `#F0FDF4` | Confirmed status badge, discount savings pill |
| **Error / Alert** | `#C13515` / `#FFF8F6` | Unavailable dates, cancellation notices, errors |

---

## 2. Typography

Airbnb utilizes proprietary font **Airbnb Cereal VF**. For high-fidelity reproduction without proprietary font licensing, the exact fallback font stack is implemented:

```css
font-family: "Circular", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
```

### Hierarchy & Scale

| Element | Font Size | Font Weight | Line Height | Usage |
|---|---|---|---|---|
| **Display / Hero** | `32px` (`2rem`) | `600` (Semi-bold) | `1.15` | Page titles ("Trips", "Confirm and pay", "Hosting") |
| **Section Title (H2)** | `22px` (`1.375rem`) | `600` (Semi-bold) | `1.25` | Section headers ("Where you'll be", "What this place offers") |
| **Sub-heading (H3)** | `18px` (`1.125rem`) | `600` (Semi-bold) | `1.3` | Card headers, trip summary destination |
| **Body Prominent** | `16px` (`1rem`) | `500` / `600` | `1.5` | Key labels, search inputs, pricing callout |
| **Body Regular** | `15px` (`0.9375rem`) | `400` / `500` | `1.45` | Description copy, listing titles, review text |
| **Secondary / Caption** | `14px` (`0.875rem`) | `400` / `500` | `1.4` | Metadata, subtitle descriptions, footer links |
| **Micro / Overline** | `12px` / `10px` | `600` / `700` | `1.2` | Date picker weekdays, input field mini-labels |

---

## 3. Shadows & Elevations

| Token | CSS Value | Usage |
|---|---|---|
| `--shadow-pill` | `0 1px 2px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.05)` | Compact search bar, filter button idle |
| `--shadow-card` | `0 6px 16px rgba(0,0,0,0.12)` | Sticky booking card, active dropdown menus |
| `--shadow-popover` | `0 12px 28px rgba(0,0,0,0.18)` | Search bar dropdown panels (Where/When/Who) |
| `--shadow-price-pin` | `0 0 0 1px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.18)` | Map view price pins |

---

## 4. Spacing, Radii & Layout Dimensions

- **Max Content Widths:**
  - Full wide grid (Explore): `1760px`
  - Listing detail & Host management: `1280px`
  - Checkout & Trips: `1120px`
  - Modals (Medium): `560px`
  - Modals (Large): `780px`
- **Breakpoints:**
  - Mobile: `< 768px` (375px reference)
  - Tablet / Compact: `768px - 1024px`
  - Desktop standard: `1024px`
  - Desktop wide: `1280px - 1440px` (1440px reference)
- **Border Radii:**
  - Primary buttons: `8px` (`rounded-lg`)
  - Cards & Photo Grid: `12px` - `16px` (`rounded-xl` / `rounded-2xl`)
  - Floating pills & Search Bar: `9999px` (`rounded-full`)
  - Search dropdown panels: `32px` (`rounded-[32px]`)
  - Host avatar circle: `9999px`

---

## 5. Indian-Market Currency & Formatting

- **Currency:** Indian Rupee (`₹ INR`).
- **Formatting Standard:** Indian Numbering System with comma separation (`₹18,500`, `₹1,25,000`).
- **Formatter Implementation:**
  ```ts
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
  ```
- **Date Ranges:** Half-open intervals `[start, end)`: check-out day is free for incoming guests and departing stays.
- **Date Display:** `d MMM yyyy` or `d MMM – d MMM yyyy` (e.g. `14 Nov – 16 Nov 2026`).

---

## 6. Icons & Media

- **Bélo Logo & Inline SVGs:** All Airbnb brand marks and amenity glyphs are custom vector SVGs or Lucide SVG icons styled with Airbnb standard stroke weights (`1.5` - `2.5`).
- **Dynamic Photos:** Unsplash photo URLs automatically resized via `w=720` for high performance and sharp responsive rendering.

---

## 7. Mobile Viewport (375px) Experience & Patterns

1. **Header & Search Bar**:
   - Compact search pill with search glyph, dual-line typography (`Where to?` / destination, and `Anywhere · Any week · Add guests` / dates & guests).
   - Tapping the search bar launches the stepped full-screen search flow.
   - Non-explore pages (`/trips`, `/wishlists`, `/hosting`) display a compact mobile top bar with brand mark, search pill trigger, and account avatar.
   - On room detail (`/rooms/[id]`) and checkout (`/book/[id]`), the global header collapses, ceding screen space to edge-to-edge media and contextual actions.

2. **Stepped Search Flow (`SearchBar stacked`)**:
   - Progressive disclosure cards ("Where to?", "When's your trip?", "Who's coming?").
   - Destination picker with Indian hotspot quick-select chips (Goa, Manali, Jaipur, Udaipur, Kerala, etc.).
   - Interactive date selection auto-advancing from dates to guest count upon choosing check-out.
   - Pinned bottom utility bar with "Clear all" link and primary "Search" CTA.

3. **Room Detail Edge-to-Edge Media & Fixed Reserve Bar**:
   - Full-bleed photo slider with horizontal touch swipe gestures (`onTouchStart`/`onTouchEnd`).
   - Floating circular action buttons (Back, Share, Heart) and numeric photo counter badge (`X / Y`).
   - Fixed bottom reservation bar with nightly rate or total stay quote, dates preview, and "Reserve" / "Check availability" action.
   - Global `MobileNav` hidden on rooms and checkout to eliminate bottom navigation collisions.

4. **Bottom Sheet Modals**:
   - Modals animate up from the bottom on mobile devices (`animate-[slideUpMobile_.25s_ease-out]`) with rounded top corners (`rounded-t-3xl`) and a grab-handle indicator pill.
   - Scrollable contents paired with fixed bottom action buttons.

5. **Responsive Host Management**:
   - Wide table views gracefully convert to responsive stacked cards on mobile viewports for both reservations and listing inventories.

