import { usePost } from './useApi';

interface ICCParams {
  voltaje: number;
  resistencia: number;
  reactancia: number;
  tipo: 'trifasico' | 'monofasico' | 'bifasico';
}

interface ICCResult {
  icc: number;
  impedancia: number;
  tipo: string;
  mva: number;
}

interface ICCConMotoresParams extends ICCParams {
  motores?: Array<{
    potencia_kw: number;
    voltaje: number;
    nombre: string;
  }>;
  tiempo?: number;
  generarCurva?: boolean;
}

/**
 * Custom hook for ICC simple calculation
 */
export function useICCSimple() {
  return usePost<ICCResult>('/calculo/icc/simple');
}

/**
 * Custom hook for ICC calculation with motor contribution
 */
export function useICCConMotores() {
  return usePost<any>('/calculo/icc-motores');
}

/**
 * Custom hook for earth return resistance calculation
 */
export function useRetornoTierra() {
  return usePost<{ retornoTierra: number }>('/calculo/retorno-tierra');
}
