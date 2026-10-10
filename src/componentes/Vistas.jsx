import { useState } from 'react';
import { progresoColeccion, totalSobres } from '../juego/estadoJuego';

const contiene = (texto, busqueda) => texto.toLowerCase().includes(busqueda.toLowerCase());

export function ExploradorColecciones({ colecciones, estadoColecciones, alReintentar, miColeccion, alElegirColeccion }) {
  const [busqueda, setBusqueda] = useState('');
  const filtradas = colecciones.filter((c) => contiene(c.name, busqueda));

  return (
    <div className="view-wrapper">
      <div className="view-header-bar">
        <h2>Colecciones disponibles</h2>
        <input
          type="text"
          placeholder="Buscar colección..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="custom-input"
        />
      </div>

      {estadoColecciones === 'cargando' && <p className="muted-text">Cargando colecciones...</p>}
      {estadoColecciones === 'error' && (
        <div className="dash-card error-box">
          <p>No se han podido cargar las colecciones.</p>
          <button className="btn-back" onClick={alReintentar}>Reintentar</button>
        </div>
      )}

      <div className="all-sets-grid">
        {filtradas.map((coleccion) => {
          const progreso = progresoColeccion(miColeccion, coleccion);
          return (
            <button key={coleccion.id} className="dash-card set-explorer-card" onClick={() => alElegirColeccion(coleccion)}>
              <img src={coleccion.images.logo} alt="" className="set-explorer-logo" />
              <h4>{coleccion.name}</h4>
              <span>{progreso.tengo}/{progreso.total} cartas</span>
              <div className="mini-progress" aria-hidden="true">
                <div style={{ width: `${progreso.porcentaje}%` }}></div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Ajustes({ estado, alBorrarCache, alReiniciar }) {
  const [cacheBorrada, setCacheBorrada] = useState(false);
  const distintas = Object.keys(estado.collection).length;
  const total = Object.values(estado.collection).reduce((suma, e) => suma + e.count, 0);

  const reiniciarPartida = () => {
    if (window.confirm('Se borrarán tu colección, tus monedas y tus sobres. ¿Seguro?')) alReiniciar();
  };

  return (
    <div className="view-wrapper">
      <div className="settings-grid">
        <div className="dash-card">
          <h3 className="card-heading">Tu partida</h3>
          <ul className="stats-list">
            <li><span>Cartas distintas</span><strong>{distintas}</strong></li>
            <li><span>Cartas en total</span><strong>{total}</strong></li>
            <li><span>Monedas</span><strong>{estado.coins.toLocaleString('es-ES')}</strong></li>
            <li><span>Sobres sin abrir</span><strong>{totalSobres(estado)}</strong></li>
            <li><span>De ellos, comodines</span><strong>{estado.wildcards}</strong></li>
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
              onClick={() => { alBorrarCache(); setCacheBorrada(true); }}
            >
              {cacheBorrada ? 'Caché borrada ✓' : 'Borrar caché de cartas'}
            </button>
            <button className="btn-danger" onClick={reiniciarPartida}>Reiniciar partida</button>
          </div>
        </div>
      </div>
    </div>
  );
}
