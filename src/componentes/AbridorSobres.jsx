import { useEffect, useState } from 'react';
import PortadaPorDefecto from '../assets/portada.webp';
import { obtenerCartasColeccion } from '../servicios/servicioPokemon';
import { generarSobre } from '../utilidades/logicaSobres';
import { obtenerImagenSobre } from '../utilidades/imagenesSobres';
import { NOMBRES_NIVEL } from '../utilidades/rareza';
import { origenSobre, totalSobres, precioVenta, PRECIO_MAXIMO_COMODIN } from '../juego/estadoJuego';
import { valorEsperadoSobreEur, precioSobreMonedas, formatearEur, MONEDAS_POR_EURO } from '../juego/precios';

const REVERSO_CARTA = 'https://images.pokemontcg.io/cardback.png';

function AbridorSobres({
  colecciones,
  estadoColecciones,
  alReintentarColecciones,
  partida,
  cartaDestacada,
  alCargarCartas,
  alAbrirSobre,
  alComprarSobres,
  peticion,
}) {
  const [paso, setPaso] = useState('portada');
  const [coleccionElegida, setColeccionElegida] = useState(null);
  const [cartasColeccion, setCartasColeccion] = useState([]);
  const [cargandoCartas, setCargandoCartas] = useState(false);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [sobre, setSobre] = useState([]);
  const [indice, setIndice] = useState(0);
  const [revelada, setRevelada] = useState(false);

  const elegirColeccion = async (coleccion) => {
    setColeccionElegida(coleccion);
    setPaso('preparado');
    setError('');
    setCargandoCartas(true);
    try {
      const cartas = await obtenerCartasColeccion(coleccion.id);
      setCartasColeccion(cartas);
      alCargarCartas(coleccion, cartas);
    } catch {
      setError('No se han podido cargar las cartas. Revisa la conexión e inténtalo de nuevo.');
    } finally {
      setCargandoCartas(false);
    }
  };

  useEffect(() => {
    if (peticion?.coleccion) elegirColeccion(peticion.coleccion);
  }, [peticion]);

  const precioSobre = cartasColeccion.length > 0 ? precioSobreMonedas(cartasColeccion) : null;
  const origen = coleccionElegida ? origenSobre(partida, coleccionElegida.id, precioSobre) : null;
  const puedeComprar = precioSobre != null && partida.coins >= precioSobre;

  const abrirSobre = () => {
    if (cartasColeccion.length === 0) return;
    if (!origen) {
      if (!puedeComprar) return;
      alComprarSobres(coleccionElegida.id, 1, precioSobre);
    }
    const cartas = generarSobre(cartasColeccion);
    alAbrirSobre(cartas, coleccionElegida, precioSobre);
    setSobre(cartas);
    setIndice(0);
    setRevelada(false);
    setPaso('revelar');
  };

  const pulsarCarta = () => {
    if (!revelada) {
      setRevelada(true);
    } else if (indice + 1 < sobre.length) {
      setIndice(indice + 1);
      setRevelada(false);
    } else {
      setPaso('resumen');
    }
  };

  const coleccionesFiltradas = colecciones.filter((c) => c.name.toLowerCase().includes(busqueda.toLowerCase()));
  const sobres = totalSobres(partida);

  const textoAbrir =
    origen === 'coleccion'
      ? `ABRIR SOBRE (te quedan ${partida.setPacks[coleccionElegida.id]})`
      : origen === 'comodin'
        ? `ABRIR CON COMODÍN (te quedan ${partida.wildcards})`
        : puedeComprar
          ? `COMPRAR Y ABRIR · ${precioSobre} MONEDAS`
          : `TE FALTAN ${precioSobre - partida.coins} MONEDAS`;

  if (paso === 'portada') {
    return (
      <div className="center-featured-content">
        <div className="card-spotlight-wrapper">
          <img
            src={cartaDestacada?.imageLarge || cartaDestacada?.image || PortadaPorDefecto}
            alt={cartaDestacada ? cartaDestacada.name : 'Portada de PokéPack'}
            className="spotlight-card-img"
            onError={(e) => { e.target.src = PortadaPorDefecto; }}
          />
        </div>
        {cartaDestacada && (
          <p className="spotlight-caption">
            Tu mejor carta: <strong>{cartaDestacada.name}</strong> · {NOMBRES_NIVEL[cartaDestacada.tier]}
          </p>
        )}
        <button className="neon-cta-btn" onClick={() => setPaso('elegir')}>
          {sobres > 0 ? `ABRIR SOBRES (${sobres})` : 'ELEGIR SOBRE'}
        </button>
      </div>
    );
  }

  if (paso === 'elegir') {
    return (
      <div className="pack-selection-flow">
        <div className="flow-header">
          <button className="btn-back" onClick={() => setPaso('portada')}>← Volver</button>
          <h3>ELIGE EL SOBRE QUE QUIERES ABRIR</h3>
          <input
            type="text"
            placeholder="Buscar colección..."
            className="custom-input"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        {estadoColecciones === 'cargando' && <p className="muted-text">Cargando colecciones...</p>}
        {estadoColecciones === 'error' && (
          <div className="error-box">
            <p>No se han podido cargar las colecciones.</p>
            <button className="btn-back" onClick={alReintentarColecciones}>Reintentar</button>
          </div>
        )}

        <div className="sets-grid-scroll">
          {coleccionesFiltradas.map((coleccion) => (
            <button key={coleccion.id} className="set-box" onClick={() => elegirColeccion(coleccion)}>
              <img src={coleccion.images.logo} alt="" />
              <p>{coleccion.name}</p>
              {(coleccion.printedTotal || coleccion.total) > 0 && (
                <small>{coleccion.printedTotal || coleccion.total} cartas</small>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (paso === 'preparado') {
    return (
      <div className="center-featured-content">
        <button className="btn-back align-start" onClick={() => setPaso('elegir')}>← Cambiar sobre</button>
        {cargandoCartas && <p className="muted-text">Preparando cartas de la colección...</p>}
        {error && (
          <div className="error-box">
            <p>{error}</p>
            <button className="btn-back" onClick={() => elegirColeccion(coleccionElegida)}>Reintentar</button>
          </div>
        )}
        {!cargandoCartas && !error && (
          <>
            <img src={obtenerImagenSobre(coleccionElegida.id)} alt={coleccionElegida.name} className="spotlight-card-img" />
            <h3 className="pack-title">{coleccionElegida.name}</h3>
            <InfoPrecioSobre
              cartasColeccion={cartasColeccion}
              precioSobre={precioSobre}
              sobresColeccion={partida.setPacks[coleccionElegida.id] || 0}
              comodines={partida.wildcards}
              comodinValido={precioSobre != null && precioSobre <= PRECIO_MAXIMO_COMODIN}
            />
            <button className="neon-cta-btn" onClick={abrirSobre} disabled={!origen && !puedeComprar}>
              {textoAbrir}
            </button>
          </>
        )}
      </div>
    );
  }

  if (paso === 'revelar') {
    const carta = sobre[indice];
    return (
      <div className="opening-flow-card">
        <span className="card-counter-indicator">Carta {indice + 1} de {sobre.length}</span>
        <button
          className="flip-card-container"
          onClick={pulsarCarta}
          aria-label={revelada ? 'Siguiente carta' : 'Dar la vuelta a la carta'}
        >
          <div key={indice} className={`flip-card-inner ${revelada ? '' : 'flipped'}`}>
            <div className="flip-card-front">
              <img src={carta.image} alt={carta.name} />
            </div>
            <div className="flip-card-back">
              <img src={REVERSO_CARTA} alt="" />
            </div>
          </div>
        </button>
        {revelada ? (
          <>
            <h4 className="opened-card-name">{carta.name}</h4>
            <span className={`tier-badge tier-${carta.tier}`}>{NOMBRES_NIVEL[carta.tier]}</span>
          </>
        ) : (
          <p className="muted-text">Toca la carta para darle la vuelta</p>
        )}
        <button className="btn-back" onClick={() => setPaso('resumen')}>Ver todas</button>
      </div>
    );
  }

  return (
    <div className="summary-flow">
      <div className="summary-actions">
        <button className="btn-back" onClick={() => setPaso('elegir')}>← Colecciones</button>
        <button className="neon-cta-btn-sm" onClick={abrirSobre} disabled={!origen && !puedeComprar}>
          {origen ? 'Abrir otro' : puedeComprar ? `Comprar y abrir otro · ${precioSobre}` : 'Sin monedas'}
        </button>
      </div>
      <h4>Resumen del sobre</h4>
      <p className="muted-text">
        Valor de las cartas: <strong>{sobre.reduce((suma, c) => suma + precioVenta(c), 0)} monedas</strong>
        {precioSobre != null && <> · el sobre costaba {precioSobre}</>}
      </p>
      <div className="summary-cards-row">
        {sobre.map((carta) => (
          <div key={carta.id} className="summary-thumb">
            <img src={carta.image} alt={carta.name} />
            <small>{carta.name}</small>
            <span className={`tier-dot tier-${carta.tier}`} title={NOMBRES_NIVEL[carta.tier]}></span>
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoPrecioSobre({ cartasColeccion, precioSobre, sobresColeccion, comodines, comodinValido }) {
  if (precioSobre == null) return null;
  const valorEsperado = valorEsperadoSobreEur(cartasColeccion);
  return (
    <div className="pack-price-info">
      <div>
        <span>Precio del sobre</span>
        <strong>{precioSobre} monedas</strong>
        <small>≈ {formatearEur(precioSobre / MONEDAS_POR_EURO)}</small>
      </div>
      <div>
        <span>Valor medio de las cartas</span>
        <strong>{Math.round(valorEsperado * MONEDAS_POR_EURO)} monedas</strong>
        <small>≈ {formatearEur(valorEsperado)}</small>
      </div>
      <div>
        <span>Tus sobres</span>
        <strong>{sobresColeccion} de esta colección</strong>
        <small>
          {comodines} comodines{comodines > 0 && !comodinValido ? ' (no valen: sobre caro)' : ''}
        </small>
      </div>
    </div>
  );
}

export default AbridorSobres;
