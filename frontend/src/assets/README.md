# Assets Directory

This directory holds static image assets used across the JK Tyre THI Fleet Intelligence Platform.

---

## Files Changed in This Update

The following source files were updated to replace the previous placeholder logo/hero image references with JK Tyre-specific assets:

| File | Change |
|------|--------|
| `src/pages/public/LandingPage.tsx` | Added `framer-motion` drop animation on tagline words; replaced hero background with `jk-hero.jpg`; replaced logo `<img>` with `jk-logo.png` |
| `src/pages/public/LoginPage.tsx` | Replaced logo `<img>` with `jk-logo.png` |
| `src/components/layout/Navbar.tsx` | Replaced logo `<img>` with `jk-logo.png` |
| `package.json` | Added `framer-motion` dependency |

---

## Image Files Requiring Manual Replacement

Two placeholder stub files are referenced by the code above and **must be replaced manually**:

### `jk-hero.jpg`
- Used as the full-bleed background image on the Landing Page hero section.
- **Replace with:** The JK Tyre showroom / trucks image you provided (the cover image you want displayed when users land on the page).

### `jk-logo.png`
- Used as the JK Tyre logo in the Navbar, Landing Page header, and Login Page.
- **Replace with:** The JK Tyre logo image (yellow background) you provided.

---

## How to Replace the Images

1. Copy your JK Tyre showroom/trucks cover image into this directory and name it exactly:
   ```
   jk-hero.jpg
   ```

2. Copy your JK Tyre logo (yellow background) into this directory and name it exactly:
   ```
   jk-logo.png
   ```

3. Restart the dev server:
   ```
   npm run dev
   ```

The app will automatically pick up the new images — no code changes needed.

---

## Notes

- Both filenames are case-sensitive on Linux/macOS deployments. Use lowercase exactly as shown.
- Supported formats: `.jpg` / `.jpeg` for the hero, `.png` for the logo (as currently imported in code). If you need a different format, update the import statements in the three files listed above.
