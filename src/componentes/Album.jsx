import { useEffect, useMemo, useState } from 'react';
import { obtenerCartasColeccion } from '../servicios/servicioPokemon';
import { precioVenta, progresoColeccion } from '../juego/estadoJuego';
import {
  OPCIONES_ORDEN,
  construirAlbumColeccion,
  contarPorNivel,
  filtrarPorPrecio,
  ordenarEntradas,
} from '../juego/utilidadesAlbum';
import { NIVELES, NOMBRES_NIVEL } from '../utilidades/rareza';
import FichaCarta from './FichaCarta';

function Album({ colecciones, miColeccion, idColeccionInicial, alCargarCartas, alVender, alIrAInicio }) {
  const [modo, setModo] = useState('coleccion');
  const [seleccionada, setSeleccionada] = useState(null);

  const entradas = useMemo(() => Object.values(miColeccion), [miColeccion]);
  const cantidadSeleccionada = seleccionada ? miColeccion[seleccionada.id]?.count || 0 : 0;

  return (
    <div className="view-wrapper">
      <div className="view-header-bar">
        <div>
          <h2>Mi álbum</h2>
          <p className="card-subheading">
            Tienes <strong>{entradas.length}</strong> cartas distintas.
          </p>
        </div>
        <div className="segmented" role="tablist" aria-label="Modo del álbum">
          <button role="tab" aria-selected={modo === 'coleccion'} className={modo === 'coleccion' ? 'active' : ''} onClick={() => setModo('coleccion')}>
            Por colección
          </button>
          <button role="tab" aria-selected={modo === 'mias'} className={modo === 'mias' ? 'active' : ''} onClick={() => setModo('mias')}>
            Mis cartas
          </button>
        </div>
      </div>

      {modo === 'coleccion' ? (
        <AlbumColeccion
          colecciones={colecciones}
          miColeccion={miColeccion}
          idColeccionInicial={idColeccionInicial}
          alCargarCartas={alCargarCartas}
          alElegirCarta={setSeleccionada}
        />
      ) : (
        <MisCartas entradas={entradas} alElegirCarta={setSeleccionada} alIrAInicio={alIrAInicio} />
      )}

      {seleccionada && (
        <FichaCarta
          carta={seleccionada}
          cantidad={cantidadSeleccionada}
          alVender={alVender}
          alCerrar={() => setSeleccionada(null)}
        />
      )}
    </div>
  );
}

