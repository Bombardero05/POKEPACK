import { MISIONES, precioVenta, estadoMision } from '../juego/estadoJuego';
import { NOMBRES_NIVEL } from '../utilidades/rareza';

export function TarjetaProgresoAlbum({ coleccion, progreso }) {
  return (
    <div className="dash-card">
      <h3 className="card-heading">Colección actual</h3>
      <p className="card-subheading">Progreso del álbum</p>

      {coleccion && progreso ? (
        <>
          <div className="progress-gauge-wrapper">
            <div className="gauge-circle" style={{ '--progress': `${progreso.porcentaje}%` }}>
              <span className="gauge-label">Completado</span>
              <span className="gauge-percentage">{progreso.porcentaje}%</span>
            </div>
          </div>
          <div className="gauge-footer-meta">
            <span className="set-highlight-name">{coleccion.name}</span>
            <span className="set-highlight-count">
              {progreso.tengo}/{progreso.total} cartas distintas
            </span>
          </div>
        </>
      ) : (
        <p className="empty-text">Abre tu primer sobre y aquí verás cuánto te falta para completar la colección.</p>
      )}
    </div>
  );
}

export function TarjetaGachapon({ puedeReclamar, alGirar }) {
  return (
    <div className="dash-card gachapon-card">
      <h3 className="card-heading">Gachapón diario</h3>
      <p className="card-subheading">Una tirada gratis al día: monedas o un sobre comodín</p>

      <div className="gachapon-art">
        <div className="gachapon-machine">
          <div className="machine-glass"></div>
          <div className="machine-base"></div>
        </div>
        <div className="ball-cluster">
          <div className="gacha-capsule capsule-blue"></div>
          <div className="gacha-capsule capsule-yellow"></div>
          <div className="gacha-capsule capsule-red"></div>
        </div>
      </div>

      <button className="neon-cta-btn-sm full-width" onClick={alGirar} disabled={!puedeReclamar}>
        {puedeReclamar ? 'Girar gratis' : 'Vuelve mañana'}
      </button>
    </div>
  );
}

export function TarjetaUltimasRaras({ historial }) {
  const ultimas = historial.slice(0, 3);
  return (
    <div className="dash-card drops-row-card">
      <div>
        <h3 className="card-heading">Últimas raras</h3>
        <p className="card-subheading">Las últimas cartas raras o mejores que has sacado</p>
      </div>
      {ultimas.length === 0 ? (
        <p className="empty-text">Todavía ninguna.</p>
      ) : (
        <div className="rare-drop-previews">
          {ultimas.map(({ card: carta, at: fecha }) => (
            <img
              key={`${carta.id}-${fecha}`}
              src={carta.image}
              alt={carta.name}
              title={`${carta.name} · ${NOMBRES_NIVEL[carta.tier]}`}
              className="mini-rare-card"
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function TarjetaMercado({ repetidas, mejores, alVenderTodas, alVenderUna }) {
  return (
    <div className="dash-card">
      <h3 className="card-heading">Mercado</h3>
      <p className="card-subheading">Vende tus repetidas para conseguir monedas</p>
      <div className="market-price-tag">
        {repetidas.monedas.toLocaleString('es-ES')} <span className="coin-inline"></span>
      </div>
      <p className="card-subheading">
        {repetidas.vendidas === 0 ? 'No tienes repetidas' : `${repetidas.vendidas} cartas repetidas`}
      </p>

      {mejores.length > 0 && (
        <div className="market-cards-strip">
          {mejores.map(({ card: carta, count: cantidad }) => (
            <button
              key={carta.id}
              className="market-card"
              onClick={() => alVenderUna(carta.id)}
              title={`Vender 1 ${carta.name} por ${precioVenta(carta)} monedas`}
            >
              <img src={carta.image} alt={carta.name} />
              <span>x{cantidad - 1} · +{precioVenta(carta)}</span>
            </button>
          ))}
        </div>
      )}

      <button className="neon-cta-btn-sm full-width" onClick={alVenderTodas} disabled={repetidas.vendidas === 0}>
        Vender todas las repetidas
      </button>
    </div>
  );
}

export function TarjetaMisiones({ estado, alReclamar }) {
  return (
    <div className="dash-card">
      <h3 className="card-heading">Misiones diarias</h3>
      <p className="card-subheading">Se reinician cada día a las 00:00</p>

      {MISIONES.map((mision) => {
        const situacion = estadoMision(estado, mision);
        const valor = Math.min(estado.daily[mision.estadistica], mision.objetivo);
        return (
          <div key={mision.id} className="mission-row">
            <div className="mission-info">
              <span>{mision.texto}</span>
              <small>+{mision.recompensa} monedas</small>
            </div>
            {situacion === 'lista' ? (
              <button className="neon-cta-btn-sm" onClick={() => alReclamar(mision.id)}>Reclamar</button>
            ) : (
              <span className="mission-prog">{situacion === 'reclamada' ? '✓' : `${valor}/${mision.objetivo}`}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
