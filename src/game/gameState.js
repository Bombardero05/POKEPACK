// src/game/gameState.js
import { getTier, isTierAtLeast } from '../utils/rarity';
import { bulkPrice, cardPriceCoins } from './pricing';

/*
  Todo el estado de la partida vive en un único objeto que se guarda en
  localStorage. Los cambios se hacen con un reducer (gameReducer): cada acción
  recibe el estado anterior y devuelve uno nuevo, sin modificar el anterior.
  Así la lógica se puede probar sin React (ver gameState.test.js).
*/

export const STORAGE_KEY = 'pokepack_game_v1';
const LEGACY_COLLECTION_KEY = 'poke_pack_user_collection';

export const STARTING_COINS = 1000;
export const STARTING_WILDCARDS = 5;
export const HISTORY_LIMIT = 30;

/**
 * Los sobres comodín (los del inicio y el gachapón) sirven para cualquier
 * colección cuyo sobre cueste como mucho esto. Las colecciones más caras
 * (Base Set, 151…) solo se abren con sobres comprados de esa colección.
 */
export const WILDCARD_MAX_PRICE = 600;

/** Precio de venta de una carta en monedas: su valor de mercado (ver pricing.js). */
export const getSellPrice = (card) => cardPriceCoins(card);

export const MISSIONS = [
  { id: 'open-3', label: 'Abre 3 sobres', stat: 'packsOpened', goal: 3, reward: 300 },
  { id: 'hit-1', label: 'Consigue una ultra rara o superior', stat: 'hitsPulled', goal: 1, reward: 500 },
  { id: 'sell-5', label: 'Vende 5 cartas', stat: 'cardsSold', goal: 5, reward: 200 },
];

/** Premios del gachapón diario. `upTo` es la probabilidad acumulada en %. */
export const GACHA_PRIZES = [
  { upTo: 60, coins: 150, wildcards: 0 },
  { upTo: 85, coins: 400, wildcards: 0 },
  { upTo: 100, coins: 0, wildcards: 1 },
];

