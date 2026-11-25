// Minimal pub/sub event bus. Vanilla, no dependencies.
// Event names are dotted strings, e.g. 'project:changed'.

const listeners = new Map();

export function on(name, fn) {
  if (!listeners.has(name)) listeners.set(name, new Set());
  listeners.get(name).add(fn);
  return () => off(name, fn);
}

export function off(name, fn) {
  listeners.get(name)?.delete(fn);
}

export function emit(name, payload) {
  for (const fn of listeners.get(name) ?? []) {
    fn(payload);
  }
}
