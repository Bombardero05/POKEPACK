// src/components/Views.jsx
import { useState } from 'react';
import { setProgress, totalPacks } from '../game/gameState';

const includes = (text, search) => text.toLowerCase().includes(search.toLowerCase());

export function SetsExplorer({ sets, setsStatus, onRetry, collection, onChooseSet }) {
  const [search, setSearch] = useState('');
  const filtered = sets.filter((s) => includes(s.name, search));

  return (
    <div className="view-wrapper">
      <div className="view-header-bar">
        <h2>Colecciones disponibles</h2>
        <input
          type="text"
          placeholder="Buscar colección..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="custom-input"
        />
      </div>

      {setsStatus === 'loading' && <p className="muted-text">Cargando colecciones...</p>}
      {setsStatus === 'error' && (
        <div className="dash-card error-box">
          <p>No se han podido cargar las colecciones.</p>
          <button className="btn-back" onClick={onRetry}>Reintentar</button>
        </div>
      )}

      <div className="all-sets-grid">
        {filtered.map((set) => {
          const progress = setProgress(collection, set);
          return (
            <button key={set.id} className="dash-card set-explorer-card" onClick={() => onChooseSet(set)}>
              <img src={set.images.logo} alt="" className="set-explorer-logo" />
              <h4>{set.name}</h4>
              <span>{progress.owned}/{progress.total} cartas</span>
              <div className="mini-progress" aria-hidden="true">
                <div style={{ width: `${progress.percent}%` }}></div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Settings({ state, onClearCache, onReset }) {
  const [cacheCleared, setCacheCleared] = useState(false);
  const distinct = Object.keys(state.collection).length;
  const total = Object.values(state.collection).reduce((sum, e) => sum + e.count, 0);

  const handleReset = () => {
    if (window.confirm('Se borrarán tu colección, tus monedas y tus sobres. ¿Seguro?')) onReset();
  };

  return (
    <div className="view-wrapper">
      <div className="settings-grid">
        <div className="dash-card">
          <h3 className="card-heading">Tu partida</h3>
          <ul className="stats-list">
            <li><span>Cartas distintas</span><strong>{distinct}</strong></li>
            <li><span>Cartas en total</span><strong>{total}</strong></li>
            <li><span>Monedas</span><strong>{state.coins.toLocaleString('es-ES')}</strong></li>
            <li><span>Sobres sin abrir</span><strong>{totalPacks(state)}</strong></li>
            <li><span>De ellos, comodines</span><strong>{state.wildcards}</strong></li>
          </ul>
        </div>

        <div className="dash-card">
          <h3 className="card-heading">Datos guardados</h3>
          <p className="card-subheading">
            La partida se guarda en este navegador. Las cartas de cada colección se guardan en caché para no
            pedirlas otra vez a la API.
          </p>
          <div className="settings-actions">
            <button
              className="btn-back"
              onClick={() => { onClearCache(); setCacheCleared(true); }}
            >
              {cacheCleared ? 'Caché borrada ✓' : 'Borrar caché de cartas'}
            </button>
            <button className="btn-danger" onClick={handleReset}>Reiniciar partida</button>
          </div>
        </div>
      </div>
    </div>
  );
}
