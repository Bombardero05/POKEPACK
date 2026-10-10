import { generarSobre, sortearNivelEspecial, barajar } from './logicaSobres';
import { obtenerNivel } from './rareza';

const crearColeccion = (cantidades) =>
  Object.entries(cantidades).flatMap(([nivel, n]) =>
    Array.from({ length: n }, (_, i) => ({ id: `${nivel}-${i}`, name: `${nivel} ${i}`, tier: nivel }))
  );

const coleccionCompleta = crearColeccion({ common: 60, uncommon: 40, rare: 20, ultra: 10, illustration: 6, secret: 4 });

describe('generarSobre', () => {
  test('da 10 cartas: 6 comunes, 3 infrecuentes y 1 especial', () => {
    const sobre = generarSobre(coleccionCompleta);
    expect(sobre).toHaveLength(10);
    expect(sobre.slice(0, 6).every((c) => c.tier === 'common')).toBe(true);
    expect(sobre.slice(6, 9).every((c) => c.tier === 'uncommon')).toBe(true);
    expect(['rare', 'ultra', 'illustration', 'secret']).toContain(sobre[9].tier);
  });

  test('no repite cartas dentro del mismo sobre', () => {
    for (let i = 0; i < 200; i++) {
      const ids = generarSobre(coleccionCompleta).map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  test('si la colección no tiene secretas, la especial baja de nivel', () => {
    const sinSecretas = crearColeccion({ common: 10, uncommon: 5, rare: 3 });
    const siempreSecreta = () => 0;
    expect(generarSobre(sinSecretas, siempreSecreta)[9].tier).toBe('rare');
  });

  test('completa el sobre aunque falten comunes', () => {
    const pocasComunes = crearColeccion({ common: 2, uncommon: 10, rare: 5 });
    expect(generarSobre(pocasComunes)).toHaveLength(10);
  });

  test('colección vacía → sobre vacío', () => {
    expect(generarSobre([])).toEqual([]);
  });
});

test('probabilidades de la carta especial', () => {
  expect(sortearNivelEspecial(() => 0.01)).toBe('secret');
  expect(sortearNivelEspecial(() => 0.05)).toBe('illustration');
  expect(sortearNivelEspecial(() => 0.2)).toBe('ultra');
  expect(sortearNivelEspecial(() => 0.9)).toBe('rare');
});

test('barajar no pierde ni duplica elementos', () => {
  const lista = [1, 2, 3, 4, 5, 6];
  expect([...barajar(lista)].sort()).toEqual(lista);
});

describe('obtenerNivel traduce los nombres de rareza de la API', () => {
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
  ])('%s → %s', (rareza, nivel) => {
    expect(obtenerNivel(rareza)).toBe(nivel);
  });
});
