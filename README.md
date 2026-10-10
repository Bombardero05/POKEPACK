# PokéPack Collector

Simulador de apertura de sobres de cartas Pokémon hecho con React. Abres sobres de cualquier colección real, completas álbumes y gestionas una economía de juego basada en los **precios reales de mercado** de cada carta.

## Qué se puede hacer

- **Abrir sobres** de 176 colecciones reales: 10 cartas por sobre (6 comunes, 3 infrecuentes y 1 especial con probabilidades por rareza), reveladas una a una.
- **Álbum por colección**: todas las cartas en orden; las que te faltan salen en gris para ver qué te queda.
- **Mis cartas**: filtro por rareza y por precio, búsqueda y orden por rareza, precio, fecha o nombre.
- **Precios reales**: cada carta vale lo que marca Cardmarket (media de 30 días). Si no hay dato, se usa TCGplayer o una estimación por rareza y colección.
- **Tienda**: el precio del sobre de cada colección depende del valor medio de sus cartas (Base Set cuesta mucho más que una colección actual). Descuentos por comprar 5 o 10.
- **Mercado, gachapón diario y misiones diarias** para conseguir monedas.
- La partida se guarda en el navegador (`localStorage`).

## Tecnologías

- React 19 con hooks (`useReducer` para todo el estado de la partida)
- Vite
- Vitest (60 pruebas de la lógica: sobres, precios, tienda, álbum)
- [Pokémon TCG API](https://pokemontcg.io/) para colecciones, cartas y precios

## Cómo está organizado

```
src/
├── Inicio/          App.jsx: pantalla principal y pestañas. App.css: estilos
├── componentes/     Interfaz: apertura de sobres, álbum, tienda, ficha de carta, barra lateral…
├── juego/           Lógica del juego sin React (se prueba de forma aislada)
│   ├── estadoJuego.js      Estado de la partida y reducer con todas las acciones
│   ├── precios.js          Precio de cartas y sobres
│   └── utilidadesAlbum.js  Filtros y orden del álbum
├── servicios/
│   └── servicioPokemon.js  Llamadas a la API, con reintentos y caché en localStorage
├── utilidades/
│   ├── rareza.js           Normalización de rarezas a 6 niveles
│   ├── logicaSobres.js     Generación de sobres
│   └── imagenesSobres.js   Imagen de cada sobre según la colección
└── assets/          Imágenes
```

Las pruebas están junto a cada archivo que prueban (`*.test.js`).

## Decisiones técnicas

- **Lógica separada de la interfaz.** Todo cambio de la partida pasa por un reducer puro en `juego/estadoJuego.js`, así se puede probar sin montar componentes.
- **La API falla a menudo** (errores 500 y respuestas cortadas): las peticiones se reintentan hasta 3 veces y solo se piden los campos necesarios.
- **Caché ligera.** De cada carta se guardan solo los 11 campos que usa la app, no la ficha completa de la API. Si `localStorage` se llena, se vacía la caché de cartas sin tocar la partida.
- **Rarezas normalizadas.** La API usa nombres distintos según la época (`Ultra Rare`, `Rare Ultra`, `Rare Holo VMAX`…); `utilidades/rareza.js` los agrupa en 6 niveles.

## Ejecutar en local

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # pruebas con Vitest
npm run build      # versión de producción en /dist
```

## Autor

Marc Carmona · [GitHub](https://github.com/Bombardero05) · [Portfolio](https://marc-carmona.vercel.app)
