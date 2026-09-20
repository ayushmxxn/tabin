# Tabin Production Release Guide

This document provides instructions and metadata for submitting Tabin to the **Chrome Web Store**, **Microsoft Edge Add-ons**, and **Mozilla Firefox Add-ons (AMO)**.

---

## 1. Release Packages

All production packages are located in `dist/releases/`:

| Package | Target Store | Manifest Version | Notes |
|---|---|---|---|
| [`dist/releases/tabin-chrome.zip`](dist/releases/tabin-chrome.zip) | **Chrome Web Store** | Manifest V3 | Clean Chromium MV3 bundle with service worker |
| [`dist/releases/tabin-edge.zip`](dist/releases/tabin-edge.zip) | **Microsoft Edge Add-ons** | Manifest V3 | Compatible with Edge Add-on Store |
| [`dist/releases/tabin-firefox.zip`](dist/releases/tabin-firefox.zip) | **Firefox Add-ons (AMO)** | Manifest V3 | Includes `browser_specific_settings.gecko` and data collection disclosure |
| [`dist/releases/tabin-sources.zip`](dist/releases/tabin-sources.zip) | **Mozilla AMO Review** | Source Archive | Required by Mozilla when submitting compiled/bundled code |

Every package is verified:
- `manifest.json` is located at the archive root.
- Unnecessary files (`.git/`, `.github/`, `node_modules/`, `.env`, tests, dev scripts, and source maps) are completely excluded.
- All icons and referenced assets exist with matching pixel sizes.

---

## 2. Store Submission Instructions

### A. Chrome Web Store

1. Log in to the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole).
2. Click **New item** (or **Upload new package** if updating).
3. Select and upload `dist/releases/tabin-chrome.zip`.
4. **Store Listing**:
   - **Name:** `Tabin`
   - **Summary:** `Turn your New Tab into a visual home for your favorite websites.`
   - **Category:** `Productivity`
   - **Language:** `English`
   - **Icon:** Upload `public/icon-128.png` (or `public/icon/128.png`).
   - **Screenshots:** Upload at least one screenshot (`.github/assets/preview.png` or scaled to `1280x800`).
5. **Privacy Practices Tab**:
   - **Single Purpose Description:**
     > Tabin replaces the New Tab page with an organized visual launchpad for websites, custom spaces, scratchpad notes, and saved tab sessions.
   - **Permission Justifications:**
     - `storage`: Needed to persist user bookmarks, folders, spaces, settings, and scratchpad notes locally on device.
     - `contextMenus`: Needed to allow users to right-click tabs and quickly choose "Add to Tabin" or select a destination folder.
     - `tabs`: Needed to read tab URLs and titles when capturing tabs in the Saved Tabs session manager or adding shortcuts from the browser context menu.
     - `tabGroups`: Needed to capture, organize, and restore native tab groups in the Saved Tabs session manager.
     - `unlimitedStorage`: Needed to store offline OpenGraph website previews and custom background wallpaper images without storage quota errors.
     - `host_permissions` (`https://*/*`, `http://*/*`): Needed to retrieve website metadata (title, OpenGraph preview images, and high-resolution favicons) directly when users add bookmarks.
   - **Data Usage:**
     - Check: *Does not sell user data*.
     - Check: *Does not use or transfer user data for unrelated purposes*.
     - Check: *Does not use or transfer user data to determine creditworthiness or lending*.
   - **Privacy Policy URL:** Link to [`PRIVACY.md`](https://github.com/ayushmxxn/tabin/blob/main/PRIVACY.md).
6. Click **Submit for review**.

---

### B. Microsoft Edge Add-ons

1. Log in to the [Microsoft Partner Center](https://partner.microsoft.com/dashboard/microsoftedge).
2. Click **Create new extension**.
   - *Tip:* Edge supports importing your listing directly from the Chrome Web Store once your CWS listing is published.
3. If uploading manually, select `dist/releases/tabin-edge.zip`.
4. Fill in the extension metadata, description, categories (*Productivity*), and upload the store assets.
5. Provide the Privacy Policy URL: `https://github.com/ayushmxxn/tabin/blob/main/PRIVACY.md`.
6. Submit for certification.

---

### C. Firefox Add-ons (AMO)

1. Log in to the [Mozilla Add-on Developer Hub](https://addons.mozilla.org/developers/).
2. Click **Submit a New Add-on** → **On this site** (public distribution).
3. Upload `dist/releases/tabin-firefox.zip`.
4. **Source Code Submission (Mandatory on AMO):**
   - Mozilla asks: *"Does your extension contain minified, obfuscated, or compiled code?"*
   - Select **Yes**.
   - Upload `dist/releases/tabin-sources.zip`.
   - In the **Notes for Reviewers** box, paste the following build reproduction steps:
     ```text
     Build instructions:
     1. Unpack tabin-sources.zip.
     2. Ensure Node.js 20+ and pnpm are installed.
     3. Run: pnpm install
     4. Run: npx wxt build -b firefox --mv3
     5. The compiled extension will be in .output/firefox-mv3
     ```
5. **Technical Configuration Highlights**:
   - `id`: `tabin@ayushmxxn` (declared in `browser_specific_settings.gecko`).
   - `strict_min_version`: `109.0` (standard minimum for Firefox MV3 WebExtensions).
   - `data_collection_permissions`: Declared as `{"required": ["none"]}` conforming to Mozilla's data collection consent policy.
6. Submit for review.

---

## 3. How to Re-generate Release Builds

If you make code changes in the future, re-generate the packages using:

```bash
# 1. Typecheck
pnpm compile

# 2. Build and zip for Chrome
npx wxt zip

# 3. Build and zip for Edge
npx wxt zip -b edge

# 4. Build and zip for Firefox (MV3 + sources)
npx wxt zip -b firefox --mv3

# 5. Copy artifacts to dist/releases/
mkdir -p dist/releases
cp .output/tabin-*-chrome.zip dist/releases/tabin-chrome.zip
cp .output/tabin-*-edge.zip dist/releases/tabin-edge.zip
cp .output/tabin-*-firefox.zip dist/releases/tabin-firefox.zip
cp .output/tabin-*-sources.zip dist/releases/tabin-sources.zip
```

---

## 4. Manual Store Requirements to Complete

Before submitting, ensure you have:
- [ ] Registered developer accounts on [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole) ($5 one-time fee) and [Microsoft Partner Center](https://partner.microsoft.com/) (free).
- [ ] A public repository or hosted webpage for the [Privacy Policy](https://github.com/ayushmxxn/tabin/blob/main/PRIVACY.md).
- [ ] At least one 1280x800 or 640x400 promo screenshot ready to attach during listing creation (see `.github/assets/preview.png`).
