// src/services/pokemonService.js
import { getTier } from '../utils/rarity';
import { extractPriceEur, fillEstimatedPrices } from '../game/pricing';

const BASE_URL = 'https://api.pokemontcg.io/v2';
// La versión en las claves ("v3") separa la caché actual de las anteriores
// (v1: cartas completas; v2: cartas sin precio), que se borran solas al arrancar.
const SETS_CACHE_KEY = 'pokemon_sets_v2';
const CARDS_CACHE_PREFIX = 'pokemon_cards_v3_';
const LEGACY_CACHE = (key) =>
  key === 'pokemon_all_sets' || key.startsWith('pokemon_cards_set_') || key.startsWith('pokemon_cards_v2_');

try {
  Object.keys(localStorage).filter(LEGACY_CACHE).forEach((key) => localStorage.removeItem(key));
} catch {
  // Sin acceso a localStorage: no hay nada que limpiar.
}
const PAGE_SIZE = 250;

/*
  La API devuelve cada carta con decenas de campos (ataques, precios, legalidad…).
  Solo guardamos los que usa la app: así cada colección ocupa unas 10 veces menos
  en localStorage y caben muchas más antes de llegar al límite de ~5 MB.
*/
export const toSlimCard = (card) => ({
  id: card.id,
  name: card.name,
  number: card.number,
  rarity: card.rarity || 'Common',
  tier: getTier(card.rarity),
  setId: card.set?.id,
  setName: card.set?.name,
  image: card.images?.small,
  imageLarge: card.images?.large,
  ...extractPriceEur(card),
});

const toSlimSet = (set) => ({
  id: set.id,
  name: set.name,
  series: set.series,
  printedTotal: set.printedTotal,
  total: set.total,
  releaseDate: set.releaseDate,
  images: { logo: set.images?.logo, symbol: set.images?.symbol },
});

const readCache = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/** Borra las cartas cacheadas de todas las colecciones (no toca la partida). */
export const clearCardsCache = () => {
  Object.keys(localStorage)
    .filter((key) => key.startsWith(CARDS_CACHE_PREFIX))
    .forEach((key) => localStorage.removeItem(key));
};

/**
 * Guarda en caché. Si localStorage está lleno, vacía las cartas cacheadas
 * y lo intenta una vez más. Si sigue sin caber, la app funciona igual,
 * solo que volverá a pedir esa colección a la API la próxima vez.
 */
const writeCache = (key, value) => {
  const data = JSON.stringify(value);
  try {
    localStorage.setItem(key, data);
  } catch {
    clearCardsCache();
    try {
      localStorage.setItem(key, data);
    } catch {
      // Sin espacio: se sigue sin caché.
    }
  }
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class ApiError extends Error {
  constructor(status) {
    super(`La API respondió con el código ${status}`);
    this.retryable = status >= 500 || status === 429;
  }
}

/**
 * La API de Pokémon TCG falla a menudo de forma puntual: errores 500, 429 (demasiadas
 * peticiones) o respuestas cortadas que no son JSON válido. Se reintenta hasta
 * 3 veces, esperando 1, 2 y 3 segundos. Los errores 4xx (petición mal hecha) no
 * se reintentan.
 */
const fetchJson = async (url, retries = 3) => {
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new ApiError(response.status);
      return await response.json();
    } catch (error) {
      const retryable = error instanceof ApiError ? error.retryable : true;
      if (!retryable || attempt >= retries) throw error;
      await wait(1000 * (attempt + 1));
    }
  }
};

// Pedimos a la API solo los campos que usamos (incluidos los precios de mercado).
const CARD_FIELDS = 'id,name,number,rarity,set,images,cardmarket,tcgplayer';

/** Todas las colecciones, de la más reciente a la más antigua. */
export const getAllSets = async () => {
  const cached = readCache(SETS_CACHE_KEY);
  if (cached) return cached;

  const result = await fetchJson(`${BASE_URL}/sets?orderBy=-releaseDate`);
  const sets = result.data.map(toSlimSet);
  writeCache(SETS_CACHE_KEY, sets);
  return sets;
};

/** Todas las cartas de una colección (por ejemplo 'sv1'), en versión reducida. */
export const getCardsBySet = async (setId) => {
  const cacheKey = `${CARDS_CACHE_PREFIX}${setId}`;
  const cached = readCache(cacheKey);
  if (cached) return cached;

  let allCards = [];
  let page = 1;
  let totalCount = Infinity;

  while (allCards.length < totalCount) {
    const result = await fetchJson(
      `${BASE_URL}/cards?q=set.id:${setId}&pageSize=${PAGE_SIZE}&page=${page}&select=${CARD_FIELDS}`
    );
    allCards = [...allCards, ...result.data.map(toSlimCard)];
    totalCount = result.totalCount;
    if (result.data.length < PAGE_SIZE) break;
    page++;
  }

  const withPrices = fillEstimatedPrices(allCards);
  writeCache(cacheKey, withPrices);
  return withPrices;
};
