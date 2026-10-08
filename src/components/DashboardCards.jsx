// src/components/DashboardCards.jsx
import { MISSIONS, getSellPrice, missionStatus } from '../game/gameState';
import { TIER_LABELS } from '../utils/rarity';

export function AlbumProgressCard({ set, progress }) {
  return (
    <div className="dash-card">
      <h3 className="card-heading">Colección actual</h3>
      <p className="card-subheading">Progreso del álbum</p>

      {set && progress ? (
        <>
          <div className="progress-gauge-wrapper">
            <div className="gauge-circle" style={{ '--progress': `${progress.percent}%` }}>
              <span className="gauge-label">Completado</span>
              <span className="gauge-percentage">{progress.percent}%</span>
            </div>
          </div>
          <div className="gauge-footer-meta">
            <span className="set-highlight-name">{set.name}</span>
            <span className="set-highlight-count">
              {progress.owned}/{progress.total} cartas distintas
            </span>
          </div>
        </>
      ) : (
        <p className="empty-text">Abre tu primer sobre y aquí verás cuánto te falta para completar la colección.</p>
      )}
    </div>
  );
}

export function GachaponCard({ canClaim, onSpin }) {
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

      <button className="neon-cta-btn-sm full-width" onClick={onSpin} disabled={!canClaim}>
        {canClaim ? 'Girar gratis' : 'Vuelve mañana'}
      </button>
    </div>
  );
}

export function LatestDropsCard({ history }) {
  const latest = history.slice(0, 3);
  return (
    <div className="dash-card drops-row-card">
      <div>
        <h3 className="card-heading">Últimas raras</h3>
        <p className="card-subheading">Las últimas cartas raras o mejores que has sacado</p>
      </div>
      {latest.length === 0 ? (
        <p className="empty-text">Todavía ninguna.</p>
      ) : (
        <div className="rare-drop-previews">
          {latest.map(({ card, at }) => (
            <img
              key={`${card.id}-${at}`}
              src={card.image}
              alt={card.name}
              title={`${card.name} · ${TIER_LABELS[card.tier]}`}
              className="mini-rare-card"
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function MarketCard({ duplicates, topEntries, onSellAll, onSellOne }) {
  return (
    <div className="dash-card">
      <h3 className="card-heading">Mercado</h3>
      <p className="card-subheading">Vende tus repetidas para conseguir monedas</p>
      <div className="market-price-tag">
        {duplicates.coins.toLocaleString('es-ES')} <span className="coin-inline"></span>
      </div>
      <p className="card-subheading">
        {duplicates.sold === 0 ? 'No tienes repetidas' : `${duplicates.sold} cartas repetidas`}
      </p>

      {topEntries.length > 0 && (
        <div className="market-cards-strip">
          {topEntries.map(({ card, count }) => (
            <button
              key={card.id}
              className="market-card"
              onClick={() => onSellOne(card.id)}
              title={`Vender 1 ${card.name} por ${getSellPrice(card)} monedas`}
            >
              <img src={card.image} alt={card.name} />
              <span>x{count - 1} · +{getSellPrice(card)}</span>
            </button>
          ))}
        </div>
      )}

      <button className="neon-cta-btn-sm full-width" onClick={onSellAll} disabled={duplicates.sold === 0}>
        Vender todas las repetidas
      </button>
    </div>
  );
}

export function MissionsCard({ state, onClaim }) {
  return (
    <div className="dash-card">
      <h3 className="card-heading">Misiones diarias</h3>
      <p className="card-subheading">Se reinician cada día a las 00:00</p>

      {MISSIONS.map((mission) => {
        const status = missionStatus(state, mission);
        const value = Math.min(state.daily[mission.stat], mission.goal);
        return (
          <div key={mission.id} className="mission-row">
            <div className="mission-info">
              <span>{mission.label}</span>
              <small>+{mission.reward} monedas</small>
            </div>
            {status === 'ready' ? (
              <button className="neon-cta-btn-sm" onClick={() => onClaim(mission.id)}>Reclamar</button>
            ) : (
              <span className="mission-prog">{status === 'claimed' ? '✓' : `${value}/${mission.goal}`}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
