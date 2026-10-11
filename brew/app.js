import { BALANCES, CLASSIC, LIMITS, buildSchedule } from './recipe.js';
import { formatClock } from './brew-view.js';
import { loadRecipes, saveRecipes } from './storage.js';
import { leaveBrew, showBrew } from './brew-screen.js';

const app = document.getElementById('app');
const notice = document.getElementById('notice');
let recipes = loadRecipes();
let draft = null;
let noticeTimer;

const allRecipes = () => [CLASSIC, ...recipes];
const findRecipe = id => allRecipes().find(recipe => recipe.id === id);

const escapeHtml = text => text.replace(/[&<>"']/g, character => `&#${character.charCodeAt(0)};`);
const formatRatio = ratio => `1:${ratio}`;
const formatRate = rate => (rate === 0 ? 'off' : `${rate} g/s`);
const summary = recipe =>
  `${recipe.doseGrams} g · ${formatRatio(recipe.ratio)} · ${recipe.balance} · ${recipe.strengthPours} strength `
  + `${recipe.strengthPours === 1 ? 'pour' : 'pours'} · ${recipe.kettleCelsius}°C`;

function showNotice(text) {
  notice.textContent = text;
  notice.hidden = false;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => { notice.hidden = true; }, 4000);
}

function persist() {
  if (!saveRecipes(recipes)) showNotice('Could not save recipe');
}

function route() {
  leaveBrew();
  draft = null;
  const [, screen, id] = location.hash.split('/');
  if (screen === 'edit') return showEditor(id);
  const recipe = screen === 'brew' ? findRecipe(id) : null;
  if (recipe) return showBrew(app, recipe);
  if (location.hash !== '#/') {
    history.replaceState(null, '', '#/');
  }
  showList();
}

function showList() {
  const rows = allRecipes().map(recipe => `
    <li class="recipe">
      <p class="recipe-name">${escapeHtml(recipe.name)}</p>
      <p class="recipe-summary">${escapeHtml(summary(recipe))}</p>
      <div class="recipe-actions">
        <button class="primary" data-action="brew" data-id="${escapeHtml(recipe.id)}">Brew</button>
        <button data-action="edit" data-id="${escapeHtml(recipe.id)}">${recipe.id === CLASSIC.id ? 'Customize' : 'Edit'}</button>
        <button data-action="duplicate" data-id="${escapeHtml(recipe.id)}">Duplicate</button>
        ${recipe.id === CLASSIC.id ? '' : `<button class="danger" data-action="delete" data-id="${escapeHtml(recipe.id)}">Delete</button>`}
      </div>
    </li>`).join('');
  app.innerHTML = `
    <div class="toolbar"><h1>Brew</h1><button data-action="new">New recipe</button></div>
    <ul class="recipe-list">${rows}</ul>`;
}

function copyOf(recipe, name) {
  return { ...recipe, id: crypto.randomUUID(), name };
}

function onListAction(action, id) {
  const recipe = findRecipe(id);
  if (action === 'new') location.hash = '#/edit/new';
  if (action === 'brew') location.hash = `#/brew/${id}`;
  if (action === 'edit') location.hash = `#/edit/${id}`;
  if (action === 'duplicate' && recipe) {
    recipes = [...recipes, copyOf(recipe, `${recipe.name} copy`)];
    persist();
    showList();
  }
  if (action === 'delete' && recipe && confirm(`Delete "${recipe.name}"?`)) {
    recipes = recipes.filter(candidate => candidate.id !== id);
    persist();
    showList();
  }
}

function showEditor(id) {
  const existing = findRecipe(id);
  if (id === 'new' || !existing) draft = copyOf(CLASSIC, 'My 4:6');
  else if (existing.id === CLASSIC.id) draft = copyOf(CLASSIC, '4:6 classic copy');
  else draft = { ...existing };
  renderEditor();
}

function stepper(field, label, display, hint = '') {
  const value = draft[field];
  const { min, max } = LIMITS[field];
  const atMin = field === 'pourRateGramsPerSec' ? value === 0 : value <= min;
  return `
    <div class="field">
      <span class="field-label">${label}</span>
      <div class="stepper">
        <button data-action="step" data-field="${field}" data-direction="-1" aria-label="Decrease ${label}" ${atMin ? 'disabled' : ''}>−</button>
        <output>${display(value)}</output>
        <button data-action="step" data-field="${field}" data-direction="1" aria-label="Increase ${label}" ${value >= max ? 'disabled' : ''}>+</button>
      </div>
      ${hint ? `<span class="field-hint">${hint}</span>` : ''}
    </div>`;
}

function segmented(field, label, options) {
  const buttons = options.map(option => `
    <button data-action="set" data-field="${field}" data-value="${option}" aria-pressed="${draft[field] === option}">${option}</button>`).join('');
  return `<div class="field"><span class="field-label">${label}</span><div class="segmented">${buttons}</div></div>`;
}

function textField(field, label, multiline = false) {
  const value = escapeHtml(draft[field]);
  const input = multiline
    ? `<textarea data-field="${field}">${value}</textarea>`
    : `<input type="text" data-field="${field}" value="${value}">`;
  return `<label class="field"><span class="field-label">${label}</span>${input}</label>`;
}

function previewHtml() {
  const schedule = buildSchedule(draft);
  const rows = schedule.pours.map(pour => `
    <tr><td>${formatClock(pour.startSec)}</td><td>${pour.targetGrams} g</td><td>+${pour.deltaGrams} g</td></tr>`).join('');
  const warnings = schedule.warnings.map(warning => `<p class="warning">${escapeHtml(warning)}</p>`).join('');
  return `
    <h2>Schedule · ${schedule.totalGrams} g water</h2>
    <table class="preview">
      <thead><tr><th>Time</th><th>Scale</th><th>Pour</th></tr></thead>
      <tbody>${rows}<tr><td>${formatClock(schedule.removeSec)}</td><td colspan="2">Remove dripper</td></tr></tbody>
    </table>
    ${warnings}`;
}

function renderEditor() {
  const strengthOptions = [1, 2, 3, 4];
  app.innerHTML = `
    <h1>Recipe</h1>
    ${textField('name', 'Name')}
    ${stepper('doseGrams', 'Coffee', value => `${value} g`)}
    ${stepper('ratio', 'Ratio', formatRatio)}
    ${segmented('balance', 'Balance (first 40%)', BALANCES)}
    ${segmented('strengthPours', 'Strength pours (last 60%)', strengthOptions)}
    ${stepper('kettleCelsius', 'Kettle', value => `${value}°C`, 'Roast hint: light 95 · medium 90 · dark 85')}
    ${stepper('pourRateGramsPerSec', 'Pour rate', formatRate, 'Pace guide during each pour. Off shows only the target.')}
    ${textField('grind', 'Grind')}
    ${textField('notes', 'Notes', true)}
    <div id="preview">${previewHtml()}</div>
    <div class="form-actions">
      <button data-action="cancel">Cancel</button>
      <button class="primary" data-action="save">Save</button>
    </div>`;
}

function stepValue(field, value, direction) {
  const { min, max, step } = LIMITS[field];
  if (field === 'pourRateGramsPerSec') {
    if (value === 0) return direction > 0 ? min : 0;
    if (value === min && direction < 0) return 0;
  }
  return Math.min(max, Math.max(min, value + direction * step));
}

function onEditorAction(action, button) {
  const field = button.dataset.field;
  if (action === 'step') {
    draft[field] = stepValue(field, draft[field], Number(button.dataset.direction));
    renderEditor();
  }
  if (action === 'set') {
    draft[field] = field === 'strengthPours' ? Number(button.dataset.value) : button.dataset.value;
    renderEditor();
  }
  if (action === 'cancel') location.hash = '#/';
  if (action === 'save') {
    const name = draft.name.trim();
    if (!name) return showNotice('Give the recipe a name');
    const saved = { ...draft, name };
    const index = recipes.findIndex(recipe => recipe.id === saved.id);
    recipes = index === -1 ? [...recipes, saved] : recipes.map(recipe => (recipe.id === saved.id ? saved : recipe));
    persist();
    location.hash = '#/';
  }
}

app.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button || !app.contains(button)) return;
  const action = button.dataset.action;
  if (draft && location.hash.startsWith('#/edit/')) onEditorAction(action, button);
  else onListAction(action, button.dataset.id);
});

app.addEventListener('input', event => {
  const field = event.target.dataset.field;
  if (!draft || !field) return;
  draft[field] = event.target.value;
});

window.addEventListener('hashchange', route);
route();
