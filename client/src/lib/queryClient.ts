import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: "GET" | "POST" | "PUT" | "DELETE",
  url: string,
  data?: any
) {
  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    credentials: "include",
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);

    // Enhanced debugging for all request methods
    if (!response.ok) {
      console.log(`API request failed: ${method} ${url} ${response.status}`);
      try {
        const errorText = await response.clone().text();
        const contentType = response.headers.get('content-type');

        // Check if the response is HTML (error page) instead of JSON
        if (contentType && contentType.includes('text/html')) {
          console.log("Server returned HTML instead of JSON:", errorText.substring(0, 100) + "...");
        } else {
          console.log("Error details:", errorText);
        }
      } catch (readError) {
        console.log("Could not read error details:", readError);
      }
    }

    return response;
  } catch (error) {
    console.error(`API request error for ${method} ${url}:`, error);
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
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: false,
    },
  },
});

// Utility function to force a complete refresh of a query
export const forceQueryRefresh = async (queryKey: string[]) => {
  // Clear the cache
  queryClient.removeQueries({ queryKey });

  // Force a refetch
  await queryClient.invalidateQueries({ 
    queryKey,
    refetchType: 'all' 
  });

  // Ensure any components using this data re-render
  return queryClient.refetchQueries({ queryKey });
};