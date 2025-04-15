import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import ArtistCard from "@/components/artists/artist-card";
import { Button } from "@/components/ui/button";
import { User } from "@shared/schema";
import { ArrowRight } from "lucide-react";

const FeaturedArtists = () => {
  const { data: artists, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users?approved=true"],
  });

  // Get only first 4 artists
  const featuredArtists = artists?.slice(0, 4) || [];

  return (
    <section id="artists" className="py-16">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h2 className="text-3xl font-bold mb-2">Artistes en vedette</h2>
            <p className="text-gray-600">
              Découvrez des artistes exceptionnels de tous horizons
            </p>
          </div>
          <Link href="/artists" className="text-dam-orange hover:underline font-medium flex items-center">
            Voir tous <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg overflow-hidden shadow-md p-6">
                <div className="h-48 bg-gray-200 animate-pulse mb-4 rounded"></div>
                <div className="h-6 bg-gray-200 animate-pulse mb-2 w-3/4 rounded"></div>
                <div className="h-4 bg-gray-200 animate-pulse mb-4 w-1/2 rounded"></div>
                <div className="h-8 bg-gray-200 animate-pulse rounded"></div>
              </div>
            ))}
          </div>
        ) : featuredArtists.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {featuredArtists.map((artist) => (
              <ArtistCard key={artist.id} artist={artist} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">Aucun artiste approuvé pour le moment</p>
          </div>
        )}

        <div className="text-center mt-12">
          <Link href="/artists">
            <Button className="bg-dam-orange hover:bg-[#e88a1e] text-white font-bold py-3 px-8 rounded-full">
              Découvrir plus d'artistes
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedArtists;
