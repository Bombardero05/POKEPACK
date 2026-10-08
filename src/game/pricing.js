// src/game/pricing.js
import { getTier } from '../utils/rarity';

/*
  PRECIOS

  Cartas
  - Precio real en euros de Cardmarket (el mercado europeo de referencia), que
    la API de Pokémon TCG incluye en cada carta: media de 30 días; si no hay,
    precio de tendencia; si no hay, media de venta.
  - Si Cardmarket no tiene precio, se usa TCGplayer (EE. UU.) pasado a euros.
  - Si ninguno tiene precio (pasa en las colecciones más nuevas), se estima:
    mediana de las cartas de la misma rareza en esa colección; si la colección
    no tiene ningún precio, la mediana de referencia de la era moderna
    (REFERENCE_EUR). En las cartas ultra raras o mejores de Pokémon muy
    buscados se multiplica por POPULAR_MULTIPLIER.

  Sobres
  - El valor esperado (EV) de un sobre es lo que valen de media sus 10 cartas
    con las probabilidades del juego. El precio es el mayor entre el precio de
    venta oficial de un sobre actual (BASE_PACK_EUR) y el EV más un 10 %.
    Así las colecciones con cartas caras (Base Set, 151…) tienen sobres caros.

  En el juego, 1 € = 100 monedas.
*/

export const COINS_PER_EURO = 100;

/** PVP de un sobre actual: caja de 36 sobres a 161,64 $ ≈ 4,49 $ por sobre. */
export const BASE_PACK_EUR = 4.5;
export const PACK_MARGIN = 1.1;

/**
 * Medianas por rareza (€) de 13 colecciones recientes (Escarlata y Púrpura y
 * Megaevolución) en Cardmarket, julio de 2026. Se usan para estimar.
 */
export const REFERENCE_EUR = {
  common: 0.04,
  uncommon: 0.05,
  rare: 0.09,
  ultra: 1.38,
  illustration: 5.96,
  secret: 17,
};

/**
 * En esas mismas colecciones, las cartas ultra raras o mejores de estos Pokémon
 * valen de mediana unas 2,9 veces más que las del resto. Se usa 2,5 para no
 * pasarse en la estimación.
 */
export const POPULAR_MULTIPLIER = 2.5;
const POPULAR = /charizard|pikachu|umbreon|eevee|espeon|sylveon|glaceon|leafeon|vaporeon|jolteon|flareon|\bmew\b|mewtwo|gengar|rayquaza|lugia|greninja|lucario|gardevoir|dragonite|snorlax|gyarados|blastoise|venusaur|mimikyu|giratina/i;

const HIGH_TIERS = ['ultra', 'illustration', 'secret'];
const round2 = (n) => Math.round(n * 100) / 100;

export const isPopular = (name) => POPULAR.test(name || '');

/** Precio en euros a partir de una carta tal como la devuelve la API. */
export const extractPriceEur = (apiCard) => {
  const cm = apiCard.cardmarket?.prices;
  const cardmarket = cm && (cm.avg30 || cm.trendPrice || cm.averageSellPrice);
  if (cardmarket > 0) return { priceEur: round2(cardmarket), priceSource: 'cardmarket' };

  const tcg = Object.values(apiCard.tcgplayer?.prices || {})
    .map((variant) => variant?.market)
    .filter((v) => v > 0);
  if (tcg.length > 0) return { priceEur: round2(Math.min(...tcg) * 0.92), priceSource: 'tcgplayer' };

  return { priceEur: null, priceSource: null };
};

const median = (values) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

const referenceEstimate = (card) => {
  const tier = card.tier || getTier(card.rarity);
  const base = REFERENCE_EUR[tier] ?? REFERENCE_EUR.common;
  return HIGH_TIERS.includes(tier) && isPopular(card.name) ? base * POPULAR_MULTIPLIER : base;
};

/** Pone precio estimado a las cartas de una colección que no tienen precio real. */
export const fillEstimatedPrices = (cards) => {
  const pricedByTier = {};
  cards.forEach((c) => {
    if (c.priceEur > 0) (pricedByTier[c.tier] = pricedByTier[c.tier] || []).push(c.priceEur);
  });

  return cards.map((card) => {
    if (card.priceEur > 0) return card;
    const setMedian = median(pricedByTier[card.tier] || []);
    const estimate = setMedian ?? referenceEstimate(card);
    return { ...card, priceEur: round2(Math.max(estimate, 0.02)), priceSource: 'estimado' };
  });
};

/** Precio en euros de una carta (real o estimado). */
export const cardPriceEur = (card) => (card?.priceEur > 0 ? card.priceEur : referenceEstimate(card || {}));

/** Precio de venta en monedas. Mínimo 1 moneda. */
export const cardPriceCoins = (card) => Math.max(1, Math.round(cardPriceEur(card) * COINS_PER_EURO));

/* ---------- Sobres ---------- */

// Igual que en packOpenerLogic: 6 comunes, 3 infrecuentes y 1 especial.
const HIT_SHARE = { secret: 0.02, illustration: 0.05, ultra: 0.18, rare: 0.75 };
const FALLBACKS = {
  common: ['common', 'uncommon', 'rare'],
  uncommon: ['uncommon', 'common', 'rare'],
  rare: ['rare', 'uncommon', 'common'],
  ultra: ['ultra', 'rare', 'uncommon', 'common'],
  illustration: ['illustration', 'ultra', 'rare', 'uncommon', 'common'],
  secret: ['secret', 'illustration', 'ultra', 'rare', 'uncommon', 'common'],
};

/** Valor esperado en euros de un sobre de esta colección. */
export const packExpectedValueEur = (setCards) => {
  const byTier = {};
  setCards.forEach((c) => (byTier[c.tier] = byTier[c.tier] || []).push(cardPriceEur(c)));
  const avg = (tier) => {
    const found = FALLBACKS[tier].find((t) => byTier[t]?.length);
    if (!found) return 0;
    return byTier[found].reduce((a, b) => a + b, 0) / byTier[found].length;
  };
  const hit = Object.entries(HIT_SHARE).reduce((sum, [tier, share]) => sum + share * avg(tier), 0);
  return round2(6 * avg('common') + 3 * avg('uncommon') + hit);
};

/** Precio del sobre en monedas, redondeado a decenas. */
export const packPriceCoins = (setCards) => {
  const eur = Math.max(BASE_PACK_EUR, packExpectedValueEur(setCards) * PACK_MARGIN);
  return Math.round((eur * COINS_PER_EURO) / 10) * 10;
};

/** Descuento por comprar varios sobres a la vez. */
export const BULK_DISCOUNTS = { 1: 0, 5: 0.05, 10: 0.1 };

export const bulkPrice = (unitPrice, qty) =>
  Math.round((unitPrice * qty * (1 - (BULK_DISCOUNTS[qty] || 0))) / 10) * 10;

export const formatEur = (eur) =>
  eur.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 });
