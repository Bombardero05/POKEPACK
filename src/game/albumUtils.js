// src/game/albumUtils.js
import { TIERS } from '../utils/rarity';
import { getSellPrice } from './gameState';

/** Ordena por número de carta: "2" antes que "10", y "TG05" detrás de los números. */
export const compareCardNumber = (a, b) =>
  String(a.number ?? '').localeCompare(String(b.number ?? ''), 'es', { numeric: true });

const tierRank = (card) => TIERS.indexOf(card.tier);

export const SORT_OPTIONS = [
  { id: 'tier-desc', label: 'Rareza: de mayor a menor' },
  { id: 'tier-asc', label: 'Rareza: de menor a mayor' },
  { id: 'price-desc', label: 'Precio: de mayor a menor' },
  { id: 'price-asc', label: 'Precio: de menor a mayor' },
  { id: 'recent', label: 'Más recientes' },
  { id: 'name', label: 'Nombre (A-Z)' },
  { id: 'set', label: 'Colección y número' },
];

const COMPARATORS = {
  'tier-desc': (a, b) => tierRank(b.card) - tierRank(a.card) || a.card.name.localeCompare(b.card.name, 'es'),
  'tier-asc': (a, b) => tierRank(a.card) - tierRank(b.card) || a.card.name.localeCompare(b.card.name, 'es'),
  'price-desc': (a, b) => getSellPrice(b.card) - getSellPrice(a.card) || a.card.name.localeCompare(b.card.name, 'es'),
  'price-asc': (a, b) => getSellPrice(a.card) - getSellPrice(b.card) || a.card.name.localeCompare(b.card.name, 'es'),
  recent: (a, b) => (b.obtainedAt || '').localeCompare(a.obtainedAt || ''),
  name: (a, b) => a.card.name.localeCompare(b.card.name, 'es'),
  set: (a, b) =>
    (a.card.setName || '').localeCompare(b.card.setName || '', 'es') || compareCardNumber(a.card, b.card),
};

/** Devuelve una copia ordenada de las entradas del álbum ({ card, count, obtainedAt }). */
export const sortEntries = (entries, sortId) => [...entries].sort(COMPARATORS[sortId] || COMPARATORS['tier-desc']);

/** Cuántas cartas distintas hay de cada rareza. */
export const countByTier = (entries) =>
  entries.reduce((acc, { card }) => ({ ...acc, [card.tier]: (acc[card.tier] || 0) + 1 }), {});

/**
 * Mezcla las cartas de una colección con lo que tiene el jugador.
 * Devuelve todas las cartas ordenadas por número, cada una con `owned` y `count`.
 */
export const buildSetAlbum = (setCards, collection) =>
  [...setCards].sort(compareCardNumber).map((card) => {
    const entry = collection[card.id];
    return { card, owned: Boolean(entry), count: entry?.count || 0 };
  });

/**
 * Filtra por precio de venta. `min` y `max` pueden venir vacíos ('' o null):
 * en ese caso ese límite no se aplica.
 */
export const filterByPrice = (entries, min, max) => {
  const lo = min === '' || min == null ? -Infinity : Number(min);
  const hi = max === '' || max == null ? Infinity : Number(max);
  return entries.filter(({ card }) => {
    const price = getSellPrice(card);
    return price >= lo && price <= hi;
  });
};
