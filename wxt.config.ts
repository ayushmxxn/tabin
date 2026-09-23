import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  srcDir: ".",
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  zip: {
    excludeSources: ["dist/**"],
  },
  manifest: (env) => ({
    name: "Tabin: New Tab and Bookmark Manager",
    description:
      "A personal new tab for organizing bookmarks, websites, folders, saved tabs, and notes.",
    version: "1.0.1",
    icons: {
      "16": "icon-16.png",
      "32": "icon-32.png",
      "48": "icon-48.png",
      "128": "icon-128.png",
    },
    action: {
      default_icon: {
        "16": "icon-16.png",
        "32": "icon-32.png",
        "48": "icon-48.png",
        "128": "icon-128.png",
      },
    },
    permissions: [
      "storage",
      "contextMenus",
      "tabs",
      "tabGroups",
      "unlimitedStorage",
    ],
    host_permissions: ["https://*/*", "http://*/*"],
    optional_permissions: ["bookmarks"],
    ...(env.browser === "firefox"
      ? {
          browser_specific_settings: {
            gecko: {
              id: "tabin@ayushmxxn",
              strict_min_version: "109.0",
              data_collection_permissions: {
                required: ["none"],
              },
            },
          },
        }
      : {}),
  }),
});
