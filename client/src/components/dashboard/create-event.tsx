import { useState, useEffect, useRef } from "react";
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
import { Calendar as CalendarIcon, UploadCloud, Image } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  detailImageUrl: z.string().url("Veuillez entrer une URL valide").optional().or(z.literal("")),
  registrationUrl: z.string().url("Veuillez entrer une URL valide pour l'inscription").optional().or(z.literal("")),
});

type EventFormValues = z.infer<typeof eventSchema>;

const CreateEvent = ({ eventId }: CreateEventProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadMethod, setUploadMethod] = useState<"url" | "file">("url");
  const [selectedListImage, setSelectedListImage] = useState<File | null>(null);
  const [selectedDetailImage, setSelectedDetailImage] = useState<File | null>(null);
  const [listImagePreviewUrl, setListImagePreviewUrl] = useState<string>("");
  const [detailImagePreviewUrl, setDetailImagePreviewUrl] = useState<string>("");
  const [isUploadingList, setIsUploadingList] = useState(false);
  const [isUploadingDetail, setIsUploadingDetail] = useState(false);
  const [uploadMethodList, setUploadMethodList] = useState<"url" | "file">("url");
  const [uploadMethodDetail, setUploadMethodDetail] = useState<"url" | "file">("url");
  const fileInputRefList = useRef<HTMLInputElement>(null);
  const fileInputRefDetail = useRef<HTMLInputElement>(null);
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
      detailImageUrl: "",
      registrationUrl: "",
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
        detailImageUrl: event.detailImageUrl || "",
        registrationUrl: event.registrationUrl || "",
      });
      // Initialiser les URLs d'images pour la prévisualisation
      if (event.imageUrl) {
        setListImagePreviewUrl(event.imageUrl);
      }
      if (event.detailImageUrl) {
        setDetailImagePreviewUrl(event.detailImageUrl);
      }
    }
  }, [event, isEditMode, form]);
  
  // Upload event image mutation
  const uploadEventImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      return fetch('/api/upload/event-image', {
        method: 'POST',
        body: formData
      }).then(res => {
        if (!res.ok) {
          throw new Error(`Erreur ${res.status}: ${res.statusText}`);
        }
        return res.json();
      });
    },
    onSuccess: async (data) => {
      form.setValue('imageUrl', data.url);
      setListImagePreviewUrl(data.url);
      
      toast({
        title: "Image téléchargée",
        description: "L'image a été téléchargée avec succès"
      });
      
      setSelectedListImage(null);
      if (fileInputRefList.current) {
        fileInputRefList.current.value = '';
      }
      setIsUploadingList(false);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors du téléchargement de l'image"
      });
      setIsUploadingList(false);
    }
  });

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
        detailImageUrl: "",
        registrationUrl: "",
      });
      
      // Reset image state
      setListImagePreviewUrl("");
      setDetailImagePreviewUrl("");
      setSelectedListImage(null);
      setSelectedDetailImage(null);
      if (fileInputRefList.current) {
        fileInputRefList.current.value = '';
      }
      if (fileInputRefDetail.current) {
        fileInputRefDetail.current.value = '';
      }
      
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
          name="registrationUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Lien d'inscription</FormLabel>
              <FormControl>
                <Input 
                  type="url"
                  placeholder="https://billetterie.example.com" 
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                Ajoutez un lien vers un site de billetterie ou d'inscription pour votre événement (optionnel)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Image pour la liste des événements */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">Image de liste</h3>
            <span className="text-sm text-gray-500">(Pour les cartes d'événements)</span>
          </div>
          <div className="bg-blue-50 p-3 rounded-md">
            <p className="text-sm text-blue-700">
              <strong>Format recommandé :</strong> 400x300 pixels (4:3) - Cette image apparaîtra dans la liste des événements
            </p>
          </div>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-1/3">
              <div className="rounded-md border border-gray-200 p-4">
                <div className="mb-4 text-center">
                  {listImagePreviewUrl ? (
                    <div className="h-48 w-full overflow-hidden rounded-md">
                      <img src={listImagePreviewUrl} alt="Image de liste" className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-48 w-full flex items-center justify-center rounded-md bg-gray-100">
                      <Image size={48} className="text-gray-400" />
                    </div>
                  )}
                </div>
                
                <Tabs defaultValue="url" onValueChange={(value) => setUploadMethodList(value as "url" | "file")}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="url">Par URL</TabsTrigger>
                    <TabsTrigger value="file">Télécharger</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="url" className="mt-4">
                    <FormField
                      control={form.control}
                      name="imageUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="https://example.com/image.jpg" {...field} />
                          </FormControl>
                          <FormDescription>
                            URL de l'image pour la liste des événements
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                  
                  <TabsContent value="file" className="mt-4">
                    <div className="space-y-4">
                      <div className="border-2 border-dashed border-gray-200 rounded-md p-6">
                        <input 
                          type="file"
                          ref={fileInputRefList}
                          accept="image/*"
                          className="block w-full text-sm text-gray-500"
                          onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                              const file = e.target.files[0];
                              const maxSize = 5 * 1024 * 1024; // 5MB
                              if (file.size > maxSize) {
                                toast({
                                  variant: "destructive",
                                  title: "Fichier trop volumineux",
                                  description: "La taille maximum est de 5 MB",
                                });
                                e.target.value = "";
                                setSelectedListImage(null);
                              } else {
                                setSelectedListImage(file);
                                const url = URL.createObjectURL(file);
                                setListImagePreviewUrl(url);
                              }
                            }
                          }}
                        />
                        <p className="text-xs text-gray-500 mt-2">
                          Formats acceptés: JPG, PNG, GIF, WebP (max 5 MB)
                        </p>
                      </div>
                      
                      <Button 
                        type="button" 
                        className="bg-[#F89720]"
                        disabled={!selectedListImage || isUploadingList}
                        onClick={async () => {
                          if (selectedListImage) {
                            setIsUploadingList(true);
                            try {
                              await uploadEventImageMutation.mutateAsync(selectedListImage);
                            } catch (error) {
                              console.error("Erreur lors du téléchargement:", error);
                            }
                          }
                        }}
                      >
                        {isUploadingList ? (
                          "Téléchargement en cours..."
                        ) : (
                          <>
                            <UploadCloud className="mr-2 h-4 w-4" /> Télécharger l'image
                          </>
                        )}
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
            
            <div className="w-full md:w-2/3">
              <FormDescription className="text-sm">
                Ajouter une image permettra de mieux illustrer votre événement et d'attirer l'attention des visiteurs. 
                Choisissez une image de bonne qualité qui représente bien le thème ou le contenu de votre événement.
              </FormDescription>
            </div>
          </div>
        </div>

        {/* Image pour la page de détail */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">Image de détail</h3>
            <span className="text-sm text-gray-500">(Pour la page de l'événement)</span>
          </div>
          <div className="bg-green-50 p-3 rounded-md">
            <p className="text-sm text-green-700">
              <strong>Format recommandé :</strong> 800x400 pixels (2:1) - Cette image apparaîtra dans la page de détail de l'événement
            </p>
          </div>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-1/3">
              <div className="rounded-md border border-gray-200 p-4">
                <div className="mb-4 text-center">
                  {detailImagePreviewUrl ? (
                    <div className="h-48 w-full overflow-hidden rounded-md">
                      <img src={detailImagePreviewUrl} alt="Image de détail" className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-48 w-full flex items-center justify-center rounded-md bg-gray-100">
                      <Image size={48} className="text-gray-400" />
                    </div>
                  )}
                </div>
                
                <Tabs defaultValue="url" onValueChange={(value) => setUploadMethodDetail(value as "url" | "file")}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="url">Par URL</TabsTrigger>
                    <TabsTrigger value="file">Télécharger</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="url" className="mt-4">
                    <FormField
                      control={form.control}
                      name="detailImageUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="https://example.com/image.jpg" {...field} />
                          </FormControl>
                          <FormDescription>
                            URL de l'image pour la page de détail
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                  
                  <TabsContent value="file" className="mt-4">
                    <div className="space-y-4">
                      <div className="border-2 border-dashed border-gray-200 rounded-md p-6">
                        <input 
                          type="file"
                          ref={fileInputRefDetail}
                          accept="image/*"
                          className="block w-full text-sm text-gray-500"
                          onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                              const file = e.target.files[0];
                              const maxSize = 5 * 1024 * 1024; // 5MB
                              if (file.size > maxSize) {
                                toast({
                                  variant: "destructive",
                                  title: "Fichier trop volumineux",
                                  description: "La taille maximum est de 5 MB",
                                });
                                e.target.value = "";
                                setSelectedDetailImage(null);
                              } else {
                                setSelectedDetailImage(file);
                                const url = URL.createObjectURL(file);
                                setDetailImagePreviewUrl(url);
                              }
                            }
                          }}
                        />
                        <p className="text-xs text-gray-500 mt-2">
                          Formats acceptés: JPG, PNG, GIF, WebP (max 5 MB)
                        </p>
                      </div>
                      
                      <Button 
                        type="button" 
                        className="bg-[#F89720]"
                        disabled={!selectedDetailImage || isUploadingDetail}
                        onClick={async () => {
                          if (selectedDetailImage) {
                            setIsUploadingDetail(true);
                            try {
                              // Créer une mutation spécifique pour l'image de détail
                              const formData = new FormData();
                              formData.append('file', selectedDetailImage);
                              
                              const res = await fetch('/api/upload/event-image', {
                                method: 'POST',
                                body: formData
                              });
                              
                              if (!res.ok) {
                                throw new Error(`Erreur ${res.status}: ${res.statusText}`);
                              }
                              
                              const data = await res.json();
                              form.setValue('detailImageUrl', data.url);
                              setDetailImagePreviewUrl(data.url);
                              
                              toast({
                                title: "Image téléchargée",
                                description: "L'image de détail a été téléchargée avec succès"
                              });
                              
                              setSelectedDetailImage(null);
                              if (fileInputRefDetail.current) {
                                fileInputRefDetail.current.value = '';
                              }
                            } catch (error: any) {
                              toast({
                                variant: "destructive",
                                title: "Erreur",
                                description: error.message || "Une erreur est survenue lors du téléchargement"
                              });
                            } finally {
                              setIsUploadingDetail(false);
                            }
                          }
                        }}
                      >
                        {isUploadingDetail ? (
                          "Téléchargement en cours..."
                        ) : (
                          <>
                            <UploadCloud className="mr-2 h-4 w-4" /> Télécharger l'image
                          </>
                        )}
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
            
            <div className="w-full md:w-2/3">
              <FormDescription className="text-sm">
                Cette image sera affichée en grand format dans la page de détail de l'événement. 
                Choisissez une image haute résolution qui met en valeur votre événement.
              </FormDescription>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end pt-4">
          <Button type="submit" className="bg-[#F89720]" disabled={isSubmitting}>
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