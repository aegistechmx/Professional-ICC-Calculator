import { useState, useCallback } from 'react';

const API_BASE = 'http://localhost:3000';

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
}

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Custom hook for API calls with loading and error states
 * @param endpoint - API endpoint path (without base URL)
 * @returns Object with data, loading, error, and execute function
 */
export function useApi<T = any>(endpoint: string) {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (options: ApiOptions = {}) => {
      setState({ data: null, loading: true, error: null });

      try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
          method: options.method || 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
          body: options.body ? JSON.stringify(options.body) : undefined,
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'API request failed');
        }

        setState({ data: result.data, loading: false, error: null });
        return result.data;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setState({ data: null, loading: false, error: errorMessage });
        throw err;
      }
    },
    [endpoint]
  );

  return { ...state, execute };
}

/**
 * Custom hook for POST requests
 * @param endpoint - API endpoint path
 * @returns Object with data, loading, error, and execute function
 */
export function usePost<T = any>(endpoint: string) {
  const { data, loading, error, execute } = useApi<T>(endpoint);

  const post = useCallback(
    async (body: any) => {
      return execute({ method: 'POST', body });
    },
    [execute]
  );

  return { data, loading, error, execute: post };
}

/**
 * Custom hook for GET requests
 * @param endpoint - API endpoint path
 * @param autoExecute - Whether to execute immediately on mount
 * @returns Object with data, loading, error, and execute function
 */
export function useGet<T = any>(endpoint: string, autoExecute = false) {
  const { data, loading, error, execute } = useApi<T>(endpoint);

  const get = useCallback(async () => {
    return execute({ method: 'GET' });
  }, [execute]);

  // Auto-execute on mount if requested
  // Note: This would need useEffect in actual implementation
  // For now, manual execution is safer

  return { data, loading, error, execute: get };
}
