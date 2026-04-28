import { useState } from 'react';

const API_BASE_URL = 'http://localhost:3000';

export const useSimulation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);

  const simulateSystem = async (nodes, edges) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/simulacion/sistema`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nodes, edges }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setResults(result.data);
        return result.data;
      } else {
        throw new Error(result.error || 'Simulation failed');
      }
    } catch (err) {
      setError(err.message);
      console.warn('Simulation error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    simulateSystem,
    loading,
    error,
    results
  };
};
