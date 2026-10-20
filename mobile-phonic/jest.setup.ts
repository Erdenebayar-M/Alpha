// MMKV is a native (Nitro) module; tests use an in-memory stand-in.
jest.mock('react-native-mmkv', () => {
  const data = new Map<string, string>();
  return {
    createMMKV: () => ({
      getString: (k: string) => data.get(k),
      set: (k: string, v: string) => void data.set(k, v),
      remove: (k: string) => data.delete(k),
    }),
  };
});

// Reanimated runs on native worklets; every Game test needs the official mocks.
jest.mock('react-native-worklets', () => require('react-native-worklets/lib/module/mock'));
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
