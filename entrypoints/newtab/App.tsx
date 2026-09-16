import { Canvas } from "@/components/canvas/Canvas";
import { UndoToast } from "@/components/common/UndoToast";
import { Dock } from "@/components/dock/Dock";
import { Search } from "@/components/search/Search";
import { SpaceIndicator } from "@/components/spaces/SpaceIndicator";
import { SpaceSwitcher } from "@/components/spaces/SpaceSwitcher";
import { Wallpaper } from "@/components/wallpaper/Wallpaper";
import { syncStoreFromExternal, useLaunchpadStore } from "@/store/useLaunchpadStore";
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

  return (
    <div className="relative h-screen w-screen overflow-hidden font-sans select-none">
      <Wallpaper />

      <main className="pointer-events-none relative z-10 mx-auto h-full w-full max-w-[1360px] px-6 sm:px-12 pt-16 pb-24">
        <Canvas />
      </main>

      <Search />
      <SpaceSwitcher />
      <SpaceIndicator />
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
