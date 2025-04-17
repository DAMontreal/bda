import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { User } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (userData: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/me"],
    retry: false,
    staleTime: 0,
    refetchOnMount: true,
    queryFn: async ({ queryKey }) => {
      try {
        const res = await fetch(queryKey[0] as string, {
          credentials: "include",
        });
        
        // Si non authentifié, retourner null au lieu de lever une exception
        if (res.status === 401) {
          return null;
        }
        
        if (!res.ok) {
          throw new Error(`Erreur de requête: ${res.status}`);
        }
        
        return await res.json();
      } catch (error) {
        console.error("Erreur lors de la récupération des données d'authentification:", error);
        return null;
      }
    }
  });

  useEffect(() => {
    if (user) {
      setIsAuthenticated(true);
    } else if (!isLoading) {
      setIsAuthenticated(false);
    }
  }, [user, isLoading]);

  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const response = await apiRequest("POST", "/api/auth/login", credentials);
      const userData = await response.json();
      // Définir manuellement les données de l'utilisateur pour éviter les problèmes de cache
      queryClient.setQueryData(["/api/auth/me"], userData);
      return userData;
    },
    onSuccess: (userData) => {
      setIsAuthenticated(true);
      toast({
        title: "Connexion réussie",
        description: "Bienvenue dans votre espace personnel",
      });
      navigate("/dashboard");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erreur de connexion",
        description: error.message || "Vérifiez vos identifiants et réessayez",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/auth/logout", {});
    },
    onSuccess: () => {
      queryClient.resetQueries({ queryKey: ["/api/auth/me"] });
      queryClient.setQueryData(["/api/auth/me"], null);
      setIsAuthenticated(false);
      toast({
        title: "Déconnexion réussie",
        description: "À bientôt !",
      });
      // Force reload pour éviter les problèmes de cache
      setTimeout(() => {
        window.location.href = "/";
      }, 100);
    },
    onError: (error) => {
      console.error("Erreur de déconnexion:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de vous déconnecter. Veuillez réessayer.",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: any) => {
      return apiRequest("POST", "/api/auth/register", userData);
    },
    onSuccess: () => {
      toast({
        title: "Inscription réussie",
        description: "Votre compte est en attente d'approbation par un administrateur",
      });
      navigate("/login");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erreur d'inscription",
        description: error.message || "Veuillez vérifier vos informations et réessayer",
      });
    },
  });

  const login = async (username: string, password: string) => {
    await loginMutation.mutateAsync({ username, password });
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  const register = async (userData: any) => {
    await registerMutation.mutateAsync(userData);
  };

  const isAdmin = user?.isAdmin || false;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAdmin,
        isAuthenticated,
        login,
        logout,
        register,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
