import {
  reductorJuego,
  crearEstadoInicial,
  conDiaActual,
  valorRepetidas,
  estadoMision,
  progresoColeccion,
  mejorCarta,
  sortearPremioGachapon,
  totalSobres,
  origenSobre,
  cargarPartida,
  precioVenta,
  CLAVE_GUARDADO,
  MISIONES,
  MONEDAS_INICIALES,
  COMODINES_INICIALES,
  PRECIO_MAXIMO_COMODIN,
} from './estadoJuego';

const PRECIOS = { common: 0.05, uncommon: 0.1, rare: 0.25, ultra: 2, illustration: 6, secret: 20 };
const carta = (id, nivel, idColeccion = 'sv1') => ({
  id,
  name: id,
  tier: nivel,
  rarity: nivel,
  setId: idColeccion,
  image: '',
  priceEur: PRECIOS[nivel],
});
const AHORA = new Date('2026-10-07T12:00:00');
const MANANA = new Date('2026-10-08T12:00:00');
const BARATO = 450;

const estadoDeHoy = () => conDiaActual(crearEstadoInicial(), AHORA);

const abrirSobre = (estado, cartas, ahora = AHORA, precioSobre = BARATO) =>
  reductorJuego(estado, { tipo: 'ABRIR_SOBRE', cartas, idColeccion: 'sv1', precioSobre, ahora });

describe('abrir sobres', () => {
  test('sin sobres de la colección, gasta un comodín y guarda las cartas', () => {
    const estado = abrirSobre(crearEstadoInicial(), [carta('a', 'common'), carta('b', 'rare')]);
    expect(estado.wildcards).toBe(COMODINES_INICIALES - 1);
    expect(estado.collection.a.count).toBe(1);
    expect(estado.collection.b.count).toBe(1);
  });

  test('si tienes sobres de esa colección, se usan antes que los comodines', () => {
    let estado = reductorJuego(crearEstadoInicial(), {
      tipo: 'COMPRAR_SOBRES',
      idColeccion: 'sv1',
      cantidad: 1,
      precioUnidad: 450,
      ahora: AHORA,
    });
    estado = abrirSobre(estado, [carta('a', 'common')]);
    expect(estado.setPacks.sv1).toBe(0);
    expect(estado.wildcards).toBe(COMODINES_INICIALES);
  });

  test('los comodines no sirven para colecciones caras', () => {
    const estado = estadoDeHoy();
    expect(origenSobre(estado, 'base1', PRECIO_MAXIMO_COMODIN + 10)).toBe(null);
    expect(abrirSobre(estado, [carta('a', 'common')], AHORA, 20000)).toBe(estado);
  });

  test('suma repetidas en lugar de duplicarlas', () => {
    let estado = abrirSobre(crearEstadoInicial(), [carta('a', 'common')]);
    estado = abrirSobre(estado, [carta('a', 'common')]);
    expect(estado.collection.a.count).toBe(2);
  });

  test('no abre si no quedan sobres', () => {
    const vacio = { ...crearEstadoInicial(), wildcards: 0 };
    expect(abrirSobre(vacio, [carta('a', 'common')]).collection).toEqual({});
  });

  test('solo las raras o superiores van al historial', () => {
    const estado = abrirSobre(crearEstadoInicial(), [carta('a', 'common'), carta('b', 'ultra')]);
    expect(estado.history.map((h) => h.card.id)).toEqual(['b']);
    expect(estado.daily.hitsPulled).toBe(1);
  });
});

describe('tienda', () => {
  test('comprar sobres de una colección resta monedas y los guarda en esa colección', () => {
    const estado = reductorJuego(crearEstadoInicial(), {
      tipo: 'COMPRAR_SOBRES',
      idColeccion: 'sv1',
      cantidad: 1,
      precioUnidad: 450,
      ahora: AHORA,
    });
    expect(estado.coins).toBe(MONEDAS_INICIALES - 450);
    expect(estado.setPacks.sv1).toBe(1);
    expect(totalSobres(estado)).toBe(COMODINES_INICIALES + 1);
  });

  test('comprar 5 tiene un 5 % de descuento', () => {
    const estado = reductorJuego(
      { ...crearEstadoInicial(), coins: 5000 },
      { tipo: 'COMPRAR_SOBRES', idColeccion: 'sv1', cantidad: 5, precioUnidad: 450, ahora: AHORA }
    );
    expect(estado.coins).toBe(5000 - 2140);
  });

  test('no se puede comprar sin monedas suficientes', () => {
    const pobre = { ...estadoDeHoy(), coins: 50 };
    expect(
      reductorJuego(pobre, { tipo: 'COMPRAR_SOBRES', idColeccion: 'sv1', cantidad: 1, precioUnidad: 450, ahora: AHORA })
    ).toBe(pobre);
  });
});

