import {
  extractPriceEur,
  fillEstimatedPrices,
  cardPriceCoins,
  packExpectedValueEur,
  packPriceCoins,
  bulkPrice,
  REFERENCE_EUR,
  POPULAR_MULTIPLIER,
  BASE_PACK_EUR,
} from './pricing';

describe('precio de una carta', () => {
  test('usa la media de 30 días de Cardmarket', () => {
    expect(extractPriceEur({ cardmarket: { prices: { avg30: 1.234, trendPrice: 9 } } })).toEqual({
      priceEur: 1.23,
      priceSource: 'cardmarket',
    });
  });

  test('si Cardmarket no tiene, usa TCGplayer en euros', () => {
    const result = extractPriceEur({ tcgplayer: { prices: { normal: { market: 2 }, holofoil: { market: 5 } } } });
    expect(result).toEqual({ priceEur: 1.84, priceSource: 'tcgplayer' });
  });

  test('sin precio en ninguno', () => {
    expect(extractPriceEur({})).toEqual({ priceEur: null, priceSource: null });
  });
});

describe('estimaciones', () => {
  test('estima con la mediana de la misma rareza en la colección', () => {
    const cards = fillEstimatedPrices([
      { id: '1', tier: 'ultra', priceEur: 1 },
      { id: '2', tier: 'ultra', priceEur: 3 },
      { id: '3', tier: 'ultra', priceEur: 5 },
      { id: '4', tier: 'ultra', priceEur: null, name: 'Pidgey ex' },
    ]);
    expect(cards[3]).toEqual(expect.objectContaining({ priceEur: 3, priceSource: 'estimado' }));
  });

  test('si la colección no tiene precios, usa la referencia moderna', () => {
    const [common, popular, normal] = fillEstimatedPrices([
      { id: '1', tier: 'common', name: 'Rattata', priceEur: null },
      { id: '2', tier: 'secret', name: 'Charizard ex', priceEur: null },
      { id: '3', tier: 'secret', name: 'Kricketune ex', priceEur: null },
    ]);
    expect(common.priceEur).toBe(REFERENCE_EUR.common);
    expect(popular.priceEur).toBe(REFERENCE_EUR.secret * POPULAR_MULTIPLIER);
    expect(normal.priceEur).toBe(REFERENCE_EUR.secret);
  });

  test('1 € son 100 monedas', () => {
    expect(cardPriceCoins({ priceEur: 12.5 })).toBe(1250);
  });
});

describe('precio de los sobres', () => {
  const cheapSet = [
    { tier: 'common', priceEur: 0.05 },
    { tier: 'uncommon', priceEur: 0.05 },
    { tier: 'rare', priceEur: 0.1 },
  ];

  test('el valor esperado suma 6 comunes, 3 infrecuentes y la especial ponderada', () => {
    // 6 × 0,05 + 3 × 0,05 + 0,10 (todas las especiales caen en rara)
    expect(packExpectedValueEur(cheapSet)).toBeCloseTo(0.55, 2);
  });

  test('una colección barata cuesta lo que un sobre actual', () => {
    expect(packPriceCoins(cheapSet)).toBe(BASE_PACK_EUR * 100);
  });

  test('una colección con cartas caras tiene el sobre más caro', () => {
    const expensive = [...cheapSet, { tier: 'rare', priceEur: 200 }];
    expect(packPriceCoins(expensive)).toBeGreaterThan(BASE_PACK_EUR * 100);
  });

  test('descuentos por volumen', () => {
    expect(bulkPrice(450, 1)).toBe(450);
    expect(bulkPrice(450, 10)).toBe(4050);
  });
});
