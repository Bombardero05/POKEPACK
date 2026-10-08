import {
  gameReducer,
  createInitialState,
  duplicatesValue,
  missionStatus,
  setProgress,
  bestCard,
  rollGachaPrize,
  totalPacks,
  packSourceFor,
  loadGame,
  getSellPrice,
  MISSIONS,
  STARTING_COINS,
  STARTING_WILDCARDS,
  WILDCARD_MAX_PRICE,
} from './gameState';

// priceEur fijo para que las cuentas sean exactas: 1 € = 100 monedas.
const PRICES = { common: 0.05, uncommon: 0.1, rare: 0.25, ultra: 2, illustration: 6, secret: 20 };
const card = (id, tier, setId = 'sv1') => ({ id, name: id, tier, rarity: tier, setId, image: '', priceEur: PRICES[tier] });
const NOW = new Date('2026-10-07T12:00:00');
const TOMORROW = new Date('2026-10-08T12:00:00');
const CHEAP = 450; // precio de un sobre normal, se puede abrir con comodín

const openPack = (state, cards, now = NOW, packPrice = CHEAP) =>
  gameReducer(state, { type: 'OPEN_PACK', cards, setId: 'sv1', packPrice, now });

describe('abrir sobres', () => {
  test('sin sobres de la colección, gasta un comodín y guarda las cartas', () => {
    const state = openPack(createInitialState(), [card('a', 'common'), card('b', 'rare')]);
    expect(state.wildcards).toBe(STARTING_WILDCARDS - 1);
    expect(state.collection.a.count).toBe(1);
    expect(state.collection.b.count).toBe(1);
  });

  test('si tienes sobres de esa colección, se usan antes que los comodines', () => {
    let state = gameReducer(createInitialState(), { type: 'BUY_PACKS', setId: 'sv1', qty: 1, unitPrice: 450, now: NOW });
    state = openPack(state, [card('a', 'common')]);
    expect(state.setPacks.sv1).toBe(0);
    expect(state.wildcards).toBe(STARTING_WILDCARDS);
  });

  test('los comodines no sirven para colecciones caras', () => {
    const state = createInitialState();
    expect(packSourceFor(state, 'base1', WILDCARD_MAX_PRICE + 10)).toBe(null);
    expect(openPack(state, [card('a', 'common')], NOW, 20000)).toBe(state);
  });

  test('suma repetidas en lugar de duplicarlas', () => {
    let state = openPack(createInitialState(), [card('a', 'common')]);
    state = openPack(state, [card('a', 'common')]);
    expect(state.collection.a.count).toBe(2);
  });

  test('no abre si no quedan sobres', () => {
    const empty = { ...createInitialState(), wildcards: 0 };
    expect(openPack(empty, [card('a', 'common')]).collection).toEqual({});
  });

  test('solo las raras o superiores van al historial', () => {
    const state = openPack(createInitialState(), [card('a', 'common'), card('b', 'ultra')]);
    expect(state.history.map((h) => h.card.id)).toEqual(['b']);
    expect(state.daily.hitsPulled).toBe(1);
  });
});

describe('tienda', () => {
  test('comprar sobres de una colección resta monedas y los guarda en esa colección', () => {
    const state = gameReducer(createInitialState(), { type: 'BUY_PACKS', setId: 'sv1', qty: 1, unitPrice: 450, now: NOW });
    expect(state.coins).toBe(STARTING_COINS - 450);
    expect(state.setPacks.sv1).toBe(1);
    expect(totalPacks(state)).toBe(STARTING_WILDCARDS + 1);
  });

  test('comprar 5 tiene un 5 % de descuento', () => {
    const state = gameReducer(
      { ...createInitialState(), coins: 5000 },
      { type: 'BUY_PACKS', setId: 'sv1', qty: 5, unitPrice: 450, now: NOW }
    );
    expect(state.coins).toBe(5000 - 2140); // 2250 × 0,95 = 2137,5 → 2140
  });

  test('no se puede comprar sin monedas suficientes', () => {
    const poor = { ...createInitialState(), coins: 50 };
    expect(gameReducer(poor, { type: 'BUY_PACKS', setId: 'sv1', qty: 1, unitPrice: 450, now: NOW })).toBe(poor);
  });
});

