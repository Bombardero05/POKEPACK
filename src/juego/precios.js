import { RESPALDOS_NIVEL, obtenerNivel } from '../utilidades/rareza';

export const MONEDAS_POR_EURO = 100;

export const PRECIO_BASE_SOBRE_EUR = 4.5;
export const MARGEN_SOBRE = 1.1;

export const PRECIO_REFERENCIA_EUR = {
  common: 0.04,
  uncommon: 0.05,
  rare: 0.09,
  ultra: 1.38,
  illustration: 5.96,
  secret: 17,
};

export const MULTIPLICADOR_POPULAR = 2.5;
const POPULARES = /charizard|pikachu|umbreon|eevee|espeon|sylveon|glaceon|leafeon|vaporeon|jolteon|flareon|\bmew\b|mewtwo|gengar|rayquaza|lugia|greninja|lucario|gardevoir|dragonite|snorlax|gyarados|blastoise|venusaur|mimikyu|giratina/i;

const NIVELES_ALTOS = ['ultra', 'illustration', 'secret'];
const redondear2 = (n) => Math.round(n * 100) / 100;

export const esPopular = (nombre) => POPULARES.test(nombre || '');

export const extraerPrecioEur = (cartaApi) => {
  const cm = cartaApi.cardmarket?.prices;
  const cardmarket = cm && (cm.avg30 || cm.trendPrice || cm.averageSellPrice);
  if (cardmarket > 0) return { priceEur: redondear2(cardmarket), priceSource: 'cardmarket' };

  const tcg = Object.values(cartaApi.tcgplayer?.prices || {})
    .map((variante) => variante?.market)
    .filter((v) => v > 0);
  if (tcg.length > 0) return { priceEur: redondear2(Math.min(...tcg) * 0.92), priceSource: 'tcgplayer' };

  return { priceEur: null, priceSource: null };
};

const mediana = (valores) => {
  if (valores.length === 0) return null;
  const ordenados = [...valores].sort((a, b) => a - b);
  return ordenados[Math.floor(ordenados.length / 2)];
};

const estimacionReferencia = (carta) => {
  const nivel = carta.tier || obtenerNivel(carta.rarity);
  const base = PRECIO_REFERENCIA_EUR[nivel] ?? PRECIO_REFERENCIA_EUR.common;
  return NIVELES_ALTOS.includes(nivel) && esPopular(carta.name) ? base * MULTIPLICADOR_POPULAR : base;
};

export const rellenarPreciosEstimados = (cartas) => {
  const conPrecioPorNivel = {};
  cartas.forEach((c) => {
    if (c.priceEur > 0) (conPrecioPorNivel[c.tier] = conPrecioPorNivel[c.tier] || []).push(c.priceEur);
  });

  return cartas.map((carta) => {
    if (carta.priceEur > 0) return carta;
    const medianaColeccion = mediana(conPrecioPorNivel[carta.tier] || []);
    const estimacion = medianaColeccion ?? estimacionReferencia(carta);
    return { ...carta, priceEur: redondear2(Math.max(estimacion, 0.02)), priceSource: 'estimado' };
  });
};

export const precioCartaEur = (carta) => (carta?.priceEur > 0 ? carta.priceEur : estimacionReferencia(carta || {}));

export const precioCartaMonedas = (carta) => Math.max(1, Math.round(precioCartaEur(carta) * MONEDAS_POR_EURO));

const REPARTO_ESPECIAL = { secret: 0.02, illustration: 0.05, ultra: 0.18, rare: 0.75 };

export const valorEsperadoSobreEur = (cartasColeccion) => {
  const porNivel = {};
  cartasColeccion.forEach((c) => (porNivel[c.tier] = porNivel[c.tier] || []).push(precioCartaEur(c)));
  const media = (nivel) => {
    const encontrado = RESPALDOS_NIVEL[nivel].find((n) => porNivel[n]?.length);
    if (!encontrado) return 0;
    return porNivel[encontrado].reduce((a, b) => a + b, 0) / porNivel[encontrado].length;
  };
  const especial = Object.entries(REPARTO_ESPECIAL).reduce((suma, [nivel, parte]) => suma + parte * media(nivel), 0);
  return redondear2(6 * media('common') + 3 * media('uncommon') + especial);
};

export const precioSobreMonedas = (cartasColeccion) => {
  const eur = Math.max(PRECIO_BASE_SOBRE_EUR, valorEsperadoSobreEur(cartasColeccion) * MARGEN_SOBRE);
  return Math.round((eur * MONEDAS_POR_EURO) / 10) * 10;
};

export const DESCUENTOS_POR_CANTIDAD = { 1: 0, 5: 0.05, 10: 0.1 };

export const precioPorCantidad = (precioUnidad, cantidad) =>
  Math.round((precioUnidad * cantidad * (1 - (DESCUENTOS_POR_CANTIDAD[cantidad] || 0))) / 10) * 10;

export const formatearEur = (eur) =>
  eur.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 });
