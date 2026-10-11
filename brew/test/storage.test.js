import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { CLASSIC } from '../recipe.js';
import { loadMuted, loadRecipes, saveMuted, saveRecipes } from '../storage.js';

class MemoryStorage {
  constructor() { this.items = new Map(); }
  getItem(key) { return this.items.has(key) ? this.items.get(key) : null; }
  setItem(key, value) { this.items.set(key, String(value)); }
}

class ThrowingStorage {
  getItem() { throw new Error('blocked'); }
  setItem() { throw new Error('blocked'); }
}

const useStorage = storage => Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true, writable: true });
const mine = { ...CLASSIC, id: 'a1', name: 'Mine' };

beforeEach(() => useStorage(new MemoryStorage()));

test('saved recipes load back', () => {
  assert.equal(saveRecipes([mine]), true);
  assert.deepEqual(loadRecipes(), [mine]);
});

test('empty storage gives no recipes and not muted', () => {
  assert.deepEqual(loadRecipes(), []);
  assert.equal(loadMuted(), false);
});

test('invalid stored entries are dropped, valid ones kept', () => {
  localStorage.setItem('brew.recipes.v1', JSON.stringify([mine, { ...mine, id: 'b2', balance: 'sour' }, 42]));
  assert.deepEqual(loadRecipes(), [mine]);
});

test('corrupt JSON gives no recipes', () => {
  localStorage.setItem('brew.recipes.v1', '{not json');
  assert.deepEqual(loadRecipes(), []);
});

test('non-array JSON gives no recipes', () => {
  localStorage.setItem('brew.recipes.v1', '{"id":"a1"}');
  assert.deepEqual(loadRecipes(), []);
});

test('mute flag round-trips', () => {
  saveMuted(true);
  assert.equal(loadMuted(), true);
  saveMuted(false);
  assert.equal(loadMuted(), false);
});

test('throwing storage degrades without crashing', () => {
  useStorage(new ThrowingStorage());
  assert.deepEqual(loadRecipes(), []);
  assert.equal(saveRecipes([mine]), false);
  assert.equal(loadMuted(), false);
  assert.doesNotThrow(() => saveMuted(true));
});

test('missing storage degrades without crashing', () => {
  useStorage(undefined);
  assert.deepEqual(loadRecipes(), []);
  assert.equal(saveRecipes([mine]), false);
});
