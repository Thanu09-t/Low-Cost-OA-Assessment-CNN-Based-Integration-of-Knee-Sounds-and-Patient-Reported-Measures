const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

interface RequestOptions extends RequestInit {
  token?: string;
  useMultipart?: boolean;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { token, useMultipart, ...customOptions } = options;
  const headers: Record<string, string> = {};

  // Setup Authorization Header
  const activeToken = token || localStorage.getItem('oa_insight_token');
  if (activeToken) {
    headers['Authorization'] = `Bearer ${activeToken}`;
  }

  // Setup Content-Type Header
  if (!useMultipart) {
    headers['Content-Type'] = 'application/json';
  }

  const config: RequestInit = {
    ...customOptions,
    headers: {
      ...headers,
      ...(customOptions.headers as Record<string, string>),
    },
  };

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  try {
    const response = await fetch(url, config);
    
    if (response.status === 204) {
      return {} as T;
    }
    
    // Serve report PDF downloads directly
    if (endpoint.includes('download-report')) {
      if (!response.ok) {
        throw new Error('Failed to download report PDF');
      }
      return response as any;
    }

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.detail || 'An error occurred during request processing');
    }
    
    return data;
  } catch (error: any) {
    console.error(`API Error on ${url}:`, error);
    throw error;
  }
}
