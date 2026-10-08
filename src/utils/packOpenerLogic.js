// src/utils/packOpenerLogic.js
import { getTier } from './rarity';

/** Barajado de Fisher-Yates: todas las ordenaciones son igual de probables. */
export const shuffle = (array, rng = Math.random) => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

/**
 * Probabilidad de cada nivel en la carta especial (la décima del sobre).
 * Los valores son acumulados: secreta 2 %, ilustración 5 %, ultra 18 %, rara 75 %.
 */
export const HIT_ODDS = [
  { tier: 'secret', upTo: 2 },
  { tier: 'illustration', upTo: 7 },
  { tier: 'ultra', upTo: 25 },
  { tier: 'rare', upTo: 100 },
];

export const rollHitTier = (rng = Math.random) => {
  const roll = rng() * 100;
  return HIT_ODDS.find((odd) => roll < odd.upTo).tier;
};

// Si una colección no tiene suficientes cartas de un nivel, se completa con
// el nivel más cercano: las comunes e infrecuentes suben, la especial baja.
const FALLBACKS = {
  common: ['common', 'uncommon', 'rare'],
  uncommon: ['uncommon', 'common', 'rare'],
  rare: ['rare', 'uncommon', 'common'],
  ultra: ['ultra', 'rare', 'uncommon', 'common'],
  illustration: ['illustration', 'ultra', 'rare', 'uncommon', 'common'],
  secret: ['secret', 'illustration', 'ultra', 'rare', 'uncommon', 'common'],
};

const pickFromTier = (byTier, tier, used, count, rng) => {
  const picked = [];
  for (const candidate of FALLBACKS[tier]) {
    if (picked.length === count) break;
    const available = (byTier[candidate] || []).filter((c) => !used.has(c.id));
    shuffle(available, rng)
      .slice(0, count - picked.length)
      .forEach((c) => {
        used.add(c.id);
        picked.push(c);
      });
  }
  return picked;
};

/**
 * Genera un sobre de 10 cartas sin repetidas dentro del mismo sobre:
 * 6 comunes, 3 infrecuentes y 1 carta especial según HIT_ODDS.
 */
export const generatePack = (allCardsInSet, rng = Math.random) => {
  if (!allCardsInSet || allCardsInSet.length === 0) return [];

  const byTier = {};
  allCardsInSet.forEach((card) => {
    const tier = card.tier || getTier(card.rarity);
    (byTier[tier] = byTier[tier] || []).push({ ...card, tier });
  });

  const used = new Set();
  const commons = pickFromTier(byTier, 'common', used, 6, rng);
  const uncommons = pickFromTier(byTier, 'uncommon', used, 3, rng);
  const hit = pickFromTier(byTier, rollHitTier(rng), used, 1, rng);

  return [...commons, ...uncommons, ...hit];
};
