import type { LaunchpadItem, Space } from '@/types';

export const SPACES: Space[] = [
  { id: 'space-home', name: 'Home' },
];

export const INITIAL_ITEMS: LaunchpadItem[] = [
  {
    id: 'beehiiv',
    type: 'shortcut',
    title: 'Beehiiv',
    url: 'https://www.beehiiv.com/?via=ayushmaan-singh',
    spaceId: 'space-home',
    folderId: null,
    accent: 'amber',
  },
  {
    id: 'cal',
    type: 'shortcut',
    title: 'Cal.com',
    url: 'https://refer.cal.com/ayushmxxn-m4ox',
    spaceId: 'space-home',
    folderId: null,
    accent: 'slate',
    customIcon: '/cal.png',
  },
  {
    id: 'cap',
    type: 'shortcut',
    title: 'Cap',
    url: 'https://go.cap.so/ayushmaan-singh',
    spaceId: 'space-home',
    folderId: null,
    accent: 'violet',
    customIcon: '/cap.png',
  },
  {
    id: 'viktor',
    type: 'shortcut',
    title: 'Viktor',
    url: 'https://ref.viktor.com/ayushmaan-singh',
    spaceId: 'space-home',
    folderId: null,
    accent: 'violet',
    customIcon: '/viktor.png',
  },
  {
    id: 'kolo',
    type: 'shortcut',
    title: 'Kolo',
    url: 'https://kolo.dub.link/ayushmaan-singh',
    spaceId: 'space-home',
    folderId: null,
    accent: 'slate',
    customIcon: '/kolo.png',
  },
  {
    id: 'entertainment',
    type: 'folder',
    title: 'Entertainment',
    spaceId: 'space-home',
    folderId: null,
    itemIds: ['prime-video', 'disney-plus'],
    accent: 'rose',
    color: '#50B1FD',
  },
  {
    id: 'prime-video',
    type: 'shortcut',
    title: 'Prime Video',
    url: 'https://www.primevideo.com',
    spaceId: 'space-home',
    folderId: 'entertainment',
    accent: 'blue',
  },
  {
    id: 'disney-plus',
    type: 'shortcut',
    title: 'Disney+',
    url: 'https://www.disneyplus.com',
    spaceId: 'space-home',
    folderId: 'entertainment',
    accent: 'blue',
  },
];

export const INITIAL_DOCK_IDS: string[] = ['entertainment'];
