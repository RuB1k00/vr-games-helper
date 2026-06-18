const { getStore } = require('@netlify/blobs');
const defaultGames = require('../../../data/default-games.json');

const STORE_NAME = 'vr-game-finder';
const KEY = 'catalog';

function cloneDefaults() {
  return defaultGames.map((game) => ({ ...game, t: Array.isArray(game.t) ? [...game.t] : [] }));
}

function envValue(...names) {
  for (const name of names) {
    const value = process.env[name];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function getCatalogStore() {
  // В Netlify Functions Blobs обычно должны настраиваться автоматически.
  // Но на некоторых деплоях/режимах совместимости автоматический контекст не передается.
  // Поэтому поддерживаем ручную настройку через переменные окружения.
  const siteID = envValue('NETLIFY_BLOBS_SITE_ID', 'BLOBS_SITE_ID', 'NETLIFY_SITE_ID', 'SITE_ID');
  const token = envValue('NETLIFY_BLOBS_TOKEN', 'BLOBS_TOKEN', 'NETLIFY_AUTH_TOKEN');

  const options = { name: STORE_NAME, consistency: 'strong' };
  if (siteID && token) {
    options.siteID = siteID;
    options.token = token;
  }

  return getStore(options);
}

async function loadCatalog() {
  const store = getCatalogStore();
  const stored = await store.get(KEY, { type: 'json', consistency: 'strong' });
  if (!stored) {
    const payload = { games: cloneDefaults(), updatedAt: new Date().toISOString() };
    await store.setJSON(KEY, payload);
    return payload;
  }
  if (Array.isArray(stored)) {
    return { games: stored, updatedAt: null };
  }
  if (!Array.isArray(stored.games)) {
    return { games: cloneDefaults(), updatedAt: null };
  }
  return stored;
}

async function saveCatalog(games) {
  const payload = { games, updatedAt: new Date().toISOString() };
  const store = getCatalogStore();
  await store.setJSON(KEY, payload);
  return payload;
}

async function resetCatalog() {
  return saveCatalog(cloneDefaults());
}

module.exports = { loadCatalog, saveCatalog, resetCatalog, cloneDefaults };
