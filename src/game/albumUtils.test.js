import { sortEntries, buildSetAlbum, countByTier, compareCardNumber, filterByPrice } from './albumUtils';

const PRICES = { common: 0.05, rare: 0.25, secret: 2.5 }; // 5, 25 y 250 monedas
const entry = (name, tier, obtainedAt = '2026-10-07T10:00:00Z') => ({
  card: { id: name, name, tier, setName: 'Base', number: '1', priceEur: PRICES[tier] },
  count: 1,
  obtainedAt,
});

const entries = [
  entry('Pikachu', 'common', '2026-10-07T10:00:00Z'),
  entry('Mewtwo', 'secret', '2026-10-07T09:00:00Z'),
  entry('Bulbasaur', 'rare', '2026-10-07T11:00:00Z'),
];

test('ordena por rareza en los dos sentidos', () => {
  expect(sortEntries(entries, 'tier-desc').map((e) => e.card.name)).toEqual(['Mewtwo', 'Bulbasaur', 'Pikachu']);
  expect(sortEntries(entries, 'tier-asc').map((e) => e.card.name)).toEqual(['Pikachu', 'Bulbasaur', 'Mewtwo']);
});

test('ordena por fecha y por nombre sin modificar el original', () => {
  expect(sortEntries(entries, 'recent')[0].card.name).toBe('Bulbasaur');
  expect(sortEntries(entries, 'name')[0].card.name).toBe('Bulbasaur');
  expect(entries[0].card.name).toBe('Pikachu');
});

test('cuenta cartas por rareza', () => {
  expect(countByTier(entries)).toEqual({ common: 1, secret: 1, rare: 1 });
});

test('los números de carta se ordenan como números', () => {
  const nums = ['10', '2', '1', 'TG05'].map((number) => ({ number }));
  expect(nums.sort(compareCardNumber).map((c) => c.number)).toEqual(['1', '2', '10', 'TG05']);
});

test('el álbum de una colección marca las que tienes y las que faltan', () => {
  const setCards = [
    { id: 'sv1-2', number: '2' },
    { id: 'sv1-1', number: '1' },
  ];
  const album = buildSetAlbum(setCards, { 'sv1-2': { count: 3 } });
  expect(album.map((a) => [a.card.id, a.owned, a.count])).toEqual([
    ['sv1-1', false, 0],
    ['sv1-2', true, 3],
  ]);
});

test('ordena y filtra por precio de venta', () => {
  expect(sortEntries(entries, 'price-desc').map((e) => e.card.name)).toEqual(['Mewtwo', 'Bulbasaur', 'Pikachu']);
  expect(sortEntries(entries, 'price-asc')[0].card.name).toBe('Pikachu');
  // común 5, rara 25, secreta 250
  expect(filterByPrice(entries, 10, 100).map((e) => e.card.name)).toEqual(['Bulbasaur']);
  expect(filterByPrice(entries, '', 25)).toHaveLength(2);
  expect(filterByPrice(entries, 26, '')).toHaveLength(1);
  expect(filterByPrice(entries, '', '')).toHaveLength(3);
});
