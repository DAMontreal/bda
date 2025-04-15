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
        className="h-48 bg-cover bg-center" 
        style={{ backgroundImage: `url('${imageUrl}')` }}
      />
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-3">
          <h3 className="font-bold text-xl">
            {artist.firstName} {artist.lastName}
          </h3>
          {artist.discipline && (
            <Badge className="bg-[#FF5500] text-white text-xs px-2 py-1 rounded">
              {getDisciplineLabel(artist.discipline)}
            </Badge>
          )}
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
                className="text-gray-500 hover:text-[#FF5500]"
              >
                <Icon />
              </a>
            );
          })}
        </div>
        <Link href={`/artists/${artist.id}`}>
          <Button variant="outline" className="w-full border-[#FF5500] text-[#FF5500] hover:bg-[#FF5500] hover:text-white">
            Voir le profil
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
};

export default ArtistCard;
