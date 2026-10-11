export const LEAD_IN_MS = 3000;

const TICK_LEAD_SEC = [3, 2, 1];
const STALE_CUE_MS = 1000;
const PREVIEW_DELAY_MS = 3000;

export const formatClock = seconds => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

export function brewView(schedule, brewMs) {
  const { pours, removeSec } = schedule;
  const pourCount = pours.length;
  const removeMs = removeSec * 1000;

  if (brewMs < 0) {
    const first = pours[0];
    return {
      phase: 'leadIn', pourIndex: 0, pourCount,
      displayGrams: first.targetGrams, targetGrams: first.targetGrams, deltaGrams: first.deltaGrams,
      countdownSec: Math.ceil(-brewMs / 1000), countdownLabel: 'starting in',
      pourProgress: 0, intervalProgress: Math.max(0, (brewMs + LEAD_IN_MS) / LEAD_IN_MS), elapsedSec: 0,
      previewing: false,
    };
  }

  if (brewMs >= removeMs) {
    const last = pours[pourCount - 1];
    return {
      phase: 'done', pourIndex: pourCount - 1, pourCount,
      displayGrams: last.targetGrams, targetGrams: last.targetGrams, deltaGrams: last.deltaGrams,
      countdownSec: 0, countdownLabel: '',
      pourProgress: 1, intervalProgress: 1, elapsedSec: removeSec,
      previewing: false,
    };
  }

  let pourIndex = 0;
  for (const pour of pours) {
    if (pour.startSec * 1000 <= brewMs) pourIndex = pour.index;
  }
  const pour = pours[pourIndex];
  const isLast = pourIndex === pourCount - 1;
  const startMs = pour.startSec * 1000;
  const nextMs = isLast ? removeMs : pours[pourIndex + 1].startSec * 1000;
  const durationMs = pour.durationSec * 1000;
  const sincePourMs = brewMs - startMs;
  const isPouring = sincePourMs < durationMs;
  const pourProgress = isPouring ? sincePourMs / durationMs : 1;
  const previewing = !isLast && brewMs >= startMs + durationMs + PREVIEW_DELAY_MS;
  const shown = previewing ? pours[pourIndex + 1] : pour;

  return {
    phase: isPouring ? 'pouring' : isLast ? 'draining' : 'waiting',
    pourIndex, pourCount,
    displayGrams: shown.targetGrams,
    targetGrams: pour.targetGrams, deltaGrams: shown.deltaGrams,
    previewing,
    countdownSec: Math.ceil((nextMs - brewMs) / 1000),
    countdownLabel: isLast ? 'remove dripper in' : 'next pour in',
    pourProgress,
    intervalProgress: sincePourMs / (nextMs - startMs),
    elapsedSec: Math.floor(brewMs / 1000),
  };
}

export function cueEvents(schedule) {
  const moments = [
    ...schedule.pours.map(pour => ({ atSec: pour.startSec, kind: 'go' })),
    { atSec: schedule.removeSec, kind: 'remove' },
  ];
  const events = [];
  for (const moment of moments) {
    for (const leadSec of TICK_LEAD_SEC) events.push({ atMs: (moment.atSec - leadSec) * 1000, kind: 'tick' });
    events.push({ atMs: moment.atSec * 1000, kind: moment.kind });
  }
  schedule.pours.forEach((pour, index) => {
    if (pour.durationSec <= 0) return;
    const pingAtMs = Math.round((pour.startSec + pour.durationSec) * 1000);
    const nextAtMs = Math.round((schedule.pours[index + 1]?.startSec ?? schedule.removeSec) * 1000);
    if (pingAtMs < nextAtMs) events.push({ atMs: pingAtMs, kind: 'ping' });
  });
  return events.sort((a, b) => a.atMs - b.atMs);
}

export const dueCues = (events, previousBrewMs, brewMs) =>
  events.filter(event => event.atMs > previousBrewMs && event.atMs <= brewMs && event.atMs > brewMs - STALE_CUE_MS);
