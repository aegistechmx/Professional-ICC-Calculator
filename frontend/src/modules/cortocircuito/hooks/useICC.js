import { useState } from 'react';
import { calcularICC, optimizarCoordinacion } from '../services/iccService';

export function useICC() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [optimization, setOptimization] = useState(null);

  const runICC = async (data) => {
    setLoading(true);
    setError(null);
    setOptimization(null);

    try {
      const res = await calcularICC(data);
      setResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const runOptimization = async (breakers, faults) => {
    setLoading(true);
    setError(null);

    try {
      const res = await optimizarCoordinacion(breakers, faults);
      setOptimization(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { runICC, runOptimization, loading, result, error, optimization };
}
