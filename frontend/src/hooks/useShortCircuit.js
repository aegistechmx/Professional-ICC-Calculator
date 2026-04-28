import { useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const useShortCircuit = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const calculateShortCircuit = async (params) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/cortocircuito/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
        return result.data;
      } else {
        throw new Error(result.error || 'Calculation failed');
      }
    } catch (err) {
      setError(err.message);
      console.warn('Short circuit calculation error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    calculateShortCircuit,
    loading,
    error,
    data
  };
};
