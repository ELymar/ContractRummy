const DisplayUtils = require('./DisplayUtils');

/**
 * CardSerializer centralizes how cards are converted to strings for logs and display.
 * - serializeForLog: deterministic, compact representation used in logs (e.g. "[A♥]").
 * - formatForDisplay: human-friendly display string (delegates to DisplayUtils).
 */
class CardSerializer {
  static serializeForLog(card) {
    // Prefer a deterministic toString when available
    if (!card && card !== 0) return String(card);
    if (typeof card === 'string') return card;
    if (typeof card.toString === 'function') {
      try { return card.toString(); } catch (_) {}
    }
    // Fallback to DisplayUtils formatting (bracketed representation)
    return DisplayUtils.formatCard(card);
  }

  static formatForDisplay(card) {
    return DisplayUtils.formatCard(card);
  }
}

module.exports = CardSerializer;