describe('venta', () => {
  test('el precio de venta sale del valor de mercado: 1 € = 100 monedas', () => {
    expect(precioVenta(carta('x', 'ultra'))).toBe(200);
    expect(precioVenta({ ...carta('y', 'common'), priceEur: 0.001 })).toBe(1);
  });

  test('vender una repetida da monedas y deja al menos una copia', () => {
    let estado = abrirSobre(crearEstadoInicial(), [carta('x', 'ultra')]);
    estado = abrirSobre(estado, [carta('x', 'ultra')]);
    estado = reductorJuego(estado, { tipo: 'VENDER_REPETIDA', idCarta: 'x', ahora: AHORA });
    expect(estado.coins).toBe(MONEDAS_INICIALES + 200);
    expect(estado.collection.x.count).toBe(1);
    expect(reductorJuego(estado, { tipo: 'VENDER_REPETIDA', idCarta: 'x', ahora: AHORA })).toBe(estado);
  });

  test('vender todas las repetidas', () => {
    let estado = abrirSobre(crearEstadoInicial(), [carta('a', 'common'), carta('b', 'rare')]);
    estado = abrirSobre(estado, [carta('a', 'common'), carta('b', 'rare')]);
    expect(valorRepetidas(estado.collection)).toEqual({ monedas: 5 + 25, vendidas: 2 });
    estado = reductorJuego(estado, { tipo: 'VENDER_TODAS_REPETIDAS', ahora: AHORA });
    expect(estado.coins).toBe(MONEDAS_INICIALES + 30);
    expect(estado.daily.cardsSold).toBe(2);
  });

  test('vender la última copia saca la carta del álbum', () => {
    let estado = abrirSobre(crearEstadoInicial(), [carta('solo', 'rare')]);
    estado = reductorJuego(estado, { tipo: 'VENDER_CARTA', idCarta: 'solo', ahora: AHORA });
    expect(estado.collection.solo).toBe(undefined);
    expect(estado.coins).toBe(MONEDAS_INICIALES + 25);
  });

  test('al refrescar precios, las cartas del álbum toman el precio nuevo', () => {
    let estado = abrirSobre(crearEstadoInicial(), [carta('a', 'common')]);
    estado = reductorJuego(estado, {
      tipo: 'ACTUALIZAR_PRECIOS',
      cartas: [{ id: 'a', priceEur: 1.5, priceSource: 'cardmarket' }],
      ahora: AHORA,
    });
    expect(precioVenta(estado.collection.a.card)).toBe(150);
  });
});

describe('recompensas diarias', () => {
  test('el gachapón solo se puede reclamar una vez al día', () => {
    const premio = { monedas: 150, comodines: 0 };
    let estado = reductorJuego(crearEstadoInicial(), { tipo: 'RECLAMAR_GACHAPON', premio, ahora: AHORA });
    estado = reductorJuego(estado, { tipo: 'RECLAMAR_GACHAPON', premio, ahora: AHORA });
    expect(estado.coins).toBe(MONEDAS_INICIALES + 150);
    estado = reductorJuego(estado, { tipo: 'RECLAMAR_GACHAPON', premio, ahora: MANANA });
    expect(estado.coins).toBe(MONEDAS_INICIALES + 300);
  });

  test('premios del gachapón según la tirada', () => {
    expect(sortearPremioGachapon(() => 0.1).monedas).toBe(150);
    expect(sortearPremioGachapon(() => 0.7).monedas).toBe(400);
    expect(sortearPremioGachapon(() => 0.99).comodines).toBe(1);
  });

  test('una misión pasa de pendiente a lista y a reclamada', () => {
    const mision = MISIONES.find((m) => m.id === 'open-3');
    let estado = crearEstadoInicial();
    for (let i = 0; i < 3; i++) estado = abrirSobre(estado, [carta(`c${i}`, 'common')]);
    expect(estadoMision(estado, mision)).toBe('lista');
    const monedas = estado.coins;
    estado = reductorJuego(estado, { tipo: 'RECLAMAR_MISION', idMision: 'open-3', ahora: AHORA });
    expect(estado.coins).toBe(monedas + mision.recompensa);
    expect(estadoMision(estado, mision)).toBe('reclamada');
  });

  test('las misiones se reinician al cambiar de día', () => {
    let estado = abrirSobre(crearEstadoInicial(), [carta('a', 'common')]);
    estado = reductorJuego(estado, { tipo: 'NADA', ahora: MANANA });
    expect(estado.daily.packsOpened).toBe(0);
  });
});

describe('selectores', () => {
  test('progreso del álbum por colección', () => {
    const estado = abrirSobre(crearEstadoInicial(), [carta('a', 'common'), carta('b', 'rare', 'sv2')]);
    expect(progresoColeccion(estado.collection, { id: 'sv1', total: 4 })).toEqual({
      tengo: 1,
      total: 4,
      porcentaje: 25,
    });
  });

  test('la mejor carta es la más valiosa', () => {
    const estado = abrirSobre(crearEstadoInicial(), [carta('a', 'common'), carta('s', 'secret'), carta('u', 'ultra')]);
    expect(mejorCarta(estado.collection).id).toBe('s');
  });
});

describe('partidas guardadas', () => {
  test('las cartas con el formato antiguo recuperan su imagen', () => {
    localStorage.setItem(CLAVE_GUARDADO, JSON.stringify({
      ...crearEstadoInicial(),
      collection: {
        'me5-10': { count: 1, obtainedAt: '2026-10-07T10:00:00.000Z', card: { id: 'me5-10', name: 'Vullaby', rarity: 'Common', tier: 'common', set: { id: 'me5' }, images: { small: 'https://img/small', large: 'https://img/large' } } },
      },
    }));
    const cargada = cargarPartida();
    expect(cargada.collection['me5-10'].card.image).toBe('https://img/small');
    expect(cargada.collection['me5-10'].card.setId).toBe('me5');
  });

  test('los sobres del sistema antiguo pasan a ser comodines', () => {
    const { wildcards, setPacks, packPrices, ...antigua } = crearEstadoInicial();
    localStorage.setItem(CLAVE_GUARDADO, JSON.stringify({ ...antigua, packs: 3 }));
    const cargada = cargarPartida();
    expect(cargada.wildcards).toBe(3);
    expect(cargada.packs).toBe(undefined);
  });
});
