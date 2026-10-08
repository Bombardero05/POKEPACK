// src/components/PackOpener.jsx
import { useEffect, useState } from 'react';
import PortadaDefault from '../assets/Portada.png';
import { getCardsBySet } from '../services/pokemonService';
import { generatePack } from '../utils/packOpenerLogic';
import { getPackImageBySetId } from '../utils/packImages';
import { TIER_LABELS } from '../utils/rarity';
import { packSourceFor, totalPacks, getSellPrice, WILDCARD_MAX_PRICE } from '../game/gameState';
import { packExpectedValueEur, packPriceCoins, formatEur, COINS_PER_EURO } from '../game/pricing';

const CARD_BACK = 'https://images.pokemontcg.io/cardback.png';

/*
  Flujo de apertura en 4 pasos:
  1. Portada: tu mejor carta y el botón para abrir sobres.
  2. Elegir colección.
  3. Revelar las 10 cartas una a una (salen boca abajo; un clic las gira, otro pasa a la siguiente).
  4. Resumen del sobre.

  Cada colección tiene su precio de sobre (ver game/pricing.js). Para abrir se usa,
  por este orden: un sobre comprado de esa colección, un comodín (si el sobre no es
  de los caros) o se compra uno en el momento.
*/
function PackOpener({ sets, setsStatus, onRetrySets, game, featuredCard, onCardsLoaded, onPackOpened, onBuyPacks, request }) {
  const [step, setStep] = useState('cover'); // cover | choose | ready | reveal | summary
  const [selectedSet, setSelectedSet] = useState(null);
  const [setCards, setSetCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [pack, setPack] = useState([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const chooseSet = async (set) => {
    setSelectedSet(set);
    setStep('ready');
    setError('');
    setLoadingCards(true);
    try {
      const cards = await getCardsBySet(set.id);
      setSetCards(cards);
      onCardsLoaded(set, cards);
    } catch {
      setError('No se han podido cargar las cartas. Revisa la conexión e inténtalo de nuevo.');
    } finally {
      setLoadingCards(false);
    }
  };

  // Cuando se elige una colección desde la pestaña "Colecciones".
  useEffect(() => {
    if (request?.set) chooseSet(request.set);
  }, [request]); // eslint-disable-line react-hooks/exhaustive-deps

  const packPrice = setCards.length > 0 ? packPriceCoins(setCards) : null;
  const source = selectedSet ? packSourceFor(game, selectedSet.id, packPrice) : null;
  const canBuy = packPrice != null && game.coins >= packPrice;

  const openPack = () => {
    if (setCards.length === 0) return;
    if (!source) {
      if (!canBuy) return;
      onBuyPacks(selectedSet.id, 1, packPrice); // compra uno y lo abre
    }
    const cards = generatePack(setCards);
    onPackOpened(cards, selectedSet, packPrice);
    setPack(cards);
    setIndex(0);
    setRevealed(false);
    setStep('reveal');
  };

  const handleCardClick = () => {
    if (!revealed) {
      setRevealed(true);
    } else if (index + 1 < pack.length) {
      setIndex(index + 1);
      setRevealed(false);
    } else {
      setStep('summary');
    }
  };

  const filteredSets = sets.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));
  const packs = totalPacks(game);

  const openLabel =
    source === 'set'
      ? `ABRIR SOBRE (te quedan ${game.setPacks[selectedSet.id]})`
      : source === 'wildcard'
        ? `ABRIR CON COMODÍN (te quedan ${game.wildcards})`
        : canBuy
          ? `COMPRAR Y ABRIR · ${packPrice} MONEDAS`
          : `TE FALTAN ${packPrice - game.coins} MONEDAS`;

  if (step === 'cover') {
    return (
      <div className="center-featured-content">
        <div className="card-spotlight-wrapper">
          <img
            src={featuredCard?.imageLarge || featuredCard?.image || PortadaDefault}
            alt={featuredCard ? featuredCard.name : 'Portada de PokéPack'}
            className="spotlight-card-img"
            onError={(e) => { e.target.src = PortadaDefault; }}
          />
        </div>
        {featuredCard && (
          <p className="spotlight-caption">
            Tu mejor carta: <strong>{featuredCard.name}</strong> · {TIER_LABELS[featuredCard.tier]}
          </p>
        )}
        <button className="neon-cta-btn" onClick={() => setStep('choose')}>
          {packs > 0 ? `ABRIR SOBRES (${packs})` : 'ELEGIR SOBRE'}
        </button>
      </div>
    );
  }

  if (step === 'choose') {
    return (
      <div className="pack-selection-flow">
        <div className="flow-header">
          <button className="btn-back" onClick={() => setStep('cover')}>← Volver</button>
          <h3>ELIGE EL SOBRE QUE QUIERES ABRIR</h3>
          <input
            type="text"
            placeholder="Buscar colección..."
            className="custom-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {setsStatus === 'loading' && <p className="muted-text">Cargando colecciones...</p>}
        {setsStatus === 'error' && (
          <div className="error-box">
            <p>No se han podido cargar las colecciones.</p>
            <button className="btn-back" onClick={onRetrySets}>Reintentar</button>
          </div>
        )}

        <div className="sets-grid-scroll">
          {filteredSets.map((set) => (
            <button key={set.id} className="set-box" onClick={() => chooseSet(set)}>
              <img src={set.images.logo} alt="" />
              <p>{set.name}</p>
              <small>{set.printedTotal} cartas</small>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (step === 'ready') {
    return (
      <div className="center-featured-content">
        <button className="btn-back align-start" onClick={() => setStep('choose')}>← Cambiar sobre</button>
        {loadingCards && <p className="muted-text">Preparando cartas de la colección...</p>}
        {error && (
          <div className="error-box">
            <p>{error}</p>
            <button className="btn-back" onClick={() => chooseSet(selectedSet)}>Reintentar</button>
          </div>
        )}
        {!loadingCards && !error && (
          <>
            <img src={getPackImageBySetId(selectedSet.id)} alt={selectedSet.name} className="spotlight-card-img" />
            <h3 className="pack-title">{selectedSet.name}</h3>
            <PackPriceInfo
              setCards={setCards}
              packPrice={packPrice}
              ownedForSet={game.setPacks[selectedSet.id] || 0}
              wildcards={game.wildcards}
              wildcardValid={packPrice != null && packPrice <= WILDCARD_MAX_PRICE}
            />
            <button className="neon-cta-btn" onClick={openPack} disabled={!source && !canBuy}>
              {openLabel}
            </button>
          </>
        )}
      </div>
    );
  }

  if (step === 'reveal') {
    const card = pack[index];
    return (
      <div className="opening-flow-card">
        <span className="card-counter-indicator">Carta {index + 1} de {pack.length}</span>
        <button
          className="flip-card-container"
          onClick={handleCardClick}
          aria-label={revealed ? 'Siguiente carta' : 'Dar la vuelta a la carta'}
        >
          {/* key={index}: cada carta nueva empieza boca abajo, sin animación que la deje ver */}
          <div key={index} className={`flip-card-inner ${revealed ? '' : 'flipped'}`}>
            <div className="flip-card-front">
              <img src={card.image} alt={card.name} />
            </div>
            <div className="flip-card-back">
              <img src={CARD_BACK} alt="" />
            </div>
          </div>
        </button>
        {revealed ? (
          <>
            <h4 className="opened-card-name">{card.name}</h4>
            <span className={`tier-badge tier-${card.tier}`}>{TIER_LABELS[card.tier]}</span>
          </>
        ) : (
          <p className="muted-text">Toca la carta para darle la vuelta</p>
        )}
        <button className="btn-back" onClick={() => setStep('summary')}>Ver todas</button>
      </div>
    );
  }

  // step === 'summary'
  return (
    <div className="summary-flow">
      <div className="summary-actions">
        <button className="btn-back" onClick={() => setStep('choose')}>← Colecciones</button>
        <button className="neon-cta-btn-sm" onClick={openPack} disabled={!source && !canBuy}>
          {source ? 'Abrir otro' : canBuy ? `Comprar y abrir otro · ${packPrice}` : 'Sin monedas'}
        </button>
      </div>
      <h4>Resumen del sobre</h4>
      <p className="muted-text">
        Valor de las cartas: <strong>{pack.reduce((sum, c) => sum + getSellPrice(c), 0)} monedas</strong>
        {packPrice != null && <> · el sobre costaba {packPrice}</>}
      </p>
      <div className="summary-cards-row">
        {pack.map((card) => (
          <div key={card.id} className="summary-thumb">
            <img src={card.image} alt={card.name} />
            <small>{card.name}</small>
            <span className={`tier-dot tier-${card.tier}`} title={TIER_LABELS[card.tier]}></span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PackPriceInfo({ setCards, packPrice, ownedForSet, wildcards, wildcardValid }) {
  if (packPrice == null) return null;
  const ev = packExpectedValueEur(setCards);
  return (
    <div className="pack-price-info">
      <div>
        <span>Precio del sobre</span>
        <strong>{packPrice} monedas</strong>
        <small>≈ {formatEur(packPrice / COINS_PER_EURO)}</small>
      </div>
      <div>
        <span>Valor medio de las cartas</span>
        <strong>{Math.round(ev * COINS_PER_EURO)} monedas</strong>
        <small>≈ {formatEur(ev)}</small>
      </div>
      <div>
        <span>Tus sobres</span>
        <strong>{ownedForSet} de esta colección</strong>
        <small>
          {wildcards} comodines{wildcards > 0 && !wildcardValid ? ' (no valen: sobre caro)' : ''}
        </small>
      </div>
    </div>
  );
}

export default PackOpener;
