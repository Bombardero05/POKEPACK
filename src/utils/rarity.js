// src/utils/rarity.js

/**
 * La API de Pokémon TCG no usa los mismos nombres de rareza en todas las
 * colecciones. Por ejemplo, las colecciones recientes usan "Ultra Rare" o
 * "Hyper Rare", mientras que las de Espada y Escudo usan "Rare Ultra",
 * "Rare Secret" o "Rare Holo VMAX".
 *
 * Esta función traduce cualquier nombre a uno de estos 6 niveles, que son los
 * que usa la lógica de sobres, el mercado y el álbum.
 */
export const TIERS = ['common', 'uncommon', 'rare', 'ultra', 'illustration', 'secret'];

export const TIER_LABELS = {
  common: 'Común',
  uncommon: 'Infrecuente',
  rare: 'Rara',
  ultra: 'Ultra rara',
  illustration: 'Ilustración rara',
  secret: 'Secreta',
};

export const getTier = (rarity) => {
  const r = (rarity || '').toLowerCase();

  if (!r || r === 'common') return 'common';
  if (r === 'uncommon') return 'uncommon';

  if (
    r.includes('secret') ||
    r.includes('hyper') ||
    r.includes('rainbow') ||
    r.includes('special illustration')
  ) {
    return 'secret';
  }

  if (r.includes('illustration') || r.includes('trainer gallery')) {
    return 'illustration';
  }

  if (
    r.includes('ultra') ||
    r.includes('double rare') ||
    r.includes('ace spec') ||
    r.includes('radiant') ||
    r.includes('amazing') ||
    r.includes('shiny') ||
    / (v|vmax|vstar|ex|gx|lv\.x)$/.test(r)
  ) {
    return 'ultra';
  }

  if (r.includes('rare') || r.includes('promo') || r.includes('legend')) {
    return 'rare';
  }

  return 'common';
};

/** Devuelve true si el nivel `tier` es igual o superior a `minTier`. */
export const isTierAtLeast = (tier, minTier) =>
  TIERS.indexOf(tier) >= TIERS.indexOf(minTier);
