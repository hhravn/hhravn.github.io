import { buildSchedule } from './recipe.js';
import { LEAD_IN_MS, brewView, cueEvents, dueCues, formatClock } from './brew-view.js';
import { keepAwake, playCue, releaseAwake, unlockAudio } from './cues.js';
import { loadMuted, saveMuted } from './storage.js';

const speed = Number(new URLSearchParams(location.search).get('speed')) || 1;
const STEP_LABELS = { leadIn: 'Get ready', draining: 'Drain', done: 'Done' };

let session = null;

export function showBrew(container, recipe) {
  leaveBrew();
  const schedule = buildSchedule(recipe);
  container.innerHTML = `
    <section class="brew">
      <header class="brew-header">
        <span class="brew-meta number"></span>
        <span class="brew-elapsed number">0:00</span>
        <button class="brew-mute" data-brew="mute"></button>
      </header>
      <p class="brew-name"></p>
      <p class="brew-step"></p>
      <p class="brew-target number"><span class="brew-grams"></span><span class="brew-unit">g</span></p>
      <p class="brew-delta number"></p>
      <div class="brew-pace" aria-hidden="true"><div class="brew-pace-fill"></div></div>
      <p class="brew-countdown-label"></p>
      <p class="brew-countdown number"></p>
      <div class="brew-bar" aria-hidden="true"><div class="brew-bar-fill"></div></div>
      <ol class="brew-strip number"></ol>
      <div class="brew-controls"></div>
    </section>`;

  const element = selector => container.querySelector(selector);
  session = {
    recipe, schedule, container,
    events: cueEvents(schedule),
    state: 'ready',
    anchorMs: 0, pausedAtMs: 0, pausedTotalMs: 0,
    previousBrewMs: -LEAD_IN_MS - 1,
    frame: 0,
    muted: loadMuted(),
    rendered: {},
    elements: {
      elapsed: element('.brew-elapsed'), mute: element('.brew-mute'), step: element('.brew-step'),
      grams: element('.brew-grams'), delta: element('.brew-delta'), paceFill: element('.brew-pace-fill'),
      pace: element('.brew-pace'), countdownLabel: element('.brew-countdown-label'), countdown: element('.brew-countdown'),
      barFill: element('.brew-bar-fill'), strip: element('.brew-strip'), controls: element('.brew-controls'),
    },
  };

  element('.brew-meta').textContent = `4:6 · ${recipe.doseGrams}g · 1:${recipe.ratio} · ${recipe.kettleCelsius}°C`;
  element('.brew-name').textContent = recipe.name;
  session.elements.strip.innerHTML = schedule.pours.map(pour =>
    `<li><b>${pour.targetGrams}</b><span>${formatClock(pour.startSec)}</span></li>`).join('');

  container.addEventListener('click', onClick);
  document.addEventListener('visibilitychange', onVisibilityChange);
  renderMute();
  renderControls();
  render(brewView(schedule, -LEAD_IN_MS));
}

export function leaveBrew() {
  if (!session) return;
  cancelAnimationFrame(session.frame);
  session.container.removeEventListener('click', onClick);
  document.removeEventListener('visibilitychange', onVisibilityChange);
  releaseAwake().catch(error => console.warn('could not release wake lock', error));
  session = null;
}

const currentBrewMs = () => {
  const pausedNowMs = session.state === 'paused' ? Date.now() - session.pausedAtMs : 0;
  return (Date.now() - session.anchorMs - session.pausedTotalMs - pausedNowMs) * speed - LEAD_IN_MS;
};

function start() {
  unlockAudio();
  keepAwake();
  session.anchorMs = Date.now();
  session.pausedTotalMs = 0;
  session.previousBrewMs = -LEAD_IN_MS - 1;
  session.state = 'running';
  renderControls();
  session.frame = requestAnimationFrame(loop);
}

function loop() {
  if (!session || session.state !== 'running') return;
  const brewMs = currentBrewMs();
  for (const cue of dueCues(session.events, session.previousBrewMs, brewMs)) playCue(cue.kind, session.muted);
  session.previousBrewMs = brewMs;
  const view = brewView(session.schedule, brewMs);
  render(view);
  if (view.phase === 'done') return finish();
  session.frame = requestAnimationFrame(loop);
}

