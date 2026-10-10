import { RESPALDOS_NIVEL, obtenerNivel } from './rareza';

export const barajar = (lista, aleatorio = Math.random) => {
  const resultado = [...lista];
  for (let i = resultado.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [resultado[i], resultado[j]] = [resultado[j], resultado[i]];
  }
  return resultado;
};

export const PROBABILIDADES_ESPECIAL = [
  { nivel: 'secret', hasta: 2 },
  { nivel: 'illustration', hasta: 7 },
  { nivel: 'ultra', hasta: 25 },
  { nivel: 'rare', hasta: 100 },
];

export const sortearNivelEspecial = (aleatorio = Math.random) => {
  const tirada = aleatorio() * 100;
  return PROBABILIDADES_ESPECIAL.find((probabilidad) => tirada < probabilidad.hasta).nivel;
};

const elegirDeNivel = (porNivel, nivel, usadas, cantidad, aleatorio) => {
  const elegidas = [];
  for (const candidato of RESPALDOS_NIVEL[nivel]) {
    if (elegidas.length === cantidad) break;
    const disponibles = (porNivel[candidato] || []).filter((c) => !usadas.has(c.id));
    barajar(disponibles, aleatorio)
      .slice(0, cantidad - elegidas.length)
      .forEach((c) => {
        usadas.add(c.id);
        elegidas.push(c);
      });
  }
  return elegidas;
};

export const generarSobre = (cartasColeccion, aleatorio = Math.random) => {
  if (!cartasColeccion || cartasColeccion.length === 0) return [];

  const porNivel = {};
  cartasColeccion.forEach((carta) => {
    const nivel = carta.tier || obtenerNivel(carta.rarity);
    (porNivel[nivel] = porNivel[nivel] || []).push({ ...carta, tier: nivel });
  });

  const usadas = new Set();
  const comunes = elegirDeNivel(porNivel, 'common', usadas, 6, aleatorio);
  const infrecuentes = elegirDeNivel(porNivel, 'uncommon', usadas, 3, aleatorio);
  const especial = elegirDeNivel(porNivel, sortearNivelEspecial(aleatorio), usadas, 1, aleatorio);

  return [...comunes, ...infrecuentes, ...especial];
};
