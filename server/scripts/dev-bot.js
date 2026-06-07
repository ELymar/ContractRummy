/**
 * Dev bot: a headless second player so a real game can start and turns can
 * alternate during local development / Playwright tests.
 *
 * It speaks the same WebSocket protocol as the web client: it waits for its
 * turn (view.isYourTurn) and plays the simplest legal sequence — draw (if
 * allowed), discard a card, end turn — driven entirely by view.validActions.
 * It holds no rules; the authoritative server validates everything.
 *
 *   node server/scripts/dev-bot.js            # connects to ws://localhost:8080
 *   WS_URL=ws://host:port node .../dev-bot.js
 */
const WebSocket = require('ws');

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
  const can = (a) => view.validActions && view.validActions.includes(a);

  // 1) Draw from the deck if we haven't taken a card yet.
  if (!view.tookCard && can('DRAW')) {
    console.log(`[${label}] DRAW`);
    return send({ type: 'DRAW' });
  }

  // 2) Discard a card (the last one in hand) to satisfy the discard phase.
  if (!view.discarded && can('DISCARD') && view.yourHand.length > 0) {
    const card = view.yourHand[view.yourHand.length - 1];
    console.log(`[${label}] DISCARD ${card.value} of ${card.suit}`);
    return send({ type: 'DISCARD', payload: { cardUuid: card.uuid } });
  }

  // 3) End the turn.
  if (can('END_TURN')) {
    console.log(`[${label}] END_TURN`);
    return send({ type: 'END_TURN' });
  }
}

ws.on('close', () => console.log(`[${label}] disconnected`));
ws.on('error', (e) => console.log(`[${label}] ws error: ${e.message}`));
