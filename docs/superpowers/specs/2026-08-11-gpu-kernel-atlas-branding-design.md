# GPU Kernel Atlas Branding Design

## Goal

Rename the product to **GPU Kernel Atlas**, align its favicon with the aserdargun.com visual identity, and simplify the top navigation without changing the learning flow.

## Scope

### Product name and metadata

- Use **GPU Kernel Atlas** as the visible product name in the top-bar brand.
- Use **GPU Kernel Atlas** at the start of Turkish and English document titles, Open Graph titles, Twitter titles, and related accessible labels.
- Keep the localized descriptors **GPU Kernel Mühendisliği** and **GPU Kernel Engineering** as supporting copy.
- Keep the existing locale-aware metadata, canonical URLs, social-card files, and host detection unchanged.

### Top navigation

- Remove the localized **Overview / Genel bakış** button from the top navigation.
- Remove the **Atlas** button from the top navigation.
- Keep the **12 Weeks / 12 hafta** anchor, language selector, progress indicator, mobile menu control, brand home action, sidebar overview action, and module navigation.
- Do not change routing, module selection, progress persistence, or responsive sidebar behavior.

### Favicon

- Replace the current mark with an isometric three-face cube that remains legible at favicon sizes.
- Use the existing dark product background plus the approved aserdargun.com-aligned accent palette:
  - background: `#121310`
  - top face: `#c8ff36`
  - left face: `#6a8dff`
  - right face: `#ff7043`
- Keep the asset as `public/favicon.svg` so the existing Next.js metadata path and deployment behavior remain stable.
- Include accessible SVG metadata without adding text that becomes illegible at small sizes.

## Affected surfaces

- `app/page.tsx`: localized page, Open Graph, and Twitter metadata.
- `app/kernel-atlas.tsx`: visible brand, accessible home label, and top navigation.
- `public/favicon.svg`: approved cube artwork.
- `tests/rendered-html.test.mjs`: regression coverage for the new name, retained navigation, and removed links.

## Verification

- Add or update rendered-HTML assertions first and observe them fail against the current UI.
- Implement the smallest changes needed to make those assertions pass.
- Run the repository lint, build, and test commands.
- Render the app and verify desktop plus one mobile viewport: correct title and brand, cube favicon reference, retained 12-week/language/progress controls, and no top-nav Overview or Atlas buttons.
- Confirm there is no framework error overlay and no relevant console error or warning.

## Non-goals

- Redesigning the header, sidebar, hero, social-card artwork, or learning modules.
- Renaming internal component names, storage keys, routes, repository/package identifiers, or the domain.
- Publishing or deploying the change.
