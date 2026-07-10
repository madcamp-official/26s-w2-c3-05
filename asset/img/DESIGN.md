---
name: Imperial Tang
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#e3bebd'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#aa8989'
  outline-variant: '#5b4040'
  surface-tint: '#ffb3b4'
  primary: '#ffb3b4'
  on-primary: '#680016'
  primary-container: '#c41e3a'
  on-primary-container: '#ffdada'
  inverse-primary: '#ba1434'
  secondary: '#fff9ef'
  on-secondary: '#3a3000'
  secondary-container: '#ffdb3c'
  on-secondary-container: '#725f00'
  tertiary: '#59de9b'
  on-tertiary: '#003921'
  tertiary-container: '#007448'
  on-tertiary-container: '#78fbb6'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdad9'
  primary-fixed-dim: '#ffb3b4'
  on-primary-fixed: '#40000a'
  on-primary-fixed-variant: '#920023'
  secondary-fixed: '#ffe16d'
  secondary-fixed-dim: '#e9c400'
  on-secondary-fixed: '#221b00'
  on-secondary-fixed-variant: '#544600'
  tertiary-fixed: '#78fbb6'
  tertiary-fixed-dim: '#59de9b'
  on-tertiary-fixed: '#002111'
  on-tertiary-fixed-variant: '#005232'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  headline-xl:
    fontFamily: Playfair Display
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  body-lg:
    fontFamily: Noto Serif
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Noto Serif
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-sm:
    fontFamily: Work Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.1em
spacing:
  unit: 8px
  container-max: 1280px
  gutter: 24px
  margin-desktop: 64px
  margin-mobile: 20px
---

## Brand & Style

This design system draws inspiration from the golden age of the Tang Dynasty, embodying a sense of "Majestic Opulence." The brand personality is authoritative, historical, and deeply cultural, designed to evoke a sense of reverence and timeless luxury. 

The visual style is a blend of **Tactile/Skeuomorphism** and **High-Contrast Boldness**. It rejects the flatness of modern web design in favor of rich textures: carved dark wood, polished jade, and silk-screened patterns. The goal is to make the user feel like they are navigating a digital palace. Elements should feel heavy, permanent, and handcrafted, utilizing intricate geometric latticework (dougong structures) and traditional silk textures to ground the experience in historical grandeur.

## Colors

The palette is rooted in the traditional hierarchy of the Imperial court.

- **Imperial Red (#C41E3A):** The primary color, used for active states, high-importance accents, and call-to-action elements.
- **Royal Gold (#FFD700):** Used for borders, iconography, and decorative flourishes. It should often be applied as a metallic gradient to simulate the sheen of real gold leaf.
- **Jade Green (#00A86B):** Represents wisdom and value. Used for secondary actions, success states, and status indicators.
- **Deep Lacquer Black (#0F0F0F):** The foundation of the UI. It provides a high-contrast backdrop that allows the vibrant red and gold to "pop."
- **Silk Cream (#FFF8E7):** A supplementary neutral used sparingly for text on light backgrounds or as a highlight color for delicate patterns.

## Typography

The typography system prioritizes elegance and readability with a literary flair. 

**Headlines** utilize high-contrast serifs to mimic the varying stroke weights of traditional calligraphy. **Body text** stays within the serif family for a "scroll-like" reading experience, ensuring the historical theme is maintained even in long-form content. **Labels** and utility text break away into a clean, professional sans-serif to ensure legibility at small sizes, acting as a functional bridge to the ornate display styles. 

For the most prestigious headings, use `headline-xl` with generous top/bottom margins to let the characters breathe, akin to a royal decree.

## Layout & Spacing

The layout follows a **Fixed Grid** philosophy to maintain the structural integrity of the "palace" frames. The center stage is always well-defined, surrounded by generous margins that suggest an expansive environment.

- **Desktop:** 12-column grid with a 1280px max-width. Margins are intentionally large (64px) to emphasize exclusivity and space.
- **Mobile:** 4-column grid with tight gutters (16px). The "ornate" borders found on desktop are simplified into elegant gold pinstripes to preserve screen real estate while maintaining brand identity.
- **Spacing Rhythm:** Based on an 8px base unit. Component internal padding should favor "airy" vertical spacing to evoke the tall ceilings of Tang architecture.

## Elevation & Depth

Visual hierarchy is achieved through **Tonal Layers** and **Tactile Depth**. 

Instead of generic shadows, this design system uses:
1.  **Carved Insets:** Form inputs and containers should appear "carved" into the Lacquer Black surface using inner shadows and 1px highlight edges.
2.  **Raised Plinths:** Primary cards and modals should look like raised platforms, featuring a subtle Royal Gold outer glow rather than a black shadow.
3.  **Latticework Layers:** Backgrounds should utilize semi-transparent geometric patterns (referencing the provided image) to create a sense of looking through a screen or window, adding depth without adding bulk.

## Shapes

The shape language is strictly **Sharp (0)**. In the Tang architectural style, strength is conveyed through straight lines and right angles. 

Corners should remain 90 degrees to mimic wooden joinery. Softness is introduced not through rounding, but through the "beveled" edges of gold frames and the organic curves found within the iconography or calligraphy. Any "pill" shapes should be strictly reserved for secondary tags (chips) to differentiate them from the primary structural elements.

## Components

- **Buttons:** Primary buttons are Imperial Red with a 1px Royal Gold border. On hover, the gold border should "glow." Use `label-sm` typography for button text.
- **Cards:** Feature a "Wood Grain" texture in the background (Deep Lacquer Black). The header of the card should be separated by a Jade Green or Gold horizontal divider featuring a small geometric knot in the center.
- **Input Fields:** Darker than the background, with a "recessed" look. The cursor and focus state should be Jade Green.
- **Scrollbars:** Custom-styled to look like a gold-threaded silk cord moving within a dark wood track.
- **Dividers:** Use traditional "Cloud" or "Ruyi" patterns in low-opacity Gold to separate sections.
- **Modals:** Must feature a heavy border frame inspired by dougong (bracket sets), making the modal feel like a structural part of the architecture.