function pause() {
  session.state = 'paused';
  session.pausedAtMs = Date.now();
  cancelAnimationFrame(session.frame);
  renderControls();
}

function resume() {
  unlockAudio();
  keepAwake();
  session.pausedTotalMs += Date.now() - session.pausedAtMs;
  session.state = 'running';
  renderControls();
  session.frame = requestAnimationFrame(loop);
}

function stop() {
  const midBrew = session.state !== 'ready' && currentBrewMs() >= 0;
  if (midBrew && !confirm('Stop this brew?')) return;
  location.hash = '#/';
}

function finish() {
  session.state = 'done';
  releaseAwake().catch(error => console.warn('could not release wake lock', error));
  renderControls();
}

function onClick(event) {
  const button = event.target.closest('button[data-brew]');
  if (!button || !session) return;
  const action = button.dataset.brew;
  if (action === 'start') start();
  if (action === 'pause') pause();
  if (action === 'resume') resume();
  if (action === 'stop') stop();
  if (action === 'again') showBrew(session.container, session.recipe);
  if (action === 'recipes') location.hash = '#/';
  if (action === 'mute') {
    session.muted = !session.muted;
    saveMuted(session.muted);
    renderMute();
  }
}

function onVisibilityChange() {
  if (session?.state === 'running' && document.visibilityState === 'visible') {
    unlockAudio();
    keepAwake();
  }
}

function renderMute() {
  const { mute } = session.elements;
  mute.textContent = session.muted ? 'Sound off' : 'Sound on';
  mute.setAttribute('aria-pressed', String(session.muted));
}

function renderControls() {
  const buttons = {
    ready: '<button class="primary brew-start" data-brew="start">Start</button><button data-brew="recipes">Back</button>',
    running: '<button data-brew="pause">Pause</button><button data-brew="stop">Stop</button>',
    paused: '<button class="primary" data-brew="resume">Resume</button><button data-brew="stop">Stop</button>',
    done: '<button class="primary" data-brew="again">Brew again</button><button data-brew="recipes">Recipes</button>',
  };
  session.elements.controls.innerHTML = buttons[session.state];
}

function setText(key, element, text) {
  if (session.rendered[key] === text) return;
  session.rendered[key] = text;
  element.textContent = text;
}

function setScale(key, element, fraction) {
  const clamped = Math.min(1, Math.max(0, fraction));
  if (session.rendered[key] === clamped) return;
  session.rendered[key] = clamped;
  element.style.transform = `scaleX(${clamped})`;
}

function render(view) {
  const { elements } = session;
  const isDone = view.phase === 'done';
  setText('elapsed', elements.elapsed, formatClock(view.elapsedSec));
  setText('step', elements.step, STEP_LABELS[view.phase] ?? `Pour ${view.pourIndex + 1} of ${view.pourCount}`);
  setText('grams', elements.grams, String(view.displayGrams));
  setText('delta', elements.delta, isDone ? `total ${formatClock(view.elapsedSec)}` : `(+${view.deltaGrams} g)`);
  setText('countdownLabel', elements.countdownLabel, view.countdownLabel);
  setText('countdown', elements.countdown, isDone ? '' : formatClock(view.countdownSec));
  setScale('pace', elements.paceFill, view.phase === 'pouring' ? view.pourProgress : 0);
  setScale('bar', elements.barFill, view.intervalProgress);

  const stripKey = `${view.phase}:${view.pourIndex}`;
  if (session.rendered.strip === stripKey) return;
  session.rendered.strip = stripKey;
  [...elements.strip.children].forEach((item, index) => {
    const isPast = isDone || index < view.pourIndex || (index === view.pourIndex && view.phase === 'draining');
    item.classList.toggle('done', isPast);
    item.classList.toggle('current', !isPast && index === view.pourIndex && view.phase !== 'leadIn');
  });
}
