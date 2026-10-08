// src/utils/packImages.js
import PortadaDefault from '../assets/portada.webp';

// Mapa de sobres por ID de set
const PACK_IMAGES = {
  // 'sv1': imagen del sobre de Scarlet & Violet (pendiente).
  // Ojo: no usar set.images.symbol, es un icono de 40 px y se ve pixelado.
  // Puedes añadir más rutas de imágenes según necesites
};

/**
 * Devuelve la imagen del sobre según el ID del set.
 * Si no existe una imagen específica, devuelve la portada genérica.
 */
export const getPackImageBySetId = (setId) => {
  return PACK_IMAGES[setId] || PortadaDefault;
};