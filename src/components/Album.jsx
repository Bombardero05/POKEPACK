// src/components/Album.jsx
import { useEffect, useMemo, useState } from 'react';
import { getCardsBySet } from '../services/pokemonService';
import { getSellPrice, setProgress } from '../game/gameState';
import { SORT_OPTIONS, buildSetAlbum, countByTier, filterByPrice, sortEntries } from '../game/albumUtils';
import { TIERS, TIER_LABELS } from '../utils/rarity';
import CardModal from './CardModal';

/*
  El álbum tiene dos modos:
  - "Por colección": todas las cartas de una colección, en orden. Las que no
    tienes salen en gris y apagadas, para ver qué te falta.
  - "Mis cartas": solo las que tienes, con filtro y orden por rareza.
*/
function Album({ sets, collection, defaultSetId, onCardsLoaded, onSell, onGoHome }) {
  const [mode, setMode] = useState('set'); // set | owned
  const [selected, setSelected] = useState(null); // carta abierta en la ficha

  const ownedEntries = useMemo(() => Object.values(collection), [collection]);
  const selectedCount = selected ? collection[selected.id]?.count || 0 : 0;

  return (
    <div className="view-wrapper">
      <div className="view-header-bar">
        <div>
          <h2>Mi álbum</h2>
          <p className="card-subheading">
            Tienes <strong>{ownedEntries.length}</strong> cartas distintas.
          </p>
        </div>
        <div className="segmented" role="tablist" aria-label="Modo del álbum">
          <button role="tab" aria-selected={mode === 'set'} className={mode === 'set' ? 'active' : ''} onClick={() => setMode('set')}>
            Por colección
          </button>
          <button role="tab" aria-selected={mode === 'owned'} className={mode === 'owned' ? 'active' : ''} onClick={() => setMode('owned')}>
            Mis cartas
          </button>
        </div>
      </div>

      {mode === 'set' ? (
        <SetAlbum sets={sets} collection={collection} defaultSetId={defaultSetId} onCardsLoaded={onCardsLoaded} onSelectCard={setSelected} />
      ) : (
        <OwnedCards entries={ownedEntries} onSelectCard={setSelected} onGoHome={onGoHome} />
      )}

      {selected && (
        <CardModal card={selected} count={selectedCount} onSell={onSell} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

/* ---------- Modo "Por colección" ---------- */

function SetAlbum({ sets, collection, defaultSetId, onCardsLoaded, onSelectCard }) {
  // Colecciones empezadas primero (las de más progreso arriba) y luego el resto.
  const { started, others } = useMemo(() => {
    const withProgress = sets.map((set) => ({ set, progress: setProgress(collection, set) }));
    return {
      started: withProgress.filter((s) => s.progress.owned > 0).sort((a, b) => b.progress.percent - a.progress.percent),
      others: withProgress.filter((s) => s.progress.owned === 0),
    };
  }, [sets, collection]);

  const initialSetId = defaultSetId || started[0]?.set.id || sets[0]?.id || '';
  const [setId, setSetId] = useState(initialSetId);
  const [show, setShow] = useState('all'); // all | owned | missing
  const [setCards, setSetCards] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | loading | ready | error
  const [reloadKey, setReloadKey] = useState(0);

  // Las colecciones llegan de la API después del primer render.
  useEffect(() => {
    if (!setId && initialSetId) setSetId(initialSetId);
  }, [setId, initialSetId]);

  useEffect(() => {
    if (!setId) return undefined;
    let cancelled = false;
    setStatus('loading');
    getCardsBySet(setId)
      .then((cards) => {
        if (cancelled) return;
        setSetCards(cards);
        setStatus('ready');
        onCardsLoaded(sets.find((s) => s.id === setId), cards);
      })
      .catch(() => !cancelled && setStatus('error'));
    return () => {
      cancelled = true;
    };
  }, [setId, reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = sets.find((s) => s.id === setId);
  const progress = setProgress(collection, set);
  const album = useMemo(() => buildSetAlbum(setCards, collection), [setCards, collection]);
  const visible = album.filter((slot) => show === 'all' || (show === 'owned' ? slot.owned : !slot.owned));

  if (sets.length === 0) return <p className="muted-text">Cargando colecciones...</p>;

  return (
    <>
      <div className="dash-card album-toolbar">
        <label className="field">
          <span>Colección</span>
          <select className="custom-input" value={setId} onChange={(e) => setSetId(e.target.value)}>
            {started.length > 0 && (
              <optgroup label="Empezadas">
                {started.map(({ set: s, progress: p }) => (
                  <option key={s.id} value={s.id}>{s.name} · {p.percent}%</option>
                ))}
              </optgroup>
            )}
            <optgroup label="Todas las colecciones">
              {others.map(({ set: s }) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </optgroup>
          </select>
        </label>

        <label className="field">
          <span>Mostrar</span>
          <select className="custom-input" value={show} onChange={(e) => setShow(e.target.value)}>
            <option value="all">Todas</option>
            <option value="owned">Solo las que tengo</option>
            <option value="missing">Solo las que me faltan</option>
          </select>
        </label>

        {set && progress && (
          <div className="album-progress">
            <div className="album-progress-text">
              <strong>{progress.owned}/{progress.total}</strong> cartas · {progress.percent}%
            </div>
            <div className="mini-progress" aria-hidden="true">
              <div style={{ width: `${progress.percent}%` }}></div>
            </div>
          </div>
        )}
      </div>

      {status === 'loading' && <p className="muted-text">Cargando las cartas de la colección...</p>}
      {status === 'error' && (
        <div className="dash-card error-box">
          <p>No se han podido cargar las cartas de esta colección.</p>
          <button className="btn-back" onClick={() => setReloadKey((k) => k + 1)}>Reintentar</button>
        </div>
      )}

      {status === 'ready' && (
        <div className="album-cards-grid">
          {visible.map(({ card, owned, count }) => (
            <button
              key={card.id}
              className={`album-card-item ${owned ? '' : 'is-missing'}`}
              onClick={() => onSelectCard(card)}
              title={owned ? card.name : `${card.name} · te falta`}
            >
              {count > 1 && <div className="card-qty-badge">x{count}</div>}
              <span className="card-number">Nº {card.number}</span>
              <img src={card.image} alt={card.name} loading="lazy" />
              <p>{card.name}</p>
              <small className={`tier-text tier-${card.tier}`}>{TIER_LABELS[card.tier]}</small>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

/* ---------- Modo "Mis cartas" ---------- */

function OwnedCards({ entries, onSelectCard, onGoHome }) {
  const [search, setSearch] = useState('');
  const [sortId, setSortId] = useState('tier-desc');
  const [hiddenTiers, setHiddenTiers] = useState([]);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const counts = useMemo(() => countByTier(entries), [entries]);
  const visible = useMemo(
    () =>
      sortEntries(
        filterByPrice(
          entries.filter(
            ({ card }) =>
              !hiddenTiers.includes(card.tier) && card.name.toLowerCase().includes(search.toLowerCase())
          ),
          minPrice,
          maxPrice
        ),
        sortId
      ),
    [entries, hiddenTiers, search, sortId, minPrice, maxPrice]
  );

  const toggleTier = (tier) =>
    setHiddenTiers((prev) => (prev.includes(tier) ? prev.filter((t) => t !== tier) : [...prev, tier]));

  if (entries.length === 0) {
    return (
      <div className="dash-card empty-card-album">
        <p>Tu álbum está vacío. Abre sobres para empezar a llenarlo.</p>
        <button className="neon-cta-btn-sm" onClick={onGoHome}>Abrir sobres</button>
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
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="custom-input"
          />
        </label>
        <label className="field">
          <span>Ordenar</span>
          <select className="custom-input" value={sortId} onChange={(e) => setSortId(e.target.value)}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
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
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="custom-input"
            />
            <span aria-hidden="true">–</span>
            <input
              type="number"
              min="0"
              inputMode="numeric"
              placeholder="Máx."
              aria-label="Precio máximo"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="custom-input"
            />
            {(minPrice !== '' || maxPrice !== '') && (
              <button className="btn-back" onClick={() => { setMinPrice(''); setMaxPrice(''); }}>
                Quitar
              </button>
            )}
          </div>
        </div>

        <div className="field">
          <span>Rareza</span>
          <div className="tier-filters">
            {TIERS.map((tier) => (
              <button
                key={tier}
                className={`tier-chip tier-${tier} ${hiddenTiers.includes(tier) ? 'off' : ''}`}
                aria-pressed={!hiddenTiers.includes(tier)}
                onClick={() => toggleTier(tier)}
                disabled={!counts[tier]}
              >
                {TIER_LABELS[tier]} · {counts[tier] || 0}
              </button>
            ))}
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="muted-text">Ninguna carta coincide con los filtros.</p>
      ) : (
        <div className="album-cards-grid">
          {visible.map(({ card, count }) => (
            <button key={card.id} className="album-card-item" onClick={() => onSelectCard(card)}>
              {count > 1 && <div className="card-qty-badge">x{count}</div>}
              <img src={card.image} alt={card.name} loading="lazy" />
              <p>{card.name}</p>
              <small className={`tier-text tier-${card.tier}`}>{TIER_LABELS[card.tier]}</small>
              <span className="card-price">{getSellPrice(card)} monedas</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

export default Album;
