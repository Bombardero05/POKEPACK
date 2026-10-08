// src/components/Shop.jsx
import { useEffect, useMemo, useState } from 'react';
import { getCardsBySet } from '../services/pokemonService';
import { WILDCARD_MAX_PRICE, setProgress } from '../game/gameState';
import {
  BULK_DISCOUNTS,
  COINS_PER_EURO,
  bulkPrice,
  formatEur,
  packExpectedValueEur,
  packPriceCoins,
} from '../game/pricing';

/*
  Tienda: eliges una colección y compras sobres de esa colección a su precio.
  El precio depende de lo que valen sus cartas en el mercado (ver game/pricing.js),
  así que hay que cargar la colección para calcularlo.
*/
function Shop({ sets, game, defaultSetId, onCardsLoaded, onBuy, onOpenSet }) {
  const [setId, setSetId] = useState(defaultSetId || '');
  const [cards, setCards] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | loading | ready | error
  const [reloadKey, setReloadKey] = useState(0);

  // Colecciones empezadas primero; el resto, por fecha (la API ya las da así).
  const { started, others } = useMemo(() => {
    const withProgress = sets.map((set) => ({ set, owned: setProgress(game.collection, set).owned }));
    return {
      started: withProgress.filter((s) => s.owned > 0),
      others: withProgress.filter((s) => s.owned === 0),
    };
  }, [sets, game.collection]);

  useEffect(() => {
    if (!setId && sets.length > 0) setSetId(started[0]?.set.id || sets[0].id);
  }, [setId, sets, started]);

  useEffect(() => {
    if (!setId) return undefined;
    let cancelled = false;
    setStatus('loading');
    getCardsBySet(setId)
      .then((loaded) => {
        if (cancelled) return;
        setCards(loaded);
        setStatus('ready');
        onCardsLoaded(sets.find((s) => s.id === setId), loaded);
      })
      .catch(() => !cancelled && setStatus('error'));
    return () => {
      cancelled = true;
    };
  }, [setId, reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = sets.find((s) => s.id === setId);
  const ready = status === 'ready' && cards.length > 0;
  const unitPrice = ready ? packPriceCoins(cards) : null;
  const ev = ready ? packExpectedValueEur(cards) : null;
  const ownedPacks = Object.entries(game.setPacks).filter(([, n]) => n > 0);

  const optionLabel = (s) => (game.packPrices[s.id] ? `${s.name} · ${game.packPrices[s.id]} monedas` : s.name);

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
              <strong>{game.wildcards}</strong>
            </li>
            {ownedPacks.map(([id, n]) => (
              <li key={id}>
                <span>{sets.find((s) => s.id === id)?.name || id}</span>
                <strong>{n}</strong>
              </li>
            ))}
          </ul>
          <p className="card-subheading wildcard-note">
            Los comodines sirven para cualquier colección con sobre de hasta {WILDCARD_MAX_PRICE} monedas.
          </p>
        </div>

        <div className="dash-card">
          <label className="field">
            <span>Colección</span>
            <select className="custom-input" value={setId} onChange={(e) => setSetId(e.target.value)}>
              {started.length > 0 && (
                <optgroup label="Empezadas">
                  {started.map(({ set: s }) => (
                    <option key={s.id} value={s.id}>{optionLabel(s)}</option>
                  ))}
                </optgroup>
              )}
              <optgroup label="Todas las colecciones">
                {others.map(({ set: s }) => (
                  <option key={s.id} value={s.id}>{optionLabel(s)}</option>
                ))}
              </optgroup>
            </select>
          </label>

          {status === 'loading' && <p className="muted-text">Calculando el precio con las cartas de la colección...</p>}
          {status === 'error' && (
            <div className="error-box">
              <p>No se han podido cargar las cartas de esta colección.</p>
              <button className="btn-back" onClick={() => setReloadKey((k) => k + 1)}>Reintentar</button>
            </div>
          )}

          {ready && set && (
            <>
              <div className="pack-price-info">
                <div>
                  <span>Precio del sobre</span>
                  <strong>{unitPrice} monedas</strong>
                  <small>≈ {formatEur(unitPrice / COINS_PER_EURO)}</small>
                </div>
                <div>
                  <span>Valor medio de las cartas</span>
                  <strong>{Math.round(ev * COINS_PER_EURO)} monedas</strong>
                  <small>≈ {formatEur(ev)}</small>
                </div>
                <div>
                  <span>Comodines</span>
                  <strong>{unitPrice <= WILDCARD_MAX_PRICE ? 'Valen' : 'No valen'}</strong>
                  <small>{unitPrice <= WILDCARD_MAX_PRICE ? 'sobre de precio normal' : 'sobre caro'}</small>
                </div>
              </div>

              <div className="shop-grid">
                {Object.keys(BULK_DISCOUNTS).map((qtyText) => {
                  const qty = Number(qtyText);
                  const price = bulkPrice(unitPrice, qty);
                  const affordable = game.coins >= price;
                  return (
                    <div key={qty} className="shop-offer">
                      <div className="pack-stack" aria-hidden="true">
                        {Array.from({ length: Math.min(qty, 3) }, (_, i) => (
                          <div key={i} className="pack-mini-icon big"></div>
                        ))}
                      </div>
                      <h3>{qty} {qty === 1 ? 'sobre' : 'sobres'}</h3>
                      <p className="card-subheading">
                        {BULK_DISCOUNTS[qty] ? `${BULK_DISCOUNTS[qty] * 100} % de descuento` : 'Precio normal'}
                      </p>
                      <button
                        className="neon-cta-btn-sm full-width"
                        onClick={() => onBuy(set.id, qty, unitPrice)}
                        disabled={!affordable}
                      >
                        {affordable ? `Comprar · ${price}` : `Faltan ${price - game.coins} monedas`}
                      </button>
                    </div>
                  );
                })}
              </div>

              {(game.setPacks[set.id] || 0) > 0 && (
                <button className="btn-back full-width" onClick={() => onOpenSet(set)}>
                  Abrir mis sobres de {set.name} ({game.setPacks[set.id]})
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Shop;
