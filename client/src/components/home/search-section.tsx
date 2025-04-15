import { useState } from "react";
import { useLocation } from "wouter";
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
import { disciplines } from "@/lib/utils";

const SearchSection = () => {
  const [keyword, setKeyword] = useState("");
  const [discipline, setDiscipline] = useState("");
  const [, setLocation] = useLocation();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    const params = new URLSearchParams();
    if (keyword) params.append("q", keyword);
    if (discipline) params.append("discipline", discipline);
    
    setLocation(`/artists?${params.toString()}`);
  };

  const popularFilters = [
    { label: "Musique", value: "music" },
    { label: "Arts visuels", value: "visual-arts" },
    { label: "Théâtre", value: "theater" },
    { label: "Danse", value: "dance" },
  ];

  const handleFilterClick = (value: string) => {
    setLocation(`/artists?discipline=${value}`);
  };

  return (
    <section className="bg-gray-100 py-12">
      <div className="container mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-6 text-center">Rechercher des artistes</h2>

          <form className="max-w-4xl mx-auto" onSubmit={handleSearch}>
            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="Mot-clé, nom, discipline..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="w-full md:w-1/3">
                <Select value={discipline} onValueChange={setDiscipline}>
                  <SelectTrigger className="w-full px-4 py-6 border border-gray-300 rounded-lg">
                    <SelectValue placeholder="Discipline artistique" />
                  </SelectTrigger>
                  <SelectContent>
                    {disciplines.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                className="bg-[#FF5500] hover:bg-opacity-90 text-white py-3 px-6"
              >
                <Search className="mr-2 h-4 w-4" /> Rechercher
              </Button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-sm text-gray-500">Filtres populaires:</span>
              {popularFilters.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => handleFilterClick(filter.value)}
                  className="text-sm text-black hover:text-[#FF5500] bg-gray-200 px-3 py-1 rounded-full transition-colors"
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </form>
        </div>
      </div>
    </section>
  );
};

export default SearchSection;
