import PortadaPorDefecto from '../assets/portada.webp';

const IMAGENES_SOBRES = {};

export const obtenerImagenSobre = (idColeccion) => IMAGENES_SOBRES[idColeccion] || PortadaPorDefecto;
