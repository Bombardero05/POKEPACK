import {
  extraerPrecioEur,
  rellenarPreciosEstimados,
  precioCartaMonedas,
  valorEsperadoSobreEur,
  precioSobreMonedas,
  precioPorCantidad,
  PRECIO_REFERENCIA_EUR,
  MULTIPLICADOR_POPULAR,
  PRECIO_BASE_SOBRE_EUR,
} from './precios';

describe('precio de una carta', () => {
  test('usa la media de 30 días de Cardmarket', () => {
    expect(extraerPrecioEur({ cardmarket: { prices: { avg30: 1.234, trendPrice: 9 } } })).toEqual({
      priceEur: 1.23,
      priceSource: 'cardmarket',
    });
  });

  test('si Cardmarket no tiene, usa TCGplayer en euros', () => {
    const resultado = extraerPrecioEur({ tcgplayer: { prices: { normal: { market: 2 }, holofoil: { market: 5 } } } });
    expect(resultado).toEqual({ priceEur: 1.84, priceSource: 'tcgplayer' });
  });

  test('sin precio en ninguno', () => {
    expect(extraerPrecioEur({})).toEqual({ priceEur: null, priceSource: null });
  });
});

describe('estimaciones', () => {
  test('estima con la mediana de la misma rareza en la colección', () => {
    const cartas = rellenarPreciosEstimados([
      { id: '1', tier: 'ultra', priceEur: 1 },
      { id: '2', tier: 'ultra', priceEur: 3 },
      { id: '3', tier: 'ultra', priceEur: 5 },
      { id: '4', tier: 'ultra', priceEur: null, name: 'Pidgey ex' },
    ]);
    expect(cartas[3]).toEqual(expect.objectContaining({ priceEur: 3, priceSource: 'estimado' }));
  });

  test('si la colección no tiene precios, usa la referencia moderna', () => {
    const [comun, popular, normal] = rellenarPreciosEstimados([
      { id: '1', tier: 'common', name: 'Rattata', priceEur: null },
      { id: '2', tier: 'secret', name: 'Charizard ex', priceEur: null },
      { id: '3', tier: 'secret', name: 'Kricketune ex', priceEur: null },
    ]);
    expect(comun.priceEur).toBe(PRECIO_REFERENCIA_EUR.common);
    expect(popular.priceEur).toBe(PRECIO_REFERENCIA_EUR.secret * MULTIPLICADOR_POPULAR);
    expect(normal.priceEur).toBe(PRECIO_REFERENCIA_EUR.secret);
  });

  test('1 € son 100 monedas', () => {
    expect(precioCartaMonedas({ priceEur: 12.5 })).toBe(1250);
  });
});

describe('precio de los sobres', () => {
  const coleccionBarata = [
    { tier: 'common', priceEur: 0.05 },
    { tier: 'uncommon', priceEur: 0.05 },
    { tier: 'rare', priceEur: 0.1 },
  ];

  test('el valor esperado suma 6 comunes, 3 infrecuentes y la especial ponderada', () => {
    expect(valorEsperadoSobreEur(coleccionBarata)).toBeCloseTo(0.55, 2);
  });

  test('una colección barata cuesta lo que un sobre actual', () => {
    expect(precioSobreMonedas(coleccionBarata)).toBe(PRECIO_BASE_SOBRE_EUR * 100);
  });

  test('una colección con cartas caras tiene el sobre más caro', () => {
    const cara = [...coleccionBarata, { tier: 'rare', priceEur: 200 }];
    expect(precioSobreMonedas(cara)).toBeGreaterThan(PRECIO_BASE_SOBRE_EUR * 100);
  });

  test('descuentos por volumen', () => {
    expect(precioPorCantidad(450, 1)).toBe(450);
    expect(precioPorCantidad(450, 10)).toBe(4050);
  });
});
