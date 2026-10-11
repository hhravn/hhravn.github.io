import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CLASSIC, buildSchedule } from '../recipe.js';
import { LEAD_IN_MS, brewView, cueEvents, dueCues, formatClock } from '../brew-view.js';

const schedule = buildSchedule(CLASSIC);
const unpaced = buildSchedule({ ...CLASSIC, pourRateGramsPerSec: 0 });

test('formatClock pads seconds', () => {
  assert.equal(formatClock(0), '0:00');
  assert.equal(formatClock(9), '0:09');
  assert.equal(formatClock(75), '1:15');
  assert.equal(formatClock(210), '3:30');
});

test('lead-in counts down to the first pour', () => {
  assert.equal(LEAD_IN_MS, 3000);
  const start = brewView(schedule, -3000);
  assert.equal(start.phase, 'leadIn');
  assert.equal(start.countdownSec, 3);
  assert.equal(start.countdownLabel, 'starting in');
  assert.equal(start.displayGrams, 48);
  assert.equal(start.targetGrams, 48);
  assert.equal(start.pourIndex, 0);
  assert.equal(start.pourCount, 5);
  assert.equal(start.intervalProgress, 0);
  assert.equal(start.previewing, false);
  assert.equal(start.elapsedSec, 0);
  assert.equal(brewView(schedule, -2500).countdownSec, 3);
  assert.equal(brewView(schedule, -1).countdownSec, 1);
});

test('during a pour the hero shows the target and the pace bar fills', () => {
  const atStart = brewView(schedule, 0);
  assert.equal(atStart.phase, 'pouring');
  assert.equal(atStart.pourIndex, 0);
  assert.equal(atStart.displayGrams, 48);
  assert.equal(atStart.previewing, false);
  assert.equal(atStart.countdownSec, 45);
  assert.equal(atStart.countdownLabel, 'next pour in');

  const halfway = brewView(schedule, 4800);
  assert.equal(halfway.displayGrams, 48);
  assert.equal(halfway.pourProgress, 0.5);

  const finished = brewView(schedule, 9600);
  assert.equal(finished.phase, 'waiting');
  assert.equal(finished.displayGrams, 48);
  assert.equal(finished.pourProgress, 1);
  assert.equal(finished.previewing, false);
});

test('three seconds after the pace bar fills the hero previews the next target', () => {
  const before = brewView(schedule, 12599);
  assert.equal(before.previewing, false);
  assert.equal(before.displayGrams, 48);

  const preview = brewView(schedule, 12600);
  assert.equal(preview.phase, 'waiting');
  assert.equal(preview.previewing, true);
  assert.equal(preview.pourIndex, 0);
  assert.equal(preview.targetGrams, 48);
  assert.equal(preview.displayGrams, 96);
  assert.equal(preview.deltaGrams, 48);
  assert.equal(preview.countdownSec, 33);

  assert.equal(brewView(schedule, 44999).previewing, true);
  const next = brewView(schedule, 45000);
  assert.equal(next.previewing, false);
  assert.equal(next.pourIndex, 1);
  assert.equal(next.displayGrams, 96);
});

test('preview carries the next pour delta when pours differ', () => {
  const sweet = buildSchedule({ ...CLASSIC, doseGrams: 20, balance: 'sweet' });
  const preview = brewView(sweet, 13000);
  assert.equal(preview.previewing, true);
  assert.equal(preview.displayGrams, 120);
  assert.equal(preview.deltaGrams, 70);
  assert.equal(brewView(sweet, 12999).previewing, false);
});

test('the instant of a pour belongs to the new pour', () => {
  const before = brewView(schedule, 44999);
  assert.equal(before.phase, 'waiting');
  assert.equal(before.pourIndex, 0);
  assert.equal(before.countdownSec, 1);

  const at = brewView(schedule, 45000);
  assert.equal(at.phase, 'pouring');
  assert.equal(at.pourIndex, 1);
  assert.equal(at.displayGrams, 96);
  assert.equal(at.targetGrams, 96);
  assert.equal(at.deltaGrams, 48);
});

test('interval progress runs from pour start to the next event', () => {
  assert.equal(brewView(schedule, 22500).intervalProgress, 0.5);
});

test('last pour counts down to removing the dripper, then drains', () => {
  const lastPour = brewView(schedule, 165000);
  assert.equal(lastPour.phase, 'pouring');
  assert.equal(lastPour.pourIndex, 4);
  assert.equal(lastPour.countdownLabel, 'remove dripper in');
  assert.equal(lastPour.countdownSec, 45);

  const draining = brewView(schedule, 175000);
  assert.equal(draining.phase, 'draining');
  assert.equal(draining.displayGrams, 240);
  assert.equal(draining.countdownSec, 35);
  assert.equal(draining.countdownLabel, 'remove dripper in');
  assert.equal(draining.previewing, false);
});

test('done at the remove time', () => {
  const done = brewView(schedule, 210000);
  assert.equal(done.phase, 'done');
  assert.equal(done.displayGrams, 240);
  assert.equal(done.pourIndex, 4);
  assert.equal(done.countdownSec, 0);
  assert.equal(done.elapsedSec, 210);
  assert.equal(done.previewing, false);
  assert.equal(brewView(schedule, 500000).phase, 'done');
});

test('pacing off previews three seconds after the pour starts', () => {
  const atStart = brewView(unpaced, 0);
  assert.equal(atStart.phase, 'waiting');
  assert.equal(atStart.displayGrams, 48);
  assert.equal(atStart.pourProgress, 1);
  assert.equal(atStart.previewing, false);
  assert.equal(brewView(unpaced, 2999).previewing, false);
  assert.equal(brewView(unpaced, 3000).displayGrams, 96);
});

test('the last pour never previews', () => {
  const draining = brewView(schedule, 200000);
  assert.equal(draining.phase, 'draining');
  assert.equal(draining.previewing, false);
  assert.equal(draining.displayGrams, 240);
});

test('elapsed seconds are floored', () => {
  assert.equal(brewView(schedule, 61500).elapsedSec, 61);
});

test('cueEvents ticks three times before every pour and before removing', () => {
  const events = cueEvents(schedule);
  assert.equal(events.length, 24);
  assert.deepEqual(events.slice(0, 5), [
    { atMs: -3000, kind: 'tick' },
    { atMs: -2000, kind: 'tick' },
    { atMs: -1000, kind: 'tick' },
    { atMs: 0, kind: 'go' },
    { atMs: 42000, kind: 'tick' },
  ]);
  assert.deepEqual(events.at(-1), { atMs: 210000, kind: 'remove' });
  assert.equal(events.filter(event => event.kind === 'go').length, 5);
  assert.equal(events.filter(event => event.kind === 'tick').length, 18);
  const times = events.map(event => event.atMs);
  assert.deepEqual(times, [...times].sort((a, b) => a - b));
});

test('dueCues fires events crossed since the previous frame', () => {
  const events = cueEvents(schedule);
  assert.deepEqual(dueCues(events, -3001, -2990), [{ atMs: -3000, kind: 'tick' }]);
  assert.deepEqual(dueCues(events, -10, 5), [{ atMs: 0, kind: 'go' }]);
  assert.deepEqual(dueCues(events, 5, 10), []);
});

test('dueCues skips stale events after a long gap', () => {
  const events = cueEvents(schedule);
  assert.deepEqual(dueCues(events, 5, 100000), []);
  assert.deepEqual(dueCues(events, 5, 90500), [{ atMs: 90000, kind: 'go' }]);
});
