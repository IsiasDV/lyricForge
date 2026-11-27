// Client-side runtime configuration.
export const CLIENT_CONFIG = {
  WS_URL: `${typeof location !== 'undefined' ? (location.protocol === 'https:' ? 'wss' : 'ws') : 'ws'}://${typeof location !== 'undefined' ? location.host : 'localhost'}`,
  RECONNECT_DELAY_MS: 2000,
  MAX_RECONNECT_DELAY_MS: 10000,
  CAMERA_FOV: 70,
  CAMERA_NEAR: 0.1,
  CAMERA_FAR: 1000,
  COUNTDOWN_MS: 5000,      // singleplayer countdown (multiplayer uses the server's duration)
  MIN_LOADING_MS: 5000,    // minimum time the loading screen stays up
  BLACK_HOLD_MS: 1200,     // black screen hold before the fade-in
  FADE_IN_MS: 2000,        // fade from black into the map
  ASSETS_BASE: 'https://riseoflyric.com/', // game asset host root; relative asset paths like 'assets/x.glb' resolve against it
};
