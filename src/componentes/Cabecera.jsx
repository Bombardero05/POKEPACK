function Cabecera({ titulo, monedas, sobres, aviso }) {
  return (
    <header className="dashboard-header">
      <div>
        <h1 className="view-heading">{titulo}</h1>
        {aviso && <p className="header-notice" role="status">{aviso}</p>}
      </div>

      <div className="top-pills-group">
        <div className="pill-resource">
          <div className="coin-icon"></div>
          <div className="pill-meta">
            <span className="pill-lbl">Monedas</span>
            <span className="pill-val">{monedas.toLocaleString('es-ES')}</span>
          </div>
        </div>
        <div className="pill-resource">
          <div className="pack-mini-icon"></div>
          <div className="pill-meta">
            <span className="pill-lbl">Sobres</span>
            <span className="pill-val">{sobres}</span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Cabecera;
