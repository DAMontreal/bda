import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { User } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import ArtistCard from "@/components/artists/artist-card";
import { disciplines } from "@/lib/utils";

const Artists = () => {
  const [location] = useLocation();
  const [searchParams, setSearchParams] = useState<URLSearchParams>(
    new URLSearchParams(window.location.search)
  );
  
  const [keyword, setKeyword] = useState(searchParams.get("q") || "");
  const [discipline, setDiscipline] = useState(searchParams.get("discipline") || "all");

  const { data: artists, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users?approved=true"],
  });

  // Filter artists based on search criteria
  const filteredArtists = artists?.filter((artist) => {
    // Filter by keyword (name or bio)
    const keywordMatch = !keyword 
      ? true 
      : (
          `${artist.firstName} ${artist.lastName}`.toLowerCase().includes(keyword.toLowerCase()) ||
          (artist.bio && artist.bio.toLowerCase().includes(keyword.toLowerCase()))
        );
    
    // Filter by discipline
    const disciplineMatch = !discipline || discipline === "all" ? true : artist.discipline === discipline;
    
    return keywordMatch && disciplineMatch;
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Update URL parameters
    const params = new URLSearchParams();
    if (keyword) params.append("q", keyword);
    if (discipline && discipline !== "all") params.append("discipline", discipline);
    
    // Update browser URL without navigation
    window.history.pushState(
      {},
      "",
      `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`
    );
    
    setSearchParams(params);
  };

  // Update state when URL changes directly
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setKeyword(params.get("q") || "");
    setDiscipline(params.get("discipline") || "all");
  }, [location]);

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Artistes</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Rechercher par nom ou bio..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
          
          <Select value={discipline} onValueChange={setDiscipline}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Discipline" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les disciplines</SelectItem>
              {disciplines.map((d) => (
                <SelectItem key={d.value} value={d.value}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button type="submit" className="bg-dam-orange">
            <Search className="mr-2 h-4 w-4" /> Rechercher
          </Button>
        </form>
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg overflow-hidden shadow-md p-6">
              <div className="h-48 bg-gray-200 animate-pulse mb-4 rounded"></div>
              <div className="h-6 bg-gray-200 animate-pulse mb-2 w-3/4 rounded"></div>
              <div className="h-4 bg-gray-200 animate-pulse mb-4 w-1/2 rounded"></div>
              <div className="h-8 bg-gray-200 animate-pulse rounded"></div>
            </div>
          ))}
        </div>
      ) : filteredArtists && filteredArtists.length > 0 ? (
        <>
          <p className="mb-6">
            {filteredArtists.length} artiste{filteredArtists.length > 1 ? "s" : ""} trouvé
            {filteredArtists.length > 1 ? "s" : ""}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredArtists.map((artist) => (
              <ArtistCard key={artist.id} artist={artist} />
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Aucun artiste ne correspond à votre recherche</p>
          <Button 
            variant="outline" 
            onClick={() => {
              setKeyword("");
              setDiscipline("all");
              window.history.pushState({}, "", window.location.pathname);
              setSearchParams(new URLSearchParams());
            }}
          >
            Réinitialiser les filtres
          </Button>
        </div>
      )}
    </div>
  );
};

export default Artists;
