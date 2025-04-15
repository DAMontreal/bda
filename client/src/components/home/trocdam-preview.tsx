import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TrocAd, User } from "@shared/schema";
import TrocAdCard from "@/components/trocdam/ad-card";
import { useAuth } from "@/hooks/use-auth";

const TrocDamPreview = () => {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  const { data: ads, isLoading } = useQuery<TrocAd[]>({
    queryKey: ["/api/troc?limit=4"],
  });

  const filteredAds = activeCategory
    ? ads?.filter((ad) => ad.category === activeCategory)
    : ads;

  const categories = [
    { label: "Toutes", value: null },
    { label: "Collaborations", value: "collaboration" },
    { label: "Équipement", value: "equipment" },
    { label: "Services", value: "service" },
    { label: "Événements", value: "event" },
  ];

  return (
    <section id="trocdam" className="py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">TROC'DAM</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Un espace de petites annonces où les artistes peuvent échanger, collaborer et offrir
            leurs services
          </p>
        </div>

        <Card className="p-6 mb-10">
          <CardContent className="p-0">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6">
              <h3 className="font-bold text-xl mb-4 md:mb-0">Dernières annonces</h3>

              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <Button
                    key={category.label}
                    variant={activeCategory === category.value ? "default" : "outline"}
                    className={
                      activeCategory === category.value
                        ? "bg-[#FF5500] text-white"
                        : "bg-white text-black border border-gray-300 hover:border-[#FF5500]"
                    }
                    onClick={() => setActiveCategory(category.value)}
                  >
                    {category.label}
                  </Button>
                ))}
              </div>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="border border-gray-300 p-4 rounded-lg">
                    <div className="h-6 bg-gray-200 animate-pulse mb-2 w-3/4 rounded"></div>
                    <div className="h-4 bg-gray-200 animate-pulse mb-4 w-1/2 rounded"></div>
                    <div className="h-16 bg-gray-200 animate-pulse mb-4 rounded"></div>
                    <div className="flex justify-between">
                      <div className="flex items-center">
                        <div className="h-8 w-8 bg-gray-200 animate-pulse rounded-full mr-2"></div>
                        <div className="h-4 w-20 bg-gray-200 animate-pulse rounded"></div>
                      </div>
                      <div className="h-4 w-16 bg-gray-200 animate-pulse rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredAds && filteredAds.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredAds.map((ad) => (
                  <TrocAdCard key={ad.id} ad={ad} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">Aucune annonce disponible</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center">
          <Link href="/trocdam">
            <Button className="bg-[#FF5500] hover:bg-opacity-90 text-white font-bold py-3 px-8 rounded-full">
              Accéder à TROC'DAM
            </Button>
          </Link>
          {!isAuthenticated && (
            <p className="mt-4 text-sm text-gray-500">
              Vous devez être membre pour poster des annonces
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

export default TrocDamPreview;