function AlbumColeccion({ colecciones, miColeccion, idColeccionInicial, alCargarCartas, alElegirCarta }) {
  const { empezadas, resto } = useMemo(() => {
    const conProgreso = colecciones.map((coleccion) => ({
      coleccion,
      progreso: progresoColeccion(miColeccion, coleccion),
    }));
    return {
      empezadas: conProgreso
        .filter((c) => c.progreso.tengo > 0)
        .sort((a, b) => b.progreso.porcentaje - a.progreso.porcentaje),
      resto: conProgreso.filter((c) => c.progreso.tengo === 0),
    };
  }, [colecciones, miColeccion]);

  const idInicial = idColeccionInicial || empezadas[0]?.coleccion.id || colecciones[0]?.id || '';
  const [idColeccion, setIdColeccion] = useState(idInicial);
  const [mostrar, setMostrar] = useState('todas');
  const [cartasColeccion, setCartasColeccion] = useState([]);
  const [estadoCarga, setEstadoCarga] = useState('inactivo');
  const [claveRecarga, setClaveRecarga] = useState(0);

  useEffect(() => {
    if (!idColeccion && idInicial) setIdColeccion(idInicial);
  }, [idColeccion, idInicial]);

  useEffect(() => {
    if (!idColeccion) return undefined;
    let cancelado = false;
    setEstadoCarga('cargando');
    obtenerCartasColeccion(idColeccion)
      .then((cartas) => {
        if (cancelado) return;
        setCartasColeccion(cartas);
        setEstadoCarga('listo');
        alCargarCartas(colecciones.find((c) => c.id === idColeccion), cartas);
      })
      .catch(() => !cancelado && setEstadoCarga('error'));
    return () => {
      cancelado = true;
    };
  }, [idColeccion, claveRecarga]);

  const coleccion = colecciones.find((c) => c.id === idColeccion);
  const progreso = progresoColeccion(miColeccion, coleccion);
  const album = useMemo(() => construirAlbumColeccion(cartasColeccion, miColeccion), [cartasColeccion, miColeccion]);
  const visibles = album.filter(
    (hueco) => mostrar === 'todas' || (mostrar === 'tengo' ? hueco.tengo : !hueco.tengo)
  );

  if (colecciones.length === 0) return <p className="muted-text">Cargando colecciones...</p>;

  return (
    <>
      <div className="dash-card album-toolbar">
        <label className="field">
          <span>Colección</span>
          <select className="custom-input" value={idColeccion} onChange={(e) => setIdColeccion(e.target.value)}>
            {empezadas.length > 0 && (
              <optgroup label="Empezadas">
                {empezadas.map(({ coleccion: c, progreso: p }) => (
                  <option key={c.id} value={c.id}>{c.name} · {p.porcentaje}%</option>
                ))}
              </optgroup>
            )}
            <optgroup label="Todas las colecciones">
              {resto.map(({ coleccion: c }) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </optgroup>
          </select>
        </label>

        <label className="field">
          <span>Mostrar</span>
          <select className="custom-input" value={mostrar} onChange={(e) => setMostrar(e.target.value)}>
            <option value="todas">Todas</option>
            <option value="tengo">Solo las que tengo</option>
            <option value="faltan">Solo las que me faltan</option>
          </select>
        </label>

        {coleccion && progreso && (
          <div className="album-progress">
            <div className="album-progress-text">
              <strong>{progreso.tengo}/{progreso.total}</strong> cartas · {progreso.porcentaje}%
            </div>
            <div className="mini-progress" aria-hidden="true">
              <div style={{ width: `${progreso.porcentaje}%` }}></div>
            </div>
          </div>
        )}
      </div>

      {estadoCarga === 'cargando' && <p className="muted-text">Cargando las cartas de la colección...</p>}
      {estadoCarga === 'error' && (
        <div className="dash-card error-box">
          <p>No se han podido cargar las cartas de esta colección.</p>
          <button className="btn-back" onClick={() => setClaveRecarga((k) => k + 1)}>Reintentar</button>
        </div>
      )}

      {estadoCarga === 'listo' && (
        <div className="album-cards-grid">
          {visibles.map(({ carta, tengo, cantidad }) => (
            <button
              key={carta.id}
              className={`album-card-item ${tengo ? '' : 'is-missing'}`}
              onClick={() => alElegirCarta(carta)}
              title={tengo ? carta.name : `${carta.name} · te falta`}
            >
              {cantidad > 1 && <div className="card-qty-badge">x{cantidad}</div>}
              <span className="card-number">Nº {carta.number}</span>
              <img src={carta.image} alt={carta.name} loading="lazy" />
              <p>{carta.name}</p>
              <small className={`tier-text tier-${carta.tier}`}>{NOMBRES_NIVEL[carta.tier]}</small>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

function MisCartas({ entradas, alElegirCarta, alIrAInicio }) {
  const [busqueda, setBusqueda] = useState('');
  const [idOrden, setIdOrden] = useState('rareza-desc');
  const [nivelesOcultos, setNivelesOcultos] = useState([]);
  const [precioMinimo, setPrecioMinimo] = useState('');
  const [precioMaximo, setPrecioMaximo] = useState('');

  const recuento = useMemo(() => contarPorNivel(entradas), [entradas]);
  const visibles = useMemo(
    () =>
      ordenarEntradas(
        filtrarPorPrecio(
          entradas.filter(
            ({ card }) =>
              !nivelesOcultos.includes(card.tier) && card.name.toLowerCase().includes(busqueda.toLowerCase())
          ),
          precioMinimo,
          precioMaximo
        ),
        idOrden
      ),
    [entradas, nivelesOcultos, busqueda, idOrden, precioMinimo, precioMaximo]
  );

  const alternarNivel = (nivel) =>
    setNivelesOcultos((previos) =>
      previos.includes(nivel) ? previos.filter((n) => n !== nivel) : [...previos, nivel]
    );

  if (entradas.length === 0) {
    return (
      <div className="dash-card empty-card-album">
        <p>Tu álbum está vacío. Abre sobres para empezar a llenarlo.</p>
        <button className="neon-cta-btn-sm" onClick={alIrAInicio}>Abrir sobres</button>
      </div>
    );
  }

  return (
    <>
      <div className="dash-card album-toolbar">
        <label className="field">
          <span>Buscar</span>
          <input
            type="text"
            placeholder="Nombre de la carta..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="custom-input"
          />
        </label>
        <label className="field">
          <span>Ordenar</span>
          <select className="custom-input" value={idOrden} onChange={(e) => setIdOrden(e.target.value)}>
            {OPCIONES_ORDEN.map((opcion) => (
              <option key={opcion.id} value={opcion.id}>{opcion.texto}</option>
            ))}
          </select>
        </label>

        <div className="field">
          <span>Precio de venta (monedas)</span>
          <div className="price-range">
            <input
              type="number"
              min="0"
              inputMode="numeric"
              placeholder="Mín."
              aria-label="Precio mínimo"
              value={precioMinimo}
              onChange={(e) => setPrecioMinimo(e.target.value)}
              className="custom-input"
            />
            <span aria-hidden="true">–</span>
            <input
              type="number"
              min="0"
              inputMode="numeric"
              placeholder="Máx."
              aria-label="Precio máximo"
              value={precioMaximo}
              onChange={(e) => setPrecioMaximo(e.target.value)}
              className="custom-input"
            />
            {(precioMinimo !== '' || precioMaximo !== '') && (
              <button className="btn-back" onClick={() => { setPrecioMinimo(''); setPrecioMaximo(''); }}>
                Quitar
              </button>
            )}
          </div>
        </div>

        <div className="field">
          <span>Rareza</span>
          <div className="tier-filters">
            {NIVELES.map((nivel) => (
              <button
                key={nivel}
                className={`tier-chip tier-${nivel} ${nivelesOcultos.includes(nivel) ? 'off' : ''}`}
                aria-pressed={!nivelesOcultos.includes(nivel)}
                onClick={() => alternarNivel(nivel)}
                disabled={!recuento[nivel]}
              >
                {NOMBRES_NIVEL[nivel]} · {recuento[nivel] || 0}
              </button>
            ))}
          </div>
        </div>
      </div>

      {visibles.length === 0 ? (
        <p className="muted-text">Ninguna carta coincide con los filtros.</p>
      ) : (
        <div className="album-cards-grid">
          {visibles.map(({ card: carta, count: cantidad }) => (
            <button key={carta.id} className="album-card-item" onClick={() => alElegirCarta(carta)}>
              {cantidad > 1 && <div className="card-qty-badge">x{cantidad}</div>}
              <img src={carta.image} alt={carta.name} loading="lazy" />
              <p>{carta.name}</p>
              <small className={`tier-text tier-${carta.tier}`}>{NOMBRES_NIVEL[carta.tier]}</small>
              <span className="card-price">{precioVenta(carta)} monedas</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

export default Album;
