import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { TrocAd } from "@shared/schema";
import TrocAdCard from "@/components/trocdam/ad-card";
import CreateAd from "@/components/dashboard/create-ad";
import { useAuth } from "@/hooks/use-auth";
import { trocCategories } from "@/lib/utils";

const TrocDam = () => {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [createAdOpen, setCreateAdOpen] = useState(false);
  const { isAuthenticated, user } = useAuth();

  // Fetch all TROC'DAM ads
  const { data: ads, isLoading } = useQuery<TrocAd[]>({
    queryKey: [`/api/troc${activeCategory ? `?category=${activeCategory}` : ""}`],
  });

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">TROC'DAM</h1>
          <p className="text-gray-600">
            Échangez, collaborez et offrez vos services à d'autres artistes
          </p>
        </div>

        {isAuthenticated && user?.isApproved ? (
          <Dialog open={createAdOpen} onOpenChange={setCreateAdOpen}>
            <DialogTrigger asChild>
              <Button className="mt-4 md:mt-0 bg-[#FF5500]">
                <Plus className="mr-2 h-4 w-4" /> Créer une annonce
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Nouvelle annonce</DialogTitle>
                <DialogDescription>
                  Créez une annonce pour partager vos besoins ou offrir vos services
                </DialogDescription>
              </DialogHeader>
              <CreateAd onSuccess={() => setCreateAdOpen(false)} />
            </DialogContent>
          </Dialog>
        ) : (
          <Button className="mt-4 md:mt-0 bg-[#FF5500]" asChild>
            <a href="/register">
              <Plus className="mr-2 h-4 w-4" /> Publier une annonce
            </a>
          </Button>
        )}
      </div>

      <Card className="p-6 mb-8">
        <CardContent className="p-0">
          <h2 className="text-lg font-medium mb-4">Filtrer par catégorie</h2>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={activeCategory === null ? "default" : "outline"}
              className={
                activeCategory === null 
                  ? "bg-[#FF5500] text-white" 
                  : "bg-white text-black"
              }
              onClick={() => setActiveCategory(null)}
            >
              Toutes
            </Button>
            
            {trocCategories.map((category) => (
              <Button
                key={category.value}
                variant={activeCategory === category.value ? "default" : "outline"}
                className={
                  activeCategory === category.value 
                    ? "bg-[#FF5500] text-white" 
                    : "bg-white text-black"
                }
                onClick={() => setActiveCategory(category.value)}
              >
                {category.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {!isAuthenticated && (
        <Card className="mb-8">
          <CardContent className="p-6 text-center">
            <h3 className="text-xl font-medium mb-2">Rejoignez notre communauté d'artistes</h3>
            <p className="text-gray-500 mb-4">
              Connectez-vous ou créez un compte pour pouvoir poster des annonces sur TROC'DAM
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button asChild variant="outline">
                <a href="/login">Se connecter</a>
              </Button>
              <Button asChild className="bg-[#FF5500]">
                <a href="/register">Créer un compte</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="border border-gray-300 p-4 rounded-lg animate-pulse">
              <div className="h-6 bg-gray-200 mb-2 w-3/4 rounded"></div>
              <div className="h-4 bg-gray-200 mb-4 w-1/2 rounded"></div>
              <div className="h-16 bg-gray-200 mb-4 rounded"></div>
              <div className="flex justify-between">
                <div className="flex items-center">
                  <div className="h-8 w-8 bg-gray-200 rounded-full mr-2"></div>
                  <div className="h-4 w-20 bg-gray-200 rounded"></div>
                </div>
                <div className="h-4 w-16 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : ads && ads.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {ads.map(ad => (
            <TrocAdCard key={ad.id} ad={ad} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-6 text-center">
            <h3 className="text-xl font-medium mb-2">Aucune annonce trouvée</h3>
            <p className="text-gray-500 mb-4">
              {activeCategory ? (
                `Aucune annonce dans la catégorie "${trocCategories.find(c => c.value === activeCategory)?.label}" pour le moment.`
              ) : (
                "Il n'y a pas d'annonces disponibles pour le moment."
              )}
            </p>
            {activeCategory && (
              <Button onClick={() => setActiveCategory(null)}>
                Voir toutes les annonces
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TrocDam;
