import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Event, User } from "@shared/schema";
import { Calendar, MapPin, ChevronDown, ChevronUp, CalendarIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import FormattedText from "@/components/ui/formatted-text";

const Events = () => {
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [showDetails, setShowDetails] = useState<number | null>(null);
  const { isAuthenticated, isAdmin } = useAuth();
  const { toast } = useToast();

  // Mutation pour supprimer un événement
  const deleteEventMutation = useMutation({
    mutationFn: (eventId: number) => {
      return apiRequest("DELETE", `/api/events/${eventId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({
        title: "Événement supprimé",
        description: "L'événement a été supprimé avec succès"
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de la suppression de l'événement"
      });
    }
  });

  // Fonction pour confirmer la suppression d'un événement
  const handleDeleteEvent = (eventId: number) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cet événement ? Cette action est irréversible.")) {
      deleteEventMutation.mutate(eventId);
    }
  };

  // Fetch events
  const { data: events, isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  // Filter events by date if selected
  const filteredEvents = events?.filter(event => {
    if (!date) return true;
    
    const eventDate = new Date(event.eventDate);
    return (
      eventDate.getDate() === date.getDate() &&
      eventDate.getMonth() === date.getMonth() &&
      eventDate.getFullYear() === date.getFullYear()
    );
  });

  const clearDateFilter = () => {
    setDate(undefined);
  };

  const toggleEventDetails = (eventId: number) => {
    setShowDetails(showDetails === eventId ? null : eventId);
  };

  // Fetch organizer data for each event
  const EventOrganizer = ({ organizerId }: { organizerId?: number | null }) => {
    const { data: organizer } = useQuery<User>({
      queryKey: [`/api/users/${organizerId}`],
      enabled: !!organizerId,
    });

    if (!organizerId || !organizer) return null;

    return (
      <div className="mt-4 flex items-center text-sm text-gray-500">
        <span>Organisé par: </span>
        <Link href={`/artists/${organizer.id}`} className="ml-1 text-[#FF5500] hover:underline">
          {organizer.firstName} {organizer.lastName}
        </Link>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Événements</h1>
          <p className="text-gray-600">
            Découvrez les événements artistiques à venir
          </p>
        </div>

        <div className="flex flex-wrap gap-3 mt-4 md:mt-0">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[240px] pl-3 text-left font-normal flex justify-between items-center">
                {date ? (
                  format(date, "PPP", { locale: fr })
                ) : (
                  "Filtrer par date"
                )}
                <CalendarIcon className="ml-2 h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {date && (
            <Button variant="ghost" onClick={clearDateFilter}>
              Effacer le filtre
            </Button>
          )}

          {isAuthenticated && (
            <Link href="/dashboard?tab=events">
              <Button className="bg-[#FF5500]">
                <Calendar className="mr-2 h-4 w-4" /> Créer un événement
              </Button>
            </Link>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="flex justify-between">
                <div className="h-8 bg-gray-200 rounded w-[100px]"></div>
                <div className="h-8 bg-gray-200 rounded w-[180px]"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredEvents && filteredEvents.length > 0 ? (
        <div className="space-y-6">
          {filteredEvents.map((event) => {
            const eventDate = new Date(event.eventDate);
            const imageUrl = event.imageUrl || 
              `https://images.unsplash.com/photo-${['1505236858219-8359eb29e329', '1514525253161-7a46d19cd819', '1516450360452-9312f5e86fc7'][Math.floor(Math.random() * 3)]}?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80`;
            
            return (
              <Card key={event.id} className="overflow-hidden">
                <div className="md:flex">
                  <div className="md:w-1/4">
                    <div 
                      className="h-48 md:h-full bg-cover bg-center"
                      style={{ backgroundImage: `url('${imageUrl}')` }}
                    />
                  </div>
                  <CardContent className="p-6 md:w-3/4">
                    <h2 className="text-2xl font-bold mb-1">{event.title}</h2>
                    
                    <div className="flex items-center mb-4 text-gray-600">
                      <Calendar className="mr-2 h-4 w-4" />
                      {formatDate(eventDate)}
                      <span className="mx-2">•</span>
                      <MapPin className="mr-2 h-4 w-4" />
                      {event.location}
                    </div>
                    
                    <div className={showDetails === event.id ? "mb-4" : "mb-4 line-clamp-2"}>
                      <FormattedText text={event.description} className="text-gray-600" />
                    </div>
                    
                    {showDetails === event.id && <EventOrganizer organizerId={event.organizerId} />}
                    
                    <div className="flex justify-between items-center mt-4">
                      <Button 
                        variant="ghost" 
                        onClick={() => toggleEventDetails(event.id)}
                        className="text-[#FF5500] p-0 h-auto hover:bg-transparent hover:text-opacity-80"
                      >
                        {showDetails === event.id ? (
                          <>Moins de détails <ChevronUp className="ml-1 h-4 w-4" /></>
                        ) : (
                          <>Plus de détails <ChevronDown className="ml-1 h-4 w-4" /></>
                        )}
                      </Button>
                      
                      <Button variant="default" className="bg-[#FF5500]">
                        S'inscrire à l'événement
                      </Button>
                    </div>
                    
                    {isAdmin && (
                      <div className="mt-4 pt-4 border-t border-gray-200 flex gap-2">
                        <Link href={`/dashboard?tab=events&edit=${event.id}`}>
                          <Button variant="outline" size="sm">Modifier</Button>
                        </Link>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleDeleteEvent(event.id)}
                          disabled={deleteEventMutation.isPending}
                        >
                          {deleteEventMutation.isPending ? "Suppression..." : "Supprimer"}
                          {!deleteEventMutation.isPending && <Trash2 className="ml-2 h-4 w-4" />}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-6 text-center">
            <h3 className="text-xl font-medium mb-2">Aucun événement trouvé</h3>
            {date ? (
              <p className="text-gray-500 mb-4">
                Aucun événement n'est prévu le {format(date, "PPP", { locale: fr })}.
              </p>
            ) : (
              <p className="text-gray-500 mb-4">
                Il n'y a pas d'événements à venir pour le moment.
              </p>
            )}
            {date && (
              <Button onClick={clearDateFilter}>Effacer le filtre</Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Events;
