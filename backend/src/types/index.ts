// ICC Calculation Types
export interface ICCParams {
  voltaje: number;
  resistencia: number;
  reactancia: number;
  tipo: 'trifasico' | 'monofasico' | 'bifasico';
  modo?: 'conocido' | 'mva';
  tension?: number;
}

export interface ICCResult {
  icc: number;
  impedancia: number;
  tipo: string;
  mva: number;
  puntos?: ICCPunto[];
  max_kA?: number;
  tension?: number;
  modo?: string;
}

export interface ICCPunto {
  nombre: string;
  isc: number;
  ipeak?: number;
  xr?: number;
  R?: number;
  X?: number;
  Z?: number;
  equip?: Equipment;
}

// Equipment Types
export interface Equipment {
  tipo: string;
  modelo: string;
  cap: number; // kA
  In?: number; // A
  Icu?: number; // kA
  idisparo?: number; // A
}

// Motor Types
export interface Motor {
  potencia_kw: number;
  voltaje: number;
  nombre: string;
  hp?: number;
  tipo?: 'induccion' | 'sincrono';
  xdpp?: number;
  eficiencia?: number;
  punto?: number;
}

export interface MotorContribution {
  motor: Motor;
  aporte: number;
  tiempo: number;
}

// Feeder Types
export interface Feeder {
  calibre: string;
  material: 'cobre' | 'aluminio';
  canalizacion: 'acero' | 'PVC' | 'aluminio';
  longitud: number;
  paralelo: number;
  cargaA: number;
  cargaFP: number;
  equipTipo: string;
  equipModelo: string;
  equipCap: string;
  equipIDisparo: number;
}

// Protection Types
export interface ProtectionDevice {
  id: string;
  nombre: string;
  tipo: string;
  In: number;
  Icu: number;
  pickup?: number;
  curva?: CurvaTCC;
}

export interface CurvaTCC {
  puntos: Array<{ corriente: number; tiempo: number }>;
}

export interface CoordinationResult {
  coordinado: boolean;
  margen?: number;
  error?: string;
  mensaje?: string;
}

// Report Types
export interface ReporteParams {
  parametros_icc: ICCParams;
  proyecto: { nombre: string };
  empresa: { nombre: string };
  motores: { lista: Motor[]; totalAporte?: number };
  dispositivos: ProtectionDevice[];
  margen?: number;
}

export interface ReporteData {
  icc: ICCResult;
  coordinacion: CoordinationResult;
  motores: { lista: Motor[]; totalAporte?: number };
  protecciones?: { seleccion: any };
  simulacion?: any;
  graficas?: {
    tcc?: Buffer;
    icc_tiempo?: Buffer;
  };
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
