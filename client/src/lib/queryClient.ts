import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  urlOrMethod: string,
  urlOrData?: string | unknown,
  data?: unknown | undefined,
): Promise<any> {
  let method: string;
  let url: string;
  let body: unknown;

  // Handle both legacy single parameter usage and new method-first usage
  if (typeof urlOrData === 'string') {
    // New usage: apiRequest(method, url, data)
    method = urlOrMethod;
    url = urlOrData;
    body = data;
  } else {
    // Legacy usage: apiRequest(url) - default to GET
    method = 'GET';
    url = urlOrMethod;
    body = urlOrData;
  }

  console.log(`[API Request] ${method} ${url}`, body ? { body } : '');

  try {
    const res = await fetch(url, {
      method,
      headers: (body && method !== 'DELETE' && method !== 'GET') ? { "Content-Type": "application/json" } : {},
      body: (body && method !== 'DELETE' && method !== 'GET') ? JSON.stringify(body) : undefined,
      credentials: "include",
    });

    console.log(`[API Response] ${method} ${url} - Status: ${res.status}`);
    
    await throwIfResNotOk(res);
    
    // Handle empty responses (like 204 No Content)
    const contentType = res.headers.get('content-type');
    if (res.status === 204 || !contentType?.includes('application/json')) {
      console.log(`[API Success] ${method} ${url} - No content`);
      return null;
    }
    
    const result = await res.json();
    console.log(`[API Success] ${method} ${url}`, result);
    return result;
  } catch (error) {
    console.error(`[API Error] ${method} ${url}`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
