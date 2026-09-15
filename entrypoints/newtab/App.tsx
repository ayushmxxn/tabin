import { Wallpaper } from '@/components/wallpaper/Wallpaper';
import { Search } from '@/components/search/Search';
import { Canvas } from '@/components/canvas/Canvas';
import { SpaceIndicator } from '@/components/spaces/SpaceIndicator';
import { Dock } from '@/components/dock/Dock';
import { FolderOverlay } from '@/components/folder/FolderOverlay';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { AddModal } from '@/components/add/AddModal';

export default function App() {
  return (
    <div className="relative h-screen w-screen overflow-hidden font-sans select-none">
      <Wallpaper />

      <Search />

      <main className="mx-auto h-full w-full max-w-[1360px] px-6 sm:px-12 pt-16 pb-24">
        <Canvas />
      </main>

      <SpaceIndicator />
      <Dock />
      <FolderOverlay />
      <SettingsModal />
      <AddModal />
    </div>
  );
}
