<div align="center">
  <img src=".github/assets/logo.png" alt="Tabin Logo" width="80" height="80" />
  <h1>Tabin</h1>
  <p>Turn your New Tab into a visual home for your favorite websites.</p>

  <p>
    <a href="#key-features"><strong>Features</strong></a> •
    <a href="#installation"><strong>Installation</strong></a> •
    <a href="#development--local-setup"><strong>Development</strong></a> •
    <a href="#privacy--local-first"><strong>Privacy</strong></a> •
    <a href="https://x.com/ayushmxxn"><strong>Twitter / X</strong></a>
  </p>

  <br />

  <img src=".github/assets/preview.png" alt="Tabin Preview" width="100%" />
</div>

<br />

## Overview

**Tabin** is a fast, local-first Chrome extension that transforms your browser's New Tab page into an elegant, organized launchpad. Designed with a clean aesthetic and fluid micro-interactions, Tabin lets you curate your favorite web destinations, organize workspaces into Spaces and Folders, keep instant scratchpad notes, and manage tab sessions—all while keeping 100% of your data on your machine.

---

## Key Features

- **Visual Launchpad:** Clean icon grid with dynamic accent colors, smooth layout transitions powered by Motion, customizable columns, and paginated navigation.
- **Spaces & Folders:** Group your bookmarks into separate workspaces (such as *Home*, *Work*, and *Personal*) and create nested folders with live preview stacks and popover overlays.
- **Interactive Dock:** Pinned favorites and folders along the bottom dock for one-click access across spaces.
- **Saved Tabs & Session Restore:** Capture active browser tabs and tab groups to free up memory, then restore individual tabs or whole sessions whenever you need them.
- **Quick Notes Notch:** A subtle top-left dynamic notch for frictionless, distraction-free scratchpad notes.
- **Instant Search:** Press `/` anywhere on the new tab to search and filter your shortcuts and folders locally with zero network latency.
- **One-Click Tab Capture:** Right-click any web page or tab to save it directly to Tabin or into a specific folder via the context menu.
- **Smart Metadata Resolution:** Automatically fetches high-resolution site favicons and OpenGraph preview images with background caching.
- **Custom Wallpapers:** Choose from bundled high-definition scenery presets, upload custom image wallpapers, or set live video backgrounds.
- **Import & Export:** Seamlessly import existing browser bookmarks (HTML) and export your entire workspace configuration as JSON.

---

## Installation

### Load Unpacked (Chrome / Edge / Brave / Arc)

1. Download or clone this repository:
   ```bash
   git clone https://github.com/ayushmxxn/tabin.git
   cd tabin
   ```
2. Install dependencies and build the extension:
   ```bash
   pnpm install
   pnpm build
   ```
3. Open your browser and navigate to the extensions page:
   - **Chrome / Arc / Brave:** `chrome://extensions/`
   - **Edge:** `edge://extensions/`
4. Toggle **Developer mode** in the top-right corner.
5. Click **Load unpacked** and select the `.output/chrome-mv3` folder inside the project.

---

## Development / Local Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (v20 or higher recommended)
- [pnpm](https://pnpm.io/) (v10.9.0 or higher)

### Setup Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ayushmxxn/tabin.git
   cd tabin
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Start the development server:**
   ```bash
   pnpm dev
   ```
   WXT will compile the extension and automatically open a clean Chrome profile with Tabin loaded and hot-module replacement (HMR) enabled.

   To develop for Firefox:
   ```bash
   pnpm dev:firefox
   ```

### Available Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Starts the WXT dev server for Chrome with live reload |
| `pnpm dev:firefox` | Starts the WXT dev server for Firefox |
| `pnpm build` | Compiles the production bundle to `.output/chrome-mv3` |
| `pnpm build:firefox` | Compiles the production bundle for Firefox |
| `pnpm compile` | Runs TypeScript type checking (`tsc --noEmit`) |
| `pnpm zip` | Packages the Chrome build into a distributable zip archive |
| `pnpm zip:firefox` | Packages the Firefox build into a distributable zip archive |

---

## Tech Stack

- **Framework:** [WXT](https://wxt.dev/) — Next-generation Web Extension Framework
- **Core:** [React 19](https://react.dev/) & [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) with `@tailwindcss/vite`
- **Animations:** [Motion](https://motion.dev/) (Framer Motion v13)
- **State Management:** [Zustand](https://zustand.docs.pmnd.rs/) (Local storage synced)
- **Icons & UI:** Lucide React icons, native CSS glassmorphism, and custom branding assets

---

## Privacy / Local-First

Tabin is built strictly on local-first principles:

- **Zero Cloud Sync:** All shortcuts, folders, settings, notes, and tab sessions are saved exclusively in your browser's local storage (`chrome.storage.local`).
- **No Telemetry or Tracking:** Tabin contains no analytics scripts, cookies, or remote logging.
- **Direct Requests Only:** Metadata and favicon fetching occurs directly between your browser and the respective bookmarked sites, with no intermediary servers.

For full details, read the [Privacy Policy](PRIVACY.md).

---

## Open Source / License

Tabin is open source software licensed under the [MIT License](https://opensource.org/licenses/MIT).


