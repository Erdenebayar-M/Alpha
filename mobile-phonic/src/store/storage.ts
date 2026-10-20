import { createMMKV } from 'react-native-mmkv';
import { createJSONStorage } from 'zustand/middleware';

const mmkv = createMMKV({ id: 'orto-phonic' });

// zustand `persist` adapter over MMKV (ADR 0001: progress lives on the device).
export const mmkvStorage = createJSONStorage(() => ({
  getItem: (key) => mmkv.getString(key) ?? null,
  setItem: (key, value) => mmkv.set(key, value),
  removeItem: (key) => {
    mmkv.remove(key);
  },
}));
