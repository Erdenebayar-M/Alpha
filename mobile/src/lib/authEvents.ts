// Tiny pub/sub so src/api/client.ts (outside React) can tell AuthContext a
// 401 happened. clearToken() alone isn't enough — AuthContext's `parent`
// state is what actually gates the (app) route group, and nothing outside
// the provider can null it without this.
type Listener = () => void;

const listeners = new Set<Listener>();

export function onUnauthorized(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitUnauthorized(): void {
  for (const listener of listeners) listener();
}
