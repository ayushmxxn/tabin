import { AddModal } from "@/components/add/AddModal";
import { Canvas } from "@/components/canvas/Canvas";
import { UndoToast } from "@/components/common/UndoToast";
import { Dock } from "@/components/dock/Dock";
import { Search } from "@/components/search/Search";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { SpaceIndicator } from "@/components/spaces/SpaceIndicator";
import { Wallpaper } from "@/components/wallpaper/Wallpaper";
import { syncStoreFromExternal } from "@/store/useLaunchpadStore";
import { useEffect } from "react";

export default function App() {
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
      <SpaceIndicator />
      <Dock />
      <SettingsModal />
      <AddModal />
      <UndoToast />
    </div>
  );
}
