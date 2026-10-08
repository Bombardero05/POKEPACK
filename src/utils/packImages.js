// src/utils/packImages.js
import PortadaDefault from '../assets/Portada.png';

// Mapa de sobres por ID de set
const PACK_IMAGES = {
  'sv1': 'https://images.pokemontcg.io/sv1/symbol.png',
  // Puedes añadir más rutas de imágenes según necesites
};

/**
 * Devuelve la imagen del sobre según el ID del set.
 * Si no existe una imagen específica, devuelve la portada genérica.
 */
export const getPackImageBySetId = (setId) => {
  return PACK_IMAGES[setId] || PortadaDefault;
};