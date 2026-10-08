// src/components/Header.jsx

function Header({ title, coins, packs, notice }) {
  return (
    <header className="dashboard-header">
      <div>
        <h1 className="view-heading">{title}</h1>
        {notice && <p className="header-notice" role="status">{notice}</p>}
      </div>

      <div className="top-pills-group">
        <div className="pill-resource">
          <div className="coin-icon"></div>
          <div className="pill-meta">
            <span className="pill-lbl">Monedas</span>
            <span className="pill-val">{coins.toLocaleString('es-ES')}</span>
          </div>
        </div>
        <div className="pill-resource">
          <div className="pack-mini-icon"></div>
          <div className="pill-meta">
            <span className="pill-lbl">Sobres</span>
            <span className="pill-val">{packs}</span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
