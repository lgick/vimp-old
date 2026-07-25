# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

VIMP — an early-stage browser multiplayer game framework (Node.js server + Socket.IO + canvas/EaselJS client). Codebase is a work in progress (see TODO list at the top of `server.js`); much of it is prototype-quality.

## Setup & running

```bash
bower install && npm install
npm start
```

`npm start` runs `NODE_PORT=3000 NODE_GAMECONF=/config/parts/tank.js NODE_ENV=development nodemon server.js`, serving at http://localhost:3000. There is no build step, lint config, or test suite in this repo.

Client vendor libraries (socket.io-client, requirejs-bower, easeljs, createjs-preloadjs) install via Bower into `public/js/vendor` (see `.bowerrc`).

## Architecture

### Server (Node 0.x era: Express 3, Socket.IO 0.9)

- `server.js` — entry point. Loads config, sets up Express (Jade views, static `/public`), starts the HTTP server, then hands it to `socket/index.js`.
- `config/index.js` — a simple global key-value store with `set(keys, value)` / `get(keys)`, where `keys` is a colon-delimited path (e.g. `'basic:port'`). Populated in `server.js` from `config/basic.js` (framework defaults) and a game-specific file selected via `NODE_GAMECONF` env var (e.g. `config/parts/tank.js`).
- `routes/index.js` — Express routes (`/`, `/vimp`, `/tank`, `/forum`), all rendering the same `views/vimp.jade`.
- `socket/index.js` — nearly all live game logic lives here, per-connection, in one large closure: player state, a bot simulation, an `auth` handshake, a `setInterval` game loop (30ms tick) that applies queued `cmds` (movement/rotation/zoom) and chat messages, then broadcasts a `game` event with all player/bot state to every connected socket. There is no authoritative separation between players yet — auth is effectively unchecked (see TODOs).
- `socket/lib/utils.js` — pure helpers used by the loop: random bot generation, bot movement, and `rangeNumber` (clamped vs. wrapped numeric ranges, used for both map bounds and rotation degrees).
- `socket/lib/user.js` — an in-progress server-side `UserModel` (constructor registry pattern via `UserModel._add`) that references `./shipModel`, which does not exist yet — this file is not currently wired into `socket/index.js`.
- `lib/log.js` — Winston logger factory; pass `module` to get a labeled logger (`require('../lib/log')(module)`).

### Client (RequireJS AMD modules under `public/js/`, MVC-ish)

- `public/js/app.js` — the composition root. Defines all DOM element/id/regex constants, wires up Model/View/Controller triads, and handles all `socket.on(...)` events from the server.
- Each feature has a Model/View/Controller triple in `public/js/model|view|controller/`: `auth` (login form), `user` (chat, panel, keyboard input, resize), and shared `game` model/view used by three separate controllers (`vimp`, `back`, `radar`) that each drive their own `<canvas>`.
- `public/js/lib/factory.js` — a `Factory(type, params)` registry: `Factory.add(name, ctor)` registers a game-object constructor (adding shared `_addons` methods to its prototype), and calling `Factory('Halk', params)` instantiates it. Used to build renderable game entities from server data.
- `public/js/lib/publisher.js` — minimal pub/sub (`on`/`emit`) used as the event bus between models and views (e.g. resize events).
- `public/js/parts/` — EaselJS-based drawable "part" constructors registered with the Factory: `back.js` (scrolling background), `radar.js`, `halk.js` / `flat.js` (player ship models/skins), `tank.js`.
- Game state flows one-directional per tick: server emits a `game` event with per-player `{vimp, radar, chat, panel}` data → `app.js` routes it into `vimpCtrl.parse`/`radarCtrl.parse` → controllers update their `GameModel` → views redraw the relevant canvas via EaselJS/CreateJS `Ticker`.
- `public/css/style.css` + `views/*.jade` (`views/includes/*.jade`: `auth`, `canvas`, `chat`, `error`, `head`, `panel`) render the single-page shell that `app.js` then takes over.

### Config convention

Game-specific configs live in `config/parts/*.js` (currently only `tank.js`) and are selected at boot via the `NODE_GAMECONF` env var, merged into the global config under the `game` key. Framework-wide defaults live in `config/basic.js` under `basic`.
