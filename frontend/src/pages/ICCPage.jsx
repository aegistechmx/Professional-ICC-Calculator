/**
 * ICCPage - Página principal de análisis ICC en vivo
 * Integra: Diagrama Unifilar + TCC Chart + Live Engine
 */

import { useSystemStore } from '../store/systemStore';
import { useLiveAnalysis } from '../hooks/useLiveAnalysis';
import TCCChart from '../components/TCCChart';
import IcoreLogoAnimated from '../components/IcoreLogoAnimated';

export default function ICCPage() {
  const systemModel = useSystemStore(s => s.systemModel);
  const setFaultBus = useSystemStore(s => s.setFaultBus);
  const updateBusPosition = useSystemStore(s => s.updateBusPosition);

  // Live analysis con debounce de 250ms
  const { result, status, error } = useLiveAnalysis(systemModel, { delay: 250 });

  // Handler para click en barra (establecer falla)
  const handleBusClick = (busId) => {
    setFaultBus(busId);
  };

  // Handler para drag de barra
  const handleBusDrag = (busId, position) => {
    updateBusPosition(busId, position);
  };

  // Transformar curvas TCC del resultado para el chart
  const tccCurves = result?.tcc?.map((curve, index) => ({
    id: curve.breaker.id || index,
    name: curve.label,
    data: curve.points.map(p => ({ I: p.x, t: p.y })),
    color: getCurveColor(index),
    standard: 'IEC',
    curveType: 'Very Inverse'
  })) || [];

  // Obtener corriente de falla del resultado
  const faultCurrent = result?.fault?.Isc
    ? result.fault.Isc * 1000 // convertir a A
    : null;

  // Detectar si hay falla activa
  const hasFault = Boolean(result?.fault?.Isc && result.fault.Isc > 0);

  return (
    <div className="p-4 h-screen flex flex-col bg-gray-50">
      {/* Header con logo animado */}
      <div className="flex items-center gap-4 mb-4">
        <IcoreLogoAnimated
          active={status === 'running' || status === 'idle'}
          faultDetected={hasFault}
          size={80}
        />
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Análisis ICC en Vivo
          </h1>
          <p className="text-sm text-gray-600">
            {status === 'running' && '⚡ Calculando...'}
            {status === 'idle' && hasFault && '🔥 Falla detectada'}
            {status === 'idle' && !hasFault && '✅ Sistema estable'}
            {status === 'error' && '❌ Error en cálculo'}
          </p>
        </div>
      </div>

      {/* Grid de 2 columnas */}
      <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">

        {/* Panel izquierdo: Diagrama Unifilar */}
        <div className="bg-white rounded-lg shadow p-4 overflow-auto">
          <h2 className="text-lg font-semibold mb-4">Diagrama Unifilar</h2>
          <UnifilarDiagram
            buses={systemModel.buses}
            branches={systemModel.branches}
            breakers={systemModel.breakers}
            faultBus={systemModel.settings.faultBus}
            result={result}
            status={status}
            onBusClick={handleBusClick}
            onBusDrag={handleBusDrag}
          />
        </div>

        {/* Panel derecho: Curvas TCC */}
        <div className="bg-white rounded-lg shadow p-4 overflow-auto">
          <h2 className="text-lg font-semibold mb-4">Coordinación TCC</h2>
          {tccCurves.length > 0 ? (
            <TCCChart
              curves={tccCurves}
              faultCurrent={faultCurrent}
              width={500}
              height={350}
              title="Curvas Tiempo-Corriente"
            />
          ) : (
            <div className="text-gray-500 text-center py-8">
              {status === 'running'
                ? 'Calculando curvas...'
                : 'Configure breakers para ver curvas TCC'}
            </div>
          )}

          {/* Info de coordinación */}
          {result?.coordination && (
            <div className={`mt-4 p-3 rounded ${result.coordination.coordinated
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
              }`}>
              <div className="font-semibold">
                {result.coordination.coordinated ? '✅ Coordinado' : '❌ No Coordinado'}
              </div>
              <div className="text-sm">
                Margen: {result.coordination.margin.toFixed(3)}s
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Panel inferior: Resultados detallados */}
      {result && (
        <div className="mt-4 bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-2">Resultados del Análisis</h2>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-600">Barras analizadas</div>
              <div className="font-mono text-lg">{result.buses?.length || 0}</div>
            </div>
            <div>
              <div className="text-gray-600">Ramas analizadas</div>
              <div className="font-mono text-lg">{result.branches?.length || 0}</div>
            </div>
            <div>
              <div className="text-gray-600">Protecciones</div>
              <div className="font-mono text-lg">{result.tcc?.length || 0}</div>
            </div>
            <div>
              <div className="text-gray-600">Estado</div>
              <div className={`font-semibold ${result.status === 'ok' ? 'text-green-600' : 'text-yellow-600'
                }`}>
                {result.status}
              </div>
            </div>
          </div>

          {result.warnings?.length > 0 && (
            <div className="mt-3 p-2 bg-yellow-50 rounded">
              <div className="text-sm font-semibold text-yellow-800">Advertencias:</div>
              <ul className="text-sm text-yellow-700">
                {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-800 rounded">
          Error: {error}
        </div>
      )}
    </div>
  );
}

/**
 * Componente de diagrama unifilar simplificado
 */
function UnifilarDiagram({
  buses,
  breakers,
  faultBus,
  result,
  status,
  onBusClick
}) {
  // Transformar resultado para mostrar Isc en nodos
  const nodesWithIsc = buses.map(bus => {
    const busResult = result?.buses?.find(b => b.id === bus.id);
    return {
      ...bus,
      Isc: busResult?.Isc
    };
  });

  return (
    <svg width="100%" height="300" className="border rounded bg-gray-50">
      {/* Rama principal */}
      <line x1="50" y1="150" x2="700" y2="150" stroke="#374151" strokeWidth="3" />

      {/* Barras y nodos */}
      {nodesWithIsc.map((bus, index) => {
        const x = 100 + index * 180;
        const y = 150;
        const isFault = bus.id === faultBus;

        return (
          <g key={bus.id}>
            {/* Línea de conexión vertical */}
            <line
              x1={x} y1={y}
              x2={x} y2={isFault ? 250 : 100}
              stroke="#6b7280"
              strokeWidth="2"
            />

            {/* Nodo (barra) */}
            <circle
              cx={x}
              cy={y}
              r={isFault ? 20 : 12}
              fill={isFault ? '#dc2626' : '#3b82f6'}
              stroke="white"
              strokeWidth="3"
              className="cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => onBusClick(bus.id)}
            />

            {/* Etiqueta de barra */}
            <text
              x={x}
              y={y - 25}
              textAnchor="middle"
              fontSize="11"
              fill="#374151"
              fontWeight="600"
            >
              {bus.name}
            </text>

            {/* ICC calculada */}
            {bus.Isc && (
              <text
                x={x}
                y={y + 5}
                textAnchor="middle"
                fontSize="10"
                fill="white"
                fontWeight="600"
              >
                {bus.Isc.toFixed(2)}kA
              </text>
            )}

            {/* Indicador de falla */}
            {isFault && (
              <g>
                <circle
                  cx={x}
                  cy={250}
                  r="8"
                  fill="#dc2626"
                  className="animate-pulse"
                />
                <text
                  x={x + 15}
                  y={255}
                  fontSize="10"
                  fill="#dc2626"
                  fontWeight="600"
                >
                  FALLA
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* Breakers */}
      {breakers.map((breaker, index) => {
        const x = 190 + index * 180;
        return (
          <g key={breaker.id}>
            <rect
              x={x - 8}
              y={142}
              width="16"
              height="16"
              fill="#f59e0b"
              stroke="#92400e"
              strokeWidth="2"
              rx="2"
            />
            <text
              x={x}
              y={140}
              textAnchor="middle"
              fontSize="9"
              fill="#92400e"
            >
              {breaker.model}
            </text>
          </g>
        );
      })}

      {/* Leyenda */}
      <g transform="translate(20, 280)">
        <circle r="8" fill="#3b82f6" />
        <text x="15" y="4" fontSize="10" fill="#374151">Barra normal</text>

        <circle cx="120" r="12" fill="#dc2626" />
        <text x="140" y="4" fontSize="10" fill="#374151">Punto de falla</text>

        <rect x="220" y="-8" width="16" height="16" fill="#f59e0b" rx="2" />
        <text x="245" y="4" fontSize="10" fill="#374151">Breaker</text>
      </g>

      {/* Status indicator */}
      <g transform="translate(650, 20)">
        <circle
          r="8"
          fill={status === 'running' ? '#f59e0b' : status === 'error' ? '#ef4444' : '#10b981'}
          className={status === 'running' ? 'animate-pulse' : ''}
        />
        <text x="15" y="4" fontSize="10" fill="#6b7280">
          {status === 'running' ? 'Calculando...' : status === 'error' ? 'Error' : 'Listo'}
        </text>
      </g>
    </svg>
  );
}

function getCurveColor(index) {
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  return colors[index % colors.length];
}
