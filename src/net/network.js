// WebSocket client wrapper: connect, auto-reconnect with backoff, ping/latency tracking,
// and a thin message dispatch layer on top of the shared events bus.
import { CLIENT_CONFIG } from '../core/config.js';
import { events } from '../core/events.js';

const MSG = {
  HELLO: 'hello', INPUT: 'input', PONG: 'pong',
  WELCOME: 'welcome', SNAPSHOT: 'snapshot',
  PLAYER_JOIN: 'playerJoin', PLAYER_LEAVE: 'playerLeave', RESYNC: 'resync', RESUME_FAILED: 'resumeFailed', PING: 'ping',
  CREATE_LOBBY: 'createLobby', SOLO_PAUSE: 'soloPause', JOIN_LOBBY: 'joinLobby', LEAVE_LOBBY: 'leaveLobby',
  SET_NAME: 'setName', SET_STATS: 'setStats', SET_BESTS: 'setBests', SET_ACHIEVEMENTS: 'setAchievements', SET_PERK: 'setPerk', SET_CHARACTER: 'setCharacter', SELF_REVIVE: 'selfRevive', SET_MAP: 'setMap', ADD_BOT: 'addBot', ACCOUNT_SIGNUP: 'accountSignup', ACCOUNT_SIGNIN: 'accountSignin', ACCOUNT_SIGNOUT: 'accountSignout', ACCOUNT_STATS_GET: 'accountStatsGet', ACCOUNT_REPORT: 'accountReport', FRIEND_ADD: 'friendAdd', FRIEND_REMOVE: 'friendRemove', FRIENDS_SUB: 'friendsSub', FRIEND_JOIN: 'friendJoin', ACCOUNT_RESULT: 'accountResult', ACCOUNT_PROFILE: 'accountProfile', ACCOUNT_STATS: 'accountStats', FRIENDS: 'friends', FRIEND_UPDATE: 'friendUpdate', FRIEND_RESULT: 'friendResult', ACCOUNT_CHANGE_PASSWORD: 'accountChangePassword', ACCOUNT_CHANGE_NAME: 'accountChangeName', ACCOUNT_SETTINGS: 'accountSettings', FRIEND_INVITE: 'friendInvite', LEADERBOARD_GET: 'leaderboardGet', LEADERBOARD: 'leaderboard', NOTIFY: 'notify', FRIEND_SET: 'friendSet', REMOVE_BOT: 'removeBot', SET_DIFFICULTY: 'setDifficulty', SET_MODE: 'setMode', SET_TEAM: 'setTeam', HUNTED_EVENT: 'huntedEvent', SET_READY: 'setReady', SET_VISIBILITY: 'setVisibility', LIST_LOBBIES: 'listLobbies', LOBBIES: 'lobbies', JOIN_PUBLIC: 'joinPublic', QUICK_JOIN: 'quickJoin', CHAT: 'chat',
  LOBBY_STATE: 'lobbyState', LOBBY_ERROR: 'lobbyError', LOBBY_CHAT: 'lobbyChat',
  LOBBY_CLOSED: 'lobbyClosed',
  MAP_LOADED: 'mapLoaded', COUNTDOWN: 'countdown', LOAD_MAP: 'loadMap',
  MATCH_BEGIN: 'matchBegin', MAP_EVENT: 'mapEvent', INTRO_SKIP: 'introSkip', INTRO_VOTES: 'introVotes', MATCH_ABORTED: 'matchAborted',
  PLAYER_STATE: 'playerState', MATCH_STATE: 'matchState',
  SECRET: 'secret', SECRET_SONG: 'secretSong', SLAP: 'slap', WEAPON: 'weapon', BLAZE: 'blaze', BLAZE_FX: 'blazeFx', KNOCKBACK: 'knockback',
  PICKUP: 'pickup', SHOOT: 'shoot', PICKUP_TAKEN: 'pickupTaken', PICKUP_RESPAWN: 'pickupRespawn', BULLET: 'bullet',
  SLAP_FX: 'slapFx', CHAT_SFX: 'chatSfx', POWERUP_PICKUP: 'powerupPickup', POWERUP_EVENT: 'powerupEvent',
  LAT_PING: 'latPing', LAT_PONG: 'latPong', LATENCY: 'latency',
  DEV_SPAWN_ENEMY: 'devSpawnEnemy', DEV_GOD: 'devGod', INTERACT: 'interact', SWAP_PERK: 'swapPerk', INTERACT_RESULT: 'interactResult', REVIVE: 'revive', ENEMY_EVENT: 'enemyEvent', PLAYER_EVENT: 'playerEvent', GAME_OVER: 'gameOver', ROUND_EVENT: 'roundEvent'
};

export class NetworkClient {
  constructor() {
    this.socket = null;
    this.playerId = null;
    this.connected = false;
    this.ping = 0;
    this._reconnectDelay = CLIENT_CONFIG.RECONNECT_DELAY_MS;
    this._pingSentAt = 0;
  }

  connect(name = 'Player', stats = null, perk = null) {
    this._helloName = name;
    if (perk) this._helloPerk = perk;
    if (stats) this._helloStats = stats;
    this.socket = new WebSocket(CLIENT_CONFIG.WS_URL);

    this.socket.addEventListener('open', () => {
      this.connected = true;
      this._reconnectDelay = CLIENT_CONFIG.RECONNECT_DELAY_MS;
      events.emit('net:connected');
      this.send({ type: MSG.HELLO, name: this._helloName, stats: this._helloStats, perk: this._helloPerk, achievements: this._helloAchievements, bests: this._helloBests, resume: this._resumeNow(), session: this.getSession?.() ?? undefined });
      clearInterval(this._latTimer);
      this._latTimer = setInterval(() => this.send({ type: MSG.LAT_PING, t: performance.now() }), 3000);
    });

    this.socket.addEventListener('message', (event) => this._onMessage(event));

    this.socket.addEventListener('close', () => {
      this.connected = false;
      clearInterval(this._latTimer);
      events.emit('net:disconnected');
      this._scheduleReconnect();
    });

    this.socket.addEventListener('error', () => {
      this.socket.close();
    });
  }

  // Rejoin ticket for HELLO, only while the session says a live multiplayer match can be resumed.
  _resumeNow() {
    this._resumeAttempted = !!(this._resumeTicket && this.canResume?.());
    return this._resumeAttempted ? this._resumeTicket : undefined;
  }

  _onMessage(event) {
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }

    switch (msg.type) {
      case MSG.WELCOME:
        this.playerId = msg.id;
        this._resumeTicket = msg.token ? { id: msg.id, token: msg.token } : null; // memory only: a page reload goes to the menu
        if (this._resumeAttempted) events.emit('net:resumed', msg);
        events.emit('net:welcome', msg);
        break;
      case MSG.SNAPSHOT:
        events.emit('net:snapshot', msg);
        break;
      case MSG.PLAYER_JOIN:
        events.emit('net:playerJoin', msg);
        break;
      case MSG.PLAYER_LEAVE:
        events.emit('net:playerLeave', msg);
        break;
      case MSG.PING:
        this.send({ type: MSG.PONG });
        break;
      case MSG.LAT_PONG: { // round trip of our own probe; report it so the TAB scoreboard can show everyone's ping
        const ms = Math.round(performance.now() - msg.t);
        if (ms >= 0 && ms < 10000) { this.ping = ms; this.send({ type: MSG.LATENCY, ms }); }
        break;
      }
      case MSG.HUNTED_EVENT:
        events.emit('net:huntedEvent', msg);
        break;
      case MSG.LOBBY_STATE:
        events.emit('net:lobbyState', msg);
        break;
      case MSG.LOBBY_ERROR:
        events.emit('net:lobbyError', msg);
        break;
      case MSG.LOBBIES:
        events.emit('net:lobbies', msg);
        break;
      case MSG.LOBBY_CHAT:
        events.emit('net:lobbyChat', msg);
        break;
      case MSG.LOBBY_CLOSED:
        events.emit('net:lobbyClosed', msg);
        break;
      case MSG.COUNTDOWN:
        events.emit('net:countdown', msg);
        break;
      case MSG.LOAD_MAP:
        events.emit('net:loadMap', msg);
        break;
      case MSG.MAP_EVENT:
        events.emit('net:mapEvent', msg);
        break;
      case MSG.INTRO_VOTES:
        events.emit('net:introVotes', msg);
        break;
      case MSG.INTRO_SKIP:
        events.emit('net:introSkip', msg);
        break;
      case MSG.MATCH_BEGIN:
        events.emit('net:matchBegin', msg);
        break;
      case MSG.MATCH_STATE:
        events.emit('net:matchState', msg);
        break;
      case MSG.PICKUP_TAKEN:
        events.emit('net:pickupTaken', msg);
        break;
      case MSG.PICKUP_RESPAWN:
        events.emit('net:pickupRespawn', msg);
        break;
      case MSG.BULLET:
        events.emit('net:bullet', msg);
        break;
      case MSG.KNOCKBACK:
        events.emit('net:knockback', msg);
        break;
      case MSG.ROUND_EVENT:
        events.emit('net:roundEvent', msg);
        break;
      case MSG.GAME_OVER:
        events.emit('net:gameOver', msg);
        break;
      case MSG.ENEMY_EVENT:
        events.emit('net:enemyEvent', msg);
        break;
      case MSG.PLAYER_EVENT:
        events.emit('net:playerEvent', msg);
        break;
      case MSG.INTERACT_RESULT:
        events.emit('net:interactResult', msg);
        break;
      case MSG.POWERUP_EVENT:
        events.emit('net:powerupEvent', msg);
        break;
      case MSG.BLAZE_FX:
        events.emit('net:blazeFx', msg);
        break;
      case MSG.SLAP_FX:
        events.emit('net:slapFx', msg);
        break;
      case MSG.CHAT_SFX:
        events.emit('net:chatSfx', msg);
        break;
      case MSG.SECRET_SONG:
        events.emit('net:secretSong', msg);
        break;
      case MSG.RESYNC:
        events.emit('net:resync', msg);
        break;
      case MSG.RESUME_FAILED:
        this._resumeTicket = null;
        events.emit('net:resumeFailed', msg);
        break;
      case MSG.MATCH_ABORTED:
        events.emit('net:matchAborted', msg);
        break;
      case MSG.ACCOUNT_RESULT: events.emit('net:accountResult', msg); break;
      case MSG.ACCOUNT_PROFILE: events.emit('net:accountProfile', msg); break;
      case MSG.ACCOUNT_STATS: events.emit('net:accountStats', msg); break;
      case MSG.FRIENDS: events.emit('net:friends', msg); break;
      case MSG.FRIEND_UPDATE: events.emit('net:friendUpdate', msg); break;
      case MSG.FRIEND_RESULT: events.emit('net:friendResult', msg); break;
      case MSG.ACCOUNT_SETTINGS: events.emit('net:accountSettings', msg); break;
      case MSG.LEADERBOARD: events.emit('net:leaderboard', msg); break;
      case MSG.NOTIFY: events.emit('net:notify', msg); break;
      case MSG.FRIEND_SET: events.emit('net:friendSet', msg); break;
      default:
        events.emit('net:message', msg);
        break;
    }
  }

  send(data) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    }
  }

  createSolo(name, mapId, char, difficulty) { this.send({ type: MSG.CREATE_LOBBY, name, solo: true, mapId, char, difficulty }); }
  setDifficulty(difficulty) { this.send({ type: MSG.SET_DIFFICULTY, difficulty }); }
  setMode(mode) { this.send({ type: MSG.SET_MODE, mode }); }
  setTeam(team) { this.send({ type: MSG.SET_TEAM, team }); }
  soloPause(on) { this.send({ type: MSG.SOLO_PAUSE, on }); }
  createLobby(name) { this.send({ type: MSG.CREATE_LOBBY, name }); }
  joinLobby(name, code) { this.send({ type: MSG.JOIN_LOBBY, name, code }); }
  listLobbies() { this.send({ type: MSG.LIST_LOBBIES }); }
  setVisibility(pub) { this.send({ type: MSG.SET_VISIBILITY, public: pub === true }); }
  joinPublic(name, code) { this.send({ type: MSG.JOIN_PUBLIC, name, code }); }
  quickJoin(name) { this.send({ type: MSG.QUICK_JOIN, name }); }
  leaveLobby() { this.send({ type: MSG.LEAVE_LOBBY }); }
  setName(name) { this.send({ type: MSG.SET_NAME, name }); }
  setAchievements(ids) { this._helloAchievements = ids; this.send({ type: MSG.SET_ACHIEVEMENTS, achievements: ids }); }
  setBests(bests) { this._helloBests = bests; this.send({ type: MSG.SET_BESTS, bests }); }
  setStats(stats) { this._helloStats = stats; this.send({ type: MSG.SET_STATS, stats }); }
  setCharacter(char) { this.send({ type: MSG.SET_CHARACTER, char }); }
  setPerk(perk) { this._helloPerk = perk; this.send({ type: MSG.SET_PERK, perk }); }
  sendSelfRevive() { this.send({ type: MSG.SELF_REVIVE }); }
  setMap(mapId) { this.send({ type: MSG.SET_MAP, mapId }); }
  setReady(ready) { this.send({ type: MSG.SET_READY, ready }); }
  sendPlayerState(s) { this.send({ type: MSG.PLAYER_STATE, ...s }); }
  sendIntroVote() { this.send({ type: MSG.INTRO_SKIP }); }
  mapLoaded() { this.send({ type: MSG.MAP_LOADED }); }
  sendPickup(kind, index, replace) { this.send({ type: MSG.PICKUP, kind, index, ...(replace ? { replace: true } : {}) }); }
  sendShoot(s) { this.send({ type: MSG.SHOOT, ...s }); }
  sendWeapon(weapon) { this.send({ type: MSG.WEAPON, weapon }); }
  sendSlap(opts) { this.send({ type: MSG.SLAP, ...(opts?.heavy ? { heavy: true } : {}) }); }
  sendBlaze(dx, dz) { this.send({ type: MSG.BLAZE, dx, dz }); }
  sendDevSpawn(x, y, z, kind = 'beh') { this.send({ type: MSG.DEV_SPAWN_ENEMY, x, y, z, kind }); }
  accountSignUp(name, password, imported) { this.send({ type: MSG.ACCOUNT_SIGNUP, name, password, import: imported }); }
  accountSignIn(name, password) { this.send({ type: MSG.ACCOUNT_SIGNIN, name, password }); }
  accountSignOut(token) { this.send({ type: MSG.ACCOUNT_SIGNOUT, token }); }
  accountStats(name) { this.send({ type: MSG.ACCOUNT_STATS_GET, name }); }
  accountReport(matches) { this.send({ type: MSG.ACCOUNT_REPORT, matches }); }
  friendAdd(name) { this.send({ type: MSG.FRIEND_ADD, name }); }
  friendRemove(name) { this.send({ type: MSG.FRIEND_REMOVE, name }); }
  friendsSub(on) { this.send({ type: MSG.FRIENDS_SUB, on }); }
  friendJoin(name) { this.send({ type: MSG.FRIEND_JOIN, name }); }
  accountChangePassword(oldPw, newPw, token) { this.send({ type: MSG.ACCOUNT_CHANGE_PASSWORD, old: oldPw, new: newPw, token }); }
  accountChangeName(name, password) { this.send({ type: MSG.ACCOUNT_CHANGE_NAME, name, password }); }
  accountSettings(s) { this.send({ type: MSG.ACCOUNT_SETTINGS, ...s }); }
  friendInvite(name) { this.send({ type: MSG.FRIEND_INVITE, name }); }
  leaderboardGet(mapId, diff, scope) { this.send({ type: MSG.LEADERBOARD_GET, mapId, diff, scope }); }
  addBot(level) { this.send({ type: MSG.ADD_BOT, level }); }
  removeBot(id) { this.send({ type: MSG.REMOVE_BOT, id }); }
  swapPerk(perk) { this.send({ type: MSG.SWAP_PERK, perk }); }
  sendInteract(kind) { this.send({ type: MSG.INTERACT, kind }); }
  sendDevGod(on) { this.send({ type: MSG.DEV_GOD, on: !!on }); }
  sendRevive(targetId) { this.send({ type: MSG.REVIVE, targetId }); }
  sendPowerupPickup(id) { this.send({ type: MSG.POWERUP_PICKUP, id }); }
  sendSecret() { this.send({ type: MSG.SECRET }); }
  sendChat(text) { this.send({ type: MSG.CHAT, text }); }

  // Browser came back online: reconnect now instead of waiting out the backoff.
  retryNow() {
    if (this.connected || this.socket?.readyState === WebSocket.CONNECTING) return;
    clearTimeout(this._retryT);
    this._reconnectDelay = CLIENT_CONFIG.RECONNECT_DELAY_MS;
    this.connect(this._helloName);
  }

  _scheduleReconnect() {
    clearTimeout(this._retryT);
    this._retryT = setTimeout(() => this.connect(this._helloName), this._reconnectDelay);
    this._reconnectDelay = Math.min(this._reconnectDelay * 1.5, CLIENT_CONFIG.MAX_RECONNECT_DELAY_MS);
  }
}
