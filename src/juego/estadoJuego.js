import { obtenerNivel, esNivelMinimo } from '../utilidades/rareza';
import { precioPorCantidad, precioCartaMonedas } from './precios';

export const CLAVE_GUARDADO = 'pokepack_game_v1';
const CLAVE_COLECCION_ANTIGUA = 'poke_pack_user_collection';

export const MONEDAS_INICIALES = 1000;
export const COMODINES_INICIALES = 5;
export const LIMITE_HISTORIAL = 30;

export const PRECIO_MAXIMO_COMODIN = 600;

export const precioVenta = (carta) => precioCartaMonedas(carta);

export const MISIONES = [
  { id: 'open-3', texto: 'Abre 3 sobres', estadistica: 'packsOpened', objetivo: 3, recompensa: 300 },
  { id: 'hit-1', texto: 'Consigue una ultra rara o superior', estadistica: 'hitsPulled', objetivo: 1, recompensa: 500 },
  { id: 'sell-5', texto: 'Vende 5 cartas', estadistica: 'cardsSold', objetivo: 5, recompensa: 200 },
];

export const PREMIOS_GACHAPON = [
  { hasta: 60, monedas: 150, comodines: 0 },
  { hasta: 85, monedas: 400, comodines: 0 },
  { hasta: 100, monedas: 0, comodines: 1 },
];