/** Fecha local en formato AAAA-MM-DD. Sirve para saber si ha cambiado el día. */
export const dayKey = (date = new Date()) => {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const emptyDaily = (day) => ({
  day,
  packsOpened: 0,
  hitsPulled: 0,
  cardsSold: 0,
  claimedMissions: [],
});

export const createInitialState = () => ({
  coins: STARTING_COINS,
  wildcards: STARTING_WILDCARDS, // sobres comodín
  setPacks: {}, // sobres comprados, por colección: { sv1: 3 }
  packPrices: {}, // último precio calculado del sobre de cada colección
  collection: {},
  history: [],
  lastSetId: null,
  lastGachaDay: null,
  daily: emptyDaily(dayKey()),
});

/** Las estadísticas diarias se reinician solas cuando cambia el día. */
export const withCurrentDay = (state, now = new Date()) => {
  const today = dayKey(now);
  return state.daily?.day === today ? state : { ...state, daily: emptyDaily(today) };
};

const addCards = (collection, cards, obtainedAt) => {
  const next = { ...collection };
  cards.forEach((card) => {
    const existing = next[card.id];
    next[card.id] = existing
      ? { ...existing, count: existing.count + 1 }
      : { card, count: 1, obtainedAt };
  });
  return next;
};

export function gameReducer(rawState, action) {
  const now = action.now || new Date();
  const state = withCurrentDay(rawState, now);

  switch (action.type) {
    case 'OPEN_PACK': {
      const source = packSourceFor(state, action.setId, action.packPrice);
      if (!source) return state;
      const at = new Date(now).toISOString();
      const hits = action.cards.filter((c) => isTierAtLeast(c.tier, 'ultra')).length;
      const rares = action.cards
        .filter((c) => isTierAtLeast(c.tier, 'rare'))
        .map((card) => ({ card, at }));

      return {
        ...state,
        ...(source === 'set'
          ? { setPacks: { ...state.setPacks, [action.setId]: state.setPacks[action.setId] - 1 } }
          : { wildcards: state.wildcards - 1 }),
        collection: addCards(state.collection, action.cards, at),
        history: [...rares, ...state.history].slice(0, HISTORY_LIMIT),
        lastSetId: action.setId ?? state.lastSetId,
        daily: {
          ...state.daily,
          packsOpened: state.daily.packsOpened + 1,
          hitsPulled: state.daily.hitsPulled + hits,
        },
      };
    }

    case 'SET_PACK_PRICE':
      if (state.packPrices[action.setId] === action.price) return state;
      return { ...state, packPrices: { ...state.packPrices, [action.setId]: action.price } };

    case 'BUY_PACKS': {
      const cost = bulkPrice(action.unitPrice, action.qty);
      if (!action.setId || action.qty <= 0 || state.coins < cost) return state;
      return {
        ...state,
        coins: state.coins - cost,
        setPacks: { ...state.setPacks, [action.setId]: (state.setPacks[action.setId] || 0) + action.qty },
        packPrices: { ...state.packPrices, [action.setId]: action.unitPrice },
      };
    }

    case 'REFRESH_PRICES': {
      // Actualiza el precio guardado de las cartas que ya tienes.
      const fresh = {};
      action.cards.forEach((c) => (fresh[c.id] = c));
      let changed = false;
      const collection = { ...state.collection };
      Object.entries(collection).forEach(([id, entry]) => {
        const card = fresh[id];
        if (card && card.priceEur !== entry.card.priceEur) {
          collection[id] = { ...entry, card: { ...entry.card, priceEur: card.priceEur, priceSource: card.priceSource } };
          changed = true;
        }
      });
      return changed ? { ...state, collection } : state;
    }

    case 'SELL_DUPLICATE': {
      const entry = state.collection[action.cardId];
      if (!entry || entry.count < 2) return state;
      return {
        ...state,
        coins: state.coins + getSellPrice(entry.card),
        collection: { ...state.collection, [action.cardId]: { ...entry, count: entry.count - 1 } },
        daily: { ...state.daily, cardsSold: state.daily.cardsSold + 1 },
      };
    }

    case 'SELL_CARD': {
      // Vende una copia. Si es la última, la carta sale del álbum.
      const entry = state.collection[action.cardId];
      if (!entry) return state;
      const collection = { ...state.collection };
      if (entry.count > 1) {
        collection[action.cardId] = { ...entry, count: entry.count - 1 };
      } else {
        delete collection[action.cardId];
      }
      return {
        ...state,
        coins: state.coins + getSellPrice(entry.card),
        collection,
        daily: { ...state.daily, cardsSold: state.daily.cardsSold + 1 },
      };
    }

    case 'SELL_ALL_DUPLICATES': {
      const { coins, sold } = duplicatesValue(state.collection);
      if (sold === 0) return state;
      const collection = {};
      Object.entries(state.collection).forEach(([id, entry]) => {
        collection[id] = { ...entry, count: 1 };
      });
      return {
        ...state,
        coins: state.coins + coins,
        collection,
        daily: { ...state.daily, cardsSold: state.daily.cardsSold + sold },
      };
    }

    case 'CLAIM_GACHA': {
      if (!canClaimGacha(state, now)) return state;
      return {
        ...state,
        coins: state.coins + action.prize.coins,
        wildcards: state.wildcards + action.prize.wildcards,
        lastGachaDay: dayKey(now),
      };
    }

    case 'CLAIM_MISSION': {
      const mission = MISSIONS.find((m) => m.id === action.missionId);
      if (!mission || missionStatus(state, mission) !== 'ready') return state;
      return {
        ...state,
        coins: state.coins + mission.reward,
        daily: {
          ...state.daily,
          claimedMissions: [...state.daily.claimedMissions, mission.id],
        },
      };
    }

    case 'RESET':
      return createInitialState();

    default:
      return state;
  }
}

/* ---------- Funciones de lectura (selectores) ---------- */

export const totalPacks = (state) =>
  state.wildcards + Object.values(state.setPacks).reduce((sum, n) => sum + n, 0);

/**
 * Con qué sobre se abriría esta colección: 'set' (uno comprado de esa colección),
 * 'wildcard' (comodín, si el sobre no es de los caros) o null (no tienes ninguno).
 */
export const packSourceFor = (state, setId, packPrice) => {
  if ((state.setPacks[setId] || 0) > 0) return 'set';
  if (state.wildcards > 0 && packPrice != null && packPrice <= WILDCARD_MAX_PRICE) return 'wildcard';
  return null;
};

export const duplicatesValue = (collection) =>
  Object.values(collection).reduce(
    (acc, { card, count }) => {
      const extra = count - 1;
      return {
        coins: acc.coins + extra * getSellPrice(card),
        sold: acc.sold + extra,
      };
    },
    { coins: 0, sold: 0 }
  );

/** Repetidas ordenadas de mayor a menor valor de venta. */
export const topDuplicates = (collection, limit = 4) =>
  Object.values(collection)
    .filter((entry) => entry.count > 1)
    .sort((a, b) => getSellPrice(b.card) - getSellPrice(a.card))
    .slice(0, limit);

export const canClaimGacha = (state, now = new Date()) => state.lastGachaDay !== dayKey(now);

export const rollGachaPrize = (rng = Math.random) => {
  const roll = rng() * 100;
  return GACHA_PRIZES.find((p) => roll < p.upTo);
};

/** 'claimed' | 'ready' | 'pending' */
export const missionStatus = (state, mission) => {
  if (state.daily.claimedMissions.includes(mission.id)) return 'claimed';
  return state.daily[mission.stat] >= mission.goal ? 'ready' : 'pending';
};

/** Progreso del álbum en una colección: cartas distintas conseguidas / total. */
export const setProgress = (collection, set) => {
  if (!set) return null;
  const owned = Object.values(collection).filter((e) => e.card.setId === set.id).length;
  const total = set.total || set.printedTotal || 0;
  return { owned, total, percent: total ? Math.round((owned / total) * 100) : 0 };
};

/** La mejor carta conseguida: la de nivel más alto y, a igualdad, la más reciente. */
export const bestCard = (collection) =>
  Object.values(collection)
    .sort((a, b) => {
      const byTier = getSellPrice(b.card) - getSellPrice(a.card);
      return byTier !== 0 ? byTier : b.obtainedAt.localeCompare(a.obtainedAt);
    })[0]?.card || null;

/* ---------- Guardado ---------- */

/**
 * Asegura que una carta tiene el formato reducido ({ image, tier… }).
 * Las cartas guardadas con versiones anteriores traen el formato completo
 * de la API ({ images: { small } }) y sin esto se verían sin imagen.
 */
export const normalizeCard = (card) => {
  if (!card || card.image) return card;
  return {
    id: card.id,
    name: card.name,
    number: card.number,
    rarity: card.rarity || 'Common',
    tier: card.tier || getTier(card.rarity),
    setId: card.setId || card.set?.id,
    setName: card.setName || card.set?.name,
    image: card.images?.small,
    imageLarge: card.images?.large,
  };
};

// Antes había un único contador de sobres ("packs"): pasan a ser comodines.
const migrateEconomy = (state) => {
  if (typeof state.packs !== 'number') return state;
  const { packs, ...rest } = state;
  return { ...rest, wildcards: (rest.wildcards || 0) + packs };
};

const normalizeState = (state) => {
  const collection = {};
  Object.entries(state.collection || {}).forEach(([id, entry]) => {
    collection[id] = { ...entry, card: normalizeCard(entry.card) };
  });
  const history = (state.history || []).map((h) => ({ ...h, card: normalizeCard(h.card) }));
  return { ...state, collection, history };
};

// Convierte la colección del formato antiguo (cartas completas de la API).
const migrateLegacyCollection = () => {
  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_COLLECTION_KEY) || 'null');
    if (!legacy) return null;
    const collection = {};
    Object.values(legacy).forEach(({ cardData, count, obtainedAt }) => {
      if (!cardData) return;
      collection[cardData.id] = {
        count,
        obtainedAt,
        card: {
          id: cardData.id,
          name: cardData.name,
          number: cardData.number,
          rarity: cardData.rarity || 'Common',
          tier: getTier(cardData.rarity),
          setId: cardData.set?.id,
          setName: cardData.set?.name,
          image: cardData.images?.small,
          imageLarge: cardData.images?.large,
        },
      };
    });
    // No se borra la clave antigua: React (StrictMode) puede llamar a loadGame
    // dos veces y la segunda la necesita. Al guardar, ya se usa la clave nueva.
    return collection;
  } catch {
    return null;
  }
};

export const loadGame = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved) return withCurrentDay(normalizeState({ ...createInitialState(), ...migrateEconomy(saved) }));
  } catch {
    // Partida dañada: se empieza de cero.
  }
  const legacy = migrateLegacyCollection();
  return legacy ? { ...createInitialState(), collection: legacy } : createInitialState();
};

export const saveGame = (state) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Si no cabe, se mantiene en memoria hasta la próxima acción.
  }
};
