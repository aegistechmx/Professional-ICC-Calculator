import React from 'react'

export default function Sidebar() {
  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }

  const components = [
    {
      type: 'transformer',
      icon: '',
      label: 'Transformador',
      color: 'bg-blue-500',
    },
    {
      type: 'generator',
      icon: '',
      label: 'Generador',
      color: 'bg-orange-500',
    },
    { type: 'breaker', icon: '', label: 'Breaker', color: 'bg-red-500' },
    { type: 'panel', icon: '', label: 'Tablero', color: 'bg-green-500' },
    { type: 'motor', icon: '', label: 'Motor', color: 'bg-purple-500' },
    { type: 'load', icon: '', label: 'Carga', color: 'bg-yellow-500' },
    {
      type: 'capacitor',
      icon: '||',
      label: 'Banco de Capacitores',
      color: 'bg-teal-500'
    },
    {
      type: 'generator_ats',
      icon: 'ATS',
      label: 'Transferencia Automática',
      color: 'bg-indigo-500'
    },
  ]

  return (
    <aside className="w-64 bg-gray-800 text-white p-4 flex flex-col gap-4">
      <h2 className="text-lg font-bold border-b border-gray-600 pb-2">
        Componentes
      </h2>

      <div className="flex flex-col gap-3">
        {components.map(comp => (
          <div
            key={comp.type}
            draggable
            onDragStart={e => onDragStart(e, comp.type)}
            className={`${comp.color} p-3 rounded-lg cursor-move hover:opacity-80 transition flex items-center gap-2`}
          >
            <span className="text-2xl">{comp.icon}</span>
            <span className="font-medium">{comp.label}</span>
          </div>
        ))}
      </div>

      <div className="mt-auto border-t border-gray-600 pt-4">
        <p className="text-xs text-gray-400">
          Arrastra componentes al canvas para construir tu sistema eléctrico
        </p>
      </div>
    </aside>
  )
}
