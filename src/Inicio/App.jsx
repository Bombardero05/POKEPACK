import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import './App.css';
import { obtenerColecciones, borrarCacheCartas } from '../servicios/servicioPokemon';
import {
  reductorJuego,
  cargarPartida,
  guardarPartida,
  puedeReclamarGachapon,
  sortearPremioGachapon,
  valorRepetidas,
  mejoresRepetidas,
  progresoColeccion,
  mejorCarta,
  totalSobres,
} from '../juego/estadoJuego';
import { precioSobreMonedas } from '../juego/precios';
import BarraLateral, { PESTANAS } from '../componentes/BarraLateral';
import Cabecera from '../componentes/Cabecera';
import AbridorSobres from '../componentes/AbridorSobres';
import {
  TarjetaProgresoAlbum,
  TarjetaGachapon,
  TarjetaUltimasRaras,
  TarjetaMercado,
  TarjetaMisiones,
} from '../componentes/TarjetasPanel';
import { ExploradorColecciones, Ajustes } from '../componentes/Vistas';
import Tienda from '../componentes/Tienda';
import Album from '../componentes/Album';

function App() {
  const [partida, despachar] = useReducer(reductorJuego, undefined, cargarPartida);
  const [pestanaActual, setPestanaActual] = useState('inicio');
  const [colecciones, setColecciones] = useState([]);
  const [estadoColecciones, setEstadoColecciones] = useState('cargando');
  const [peticionAbridor, setPeticionAbridor] = useState(null);
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    guardarPartida(partida);
  }, [partida]);

  useEffect(() => {
    if (!aviso) return undefined;
    const temporizador = setTimeout(() => setAviso(''), 4000);
    return () => clearTimeout(temporizador);
  }, [aviso]);

  const ultimaPeticionColecciones = useRef(0);
  const cargarColecciones = useCallback(async () => {
    const idPeticion = ++ultimaPeticionColecciones.current;
    setEstadoColecciones('cargando');
    try {
      const datos = await obtenerColecciones();
      if (idPeticion !== ultimaPeticionColecciones.current) return;
      setColecciones(datos);
      setEstadoColecciones('listo');
    } catch {
      if (idPeticion !== ultimaPeticionColecciones.current) return;
      setEstadoColecciones('error');
    }
  }, []);

  useEffect(() => {
    cargarColecciones();
  }, [cargarColecciones]);

  const ultimaColeccion = useMemo(
    () => colecciones.find((c) => c.id === partida.lastSetId),
    [colecciones, partida.lastSetId]
  );
  const progreso = useMemo(
    () => progresoColeccion(partida.collection, ultimaColeccion),
    [partida.collection, ultimaColeccion]
  );
  const repetidas = useMemo(() => valorRepetidas(partida.collection), [partida.collection]);
  const mejores = useMemo(() => mejoresRepetidas(partida.collection), [partida.collection]);
  const cartaDestacada = useMemo(() => mejorCarta(partida.collection), [partida.collection]);

  const sobreAbierto = (cartas, coleccion, precioSobre) =>
    despachar({ tipo: 'ABRIR_SOBRE', cartas, idColeccion: coleccion.id, precioSobre });

  const comprarSobres = (idColeccion, cantidad, precioUnidad) =>
    despachar({ tipo: 'COMPRAR_SOBRES', idColeccion, cantidad, precioUnidad });

  const cartasCargadas = useCallback((coleccion, cartas) => {
    if (!coleccion || cartas.length === 0) return;
    despachar({ tipo: 'FIJAR_PRECIO_SOBRE', idColeccion: coleccion.id, precio: precioSobreMonedas(cartas) });
    despachar({ tipo: 'ACTUALIZAR_PRECIOS', cartas });
  }, []);

  const girarGachapon = () => {
    const premio = sortearPremioGachapon();
    despachar({ tipo: 'RECLAMAR_GACHAPON', premio });
    setAviso(premio.comodines ? '¡Gachapón: +1 sobre comodín!' : `¡Gachapón: +${premio.monedas} monedas!`);
  };

  const venderTodas = () => {
    despachar({ tipo: 'VENDER_TODAS_REPETIDAS' });
    setAviso(`Vendidas ${repetidas.vendidas} repetidas: +${repetidas.monedas} monedas`);
  };

  const elegirColeccionParaAbrir = (coleccion) => {
    setPeticionAbridor({ coleccion, momento: Date.now() });
    setPestanaActual('inicio');
  };

  const cambiarPestana = (pestana) => {
    setPestanaActual(pestana);
    if (pestana === 'inicio') setPeticionAbridor(null);
  };

  const titulo = PESTANAS.find((p) => p.id === pestanaActual)?.texto;

  return (
    <div className="app-container">
      <BarraLateral pestanaActual={pestanaActual} alCambiarPestana={cambiarPestana} />

      <main className="main-viewport">
        <Cabecera titulo={titulo} monedas={partida.coins} sobres={totalSobres(partida)} aviso={aviso} />

        {pestanaActual === 'inicio' && (
          <div className="dashboard-grid">
            <div className="grid-col left-col">
              <TarjetaProgresoAlbum coleccion={ultimaColeccion} progreso={progreso} />
              <TarjetaGachapon puedeReclamar={puedeReclamarGachapon(partida)} alGirar={girarGachapon} />
            </div>

            <div className="grid-col center-col">
              <div className="dash-card hero-display-card">
                <AbridorSobres
                  key={peticionAbridor?.momento || 'abridor'}
                  colecciones={colecciones}
                  estadoColecciones={estadoColecciones}
                  alReintentarColecciones={cargarColecciones}
                  partida={partida}
                  cartaDestacada={cartaDestacada}
                  alCargarCartas={cartasCargadas}
                  alAbrirSobre={sobreAbierto}
                  alComprarSobres={comprarSobres}
                  peticion={peticionAbridor}
                />
              </div>
              <TarjetaUltimasRaras historial={partida.history} />
            </div>

            <div className="grid-col right-col">
              <TarjetaMercado
                repetidas={repetidas}
                mejores={mejores}
                alVenderTodas={venderTodas}
                alVenderUna={(idCarta) => despachar({ tipo: 'VENDER_REPETIDA', idCarta })}
              />
              <TarjetaMisiones
                estado={partida}
                alReclamar={(idMision) => despachar({ tipo: 'RECLAMAR_MISION', idMision })}
              />
            </div>
          </div>
        )}

        {pestanaActual === 'colecciones' && (
          <ExploradorColecciones
            colecciones={colecciones}
            estadoColecciones={estadoColecciones}
            alReintentar={cargarColecciones}
            miColeccion={partida.collection}
            alElegirColeccion={elegirColeccionParaAbrir}
          />
        )}

        {pestanaActual === 'tienda' && (
          <Tienda
            colecciones={colecciones}
            partida={partida}
            idColeccionInicial={partida.lastSetId}
            alCargarCartas={cartasCargadas}
            alComprar={(idColeccion, cantidad, precioUnidad) => {
              comprarSobres(idColeccion, cantidad, precioUnidad);
              setAviso(`Has comprado ${cantidad} ${cantidad === 1 ? 'sobre' : 'sobres'}`);
            }}
            alAbrirColeccion={elegirColeccionParaAbrir}
          />
        )}

        {pestanaActual === 'album' && (
          <Album
            colecciones={colecciones}
            miColeccion={partida.collection}
            idColeccionInicial={partida.lastSetId}
            alCargarCartas={cartasCargadas}
            alVender={(idCarta) => despachar({ tipo: 'VENDER_CARTA', idCarta })}
            alIrAInicio={() => cambiarPestana('inicio')}
          />
        )}

        {pestanaActual === 'ajustes' && (
          <Ajustes
            estado={partida}
            alBorrarCache={borrarCacheCartas}
            alReiniciar={() => despachar({ tipo: 'REINICIAR' })}
          />
        )}
      </main>
    </div>
  );
}

export default App;
