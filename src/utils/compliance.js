/**
 * RetroScan AI — IRC Compliance Logic
 *
 * Implements thresholds from:
 *   - IRC 67:2012 (Code of Practice for Road Signs)
 *   - IRC 35:2015 (Code of Practice for Road Markings)
 *
 * Maps AI classification → estimated RA value → compliance status
 */

// ── IRC Thresholds by condition ─────────────────────────────────────────────
// Minimum retroreflectivity (RA) in cd/lux/m² for compliance
const CONDITION_THRESHOLDS = {
  day: { high: 250, degraded: 100 },
  night: { high: 180, degraded: 70 },
  wet: { high: 200, degraded: 80 },
};

// ── Estimated RA values for each classification ─────────────────────────────
const RA_ESTIMATES = {
  High: 300,      // Well above 250 — new/well-maintained sign
  Medium: 175,    // Between degraded and high thresholds
  Degraded: 75,   // Below maintenance threshold
};

/**
 * Check IRC compliance for a classification under given conditions.
 *
 * @param {string} classification - 'High', 'Medium', or 'Degraded'
 * @param {string} condition - 'day', 'night', or 'wet'
 * @returns {{ status: string, label: string, icon: string, color: string, estimatedRA: number, threshold: Object, condition: string }}
 */
export function checkCompliance(classification, condition = 'day') {
  const thresholds = CONDITION_THRESHOLDS[condition] || CONDITION_THRESHOLDS.day;
  const estimatedRA = RA_ESTIMATES[classification] || 75;

  let status, label, icon, color;

  if (estimatedRA >= thresholds.high) {
    status = 'pass';
    label = 'PASS';
    icon = '✓';
    color = 'green';
  } else if (estimatedRA >= thresholds.degraded) {
    status = 'marginal';
    label = 'MARGINAL';
    icon = '⚠';
    color = 'amber';
  } else {
    status = 'fail';
    label = 'FAIL';
    icon = '✗';
    color = 'red';
  }

  return {
    status,
    label,
    icon,
    color,
    estimatedRA,
    threshold: thresholds,
    condition,
  };
}

/**
 * Get a quick compliance badge for a classification (ignores condition).
 *
 * @param {string} classification - 'High', 'Medium', or 'Degraded'
 * @returns {{ label: string, icon: string, color: string }}
 */
export function getComplianceBadge(classification) {
  const badges = {
    High:     { label: 'PASS',     icon: '✓', color: 'green' },
    Medium:   { label: 'MARGINAL', icon: '⚠', color: 'amber' },
    Degraded: { label: 'FAIL',     icon: '✗', color: 'red' },
  };
  return badges[classification] || badges.Degraded;
}

/**
 * Estimate the RA value (cd/lux/m²) for a given classification.
 *
 * @param {string} classification - 'High', 'Medium', or 'Degraded'
 * @returns {number}
 */
export function estimateRAValue(classification) {
  return RA_ESTIMATES[classification] || 75;
}

/**
 * Get IRC standard reference text for display.
 *
 * @param {string} condition - 'day', 'night', or 'wet'
 * @returns {string}
 */
export function getIRCReference(condition = 'day') {
  const thresholds = CONDITION_THRESHOLDS[condition] || CONDITION_THRESHOLDS.day;
  return `IRC 67:2012 — Minimum RA: ${thresholds.degraded} cd/lux/m² (${condition} condition)`;
}

/**
 * Get all threshold info for a condition (useful for display).
 *
 * @param {string} condition
 * @returns {{ high: number, degraded: number, condition: string, standard: string }}
 */
export function getThresholdInfo(condition = 'day') {
  const thresholds = CONDITION_THRESHOLDS[condition] || CONDITION_THRESHOLDS.day;
  return {
    ...thresholds,
    condition,
    standard: 'IRC 67:2012 & IRC 35:2015',
  };
}