export const claveDia = (fecha = new Date()) => {
  const d = new Date(fecha);
  const rellenar = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${rellenar(d.getMonth() + 1)}-${rellenar(d.getDate())}`;
};

const diarioVacio = (dia) => ({
  day: dia,
  packsOpened: 0,
  hitsPulled: 0,
  cardsSold: 0,
  claimedMissions: [],
});

export const crearEstadoInicial = () => ({
  coins: MONEDAS_INICIALES,
  wildcards: COMODINES_INICIALES,
  setPacks: {},
  packPrices: {},
  collection: {},
  history: [],
  lastSetId: null,
  lastGachaDay: null,
  daily: diarioVacio(claveDia()),
});

export const conDiaActual = (estado, ahora = new Date()) => {
  const hoy = claveDia(ahora);
  return estado.daily?.day === hoy ? estado : { ...estado, daily: diarioVacio(hoy) };
};

const sumarCartas = (miColeccion, cartas, obtenidaEn) => {
  const siguiente = { ...miColeccion };
  cartas.forEach((carta) => {
    const existente = siguiente[carta.id];
    siguiente[carta.id] = existente
      ? { ...existente, count: existente.count + 1 }
      : { card: carta, count: 1, obtainedAt: obtenidaEn };
  });
  return siguiente;
};

export function reductorJuego(estadoPrevio, accion) {
  const ahora = accion.ahora || new Date();
  const estado = conDiaActual(estadoPrevio, ahora);

  switch (accion.tipo) {
    case 'ABRIR_SOBRE': {
      const origen = origenSobre(estado, accion.idColeccion, accion.precioSobre);
      if (!origen) return estado;
      const fecha = new Date(ahora).toISOString();
      const especiales = accion.cartas.filter((c) => esNivelMinimo(c.tier, 'ultra')).length;
      const raras = accion.cartas
        .filter((c) => esNivelMinimo(c.tier, 'rare'))
        .map((carta) => ({ card: carta, at: fecha }));

      return {
        ...estado,
        ...(origen === 'coleccion'
          ? { setPacks: { ...estado.setPacks, [accion.idColeccion]: estado.setPacks[accion.idColeccion] - 1 } }
          : { wildcards: estado.wildcards - 1 }),
        collection: sumarCartas(estado.collection, accion.cartas, fecha),
        history: [...raras, ...estado.history].slice(0, LIMITE_HISTORIAL),
        lastSetId: accion.idColeccion ?? estado.lastSetId,
        daily: {
          ...estado.daily,
          packsOpened: estado.daily.packsOpened + 1,
          hitsPulled: estado.daily.hitsPulled + especiales,
        },
      };
    }

    case 'FIJAR_PRECIO_SOBRE':
      if (estado.packPrices[accion.idColeccion] === accion.precio) return estado;
      return { ...estado, packPrices: { ...estado.packPrices, [accion.idColeccion]: accion.precio } };

    case 'COMPRAR_SOBRES': {
      const coste = precioPorCantidad(accion.precioUnidad, accion.cantidad);
      if (!accion.idColeccion || accion.cantidad <= 0 || estado.coins < coste) return estado;
      return {
        ...estado,
        coins: estado.coins - coste,
        setPacks: {
          ...estado.setPacks,
          [accion.idColeccion]: (estado.setPacks[accion.idColeccion] || 0) + accion.cantidad,
        },
        packPrices: { ...estado.packPrices, [accion.idColeccion]: accion.precioUnidad },
      };
    }

    case 'ACTUALIZAR_PRECIOS': {
      const nuevas = {};
      accion.cartas.forEach((c) => (nuevas[c.id] = c));
      let hayCambios = false;
      const miColeccion = { ...estado.collection };
      Object.entries(miColeccion).forEach(([id, entrada]) => {
        const carta = nuevas[id];
        if (carta && carta.priceEur !== entrada.card.priceEur) {
          miColeccion[id] = {
            ...entrada,
            card: { ...entrada.card, priceEur: carta.priceEur, priceSource: carta.priceSource },
          };
          hayCambios = true;
        }
      });
      return hayCambios ? { ...estado, collection: miColeccion } : estado;
    }

    case 'VENDER_REPETIDA': {
      const entrada = estado.collection[accion.idCarta];
      if (!entrada || entrada.count < 2) return estado;
      return {
        ...estado,
        coins: estado.coins + precioVenta(entrada.card),
        collection: { ...estado.collection, [accion.idCarta]: { ...entrada, count: entrada.count - 1 } },
        daily: { ...estado.daily, cardsSold: estado.daily.cardsSold + 1 },
      };
    }

    case 'VENDER_CARTA': {
      const entrada = estado.collection[accion.idCarta];
      if (!entrada) return estado;
      const miColeccion = { ...estado.collection };
      if (entrada.count > 1) {
        miColeccion[accion.idCarta] = { ...entrada, count: entrada.count - 1 };
      } else {
        delete miColeccion[accion.idCarta];
      }
      return {
        ...estado,
        coins: estado.coins + precioVenta(entrada.card),
        collection: miColeccion,
        daily: { ...estado.daily, cardsSold: estado.daily.cardsSold + 1 },
      };
    }

    case 'VENDER_TODAS_REPETIDAS': {
      const { monedas, vendidas } = valorRepetidas(estado.collection);
      if (vendidas === 0) return estado;
      const miColeccion = {};
      Object.entries(estado.collection).forEach(([id, entrada]) => {
        miColeccion[id] = { ...entrada, count: 1 };
      });
      return {
        ...estado,
        coins: estado.coins + monedas,
        collection: miColeccion,
        daily: { ...estado.daily, cardsSold: estado.daily.cardsSold + vendidas },
      };
    }

    case 'RECLAMAR_GACHAPON': {
      if (!puedeReclamarGachapon(estado, ahora)) return estado;
      return {
        ...estado,
        coins: estado.coins + accion.premio.monedas,
        wildcards: estado.wildcards + accion.premio.comodines,
        lastGachaDay: claveDia(ahora),
      };
    }

    case 'RECLAMAR_MISION': {
      const mision = MISIONES.find((m) => m.id === accion.idMision);
      if (!mision || estadoMision(estado, mision) !== 'lista') return estado;
      return {
        ...estado,
        coins: estado.coins + mision.recompensa,
        daily: {
          ...estado.daily,
          claimedMissions: [...estado.daily.claimedMissions, mision.id],
        },
      };
    }

    case 'REINICIAR':
      return crearEstadoInicial();

    default:
      return estado;
  }
}

export const totalSobres = (estado) =>
  estado.wildcards + Object.values(estado.setPacks).reduce((suma, n) => suma + n, 0);

export const origenSobre = (estado, idColeccion, precioSobre) => {
  if ((estado.setPacks[idColeccion] || 0) > 0) return 'coleccion';
  if (estado.wildcards > 0 && precioSobre != null && precioSobre <= PRECIO_MAXIMO_COMODIN) return 'comodin';
  return null;
};

export const valorRepetidas = (miColeccion) =>
  Object.values(miColeccion).reduce(
    (acc, { card, count }) => {
      const sobrantes = count - 1;
      return {
        monedas: acc.monedas + sobrantes * precioVenta(card),
        vendidas: acc.vendidas + sobrantes,
      };
    },
    { monedas: 0, vendidas: 0 }
  );

export const mejoresRepetidas = (miColeccion, limite = 4) =>
  Object.values(miColeccion)
    .filter((entrada) => entrada.count > 1)
    .sort((a, b) => precioVenta(b.card) - precioVenta(a.card))
    .slice(0, limite);

export const puedeReclamarGachapon = (estado, ahora = new Date()) => estado.lastGachaDay !== claveDia(ahora);

export const sortearPremioGachapon = (aleatorio = Math.random) => {
  const tirada = aleatorio() * 100;
  return PREMIOS_GACHAPON.find((premio) => tirada < premio.hasta);
};

export const estadoMision = (estado, mision) => {
  if (estado.daily.claimedMissions.includes(mision.id)) return 'reclamada';
  return estado.daily[mision.estadistica] >= mision.objetivo ? 'lista' : 'pendiente';
};

export const progresoColeccion = (miColeccion, coleccion) => {
  if (!coleccion) return null;
  const tengo = Object.values(miColeccion).filter((e) => e.card.setId === coleccion.id).length;
  const total = coleccion.total || coleccion.printedTotal || 0;
  return { tengo, total, porcentaje: total ? Math.round((tengo / total) * 100) : 0 };
};

export const mejorCarta = (miColeccion) =>
  Object.values(miColeccion)
    .sort((a, b) => {
      const porPrecio = precioVenta(b.card) - precioVenta(a.card);
      return porPrecio !== 0 ? porPrecio : (b.obtainedAt || '').localeCompare(a.obtainedAt || '');
    })[0]?.card || null;

export const normalizarCarta = (carta) => {
  if (!carta || carta.image) return carta;
  return {
    id: carta.id,
    name: carta.name,
    number: carta.number,
    rarity: carta.rarity || 'Common',
    tier: carta.tier || obtenerNivel(carta.rarity),
    setId: carta.setId || carta.set?.id,
    setName: carta.setName || carta.set?.name,
    image: carta.images?.small,
    imageLarge: carta.images?.large,
  };
};

const migrarEconomia = (estado) => {
  if (typeof estado.packs !== 'number') return estado;
  const { packs, ...resto } = estado;
  return { ...resto, wildcards: (resto.wildcards || 0) + packs };
};

const normalizarEstado = (estado) => {
  const miColeccion = {};
  Object.entries(estado.collection || {}).forEach(([id, entrada]) => {
    miColeccion[id] = { ...entrada, card: normalizarCarta(entrada.card) };
  });
  const historial = (estado.history || []).map((h) => ({ ...h, card: normalizarCarta(h.card) }));
  return { ...estado, collection: miColeccion, history: historial };
};

const migrarColeccionAntigua = () => {
  try {
    const antigua = JSON.parse(localStorage.getItem(CLAVE_COLECCION_ANTIGUA) || 'null');
    if (!antigua) return null;
    const miColeccion = {};
    Object.values(antigua).forEach(({ cardData, count, obtainedAt }) => {
      if (!cardData) return;
      miColeccion[cardData.id] = {
        count,
        obtainedAt,
        card: {
          id: cardData.id,
          name: cardData.name,
          number: cardData.number,
          rarity: cardData.rarity || 'Common',
          tier: obtenerNivel(cardData.rarity),
          setId: cardData.set?.id,
          setName: cardData.set?.name,
          image: cardData.images?.small,
          imageLarge: cardData.images?.large,
        },
      };
    });
    return miColeccion;
  } catch {
    return null;
  }
};

export const cargarPartida = () => {
  try {
    const guardada = JSON.parse(localStorage.getItem(CLAVE_GUARDADO) || 'null');
    if (guardada) return conDiaActual(normalizarEstado({ ...crearEstadoInicial(), ...migrarEconomia(guardada) }));
  } catch {
  }
  const antigua = migrarColeccionAntigua();
  return antigua ? { ...crearEstadoInicial(), collection: antigua } : crearEstadoInicial();
};

export const guardarPartida = (estado) => {
  try {
    localStorage.setItem(CLAVE_GUARDADO, JSON.stringify(estado));
  } catch {
  }
};
