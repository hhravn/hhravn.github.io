import { isValidRecipe } from './recipe.js';

const RECIPES_KEY = 'brew.recipes.v1';
const MUTED_KEY = 'brew.muted.v1';

export function loadRecipes() {
  try {
    const raw = globalThis.localStorage.getItem(RECIPES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isValidRecipe) : [];
  } catch (error) {
    console.warn('could not read recipes', error);
    return [];
  }
}

export function saveRecipes(recipes) {
  try {
    globalThis.localStorage.setItem(RECIPES_KEY, JSON.stringify(recipes));
    return true;
  } catch (error) {
    console.warn('could not save recipes', error);
    return false;
  }
}

export function loadMuted() {
  try {
    return globalThis.localStorage.getItem(MUTED_KEY) === 'true';
  } catch (error) {
    console.warn('could not read mute setting', error);
    return false;
  }
}

export function saveMuted(muted) {
  try {
    globalThis.localStorage.setItem(MUTED_KEY, String(muted));
  } catch (error) {
    console.warn('could not save mute setting', error);
  }
}
