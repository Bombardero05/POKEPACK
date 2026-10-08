// src/Inicio/App.jsx
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import './App.css';
import { getAllSets, clearCardsCache } from '../services/pokemonService';
import {
  gameReducer,
  loadGame,
  saveGame,
  canClaimGacha,
  rollGachaPrize,
  duplicatesValue,
  topDuplicates,
  setProgress,
  bestCard,
  totalPacks,
} from '../game/gameState';
import { packPriceCoins } from '../game/pricing';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import PackOpener from '../components/PackOpener';
import {
  AlbumProgressCard,
  GachaponCard,
  LatestDropsCard,
  MarketCard,
  MissionsCard,
} from '../components/DashboardCards';
import { SetsExplorer, Settings } from '../components/Views';
import Shop from '../components/Shop';
import Album from '../components/Album';

const TITLES = {
  home: 'Inicio',
  'all-sets': 'Colecciones',
  shop: 'Tienda',
  'my-collection': 'Álbum',
  settings: 'Ajustes',
};

function App() {
  const [game, dispatch] = useReducer(gameReducer, undefined, loadGame);
  const [currentTab, setCurrentTab] = useState('home');
  const [sets, setSets] = useState([]);
  const [setsStatus, setSetsStatus] = useState('loading'); // loading | ready | error
  const [openerRequest, setOpenerRequest] = useState(null);
  const [notice, setNotice] = useState('');

  // Guarda la partida cada vez que cambia.
  useEffect(() => {
    saveGame(game);
  }, [game]);

  // Los avisos ("+100 monedas"…) desaparecen solos a los 4 segundos.
  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  // Si se lanzan dos cargas a la vez (React en modo desarrollo monta dos veces),
  // solo la última puede cambiar el estado. Así una respuesta lenta con error
  // no tapa a una que ya ha ido bien.
  const lastSetsRequest = useRef(0);
  const loadSets = useCallback(async () => {
    const requestId = ++lastSetsRequest.current;
    setSetsStatus('loading');
    try {
      const data = await getAllSets();
      if (requestId !== lastSetsRequest.current) return;
      setSets(data);
      setSetsStatus('ready');
    } catch {
      if (requestId !== lastSetsRequest.current) return;
      setSetsStatus('error');
    }
  }, []);

  useEffect(() => {
    loadSets();
  }, [loadSets]);

  // Datos derivados de la partida (se recalculan solo cuando cambia).
  const lastSet = useMemo(() => sets.find((s) => s.id === game.lastSetId), [sets, game.lastSetId]);
  const progress = useMemo(() => setProgress(game.collection, lastSet), [game.collection, lastSet]);
  const duplicates = useMemo(() => duplicatesValue(game.collection), [game.collection]);
  const topEntries = useMemo(() => topDuplicates(game.collection), [game.collection]);
  const featuredCard = useMemo(() => bestCard(game.collection), [game.collection]);

  const handlePackOpened = (cards, set, packPrice) =>
    dispatch({ type: 'OPEN_PACK', cards, setId: set.id, packPrice });

  const handleBuyPacks = (setId, qty, unitPrice) => dispatch({ type: 'BUY_PACKS', setId, qty, unitPrice });

  // Cada vez que se cargan las cartas de una colección: se guarda el precio de su
  // sobre y se actualiza el valor de las cartas que ya tienes de ella.
  const handleCardsLoaded = useCallback((set, cards) => {
    if (!set || cards.length === 0) return;
    dispatch({ type: 'SET_PACK_PRICE', setId: set.id, price: packPriceCoins(cards) });
    dispatch({ type: 'REFRESH_PRICES', cards });
  }, []);

  const handleSpin = () => {
    const prize = rollGachaPrize();
    dispatch({ type: 'CLAIM_GACHA', prize });
    setNotice(prize.wildcards ? '¡Gachapón: +1 sobre comodín!' : `¡Gachapón: +${prize.coins} monedas!`);
  };

  const handleSellAll = () => {
    dispatch({ type: 'SELL_ALL_DUPLICATES' });
    setNotice(`Vendidas ${duplicates.sold} repetidas: +${duplicates.coins} monedas`);
  };

  const handleChooseSetFromExplorer = (set) => {
    setOpenerRequest({ set, at: Date.now() });
    setCurrentTab('home');
  };

  const handleChangeTab = (tab) => {
    setCurrentTab(tab);
    if (tab === 'home') setOpenerRequest(null);
  };

  return (
    <div className="app-container">
      <Sidebar currentTab={currentTab} onChangeTab={handleChangeTab} />

      <main className="main-viewport">
        <Header title={TITLES[currentTab]} coins={game.coins} packs={totalPacks(game)} notice={notice} />

        {currentTab === 'home' && (
          <div className="dashboard-grid">
            <div className="grid-col left-col">
              <AlbumProgressCard set={lastSet} progress={progress} />
              <GachaponCard canClaim={canClaimGacha(game)} onSpin={handleSpin} />
            </div>

            <div className="grid-col center-col">
              <div className="dash-card hero-display-card">
                <PackOpener
                  key={openerRequest?.at || 'opener'}
                  sets={sets}
                  setsStatus={setsStatus}
                  onRetrySets={loadSets}
                  game={game}
                  featuredCard={featuredCard}
                  onCardsLoaded={handleCardsLoaded}
                  onPackOpened={handlePackOpened}
                  onBuyPacks={handleBuyPacks}
                  request={openerRequest}
                />
              </div>
              <LatestDropsCard history={game.history} />
            </div>

            <div className="grid-col right-col">
              <MarketCard
                duplicates={duplicates}
                topEntries={topEntries}
                onSellAll={handleSellAll}
                onSellOne={(cardId) => dispatch({ type: 'SELL_DUPLICATE', cardId })}
              />
              <MissionsCard
                state={game}
                onClaim={(missionId) => dispatch({ type: 'CLAIM_MISSION', missionId })}
              />
            </div>
          </div>
        )}

        {currentTab === 'all-sets' && (
          <SetsExplorer
            sets={sets}
            setsStatus={setsStatus}
            onRetry={loadSets}
            collection={game.collection}
            onChooseSet={handleChooseSetFromExplorer}
          />
        )}

        {currentTab === 'shop' && (
          <Shop
            sets={sets}
            game={game}
            defaultSetId={game.lastSetId}
            onCardsLoaded={handleCardsLoaded}
            onBuy={(setId, qty, unitPrice) => {
              handleBuyPacks(setId, qty, unitPrice);
              setNotice(`Has comprado ${qty} ${qty === 1 ? 'sobre' : 'sobres'}`);
            }}
            onOpenSet={handleChooseSetFromExplorer}
          />
        )}

        {currentTab === 'my-collection' && (
          <Album
            sets={sets}
            collection={game.collection}
            defaultSetId={game.lastSetId}
            onCardsLoaded={handleCardsLoaded}
            onSell={(cardId) => dispatch({ type: 'SELL_CARD', cardId })}
            onGoHome={() => handleChangeTab('home')}
          />
        )}

        {currentTab === 'settings' && (
          <Settings state={game} onClearCache={clearCardsCache} onReset={() => dispatch({ type: 'RESET' })} />
        )}
      </main>

    </div>
  );
}

export default App;
