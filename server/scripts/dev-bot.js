/**
 * Dev bot: a headless second player so a real game can start and turns can
 * alternate during local development / Playwright tests.
 *
 * It speaks the same WebSocket protocol as the web client: it waits for its
 * turn (view.isYourTurn) and asks the shared AI brain (decideAction) for one
 * action at a time. It holds no rules; the authoritative server validates.
 *
 *   node server/scripts/dev-bot.js            # connects to ws://localhost:8080
 *   WS_URL=ws://host:port node .../dev-bot.js
 */
const WebSocket = require('ws');
const {decideAction} = require('../src/ai/decideAction');

const url = process.env.WS_URL || 'ws://localhost:8080';
const label = process.env.BOT_NAME || 'bot';
const STEP_DELAY = Number(process.env.BOT_DELAY || 500); // ms between actions

const ws = new WebSocket(url);
let playerId = null;
let acting = false; // serialize: one action per received view

const send = (command) => ws.send(JSON.stringify({ kind: 'command', command }));

ws.on('open', () => console.log(`[${label}] connected to ${url}`));

ws.on('message', (raw) => {
  let msg;
  try {
    msg = JSON.parse(raw);
  } catch {
    return;
  }

  if (msg.kind === 'welcome') {
    playerId = msg.playerId;
    console.log(`[${label}] playerId=${playerId}`);
    return;
  }
  if (msg.kind === 'error') {
    console.log(`[${label}] server error: ${msg.message}`);
    return;
  }
  if (msg.kind !== 'events') return;

  const view = msg.snapshot && msg.snapshot.view;
  if (!view || !view.isYourTurn || acting) return;

  acting = true;
  setTimeout(() => {
    play(view);
    acting = false; // the resulting broadcast drives the next step
  }, STEP_DELAY);
});

function play(view) {
  const command = decideAction(view);
  if (!command) return;
  console.log(`[${label}] ${command.type}${describe(command)}`);
  send(command);
}

function describe(command) {
  if (command.type === 'LAY_DOWN') {
    return ` (${command.payload.melds.map((m) => `${m.type}:${m.cardUuids.length}`).join(', ')})`;
  }
  if (command.type === 'ADD_TO_MELD') return ` -> meld ${command.payload.meldIndex}`;
  if (command.type === 'DISCARD') return ` ${command.payload.cardUuid.slice(0, 6)}`;
  return '';
}

ws.on('close', () => console.log(`[${label}] disconnected`));
ws.on('error', (e) => console.log(`[${label}] ws error: ${e.message}`));
