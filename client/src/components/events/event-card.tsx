import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import { Event } from "@shared/schema";
import { formatDate, formatDateShort } from "@/lib/utils";

interface EventCardProps {
  event: Event;
}

const EventCard = ({ event }: EventCardProps) => {
  // Default image if event doesn't have one
  const imageUrl = event.imageUrl || 
    `https://images.unsplash.com/photo-${['1505236858219-8359eb29e329', '1514525253161-7a46d19cd819', '1516450360452-9312f5e86fc7'][Math.floor(Math.random() * 3)]}?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80`;

  // Create a Date object from the event date
  const eventDate = new Date(event.eventDate);
  
  // Format month and day for the event date badge
  const month = eventDate.toLocaleString('fr-FR', { month: 'short' }).toUpperCase();
  const day = eventDate.getDate();

  return (
    <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow">
      <div 
        className="h-48 bg-cover bg-center relative" 
        style={{ backgroundImage: `url('${imageUrl}')` }}
      >
        <div className="absolute top-4 left-4">
          <div className="bg-[#FF5500] text-white p-2 text-center rounded">
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
            className="w-full border-[#FF5500] text-[#FF5500] hover:bg-[#FF5500] hover:text-white"
          >
            Détails et inscription
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
};

export default EventCard;
