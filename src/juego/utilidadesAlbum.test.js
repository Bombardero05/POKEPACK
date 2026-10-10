import {
  ordenarEntradas,
  construirAlbumColeccion,
  contarPorNivel,
  compararNumeroCarta,
  filtrarPorPrecio,
} from './utilidadesAlbum';

const PRECIOS = { common: 0.05, rare: 0.25, secret: 2.5 };
const entrada = (nombre, nivel, obtenidaEn = '2026-10-07T10:00:00Z') => ({
  card: { id: nombre, name: nombre, tier: nivel, setName: 'Base', number: '1', priceEur: PRECIOS[nivel] },
  count: 1,
  obtainedAt: obtenidaEn,
});

const entradas = [
  entrada('Pikachu', 'common', '2026-10-07T10:00:00Z'),
  entrada('Mewtwo', 'secret', '2026-10-07T09:00:00Z'),
  entrada('Bulbasaur', 'rare', '2026-10-07T11:00:00Z'),
];

test('ordena por rareza en los dos sentidos', () => {
  expect(ordenarEntradas(entradas, 'rareza-desc').map((e) => e.card.name)).toEqual(['Mewtwo', 'Bulbasaur', 'Pikachu']);
  expect(ordenarEntradas(entradas, 'rareza-asc').map((e) => e.card.name)).toEqual(['Pikachu', 'Bulbasaur', 'Mewtwo']);
});

test('ordena por fecha y por nombre sin modificar el original', () => {
  expect(ordenarEntradas(entradas, 'recientes')[0].card.name).toBe('Bulbasaur');
  expect(ordenarEntradas(entradas, 'nombre')[0].card.name).toBe('Bulbasaur');
  expect(entradas[0].card.name).toBe('Pikachu');
});

test('cuenta cartas por rareza', () => {
  expect(contarPorNivel(entradas)).toEqual({ common: 1, secret: 1, rare: 1 });
});

test('los números de carta se ordenan como números', () => {
  const numeros = ['10', '2', '1', 'TG05'].map((number) => ({ number }));
  expect(numeros.sort(compararNumeroCarta).map((c) => c.number)).toEqual(['1', '2', '10', 'TG05']);
});

test('el álbum de una colección marca las que tienes y las que faltan', () => {
  const cartasColeccion = [
    { id: 'sv1-2', number: '2' },
    { id: 'sv1-1', number: '1' },
  ];
  const album = construirAlbumColeccion(cartasColeccion, { 'sv1-2': { count: 3 } });
  expect(album.map((a) => [a.carta.id, a.tengo, a.cantidad])).toEqual([
    ['sv1-1', false, 0],
    ['sv1-2', true, 3],
  ]);
});

test('ordena y filtra por precio de venta', () => {
  expect(ordenarEntradas(entradas, 'precio-desc').map((e) => e.card.name)).toEqual(['Mewtwo', 'Bulbasaur', 'Pikachu']);
  expect(ordenarEntradas(entradas, 'precio-asc')[0].card.name).toBe('Pikachu');
  expect(filtrarPorPrecio(entradas, 10, 100).map((e) => e.card.name)).toEqual(['Bulbasaur']);
  expect(filtrarPorPrecio(entradas, '', 25)).toHaveLength(2);
  expect(filtrarPorPrecio(entradas, 26, '')).toHaveLength(1);
  expect(filtrarPorPrecio(entradas, '', '')).toHaveLength(3);
});
