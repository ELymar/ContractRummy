const WebSocket = require('ws');

class TestBotClient {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.playerId = null;
    this.view = null;
    this.queue = []; // actions to execute when it's our turn
    this.pendingUpdateResolvers = [];
    this.events = [];
    this.stepProvider = null; // optional shared step provider
  }

  async connect() {
    this.ws = new WebSocket(this.url);
    this.ws.on('message', (raw) => {
      const msg = JSON.parse(raw);
      if (msg.kind === 'welcome') {
        this.playerId = msg.playerId;
      } else if (msg.kind === 'events') {
        if (Array.isArray(msg.events)) this.events.push(...msg.events);
        this.view = msg.snapshot?.view;
        // resolve waiters
        this.pendingUpdateResolvers.forEach((r) => r());
        this.pendingUpdateResolvers = [];
        // If it's our turn and we have a step queued, try to act
        this.maybeAct();
      }
    });
    await new Promise((res) => this.ws.once('open', res));
  }

  enqueue(step) {
    this.queue.push(step);
    this.maybeAct();
  }

  setStepProvider(fn) {
    this.stepProvider = fn; // () => nextStep | null
  }

  sendCommand(type, payload = {}) {
    this.ws.send(
      JSON.stringify({kind: 'command', command: {type, playerId: this.playerId, payload}})
    );
  }

  async waitForUpdate(timeoutMs = 3000) {
    return new Promise((resolve) => {
      const t = setTimeout(resolve, timeoutMs);
      this.pendingUpdateResolvers.push(() => {
        clearTimeout(t);
        resolve();
      });
    });
  }

  // Convert a cardRef to index based on current hand; include handOrder in payloads
  resolveCardIndex(cardRef) {
    const hand = this.view?.yourHand || [];
    const idx = hand.findIndex((c) => this.cardMatches(c, cardRef));
    return idx;
  }

  cardMatches(c, ref) {
    // ref can be { suit, value } or string like "[A♥]" or engine toString
    if (typeof ref === 'string') {
      return c.toString?.() === ref;
    }
    return c.suit === ref.suit && c.value === ref.value;
  }

  async maybeAct() {
    if (!this.view?.isYourTurn) return;
    let step = null;
    if (this.stepProvider) {
      step = this.stepProvider();
      if (!step) return;
    } else {
      if (this.queue.length === 0) return;
      step = this.queue.shift();
    }
    const handOrder = this.view.yourHand || [];

    switch (step.action) {
      case 'DRAW': {
        if (step.payload?.source === 'discard') {
          this.sendCommand('TAKE_FROM_DISCARD');
        } else {
          this.sendCommand('DRAW', {nCards: 1});
        }
        break;
      }
      case 'DISCARD': {
        const cardIndex = this.resolveCardIndex(step.payload.card);
        this.sendCommand('DISCARD', {cardIndex, handOrder});
        break;
      }
      case 'LAY_DOWN': {
        const melds = step.payload.melds.map((m) => ({
          type: m.type,
          cardIndices: m.cards.map((ref) => this.resolveCardIndex(ref)),
        }));
        this.sendCommand('LAY_DOWN', {melds, handOrder});
        break;
      }
      case 'ADD_TO_MELD': {
        const cardIndex = this.resolveCardIndex(step.payload.card);
        const {meldIndex, position} = step.payload;
        this.sendCommand('ADD_TO_MELD', {meldIndex, position, cardIndex, handOrder});
        break;
      }
      case 'END_TURN': {
        this.sendCommand('END_TURN');
        break;
      }
      case 'READY': {
        this.sendCommand('READY');
        break;
      }
      case 'QUIT': {
        this.sendCommand('QUIT');
        break;
      }
      default:
        // no-op
        break;
    }
    await this.waitForUpdate();
    // Chain next action if still our turn
    this.maybeAct();
  }

  async close() {
    if (this.ws && this.ws.readyState === this.ws.OPEN) {
      await new Promise((res) => {
        this.ws.once('close', res);
        this.ws.close(1000, 'test-end');
      });
    }
  }
}

module.exports = TestBotClient;
