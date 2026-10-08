// src/components/CardModal.jsx
import { useEffect } from 'react';
import { getSellPrice } from '../game/gameState';
import { cardPriceEur, formatEur } from '../game/pricing';
import { TIER_LABELS } from '../utils/rarity';

/**
 * Ficha ampliada de una carta. Si la tienes, permite venderla.
 * Se cierra con Escape, con el botón o pulsando fuera.
 */
function CardModal({ card, count, onSell, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const owned = count > 0;
  const price = getSellPrice(card);
  const sourceText = {
    cardmarket: 'Cardmarket, media de 30 días',
    tcgplayer: 'TCGplayer, precio de mercado',
    estimado: 'estimado por rareza y colección',
  }[card.priceSource] || 'estimado por rareza';

  const handleSell = () => {
    const isLast = count === 1;
    if (isLast && !window.confirm(`Es tu única copia de ${card.name}. Si la vendes, saldrá del álbum. ¿Venderla?`)) {
      return;
    }
    onSell(card.id);
    if (isLast) onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="dash-card card-modal"
        role="dialog"
        aria-modal="true"
        aria-label={card.name}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label="Cerrar">×</button>

        <img
          src={card.imageLarge || card.image}
          alt={card.name}
          className={`card-modal-img ${owned ? '' : 'is-missing'}`}
        />

        <div className="card-modal-info">
          <h3>{card.name}</h3>
          <p className="card-subheading">
            {card.setName} · Nº {card.number}
          </p>
          <span className={`tier-badge tier-${card.tier}`}>{TIER_LABELS[card.tier]}</span>
          <p className="card-modal-price">
            Valor: <strong>{formatEur(cardPriceEur(card))}</strong> · {price} monedas
            <small>Fuente: {sourceText}</small>
          </p>

          {owned ? (
            <>
              <p className="card-modal-count">
                Tienes <strong>{count}</strong> {count === 1 ? 'copia' : 'copias'}
              </p>
              <button className="neon-cta-btn-sm full-width" onClick={handleSell}>
                {count === 1 ? `Vender la única copia · +${price}` : `Vender 1 copia · +${price}`}
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

export default CardModal;
