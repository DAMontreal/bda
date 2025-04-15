import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { User } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import ProfileForm from "@/components/dashboard/profile-form";
import MediaUpload from "@/components/dashboard/media-upload";
import SocialLinks from "@/components/dashboard/social-links";
import CreateAd from "@/components/dashboard/create-ad";
import CreateEvent from "@/components/dashboard/create-event";

const Dashboard = () => {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  // Parse URL parameters to get active tab
  const params = new URLSearchParams(window.location.search);
  const tabParam = params.get("tab");
  const editEventId = params.get("edit");
  
  // Set active tab based on URL parameter or default to "profile"
  const [activeTab, setActiveTab] = useState<string>(
    tabParam || "profile"
  );

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Set page title
  useEffect(() => {
    document.title = "Tableau de bord | Bottin des artistes DAM";
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

  if (authLoading || !user) {
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

  if (!user.isApproved) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-lg">
        <Card>
          <CardContent className="pt-6">
            <h1 className="text-2xl font-bold mb-4">Compte en attente d'approbation</h1>
            <p className="text-gray-600 mb-6">
              Votre compte est actuellement en attente de validation par notre équipe. Vous pourrez accéder 
              à votre tableau de bord une fois qu'un administrateur aura approuvé votre profil.
            </p>
            <p className="text-gray-600 mb-6">
              Vous recevrez une notification par email lorsque votre compte sera approuvé.
            </p>
            <div className="flex justify-end">
              <Button asChild>
                <a href="/">Retour à l'accueil</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Tableau de bord</h1>
      
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="mb-8">
          <TabsTrigger value="profile">Mon profil</TabsTrigger>
          <TabsTrigger value="media">Médias</TabsTrigger>
          <TabsTrigger value="social">Réseaux sociaux</TabsTrigger>
          <TabsTrigger value="troc">Mes annonces</TabsTrigger>
          <TabsTrigger value="events">Mes événements</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile">
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-2xl font-bold mb-6">Informations du profil</h2>
              <ProfileForm user={user} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="media">
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-2xl font-bold mb-6">Gérer mes médias</h2>
              <p className="text-gray-600 mb-6">
                Ajoutez des images, vidéos et fichiers audio pour présenter votre travail artistique.
              </p>
              <MediaUpload userId={user.id} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="social">
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-2xl font-bold mb-6">Réseaux sociaux et liens</h2>
              <p className="text-gray-600 mb-6">
                Ajoutez vos réseaux sociaux et liens pour permettre aux visiteurs de vous suivre et découvrir votre travail.
              </p>
              <SocialLinks user={user} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="troc">
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-2xl font-bold mb-6">Mes annonces TROC'DAM</h2>
              <p className="text-gray-600 mb-6">
                Gérez vos annonces d'échange, collaboration et services sur la plateforme TROC'DAM.
              </p>
              <CreateAd />
              
              <Separator className="my-8" />
              
              <div className="my-6">
                <h3 className="text-xl font-semibold mb-4">Mes annonces actives</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* UserTrocAds component would go here */}
                  <div className="text-center py-8 text-gray-500">
                    Vous n'avez pas encore créé d'annonces.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="events">
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-2xl font-bold mb-6">
                {editEventId ? "Modifier un événement" : "Créer un événement"}
              </h2>
              <p className="text-gray-600 mb-6">
                {editEventId 
                  ? "Modifiez les détails de votre événement."
                  : "Créez un nouvel événement pour promouvoir vos activités artistiques."}
              </p>
              <CreateEvent eventId={editEventId ? parseInt(editEventId) : undefined} />
              
              <Separator className="my-8" />
              
              <div className="my-6">
                <h3 className="text-xl font-semibold mb-4">Mes événements</h3>
                <div className="grid grid-cols-1 gap-4">
                  {/* UserEvents component would go here */}
                  <div className="text-center py-8 text-gray-500">
                    Vous n'avez pas encore créé d'événements.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;
