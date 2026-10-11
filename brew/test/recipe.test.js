import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BALANCES, CLASSIC, buildSchedule, isValidRecipe } from '../recipe.js';

const recipe = overrides => ({ ...CLASSIC, ...overrides });
const targets = schedule => schedule.pours.map(pour => pour.targetGrams);
const starts = schedule => schedule.pours.map(pour => pour.startSec);

test('classic 16 g recipe gives five 48 g pours', () => {
  const schedule = buildSchedule(CLASSIC);
  assert.equal(schedule.totalGrams, 240);
  assert.equal(schedule.firstPhaseGrams, 96);
  assert.deepEqual(targets(schedule), [48, 96, 144, 192, 240]);
  assert.deepEqual(schedule.pours.map(pour => pour.deltaGrams), [48, 48, 48, 48, 48]);
  assert.deepEqual(starts(schedule), [0, 45, 90, 135, 165]);
  assert.deepEqual(schedule.pours.map(pour => pour.index), [0, 1, 2, 3, 4]);
  assert.equal(schedule.removeSec, 210);
  assert.deepEqual(schedule.warnings, []);
});

test('20 g sweet recipe matches the competition split', () => {
  const schedule = buildSchedule(recipe({ doseGrams: 20, balance: 'sweet' }));
  assert.equal(schedule.totalGrams, 300);
  assert.deepEqual(targets(schedule), [50, 120, 180, 240, 300]);
  assert.deepEqual(schedule.pours.map(pour => pour.deltaGrams), [50, 70, 60, 60, 60]);
});

test('single strength pour takes the whole 60 percent at 1:30', () => {
  const schedule = buildSchedule(recipe({ doseGrams: 20, strengthPours: 1 }));
  assert.deepEqual(targets(schedule), [60, 120, 300]);
  assert.deepEqual(starts(schedule), [0, 45, 90]);
});

test('balance sets the first pour share of the first 40 percent', () => {
  const firstPours = BALANCES.map(balance => buildSchedule(recipe({ doseGrams: 24, balance })).pours[0].targetGrams);
  assert.deepEqual(BALANCES, ['sweeter', 'sweet', 'balanced', 'bright', 'brighter']);
  assert.deepEqual(firstPours, [48, 60, 72, 84, 96]);
});

test('strength pour count sets the start times', () => {
  const startsFor = strengthPours => starts(buildSchedule(recipe({ strengthPours }))).slice(2);
  assert.deepEqual(startsFor(1), [90]);
  assert.deepEqual(startsFor(2), [90, 135]);
  assert.deepEqual(startsFor(3), [90, 135, 165]);
  assert.deepEqual(startsFor(4), [90, 120, 150, 180]);
});

test('awkward dose and ratio still land exactly on the total in whole grams', () => {
  const schedule = buildSchedule(recipe({ doseGrams: 17, ratio: 15.5, strengthPours: 4, balance: 'bright' }));
  assert.equal(schedule.totalGrams, 264);
  assert.equal(schedule.firstPhaseGrams, 106);
  assert.equal(schedule.pours[1].targetGrams, 106);
  assert.equal(schedule.pours.at(-1).targetGrams, 264);
  for (const pour of schedule.pours) {
    assert.ok(Number.isInteger(pour.targetGrams), `pour ${pour.index} target ${pour.targetGrams}`);
    assert.ok(pour.deltaGrams > 0);
  }
  const deltaSum = schedule.pours.reduce((sum, pour) => sum + pour.deltaGrams, 0);
  assert.equal(deltaSum, 264);
});

test('pour duration follows the pour rate', () => {
  const schedule = buildSchedule(CLASSIC);
  assert.deepEqual(schedule.pours.map(pour => pour.durationSec), [9.6, 9.6, 9.6, 9.6, 9.6]);
});

test('pacing off gives zero durations and no warnings', () => {
  const schedule = buildSchedule(recipe({ doseGrams: 40, pourRateGramsPerSec: 0 }));
  assert.deepEqual(schedule.pours.map(pour => pour.durationSec), [0, 0, 0, 0, 0]);
  assert.deepEqual(schedule.warnings, []);
});

test('warns when a pour cannot finish before the next one', () => {
  const schedule = buildSchedule(recipe({ doseGrams: 40, pourRateGramsPerSec: 3 }));
  assert.deepEqual(schedule.warnings, ['Pour 4 needs 40 s at 3 g/s but has 30 s.']);
});

test('isValidRecipe accepts classic and rejects out-of-range values', () => {
  assert.equal(isValidRecipe(CLASSIC), true);
  assert.equal(isValidRecipe(recipe({ pourRateGramsPerSec: 0 })), true);
  assert.equal(isValidRecipe(recipe({ ratio: 15.5 })), true);
  assert.equal(isValidRecipe(recipe({ balance: 'sour' })), false);
  assert.equal(isValidRecipe(recipe({ doseGrams: 7 })), false);
  assert.equal(isValidRecipe(recipe({ doseGrams: 16.5 })), false);
  assert.equal(isValidRecipe(recipe({ ratio: 15.25 })), false);
  assert.equal(isValidRecipe(recipe({ strengthPours: 5 })), false);
  assert.equal(isValidRecipe(recipe({ kettleCelsius: 92 })), false);
  assert.equal(isValidRecipe(recipe({ pourRateGramsPerSec: 2 })), false);
  assert.equal(isValidRecipe(recipe({ name: '  ' })), false);
  assert.equal(isValidRecipe(recipe({ id: '' })), false);
  assert.equal(isValidRecipe(recipe({ notes: 3 })), false);
  assert.equal(isValidRecipe(null), false);
  assert.equal(isValidRecipe('recipe'), false);
});
