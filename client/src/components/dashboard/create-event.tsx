import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Event } from "@shared/schema";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface CreateEventProps {
  eventId?: number;
}

// Schema for event creation/update
const eventSchema = z.object({
  title: z.string().min(1, "Le titre est requis"),
  description: z.string().min(1, "La description est requise"),
  location: z.string().min(1, "Le lieu est requis"),
  eventDate: z.date({
    required_error: "La date est requise",
  }),
  imageUrl: z.string().url("Veuillez entrer une URL valide").optional().or(z.literal("")),
});

type EventFormValues = z.infer<typeof eventSchema>;

const CreateEvent = ({ eventId }: CreateEventProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const isEditMode = !!eventId;

  // Fetch event data if in edit mode
  const { data: event, isLoading: eventLoading } = useQuery<Event>({
    queryKey: [`/api/events/${eventId}`],
    enabled: isEditMode,
  });

  // Initialize form
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      eventDate: new Date(),
      imageUrl: "",
    },
  });

  // Set form values when editing an existing event
  useEffect(() => {
    if (event && isEditMode) {
      form.reset({
        title: event.title,
        description: event.description,
        location: event.location,
        eventDate: new Date(event.eventDate),
        imageUrl: event.imageUrl || "",
      });
    }
  }, [event, isEditMode, form]);

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: async (data: EventFormValues) => {
      if (!user) throw new Error("Vous devez être connecté pour créer un événement");
      
      // Transformer l'objet Date en chaîne ISO et s'assurer que les types sont corrects
      const formattedData = {
        ...data,
        // S'assurer que la date est au format ISO
        eventDate: data.eventDate.toISOString(),
        organizerId: user.id,
      };
      
      return apiRequest("POST", "/api/events", formattedData);
    },
    onSuccess: async () => {
      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      
      toast({
        title: "Événement créé",
        description: "Votre événement a été publié avec succès",
      });
      
      // Reset form
      form.reset({
        title: "",
        description: "",
        location: "",
        eventDate: new Date(),
        imageUrl: "",
      });
      
      setIsSubmitting(false);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de la création de l'événement",
      });
      
      setIsSubmitting(false);
    },
  });

  // Update event mutation
  const updateEventMutation = useMutation({
    mutationFn: async (data: EventFormValues) => {
      if (!eventId) throw new Error("ID d'événement manquant");
      
      // Transformer l'objet Date en chaîne ISO et s'assurer que les types sont corrects
      const formattedData = {
        ...data,
        // S'assurer que la date est au format ISO
        eventDate: data.eventDate.toISOString(),
      };
      
      return apiRequest("PUT", `/api/events/${eventId}`, formattedData);
    },
    onSuccess: async () => {
      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      await queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}`] });
      
      toast({
        title: "Événement mis à jour",
        description: "Les modifications ont été enregistrées avec succès",
      });
      
      setIsSubmitting(false);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de la mise à jour de l'événement",
      });
      
      setIsSubmitting(false);
    },
  });

  const onSubmit = async (data: EventFormValues) => {
    setIsSubmitting(true);
    
    if (isEditMode) {
      await updateEventMutation.mutateAsync(data);
    } else {
      await createEventMutation.mutateAsync(data);
    }
  };

  if (eventLoading && isEditMode) {
    return <div className="animate-pulse">Chargement des informations de l'événement...</div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Titre*</FormLabel>
              <FormControl>
                <Input placeholder="Titre de l'événement" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="eventDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date*</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP", { locale: fr })
                        ) : (
                          <span>Sélectionner une date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  La date à laquelle l'événement aura lieu
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lieu*</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Centre culturel, Montréal" {...field} />
                </FormControl>
                <FormDescription>
                  L'adresse ou le lieu de l'événement
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description*</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Décrivez l'événement en détail..." 
                  className="min-h-[150px]" 
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                Indiquez les informations importantes comme l'horaire, le programme, les intervenants, etc.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL de l'image (optionnel)</FormLabel>
              <FormControl>
                <Input placeholder="https://example.com/image.jpg" {...field} />
              </FormControl>
              <FormDescription>
                Ajoutez une image pour illustrer votre événement
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end pt-4">
          <Button type="submit" className="bg-[#FF5500]" disabled={isSubmitting}>
            {isSubmitting 
              ? (isEditMode ? "Mise à jour..." : "Publication en cours...") 
              : (isEditMode ? "Mettre à jour l'événement" : "Publier l'événement")}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default CreateEvent;