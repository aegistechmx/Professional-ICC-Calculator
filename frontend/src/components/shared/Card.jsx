import React from 'react';

/**
 * Reusable Card component for content containers
 * @param {Object} props - Component props
 * @param {string} [props.title] - Card title
 * @param {React.ReactNode} props.children - Card content
 * @param {string} [props.className] - Additional CSS classes
 * @param {boolean} [props.noPadding=false] - Remove default padding
 */
export default function Card({ title, children, className = '', noPadding = false }) {
  return (
    <div className={`bg-white rounded-lg shadow-md border border-gray-200 ${className}`}>
      {title && (
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
      )}
      <div className={noPadding ? '' : 'p-6'}>
        {children}
      </div>
    </div>
  );
}
