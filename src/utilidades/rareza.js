export const NIVELES = ['common', 'uncommon', 'rare', 'ultra', 'illustration', 'secret'];

export const NOMBRES_NIVEL = {
  common: 'Común',
  uncommon: 'Infrecuente',
  rare: 'Rara',
  ultra: 'Ultra rara',
  illustration: 'Ilustración rara',
  secret: 'Secreta',
};

export const RESPALDOS_NIVEL = {
  common: ['common', 'uncommon', 'rare'],
  uncommon: ['uncommon', 'common', 'rare'],
  rare: ['rare', 'uncommon', 'common'],
  ultra: ['ultra', 'rare', 'uncommon', 'common'],
  illustration: ['illustration', 'ultra', 'rare', 'uncommon', 'common'],
  secret: ['secret', 'illustration', 'ultra', 'rare', 'uncommon', 'common'],
};

export const obtenerNivel = (rareza) => {
  const r = (rareza || '').toLowerCase();

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

export const esNivelMinimo = (nivel, nivelMinimo) =>
  NIVELES.indexOf(nivel) >= NIVELES.indexOf(nivelMinimo);
