// Minimal observable store. Plain-object state, immutable-ish updates,
// subscribers notified on every set. No framework, no boilerplate.

export function createStore(initialState) {
  let state = initialState;
  const listeners = new Set();

  return {
    get: () => state,
    set: (partial) => {
      state = { ...state, ...partial };
      for (const fn of [...listeners]) fn(state);
    },
    subscribe: (fn) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
  };
}
