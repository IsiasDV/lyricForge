// localStorage persistence for editor state. All user data lives client-side
// (per project rules); storage access is wrapped in try/catch because storage
// can be unavailable (private browsing) or full.

const PREFIX = 'lyric-forge:';

export function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (err) {
    // Fail soft: never break the app because autosave could not write.
  }
}

export function load(key, fallback = null) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch (err) {
    return fallback;
  }
}

export function remove(key) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch (err) {
    // Fail soft.
  }
}
