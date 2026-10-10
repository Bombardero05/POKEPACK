import { obtenerNivel } from '../utilidades/rareza';
import { extraerPrecioEur, rellenarPreciosEstimados } from '../juego/precios';

const URL_BASE = 'https://api.pokemontcg.io/v2';

const CLAVE_CACHE_COLECCIONES = 'pokemon_sets_v2';
const PREFIJO_CACHE_CARTAS = 'pokemon_cards_v3_';
const esCacheAntigua = (clave) =>
  clave === 'pokemon_all_sets' || clave.startsWith('pokemon_cards_set_') || clave.startsWith('pokemon_cards_v2_');

try {
  Object.keys(localStorage).filter(esCacheAntigua).forEach((clave) => localStorage.removeItem(clave));
} catch {
}

const TAMANO_PAGINA = 250;

export const reducirCarta = (carta) => ({
  id: carta.id,
  name: carta.name,
  number: carta.number,
  rarity: carta.rarity || 'Common',
  tier: obtenerNivel(carta.rarity),
  setId: carta.set?.id,
  setName: carta.set?.name,
  image: carta.images?.small,
  imageLarge: carta.images?.large,
  ...extraerPrecioEur(carta),
});

const reducirColeccion = (coleccion) => ({
  id: coleccion.id,
  name: coleccion.name,
  series: coleccion.series,
  printedTotal: coleccion.printedTotal,
  total: coleccion.total,
  releaseDate: coleccion.releaseDate,
  images: { logo: coleccion.images?.logo, symbol: coleccion.images?.symbol },
});

const leerCache = (clave) => {
  try {
    const texto = localStorage.getItem(clave);
    return texto ? JSON.parse(texto) : null;
  } catch {
    return null;
  }
};

export const borrarCacheCartas = () => {
  Object.keys(localStorage)
    .filter((clave) => clave.startsWith(PREFIJO_CACHE_CARTAS))
    .forEach((clave) => localStorage.removeItem(clave));
};

const escribirCache = (clave, valor) => {
  const datos = JSON.stringify(valor);
  try {
    localStorage.setItem(clave, datos);
  } catch {
    borrarCacheCartas();
    try {
      localStorage.setItem(clave, datos);
    } catch {
    }
  }
};

const esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

class ErrorApi extends Error {
  constructor(codigo) {
    super(`La API respondió con el código ${codigo}`);
    this.reintentable = codigo >= 500 || codigo === 429;
  }
}

const pedirJson = async (url, reintentos = 3) => {
  for (let intento = 0; ; intento++) {
    try {
      const respuesta = await fetch(url);
      if (!respuesta.ok) throw new ErrorApi(respuesta.status);
      return await respuesta.json();
    } catch (error) {
      const reintentable = error instanceof ErrorApi ? error.reintentable : true;
      if (!reintentable || intento >= reintentos) throw error;
      await esperar(1000 * (intento + 1));
    }
  }
};

const CAMPOS_CARTA = 'id,name,number,rarity,set,images,cardmarket,tcgplayer';

export const obtenerColecciones = async () => {
  const enCache = leerCache(CLAVE_CACHE_COLECCIONES);
  if (enCache) return enCache;

  const resultado = await pedirJson(`${URL_BASE}/sets?orderBy=-releaseDate`);
  const colecciones = resultado.data.map(reducirColeccion);
  escribirCache(CLAVE_CACHE_COLECCIONES, colecciones);
  return colecciones;
};

export const obtenerCartasColeccion = async (idColeccion) => {
  const claveCache = `${PREFIJO_CACHE_CARTAS}${idColeccion}`;
  const enCache = leerCache(claveCache);
  if (enCache) return enCache;

  let todasLasCartas = [];
  let pagina = 1;
  let totalCartas = Infinity;

  while (todasLasCartas.length < totalCartas) {
    const resultado = await pedirJson(
      `${URL_BASE}/cards?q=set.id:${idColeccion}&pageSize=${TAMANO_PAGINA}&page=${pagina}&select=${CAMPOS_CARTA}`
    );
    todasLasCartas = [...todasLasCartas, ...resultado.data.map(reducirCarta)];
    totalCartas = resultado.totalCount;
    if (resultado.data.length < TAMANO_PAGINA) break;
    pagina++;
  }

  const conPrecios = rellenarPreciosEstimados(todasLasCartas);
  escribirCache(claveCache, conPrecios);
  return conPrecios;
};
