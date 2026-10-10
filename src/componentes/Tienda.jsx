import { useEffect, useMemo, useState } from 'react';
import { obtenerCartasColeccion } from '../servicios/servicioPokemon';
import { PRECIO_MAXIMO_COMODIN, progresoColeccion } from '../juego/estadoJuego';
import {
  DESCUENTOS_POR_CANTIDAD,
  MONEDAS_POR_EURO,
  precioPorCantidad,
  formatearEur,
  valorEsperadoSobreEur,
  precioSobreMonedas,
} from '../juego/precios';

function Tienda({ colecciones, partida, idColeccionInicial, alCargarCartas, alComprar, alAbrirColeccion }) {
  const [idColeccion, setIdColeccion] = useState(idColeccionInicial || '');
  const [cartas, setCartas] = useState([]);
  const [estadoCarga, setEstadoCarga] = useState('inactivo');
  const [claveRecarga, setClaveRecarga] = useState(0);

  const { empezadas, resto } = useMemo(() => {
    const conProgreso = colecciones.map((coleccion) => ({
      coleccion,
      tengo: progresoColeccion(partida.collection, coleccion).tengo,
    }));
    return {
      empezadas: conProgreso.filter((c) => c.tengo > 0),
      resto: conProgreso.filter((c) => c.tengo === 0),
    };
  }, [colecciones, partida.collection]);

  useEffect(() => {
    if (!idColeccion && colecciones.length > 0) setIdColeccion(empezadas[0]?.coleccion.id || colecciones[0].id);
  }, [idColeccion, colecciones, empezadas]);

  useEffect(() => {
    if (!idColeccion) return undefined;
    let cancelado = false;
    setEstadoCarga('cargando');
    obtenerCartasColeccion(idColeccion)
      .then((cargadas) => {
        if (cancelado) return;
        setCartas(cargadas);
        setEstadoCarga('listo');
        alCargarCartas(colecciones.find((c) => c.id === idColeccion), cargadas);
      })
      .catch(() => !cancelado && setEstadoCarga('error'));
    return () => {
      cancelado = true;
    };
  }, [idColeccion, claveRecarga]);

  const coleccion = colecciones.find((c) => c.id === idColeccion);
  const preparada = estadoCarga === 'listo' && cartas.length > 0;
  const precioUnidad = preparada ? precioSobreMonedas(cartas) : null;
  const valorEsperado = preparada ? valorEsperadoSobreEur(cartas) : null;
  const sobresComprados = Object.entries(partida.setPacks).filter(([, n]) => n > 0);
  const comodinValido = precioUnidad <= PRECIO_MAXIMO_COMODIN;

  const textoOpcion = (c) => (partida.packPrices[c.id] ? `${c.name} · ${partida.packPrices[c.id]} monedas` : c.name);

  return (
    <div className="view-wrapper">
      <div className="view-header-bar">
        <div>
          <h2>Tienda</h2>
          <p className="card-subheading">
            Cada colección tiene su precio, según lo que valen sus cartas en el mercado real.
          </p>
        </div>
      </div>

      <div className="shop-layout">
        <div className="dash-card">
          <h3 className="card-heading">Tus sobres</h3>
          <ul className="stats-list">
            <li>
              <span>Comodines</span>
              <strong>{partida.wildcards}</strong>
            </li>
            {sobresComprados.map(([id, n]) => (
              <li key={id}>
                <span>{colecciones.find((c) => c.id === id)?.name || id}</span>
                <strong>{n}</strong>
              </li>
            ))}
          </ul>
          <p className="card-subheading wildcard-note">
            Los comodines sirven para cualquier colección con sobre de hasta {PRECIO_MAXIMO_COMODIN} monedas.
          </p>
        </div>

        <div className="dash-card">
          <label className="field">
            <span>Colección</span>
            <select className="custom-input" value={idColeccion} onChange={(e) => setIdColeccion(e.target.value)}>
              {empezadas.length > 0 && (
                <optgroup label="Empezadas">
                  {empezadas.map(({ coleccion: c }) => (
                    <option key={c.id} value={c.id}>{textoOpcion(c)}</option>
                  ))}
                </optgroup>
              )}
              <optgroup label="Todas las colecciones">
                {resto.map(({ coleccion: c }) => (
                  <option key={c.id} value={c.id}>{textoOpcion(c)}</option>
                ))}
              </optgroup>
            </select>
          </label>

          {estadoCarga === 'cargando' && <p className="muted-text">Calculando el precio con las cartas de la colección...</p>}
          {estadoCarga === 'error' && (
            <div className="error-box">
              <p>No se han podido cargar las cartas de esta colección.</p>
              <button className="btn-back" onClick={() => setClaveRecarga((k) => k + 1)}>Reintentar</button>
            </div>
          )}

          {preparada && coleccion && (
            <>
              <div className="pack-price-info">
                <div>
                  <span>Precio del sobre</span>
                  <strong>{precioUnidad} monedas</strong>
                  <small>≈ {formatearEur(precioUnidad / MONEDAS_POR_EURO)}</small>
                </div>
                <div>
                  <span>Valor medio de las cartas</span>
                  <strong>{Math.round(valorEsperado * MONEDAS_POR_EURO)} monedas</strong>
                  <small>≈ {formatearEur(valorEsperado)}</small>
                </div>
                <div>
                  <span>Comodines</span>
                  <strong>{comodinValido ? 'Valen' : 'No valen'}</strong>
                  <small>{comodinValido ? 'sobre de precio normal' : 'sobre caro'}</small>
                </div>
              </div>

              <div className="shop-grid">
                {Object.keys(DESCUENTOS_POR_CANTIDAD).map((textoCantidad) => {
                  const cantidad = Number(textoCantidad);
                  const precio = precioPorCantidad(precioUnidad, cantidad);
                  const asequible = partida.coins >= precio;
                  return (
                    <div key={cantidad} className="shop-offer">
                      <div className="pack-stack" aria-hidden="true">
                        {Array.from({ length: Math.min(cantidad, 3) }, (_, i) => (
                          <div key={i} className="pack-mini-icon big"></div>
                        ))}
                      </div>
                      <h3>{cantidad} {cantidad === 1 ? 'sobre' : 'sobres'}</h3>
                      <p className="card-subheading">
                        {DESCUENTOS_POR_CANTIDAD[cantidad]
                          ? `${DESCUENTOS_POR_CANTIDAD[cantidad] * 100} % de descuento`
                          : 'Precio normal'}
                      </p>
                      <button
                        className="neon-cta-btn-sm full-width"
                        onClick={() => alComprar(coleccion.id, cantidad, precioUnidad)}
                        disabled={!asequible}
                      >
                        {asequible ? `Comprar · ${precio}` : `Faltan ${precio - partida.coins} monedas`}
                      </button>
                    </div>
                  );
                })}
              </div>

              {(partida.setPacks[coleccion.id] || 0) > 0 && (
                <button className="btn-back full-width" onClick={() => alAbrirColeccion(coleccion)}>
                  Abrir mis sobres de {coleccion.name} ({partida.setPacks[coleccion.id]})
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Tienda;
