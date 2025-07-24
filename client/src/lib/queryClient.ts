import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    console.log(`❌ API Error - Status: ${res.status} ${res.statusText}`);
    
    let errorMessage = res.statusText || 'Erreur inconnue';
    
    try {
      // Cloner la réponse pour éviter les problèmes de lecture multiple
      const clonedRes = res.clone();
      const text = await clonedRes.text();
      
      if (text && text.trim() !== '') {
        // Essayer de parser comme JSON d'abord
        try {
          const errorData = JSON.parse(text);
          errorMessage = errorData.message || errorData.error || text;
        } catch (jsonError) {
          // Si ce n'est pas du JSON, utiliser le texte brut
          errorMessage = text.length > 200 ? text.substring(0, 200) + '...' : text;
        }
      }
    } catch (readError) {
      console.warn('Impossible de lire le contenu de l\'erreur:', readError);
      // Utiliser un message par défaut selon le status
      switch (res.status) {
        case 401:
          errorMessage = 'Non authentifié';
          break;
        case 403:
          errorMessage = 'Accès refusé';
          break;
        case 404:
          errorMessage = 'Ressource introuvable';
          break;
        case 500:
          errorMessage = 'Erreur serveur interne';
          break;
        default:
          errorMessage = `Erreur ${res.status}`;
      }
    }
    
    console.log(`❌ Erreur finale: ${res.status}: ${errorMessage}`);
    throw new Error(`${res.status}: ${errorMessage}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
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
