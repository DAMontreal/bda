import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { User, ProfileMedia, Event } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FaInstagram,
  FaFacebook,
  FaTwitter,
  FaYoutube,
  FaSpotify,
  FaBehance,
  FaGlobe,
  FaLinkedin,
} from "react-icons/fa";
import { BadgeCheck, Mail, Download, MapPin, Calendar } from "lucide-react";
import { getDisciplineLabel, formatDate } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import FormattedText from "@/components/ui/formatted-text";

const ArtistProfile = () => {
  const { id } = useParams();
  const numericId = parseInt(id as string);
  const { user: currentUser, isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Fetch artist data
  const { data: artist, isLoading: isLoadingArtist } = useQuery<User>({
    queryKey: [`/api/users/${id}`],
  });

  // Fetch artist media
  const { data: media, isLoading: isLoadingMedia } = useQuery<ProfileMedia[]>({
    queryKey: [`/api/users/${id}/media`],
    enabled: !!id,
  });

  // Fetch artist events
  const { data: allEvents } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  // Filter events created by this artist
  const artistEvents = allEvents?.filter(event => event.organizerId === numericId) || [];

  // Redirect to messages with this artist
  const handleContactArtist = () => {
    if (!isAuthenticated) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour contacter cet artiste",
        variant: "destructive",
      });
      return;
    }
    
    if (currentUser?.id === numericId) {
      toast({
        title: "Action impossible",
        description: "Vous ne pouvez pas vous envoyer un message à vous-même",
        variant: "destructive",
      });
      return;
    }
    
    window.location.href = `/messages/${id}`;
  };

  // Set document title when artist data is loaded
  useEffect(() => {
    if (artist) {
      document.title = `${artist.firstName} ${artist.lastName} | Bottin des artistes DAM`;
    }
  }, [artist]);

  if (isLoadingArtist) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="md:flex">
              <div className="md:w-1/3">
                <div className="h-64 bg-gray-200"></div>
              </div>
              <div className="p-6 md:w-2/3">
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-6"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-3"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-3"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-6"></div>
                <div className="flex space-x-2 mb-6">
                  <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                  <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                  <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                </div>
                <div className="h-10 bg-gray-200 rounded w-1/3"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card className="max-w-lg mx-auto">
          <CardContent className="pt-6">
            <h1 className="text-2xl font-bold mb-4">Artiste non trouvé</h1>
            <p className="text-gray-500 mb-6">
              L'artiste que vous recherchez n'existe pas ou n'est pas encore approuvé.
            </p>
            <Button asChild>
              <Link href="/artists">Retour aux artistes</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Group media by type
  const videos = media?.filter((item) => item.mediaType === "video") || [];
  const images = media?.filter((item) => item.mediaType === "image") || [];
  const audio = media?.filter((item) => item.mediaType === "audio") || [];

  // Default image if artist doesn't have one
  const profileImage = artist.profileImage || "https://images.unsplash.com/photo-1549213783-8284d0336c4f?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80";

  return (
    <div className="container mx-auto px-4 py-12">
      <Link href="/artists">
        <Button variant="ghost" className="mb-4">
          &larr; Retour aux artistes
        </Button>
      </Link>

      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
        <div className="md:flex">
          <div className="md:w-1/3">
            <div 
              className="h-64 md:h-full bg-cover bg-center" 
              style={{ backgroundImage: `url('${profileImage}')` }}
            />
          </div>
          <div className="p-6 md:w-2/3">
            <div className="flex items-center mb-2">
              <h1 className="text-3xl font-bold mr-2">{artist.firstName} {artist.lastName}</h1>
              {artist.isApproved && (
                <BadgeCheck className="h-5 w-5 text-[#F89720]" aria-label="Artiste vérifié" />
              )}
            </div>
            
            {(artist.discipline || (artist.disciplines && artist.disciplines.length > 0)) && (
              <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                  {/* Discipline principale */}
                  {artist.discipline && (
                    <span className="bg-[#F89720] text-white px-3 py-1 rounded text-sm font-medium">
                      {getDisciplineLabel(artist.discipline)}
                    </span>
                  )}
                  {/* Autres disciplines */}
                  {artist.disciplines?.filter(d => d !== artist.discipline).map((discipline) => (
                    <span key={discipline} className="border border-[#F89720] text-[#F89720] px-3 py-1 rounded text-sm">
                      {getDisciplineLabel(discipline)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {artist.bio && (
              <FormattedText text={artist.bio} className="text-gray-600 mb-6" />
            )}

            {artist.location && (
              <div className="flex items-center mb-4 text-gray-600">
                <MapPin className="mr-2 h-4 w-4" />
                {artist.location}
              </div>
            )}

            <div className="flex flex-wrap gap-3 mb-6">
              {artist.socialMedia && Object.entries(artist.socialMedia).map(([platform, url]) => {
                if (!url) return null;
                
                let Icon;
                switch (platform) {
                  case 'instagram': Icon = FaInstagram; break;
                  case 'facebook': Icon = FaFacebook; break;
                  case 'twitter': Icon = FaTwitter; break;
                  case 'youtube': Icon = FaYoutube; break;
                  case 'spotify': Icon = FaSpotify; break;
                  case 'behance': Icon = FaBehance; break;
                  case 'linkedin': Icon = FaLinkedin; break;
                  default: Icon = FaGlobe;
                }
                
                return (
                  <a 
                    key={platform} 
                    href={url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-[#F89720] text-xl"
                  >
                    <Icon />
                  </a>
                );
              })}
              
              {artist.website && (
                <a 
                  href={artist.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-[#F89720] text-xl"
                >
                  <FaGlobe />
                </a>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={handleContactArtist} className="bg-[#F89720]">
                <Mail className="mr-2 h-4 w-4" /> Contacter
              </Button>
              
              {artist.cv && (
                <a href={artist.cv} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" /> CV
                  </Button>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue={videos.length > 0 ? "videos" : (images.length > 0 ? "gallery" : "audio")}>
        <TabsList className="mb-6">
          {videos.length > 0 && <TabsTrigger value="videos">Vidéos</TabsTrigger>}
          {images.length > 0 && <TabsTrigger value="gallery">Galerie</TabsTrigger>}
          {audio.length > 0 && <TabsTrigger value="audio">Audio</TabsTrigger>}
        </TabsList>

        {videos.length > 0 && (
          <TabsContent value="videos">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {videos.map((video) => (
                <div key={video.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="relative pt-[56.25%]">
                    <iframe
                      className="absolute top-0 left-0 w-full h-full"
                      src={video.url.replace('watch?v=', 'embed/')}
                      title={video.title}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold">{video.title}</h3>
                    {video.description && <FormattedText text={video.description} className="text-gray-600 text-sm" />}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        )}

        {images.length > 0 && (
          <TabsContent value="gallery">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {images.map((image) => (
                <div key={image.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <img 
                    src={image.url} 
                    alt={image.title} 
                    className="w-full h-64 object-cover"
                  />
                  <div className="p-4">
                    <h3 className="font-bold">{image.title}</h3>
                    {image.description && <FormattedText text={image.description} className="text-gray-600 text-sm" />}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        )}

        {audio.length > 0 && (
          <TabsContent value="audio">
            <div className="space-y-4">
              {audio.map((track) => (
                <div key={track.id} className="bg-white rounded-lg shadow-md p-4">
                  <h3 className="font-bold mb-2">{track.title}</h3>
                  {track.description && <FormattedText text={track.description} className="text-gray-600 text-sm mb-3" />}
                  <audio controls className="w-full">
                    <source src={track.url} type="audio/mpeg" />
                    Votre navigateur ne supporte pas l'élément audio.
                  </audio>
                </div>
              ))}
            </div>
          </TabsContent>
        )}

        {!isLoadingMedia && media?.length === 0 && (
          <div className="text-center py-8 bg-white rounded-lg shadow-sm">
            <p className="text-gray-500">Aucun média disponible pour cet artiste.</p>
          </div>
        )}
      </Tabs>

      {/* Section des événements */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-6">Événements organisés</h2>
        {artistEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {artistEvents.map((event) => {
              const eventDate = new Date(event.eventDate);
              const imageUrl = event.imageUrl || 
                `https://images.unsplash.com/photo-${['1505236858219-8359eb29e329', '1514525253161-7a46d19cd819', '1516450360452-9312f5e86fc7'][Math.floor(Math.random() * 3)]}?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80`;
              
              // Format month and day for the event date badge
              const month = eventDate.toLocaleString('fr-FR', { month: 'short' }).toUpperCase();
              const day = eventDate.getDate();

              return (
                <Card key={event.id} className="overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                  <div 
                    className="h-48 bg-cover bg-center relative" 
                    style={{ backgroundImage: `url('${imageUrl}')` }}
                  >
                    <div className="absolute top-4 left-4">
                      <div className="bg-[#F89720] text-white p-2 text-center rounded">
                        <span className="block text-sm">{month}</span>
                        <span className="block text-2xl font-bold">{day}</span>
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-6">
                    <h3 className="font-bold text-xl mb-2">{event.title}</h3>
                    <p className="text-gray-600 text-sm mb-4">
                      {event.description.length > 100 
                        ? `${event.description.substring(0, 100)}...` 
                        : event.description}
                    </p>
                    <div className="flex items-center text-gray-600 text-sm mb-4">
                      <MapPin className="mr-2 h-4 w-4" />
                      <span>{event.location}</span>
                    </div>
                    <Link href={`/events/${event.id}`}>
                      <Button 
                        variant="outline" 
                        className="w-full border-[#F89720] text-[#F89720] hover:bg-[#F89720] hover:text-white"
                      >
                        Voir l'événement
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 bg-white rounded-lg shadow-sm">
            <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">Aucun événement organisé par cet artiste.</p>
          </div>
        )}
        
        {/* Bouton retour aux artistes */}
        <div className="mt-8 text-center">
          <Link href="/artists">
            <Button 
              className="bg-[#F89720] hover:bg-[#E67E00] text-white px-8 py-3 rounded-[25px] font-medium"
            >
              ← Retour aux Artistes
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ArtistProfile;
