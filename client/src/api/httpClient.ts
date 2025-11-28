const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  headers?: Record<string, string>;
}

class HttpError extends Error {
  status: number;
  
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'HttpError';
  }
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;
  
  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };
  
  if (body) {
    config.body = JSON.stringify(body);
  }
  
  const url = `${BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      let errorMessage = `HTTP Error: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        // If response isn't JSON, try to get text
        try {
          const text = await response.text();
          errorMessage = text || errorMessage;
        } catch {
          // If we can't read the response, use status-based message
          errorMessage = `HTTP ${response.status}: ${response.statusText || 'Unknown error'}`;
        }
      }
      throw new HttpError(errorMessage, response.status);
    }
    
    return response.json();
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    console.error('API request failed:', error);
    const message = error instanceof Error ? error.message : 'Network error or server unavailable';
    throw new HttpError(message, 0);
  }
}

export const httpClient = {
  get<T>(endpoint: string): Promise<T> {
    return request<T>(endpoint);
  },
  
  post<T>(endpoint: string, body: unknown): Promise<T> {
    return request<T>(endpoint, { method: 'POST', body });
  },
  
  put<T>(endpoint: string, body: unknown): Promise<T> {
    return request<T>(endpoint, { method: 'PUT', body });
  },
  
  delete<T>(endpoint: string): Promise<T> {
    return request<T>(endpoint, { method: 'DELETE' });
  },
};

export { HttpError };

