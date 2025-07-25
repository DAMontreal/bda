import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Event } from "@shared/schema";
import EventCard from "@/components/events/event-card";
import { ArrowRight } from "lucide-react";

const UpcomingEvents = () => {
  const { data: events, isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events?limit=3"],
  });

  return (
    <section id="events" className="py-16 bg-gray-100">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-1">Événements à venir</h2>
            <p className="text-gray-600">
              Participez à des événements artistiques vibrants à travers le Québec
            </p>
          </div>
          <Link href="/events" className="text-dam-orange hover:underline font-medium flex items-center">
            Tous les événements <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg overflow-hidden shadow-md p-6">
                <div className="h-48 bg-gray-200 animate-pulse mb-4 rounded"></div>
                <div className="h-6 bg-gray-200 animate-pulse mb-2 w-3/4 rounded"></div>
                <div className="h-4 bg-gray-200 animate-pulse mb-4 w-1/2 rounded"></div>
                <div className="h-8 bg-gray-200 animate-pulse rounded"></div>
              </div>
            ))}
          </div>
        ) : events && events.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">Aucun événement à venir pour le moment</p>
            <Link href="/events" className="text-dam-orange hover:underline">
              Voir tous les événements
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};

export default UpcomingEvents;
