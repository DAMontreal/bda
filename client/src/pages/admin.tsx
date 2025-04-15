import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import PendingUsers from "@/components/admin/pending-users";
import UserManagement from "@/components/admin/user-management";
import AnalyticsDashboard from "@/components/admin/analytics-dashboard";

const Admin = () => {
  const [location, navigate] = useLocation();
  const { user, isAdmin, isAuthenticated, isLoading } = useAuth();
  
  // Parse URL parameters to get active tab
  const params = new URLSearchParams(window.location.search);
  const tabParam = params.get("tab");
  
  // Set active tab based on URL parameter or default to "pending"
  const [activeTab, setActiveTab] = useState<string>(
    tabParam || "pending"
  );

  // Redirect if not admin
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !isAdmin)) {
      navigate("/");
    }
  }, [isLoading, isAuthenticated, isAdmin, navigate]);

  // Set page title
  useEffect(() => {
    document.title = "Administration | Bottin des artistes DAM";
  }, []);

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    // Update URL without full page reload
    const newParams = new URLSearchParams();
    newParams.set("tab", value);
    window.history.pushState(
      {},
      "",
      `${window.location.pathname}?${newParams.toString()}`
    );
  };

  if (isLoading || !isAuthenticated || !isAdmin) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="h-10 bg-gray-200 rounded mb-6"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Administration</h1>
      
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="mb-8">
          <TabsTrigger value="pending">Artistes en attente</TabsTrigger>
          <TabsTrigger value="users">Gérer les utilisateurs</TabsTrigger>
          <TabsTrigger value="content">Modération du contenu</TabsTrigger>
          <TabsTrigger value="stats">Statistiques</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending">
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-2xl font-bold mb-6">Artistes en attente d'approbation</h2>
              <p className="text-gray-600 mb-6">
                Examinez et approuvez les nouveaux comptes d'artistes.
              </p>
              <PendingUsers />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="users">
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-2xl font-bold mb-6">Gestion des utilisateurs</h2>
              <p className="text-gray-600 mb-6">
                Gérez tous les utilisateurs de la plateforme.
              </p>
              <UserManagement />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="content">
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-2xl font-bold mb-6">Modération du contenu</h2>
              <p className="text-gray-600 mb-6">
                Modérez les annonces, événements et médias des utilisateurs.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-bold text-lg mb-2">Annonces TROC'DAM</h3>
                  <p className="text-gray-500 text-sm mb-4">Gérez les annonces publiées par les artistes</p>
                  <div className="text-center p-8 border border-dashed border-gray-300 rounded">
                    <p className="text-gray-400">Aucune annonce à modérer</p>
                  </div>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-bold text-lg mb-2">Événements</h3>
                  <p className="text-gray-500 text-sm mb-4">Gérez les événements publiés par les artistes</p>
                  <div className="text-center p-8 border border-dashed border-gray-300 rounded">
                    <p className="text-gray-400">Aucun événement à modérer</p>
                  </div>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-bold text-lg mb-2">Médias</h3>
                  <p className="text-gray-500 text-sm mb-4">Gérez les médias uploadés par les artistes</p>
                  <div className="text-center p-8 border border-dashed border-gray-300 rounded">
                    <p className="text-gray-400">Aucun média à modérer</p>
                  </div>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-bold text-lg mb-2">Messages signalés</h3>
                  <p className="text-gray-500 text-sm mb-4">Examinez les messages signalés par les utilisateurs</p>
                  <div className="text-center p-8 border border-dashed border-gray-300 rounded">
                    <p className="text-gray-400">Aucun message signalé</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="stats">
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-2xl font-bold mb-6">Statistiques du site</h2>
              <p className="text-gray-600 mb-6">
                Visualisez les statistiques d'utilisation de la plateforme.
              </p>
              <AnalyticsDashboard />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
