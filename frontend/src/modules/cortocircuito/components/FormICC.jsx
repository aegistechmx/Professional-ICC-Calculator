import { useState } from 'react';

export default function FormICC({ onCalculate }) {
  const [material, setMaterial] = useState('Cu');
  const [size, setSize] = useState('300');
  const [ambientC, setAmbientC] = useState(30);
  const [nConductors, setNConductors] = useState(3);
  const [parallels, setParallels] = useState(1);
  const [terminalTempC, setTerminalTempC] = useState(75);
  const [I_base, setI_base] = useState(300);
  const [Fcc, setFcc] = useState(1.25);
  const [Icu_kA, setIcu_kA] = useState(35);
  const [Isc_kA, setIsc_kA] = useState(5.38);

  const handleSubmit = (e) => {
    e.preventDefault();

    onCalculate({
      material,
      size,
      ambientC,
      nConductors,
      parallels,
      terminalTempC,
      I_base,
      Fcc,
      Icu_kA,
      Isc_kA
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
      <h2 className="text-xl font-bold">Datos del Alimentador</h2>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Material</label>
          <select
            value={material}
            onChange={(e) => setMaterial(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="Cu">Cobre (Cu)</option>
            <option value="Al">Aluminio (Al)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Calibre (AWG/kcmil)</label>
          <input
            type="text"
            value={size}
            onChange={(e) => setSize(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="300, 350, 1/0, etc."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Temp. Ambiente (°C)</label>
          <input
            type="number"
            value={ambientC}
            onChange={(e) => setAmbientC(Number(e.target.value))}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">N° Conductores</label>
          <input
            type="number"
            value={nConductors}
            onChange={(e) => setNConductors(Number(e.target.value))}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Paralelos</label>
          <input
            type="number"
            value={parallels}
            onChange={(e) => setParallels(Number(e.target.value))}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Temp. Terminal (°C)</label>
          <select
            value={terminalTempC}
            onChange={(e) => setTerminalTempC(Number(e.target.value))}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value={60}>60°C</option>
            <option value={75}>75°C</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Corriente Base (A)</label>
          <input
            type="number"
            value={I_base}
            onChange={(e) => setI_base(Number(e.target.value))}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Factor Carga (Fcc)</label>
          <input
            type="number"
            step="0.01"
            value={Fcc}
            onChange={(e) => setFcc(Number(e.target.value))}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Cap. Interruptiva (kA)</label>
          <input
            type="number"
            step="0.1"
            value={Icu_kA}
            onChange={(e) => setIcu_kA(Number(e.target.value))}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Corriente Falla (kA)</label>
          <input
            type="number"
            step="0.1"
            value={Isc_kA}
            onChange={(e) => setIsc_kA(Number(e.target.value))}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
      </div>

      <button
        type="submit"
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Validar Alimentador ⚡
      </button>
    </form>
  );
}
