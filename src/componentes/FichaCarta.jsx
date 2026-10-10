import { useEffect } from 'react';
import { precioVenta } from '../juego/estadoJuego';
import { precioCartaEur, formatearEur } from '../juego/precios';
import { NOMBRES_NIVEL } from '../utilidades/rareza';

const TEXTO_FUENTE = {
  cardmarket: 'Cardmarket, media de 30 días',
  tcgplayer: 'TCGplayer, precio de mercado',
  estimado: 'estimado por rareza y colección',
};

function FichaCarta({ carta, cantidad, alVender, alCerrar }) {
  useEffect(() => {
    const alPulsarTecla = (e) => e.key === 'Escape' && alCerrar();
    window.addEventListener('keydown', alPulsarTecla);
    return () => window.removeEventListener('keydown', alPulsarTecla);
  }, [alCerrar]);

  const laTengo = cantidad > 0;
  const precio = precioVenta(carta);
  const textoFuente = TEXTO_FUENTE[carta.priceSource] || 'estimado por rareza';

  const venderCarta = () => {
    const esLaUltima = cantidad === 1;
    if (esLaUltima && !window.confirm(`Es tu única copia de ${carta.name}. Si la vendes, saldrá del álbum. ¿Venderla?`)) {
      return;
    }
    alVender(carta.id);
    if (esLaUltima) alCerrar();
  };

  return (
    <div className="modal-backdrop" onClick={alCerrar} role="presentation">
      <div
        className="dash-card card-modal"
        role="dialog"
        aria-modal="true"
        aria-label={carta.name}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={alCerrar} aria-label="Cerrar">×</button>

        <img
          src={carta.imageLarge || carta.image}
          alt={carta.name}
          className={`card-modal-img ${laTengo ? '' : 'is-missing'}`}
        />

        <div className="card-modal-info">
          <h3>{carta.name}</h3>
          <p className="card-subheading">
            {carta.setName} · Nº {carta.number}
          </p>
          <span className={`tier-badge tier-${carta.tier}`}>{NOMBRES_NIVEL[carta.tier]}</span>
          <p className="card-modal-price">
            Valor: <strong>{formatearEur(precioCartaEur(carta))}</strong> · {precio} monedas
            <small>Fuente: {textoFuente}</small>
          </p>

          {laTengo ? (
            <>
              <p className="card-modal-count">
                Tienes <strong>{cantidad}</strong> {cantidad === 1 ? 'copia' : 'copias'}
              </p>
              <button className="neon-cta-btn-sm full-width" onClick={venderCarta}>
                {cantidad === 1 ? `Vender la única copia · +${precio}` : `Vender 1 copia · +${precio}`}
              </button>
            </>
          ) : (
            <p className="card-modal-count">Todavía no la tienes. Sigue abriendo sobres de esta colección.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default FichaCarta;
