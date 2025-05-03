import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Event } from "@shared/schema";
import FormattedText from "@/components/ui/formatted-text";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, ArrowLeft, ExternalLink } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const EventDetail = () => {
  const { id } = useParams();
  const eventId = id ? parseInt(id) : 0;
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const [registrationUrl, setRegistrationUrl] = useState<string>("");

  const { data: event, isLoading } = useQuery<Event>({
    queryKey: [`/api/events/${eventId}`],
    enabled: !isNaN(eventId),
  });
  
  // Mutation pour ajouter un lien d'inscription
  const updateEventMutation = useMutation({
    mutationFn: async (url: string) => {
      return apiRequest("PATCH", `/api/events/${eventId}`, {
        registrationUrl: url
      });
    },
    onSuccess: () => {
      toast({
        title: "Lien d'inscription ajouté",
        description: "Le lien d'inscription a été ajouté avec succès.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}`] });
      setRegistrationUrl("");
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'ajout du lien d'inscription.",
        variant: "destructive",
      });
      console.error("Erreur lors de la mise à jour de l'événement:", error);
    }
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 w-3/4 mb-4 rounded"></div>
          <div className="h-6 bg-gray-200 w-1/2 mb-8 rounded"></div>
          <div className="h-64 bg-gray-200 mb-8 rounded-lg"></div>
          <div className="h-4 bg-gray-200 mb-2 rounded"></div>
          <div className="h-4 bg-gray-200 mb-2 rounded"></div>
          <div className="h-4 bg-gray-200 mb-8 rounded w-3/4"></div>
          <div className="h-10 bg-gray-200 w-40 rounded"></div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Événement non trouvé</h1>
        <p className="mb-6">L'événement que vous cherchez n'existe pas ou a été supprimé.</p>
        <Link href="/events">
          <Button>
            <ArrowLeft className="mr-2 h-4 w-4" /> Retour aux événements
          </Button>
        </Link>
      </div>
    );
  }

  // Créer une Date à partir de la date de l'événement
  const eventDate = new Date(event.eventDate);
  
  // Image par défaut si l'événement n'en a pas
  const imageUrl = event.imageUrl || 
    `https://images.unsplash.com/photo-${['1505236858219-8359eb29e329', '1514525253161-7a46d19cd819', '1516450360452-9312f5e86fc7'][Math.floor(Math.random() * 3)]}?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80`;

  // Détermine si l'utilisateur connecté est l'organisateur
  const isOrganizer = isAuthenticated && user && event.organizerId === user.id;

  return (
    <div className="container mx-auto px-4 py-12">
      <Link href="/events" className="inline-flex items-center text-gray-600 hover:text-[#FF5500] mb-8">
        <ArrowLeft className="mr-2 h-4 w-4" /> Retour aux événements
      </Link>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <h1 className="text-3xl font-bold mb-4">{event.title}</h1>
          
          <div className="flex flex-wrap items-center gap-4 mb-6 text-gray-600">
            <div className="flex items-center">
              <Calendar className="mr-2 h-4 w-4" />
              <span>{formatDate(eventDate)}</span>
            </div>
            <div className="flex items-center">
              <MapPin className="mr-2 h-4 w-4" />
              <span>{event.location}</span>
            </div>
          </div>
          
          <div 
            className="w-full h-64 md:h-96 rounded-lg mb-8 bg-cover bg-center" 
            style={{ backgroundImage: `url('${imageUrl}')` }}
          ></div>
          
          <div className="prose max-w-none mb-8">
            <h2 className="text-xl font-bold mb-4">Description de l'événement</h2>
            <FormattedText text={event.description} />
          </div>
        </div>
        
        <div className="lg:col-span-1">
          <div className="bg-gray-100 p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Détails</h2>
            
            <div className="mb-6">
              <div className="font-medium mb-1">Date</div>
              <div className="text-gray-600">{formatDate(eventDate)}</div>
            </div>
            
            <div className="mb-6">
              <div className="font-medium mb-1">Lieu</div>
              <div className="text-gray-600">{event.location}</div>
            </div>
            
            {event.registrationUrl && event.registrationUrl.trim() ? (
              <Button 
                className="w-full bg-[#FF5500] hover:bg-opacity-90 text-white"
                onClick={() => event.registrationUrl && window.open(event.registrationUrl, '_blank')}
              >
                S'inscrire à l'événement <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <div className="space-y-4">
                {isOrganizer && (
                  <>
                    <p className="text-sm text-gray-600">
                      En tant qu'organisateur, vous pouvez ajouter un lien d'inscription.
                    </p>
                    <input
                      type="url"
                      value={registrationUrl}
                      onChange={(e) => setRegistrationUrl(e.target.value)}
                      placeholder="https://billetterie.example.com"
                      className="w-full px-3 py-2 border rounded-md mb-2"
                    />
                    <Button 
                      className="w-full bg-[#FF5500] hover:bg-opacity-90 text-white"
                      disabled={!registrationUrl.trim().startsWith('http') || updateEventMutation.isPending}
                      onClick={() => updateEventMutation.mutate(registrationUrl)}
                    >
                      {updateEventMutation.isPending ? "Ajout en cours..." : "Ajouter le lien d'inscription"}
                    </Button>
                  </>
                )}
                {!isOrganizer && (
                  <p className="text-sm text-gray-600">
                    Aucun lien d'inscription n'est disponible pour cet événement. Contactez l'organisateur pour plus d'informations.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetail;