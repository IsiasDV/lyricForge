// Orchestrates a match from START GAME to gameplay:
//   countdown -> loading (waits for every player) -> black cut -> fade in -> playing
// Multiplayer is server-driven (net:countdown / loadMap / matchBegin / matchAborted);
// singleplayer runs the same steps locally. Also owns the pause menu and exit.
import { recentlyClosed, cancelRelock } from './overlay-guard.js';
import * as THREE from '../../vendor/three.module.min.js';
import { ModeState } from './mode-state.js';
import { ModeHud } from '../ui/mode-hud.js';
import { placeThirdPerson } from '../render/third-person-camera.js';
import { createCharacterAvatar, AVATAR_HEIGHT } from '../render/avatar.js';
import { MEH_SPEED_MULT, MEH_JUMP_MULT, resultText, teamOf, modeOf } from './game-modes.js';
import { events } from '../core/events.js';
import { CLIENT_CONFIG } from '../core/config.js';
import { loadAssets, playAudio } from '../core/assets.js';
import { getMap } from '../maps/maps.js';
import { effectiveBgm } from './stage-music.js';
import { stageBgm } from '../state/stage-bgm.js';
import { MatchScreens } from '../ui/match-screens.js';
import { PauseMenu } from '../ui/pause-menu.js';
import { FreeLook } from './free-look.js';
import { PlayerController } from './player-controller.js';
import { bgm } from '../ui/bgm.js';
import { DevConsole } from '../ui/console.js';
import { Scoreboard } from '../ui/scoreboard.js';
import { HealthBuffer } from './health-buffer.js';
import { CodeDetector, KEY_CODE, PAD_CODE } from './secret-code.js';
import { WeaponController } from './weapon-controller.js';
import { WEAPONS } from './weapons.js';
import { ProjectileSystem } from './projectiles.js';
import { PickupState } from './pickups.js';
import { BulletRenderer } from '../render/bullets.js';
import { GameChat } from '../ui/game-chat.js';
import { computeAway } from './away.js';
import { PlayerState } from './player-state.js';
import { Hud } from '../ui/hud.js';
import { account } from '../state/account.js';
import { profile } from '../state/profile.js';
import { Taunter, BEH_NAME } from './grandmaster-beh.js';
import { ArrivalFx } from '../ui/arrival-fx.js';
import { playArrivalSfx } from '../render/arrival-sfx.js';
import { settings, gameVolume, musicVolume, adsSensValue, FOV_VALUES, isReduceMotion } from '../state/settings.js';
import { blastPlayers, bombWarning, inBlast } from './explosion.js';
import { slideSfx } from '../render/slide-sfx.js';
import { shieldSfx } from '../render/shield-sfx.js';
import { HitDirection } from '../ui/hit-direction.js';
import { boomSfx } from '../render/boom-sfx.js';
import { ExplosionFx } from '../render/explosion-fx.js';
import { AxeReachFx } from '../render/axe-reach-fx.js';
import { FogControl, effectiveFog } from './fog-setting.js';
import { canAim, aimWant, adsStep, adsFov, adsSens, adsSensScale, adsMove, adsBob } from './ads.js';
import { SFX, sfxManifest } from './sfx.js';
import { PowerupDirector, POWERUPS, NUKE_POINTS, BEH_POINTS, AMMO_POWERUP_AMOUNT } from './powerups.js';
import { RunTracker, guardianAngel } from './achievement-rules.js';
import { recapTip } from './recap-tip.js';
import { PhotoMode } from '../ui/photo-mode.js';
import { photoAllowed } from './photo-mode.js';
import { listAchievements } from '../state/achievements.js';
import { shiftTimes } from './pause-shift.js';
import { Hints } from '../ui/hints.js';
import { TutorialDirector } from './tutorial.js';
import { TutorialCard } from '../ui/tutorial-card.js';
import { tutorialLabels } from '../ui/tutorial-labels.js';
import { savePrefs } from '../state/prefs.js';
import { actionLabel, isTouchMode } from '../ui/action-label.js';
import { PointsHud } from '../ui/points-hud.js';
import { scoreKill, pointsEntries, matchPlayerIds } from './scoring.js';
import { instaTouches } from './combat.js';
import { teleportPay, isBarrier } from './interactions.js';
import { nextBulletColor, colorName } from '../maps/props.js';
import { PerkSwap } from '../ui/perk-swap.js';
import { effectivePerk, isPerk, PERK_MACHINE_COST, priceFor, resolveSecret, lyricGiftRound, MEDIC_RUN_MULT, COLLECTOR_PICKUP_MULT, COLLECTOR_KILL_BONUS, SPEED_PERK_MULT, MEDIC_REVIVE_MS, SELF_REVIVE_PROTECT_S, SELF_REVIVES_PER_ROUND, REVIVE_BOOST_S, REVIVE_BOOST_MULT, PERKS } from './perks.js';
import { LYRIC_MS, LYRIC_KILL_POINTS, LYRIC_VIEW, lyricManifest } from './lyric.js';
import { BerserkState, BERSERK_SPEED, BERSERK_JUMP_MULT } from './berserk.js';
import { BlazeCharger, BlazeDash, blazeHits, clipDash, BLAZE_DIST, BLAZE_DASH_S, BLAZE_MIN_GAP_S } from './blaze.js';
import { BlazeFx } from '../render/blaze-fx.js';
import { downedTargets, onTrail } from './medic-trail.js';
import { stealChoice, canReturn, dehTrailPoints } from './deh.js';
import { DehAudio } from '../render/deh-audio.js';
import { assistStep } from './aim-assist.js';
import { bindings as B, keyLabel, padLabel } from '../input/bindings.js';
import { OutlineSet } from '../render/outline-set.js';
import { dropPillarSpawns } from '../maps/pillars.js';
import { MedicTrailFx } from '../render/medic-trail-fx.js';
import { Announcer, announcerManifest } from './announcer.js';
import { PowerupRenderer } from '../render/powerups.js';
import { PowerupHud } from '../ui/powerup-hud.js';
import { ReviveHud } from '../ui/revive-hud.js';
import { reviveTarget, reviveState, promptFor } from './revive-ui-model.js';
import { downAlertSfx } from './alert-sfx.js';
import { HeadBob } from './head-bob.js';
import { Haptics } from '../input/haptics.js';
import { Viewmodel } from '../render/viewmodel.js';
import { STARTING_WEAPON, weaponManifest } from './weapons.js';
import { RemotePlayers } from './remote-players.js';
import { randomCharacterId, randomStartSfx, pickSfx, characterManifest, voiceUrls } from './characters.js';
import { EnemySystem } from './enemies.js';
import { ENEMY_DEFS, DEFAULT_ENEMY, enemyManifest, pickEnemyKind } from './enemy-defs.js';
import { findSlapEnemies } from './combat.js';
import { AXE_SWINGS, AXE_SPEED_MULT, AXE_REPAIR_COST, AXE_MAX_HP, swingKind, hitAxe } from './axe.js';
import { EnemyRenderer } from '../render/enemies.js';
import { SpatialAudio } from '../render/spatial-audio.js';
import { CinematicCamera } from './cinematic.js';
import { MatchStats } from './match-stats.js';
import { GameOverScreen } from '../ui/game-over.js';
import { CHARACTERS } from './characters.js';
import { canLockPointer } from '../input/input.js';
import { ArcadeMode } from '../arcade/arcade-mode.js';
import { mapUnlocked } from '../maps/map-locks.js';
import { RoundSystem } from './rounds.js';
import { difficultyOf } from './difficulty.js';
import { buildSpawnPoints, pickSpawn, mapSpawnOptions } from './spawn-points.js';
import { MAP_DATA } from '../maps/map-data.js';
import { RoundBanner } from '../ui/round-banner.js';

const GAME_OVER_MS = 10000;

const ENEMY = ENEMY_DEFS[DEFAULT_ENEMY];
const DOWN_MS = 30000;
const REVIVE_MS = 5000;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const MIN_LOADING_MS = Math.max(5000, CLIENT_CONFIG.MIN_LOADING_MS); // hardcoded 5s floor
const SECRET_PAD_BUTTONS = [12, 13, 14, 15, 1, 0, 9, 8];
const SECRET_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
// Singleplayer pickup tuning (server mirrors these in CONFIG for multiplayer).
const PICKUPS = { gun: { respawnMs: 30000 }, ammo: { respawnMs: 30000, amount: 10 } };
const GUN_TOUCH_RADIUS = 1.1;
const nextFrame = () => new Promise((r) => requestAnimationFrame(r));

const VOICE_VOLUME = 1.0; // other players' voice lines (spatial)

export class GameSession {
  constructor({ network, lobby, renderer, camera, input, canvas, ui }) {
    this.ui = ui;
    this.network = network;
    this.lobby = lobby;
    this.renderer = renderer;
    this.camera = camera;
    this.canvas = canvas;
    this.input = input;
    this.controller = new PlayerController();
    this.remotes = null;
    this._sendAcc = 0;
    this.screens = new MatchScreens();
    this.look = new FreeLook(camera, input);
    this.pause = new PauseMenu({
      onResume: () => this._resume(),
      onExit: () => this.exit(),
      canPhoto: () => photoAllowed({ mode: this.lobby.mode, state: this.state, arcade: !!this.arcade, touch: !!this.input.touch?.active }),
      onPhoto: () => this._enterPhoto(),
      getLiveExtra: () => { const r = this._myRow(); return { kills: r?.kills ?? 0, downs: r?.downs ?? 0 }; },
      canPause: () => this.state === 'playing' && !this.console.isOpen && !this.chat.isOpen && !this.perkSwap?.isOpen && !this._overlayJustClosed()
    });
    this.photo = new PhotoMode({
      camera, look: this.look, input,
      bounds: () => this.level?.collision?.bounds ?? null,
      setClutter: (on) => this._photoClutter(on)
    });
    this.perkSwap = new PerkSwap({ onPick: (id) => this._pickPerk(id) });
    this.console = new DevConsole({
      canvas,
      input,
      canOpen: () => this.state === 'playing' && !this.pause.isOpen && !this.chat.isOpen,
      commands: this._commands()
    });
    this.chat = new GameChat({
      canvas, input, network,
      canOpen: () => this.state === 'playing' && this.remote && !this.pause.isOpen && !this.console.isOpen
    });
    this.chat.onChange = () => this._sendStateNow();
    this._lastAway = false;
    const awayEvent = () => this._sendStateNow();
    window.addEventListener('blur', awayEvent);
    window.addEventListener('focus', awayEvent);
    document.addEventListener('visibilitychange', awayEvent);

    this.state = 'idle'; // idle | countdown | loading | black | playing
    this.level = null;        // active level { scene, spawn, update, dispose }
    this.pendingLevel = null; // built during loading, activated on begin
    this._run = 0;            // token: bumping it cancels in-flight async steps
    this._home = camera.position.clone();

    events.on('lobby:start', (e) => this._onStart(e));
    events.on('net:countdown', (m) => this._onCountdownMsg(m));
    events.on('net:loadMap', (m) => this._onLoadMsg(m));
    events.on('net:matchBegin', () => this._onBeginMsg());
    events.on('net:matchState', (m) => this._onMatchState(m));
    events.on('net:enemyEvent', (m) => this._onEnemyEvent(m));
    events.on('net:playerEvent', (m) => this._onPlayerEvent(m));
    // Rejoin after a dropped connection (multiplayer, page still alive): the server holds us for 30 s.
    this.network.canResume = () => this.state === 'playing' && this.remote;
    events.on('net:disconnected', () => this._reconnecting());
    events.on('net:resync', (m) => this._onResync(m));
    events.on('net:resumeFailed', () => this._giveUpReconnect());
    events.on('net:roundEvent', (m) => this._onRoundEvent(m));
    events.on('net:huntedEvent', (m) => this._onHuntedEvent(m));
    events.on('net:gameOver', (m) => this._gameOver(m.players, m.round, m.timeline, m));
    events.on('net:matchAborted', (m) => this._abort(m.reason));
    events.on('lobby:back', () => this.teardown());
    events.on('bgm:preview', ({ on }) => { if (on) this.screens.pauseMatchBgm(); else this._syncClassic(); }); // STAGE BGM preview ducks the match music
    events.on('net:secretSong', () => this._onSecretSong());
    events.on('net:introVotes', (m) => this.screens.intro.setVotes(m.votes, m.total));
    events.on('net:introSkip', () => this.screens.intro.forceSkip());

    this.weaponCtl = new WeaponController();
    events.on('net:knockback', (m) => this._onKnockback(m));
    events.on('net:pickupTaken', (m) => this._onPickupTaken(m));
    events.on('net:pickupRespawn', (m) => this._spawnsOf(m.kind)?.[m.index]?.setActive(true));
    events.on('net:bullet', (m) => this._onBullet(m));
    this.bob = new HeadBob();
    this.haptics = new Haptics(() => input.gamepad);
    this._blur = { dx: 0, dy: 0, zoom: 0 };
    this._prevYaw = 0; this._prevPitch = 0; this._prevOnGround = true; this._prevVy = 0;
    this.pdirector = null;    // local PowerupDirector (singleplayer only; the server owns it in multiplayer)
    this.puRender = null;
    this.lyricView = null;
    this._lyricSnaps = [];
    this.buffs = new Set();   // active timed powerup kinds for the local player
    this.pointsHud = new PointsHud();
    this._puAskAt = 0;
    this.puHud = new PowerupHud();
    this.reviveHud = new ReviveHud(document.getElementById('powerup-banner')?.parentNode ?? document.body);
    this._downRevive = document.getElementById('down-revive');
    this.announcer = new Announcer((url) => this.assets?.audio?.[url] ?? null);
    events.on('net:powerupEvent', (m) => this._onPowerupEvent(m));
    events.on('net:interactResult', (m) => this._onInteractResult(m));
    events.on('net:mapEvent', (m) => this._applyMapEvent(m));
    events.on('net:slapFx', (m) => this._onSlapFx(m));
    events.on('net:blazeFx', (m) => { if (m.id !== this.network.playerId) this.blazeFx?.spawn(m, { x: m.dx, z: m.dz }, m.len, BLAZE_DASH_S); });
    this.berserk = new BerserkState();
    this.blaze = new BlazeCharger();
    this._blazeReady = false;
    this._blazeAt = 0;
    this._dashes = [];
    this._berserkShown = false;
    const hudRoot = document.getElementById('game-hud');
    const mk = (id) => { const el = document.createElement('div'); el.id = id; el.className = 'ui-hidden'; hudRoot?.appendChild(el); return el; };
    this._blazeEl = mk('blaze-charge');
    this._blazeFlameEl = mk('blaze-flames');
    this._berserkEl = mk('berserk-vignette');
    events.on('net:chatSfx', (m) => this._onChatSfx(m));
    events.on('settings:changed', (m) => { if (m?.key === 'volume' || m?.key === 'sfxVolume' || m?.key === 'musicVolume') this._applyVolume(); this._syncClassic(); });
    this.classicAudio = null;
    this._chatAudio = null;
    this.projectiles = new ProjectileSystem();
    this.bullets = null;
    this.audio3d = new SpatialAudio();
    this.enemies = null;      // local EnemySystem (singleplayer only; the server owns them in multiplayer)
    this.enemyView = null;
    this._enemyTargets = [];  // multiplayer: hit spheres from the last snapshot (cosmetic bullet stop)
    this._reviveHold = 0;
    this._reviveSendAt = 0;
    this.bulletColor = null;  // Ungaland color machine: null = default bullets
    this.axeColor = null;     // color machine on the held axe: null = no glow
    this._stolen = new Map(); // Deh enemy id -> { weapon, ammo, axeHp, axeColor } of MY weapons it is flying around with
    this.dehAudio = new DehAudio();
    this.dehFx = null;
    this._axeArmUntil = 0;    // buying the axe over a gun needs a second press
    this._tpT = 0;            // teleport animation timer (s); input frozen while > 0
    this.fogControl = new FogControl(); // scales map fog by the (achievement-locked) FOG setting
    this._ads = 0;            // aim-down-sights blend 0 (hip) .. 1 (sights); see game/ads.js
    this._aim = { on: false, prev: false }; // toggle state / previous button state for the aim input
    this._adsFov = false;     // true while this session has the camera FOV away from the setting
    this._tpDone = false;
    this._tpTo = null;
    this._interactAt = 0;
    this.gameOverUI = new GameOverScreen();
    this.rounds = null;       // local RoundSystem (singleplayer only)
    this.spawnPoints = [];
    this.roundBanner = new RoundBanner();
    this._leftEl = document.getElementById('hud-left');
    this.rounds = null;
    this.roundBanner.hide();
    this._leftEl.textContent = '';
    this.soloStats = new MatchStats();
    this._liveRows = [];
    this._matchActive = false;
    this.cine = null;
    this.spectating = false;
    this._specId = null;
    this._specEl = document.getElementById('spectate-label');
    this.downUntil = 0;
    this._downEl = document.getElementById('down-banner');
    this._downTime = document.getElementById('down-time');
    this._downSelf = document.getElementById('down-self');
    this._promptEl = document.getElementById('interact-prompt');
    this._tpEl = document.getElementById('teleport-fx');
    this.arrivalFx = new ArrivalFx(document.getElementById('arrival-fx'));
    this._reviveEl = document.getElementById('revive-bar');
    this._reviveFill = document.getElementById('revive-fill');
    this.pickups = { gun: new PickupState(0, PICKUPS.gun.respawnMs), ammo: new PickupState(0, PICKUPS.ammo.respawnMs) };
    this._timers = [];
    this._pickupAskAt = 0;
    this.playerState = new PlayerState();
    this.hud = new Hud();
    this.hitDir = new HitDirection(document.getElementById('game-hud'));
    this._bombs = [];
    this.viewmodel = new Viewmodel(camera);
    this.scoreboard = new Scoreboard();
    this.hp = new HealthBuffer();
    this.run = new RunTracker();
    this.modeState = new ModeState();   // multiplayer game mode view (Outlast teams / Hunted roles)
    this.modeHud = new ModeHud();
    this.matchGameMode = 'survival';
    this._huntRole = null;
    this._mehAvatar = null;
    this._reviveBoostUntil = 0;
    this._achT = 0;
    this._baseStats = { kills: 0, downs: 0 };
    this._vitals = {};
    this._sbAt = 0;
    this._leftN = 0;
    this._matchStartAt = 0;
    this.keyCode = new CodeDetector(KEY_CODE);
    this.padCode = new CodeDetector(PAD_CODE);
    this.secretUsed = false;
    this.secretAudio = null;
    this.arcade = null; // Behs Arcade controller (maps with mode: 'arcade')
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Tab' && this.state === 'playing') e.preventDefault(); // no focus jumping
    });

    // Singleplayer: leaving the tab / app pauses (the simulation really stops while paused).
    const autoPause = () => { if (this.state === 'playing' && this.lobby.mode !== 'multi' && !this.pause.isOpen) { if (document.pointerLockElement) document.exitPointerLock?.(); this.pause.open(); } };
    document.addEventListener('visibilitychange', () => { if (document.hidden) autoPause(); });
    window.addEventListener('blur', autoPause);
    window.addEventListener('pagehide', autoPause);

    document.addEventListener('pointerlockchange', () => {
      if (this.photo.isOpen && !document.pointerLockElement) { this.photo.exit(); return; } // Esc releases the lock: back to the pause menu
      if (this.state === 'playing' && canLockPointer() && !document.pointerLockElement && !this.console.isOpen && !this.chat.isOpen && !this._overlayJustClosed()) this.pause.open();
    });
  }

  // ---- TUTORIAL map: a scripted, sandboxed course (see game/tutorial.js) ----
  _startTutorial() {
    this._endTutorial();
    this.run?.taint(); // belt and braces: nothing unlocks from the tutorial
    const lv = this.level;
    const env = {
      spawn: (kind, x, z) => this.enemies?.spawn(x, lv.groundY ?? 0, z, 0, kind),
      clearEnemies: () => this.enemies?.killAll({ drops: false }),
      giveGun: () => { if (!this.playerState.hasGun) this._equipGun(); },
      addAmmo: (n) => this.playerState.addAmmo(n),
      grantPoints: (n) => this.soloStats.addPoints('local', n),
      openGate: (i) => lv.openCourseGate?.(i),
      openBarrier: () => this._applyMapEvent({ event: 'barrier', id: 'barrier' }),
      say: (t) => { if (t) this.chat.addLine('Lyric', t); },
      announce: (t, c) => this.puHud.announce(t, c),
      taskDone: () => this.puHud.announce('NICE!', 0x6ef7a0),
      stepDone: () => {},
      complete: () => { savePrefs({ tutorialDone: true }); this._unlock(profile.checkLifetime({ tutorialDone: true }));this.puHud.announce('TUTORIAL COMPLETE!', 0xffd27a); this.chat.addLine('Lyric', 'You graduated! Press ESC and choose EXIT when you are ready to pick a map.'); }
    };
    this.tutorial = new TutorialDirector(env);
    this.tutorialCard = new TutorialCard({ onSkip: () => this.tutorial?.skip(), onLeave: () => this.exit() });
    this.tutorialCard.show();
    this._tutKey = (e) => {
      if (e.code === 'KeyN' && !e.repeat && this.state === 'playing' && !this.pause.isOpen && !this.console.isOpen && !this.chat.isOpen) this.tutorial?.skip();
    };
    window.addEventListener('keydown', this._tutKey);
    this._tutShown = -1;
  }

  _updateTutorial(dt, pad) {
    const t = this.tutorial, c = this.controller;
    if (pad?.edge?.[2]) t.skip();
    t.update(dt, {
      x: c.x, y: c.y, z: c.z, running: c.running, sliding: c.sliding, crouching: c.crouching, onGround: c.onGround,
      ads: this._ads > 0.5, hasGun: this.playerState.hasGun, gunAmmo: this.playerState.ammo.gun ?? 0,
      present: this.enemies.list.filter((e) => e.state !== 'dying').length
    });
    this.level.setBeacon?.(t.beacon);
    if (t.version !== this._tutShown) {
      this._tutShown = t.version;
      const L = tutorialLabels();
      this.tutorialCard.render(t.view(L), `${L.skip}: SKIP STEP`, t.version);
    }
  }

  _endTutorial() {
    if (this._tutKey) { window.removeEventListener('keydown', this._tutKey); this._tutKey = null; }
    this.tutorialCard?.dispose(); this.tutorialCard = null;
    this.tutorial = null;
  }

  // The music this match uses on `map`: its own, or the track the player assigned in STAGE BGM (needs Headliner).
  _stageBgm(map) { return effectiveBgm(map, stageBgm.all(), profile.achievementIds); }

  _overlayJustClosed() {
    const now = performance.now();
    return recentlyClosed(now, this.console?.closedAt ?? 0) || recentlyClosed(now, this.chat?.closedAt ?? 0);
  }

  _commands() {
    const cmds = {
      fly: {
        desc: 'Toggle noclip flight along the camera direction (Space up, C down, Shift fast)',
        run: () => {
          this.controller.setFlying(!this.controller.flying);
          return `Fly: ${this.controller.flying ? 'ON' : 'OFF'}`;
        }
      },
      god: {
        desc: 'Toggle god mode (enemies cannot hurt you)',
        run: () => {
          this.god = !this.god;
          if (this.remote) this.network.sendDevGod(this.god);
          return `God: ${this.god ? 'ON' : 'OFF'}`;
        }
      },
      status: {
        desc: 'Toggle the top-left stats overlay (FPS, ping, position, players, status)',
        run: () => `Status: ${this.ui.toggleStats() ? 'ON' : 'OFF'}`
      },
      knock: {
        desc: 'Debug: knock yourself along your view direction (tests the slap slide)',
        run: () => {
          const m = WEAPONS.hand.melee;
          const yaw = this.look.yaw;
          this.controller.applyKnockback(-Math.sin(yaw), -Math.cos(yaw), m.knockback, m.hop);
          return 'Knocked.';
        }
      },
      enemy: {
        desc: 'Spawn a Beh enemy 6 m in front of you (on the floor)',
        run: () => {
          const c = this.controller, yaw = this.look.yaw;
          const x = c.x - Math.sin(yaw) * 6, z = c.z - Math.cos(yaw) * 6;
          const g = this.level?.collision?.groundAt(x, z, c.y + 2, 12);
          const y = g ? g.y : c.y;
          if (this.remote) this.network.sendDevSpawn(x, y, z);
          else this.enemies?.spawn(x, y, z, yaw);
          return 'Enemy spawned.';
        }
      },
      meh: {
        desc: 'Spawn a Meh (chaser) 10 m in front of you',
        run: () => {
          const c = this.controller, yaw = this.look.yaw;
          const x = c.x - Math.sin(yaw) * 10, z = c.z - Math.cos(yaw) * 10;
          const g = this.level?.collision?.groundAt(x, z, c.y + 2, 12);
          const y = g ? g.y : c.y;
          if (this.remote) this.network.sendDevSpawn(x, y, z, 'meh');
          else this.enemies?.spawn(x, y, z, yaw, 'meh');
          return 'Meh spawned.';
        }
      },
      behxploder: {
        desc: 'Spawn a Behxploder (explodes when killed) 12 m in front of you',
        run: () => {
          const c = this.controller, yaw = this.look.yaw;
          const x = c.x - Math.sin(yaw) * 12, z = c.z - Math.cos(yaw) * 12;
          const g = this.level?.collision?.groundAt(x, z, c.y + 2, 12);
          const y = g ? g.y : c.y;
          if (this.remote) this.network.sendDevSpawn(x, y, z, 'behxploder');
          else this.enemies?.spawn(x, y, z, yaw, 'behxploder');
          return 'Behxploder spawned.';
        }
      },
      deh: {
        desc: 'Spawn a Deh (weapon thief) 10 m in front of you',
        run: () => {
          const c = this.controller, yaw = this.look.yaw;
          const x = c.x - Math.sin(yaw) * 10, z = c.z - Math.cos(yaw) * 10;
          const g = this.level?.collision?.groundAt(x, z, c.y + 2, 12);
          const y = g ? g.y : c.y;
          if (this.remote) this.network.sendDevSpawn(x, y, z, 'deh');
          else this.enemies?.spawn(x, y, z, yaw, 'deh');
          return 'Deh spawned.';
        }
      },
      killenemies: {
        desc: 'Singleplayer: defeat all enemies',
        run: () => {
          if (this.remote) return 'Singleplayer only.';
          this.enemies?.killAll();
          return 'Done.';
        }
      },
      help: {
        desc: 'List all commands',
        run: () => Object.entries(cmds).map(([n, c]) => `${n} - ${c.desc}`).join('\n')
      }
    };
    return cmds;
  }

  // Scene to render, or null to use the lobby backdrop scene.
  get scene() {
    return this.level && (this.state === 'black' || this.state === 'playing' || this.state === 'over') ? this.level.scene : null;
  }

  // True when the server simulates the match: real multiplayer, or singleplayer played online (see _runRemoteSolo).
  get remote() { return this.lobby.mode === 'multi' || !!this._soloRemote; }

  // Singleplayer pause bookkeeping: when the menu closes, push every wall-clock deadline forward by the pause length.
  _trackPause() {
    const open = this.pause.isOpen;
    if (open === this._wasPaused) return;
    this._wasPaused = open;
    events.emit('touch:reset');
    if (this._soloRemote) this.network.soloPause(open); // the server freezes its simulation while we are paused
    if (open || this.lobby.mode === 'multi') return; // shifts the client-side deadlines (also for a server-hosted solo run)
    const ms = performance.now() - this.pause._openedAt;
    shiftTimes(this, ['_protectUntil', '_reviveBoostUntil', 'downUntil', '_blazeAt', '_selfSentAt'], ms);
    shiftTimes(this.berserk, ['until'], ms);
    shiftTimes(this.hp, ['graceUntil', 'lastHitAt'], ms);
  }

  update(dt) {
    const input = this.input;
    const pad = input.pollGamepad();

    if (this.lobby.active && this.state === 'idle') this.lobby.handlePad(pad.edge);

    const eggConsumed = this._updateSecret(pad);

    // Pause menu: Start opens it, then the pad drives it.
    if (this.pause.isOpen && !this.photo.isOpen) this.pause.handlePad(pad.edge);
    else if (this.state === 'playing' && pad.edge[9] && !eggConsumed[9]) this.pause.open();

    this._trackPause();
    if (this.photo.isOpen) { // Photo mode owns the frame: the world stands still (the pause is still open underneath)
      if (this.state !== 'playing' || !this.pause.isOpen) this.photo.exit();
      else { this.photo.update(dt, pad); input.endFrame(); return; }
    }
    if (this.arcade) { this.arcade.update(dt, pad); return; } // Behs Arcade owns the whole frame (camera, input, HUD)
    this.perkSwap.handlePad(pad.edge);
    if (this.perkSwap.isOpen && (this.pause.isOpen || this.state !== 'playing')) this.perkSwap.close();
    const active = this.state === 'playing' && !this.pause.isOpen && !this.console.isOpen && !this.chat.isOpen && !this.perkSwap.isOpen;
    this._updateScoreboard(active && B.down(input, 'scoreboard'));
    this._updateAchievements(dt, active);
    const eggArmed = this.padCode.progress >= 8; // B/A/Start/Select stage: don't jump/crouch
    this._updateAim(dt, pad, active);
    this.look.update(active, dt, active ? pad.look : null);

    if (active && this.myPerk === 'sonoflyric' && !this.spectating && !this.controller.down) this._aimAssist(dt);
    if (active && this.spectating) this._updateSpectate(pad);
    else if (active) {
      const c = this.controller;
      const berserkOn = this.berserk.active(performance.now());
      const trailOn = this._medicTrail(dt, c);
      const axis = (pos, neg) => (B.down(input, pos) ? 1 : 0) - (B.down(input, neg) ? 1 : 0);
      const inp = {
        moveX: axis('right', 'left') + pad.move.x,
        moveY: axis('forward', 'back') - pad.move.y, // stick up is negative
        yaw: this.look.yaw,
        pitch: this.look.pitch,
        jumpHeld: B.down(input, 'jump') || (B.padDown(pad, 'jump') && !eggArmed),
        crouchPressed: B.pressed(input, 'crouch') || (B.padPressed(pad, 'crouch') && !eggArmed),
        crouchHeld: B.down(input, 'crouch'),
        runHeld: B.down(input, 'run') && !(this._ads > 0.02), // aiming cancels sprint
        runTogglePressed: B.padPressed(pad, 'runToggle') && !(this._ads > 0.02),
        speedMult: (this.myPerk === 'speed' ? SPEED_PERK_MULT : 1) * (berserkOn ? BERSERK_SPEED : 1) * (trailOn ? MEDIC_RUN_MULT : 1) * (performance.now() < (this._reviveBoostUntil ?? 0) ? REVIVE_BOOST_MULT : 1) * (this.playerState.weaponId === 'axe' ? AXE_SPEED_MULT : 1),
        jumpMult: berserkOn ? BERSERK_JUMP_MULT : 1
      };
      if (this._tpT > 0) { inp.moveX = 0; inp.moveY = 0; inp.jumpHeld = false; }
      if (this._huntRole === 'meh') { // Hunted: a fast Meh that is always sprinting
        inp.speedMult *= MEH_SPEED_MULT; inp.jumpMult *= MEH_JUMP_MULT; inp.runHeld = true;
        if (this._mehDead()) { inp.moveX = 0; inp.moveY = 0; inp.jumpHeld = false; }
      }
      if (this._ads > 0.02) { c.runLatched = false; inp.speedMult *= adsMove(this._ads); }
      if (c.flying) c.flyUpdate(dt, inp);
      else c.update(dt, inp);
      this._updatePerkFx(dt, c);
      const kill = this.level?.killY;
      if (kill !== undefined && c.y < kill) {
        const s = this.level.spawn;
        c.reset({ x: s.x, y: s.y ?? c.groundY, z: s.z });
      }
      // Lava: instant death, nothing saves you. Offline solo decides here; online the server checks the same mesh.
      if (!this.remote && this.level?.lava && this.state === 'playing' && !c.flying && !c.down && !this.spectating && !this.god
          && this.level.lava.inLava(c.x, c.y, c.z)) this._lavaDeathSolo();
      this.camera.position.set(c.x, c.y + c.eye, c.z);
      this._updateHuntedView(c);
    }

    if (this.state === 'over') this._updateCinematic(dt);
    if (active && !this.controller.down && !this.spectating && this._huntRole !== 'meh') {
      this._updateWeaponSwitch(pad); this._updateWeapon(dt, pad);
      if (this.matchGameMode !== 'hunted') { this._updatePickups(); this._updatePowerups(); }
      else if (this.playerState.ammo.gun < 500) this.playerState.setGunAmmo(999); // the Hunted human never runs dry
    }
    this._updateRevive(dt, pad, active);
    if (!active || this.myPerk !== 'medic') this._runLoop(false);
    this._updateDeh(dt, active);
    this._updateInteract(dt, pad, active);
    if (this.scene) {
      const solo = !this.remote;
      const hits = this.projectiles.step(solo && this.pause.isOpen ? 0 : dt, this.level.collision, solo ? this.enemies?.targets() : this._enemyTargets);
      if (solo) {
        for (const h of hits) {
          if (h.kind !== 'enemy' || !this.enemies.kill(h.id)) continue;
          if (String(h.owner).startsWith('lyric:')) this.soloStats.addPoints('local', LYRIC_KILL_POINTS); // Lyric's kill: points for the picker
          else { this.soloStats.kill('local'); scoreKill(this.soloStats, 'local', 'gun', this.pdirector?.dbl > 0); }
        }
      }
      this.bullets?.sync(this.projectiles.list);
      if (solo && this.enemies && this.state === 'playing' && !this.pause.isOpen) { // paused: the singleplayer world stands still
        const c = this.controller;
        this._beh(this.taunter?.update(dt));
        if (this.tutorial) this._updateTutorial(dt, pad);
        if (this.rounds) {
          const live = this.enemies.liveCount;
          for (const r of this.rounds.update(dt, { playerCount: 1, liveEnemies: live })) {
            if (r.event === 'spawn') {
              const pt = pickSpawn(this.spawnPoints, Math.random, [{ x: c.x, z: c.z }, ...this.enemies.list.filter((e) => e.state !== 'dying')]);
              if (pt) this.enemies.spawn(pt.x, pt.y, pt.z, 0, pickEnemyKind(this.rounds.round, Math.random));
            } else if (r.event === 'roundStart') {
              this._beh(this.taunter?.onRound(r.round));
              if (this.myPerk === 'sonoflyric' && lyricGiftRound(r.round)) { // free Rise of Lyric orb
                this.pdirector?.gift('lyric', c, this.look.yaw);
                this._applySoloPowerups();
              }
            }
            if (r.event === 'roundStart') this.soloStats.mark(r.round);
            if (r.event !== 'spawn') this._onRoundEvent({ event: r.event === 'roundStart' ? 'start' : 'end', round: r.round, total: r.total, nextMs: r.nextMs });
          }
          this._setLeft(this.rounds.state(this.enemies.liveCount));
        }
        if (this.pdirector?.insta.has('local')) { // Insta-Beh: touching kills
          for (const tid of instaTouches(c, this.enemies.targets())) {
            if (this.enemies.kill(tid)) { this.soloStats.kill('local'); scoreKill(this.soloStats, 'local', 'insta', this.pdirector.dbl > 0); }
          }
        }
        this.enemies.wander = this.spawnPoints ?? [];
        for (const ev of this.enemies.update(dt, [{ id: 'local', x: c.x, y: c.y, z: c.z, down: performance.now() < this._protectUntil || this.hp.isGrace(performance.now()) }])) this._onEnemyEvent(ev);
        if (this.hp.update(performance.now()) === 'healed') this.playerState.setHealthFraction(1); // 5 s regeneration
        if (this.state !== 'playing') { input.endFrame(); return; } // game over -> back to the menu
        if (this.pdirector) {
          this.pdirector.update(dt, [{ id: 'local', x: c.x, y: c.y, z: c.z, down: false }], this.enemies.targets());
          this._applySoloPowerups();
        }
        const snap = this.enemies.snapshot();
        this._bombs = snap;
        this.enemyView?.apply(snap);
      }
      this.enemyView?.update(dt);
      this._updateVulture();
      this.puRender?.update(dt);
      if (this.lyricView) {
        this.lyricView.apply(this._lyricSnaps.map((l) => ({ ...l, id: `lyric-${l.id}`, state: 'idle' })));
        this.lyricView.update(dt);
      }
      this.puHud.update(dt);
      this._updatePoints();
      this.roundBanner.update(dt);
      this.modeHud.update(this.modeState);
      this.audio3d.updateListener(this.camera);
    }
    if (active && this.controller.down && !this.spectating && this.remote && this.myPerk === 'oneman' && this._selfUses < SELF_REVIVES_PER_ROUND
        && (B.pressed(this.input, 'revive') || B.padPressed(pad, 'revive')) && performance.now() - (this._selfSentAt ?? 0) > 400) {
      this._selfSentAt = performance.now(); // server confirms with a `self` revived event
      this.network.sendSelfRevive();
    }
    if (this._downEl && this.controller.down) {
      this._downTime.textContent = Math.max(0, Math.ceil((this.downUntil - performance.now()) / 1000));
    }

    if (this.state === 'playing') {
      const c = this.controller;
      const f = (n) => n.toFixed(1);
      this.ui?.updateStats({ pos: `${f(c.x)}, ${f(c.y)}, ${f(c.z)}${c.flying ? ' (FLY)' : ''}` });
    }

    this._applyFeel(dt, active);

    if (this.scene) {
      this.fogControl.beforeUpdate(this.scene);
      this.level.update(dt, this.camera);
      this.fogControl.afterUpdate(this.scene, this.fogLevel());
      this.viewmodel.update(dt);
      this._updateAxeReach(dt, active);
      this.remotes?.update(dt);
      this._sendState(dt);
    }
    input.endFrame();
  }

  // ---- photo mode (singleplayer) ----
  _enterPhoto() {
    if (!photoAllowed({ mode: this.lobby.mode, state: this.state, arcade: !!this.arcade, touch: !!this.input.touch?.active })) return;
    this.photo.enter();
    this.canvas?.requestPointerLock?.(); // inside the click / Enter that chose it, so the browser allows it
  }

  // Photo mode hides the first-person weapon and the nameplates / marks over other players.
  _photoClutter(on) {
    if (on) { this.viewmodel.visible = this._vmWas ?? this.viewmodel.visible; this._vmWas = undefined; }
    else { this._vmWas = this.viewmodel.visible; this.viewmodel.visible = false; }
    for (const e of this.remotes?.entries.values() ?? []) { const t = e.avatar?.userData?.tags; if (t) for (const k of ['plate', 'mark', 'revive']) if (t[k]) t[k].visible = on ? k === 'plate' : false; }
  }

  // ---- achievements ----
  _myRow() {
    const multi = this.remote;
    return (multi ? this._liveRows : this.soloStats.rows()).find((r) => r.id === (multi ? this.network.playerId : 'local'));
  }

  _unlock(ids) { for (const id of ids) profile.unlock(id); }

  // Per active frame: crouch tracking; once a second: kills / downs totals including this match.
  _updateAchievements(dt, active) {
    if (this.state !== 'playing') return;
    const c = this.controller;
    if (c.flying || this.god) this.run.taint(); // dev cheats never award achievements
    if (active && !this.spectating && !c.down) this.run.tickCrouch(dt, c.crouching || c.sliding);
    this._achT += dt;
    if (this._achT < 1) return;
    this._achT = 0;
    if (this.run.tainted) return;
    const r = this._myRow();
    if (r) this._unlock(profile.checkLifetime({ kills: r.kills, downs: r.downs }));
  }

  // Head/weapon bob, motion-blur strength and movement haptics for this frame.
  _applyFeel(dt, active) {
    const c = this.controller, cam = this.camera;
    const live = active && this.state === 'playing' && !this.spectating && !c.down && !c.flying;
    const hs = Math.hypot(c.vx, c.vz);
    const landSpeed = !this._prevOnGround && c.onGround && this._prevVy < -3 ? -this._prevVy : 0;
    let blur = { dx: 0, dy: 0, zoom: 0 };
    if (live) {
      const o = this.bob.update(dt, { speed: c.sliding ? 0 : hs, onGround: c.onGround, running: c.running, crouching: c.crouching || c.sliding, landSpeed });
      if (isReduceMotion()) { o.x = o.y = o.roll = o.vmX = o.vmY = 0; } // REDUCE MOTION: no head / weapon bob (haptics stay)
      const bk = adsBob(this._ads); o.x *= bk; o.y *= bk; o.roll *= bk; o.vmX *= bk; o.vmY *= bk; // calmer view while aiming
      const yaw = this.look.yaw;
      cam.position.y += o.y;
      cam.position.x += Math.cos(yaw) * o.x;
      cam.position.z -= Math.sin(yaw) * o.x;
      cam.rotation.z = o.roll;
      this.viewmodel.setBob(o.vmX, o.vmY);
      if (o.step && c.running) this.haptics.step();
      if (landSpeed > 5) this.haptics.land(landSpeed);
      if (this._prevOnGround && !c.onGround && c.vy > 3) this.haptics.jump();
      // Screen-space turn per frame (fraction of the screen) + zoom blur from speed / falling.
      const vfov = (cam.fov * Math.PI) / 180;
      const hfov = 2 * Math.atan(Math.tan(vfov / 2) * cam.aspect);
      const dYaw = this.look.yaw - this._prevYaw, dPitch = this.look.pitch - this._prevPitch;
      blur = {
        dx: (dYaw / (2 * Math.tan(hfov / 2))) * 0.8,
        dy: (dPitch / (2 * Math.tan(vfov / 2))) * 0.8,
        zoom: Math.min(0.05, Math.max(0, hs - 4.5) / 10 * 0.04 + Math.max(0, -c.vy - 10) / 30 * 0.03)
      };
    } else {
      this.bob.reset();
      this.viewmodel.setBob(0, 0);
      cam.rotation.z = 0;
    }
    this._blur = blur;
    this._prevYaw = this.look.yaw; this._prevPitch = this.look.pitch;
    this._prevOnGround = c.onGround; this._prevVy = c.vy;
  }

  // Motion-blur inputs for the renderer (null outside a match scene).
  blurParams() { return this.scene && !isReduceMotion() ? this._blur : null; }

  // Ground arc showing the reach of the next axe swing (only with the axe selected; setting 'AXE REACH RING').
  _updateAxeReach(dt, active) {
    const fx = this.axeReach;
    if (!fx) return;
    const c = this.controller;
    const show = settings.get('axeRing') === 'ON' && active && this.state === 'playing' && this.playerState.weaponId === 'axe'
      && !c.down && !c.flying && !this.spectating && this._tpT <= 0 && this._huntRole !== 'meh';
    const ctl = this.weaponCtl;
    const total = AXE_SWINGS[ctl.active?.heavy ? 'heavy' : 'light'].cooldown;
    fx.update(dt, { show, x: c.x, y: c.y, z: c.z, yaw: this.look.yaw, kind: swingKind(ctl.swings + 1), cooldownFrac: ctl.cooldown > 0 ? Math.min(1, ctl.cooldown / total) : 0, world: this.level?.collision ?? null });
  }

  _updateWeapon(dt, pad) {
    const w = WEAPONS[this.playerState.weaponId];
    if (w?.fire) { this._updateGun(dt, pad, w); return; }
    if (!w?.melee) return;
    const press = B.pressed(this.input, 'fire') || B.padPressed(pad, 'fire');
    const isAxe = w.id === 'axe';
    const melee = isAxe ? AXE_SWINGS[swingKind(this.weaponCtl.swings + 1)] : w.melee; // every 2nd axe swing is heavy
    const r = this.weaponCtl.update(dt, press, melee);
    if (r.started) {
      if (isAxe) this.viewmodel.swing(r.melee.heavy ? 'heavy' : 'light', r.melee);
      else this.viewmodel.playOnce(w.viewmodel.anims.attack, w.viewmodel.anims.idle);
      this._playAtCamera(SFX.slap);
      this.haptics.swing();
    }
    const swing = r.melee ?? w.melee;
    if (r.hit && this.remote) this.network.sendSlap({ heavy: !!swing.heavy });
    else if (r.hit && this.enemies) {
      const c = this.controller;
      const me = { x: c.x, y: c.y, z: c.z, yaw: this.look.yaw };
      for (const t of findSlapEnemies(me, this.enemies.targets(), swing)) if (this.enemies.kill(t.id)) { this.soloStats.kill('local'); scoreKill(this.soloStats, 'local', 'slap', this.pdirector?.dbl > 0); }
    }
  }

  // ---- enemies / bleedout ----
  _setLeft(st) {
    if (st.round && st.round !== this.playerState.round) this.playerState.setRound(st.round);
    this._leftN = st.phase === 'active' ? st.left ?? 0 : 0;
    this._leftEl.textContent = st.phase === 'active' && st.left > 0 ? `ENEMIES: ${st.left}` : '';
  }

  _onRoundEvent(m) {
    if (this.state !== 'playing') return;
    if (m.event === 'start') { this._unlock(this.run.onRound(m.round, { spent: this._myRow()?.spent ?? 0, perk: this.myPerk, mapId: this.map?.id, bests: profile.bests, difficulty: this.matchDifficulty, char: this.localChar })); this._selfUses = 0; this.berserk.newRound(); this._renderDownSelf(); this.playerState.setRound(m.round); this.roundBanner.showStart(m.round); if (this.myPerk === 'sonoflyric' && lyricGiftRound(m.round)) this.puHud.announce('A FREE RISE OF LYRIC - THE SON OF LYRIC', PERKS.sonoflyric.color); }
    else if (m.event === 'end') this.roundBanner.showEnd(m.nextMs);
  }

  // Fold this match into the lifetime profile exactly once (game over, or leaving early).
  _recordMatch(round) {
    if (!this._matchActive) return;
    this._matchActive = false;
    this._recapTip = null;
    if (this.map?.mode === 'tutorial') { this._beaten = null; return; } // sandboxed: no stats, bests, history or achievements
    if (this.matchGameMode !== 'survival') { this._beaten = null; return; } // Outlast / Hunted are unranked
    const multi = this.remote;
    const rows = multi ? this._liveRows : this.soloStats.rows();
    const me = rows.find((r) => r.id === (multi ? this.network.playerId : 'local'));
    const r = round ?? this.playerState.round ?? 0;
    const prevBest = this.map?.id ? profile.bests?.[this.map.id] ?? null : null, prevStats = { ...profile.stats };
    this._beaten = me ? profile.recordMatch(me, r, this.map?.id, this.matchDifficulty) : null;
    this._recapTip = me ? recapTip({ row: me, round: r, unit: this.map?.mode === 'arcade' ? 'wave' : 'round', prevBest: prevBest && { ...prevBest }, prevStats, stats: profile.stats, achievements: listAchievements().filter((a) => !profile.hasAchievement(a.id)) }) : null; // personal-best flags for the recap
    if (me && !multi) account.queueMatch({ row: { kills: me.kills, downs: me.downs, revives: me.revives, deaths: me.deaths, earned: me.earned ?? me.points }, round: r, mapId: this.map?.id, diff: this.matchDifficulty }); // the server runs the others itself
  }

  // ---- powerups ----
  // One handler for server `powerupEvent` messages and singleplayer director events.
  _onPowerupEvent(ev) {
    if (this.state !== 'playing' && this.state !== 'black') return;
    const multi = this.remote;
    const me = multi ? this.network.playerId : 'local';
    switch (ev.event) {
      case 'spin': this.level?.interactables?.find((i) => (i.kind === 'spin' || i.kind === 'lyricMachine') && Math.hypot(i.x - ev.x, i.z - ev.z) < 1)?.machine.spin(); break;
      case 'drop': this.puRender?.add(ev); break;
      case 'gone': this.puRender?.remove(ev.id); break;
      case 'picked': {
        const def = POWERUPS[ev.kind];
        if (!def) break;
        const who = ev.playerId === me ? 'You' : (ev.name ?? 'Someone');
        const text = `${who} got ${def.label}!`;
        this.puHud.announce(text, def.color);
        this.chat.addLine('POWERUP', text);
        if (def.buff && (def.team || ev.playerId === me)) { // team buffs apply to everyone
          this.buffs.add(ev.kind);
          this.puHud.setBuff(ev.kind, def.label, def.color, ev.durationMs / 1000);
        }
        if (ev.kind === 'lyric' || ev.kind === 'nuke') this.announcer.say(ev.kind); // everyone hears it
        if (ev.kind === 'ammo') this.playerState.giveAmmoBonus(AMMO_POWERUP_AMOUNT); // +50 for every gun holder
        if (ev.playerId === me) this.run.pickedPowerup();
        if (ev.kind === 'nuke') this.haptics.nuke();
        else if (ev.playerId === me) this.haptics.pickup();
        break;
      }
      case 'buffEnd':
        if (ev.playerId == null || ev.playerId === me) { this.buffs.delete(ev.kind); this.puHud.clearBuff(ev.kind); }
        break;
      case 'lyricJoin': {
        const def = POWERUPS.lyric;
        this._lyricSnaps = [...this._lyricSnaps.filter((l) => l.id !== ev.id), { id: ev.id, x: ev.x, y: ev.y, z: ev.z, yaw: 0 }];
        this.puHud.addLyric(ev.id, def.label, def.color, LYRIC_MS / 1000);
        break;
      }
      case 'lyricSlap': this.audio3d.playAt(SFX.slap, ev.x, ev.y + 1.2, ev.z); break;
      case 'lyricLeave':
        this._lyricSnaps = this._lyricSnaps.filter((l) => l.id !== ev.id);
        this.puHud.removeLyric(ev.id);
        break;
      default: break;
    }
  }

  // Singleplayer: apply director events (chat + Lyric bullets locally, the rest like server messages).
  _applySoloPowerups() {
    const f = WEAPONS.gun.fire;
    for (const ev of this.pdirector.drain()) {
      if (ev.event === 'chat') this.chat.addLine(ev.name, ev.text);
      else if (ev.event === 'lyricFire') {
        this.projectiles.spawn({ origin: ev.origin, dir: ev.dir, speed: f.speed, range: f.range, owner: `lyric:${ev.id}` });
        this.audio3d.playAt(SFX.gunshot, ev.origin[0], ev.origin[1], ev.origin[2]);
      } else if (ev.event === 'lyricSlap') {
        if (this.enemies.kill(ev.targetId)) this.soloStats.addPoints('local', LYRIC_KILL_POINTS);
        this._onPowerupEvent(ev);
      } else {
        this._onPowerupEvent(ev);
      }
    }
    this._lyricSnaps = this.pdirector.snapshots();
  }

  // Touching an orb: multiplayer asks the server, singleplayer resolves it locally.
  _updatePowerups() {
    const orbs = this.puRender?.orbs;
    if (!orbs?.size || this.controller.flying) return;
    const c = this.controller;
    for (const [id, o] of orbs) {
      const p = o.root.position;
      if (Math.hypot(c.x - p.x, c.z - p.z) > 1.4 || Math.abs(c.y - (o.baseY - 0.9)) > 2) continue;
      if (this.remote) {
        const now = performance.now();
        if (now - this._puAskAt < 400) return;
        this._puAskAt = now;
        this.network.sendPowerupPickup(id);
      } else if (this.pdirector) {
        const kind = this.pdirector.pickup('local', id, { x: c.x, y: c.y, z: c.z });
        if (kind === 'points') this.soloStats.addPointsAll(BEH_POINTS);
        if (kind === 'nuke') { // defeat everything, +100 points, jump to the next round
          this.soloStats.addPointsAll(NUKE_POINTS);
          this.enemies.killAll({ drops: false });
          for (const r of this.rounds?.skip() ?? []) this._onRoundEvent({ event: 'end', round: r.round, nextMs: r.nextMs });
        }
        this._applySoloPowerups();
      }
      return;
    }
  }

  _clearPowerups() {
    this.announcer?.stop();
    this.pdirector = null;
    this.puRender?.clear();
    this.puRender = null;
    this.lyricView?.clear();
    this.lyricView = null;
    this._lyricSnaps = [];
    this.buffs.clear();
    this.berserk.clear();
    this.medicFx?.clear();
    this.dehFx?.update(0, this.controller, []);
    this.dehAudio.clear();
    this._dehLoop(false);
    this._stolen.clear();
    this.outlines?.clear();
    this._runLoop(false);
    this.blazeFx?.clear();
    this.explosionFx?.clear();
    this._dashes = [];
    this._blazeEl?.classList.add('ui-hidden'); this._blazeFlameEl?.classList.add('ui-hidden'); this._berserkEl?.classList.add('ui-hidden');
    this.puHud.clear();
    this.reviveHud.clear();
    this.pointsHud.clear();
  }

  // ---- multiplayer game modes (Outlast teams / Hunted roles) ----
  _applyMode(m) {
    if (!m.hunted && !m.teamsLeft) return;
    const changed = this.modeState.apply(m, performance.now());
    if (this.modeState.hunted) {
      for (const id of changed) if (id !== this.network.playerId) this.remotes?.refresh(id);
      this._syncHuntedRole();
    }
  }

  // Hunted: switching between the human (first person, gun) and the Meh (third person, fast, no weapon).
  _syncHuntedRole() {
    const role = this.modeState.role;
    if (role === this._huntRole) return;
    this._huntRole = role;
    document.body.classList.toggle('gm-meh', role === 'meh');
    if (role === 'human') {
      this.playerState.giveWeapon('gun');
      this.playerState.setGunAmmo(999);
      this._showWeapon();
      this.viewmodel.visible = true;
      this.weaponCtl.reset();
    } else if (role === 'meh') {
      this.playerState.setWeapon('hand');
      this.viewmodel.visible = false;
      this.weaponCtl.reset();
    }
  }

  _mehDead() { return this._huntRole === 'meh' && this.modeState.meDown; }

  // The Meh is drawn for its own player too, from behind.
  _updateHuntedView(c) {
    if (this.matchGameMode !== 'hunted') return;
    const meh = this._huntRole === 'meh';
    if (meh && !this._mehAvatar && this.level?.scene) {
      const model = this.assets?.models?.[ENEMY_DEFS.meh.model];
      if (model) {
        this._mehAvatar = createCharacterAvatar(model, ENEMY_DEFS.meh.yawOffset, ENEMY_DEFS.meh.height / AVATAR_HEIGHT);
        this.level.scene.add(this._mehAvatar);
      }
    }
    const av = this._mehAvatar;
    if (av) {
      av.visible = meh && !this._mehDead();
      av.position.set(c.x, c.y, c.z);
      av.rotation.y = this.look.yaw;
    }
    if (meh && !this._mehDead()) placeThirdPerson(this.camera, c, this.level?.collision);
  }

  _onHuntedEvent(m) {
    if (this.state !== 'playing' || !this.modeState.hunted) return;
    const me = this.network.playerId, c = this.controller, now = performance.now();
    const teleport = () => {
      if (!Number.isFinite(m.x)) return;
      c.reset({ x: m.x, y: m.y, z: m.z });
      this.camera.position.set(c.x, c.y + c.eye, c.z);
      this._sendAcc = 1;
    };
    if (m.event === 'swap') {
      const prev = this.modeState.human;
      this.modeState.setHuman(m.human, now, m.protectMs ?? 0);
      for (const id of [prev, m.prev, m.human]) if (id != null && id !== me) this.remotes?.refresh(id);
      this._syncHuntedRole();
      if (m.human === me) { teleport(); this.modeHud.toast('YOU ARE THE HUMAN - RUN!', 2400, now); }
      else if (m.prev === me) this.modeHud.toast('CAUGHT! YOU ARE A MEH NOW', 2400, now);
    } else if (m.event === 'mehDown') {
      if (m.id === me) this.modeHud.toast('SHOT! RESPAWNING...', 2000, now);
    } else if ((m.event === 'mehRespawn' || m.event === 'relocate') && m.id === me) {
      teleport();
    }
  }

  // Outlast: only your own team can be revived (and only their downs raise the alarm). Everyone else counts as a mate.
  _isMate(id) {
    if (!modeOf(this.matchGameMode).usesTeams) return true;
    const team = (pid) => this.lobby.players.find((p) => p.id === pid)?.team;
    return team(id) === team(this.network.playerId);
  }

  _reviveCandidates() {
    const all = this.remotes.entries;
    if (!modeOf(this.matchGameMode).usesTeams) return all;
    return new Map([...all].filter(([id]) => this._isMate(id)));
  }

  _resetMode() {
    this._huntRole = null;
    document.body.classList.remove('gm-meh');
    if (this._mehAvatar) { this._mehAvatar.parent?.remove(this._mehAvatar); this._mehAvatar = null; }
    this.modeState.reset();
    this.modeHud.hide();
  }

  _onMatchState(m) {
    if (this.remote) this._lyricSnaps = m.npcs ?? (m.npc ? [{ id: 0, ...m.npc }] : []);
    if (m.stats) this._liveRows = m.stats;
    if (m.vitals) this._vitals = m.vitals;
    this._applyMode(m);
    this.remotes?.applyState(m);
    const mine = m.players?.find((p) => p.id === this.network.playerId);
    this._selfRevive = mine?.down ? { bl: mine.bl, rv: mine.rv ?? null } : null;
    if (mine?.down && mine.bl != null && this.controller.down) this.downUntil = performance.now() + mine.bl; // server clock wins
    if (m.round && this.state === 'playing' && this.matchGameMode !== 'hunted') this._setLeft(m.round);
    if (m.enemies) {
      this.enemyView?.apply(m.enemies);
      this._bombs = m.enemies;
      this._enemyTargets = m.enemies.filter((e) => e.state !== 'dying')
        .map((e) => { const d = ENEMY_DEFS[e.kind] ?? ENEMY; return { id: e.id, x: e.x, y: e.y + d.hitCenterY, z: e.z, r: d.hitRadius }; });
    }
  }

  // Sounds + visuals for enemy events (local in singleplayer, from the server in multiplayer).
  _onEnemyEvent(ev) {
    if (ev.event === 'die') this.tutorial?.notify({ type: 'die', kind: ev.kind, drop: ev.drop });
    if (ev.event === 'die' && ev.drop !== false) this.pdirector?.onEnemyDown(ev); // singleplayer drop roll
    if (ev.event === 'die' && ev.blast && !this.remote) this._blastSolo(ev);
    this._flashHit(ev);
    if (this.state !== 'playing' && this.state !== 'black') return;
    const def = ENEMY_DEFS[ev.kind] ?? ENEMY;
    if (ev.event === 'die' && ev.blast) this._explodeFx(ev, def);
    const sfx = def.sfx;
    const at = (url) => this.audio3d.playAt(url, ev.x, ev.y + 1.2, ev.z);
    if (def.kind === 'thief') { // Deh: steals the held weapon on touch, flies away with it
      if (ev.event === 'steal') { at(sfx.steal); if (!this.remote) this._dehStealLocal(ev); }
      else if (ev.event === 'die') {
        at(sfx.ow);
        this.enemyView?.kill(ev.id, !!ev.air);
        if (!this.remote && ev.air && ev.loot) this._dehReturnLocal(ev);
      } else if (ev.event === 'leave' && !this.remote && ev.loot) this._dehLost(ev.id, ev.loot.weapon);
      return;
    }
    if (def.kind === 'chaser') { // Meh: spawn / attack / die voice lines
      if (ev.event === 'spawn') at(sfx.spawn);
      else if (ev.event === 'die') { at(sfx.ow); if (ev.blast) at(sfx.boom); this.enemyView?.kill(ev.id); }
      else if (ev.event === 'attack') {
        at(sfx.attack);
        if (!this.remote && ev.targetId === 'local') this._enemyHitSolo('meh');
      }
      return;
    }
    if (ev.event === 'spawn' || ev.event === 'laugh') at(sfx.laugh);
    else if (ev.event === 'die') { at(sfx.ow); this.enemyView?.kill(ev.id); }
    else if (ev.event === 'dehd') {
      at(sfx.dehd);
      if (!this.remote && ev.targetId === 'local') this._enemyHitSolo('beh');
    }
  }

  // Singleplayer health buffer: Beh + Gun -> lose the gun; otherwise Hand 100% -> 50% -> down (game over).
  // kind: 'beh' | 'meh' (a Meh touch never takes the gun on the first hit).
  _enemyHitSolo(kind = 'beh') {
    if (this.tutorial) { this.tutorial.notify({ type: 'hit', kind }); return; } // the tutorial never hurts
    if (this.god) return;
    const now = performance.now();
    const res = this.hp.hit(now, { hasGun: this.playerState.hasGun, hasAxe: this.playerState.hasAxe, kind, prefer: this.playerState.weaponId, hasShield: this.playerState.shield });
    if (res === 'ignored') return;
    this._protectUntil = Math.max(this._protectUntil, this.hp.graceUntil);
    if (res === 'shieldHit') { this._breakShield(); return; }
    if (res === 'gunLost') this._loseGun();
    else if (res === 'axeHit') this._axeHit(hitAxe(this.playerState.axeHp).hp);
    else if (res === 'hurt') { this.playerState.setHealthFraction(0.5); this.haptics.hurt(); }
    else this._goDownSolo(now);
  }

  // Solo: health is gone. The Berserk / One Man Show save the player, otherwise game over.
  _goDownSolo(now) {
    if (this.myPerk === 'berserk' && this.berserk.tryStart(now)) { // The Berserk: instead of going down
      this.hp.forceHurt(now, this.berserk.until - now);
      this._protectUntil = this.berserk.until;
      this.playerState.setHealthFraction(0.5);
      this._onBerserkStart();
    } else if (this.myPerk === 'oneman' && this._selfUses < SELF_REVIVES_PER_ROUND) { // One Man Show: 3 per round
      this._selfUses++;
      this.playerState.setHealthFraction(1);
      this._protectUntil = now + SELF_REVIVE_PROTECT_S * 1000;
      this.haptics.revivePulse();
      this.puHud.announce(`ONE MAN SHOW! ${SELF_REVIVES_PER_ROUND - this._selfUses} LEFT`, PERKS.oneman.color);
    } else {
      this.playerState.setHealthFraction(0);
      this.soloStats.down('local');
      this.soloStats.setStatus('local', 'dead');
      this._gameOver(this.soloStats.rows(), this.rounds?.round ?? 1, this.soloStats.timeline);
    }
  }

  // A Behxploder blew up. Offline solo decides the damage here (the server does it in multiplayer): nearby enemies die,
  // the player goes down unless god mode or protection (Berserk, Blaze dash, revive grace) covers them.
  _blastSolo(ev) {
    if (this.remote || !this.enemies) return;
    const def = ENEMY_DEFS[ev.kind];
    const oy = ev.y + (def?.hitCenterY ?? 1);
    this.enemies.blast(ev.x, oy, ev.z, ev.blast, ev.id);
    const c = this.controller, now = performance.now();
    const hit = blastPlayers({ x: ev.x, y: oy, z: ev.z }, ev.blast, [{ id: 'local', x: c.x, y: c.y, z: c.z, god: this.god, protectedNow: now < this._protectUntil }]);
    if (hit.length) this._goDownSolo(now);
  }

  // The Behgernog took a hit (offline: local; online: from the server).
  _breakShield() {
    this.playerState.setShield(false);
    shieldSfx('break');
    this.haptics.hurt();
    this.puHud.announce('BEHGERNOG BROKE', 0x6dff9c);
  }

  _shieldInfo(near) {
    const key = actionLabel('interact', keyLabel(B.key('interact')));
    const price = this._price(near.cost);
    if (this.playerState.shield) return { text: 'BEHGERNOG - YOU ALREADY HAVE ONE', blocked: true };
    return { text: `[${key}] BUY BEHGERNOG (1-HP SHIELD) - ${price} PTS`, need: price };
  }

  // Red arc toward whatever hit me (enemy touch / steal, or a Behxploder blast that reaches me).
  _flashHit(ev) {
    if (this.state !== 'playing' || !this.hitDir) return;
    const mine = this.remote ? this.network.playerId : 'local';
    const c = this.controller;
    if ((ev.event === 'attack' || ev.event === 'dehd' || ev.event === 'steal') && ev.targetId === mine) this.hitDir.flash(ev);
    else if (ev.event === 'die' && ev.blast && !this.god && !c.down && performance.now() >= this._protectUntil
      && inBlast({ x: ev.x, y: ev.y + 1.7, z: ev.z }, ev.blast, { x: c.x, y: c.y + 1.2, z: c.z })) this.hitDir.flash(ev);
  }

  // Blast visuals / sound / shake, scaled by distance (every client plays these).
  _explodeFx(ev, def) {
    this.explosionFx?.spawn(ev.x, ev.y + (def?.hitCenterY ?? 1), ev.z, ev.blast);
    const c = this.controller;
    const d = Math.hypot(c.x - ev.x, c.y - ev.y, c.z - ev.z);
    const k = Math.max(0, 1 - d / (ev.blast * 3));
    if (k > 0) { this._shake = Math.max(this._shake ?? 0, 0.6 * k + 0.1); this.haptics.explode?.(k); }
    boomSfx(Math.max(0.15, k));
  }

  // Offline solo: the lava burns you on touch. No Berserk / One Man Show / grace: straight to game over.
  _lavaDeathSolo() {
    this.puHud.announce('YOU FELL INTO THE LAVA', 0xff4a1a);
    this.playerState.setHealthFraction(0);
    this.haptics.hurt();
    this.soloStats.down('local');
    this.soloStats.setStatus('local', 'dead');
    this._gameOver(this.soloStats.rows(), this.rounds?.round ?? 1, this.soloStats.timeline);
  }

  _onBerserkStart() {
    this.haptics.hurt();
    this.puHud.announce('BERSERK!', PERKS.berserk.color);
    this.puHud.setBuff('berserk', 'BERSERK', PERKS.berserk.color, (this.berserk.until - performance.now()) / 1000);
    this._syncBerserkFx();
  }

  // Berserk-dependent visuals (outlines through walls, red vignette); runs every frame, cheap when unchanged.
  _syncBerserkFx() {
    const on = this.berserk.active(performance.now());
    if (on === this._berserkShown) return;
    this._berserkShown = on;
    this._berserkEl.classList.toggle('ui-hidden', !on);
    this.enemyView?.setOutline(on || this.myPerk === 'vulture');
    if (!on) this.puHud.clearBuff('berserk');
  }

  // Per-frame perk effects: Berserk visuals, The Blaze charge / launch, and (singleplayer) dash kills.
  _updatePerkFx(dt, c) {
    this._syncBerserkFx();
    this.blazeFx?.update(dt);
    this.explosionFx?.update(dt);
    this._applyShake(dt);
    if (c.slides !== this._slides) { if (this._slides !== undefined && this.state === 'playing') { slideSfx(); this.haptics.slide?.(); } this._slides = c.slides; }
    const live = this.state === 'playing' && !c.down && !this.spectating;
    this.hitDir?.update(dt, c, this.look.yaw);
    if (!live) this.hitDir?.clear();
    this.hud?.setBombWarning(live ? bombWarning(c, this._bombs ?? []) : 0);
    if (this.myPerk === 'blaze') {
      const out = this.spectating || c.down || this._tpT > 0;
      if (this._blazeReady && !c.crouching) {
        const dir = out ? null : this.blaze.release(this.look.yaw);
        if (dir) this._launchBlaze(c, dir);
      }
      const r = this.blaze.update(dt, { crouching: c.crouching, stationary: Math.hypot(c.vx, c.vz) < 0.3, active: !out && c.onGround });
      this._blazeReady = r.ready;
      this._blazeEl.classList.toggle('ui-hidden', r.charge <= 0);
      this._blazeEl.classList.toggle('ready', r.ready);
      this._blazeEl.style.setProperty('--p', r.charge.toFixed(3));
    }
    if (this._dashes.length) { // singleplayer: the dash head kills enemies it passes through
      this._dashes = this._dashes.filter((d) => {
        for (const head of d.sweep(dt)) {
          for (const t of blazeHits(head, this.enemies?.targets() ?? [])) {
            if (this.enemies.kill(t.id)) { this.soloStats.kill('local'); scoreKill(this.soloStats, 'local', 'slap', this.pdirector?.dbl > 0); }
          }
        }
        return !d.done;
      });
    }
  }

  _launchBlaze(c, dir) {
    const now = performance.now();
    if (now - this._blazeAt < BLAZE_MIN_GAP_S * 1000) return;
    this._blazeAt = now;
    const from = { x: c.x, y: c.y, z: c.z };
    const len = clipDash(c.world, from, { x: dir.dx, z: dir.dz }, BLAZE_DIST);
    c.startDash(dir.dx, dir.dz, len / BLAZE_DASH_S, BLAZE_DASH_S);
    this.blazeFx?.spawn(from, { x: dir.dx, z: dir.dz }, len, BLAZE_DASH_S);
    this._blazeFlameEl.classList.remove('ui-hidden', 'go');
    void this._blazeFlameEl.offsetWidth;
    this._blazeFlameEl.classList.add('go');
    setTimeout(() => this._blazeFlameEl.classList.add('ui-hidden'), 900);
    this.haptics.swing();
    if (this.remote) this.network.sendBlaze(dir.dx, dir.dz);
    else {
      this._protectUntil = Math.max(this._protectUntil, now + BLAZE_DASH_S * 1000 + 300);
      this._dashes.push(new BlazeDash(from, { x: dir.dx, z: dir.dz }, len, BLAZE_DASH_S));
    }
  }

  // ---- The Deh: steals the held gun/axe, flies off with it; killing it in the air returns it ----
  // My weapon was stolen (server event, or locally in singleplayer): remember what I had, then lose it.
  _dehTake(enemyId, weapon) {
    const ps = this.playerState;
    this._stolen.set(enemyId, { weapon, ammo: ps.ammo.gun, axeHp: ps.axeHp, axeColor: this.axeColor });
    if (weapon === 'gun') this._loseGun(); else this._loseAxe();
    this.puHud.announce(`A DEH STOLE YOUR ${weapon === 'gun' ? 'GUN' : 'AXE'}! FOLLOW THE TRAIL!`, 0xff9a2a);
  }

  // The weapon came back (the Deh was killed in the air): same ammo / durability / glow as before.
  _dehGive(enemyId, weapon, hp = 0) {
    const rec = this._stolen.get(enemyId);
    this._stolen.delete(enemyId);
    if (weapon === 'gun') {
      this._equipGun();
      if (rec) this.playerState.setGunAmmo(rec.ammo);
    } else {
      this._equipAxe(true);
      this.playerState.setAxeHp(hp || rec?.axeHp || AXE_MAX_HP);
      if (rec?.axeColor) { this.axeColor = rec.axeColor; this._showWeapon(); }
    }
    this.puHud.announce(`YOU GOT YOUR ${weapon === 'gun' ? 'GUN' : 'AXE'} BACK!`, 0x6ef7a0);
  }

  // The Deh got away (or the weapon could no longer be handed back).
  _dehLost(enemyId, weapon) {
    this._stolen.delete(enemyId);
    this.puHud.announce(`THE DEH ESCAPED WITH YOUR ${weapon === 'axe' ? 'AXE' : 'GUN'}`, 0xff4a3a);
  }

  // Singleplayer: a Deh touched me.
  _dehStealLocal(ev) {
    const weapon = stealChoice(this.playerState.ws);
    if (!weapon || this.playerState.shield) { this.enemies.setLoot(ev.id, null); this._enemyHitSolo('meh'); return; } // a Behgernog takes the touch
    this._dehTake(ev.id, weapon);
    this.enemies.setLoot(ev.id, { victim: 'local', weapon });
  }

  _dehReturnLocal(ev) {
    const weapon = ev.loot.weapon;
    if (!canReturn(this.playerState.ws, weapon)) { this._dehLost(ev.id, weapon); return; }
    this._dehGive(ev.id, weapon);
  }

  // Per frame: the orange trail to every Deh carrying my weapon, its run-breathe loop while I follow it,
  // and the slither loops of nearby ground Dehs.
  _updateDeh(dt, active) {
    const c = this.controller;
    const ok = active && this.state === 'playing' && !c.down && !this.spectating;
    const targets = [];
    if (ok && this._stolen.size && this.enemyView) {
      for (const id of this._stolen.keys()) {
        const p = this.enemyView.positionOf(id);
        if (p) targets.push({ x: p.x, y: p.y + 0.35, z: p.z });
      }
      targets.sort((a, b) => Math.hypot(a.x - c.x, a.z - c.z) - Math.hypot(b.x - c.x, b.z - c.z));
    }
    this.dehFx?.update(dt, c, targets);
    this._dehLoop(targets.length > 0 && onTrail(c, { x: c.vx, z: c.vz }, targets[0]));
    this.dehAudio.update(this.enemyView?.entries ?? new Map(), this.audio3d, ENEMY_DEFS.deh.sfx.move, c.x, c.y, c.z, ok);
  }

  _dehLoop(on) {
    if (on === this._dehOn) return;
    this._dehOn = on;
    if (!this._dehAudio) {
      if (!on) return;
      this._dehAudio = new Audio(ENEMY_DEFS.deh.sfx.run);
      this._dehAudio.loop = true;
    }
    this._dehAudio.volume = Math.min(1, 0.7 * gameVolume());
    if (on) this._dehAudio.play().catch(() => {});
    else this._dehAudio.pause();
  }

  // The Medic: green trail from you to each downed teammate; running along it is faster and plays run.mp3.
  // Returns true while following (called from the active input branch only).
  _medicTrail(dt, c) {
    if (this.myPerk !== 'medic' || !this.remote || !this.remotes || c.down || this.spectating) {
      this.medicFx?.update(dt, c, []);
      this._runLoop(false);
      return false;
    }
    const downed = downedTargets(c, [...this.remotes.entries.values()].map((e) => e.target));
    this.medicFx?.update(dt, c, downed);
    const following = downed.length > 0 && onTrail(c, { x: c.vx, z: c.vz }, downed[0]);
    this._runLoop(following);
    return following;
  }

  // Looping run.mp3 while following the Medic trail.
  _runLoop(on) {
    if (on === this._runOn) return;
    this._runOn = on;
    if (!this._runAudio) {
      if (!on) return;
      this._runAudio = new Audio('assets/general/run.mp3');
      this._runAudio.loop = true;
    }
    this._runAudio.volume = Math.min(1, 0.6 * gameVolume());
    if (on) this._runAudio.play().catch(() => {});
    else this._runAudio.pause();
  }

  // The Collector holds two weapons (Hand / Gun / Axe): scroll wheel / 1 / 2 / Y switch between them.
  _updateWeaponSwitch(pad) {
    const ps = this.playerState;
    if (ps.slots.length < 2 || this.pause.isOpen) return;
    const input = this.input;
    let changed = false;
    if (input.wheel) changed = ps.cycleWeapon();
    else if (B.pressed(input, 'weapon1')) { const w = ps.ws.at(1); changed = !!w && ps.selectWeapon(w); }
    else if (B.pressed(input, 'weapon2')) { const w = ps.ws.at(2); changed = !!w && ps.selectWeapon(w); }
    else if (B.padPressed(pad, 'switch') && this._promptEl?.classList.contains('ui-hidden') !== false) changed = ps.cycleWeapon();
    if (!changed) return;
    this._showWeapon();
    this.weaponCtl.reset();
    if (this.remote) this.network.sendWeapon(ps.weaponId);
  }

  // Show the selected weapon's viewmodel (the axe keeps its colour glow).
  // Camera jitter after an explosion (decays quickly; applied after the camera is placed).
  _applyShake(dt) {
    if (!(this._shake > 0.001) || isReduceMotion()) { this._shake = 0; return; }
    const s = this._shake;
    this.camera.position.x += (Math.random() - 0.5) * 0.25 * s;
    this.camera.position.y += (Math.random() - 0.5) * 0.25 * s;
    this._shake = s * Math.exp(-5 * dt);
  }

  // The FOG setting actually in effect (locked players always get the map's own fog).
  fogLevel() { return effectiveFog(settings.get('fog'), profile.achievementIds); }

  // Aim down sights: blend, FOV, look speed, crosshair and viewmodel. Anything that makes aiming impossible
  // (pause, down, spectate, weapon change, game over...) fails the gate and snaps back to the hip.
  _updateAim(dt, pad, active) {
    const c = this.controller;
    const allowed = canAim({ active, playing: this.state === 'playing', down: c.down, spectating: this.spectating, flying: c.flying, teleporting: this._tpT > 0, weaponId: this.playerState.weaponId });
    const held = !!active && (B.down(this.input, 'aim') || B.padDown(pad, 'aim'));
    const want = aimWant(this._aim, held, allowed, settings.get('aimMode'));
    this._ads = allowed ? adsStep(this._ads, want, dt) : 0;
    const base = FOV_VALUES[settings.get('fov')];
    if (this._ads > 0 || this._adsFov) {
      const f = adsFov(base, this._ads);
      if (Math.abs(this.camera.fov - f) > 1e-4) { this.camera.fov = f; this.camera.updateProjectionMatrix(); }
      this._adsFov = this._ads > 0;
    }
    this.look.sensMult = adsSens(base, this._ads) * adsSensScale(this._ads, adsSensValue());
    this.viewmodel.setAds(this._ads);
    this.hud?.setAim?.(this._ads > 0.3);
  }

  _showWeapon() {
    const id = this.playerState.weaponId;
    this.viewmodel.setWeapon(id, this.assets);
    if (id === 'axe') this.viewmodel.setTint(this.axeColor);
  }

  // The Son of Lyric: constant, gentle aim assist toward enemies in view (wall-checked).
  _aimAssist(dt) {
    const c = this.controller;
    const targets = this.remote ? this._enemyTargets : this.enemies?.targets();
    if (!targets?.length) return;
    const eye = { x: c.x, y: c.y + c.eye, z: c.z };
    const d = assistStep(eye, this.look.yaw, this.look.pitch, targets, dt,
      (o, dir, dist) => { const h = c.world?.raycast(o.x, o.y, o.z, dir.x, dir.y, dir.z, dist); return h == null || h >= dist - 0.6; });
    if (d) this.look.setView(this.look.yaw + d.yaw, this.look.pitch + d.pitch);
  }

  // The Vulture: orange players, green machines, yellow gun spawns, blue ammo spawns (all through walls).
  _updateVulture() {
    const o = this.outlines;
    if (!o) return;
    const hunt = this.matchGameMode === 'hunted'; // Hunted: every Meh sees the human through walls (and nothing else)
    const on = (hunt ? this._huntRole === 'meh' : this.myPerk === 'vulture') && this.state === 'playing';
    o.setEnabled(on);
    if (on) {
      const live = new Set();
      for (const [id, e] of this.remotes?.entries ?? []) { if (hunt && id !== this.modeState.human) continue; const k = `p${id}`; live.add(k); o.add(k, e.avatar, 0xff8a2a); }
      o.prune(live, 'p');
      if (!hunt && !o.has('init')) { // static props: register once per match
        o.add('init', { traverse() {} }, 0xffffff);
        this.level?.interactables?.forEach((it, i) => it.machine?.group && o.add(`m${i}`, it.machine.group, 0x3cff7a));
        this.level?.gunSpawns?.forEach((s, i) => o.add(`g${i}`, s.mesh, 0xffe03a, () => s.active));
        this.level?.ammoSpawns?.forEach((s, i) => o.add(`a${i}`, s.mesh, 0x3a8cff, () => s.active));
      }
    }
    o.update();
  }

  // Axe durability changed (Beh hit): 0 = broken, back to the hand.
  _axeHit(hp) {
    this.haptics.hurt();
    if (hp <= 0) { this._loseAxe(); this.puHud.announce('YOUR AXE BROKE!', 0xff4a3a); return; }
    this.playerState.setAxeHp(hp);
    this.puHud.announce('YOUR AXE IS DAMAGED', 0xffd23a);
  }

  _equipAxe(quiet = false) {
    const repair = this.playerState.hasAxe;
    if (!repair && !this.remote && !quiet) this._beh(this.taunter?.onAxe(this.lobby.players.find((p) => p.id === 'local')?.name ?? 'Gladiator'));
    this.playerState.acquire('axe');
    this._showWeapon();
    if (quiet) return;
    if (!repair && !this.run.tainted) this._unlock(['a-fair-grip']); // first axe purchase unlocks the Grandmaster's Diary
    if (!repair) this.weaponCtl.reset();
    this.puHud.announce(repair ? 'AXE REPAIRED' : "GLADIATOR'S AXE", 0xff4a3a);
  }

  _loseAxe() {
    const was = this.playerState.weaponId === 'axe';
    this.axeColor = null;
    this.playerState.drop('axe');
    if (was) { this._showWeapon(); this.viewmodel.setTint(null); this.weaponCtl.reset(); }
  }

  _loseGun() {
    this.haptics.hurt();
    const was = this.playerState.weaponId === 'gun';
    this.playerState.drop('gun');
    if (was) { this._showWeapon(); this.weaponCtl.reset(); }
  }

  _onPlayerEvent({ event, id, on, self, left, ms, by, perk, char, hp, reason, weapon, enemyId }) {
    if (event === 'perk') { this._applyPerk(perk, id); return; }
    if (event === 'joined') { this._onPlayerJoined(id, char, perk); return; }
    if (event === 'axe' && id === this.network.playerId && this.state === 'playing') { if (this.playerState.hasAxe && hp < this.playerState.axeHp) this._axeHit(hp); else this._equipAxe(); return; }
    if (event === 'axeLost' && id === this.network.playerId && this.state === 'playing') { if (reason !== 'replaced' && reason !== 'stolen') { this._loseAxe(); if (reason === 'broken') this.puHud.announce('YOUR AXE BROKE!', 0xff4a3a); } return; }
    if (event === 'revived' && by != null && by === this.network.playerId && this.state === 'playing') { // I revived a teammate
      this._reviveBoostUntil = performance.now() + REVIVE_BOOST_S * 1000;
      this.puHud.announce('REVIVE BOOST!', 0x6ef7a0);
      this.run.revivedTeammate();
      if (!this.run.tainted) this._unlock(guardianAngel(this.run.revives));
    }
    if (event === 'berserk' && id !== this.network.playerId && this.state === 'playing') {
      this.puHud.announce(`${(this.lobby.players.find((p) => p.id === id)?.name ?? 'SOMEONE').toUpperCase()} WENT BERSERK!`, PERKS.berserk.color);
    }
    if (event === 'revived' || event === 'dead' || event === 'respawn') this.reviveHud.hideDown(id);
    if (this.state === 'playing' && id !== this.network.playerId && event === 'down') {
      this._remoteVoice(id, 'down');
      if (this.remote && !this.spectating && !this.controller.down && this._isMate(id)) {
        const t = this.remotes?.entries.get(id)?.target, c = this.controller;
        this.reviveHud.announceDown(this.lobby.players.find((p) => p.id === id)?.name, t ? Math.hypot(t.x - c.x, t.z - c.z) : NaN, this._holdLabel(), id);
        downAlertSfx();
      }
    }
    if (this.state !== 'playing' || id !== this.network.playerId) return;
    if (event === 'gunLost') this._loseGun();
    else if (event === 'stolen') this._dehTake(enemyId, weapon);
    else if (event === 'returned') this._dehGive(enemyId, weapon, hp);
    else if (event === 'dehGone') this._dehLost(enemyId, weapon);
    else if (event === 'hurt') { this.playerState.setHealthFraction(0.5); this.haptics.hurt(); }
    else if (event === 'shield') { this.playerState.setShield(!!on); if (on) { shieldSfx('buy'); this.puHud.announce('BEHGERNOG EQUIPPED', 0x6dff9c); } }
    else if (event === 'shieldHit') this._breakShield();
    else if (event === 'healed') this.playerState.setHealthFraction(1);
    else if (event === 'berserk') { this.berserk.tryStart(performance.now()); this.berserk.until = performance.now() + (ms ?? 10000); this.playerState.setHealthFraction(0.5); this._onBerserkStart(); }
    else if (event === 'down') { this.playerState.setHealthFraction(0); this._setDown(true); }
    else if (event === 'revived') { if (self) this._selfUses = SELF_REVIVES_PER_ROUND - (left ?? 0); this.playerState.setHealthFraction(1); this._setDown(false); }
    else if (event === 'dead') { if (reason === 'lava') this.puHud.announce('YOU FELL INTO THE LAVA', 0xff4a1a); this._beSpectator(); }
    else if (event === 'respawn') this._respawn();
  }

  // Someone joined a running match: learn their character (model + voice) and perk, then redraw their avatar.
  _onPlayerJoined(id, char, perk) {
    if (id === this.network.playerId || !this.characters) return;
    this.characters[id] = char;
    if (perk) this._perks = { ...(this._perks ?? {}), [id]: perk };
    this.remotes?.refresh(id);
    const urls = voiceUrls(char).filter((u) => !this.assets?.sounds?.[u]);
    if (urls.length && this.assets) { // their voice lines are decoded on first use: fetch them now
      loadAssets({ sounds: urls }).then((a) => { if (this.assets && a?.sounds) Object.assign(this.assets.sounds ??= {}, a.sounds); }).catch(() => {});
    }
  }

  // Dead in multiplayer: watch a living player until the game ends (respawn comes with rounds).
  _beSpectator() {
    this.spectating = true;
    this.reviveHud.hideDown();
    this.controller.down = true;
    this.viewmodel.visible = false;
    this._downEl?.classList.add('ui-hidden');
    this._specId = null;
  }

  // A new round started: dead players are back at the spawn with the Hand.
  _respawn() {
    if (!this.spectating || !this.level) return;
    const s = this.level.spawn, c = this.controller;
    this.spectating = false;
    c.reset({ x: s.x, y: s.y ?? c.groundY, z: s.z });
    this._specEl?.classList.add('ui-hidden');
    this.playerState.setWeapon('hand');
    this.playerState.setHealthFraction(1);
    this.viewmodel.setWeapon('hand', this.assets);
    this.viewmodel.visible = true;
    this.weaponCtl.reset();
    this.look.setView(s.yaw, 0);
    this.camera.position.set(c.x, c.y + c.eye, c.z);
    this._sendAcc = 1;
  }

  _updateSpectate(pad) {
    const entries = this.remotes ? [...this.remotes.entries] : [];
    const living = entries.filter(([, e]) => !e.target.down);
    const pool = living.length ? living : entries;
    if (!pool.length) return;
    const input = this.input;
    let i = pool.findIndex(([id]) => id === this._specId);
    const next = B.pressed(input, 'fire') || B.pressed(input, 'specNext') || B.padPressed(pad, 'specNext');
    const prev = B.pressed(input, 'specPrev') || B.padPressed(pad, 'specPrev');
    if (i < 0) i = 0;
    else if (next) i = (i + 1) % pool.length;
    else if (prev) i = (i - 1 + pool.length) % pool.length;
    const [id, e] = pool[i];
    this._specId = id;
    const p = e.avatar.position, yaw = e.avatar.rotation.y;
    this.camera.position.set(p.x + Math.sin(yaw) * 3, p.y + 2.6, p.z + Math.cos(yaw) * 3);
    this.camera.lookAt(p.x, p.y + 1.2, p.z);
    const name = this.lobby.players.find((pl) => pl.id === id)?.name ?? 'Player';
    this._specEl.textContent = `SPECTATING - ${name}`;
    this._specEl.classList.remove('ui-hidden');
  }

  // Game over: cinematic fly-around + leaderboard for 10 s, fade out, back to the menu.
  _gameOver(rows, round, timeline = [], msg = null) {
    if (this.state !== 'playing') return;
    const result = msg?.result ?? null;
    if (result?.mode === 'hunted') { // the table's points column becomes seconds as the human
      const secs = new Map(result.rows.map((r) => [r.id, Math.floor(r.ms / 1000)]));
      rows = rows.map((r) => ({ ...r, points: secs.get(r.id) ?? 0, earned: secs.get(r.id) ?? 0 }));
    }
    this._headline = resultText(result, (id) => this.lobby.players.find((p) => p.id === id)?.name ?? 'Player');
    this.state = 'over';
    this.announcer.say('dead');
    if (!this.remote) this._beh(this.taunter?.onGameOver());
    this._syncClassic();
    if (this.remote) this._liveRows = rows;
    this._recordMatch(round);
    const run = ++this._run;
    this.hud.hide();
    this.viewmodel.visible = false;
    this._downEl?.classList.add('ui-hidden');
    this._reviveEl?.classList.add('ui-hidden');
    this._promptEl?.classList.add('ui-hidden');
    this._tpT = 0;
    this._tpEl?.classList.add('ui-hidden');
    this.arrivalFx?.clear();
    this._specEl?.classList.add('ui-hidden');
    this.roundBanner.hide();
    this.reviveHud.clear();
    this._leftEl.textContent = '';
    this.spectating = false;
    this.pause.close();
    this.console.close();
    this.chat.stop();
    this.scoreboard.hide();
    if (document.pointerLockElement) document.exitPointerLock?.();
    const localId = this.remote ? this.network.playerId : 'local';
    this.gameOverUI.show(rows, round, localId, timeline, this._beaten, this.map?.mode === 'arcade' ? 'wave' : 'round', this._headline, this._recapTip ?? null);
    const col = this.level?.collision;
    const bounds = col?.bounds ?? { minX: -30, maxX: 30, minY: 0, maxY: 5, minZ: -30, maxZ: 30 };
    this.cine = this.arcade ? null : new CinematicCamera({ bounds, world: col ?? null }); // the arcade keeps its top-down view
    this.arcade?.stop();
    (async () => {
      await wait(GAME_OVER_MS);
      if (run !== this._run) return;
      await this.screens.fadeOut(1200);
      if (run !== this._run) return;
      this.returnToLobby();
    })();
  }

  _updateCinematic(dt) {
    if (!this.cine) return;
    const c = this.cine.update(dt);
    this.camera.position.set(...c.position);
    this.camera.lookAt(...c.target);
  }

  _renderDownSelf() {
    if (this._downSelf) this._downSelf.textContent = `${isTouchMode() ? `TAP ${actionLabel('revive')}` : `PRESS ${keyLabel(B.key('revive'))} / ${padLabel(B.padButton('revive'))}`} TO REVIVE YOURSELF (${Math.max(0, SELF_REVIVES_PER_ROUND - this._selfUses)} LEFT)`;
  }

  _setDown(on) {
    const c = this.controller;
    c.down = on;
    if (on) this.reviveHud.hideDown();
    if (on && !this.remote) this._beh(this.taunter?.onDown(this.lobby.players.find((p) => p.id === 'local')?.name ?? 'Gladiator'));
    if (on && this.lobby.mode === 'multi') this.hints?.show('revive', 'TEAMMATES CAN REVIVE YOU WHEN YOU ARE DOWN. HOLD REVIVE NEXT TO THEM TO DO THE SAME');
    if (on) { playAudio(this.assets, pickSfx(this.localChar, 'down')); this.haptics.hurt(); }
    else if (this.state === 'playing') this.haptics.revivePulse();
    if (on) { c.crouching = true; this.downUntil = performance.now() + DOWN_MS; } else c.crouching = false;
    if (on || this.state === 'playing') this.viewmodel.visible = !on;
    this._downEl?.classList.toggle('ui-hidden', !on);
    this._downSelf?.classList.toggle('ui-hidden', !(on && this.myPerk === 'oneman' && this._selfUses < SELF_REVIVES_PER_ROUND && this.remote));
    this._renderDownSelf();
    if (on) this._reviveHold = 0;
  }

  _holdLabel() { return isTouchMode() ? `HOLD ${actionLabel('revive')}` : `HOLD ${keyLabel(B.key('revive'))} / ${padLabel(B.padButton('revive'))}`; }
  _nameOf(id) { return (this.lobby.players.find((p) => p.id === id)?.name ?? '').toUpperCase(); }

  // Prompt + hold F / X near a downed teammate (5 s; server confirms). The first reviver locks the target.
  _updateRevive(dt, pad, active) {
    this.reviveHud.update(dt);
    const c = this.controller, me = this.network.playerId;
    const up = this.remote && this.remotes && this.state === 'playing' && !c.down && !this.spectating && this.matchGameMode !== 'hunted';
    const id = up ? reviveTarget(c, this._reviveCandidates()) : null;
    const t = id !== null ? this.remotes.entries.get(id).target : null;
    const st = t ? reviveState(t, me) : null;
    const locked = st?.kind === 'locked';
    this.reviveHud.setPrompt(active && t ? promptFor(st, this._nameOf(id), this._holdLabel(), st.by != null ? this._nameOf(st.by) : '') : null);
    const holding = active && t && !locked && (B.down(this.input, 'revive') || B.padDown(pad, 'revive'));
    // markers + the downed player's own "X IS REVIVING YOU" line
    const w = this.canvas?.clientWidth || window.innerWidth, h = this.canvas?.clientHeight || window.innerHeight;
    this.reviveHud.updateMarkers(this.remotes?.entries ?? new Map(), (pid, tg) => this._markerPos(tg, w, h), (pid) => this._nameOf(pid), me, c.down || this.spectating);
    this._renderDownRevive();
    if (!holding) {
      this._reviveHold = 0;
      this._reviveEl?.classList.add('ui-hidden');
      return;
    }
    const need = this.myPerk === 'medic' ? MEDIC_REVIVE_MS : REVIVE_MS;
    this._reviveHold += dt * 1000;
    this._reviveEl.classList.remove('ui-hidden');
    const lab = document.getElementById('revive-label'); if (lab) lab.textContent = `REVIVING ${this._nameOf(id)}`;
    this._reviveFill.style.width = `${Math.min(1, this._reviveHold / need) * 100}%`;
    const now = performance.now();
    if (now - this._reviveSendAt >= 100) { this._reviveSendAt = now; this.network.sendRevive(id); this.haptics.revivePulse(); }
  }

  _markerPos(t, w, h) {
    const c = this.controller;
    this._mv ??= new THREE.Vector3();
    this._mv.set(t.x, t.y + 2.2, t.z).project(this.camera);
    const behind = this._mv.z > 1;
    return { x: (this._mv.x * 0.5 + 0.5) * w, y: (-this._mv.y * 0.5 + 0.5) * h, w, h, behind, dist: Math.hypot(t.x - c.x, t.z - c.z) };
  }

  _renderDownRevive() {
    const el = this._downRevive, r = this._selfRevive?.rv;
    if (!el) return;
    const on = !!r && this.controller.down;
    el.classList.toggle('ui-hidden', !on);
    if (!on) return;
    document.getElementById('down-revive-name').textContent = this._nameOf(r[0]) || 'A TEAMMATE';
    document.getElementById('down-revive-fill').style.width = `${Math.round((r[1] ?? 0) * 100)}%`;
  }

  // Right-side points list from the live stats rows.
  _updatePoints() {
    if (this.state !== 'playing') return;
    const multi = this.remote;
    this.pointsHud.render(pointsEntries({
      rows: multi ? this._liveRows : this.soloStats.rows(),
      ids: multi ? matchPlayerIds(this.characters) : ['local'],
      meId: multi ? this.network.playerId : 'local',
      perks: this._perks, myPerk: this.myPerk
    }));
  }

  // Level props (Ungaland teleporter / bullet color machine): prompt when near, E / Y to use.
  _updateInteract(dt, pad, active) {
    if (this.matchGameMode === 'hunted') { this._promptEl?.classList.add('ui-hidden'); return; } // no machines in Hunted
    if (this._tpT > 0) {
      this._tpT -= dt;
      if (!this._tpDone && this._tpT <= 0.8) { // flash peak: swap position
        this._tpDone = true;
        const [x, y, z] = this._tpTo;
        this.controller.reset({ x, y, z });
        this._protectUntil = performance.now() + 1500; // brief grace in singleplayer
      }
      if (this._tpT <= 0) { this._tpT = 0; this._tpEl?.classList.add('ui-hidden'); this._tpEl?.classList.remove('run'); }
    }
    const list = this.level?.interactables;
    let near = null;
    if (active && list?.length && !this.spectating && !this.controller.down && !this.controller.flying && this._tpT <= 0) {
      const c = this.controller;
      let best = Infinity;
      for (const it of list) {
        if (it.gone?.()) continue;
        const d = Math.hypot(c.x - it.x, c.z - it.z);
        if (d <= it.radius && Math.abs(c.y - it.y) < 2.5 && d < best) { best = d; near = it; }
      }
    }
    let swapIdx = -1; // holding the axe next to a gun spawn: offer to swap
    if (!near && !this.playerState.hasGun && this.playerState.needsConfirm('gun') && active && !this.spectating && !this.controller.down && !this.controller.flying && this._tpT <= 0) swapIdx = this._nearGunSpawn();
    if (swapIdx >= 0) { this._swapForGun(swapIdx, pad); return; }
    if (!near) { this._promptEl?.classList.add('ui-hidden'); return; }
    this.hints?.show('interact', `${isTouchMode() ? 'TAP' : 'PRESS'} ${actionLabel('interact', keyLabel(B.key('interact')))} TO USE THINGS. BARRIERS, GUNS AND AMMO COST POINTS`);
    const info = near.kind === 'axe' ? this._axeInfo(near) : near.kind === 'behgernog' ? this._shieldInfo(near) : this._discount(near.describe?.());
    if (info && this._promptEl) {
      this._promptEl.textContent = info.text;
      this._promptEl.classList.toggle('poor', !info.blocked && this._myPoints() < (info.need ?? 0));
      this._promptEl.classList.remove('ui-hidden');
    } else if (this._promptEl) {
      const tp = near.kind === 'teleporter' ? teleportPay(this._myPoints(), this.playerState.hasGun, this._price(near.cost)) : null;
      this._promptEl.textContent = `[${actionLabel('interact', keyLabel(B.key('interact')))}] ${near.prompt} - ${tp === 'gun' ? 'YOUR GUN' : tp === 'free' ? 'FREE' : `${this._price(near.cost)} PTS`}`;
      this._promptEl.classList.toggle('poor', !tp && this._myPoints() < this._price(near.cost));
      this._promptEl.classList.remove('ui-hidden');
    }
    const pressed = B.pressed(this.input, 'interact') || B.padPressed(pad, 'interact');
    if (info?.blocked) { // a dead cosmetic prop answers the press (nothing is sent or charged)
      if (near.broken && pressed && performance.now() - this._interactAt > 400) { this._interactAt = performance.now(); this.puHud.announce(info.text, 0xff4a3a); }
      return;
    }
    if (!pressed) return;
    const now = performance.now();
    if (now - this._interactAt < 400) return;
    this._interactAt = now;
    if (near.kind === 'axe' && this.playerState.needsConfirm('axe') && now > this._axeArmUntil) { // confirm before replacing the gun
      this._axeArmUntil = now + 4000;
      this.puHud.announce('PRESS AGAIN TO REPLACE YOUR GUN', 0xffd23a);
      return;
    }
    if (near.kind === 'perkMachine') { // pay when you choose, not when you touch it
      const price = this._price(near.cost);
      if (this._myPoints() < price) { this.puHud.announce(`NOT ENOUGH POINTS (${price})`, 0xff4a3a); return; }
      this.perkSwap.open({ owned: profile.achievementIds, mode: this.remote && !this._soloRemote ? 'multi' : 'single', current: this.myPerk, price });
      return;
    }
    if (this.remote) { this._pendingUse = near; this.network.sendInteract(near.kind); } // server charges, then replies
    else if (info) {
      const need = info.need ?? 0;
      if (need > 0 && !this.soloStats.spendPoints('local', need)) { this.puHud.announce(`NOT ENOUGH POINTS (${need})`, 0xff4a3a); return; }
      this._useMachine(near, near.kind === 'tpB' && !this.level.state.linked ? 'linked' : undefined);
    } else if (near.kind === 'teleporter') {
      const pay = teleportPay(this._myPoints(), this.playerState.hasGun, this._price(near.cost));
      if (pay === 'points') this.soloStats.spendPoints('local', this._price(near.cost));
      else if (pay === 'gun') this._loseGun();
      this._useMachine(near);
    } else if (this.soloStats.spendPoints('local', this._price(near.cost))) this._useMachine(near);
    else this.puHud.announce(`NOT ENOUGH POINTS (${this._price(near.cost)})`, 0xff4a3a);
  }

  // A perk was chosen at the machine: the server charges (remote) or we do (local solo).
  _pickPerk(id) {
    if (!isPerk(id) || id === this.myPerk) return;
    if (this.remote) { this.network.swapPerk(id); return; }
    const price = this._price(PERK_MACHINE_COST);
    if (!this.soloStats.spendPoints('local', price)) { this.puHud.announce(`NOT ENOUGH POINTS (${price})`, 0xff4a3a); return; }
    this._applyPerk(id, 'local');
  }

  // Switch a player's perk for this match (self or, in multiplayer, someone else; the saved profile perk is untouched).
  _applyPerk(id, who) {
    if (!isPerk(id)) return;
    this._perks = { ...(this._perks ?? {}), [who]: id };
    if (who !== (this.remote ? this.network.playerId : 'local')) return;
    this.myPerk = id;
    this._applyCapacity();
    this.hud.setPerk(id);
    this.enemyView?.setOutline(id === 'vulture' || this.berserk.active(performance.now()));
    if (!this.remote) this.soloStats.setKillBonus('local', id === 'collector' ? COLLECTOR_KILL_BONUS : 0);
    this.blaze.reset(); this._blazeReady = false; this._blazeEl?.classList.add('ui-hidden');
    this._renderDownSelf?.();
    this.puHud.announce(`PERMA-PERK: ${PERKS[id].name.toUpperCase()}`, PERKS[id].color);
  }

  // The Collector holds two weapons, everyone else one (leaving the Collector drops the extra weapon).
  _applyCapacity() {
    const dropped = this.playerState.setCapacity(this.myPerk === 'collector' ? 2 : 1);
    if (!dropped.length) return;
    if (dropped.includes('axe')) this.axeColor = null;
    this._showWeapon();
    this.weaponCtl.reset();
  }

  _price(cost) { return priceFor(cost, this.myPerk); }

  // The Cheapskate pays half: rewrite a machine prompt's price and the amount to charge.
  _discount(info) {
    if (info?.text) info = { ...info, text: info.text.replace('[E]', `[${actionLabel('interact', keyLabel(B.key('interact')))}]`) };
    if (!info || !(info.need > 0) || this._price(info.need) === info.need) return info;
    const need = this._price(info.need);
    return { ...info, need, text: info.text.replace(/\d+ PTS/, `${need} PTS`) };
  }

  _myPoints() {
    const multi = this.remote;
    const me = multi ? this.network.playerId : 'local';
    return (multi ? this._liveRows : this.soloStats.rows()).find((r) => r.id === me)?.points ?? 0;
  }

  _axeInfo(near) {
    const key = actionLabel('interact', keyLabel(B.key('interact')));
    const price = this._price(near.cost), ps = this.playerState;
    const fix = this._price(AXE_REPAIR_COST);
    if (ps.hasAxe && ps.axeHp >= AXE_MAX_HP) return { text: "GLADIATOR'S AXE - FULLY INTACT", blocked: true };
    if (ps.hasAxe) return { text: `[${key}] REPAIR YOUR AXE - ${fix} PTS`, need: fix };
    if (ps.needsConfirm('axe')) return { text: this._axeArmUntil > performance.now() ? `[${key}] CONFIRM: REPLACE YOUR GUN WITH THE AXE - ${price} PTS` : `[${key}] GLADIATOR'S AXE (REPLACES YOUR GUN) - ${price} PTS`, need: price };
    return { text: `[${key}] BUY GLADIATOR'S AXE - ${price} PTS`, need: price };
  }

  // Index of the active gun spawn the player is standing at, or -1.
  _nearGunSpawn() {
    const c = this.controller, spawns = this._spawnsOf('gun');
    for (let i = 0; i < (spawns?.length ?? 0); i++) {
      const s = spawns[i];
      if (!s.active) continue;
      const gy = s.position.y + s.hover;
      if (Math.hypot(c.x - s.position.x, c.z - s.position.z) < GUN_TOUCH_RADIUS * 1.6 && c.y - 0.3 < gy + 0.4 && c.y + 1.8 > gy - 0.3) return i;
    }
    return -1;
  }

  _swapForGun(i, pad) {
    if (this._promptEl) {
      this._promptEl.textContent = `[${actionLabel('interact', keyLabel(B.key('interact')))}] REPLACE YOUR AXE WITH THE GUN`;
      this._promptEl.classList.remove('poor');
      this._promptEl.classList.remove('ui-hidden');
    }
    if (!(B.pressed(this.input, 'interact') || B.padPressed(pad, 'interact'))) return;
    const now = performance.now();
    if (now - this._interactAt < 400) return;
    this._interactAt = now;
    if (this.remote) this.network.sendPickup('gun', i, true);
    else if (this.pickups.gun.take(i)) {
      this._spawnsOf('gun')[i].setActive(false);
      this._timers.push(setTimeout(() => this._spawnsOf('gun')?.[i]?.setActive(true), PICKUPS.gun.respawnMs));
      this._equipGun();
    }
  }

  _onInteractResult({ kind, ok, reason, cost }) {
    const it = this._pendingUse;
    this._pendingUse = null;
    if (this.state !== 'playing') return;
    if (ok && it?.kind === kind) this._useMachine(it, reason);
    else if (!ok) {
      const msg = { points: `NOT ENOUGH POINTS (${cost})`, notLinked: 'LINK IT AT TELEPORTER B FIRST', already: kind === 'behgernog' ? 'YOU ALREADY HAVE A BEHGERNOG' : 'ALREADY UNLOCKED OR FULLY INTACT', perk: 'THAT PERK IS NOT AVAILABLE' }[reason];
      this.puHud.announce(msg ?? 'CANNOT USE THAT RIGHT NOW', 0xff4a3a);
    }
  }

  // Hunted plays on an open arena: barriers open, no gun / ammo spawns, no machines or teleporters.
  _openArena(level) {
    for (const id of Object.keys(level.state?.barriers ?? {})) level.setBarrierOpen?.(true, id, true);
    for (const s of [...(level.gunSpawns ?? []), ...(level.ammoSpawns ?? [])]) s.setActive(false);
    for (const it of level.interactables ?? []) if (it.machine?.group) it.machine.group.visible = false;
    for (const p of level.state?.pads ?? []) if (p.group) p.group.visible = false;
  }

  // Shared map state (barrier unlocked / teleporters linked); idempotent, from the server or solo play.
  _applyMapEvent({ event, id = 'barrier' }) {
    const lv = this.level;
    if (!lv?.state) return;
    if (event === 'barrier' && !lv.state.barriers?.[id]) {
      lv.setBarrierOpen(true, id);
      if (!this.remote && this._spawnStages) this.spawnPoints = this._spawnStages[Math.min(Object.values(lv.state.barriers).filter(Boolean).length, this._spawnStages.length - 1)];
      else if (!this.remote && this._spawnsOpen?.length) this.spawnPoints = this._spawnsOpen;
      if (this.matchGameMode !== 'hunted') this.puHud.announce('BARRIER UNLOCKED', 0xffb070);
    } else if (event === 'linked' && !lv.state.linked) {
      lv.setLinked(true);
      this.puHud.announce('TELEPORTERS LINKED', 0x6fd2ff);
    }
  }

  _useMachine(near, reason) {
    this.tutorial?.notify({ type: 'use', kind: near.kind });
    if (near.kind === 'axe') { this._equipAxe(); return; }
    if (near.kind === 'behgernog') { if (!this.remote) { this.playerState.setShield(true); shieldSfx('buy'); this.puHud.announce('BEHGERNOG EQUIPPED', 0x6dff9c); } return; }
    if (near.kind === 'spin' || near.kind === 'lyricMachine') {
      if (!this.remote) {
        const c = this.controller;
        this.pdirector?.spin({ x: near.x, y: near.y, z: near.z }, { x: c.x, z: c.z }, near.kind === 'lyricMachine' ? 'lyric' : null);
        this._applySoloPowerups();
      }
    } else if (isBarrier(near.kind)) {
      this._applyMapEvent({ event: 'barrier', id: near.kind });
    } else if ((near.kind === 'tpA' || near.kind === 'tpB') && reason === 'linked') {
      this._applyMapEvent({ event: 'linked' });
    } else if (near.kind === 'teleporter' || near.kind === 'tpA' || near.kind === 'tpB') {
      this._tpT = 1.6; this._tpDone = false; this._tpTo = near.to;
      const el = this._tpEl;
      if (el && !isReduceMotion()) { el.classList.remove('ui-hidden', 'run'); void el.offsetWidth; el.classList.add('run'); }
      this.haptics.revivePulse();
    } else if (near.kind === 'colorMachine') {
      if (this.playerState.weaponId === 'axe') { // holding the axe: it radiates a random color instead of the bullets
        this.axeColor = nextBulletColor(this.axeColor ?? this.bulletColor ?? 0x000000);
        near.machine.setColor(this.axeColor);
        this.viewmodel.setTint(this.axeColor);
        this.puHud.announce(`AXE COLOR ${colorName(this.axeColor)}`, this.axeColor);
      } else {
        this.bulletColor = nextBulletColor(this.bulletColor);
        near.machine.setColor(this.bulletColor);
        this.puHud.announce(`BULLET COLOR ${colorName(this.bulletColor)}`, this.bulletColor);
      }
    }
  }

  _updateGun(dt, pad, w) {
    const auto = this.buffs.has('automation') || this.berserk.active(performance.now()); // full-auto + unlimited ammo (also while Berserk)
    const trigger = B.pressed(this.input, 'fire') || B.padPressed(pad, 'fire')
      || (auto && (B.down(this.input, 'fire') || B.padDown(pad, 'fire')));
    const press = trigger && (auto || this.playerState.ammo[w.id] > 0);
    const r = this.weaponCtl.update(dt, press, { cooldown: w.fire.cooldown, hitDelay: 0 });
    if (!r.started || (!auto && !this.playerState.useAmmo())) return;
    const yaw = this.look.yaw, pitch = this.look.pitch, cp = Math.cos(pitch);
    const dir = [-Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp];
    const p = this.camera.position;
    const k = 1 - this._ads; // aimed shots leave from the crosshair line instead of the hip muzzle
    const origin = [
      p.x + dir[0] * 0.6 + Math.cos(yaw) * 0.15 * k,
      p.y + dir[1] * 0.6 - 0.12 * k,
      p.z + dir[2] * 0.6 - Math.sin(yaw) * 0.15 * k
    ];
    this.projectiles.spawn({ origin, dir, speed: w.fire.speed, range: w.fire.range, color: this.bulletColor });
    this._playAtCamera(SFX.gunshot);
    this.haptics.shot();
    if (this.remote) {
      this.network.sendShoot({ ox: origin[0], oy: origin[1], oz: origin[2], dx: dir[0], dy: dir[1], dz: dir[2], color: this.bulletColor ?? undefined });
    }
  }

  _onBullet(m) {
    if (this.state !== 'playing' || m.id === this.network.playerId) return;
    const w = WEAPONS.gun.fire;
    this.projectiles.spawn({ origin: [m.ox, m.oy, m.oz], dir: [m.dx, m.dy, m.dz], speed: w.speed, range: w.range, color: Number.isInteger(m.color) ? m.color : null });
    this.audio3d.playAt(SFX.gunshot, m.ox, m.oy, m.oz);
  }

  _playAtCamera(url, volume = 1) {
    const p = this.camera.position;
    this.audio3d.playAt(url, p.x, p.y, p.z, volume);
  }

  // Another player swung the Hand (server cue): play it where they are.
  _onSlapFx({ id, axe }) {
    if (this.state !== 'playing' || id === this.network.playerId) return;
    if (!axe) this.remotes?.punch(id);
    const av = this.remotes?.entries.get(id)?.avatar;
    if (av) this.audio3d.playAt(SFX.slap, av.position.x, av.position.y + 1.2, av.position.z);
  }

  // A chat phrase triggered a sound for everyone in the match.
  _onChatSfx({ sound }) {
    if (this.state === 'idle' || sound !== 'getMoving') return;
    this._chatAudio ||= new Audio(SFX.getMoving);
    this._chatAudio.currentTime = 0;
    this._chatAudio.volume = gameVolume();
    this._chatAudio.play().catch(() => { /* autoplay blocked; ignore */ });
  }

  _beh(text) { if (text) this.chat.addLine(BEH_NAME, text); }

  // Re-apply the in-game volume to music/voice elements that are already playing.
  _applyVolume() {
    const v = gameVolume();
    if (this.classicAudio) this.classicAudio.volume = 0.6 * musicVolume();
    if (this.secretAudio) this.secretAudio.volume = v;
    this.screens.applyVolume();
    this.announcer.applyVolume();
  }

  // CLASSIC mode: loop Epicness during a match; only the secret track silences it.
  _syncClassic() {
    if (this.state === 'playing') { // CLASSIC replaces the looping map BGM; it returns when CLASSIC is off
      if (settings.get('classic') === 'YES') this.screens.pauseMatchBgm(); else this.screens.resumeMatchBgm();
    }
    const want = settings.get('classic') === 'YES' && this.state === 'playing';
    if (!want) {
      if (this.classicAudio) { this.classicAudio.pause(); this.classicAudio = null; }
      return;
    }
    if (!this.classicAudio) {
      this.classicAudio = new Audio(SFX.classic);
      this.classicAudio.loop = true;
      this.classicAudio.volume = 0.6 * musicVolume();
    }
    const secretPlaying = this.secretAudio && !this.secretAudio.paused && !this.secretAudio.ended;
    if (secretPlaying) this.classicAudio.pause();
    else if (this.classicAudio.paused) this.classicAudio.play().catch(() => { /* autoplay blocked; ignore */ });
  }

  _spawnsOf(kind) { return kind === 'gun' ? this.level?.gunSpawns : this.level?.ammoSpawns; }

  // Touching an active pickup: guns need an empty hand slot, ammo needs the gun.
  _updatePickups() {
    const c = this.controller;
    if (c.flying) return;
    const has = this.playerState.hasGun;
    if (!has && this.playerState.needsConfirm('gun')) return; // replacing the held axe only offers a swap (see _updateInteract)
    for (const kind of has ? ['ammo'] : ['gun']) {
      const spawns = this._spawnsOf(kind);
      if (!spawns?.length) continue;
      for (let i = 0; i < spawns.length; i++) {
        const s = spawns[i];
        if (!s.active) continue;
        const gy = s.position.y + s.hover;
        const near = Math.hypot(c.x - s.position.x, c.z - s.position.z) < GUN_TOUCH_RADIUS * (this.myPerk === 'collector' ? COLLECTOR_PICKUP_MULT : 1)
          && c.y - 0.3 < gy + 0.4 && c.y + 1.8 > gy - 0.3;
        if (near) { this._touchSpawn(kind, i); return; }
      }
    }
  }

  _touchSpawn(kind, i) {
    if (this.remote) {
      const now = performance.now();
      if (now - this._pickupAskAt < 400) return; // server decides; don't spam
      this._pickupAskAt = now;
      this.network.sendPickup(kind, i);
    } else if (this.pickups[kind].take(i)) {
      this._spawnsOf(kind)[i].setActive(false);
      this._timers.push(setTimeout(() => this._spawnsOf(kind)?.[i]?.setActive(true), PICKUPS[kind].respawnMs));
      this._applyPickup(kind);
    }
  }

  // Another player's voice line, played from their character (HRTF pan + distance falloff).
  _remoteVoice(id, kind, at = null) {
    if (!this.remote || id === this.network.playerId) return;
    const url = pickSfx(this.characters?.[id], kind);
    if (!url) return;
    const now = performance.now();
    this._voiceAt ||= new Map();
    const key = `${id}:${kind}`;
    if (now - (this._voiceAt.get(key) ?? -1e9) < 600) return;
    this._voiceAt.set(key, now);
    const p = at ?? this.remotes?.entries.get(id)?.avatar.position ?? this.level?.spawn;
    if (!p) return;
    this.audio3d.playAt(url, p.x, (p.y ?? 0) + 1.5, p.z, VOICE_VOLUME);
  }

  _reconnecting() {
    if (!this.network.canResume?.() || this._reconnectEl) return;
    const el = document.createElement('div');
    el.id = 'reconnect-overlay';
    el.textContent = 'RECONNECTING...';
    document.body.appendChild(el);
    this._reconnectEl = el;
    this._reconnectTimer = setTimeout(() => this._giveUpReconnect(), 30000);
  }

  _endReconnect() {
    clearTimeout(this._reconnectTimer);
    this._reconnectEl?.remove();
    this._reconnectEl = null;
  }

  _giveUpReconnect() {
    if (!this._reconnectEl) return;
    this._endReconnect();
    events.emit('lobby:back', { mode: 'multi', reason: 'disconnected' });
  }

  // Replay the event-driven state that was lost while offline (the 20 Hz match state heals everything else).
  _onResync(m) {
    this._endReconnect();
    if (this.state !== 'playing') return;
    if (Number.isFinite(m.elapsedMs)) this._matchStartAt = performance.now() - m.elapsedMs; // late joiners share the match clock
    const st = m.mapState;
    if (st?.barrierOpen) this._applyMapEvent({ event: 'barrier', id: 'barrier' });
    for (const id of Object.keys(st?.open ?? {})) if (st.open[id]) this._applyMapEvent({ event: 'barrier', id });
    if (st?.linked) this._applyMapEvent({ event: 'linked' });
    for (const kind of ['gun', 'ammo']) for (const i of m.pickups?.[kind] ?? []) this._spawnsOf(kind)?.[i]?.setActive(false);
    for (const s of m.self?.stolen ?? []) if (!this._stolen.has(s.enemyId)) this._stolen.set(s.enemyId, { weapon: s.weapon }); // keep following the trail
    if (m.self) this.playerState.setShield(!!m.self.shield);
    if (Array.isArray(m.self?.slots)) { // authoritative: held weapons + selection
      this.playerState.restoreSlots(m.self.slots, m.self.weapon);
      if (m.self.axe > 0) this.playerState.setAxeHp(m.self.axe);
      this._showWeapon();
      this.weaponCtl.reset();
    } else {
      if (m.self?.hasGun && !this.playerState.hasGun) this._equipGun();
      if (m.self?.axe > 0) { if (!this.playerState.hasAxe) this._equipAxe(); this.playerState.setAxeHp(m.self.axe); }
    }
    if (m.self?.dead && !this.controller.down) this._onPlayerEvent({ event: 'dead', id: this.network.playerId });
    else if (m.self?.down && !this.controller.down) this._onPlayerEvent({ event: 'down', id: this.network.playerId });
    this.chat.addLine?.('System', 'Reconnected.');
  }

  _onPickupTaken({ kind, index, id }) {
    if (this.state !== 'playing' && this.state !== 'black') return;
    this._spawnsOf(kind)?.[index]?.setActive(false);
    if (id === this.network.playerId) this._applyPickup(kind);
    else if (kind === 'ammo') this._remoteVoice(id, 'reload');
  }

  _applyPickup(kind) {
    if (kind === 'gun') this._equipGun();
    else if (kind === 'ammo') {
      this.playerState.addAmmo(PICKUPS.ammo.amount);
      playAudio(this.assets, pickSfx(this.localChar, 'reload'));
    }
  }

  _equipGun() {
    const r = this.playerState.acquire('gun');
    if (r.replaced === 'axe') this.axeColor = null; // the axe was swapped out
    this._showWeapon();
    this.weaponCtl.reset();
    this.hints?.show('aim', isTouchMode() ? `HOLD ${actionLabel('aim')} TO AIM DOWN THE SIGHTS` : `${settings.get('aimMode') === 'TOGGLE' ? 'PRESS' : 'HOLD'} ${keyLabel(B.key('aim'))} / ${padLabel(B.padButton('aim'))} TO AIM DOWN THE SIGHTS`);
  }

  _onKnockback({ targetId, dx, dz, k, hop }) {
    if (this.state !== 'playing' || targetId !== this.network.playerId) return;
    const m = WEAPONS.hand.melee;
    const cl = (v, d, max) => (Number.isFinite(v) ? Math.min(max, Math.max(0, v)) : d);
    this.controller.applyKnockback(dx, dz, cl(k, m.knockback, AXE_SWINGS.heavy.knockback), cl(hop, m.hop, AXE_SWINGS.heavy.hop));
    this.haptics.knockback();
  }

  _updateScoreboard(show) {
    if (!show) { this.scoreboard.hide(); return; }
    const now = performance.now();
    if (this.scoreboard.visible && now - this._sbAt < 200) return;
    this._sbAt = now;
    const multi = this.remote;
    const localId = multi ? this.lobby.localId : 'local';
    // A server-run solo match keeps the lobby's 'local' entry, but the live data is keyed by the server player id.
    const keyOf = (id) => (multi && id === 'local' && this.network.playerId != null ? this.network.playerId : id);
    const rows = multi ? this._liveRows : this.soloStats.rows();
    const byId = new Map(rows.map((r) => [r.id, r]));
    const ps = this.playerState;
    const entries = this.lobby.players.map((p) => {
      const k = keyOf(p.id);
      const r = byId.get(k) ?? {};
      const me = p.id === localId;
      const v = multi ? this._vitals[k] : null;
      const status = r.status ?? 'alive';
      return {
        id: p.id, name: p.name, bot: !!p.bot, me, char: r.char ?? this.characters?.[k] ?? p.char,
        kills: r.kills ?? 0, points: this.modeState.hunted ? Math.floor((this.modeState.times[k] ?? 0) / 1000) : (r.points ?? 0), downs: r.downs ?? 0, revives: r.revives ?? 0, status,
        hp: multi ? (v ? v[0] : 1) : (status === 'alive' && ps.maxHealth ? ps.health / ps.maxHealth : 0),
        weapon: me ? ps.weaponId : multi ? (v?.[1] === 2 ? 'axe' : v?.[1] === 1 ? 'gun' : 'hand') : ps.weaponId,
        axeHp: me ? ps.axeHp : (v?.[3] ?? 0),
        ping: multi ? (me && this.network.ping > 0 ? this.network.ping : v?.[2] ?? 0) : 0,
        perk: me ? this.myPerk : multi ? this._perks?.[k] : this.myPerk,
        team: modeOf(this.matchGameMode).usesTeams ? (p.team ?? null) : null,
        teamColor: teamOf(p.team)?.color
      };
    });
    this.scoreboard.update({
      map: this.map?.name ?? '', difficulty: this.matchDifficulty, round: ps.round ?? 1, left: this._leftN,
      elapsedMs: now - this._matchStartAt, multi, mode: this.matchGameMode
    }, entries);
  }

  // Easter-egg code (maps with `secret` only). Returns buttons consumed this frame.
  _updateSecret(pad) {
    const consumed = {};
    if (this.state !== 'playing' || !this.map?.secret || this.secretUsed || this._secretSent
        || this.pause.isOpen || this.console.isOpen) {
      this.keyCode.reset(); this.padCode.reset();
      return consumed;
    }
    let done = false;
    for (const k of SECRET_KEYS) {
      if (this.input.wasPressed(k) && this.keyCode.feed(k)) done = true;
    }
    for (const b of SECRET_PAD_BUTTONS) {
      if (!pad.edge[b]) continue;
      const stage = this.padCode.progress;
      if (stage >= 8 && PAD_CODE[stage] === b) consumed[b] = true;
      if (this.padCode.feed(b)) done = true;
    }
    if (done) this._triggerSecret();
    return consumed;
  }

  _triggerSecret() {
    if (this.remote) {
      this._secretSent = true; // server decides who gets it; one ask is enough
      this.network.sendSecret();
    } else {
      this._onSecretSong();
    }
  }

  _onSecretSong() {
    if (!this.map?.secret || this.secretUsed || (this.state !== 'playing' && this.state !== 'black')) return;
    this.secretUsed = true;
    const a = this.secretAudio ?? new Audio(this.map.secret.audio);
    this.secretAudio = a;
    a.currentTime = 0;
    a.volume = gameVolume();
    a.onended = () => this._syncClassic();
    a.onpause = () => this._syncClassic();
    a.play().then(() => this._syncClassic()).catch(() => { /* autoplay blocked; ignore */ });
    this._syncClassic();
  }

  // Multiplayer: report our position to the server at ~20Hz.
  _sendState(dt) {
    if (!this.remote || this.spectating || this._mehDead()) return;
    this._sendAcc += dt;
    const away = this._away();
    if (this._sendAcc < 0.05 && away === this._lastAway) return;
    this._sendStateNow();
  }

  _away() {
    return computeAway({
      chatOpen: this.chat.isOpen, pauseOpen: this.pause.isOpen,
      hidden: document.hidden, focused: document.hasFocus()
    });
  }

  // Send our state immediately (also from blur/visibility events, when frames may stop).
  _sendStateNow() {
    if (!this.remote || this.state !== 'playing' || this._mehDead()) return;
    this._sendAcc = 0;
    const c = this.controller;
    this._lastAway = this._away();
    this.network.sendPlayerState({ x: c.x, y: c.y, z: c.z, yaw: this.look.yaw, crouch: c.crouching || c.sliding, away: this._lastAway });
  }

  // ---- triggers ----
  _onStart({ mapId, mode }) {
    if (this.state !== 'idle') return;
    if (mode === 'multi') return; // multiplayer starts via READY UP (server-driven)
    if (this._soloRemote) return; // already waiting for the server
    if (!mapUnlocked(mapId, profile.achievementIds)) return; // locked map (stale pref)
    if (this._wantServerSolo() && !['arcade', 'tutorial'].includes(getMap(mapId).mode)) this._runRemoteSolo(mapId); // the arcade and the tutorial run on this device
    else this._runLocal(mapId);
  }

  // Online + SOLO SIMULATION = AUTO: the server runs the match (less work on this device). Offline: this device does.
  _wantServerSolo() {
    return settings.get('soloSim') === 'AUTO' && !!this.network.connected && !!globalThis.__rolConnectivity?.online;
  }

  // Ask the server for a private solo match. If it is busy, silent or refuses, play locally exactly as before.
  _runRemoteSolo(mapId) {
    this._soloRemote = true;
    let settled = false;
    const done = () => { settled = true; clearTimeout(timer); offErr(); offLoad(); };
    const fallback = () => { if (settled) return; done(); this._soloRemote = false; this._runLocal(mapId); };
    const offErr = events.on('net:lobbyError', (m) => { if (m.busy) fallback(); });
    const offLoad = events.on('net:loadMap', () => { if (!settled) done(); });
    const timer = setTimeout(fallback, 8000);
    this.network.setPerk(profile.perk);
    this.network.createSolo(profile.name, mapId, this.lobby.localChar ?? randomCharacterId(), this.lobby.difficulty);
  }

  async _runLocal(mapId) {
    const run = ++this._run;
    this.lobby.suspend(); // singleplayer starts straight into loading (no countdown)
    if (!(await this._load(mapId, run, { local: this.lobby.localChar ?? randomCharacterId() }))) return;
    if (!(await this.screens.showStartPrompt()) || run !== this._run) return; // singleplayer: wait for ENTER
    await this._begin(run);
  }

  _onCountdownMsg({ mapId, durationMs }) {
    if (!this.lobby.active || !this.remote || this.state !== 'idle') return;
    const run = ++this._run;
    this._countdown(mapId, durationMs, run); // visual only; server sends loadMap
  }

  async _onLoadMsg({ mapId, characters, perks, pillars, late }) {
    this._perks = perks || {};
    this._pillars = pillars || [];
    if (!this.lobby.active || !this.remote) return;
    if (this.state === 'idle') this.lobby.suspend();
    const run = ++this._run;
    if (await this._load(mapId, run, characters || {}, !!late)) {
      // A solo player still gets the tap / ENTER to start prompt; the server waits for it.
      if (this._soloRemote && (!(await this.screens.showStartPrompt()) || run !== this._run)) return;
      this.network.mapLoaded();
    }
  }

  _onBeginMsg() {
    if (this.state !== 'loading' || !this.pendingLevel) return;
    this._begin(++this._run);
  }

  // ---- steps (each returns false if cancelled) ----
  async _countdown(mapId, durationMs, run) {
    this.state = 'countdown';
    this.lobby.suspend();
    const ok = await this.screens.showCountdown(durationMs, getMap(mapId).name);
    return ok && run === this._run;
  }

  async _load(mapId, run, characters = {}, late = false) { // late: joining a running match (no intro cutscene)
    const map = getMap(mapId);
    this.map = map;
    this.matchDifficulty = this.lobby.difficulty;
    this.matchGameMode = this.remote ? (this.lobby.gameMode ?? 'survival') : 'survival';
    this.characters = characters;
    this.localChar = characters[this.network.playerId] ?? characters.local ?? randomCharacterId();
    const multi = this.remote;
    this.myPerk = effectivePerk(multi ? this._perks?.[this.network.playerId] : profile.perk, this.lobby.mode, profile.achievementIds);
    if (!multi && this.myPerk === 'secret') this.myPerk = resolveSecret(profile.achievementIds, this.lobby.mode); // random per match
    this.playerState.setCapacity(this.myPerk === 'collector' ? 2 : 1);
    this._secretPick = profile.perk === 'secret' && this.myPerk !== 'secret';
    this._selfUses = 0;
    this._protectUntil = 0;
    this.berserk.clear(); this.berserk.newRound();
    this.blaze.reset(); this._blazeReady = false; this._dashes = [];
    this._berserkShown = false;
    this._blazeEl?.classList.add('ui-hidden'); this._blazeFlameEl?.classList.add('ui-hidden'); this._berserkEl?.classList.add('ui-hidden');
    this.god = false;
    this.buffs.clear();
    this.bulletColor = null;
    this.axeColor = null;
    this._tpT = 0;
    this._tpEl?.classList.add('ui-hidden');
    this.arrivalFx?.clear();
    this.state = 'loading';
    this.screens.cancelCountdown();
    bgm.stop();
    let t0 = performance.now();
    let real = 0;
    let finished = false;
    const minMs = this.lobby?.mode === 'single' ? 0 : Math.max(MIN_LOADING_MS, map.minLoadingMs ?? 0); // singleplayer: no artificial wait
    // Assets load in parallel with the intro cutscene.
    const assetsP = loadAssets(this._manifest(map), (p) => { real = p * 0.9; });
    assetsP.catch(() => {});
    if (map.intro && !late) {
      this.screens.startLoadingAudio(map);
      const how = await this.screens.playIntro(map, {
        multi: this.remote,
        sendVote: () => this.network.sendIntroVote(),
        revealLoading: () => { if (run === this._run) { this.screens.showLoading(map, { bgm: this._stageBgm(map).url }); t0 = performance.now(); } }
      });
      if (how === 'cancelled' || run !== this._run) return false;
    } else {
      this.screens.showLoading(map, { bgm: this._stageBgm(map).url });
      t0 = performance.now();
    }
    const ticker = (async () => {
      while (!finished || performance.now() - t0 < minMs) {
        const timeP = minMs > 0 ? (performance.now() - t0) / minMs : 1;
        this.screens.setProgress(Math.min(real, timeP));
        await nextFrame();
        if (run !== this._run) return;
      }
      this.screens.setProgress(1);
    })();

    const assets = await assetsP;
    if (run !== this._run) return false;
    this.assets = assets;
    const level = map.createLevel(assets, { pillars: this.remote ? this._pillars : undefined, solo: !this.remote });
    this.renderer.compile(level.scene, this.camera); // avoid a hitch on first frame
    if (run !== this._run) { level.dispose(); return false; }
    this.pendingLevel?.dispose();
    this.pendingLevel = level;
    real = 1;
    finished = true;
    await ticker;
    return run === this._run;
  }

  // Map assets plus the character models / local start sfx.
  _manifest(map) {
    const extra = characterManifest(this.localChar, this.characters);
    const out = {};
    for (const src of [map.assets, extra, weaponManifest(STARTING_WEAPON), enemyManifest(), lyricManifest(), sfxManifest(), announcerManifest()]) {
      for (const [type, urls] of Object.entries(src)) out[type] = [...new Set([...(out[type] || []), ...urls])];
    }
    return out;
  }

  async _begin(run) {
    if (this.map?.mode === 'arcade') return this._beginArcade(run);
    const level = this.pendingLevel;
    this.pendingLevel = null;
    this.level = level;
    this.state = 'black';
    this.screens.blackOut();
    this.screens.stopMatchBgm();
    const sb = this._stageBgm(this.map);
    this.screens.hideLoading({ keepAudio: sb.keepLoading });
    if (sb.play) this.screens.startMatchBgm(sb.url, sb.fallback); // the stage's own music, or the track chosen in STAGE BGM
    if (settings.get('classic') === 'YES') this.screens.pauseMatchBgm(); // CLASSIC replaces the map BGM
    this.taunter = this.map?.taunts && !this.remote ? new Taunter() : null;
    this.screens.cancelCountdown();
    this.lobby.hide();
    this.weaponCtl.reset();
    this.projectiles.clear();
    this.bullets?.dispose();
    this.bullets = new BulletRenderer(level.scene, this.assets?.models?.[WEAPONS.gun.fire.projectile]);
    this.pickups = {
      gun: new PickupState(level.gunSpawns?.length ?? 0, PICKUPS.gun.respawnMs),
      ammo: new PickupState(level.ammoSpawns?.length ?? 0, PICKUPS.ammo.respawnMs)
    };
    level.gunSpawns?.forEach((s) => s.setActive(true));
    level.ammoSpawns?.forEach((s) => s.setActive(true));
    if (this.matchGameMode === 'hunted') this._openArena(level);
    this.playerState.reset(this.localChar);
    this.hp.reset();
    this.run = new RunTracker();
    this._resetMode();
    this.modeState.reset(this.matchGameMode, this.network.playerId);
    this.modeHud.start(this.matchGameMode);
    if (this.matchGameMode !== 'survival') this.run.taint(); // Outlast / Hunted are unranked: no achievements from round rules
    this._achT = 0;
    this._baseStats = { kills: 0, downs: 0 };
    this._vitals = {};
    this._leftN = 0;
    this._matchStartAt = performance.now();
    this.viewmodel.setWeapon(this.playerState.weaponId, this.assets);
    this.secretUsed = false;
    this._secretSent = false;
    this.keyCode.reset(); this.padCode.reset();
    this.audio3d.setSounds(this.assets?.sounds);
    this.audio3d.resume();
    this._setDown(false);
    this.spectating = false;
    this.cine = null;
    this.gameOverUI.hide();
    this._specEl?.classList.add('ui-hidden');
    this._liveRows = [];
    this._matchActive = true;
    this.soloStats = new MatchStats();
    this.soloStats.register('local', this.lobby.players.find((p) => p.id === 'local')?.name ?? 'You', this.localChar);
    if (this.myPerk === 'collector') this.soloStats.setKillBonus('local', COLLECTOR_KILL_BONUS);
    this._enemyTargets = [];
    this.enemyView?.clear();
    const enemyModel = this.assets?.models?.[ENEMY.model];
    this.enemyView = enemyModel ? new EnemyRenderer(level.scene, ENEMY, enemyModel) : null;
    const mehModel = this.assets?.models?.[ENEMY_DEFS.meh.model];
    if (this.enemyView && mehModel) this.enemyView.addKind('meh', ENEMY_DEFS.meh, mehModel);
    const dehModel = this.assets?.models?.[ENEMY_DEFS.deh.model];
    if (this.enemyView && dehModel) this.enemyView.addKind('deh', ENEMY_DEFS.deh, dehModel);
    if (this.enemyView && enemyModel) this.enemyView.addKind('behxploder', ENEMY_DEFS.behxploder, enemyModel);
    this.enemyView?.setOutline(this.myPerk === 'vulture'); // The Vulture: white outlines through walls
    this.hud.setPerk(this.myPerk);
    if (this._secretPick) this._timers.push(setTimeout(() => this.state === 'playing' && this.puHud.announce(`THE SECRET: ${PERKS[this.myPerk].name.toUpperCase()}!`, PERKS[this.myPerk].color), 2500));
    this.enemies = this.remote ? null : new EnemySystem({ world: level.collision ?? null, def: ENEMY, defs: ENEMY_DEFS });
    const spawnOpts = mapSpawnOptions(MAP_DATA[this.map?.id], level.lava);
    if (this.enemies) { this.enemies.nav = spawnOpts.nav ?? {}; this.enemies.lava = level.lava ?? null; }
    this._clearPowerups();
    this.blazeFx = new BlazeFx(level.scene);
    this.explosionFx = new ExplosionFx(level.scene);
    this.axeReach?.dispose();
    this.axeReach = new AxeReachFx(level.scene);
    this.outlines?.clear();
    this.outlines = new OutlineSet();
    this.medicFx?.clear();
    this.medicFx = new MedicTrailFx(level.scene);
    this.dehFx?.clear();
    this.dehFx = new MedicTrailFx(level.scene, { tint: 'orange', points: dehTrailPoints });
    this._stolen.clear();
    this.puRender = new PowerupRenderer(level.scene);
    this.pdirector = this.remote ? null : new PowerupDirector({ world: level.collision ?? null });
    const lyricModel = this.assets?.models?.[LYRIC_VIEW.model];
    this.lyricView = lyricModel ? new EnemyRenderer(level.scene, LYRIC_VIEW, lyricModel, { label: 'Lyric' })
      : enemyModel ? new EnemyRenderer(level.scene, { ...ENEMY, height: ENEMY.height * 1.25 }, enemyModel, { label: 'Lyric' }) : null; // fallback: Beh
    const md = MAP_DATA[this.map?.id];
    this.spawnPoints = !this.remote && level.collision && md?.enemyAreas
      ? buildSpawnPoints(level.collision, md.enemyAreas, spawnOpts) : [];
    if (level.pillars?.length && !this.remote) this.spawnPoints = dropPillarSpawns(this.spawnPoints, level.pillars);
    this._spawnStages = null; // singleplayer: spawn lists by number of barriers opened (maps with enemyStages)
    if (!this.remote && level.collision && md?.enemyStages) {
      const n = md.enemyStages.length;
      this._spawnStages = md.enemyStages.map((areas, k) => {
        level.collision.setGateOpen?.(false);
        for (let i = 0; i < k; i++) level.collision.setGateOpen?.(true, i);
        const pts = buildSpawnPoints(level.collision, areas, spawnOpts);
        return level.pillars?.length ? dropPillarSpawns(pts, level.pillars) : pts;
      });
      level.collision.setGateOpen?.(false);
      this.spawnPoints = this._spawnStages[0];
      void n;
    }
    this._spawnsOpen = null; // after-barrier spawn list (singleplayer)
    if (!this.remote && level.collision && md?.enemyAreasOpen) {
      level.collision.setGateOpen?.(true);
      this._spawnsOpen = buildSpawnPoints(level.collision, md.enemyAreasOpen, spawnOpts);
      level.collision.setGateOpen?.(false);
    }
    if (this.map?.secret) { // warm the cache in the background (3+ MB)
      this.secretAudio = new Audio(this.map.secret.audio);
      this.secretAudio.preload = 'auto';
    }

    // Every player uses the same spawn; players may overlap (no collision).
    const s = level.spawn;
    this.controller.groundY = level.groundY ?? 0;
    this.controller.world = level.collision ?? null;
    this.controller.reset({ x: s.x, y: s.y ?? this.controller.groundY, z: s.z });
    this.camera.position.set(s.x, this.controller.y + this.controller.eye, s.z);
    this.look.setView(s.yaw, 0);
    this.remotes = new RemotePlayers(level.scene, this.network.playerId, this.characters, this.assets,
      (id) => this.lobby.players.find((p) => p.id === id)?.name ?? '');
    this.remotes.roleOf = (id) => this.modeState.roleOf(id);
    this.remotes.mehModel = this.assets?.models?.[ENEMY_DEFS.meh.model] ?? null;
    this.chat.start(); // log only in singleplayer (powerup + Lyric lines); typing stays multiplayer-only
    this._sendAcc = 1;

    await wait(CLIENT_CONFIG.BLACK_HOLD_MS);
    if (run !== this._run) return;
    playAudio(this.assets, randomStartSfx(this.localChar));
    if (this.lobby.mode === 'multi') for (const id of matchPlayerIds(this.characters)) this._remoteVoice(id, 'sfx', this.level.spawn);
    const arrivalMs = this.map?.arrival && !isReduceMotion() ? (this.arrivalFx?.play(this.map.arrival) ?? 0) : 0; // entrance effect runs exactly alongside the fade
    if (arrivalMs) playArrivalSfx(this.map.arrival);
    await this.screens.fadeIn(arrivalMs || CLIENT_CONFIG.FADE_IN_MS);
    if (run !== this._run) return;
    this.state = 'playing';
    this.hints ??= new Hints();
    this.hints.show('move', this.input?.touch?.active ? 'MOVE WITH THE LEFT STICK, LOOK WITH THE RIGHT' : `MOVE: ${keyLabel(B.key('forward'))} ${keyLabel(B.key('left'))} ${keyLabel(B.key('back'))} ${keyLabel(B.key('right'))}  -  MOUSE TO LOOK`);
    this._syncClassic();
    if (this.map?.greeting) { // personal greeting line in the chat log (local, each player sees their own name)
      const me = this.lobby.players.find((p) => p.id === (this.remote ? this.network.playerId : 'local'));
      this.chat.addLine(this.map.greeting.from, this.map.greeting.text(me?.name ?? profile.name ?? 'Gladiator'));
    }
    this.level?.startSkyTransition?.();
    const tut = this.map?.mode === 'tutorial';
    if (this.enemies && !tut) { this.rounds = new RoundSystem({ spawnMult: difficultyOf(this.matchDifficulty).mult, transitionMs: difficultyOf(this.matchDifficulty).breakMs }); this.rounds.start(1); }
    this.hud.show();
    this.viewmodel.visible = true;
    if (tut) this._startTutorial();
  }

  // Behs Arcade: same load / black / fade flow, but no first-person scene setup. ArcadeMode runs the match.
  async _beginArcade(run) {
    const level = this.pendingLevel;
    this.pendingLevel = null;
    this.level = level;
    this.state = 'black';
    this.screens.blackOut();
    this.screens.stopMatchBgm();
    this.screens.hideLoading({ keepAudio: false });
    const sb = this._stageBgm(this.map);
    if (sb.play) this.screens.startMatchBgm(sb.url, sb.fallback);
    if (settings.get('classic') === 'YES') this.screens.pauseMatchBgm();
    this.screens.cancelCountdown();
    this.lobby.hide();
    this.gameOverUI.hide();
    this.viewmodel.visible = false;
    this.cine = null; this.spectating = false; this._liveRows = []; this._matchActive = true;
    this._blur = { dx: 0, dy: 0, zoom: 0 };
    const myId = this.remote ? this.network.playerId : 'local';
    const names = {};
    for (const p of this.lobby.players) names[p.id] = p.name;
    names.local = this.lobby.players.find((p) => p.id === 'local')?.name ?? profile.name ?? 'You';
    this.arcadeInfo = () => ({ local: { name: names.local, char: this.localChar } });
    this.soloStats = { rows: () => (this.arcade?.sim ? this.arcade.sim.rows(this.arcadeInfo()) : []) }; // for _recordMatch (offline solo)
    this.arcade = new ArcadeMode({ session: this, level, assets: this.assets, remote: this.remote, myId, names });
    this.audio3d.resume();
    this.chat.start(); // typing stays multiplayer-only
    await wait(CLIENT_CONFIG.BLACK_HOLD_MS);
    if (run !== this._run) return;
    await this.screens.fadeIn(CLIENT_CONFIG.FADE_IN_MS);
    if (run !== this._run) return;
    this.state = 'playing';
    this._syncClassic();
    this.arcade.start();
  }

  // ---- pause / exit / teardown ----
  _resume() {
    this.pause.close();
    events.emit('touch:reset');
    if (canLockPointer()) { try { this.canvas.requestPointerLock?.(); } catch { /* user can click the canvas */ } }
  }

  exit() {
    const mode = this.lobby.mode;
    this.teardown();
    events.emit('lobby:back', { mode, reason: 'exit' });
  }

  // After a game over: back to the lobby with the same map, perk and (in multiplayer) players.
  returnToLobby() {
    this._reset();
    this.lobby.resume();
  }

  _abort(reason) {
    if (this.state === 'idle') return;
    this._reset();
    this.lobby.resume(reason);
  }

  teardown() {
    cancelRelock();
    if (this.state === 'idle' && !this.level && !this.pendingLevel) return;
    this._reset();
  }

  _reset() {
    this._endReconnect();
    this._recordMatch(); // leaving mid-match still saves what was earned
    this._endTutorial();
    this.arcade?.dispose(); this.arcade = null;
    if (this._soloRemote) { this._soloRemote = false; this.network.leaveLobby(); } // end the server-hosted solo match
    this._run++;
    this.screens.stopMatchBgm();
    bgm.play(); // back to menu/lobby music
    this.screens.hideAll();
    this.pause.close();
    this.console.close();
    this.chat.stop();
    this.hud.hide();
    this._timers.forEach(clearTimeout);
    this._timers = [];
    this.projectiles.clear();
    this.bullets?.dispose();
    this.bullets = null;
    this.viewmodel.dispose();
    this.playerState.clear();
    this.scoreboard.hide();
    if (this.classicAudio) { this.classicAudio.pause(); this.classicAudio = null; }
    if (this.secretAudio) { this.secretAudio.onended = this.secretAudio.onpause = null; this.secretAudio.pause(); this.secretAudio.removeAttribute('src'); this.secretAudio = null; }
    this.map = null;
    this.controller.world = null;
    this.ui?.updateStats({ pos: '--' });
    if (document.pointerLockElement) document.exitPointerLock?.();
    this.remotes?.clear();
    this.remotes = null;
    this._resetMode();
    this.enemyView?.clear();
    this.enemyView = null;
    this.enemies = null;
    this.rounds = null;
    this._clearPowerups();
    this.spawnPoints = [];
    this.taunter = null;
    this.roundBanner.hide();
    this._leftEl.textContent = '';
    this._enemyTargets = [];
    this.controller.down = false;
    this.spectating = false;
    this.cine = null;
    this.gameOverUI.hide();
    this._specEl?.classList.add('ui-hidden');
    this._downEl?.classList.add('ui-hidden');
    this._reviveEl?.classList.add('ui-hidden');
    this.axeReach?.dispose();
    this.axeReach = null;
    this.level?.dispose();
    this.pendingLevel?.dispose();
    this.level = this.pendingLevel = null;
    this.assets = null;
    this.characters = {};
    this.state = 'idle';
    this.camera.position.copy(this._home);
    this.look.setView(0, 0);
  }
}
