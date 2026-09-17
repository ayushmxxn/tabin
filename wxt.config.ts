import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  srcDir: ".",
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: "Tabin",
    description:
      "Turn your New Tab into a visual home for your favorite websites.",
    version: "0.1.0",
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
  },
});
