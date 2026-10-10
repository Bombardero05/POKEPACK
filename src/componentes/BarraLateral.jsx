const ICONOS = {
  inicio: <><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></>,
  colecciones: <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></>,
  tienda: <><circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" /><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" /></>,
  album: <><rect x="4" y="2" width="16" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></>,
  ajustes: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></>,
};

export const PESTANAS = [
  { id: 'inicio', texto: 'Inicio' },
  { id: 'colecciones', texto: 'Colecciones' },
  { id: 'tienda', texto: 'Tienda' },
  { id: 'album', texto: 'Álbum' },
  { id: 'ajustes', texto: 'Ajustes' },
];

function BarraLateral({ pestanaActual, alCambiarPestana }) {
  return (
    <aside className="sidebar-nav">
      <div className="brand-logo">
        <div className="pokeball-icon">
          <div className="pokeball-center"></div>
        </div>
        <div className="brand-text">
          <span className="brand-title">PokéPack</span>
          <span className="brand-subtitle">Collector</span>
        </div>
      </div>

      <nav className="nav-menu">
        {PESTANAS.map((pestana) => (
          <button
            key={pestana.id}
            className={`nav-item ${pestanaActual === pestana.id ? 'active' : ''}`}
            onClick={() => alCambiarPestana(pestana.id)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-svg" aria-hidden="true">
              {ICONOS[pestana.id]}
            </svg>
            <span>{pestana.texto}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}

export default BarraLateral;