describe('venta', () => {
  test('el precio de venta sale del valor de mercado: 1 € = 100 monedas', () => {
    expect(getSellPrice(card('x', 'ultra'))).toBe(200);
    expect(getSellPrice({ ...card('y', 'common'), priceEur: 0.001 })).toBe(1); // mínimo 1 moneda
  });

  test('vender una repetida da monedas y deja al menos una copia', () => {
    let state = openPack(createInitialState(), [card('x', 'ultra')]);
    state = openPack(state, [card('x', 'ultra')]);
    state = gameReducer(state, { type: 'SELL_DUPLICATE', cardId: 'x', now: NOW });
    expect(state.coins).toBe(STARTING_COINS + 200);
    expect(state.collection.x.count).toBe(1);
    expect(gameReducer(state, { type: 'SELL_DUPLICATE', cardId: 'x', now: NOW })).toBe(state);
  });

  test('vender todas las repetidas', () => {
    let state = openPack(createInitialState(), [card('a', 'common'), card('b', 'rare')]);
    state = openPack(state, [card('a', 'common'), card('b', 'rare')]);
    expect(duplicatesValue(state.collection)).toEqual({ coins: 5 + 25, sold: 2 });
    state = gameReducer(state, { type: 'SELL_ALL_DUPLICATES', now: NOW });
    expect(state.coins).toBe(STARTING_COINS + 30);
    expect(state.daily.cardsSold).toBe(2);
  });

  test('vender la última copia saca la carta del álbum', () => {
    let state = openPack(createInitialState(), [card('solo', 'rare')]);
    state = gameReducer(state, { type: 'SELL_CARD', cardId: 'solo', now: NOW });
    expect(state.collection.solo).toBe(undefined);
    expect(state.coins).toBe(STARTING_COINS + 25);
  });

  test('al refrescar precios, las cartas del álbum toman el precio nuevo', () => {
    let state = openPack(createInitialState(), [card('a', 'common')]);
    state = gameReducer(state, { type: 'REFRESH_PRICES', cards: [{ id: 'a', priceEur: 1.5, priceSource: 'cardmarket' }], now: NOW });
    expect(getSellPrice(state.collection.a.card)).toBe(150);
  });
});

describe('recompensas diarias', () => {
  test('el gachapón solo se puede reclamar una vez al día', () => {
    const prize = { coins: 150, wildcards: 0 };
    let state = gameReducer(createInitialState(), { type: 'CLAIM_GACHA', prize, now: NOW });
    state = gameReducer(state, { type: 'CLAIM_GACHA', prize, now: NOW });
    expect(state.coins).toBe(STARTING_COINS + 150);
    state = gameReducer(state, { type: 'CLAIM_GACHA', prize, now: TOMORROW });
    expect(state.coins).toBe(STARTING_COINS + 300);
  });

  test('premios del gachapón según la tirada', () => {
    expect(rollGachaPrize(() => 0.1).coins).toBe(150);
    expect(rollGachaPrize(() => 0.7).coins).toBe(400);
    expect(rollGachaPrize(() => 0.99).wildcards).toBe(1);
  });

  test('una misión pasa de pendiente a lista y a reclamada', () => {
    const mission = MISSIONS.find((m) => m.id === 'open-3');
    let state = createInitialState();
    for (let i = 0; i < 3; i++) state = openPack(state, [card(`c${i}`, 'common')]);
    expect(missionStatus(state, mission)).toBe('ready');
    const coins = state.coins;
    state = gameReducer(state, { type: 'CLAIM_MISSION', missionId: 'open-3', now: NOW });
    expect(state.coins).toBe(coins + mission.reward);
    expect(missionStatus(state, mission)).toBe('claimed');
  });

  test('las misiones se reinician al cambiar de día', () => {
    let state = openPack(createInitialState(), [card('a', 'common')]);
    state = gameReducer(state, { type: 'NOOP', now: TOMORROW });
    expect(state.daily.packsOpened).toBe(0);
  });
});

describe('selectores', () => {
  test('progreso del álbum por colección', () => {
    const state = openPack(createInitialState(), [card('a', 'common'), card('b', 'rare', 'sv2')]);
    expect(setProgress(state.collection, { id: 'sv1', total: 4 })).toEqual({ owned: 1, total: 4, percent: 25 });
  });

  test('la mejor carta es la más valiosa', () => {
    const state = openPack(createInitialState(), [card('a', 'common'), card('s', 'secret'), card('u', 'ultra')]);
    expect(bestCard(state.collection).id).toBe('s');
  });
});

describe('partidas guardadas', () => {
  test('las cartas con el formato antiguo recuperan su imagen', () => {
    localStorage.setItem('pokepack_game_v1', JSON.stringify({
      ...createInitialState(),
      collection: {
        'me5-10': { count: 1, obtainedAt: '2026-10-07T10:00:00.000Z', card: { id: 'me5-10', name: 'Vullaby', rarity: 'Common', tier: 'common', set: { id: 'me5' }, images: { small: 'https://img/small', large: 'https://img/large' } } },
      },
    }));
    const loaded = loadGame();
    expect(loaded.collection['me5-10'].card.image).toBe('https://img/small');
    expect(loaded.collection['me5-10'].card.setId).toBe('me5');
  });

  test('los sobres del sistema antiguo pasan a ser comodines', () => {
    const { wildcards, setPacks, packPrices, ...old } = createInitialState();
    localStorage.setItem('pokepack_game_v1', JSON.stringify({ ...old, packs: 3 }));
    const loaded = loadGame();
    expect(loaded.wildcards).toBe(3);
    expect(loaded.packs).toBe(undefined);
  });
});
