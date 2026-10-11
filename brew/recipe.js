const BALANCE_SHARES = { sweeter: 1 / 3, sweet: 5 / 12, balanced: 1 / 2, bright: 7 / 12, brighter: 2 / 3 };
const STRENGTH_STARTS = { 1: [90], 2: [90, 135], 3: [90, 135, 165], 4: [90, 120, 150, 180] };
const FIRST_PHASE_SHARE = 0.4;
const SECOND_POUR_SEC = 45;
const REMOVE_SEC = 210;

export const BALANCES = Object.keys(BALANCE_SHARES);

export const LIMITS = {
  doseGrams: { min: 8, max: 40, step: 1 },
  ratio: { min: 12, max: 18, step: 0.5 },
  strengthPours: { min: 1, max: 4, step: 1 },
  kettleCelsius: { min: 70, max: 100, step: 5 },
  pourRateGramsPerSec: { min: 3, max: 8, step: 0.5 },
};

export const CLASSIC = Object.freeze({
  id: 'classic',
  name: '4:6 classic',
  doseGrams: 16,
  ratio: 15,
  balance: 'balanced',
  strengthPours: 3,
  kettleCelsius: 90,
  pourRateGramsPerSec: 5,
  grind: 'medium-coarse',
  notes: '',
});

const isOnStep = (value, { min, max, step }) =>
  typeof value === 'number' && value >= min && value <= max && Number.isInteger((value - min) / step);

const isText = value => typeof value === 'string';

export function isValidRecipe(value) {
  if (value === null || typeof value !== 'object') return false;
  return isText(value.id) && value.id.length > 0
    && isText(value.name) && value.name.trim().length > 0
    && isOnStep(value.doseGrams, LIMITS.doseGrams)
    && isOnStep(value.ratio, LIMITS.ratio)
    && BALANCES.includes(value.balance)
    && isOnStep(value.strengthPours, LIMITS.strengthPours)
    && isOnStep(value.kettleCelsius, LIMITS.kettleCelsius)
    && (value.pourRateGramsPerSec === 0 || isOnStep(value.pourRateGramsPerSec, LIMITS.pourRateGramsPerSec))
    && isText(value.grind)
    && isText(value.notes);
}

export function buildSchedule(recipe) {
  const totalGrams = Math.round(recipe.doseGrams * recipe.ratio);
  const firstPhaseGrams = Math.round(totalGrams * FIRST_PHASE_SHARE);
  const secondPhaseGrams = totalGrams - firstPhaseGrams;
  const strengthPours = recipe.strengthPours;

  const targets = [Math.round(firstPhaseGrams * BALANCE_SHARES[recipe.balance]), firstPhaseGrams];
  for (let k = 1; k <= strengthPours; k++) {
    targets.push(firstPhaseGrams + Math.round(secondPhaseGrams * k / strengthPours));
  }
  const startTimes = [0, SECOND_POUR_SEC, ...STRENGTH_STARTS[strengthPours]];

  const rate = recipe.pourRateGramsPerSec;
  const pours = targets.map((targetGrams, index) => {
    const deltaGrams = targetGrams - (index === 0 ? 0 : targets[index - 1]);
    return { index, startSec: startTimes[index], targetGrams, deltaGrams, durationSec: rate > 0 ? deltaGrams / rate : 0 };
  });

  const warnings = [];
  for (const pour of pours) {
    const slotEndSec = pour.index + 1 < pours.length ? pours[pour.index + 1].startSec : REMOVE_SEC;
    const slotSec = slotEndSec - pour.startSec;
    if (pour.durationSec > slotSec) {
      warnings.push(`Pour ${pour.index + 1} needs ${Math.ceil(pour.durationSec)} s at ${rate} g/s but has ${slotSec} s.`);
    }
  }

  return { totalGrams, firstPhaseGrams, pours, removeSec: REMOVE_SEC, warnings };
}
