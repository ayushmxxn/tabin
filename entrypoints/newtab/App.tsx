import { Canvas } from "@/components/canvas/Canvas";
import { UndoToast } from "@/components/common/UndoToast";
import { Dock } from "@/components/dock/Dock";
import { Search } from "@/components/search/Search";
import { SpaceIndicator } from "@/components/spaces/SpaceIndicator";
import { SpaceSwitcher } from "@/components/spaces/SpaceSwitcher";
import { Wallpaper } from "@/components/wallpaper/Wallpaper";
import { TopLeftNotch } from "@/components/notch/TopLeftNotch";
import { TopRightNotch } from "@/components/notch/TopRightNotch";
import { syncStoreFromExternal, useLaunchpadStore } from "@/store/useLaunchpadStore";
import { backfillShortcutsOgImages } from "@/lib/ogBackfill";
import { lazy, Suspense, useEffect } from "react";

const SettingsModal = lazy(() =>
  import("@/components/settings/SettingsModal").then((m) => ({
    default: m.SettingsModal,
  })),
);

const AddModal = lazy(() =>
  import("@/components/add/AddModal").then((m) => ({
    default: m.AddModal,
  })),
);

export default function App() {
  const isSettingsOpen = useLaunchpadStore((state) => state.isSettingsOpen);
  const isAddModalOpen = useLaunchpadStore((state) => state.isAddModalOpen);

  // Backfill OG images for existing shortcuts saved without them
  useEffect(() => {
    backfillShortcutsOgImages().catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof chrome === "undefined" || !chrome.storage?.onChanged) return;
    const handleStorageChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string,
    ) => {
      if (areaName === "local" && changes["launchpad-storage"]?.newValue) {
        syncStoreFromExternal(changes["launchpad-storage"].newValue);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  // Ensure the persistent Saved Tabs pinned tab exists on the far-left of the current browser window
  useEffect(() => {
    if (typeof chrome === "undefined" || !chrome.tabs) return;
    const savedTabsUrl = chrome.runtime.getURL("/saved-tabs.html");

    chrome.tabs.query({ currentWindow: true }, (windowTabs) => {
      if (chrome.runtime?.lastError || !windowTabs) return;
      const existingInWindow = windowTabs.find(
        (t) => t.url && t.url.startsWith(savedTabsUrl),
      );

      if (existingInWindow && existingInWindow.id) {
        if (!existingInWindow.pinned || existingInWindow.index !== 0) {
          chrome.tabs.update(existingInWindow.id, { pinned: true }).catch(() => {});
          chrome.tabs.move(existingInWindow.id, { index: 0 }).catch(() => {});
        }
      } else {
        chrome.tabs.create(
          {
            url: savedTabsUrl,
            pinned: true,
            active: false,
            index: 0,
          },
          (newTab) => {
            if (chrome.runtime?.lastError) {
              console.warn("Failed to pin Saved Tabs:", chrome.runtime.lastError);
            }
          },
        );
      }
    });
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden font-sans select-none">
      <Wallpaper />

      <main className="pointer-events-none relative z-10 mx-auto h-full w-full max-w-[1360px] px-6 sm:px-12 pt-16 pb-24">
        <Canvas />
      </main>

      <TopLeftNotch />
      <TopRightNotch />
      <Search />
      <SpaceSwitcher />
      <SpaceIndicator standalone />
      <Dock />
      {isSettingsOpen && (
        <Suspense fallback={null}>
          <SettingsModal />
        </Suspense>
      )}
      {isAddModalOpen && (
        <Suspense fallback={null}>
          <AddModal />
        </Suspense>
      )}
      <UndoToast />
    </div>
  );
}
