import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ProfileMedia } from "@shared/schema";
import { Trash2, PlusCircle } from "lucide-react";

interface MediaUploadProps {
  userId: number;
}

// Schema for media upload
const mediaSchema = z.object({
  title: z.string().min(1, "Le titre est requis"),
  mediaType: z.enum(["image", "video", "audio"], {
    required_error: "Le type de média est requis",
  }),
  url: z.string().url("Une URL valide est requise"),
  description: z.string().optional(),
});

type MediaFormValues = z.infer<typeof mediaSchema>;

const MediaUpload = ({ userId }: MediaUploadProps) => {
  const [activeTab, setActiveTab] = useState<string>("upload");
  const { toast } = useToast();

  // Fetch user's media
  const { data: userMedia, isLoading } = useQuery<ProfileMedia[]>({
    queryKey: [`/api/users/${userId}/media`],
  });

  // Filter media by type
  const images = userMedia?.filter(m => m.mediaType === "image") || [];
  const videos = userMedia?.filter(m => m.mediaType === "video") || [];
  const audio = userMedia?.filter(m => m.mediaType === "audio") || [];

  // Initialize form
  const form = useForm<MediaFormValues>({
    resolver: zodResolver(mediaSchema),
    defaultValues: {
      title: "",
      mediaType: "image",
      url: "",
      description: "",
    },
  });

  // Create media mutation
  const createMediaMutation = useMutation({
    mutationFn: async (data: MediaFormValues) => {
      return apiRequest("POST", `/api/users/${userId}/media`, {
        ...data,
        userId,
      });
    },
    onSuccess: async () => {
      // Invalidate queries to refresh the data
      await queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/media`] });
      
      toast({
        title: "Média ajouté",
        description: "Le média a été ajouté à votre profil avec succès",
      });
      
      // Reset the form
      form.reset({
        title: "",
        mediaType: "image",
        url: "",
        description: "",
      });
      
      // Switch to the gallery tab
      setActiveTab("gallery");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de l'ajout du média",
      });
    },
  });

  // Delete media mutation
  const deleteMediaMutation = useMutation({
    mutationFn: async (mediaId: number) => {
      return apiRequest("DELETE", `/api/users/${userId}/media/${mediaId}`, undefined);
    },
    onSuccess: async () => {
      // Invalidate queries to refresh the data
      await queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/media`] });
      
      toast({
        title: "Média supprimé",
        description: "Le média a été supprimé de votre profil",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de la suppression du média",
      });
    },
  });

  const onSubmit = async (data: MediaFormValues) => {
    await createMediaMutation.mutateAsync(data);
  };

  const handleDeleteMedia = async (mediaId: number) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce média?")) {
      await deleteMediaMutation.mutateAsync(mediaId);
    }
  };

  // Preview component based on media type
  const MediaPreview = ({ type, url }: { type: string; url: string }) => {
    if (type === "image") {
      return (
        <div className="rounded overflow-hidden border border-gray-200 h-48">
          <img src={url} alt="Aperçu" className="w-full h-full object-cover" />
        </div>
      );
    } else if (type === "video") {
      const embedUrl = url.replace("watch?v=", "embed/");
      return (
        <div className="relative pt-[56.25%] rounded overflow-hidden border border-gray-200">
          <iframe
            src={embedUrl}
            className="absolute top-0 left-0 w-full h-full"
            allowFullScreen
          ></iframe>
        </div>
      );
    } else if (type === "audio") {
      return (
        <div className="rounded overflow-hidden border border-gray-200 p-4">
          <audio controls className="w-full">
            <source src={url} type="audio/mpeg" />
            Votre navigateur ne supporte pas l'élément audio.
          </audio>
        </div>
      );
    }
    return null;
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="mb-6">
        <TabsTrigger value="upload">Ajouter un média</TabsTrigger>
        <TabsTrigger value="gallery">Gérer la galerie</TabsTrigger>
      </TabsList>
      
      <TabsContent value="upload">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Titre*</FormLabel>
                    <FormControl>
                      <Input placeholder="Titre du média" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="mediaType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type de média*</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez un type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="image">Image</SelectItem>
                        <SelectItem value="video">Vidéo</SelectItem>
                        <SelectItem value="audio">Audio</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {field.value === "video" && "Pour les vidéos YouTube, utilisez l'URL complète (ex: https://www.youtube.com/watch?v=...)"}
                      {field.value === "audio" && "Pour l'audio, utilisez un lien direct vers un fichier audio (ex: https://example.com/audio.mp3)"}
                      {field.value === "image" && "Pour les images, utilisez un lien direct vers une image (ex: https://example.com/image.jpg)"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL*</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Description du média..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Preview section */}
            {form.watch("url") && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Aperçu</h3>
                <MediaPreview type={form.watch("mediaType")} url={form.watch("url")} />
              </div>
            )}
            
            <div className="flex justify-end">
              <Button 
                type="submit" 
                className="bg-[#FF5500]" 
                disabled={createMediaMutation.isPending}
              >
                {createMediaMutation.isPending ? (
                  "Ajout en cours..."
                ) : (
                  <>
                    <PlusCircle className="mr-2 h-4 w-4" /> Ajouter à mon profil
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </TabsContent>
      
      <TabsContent value="gallery">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-100 animate-pulse h-48 rounded"></div>
            ))}
          </div>
        ) : (
          <>
            {/* Images section */}
            {images.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4">Images ({images.length})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {images.map((image) => (
                    <Card key={image.id}>
                      <CardContent className="p-4">
                        <div className="h-32 mb-3 rounded overflow-hidden">
                          <img src={image.url} alt={image.title} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold">{image.title}</h4>
                            {image.description && (
                              <p className="text-sm text-gray-500">{image.description}</p>
                            )}
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDeleteMedia(image.id)}
                          >
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
            
            {/* Videos section */}
            {videos.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4">Vidéos ({videos.length})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {videos.map((video) => (
                    <Card key={video.id}>
                      <CardContent className="p-4">
                        <div className="relative pt-[56.25%] mb-3 rounded overflow-hidden">
                          <iframe
                            src={video.url.replace("watch?v=", "embed/")}
                            className="absolute top-0 left-0 w-full h-full"
                            title={video.title}
                            allowFullScreen
                          ></iframe>
                        </div>
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold">{video.title}</h4>
                            {video.description && (
                              <p className="text-sm text-gray-500">{video.description}</p>
                            )}
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDeleteMedia(video.id)}
                          >
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
            
            {/* Audio section */}
            {audio.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4">Audio ({audio.length})</h3>
                <div className="grid grid-cols-1 gap-4">
                  {audio.map((track) => (
                    <Card key={track.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold mb-2">{track.title}</h4>
                            {track.description && (
                              <p className="text-sm text-gray-500 mb-2">{track.description}</p>
                            )}
                            <audio controls className="w-full">
                              <source src={track.url} type="audio/mpeg" />
                              Votre navigateur ne supporte pas l'élément audio.
                            </audio>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDeleteMedia(track.id)}
                          >
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
            
            {userMedia?.length === 0 && (
              <div className="text-center py-10 border border-dashed border-gray-300 rounded-lg">
                <p className="text-gray-500 mb-4">Vous n'avez pas encore ajouté de médias à votre profil</p>
                <Button 
                  variant="outline" 
                  onClick={() => setActiveTab("upload")}
                >
                  Ajouter des médias
                </Button>
              </div>
            )}
          </>
        )}
      </TabsContent>
    </Tabs>
  );
};

export default MediaUpload;
