# Privacy Policy for Tabin

**Last Updated:** September 2026

Tabin is built with a strict privacy-first philosophy. This policy explains how Tabin handles your data.

---

## 1. Overview
Tabin is a clientside browser extension designed to customize your New Tab page into a clean, visual workspace. 

- **No Remote Servers:** Tabin does not operate user databases or analytics backends.
- **No Data Collection:** We do not collect, transmit, share, or sell your personal data, browsing history, search queries, or bookmarks.
- **Zero Telemetry:** Tabin contains no third-party tracking scripts, analytics cookies, or advertising SDKs.

---

## 2. How Your Data is Stored
All your data remains strictly on your local device:

- **Browser Local Storage (`chrome.storage.local` & `localStorage`):** Used to store your shortcuts, custom folders, layout choices, and static wallpaper settings.
- **IndexedDB:** Used to cache local video wallpapers for the Live Wallpaper feature on your machine. Videos are never uploaded to any remote server.
- **Browser Sync:** If your browser profile has sync enabled, your browser handles synchronization directly through your browser account. Tabin has no access to or control over this process.

---

## 3. Browser Permissions and Why They Are Needed

Tabin requests only the permissions necessary for core features:

| Permission | Purpose |
| :--- | :--- |
| `storage` | Saves your shortcuts, folders, layout preferences, and settings locally on your computer. |
| `unlimitedStorage` | Enables saving custom wallpaper images and cached live wallpaper video files without hitting standard browser quota limits. |
| `contextMenus` | Allows you to right-click on any webpage or link in your browser to quickly add it to your Tabin shortcuts. |
| `tabs` | Required to open your shortcuts in new or active browser tabs. |
| `bookmarks` *(Optional)* | Only requested dynamically if you choose to import bookmarks from your browser. Never accessed without your explicit consent. |

---

## 4. What We Do NOT Collect
Tabin does **not**:
- Track or record websites you visit.
- Log your search queries or keyboard inputs.
- Collect personally identifiable information (PII).
- Sell or monetize user data in any way.

---

## 5. Clearing Your Data
You have complete control over your data:
- You can export your shortcuts and workspace configuration at any time from **Settings → Import & Export**.
- You can delete all local shortcuts, custom wallpapers, and stored preferences at any time from **Settings → Privacy → Clear local data** or by uninstalling the extension.

---

## 6. Open Source
Tabin is open source under the MIT License. You can review the full source code and verify our privacy practices at:
[https://github.com/ayushmxxn/tabin](https://github.com/ayushmxxn/tabin)

---

## 7. Contact
If you have any questions or feedback regarding this Privacy Policy, please open an issue on GitHub:
[https://github.com/ayushmxxn/tabin/issues](https://github.com/ayushmxxn/tabin/issues)
