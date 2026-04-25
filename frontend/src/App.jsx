import React from 'react';
import Editor from './components/Editor';
import Sidebar from './components/Sidebar';
import { useStore } from './store/useStore';

function App() {
  const { calculateICC, generatePDF } = useStore();

  return (
    <div className="flex h-screen w-screen">
      {/* Sidebar con componentes arrastrables */}
      <Sidebar />
      
      {/* Canvas del editor */}
      <div className="flex-1 relative">
        <Editor />
        
        {/* Barra de herramientas superior */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center bg-white p-3 rounded-lg shadow-lg z-10">
          <h1 className="text-xl font-bold text-gray-800">
            ⚡ ICC Calculator - Editor Visual
          </h1>
          <div className="flex gap-2">
            <button
              onClick={calculateICC}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              Calcular ICC
            </button>
            <button
              onClick={generatePDF}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
            >
              Generar PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
