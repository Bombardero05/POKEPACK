import { generatePack, rollHitTier, shuffle } from './packOpenerLogic';
import { getTier } from './rarity';

const makeSet = (counts) =>
  Object.entries(counts).flatMap(([tier, n]) =>
    Array.from({ length: n }, (_, i) => ({ id: `${tier}-${i}`, name: `${tier} ${i}`, tier }))
  );

const fullSet = makeSet({ common: 60, uncommon: 40, rare: 20, ultra: 10, illustration: 6, secret: 4 });

describe('generatePack', () => {
  test('da 10 cartas: 6 comunes, 3 infrecuentes y 1 especial', () => {
    const pack = generatePack(fullSet);
    expect(pack).toHaveLength(10);
    expect(pack.slice(0, 6).every((c) => c.tier === 'common')).toBe(true);
    expect(pack.slice(6, 9).every((c) => c.tier === 'uncommon')).toBe(true);
    expect(['rare', 'ultra', 'illustration', 'secret']).toContain(pack[9].tier);
  });

  test('no repite cartas dentro del mismo sobre', () => {
    for (let i = 0; i < 200; i++) {
      const ids = generatePack(fullSet).map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  test('si la colección no tiene secretas, la especial baja de nivel', () => {
    const noSecrets = makeSet({ common: 10, uncommon: 5, rare: 3 });
    const alwaysSecret = () => 0; // tirada 0 → secreta
    expect(generatePack(noSecrets, alwaysSecret)[9].tier).toBe('rare');
  });

  test('completa el sobre aunque falten comunes', () => {
    const fewCommons = makeSet({ common: 2, uncommon: 10, rare: 5 });
    expect(generatePack(fewCommons)).toHaveLength(10);
  });

  test('colección vacía → sobre vacío', () => {
    expect(generatePack([])).toEqual([]);
  });
});

test('probabilidades de la carta especial', () => {
  expect(rollHitTier(() => 0.01)).toBe('secret');
  expect(rollHitTier(() => 0.05)).toBe('illustration');
  expect(rollHitTier(() => 0.2)).toBe('ultra');
  expect(rollHitTier(() => 0.9)).toBe('rare');
});

test('shuffle no pierde ni duplica elementos', () => {
  const input = [1, 2, 3, 4, 5, 6];
  expect([...shuffle(input)].sort()).toEqual(input);
});

describe('getTier traduce los nombres de rareza de la API', () => {
  test.each([
    ['Common', 'common'],
    ['Uncommon', 'uncommon'],
    ['Rare', 'rare'],
    ['Rare Holo', 'rare'],
    ['Double Rare', 'ultra'],
    ['Ultra Rare', 'ultra'],
    ['Rare Ultra', 'ultra'],
    ['Rare Holo V', 'ultra'],
    ['Rare Holo VMAX', 'ultra'],
    ['Illustration Rare', 'illustration'],
    ['Special Illustration Rare', 'secret'],
    ['Hyper Rare', 'secret'],
    ['Rare Secret', 'secret'],
    ['Rare Rainbow', 'secret'],
    [undefined, 'common'],
  ])('%s → %s', (rarity, tier) => {
    expect(getTier(rarity)).toBe(tier);
  });
});
