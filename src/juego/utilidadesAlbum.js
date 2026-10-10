import { NIVELES } from '../utilidades/rareza';
import { precioVenta } from './estadoJuego';

export const compararNumeroCarta = (a, b) =>
  String(a.number ?? '').localeCompare(String(b.number ?? ''), 'es', { numeric: true });

const posicionNivel = (carta) => NIVELES.indexOf(carta.tier);
const compararNombre = (a, b) => a.card.name.localeCompare(b.card.name, 'es');

export const OPCIONES_ORDEN = [
  { id: 'rareza-desc', texto: 'Rareza: de mayor a menor' },
  { id: 'rareza-asc', texto: 'Rareza: de menor a mayor' },
  { id: 'precio-desc', texto: 'Precio: de mayor a menor' },
  { id: 'precio-asc', texto: 'Precio: de menor a mayor' },
  { id: 'recientes', texto: 'Más recientes' },
  { id: 'nombre', texto: 'Nombre (A-Z)' },
  { id: 'coleccion', texto: 'Colección y número' },
];

const COMPARADORES = {
  'rareza-desc': (a, b) => posicionNivel(b.card) - posicionNivel(a.card) || compararNombre(a, b),
  'rareza-asc': (a, b) => posicionNivel(a.card) - posicionNivel(b.card) || compararNombre(a, b),
  'precio-desc': (a, b) => precioVenta(b.card) - precioVenta(a.card) || compararNombre(a, b),
  'precio-asc': (a, b) => precioVenta(a.card) - precioVenta(b.card) || compararNombre(a, b),
  recientes: (a, b) => (b.obtainedAt || '').localeCompare(a.obtainedAt || ''),
  nombre: compararNombre,
  coleccion: (a, b) =>
    (a.card.setName || '').localeCompare(b.card.setName || '', 'es') || compararNumeroCarta(a.card, b.card),
};

export const ordenarEntradas = (entradas, idOrden) =>
  [...entradas].sort(COMPARADORES[idOrden] || COMPARADORES['rareza-desc']);

export const contarPorNivel = (entradas) =>
  entradas.reduce((acc, { card }) => ({ ...acc, [card.tier]: (acc[card.tier] || 0) + 1 }), {});

export const construirAlbumColeccion = (cartasColeccion, miColeccion) =>
  [...cartasColeccion].sort(compararNumeroCarta).map((carta) => {
    const entrada = miColeccion[carta.id];
    return { carta, tengo: Boolean(entrada), cantidad: entrada?.count || 0 };
  });

export const filtrarPorPrecio = (entradas, minimo, maximo) => {
  const desde = minimo === '' || minimo == null ? -Infinity : Number(minimo);
  const hasta = maximo === '' || maximo == null ? Infinity : Number(maximo);
  return entradas.filter(({ card }) => {
    const precio = precioVenta(card);
    return precio >= desde && precio <= hasta;
  });
};
