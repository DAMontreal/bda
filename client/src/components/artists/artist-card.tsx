import { Link } from "wouter";
import { User } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDisciplineLabel } from "@/lib/utils";
import { FaInstagram, FaYoutube, FaSpotify, FaBehance, FaGlobe } from "react-icons/fa";

interface ArtistCardProps {
  artist: User;
}

const ArtistCard = ({ artist }: ArtistCardProps) => {
  // Default image if artist doesn't have one
  const imageUrl = artist.profileImage || 
    `https://images.unsplash.com/photo-${['1549213783-8284d0336c4f', '1492684223066-81342ee5ff30', '1595839095859-10b8e2a1b2d9', '1605722243979-fe0be8158232'][Math.floor(Math.random() * 4)]}?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80`;

  return (
    <Card className="overflow-hidden shadow-md hover:shadow-lg transition-all hover:translate-y-[-5px]">
      <div 
        className="h-72 bg-cover bg-center" 
        style={{ backgroundImage: `url('${imageUrl}')` }}
      />
      <CardContent className="p-6">
        <div className="mb-3">
          <h3 className="font-bold text-xl mb-2">
            {artist.firstName} {artist.lastName}
          </h3>
          <div className="flex flex-wrap gap-2">
            {/* Discipline principale en premier */}
            {artist.discipline && (
              <Badge className="bg-[#F89720] text-white text-xs px-2 py-1 rounded">
                {getDisciplineLabel(artist.discipline)}
              </Badge>
            )}
            {/* Autres disciplines */}
            {artist.disciplines?.filter(d => d !== artist.discipline).slice(0, 3).map((discipline) => (
              <Badge key={discipline} variant="outline" className="text-xs px-2 py-1 rounded border-[#F89720] text-[#F89720]">
                {getDisciplineLabel(discipline)}
              </Badge>
            ))}
            {/* Indicateur s'il y a plus de disciplines */}
            {artist.disciplines && artist.disciplines.filter(d => d !== artist.discipline).length > 3 && (
              <Badge variant="secondary" className="text-xs px-2 py-1 rounded">
                +{artist.disciplines.filter(d => d !== artist.discipline).length - 3}
              </Badge>
            )}
          </div>
        </div>
        <p className="text-gray-600 text-sm mb-4">
          {artist.bio ? 
            artist.bio.length > 60 ? 
              `${artist.bio.substring(0, 60)}...` : 
              artist.bio : 
            "Artiste membre de Diversité Artistique Montréal"}
        </p>
        <div className="flex space-x-2 mb-4">
          {artist.socialMedia && Object.entries(artist.socialMedia).map(([platform, url]) => {
            if (!url) return null;
            let Icon;
            switch (platform) {
              case 'instagram': Icon = FaInstagram; break;
              case 'youtube': Icon = FaYoutube; break;
              case 'spotify': Icon = FaSpotify; break;
              case 'behance': Icon = FaBehance; break;
              default: Icon = FaGlobe;
            }
            return (
              <a 
                key={platform} 
                href={url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-[#F89720]"
              >
                <Icon />
              </a>
            );
          })}
        </div>
        <Link href={`/artists/${artist.id}`}>
          <Button variant="outline" className="w-full border-[#F89720] text-[#F89720] hover:bg-[#F89720] hover:text-white">
            Voir le profil
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
};

export default ArtistCard;
