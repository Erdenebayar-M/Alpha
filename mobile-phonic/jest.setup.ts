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
