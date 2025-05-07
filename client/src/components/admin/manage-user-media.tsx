import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ProfileMedia, User, insertProfileMediaSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, PlusCircle, Trash2, Upload, ExternalLink } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import FormattedText from "@/components/ui/formatted-text";

// Schéma de validation pour le formulaire de média
const mediaFormSchema = z.object({
  title: z.string().min(1, "Le titre est requis"),
  description: z.string().optional(),
  mediaType: z.enum(["image", "video", "audio"]),
  url: z.string().min(1, "L'URL est requise"),
});

type MediaFormValues = z.infer<typeof mediaFormSchema>;

// Type pour les fichiers téléchargés
interface UploadedFile {
  file: File;
  preview: string;
  type: string;
}

interface ManageUserMediaProps {
  user: User;
}

export default function ManageUserMedia({ user }: ManageUserMediaProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAddMediaDialogOpen, setIsAddMediaDialogOpen] = useState(false);

  // Récupérer les médias de l'utilisateur
  const { data: media, isLoading: isLoadingMedia } = useQuery<ProfileMedia[]>({
    queryKey: [`/api/users/${user.id}/media`],
    enabled: !!user.id,
  });

  // Formulaire pour ajouter un média
  const form = useForm<MediaFormValues>({
    resolver: zodResolver(mediaFormSchema),
    defaultValues: {
      title: "",
      description: "",
      mediaType: "image",
      url: "",
    },
  });

  // Mutation pour ajouter un média
  const addMediaMutation = useMutation({
    mutationFn: async (values: MediaFormValues) => {
      return apiRequest("POST", `/api/users/${user.id}/media`, {
        ...values,
        userId: user.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user.id}/media`] });
      setIsAddMediaDialogOpen(false);
      form.reset();
      toast({
        title: "Média ajouté",
        description: "Le média a été ajouté avec succès au profil de l'utilisateur",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de l'ajout du média",
      });
    },
  });

  // Mutation pour supprimer un média
  const deleteMediaMutation = useMutation({
    mutationFn: async (mediaId: number) => {
      return apiRequest("DELETE", `/api/users/${user.id}/media/${mediaId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user.id}/media`] });
      toast({
        title: "Média supprimé",
        description: "Le média a été supprimé avec succès",
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

  // Mutation pour télécharger un fichier média
  const uploadMediaFileMutation = useMutation({
    mutationFn: async ({ file, mediaType }: { file: File; mediaType: string }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mediaType", mediaType);
      
      const response = await fetch(`/api/upload/media?userId=${user.id}`, {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erreur lors du téléchargement du fichier");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      // Pré-remplir le formulaire avec les données du fichier téléchargé
      form.setValue("url", data.url);
      form.setValue("title", form.getValues("title") || data.filename || "Sans titre");
      
      toast({
        title: "Fichier téléchargé",
        description: "Le fichier a été téléchargé avec succès",
      });
      
      setUploadedFile(null);
      setIsUploading(false);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Erreur lors du téléchargement du fichier",
      });
      setIsUploading(false);
    },
  });

  // Gérer le changement de fichier
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const fileType = file.type.split('/')[0]; // 'image', 'video', 'audio'
      
      // Définir le type de média en fonction du type de fichier
      if (fileType === 'image' || fileType === 'video' || fileType === 'audio') {
        form.setValue("mediaType", fileType as any);
      }
      
      // Créer une URL pour la prévisualisation
      const preview = URL.createObjectURL(file);
      
      setUploadedFile({
        file,
        preview,
        type: fileType,
      });
      
      // Extraire un titre du nom de fichier
      const fileName = file.name.split('.').slice(0, -1).join('.');
      form.setValue("title", fileName);
    }
  };

  // Télécharger le fichier
  const handleUploadFile = async () => {
    if (uploadedFile) {
      setIsUploading(true);
      uploadMediaFileMutation.mutate({
        file: uploadedFile.file,
        mediaType: form.getValues("mediaType"),
      });
    }
  };

  // Supprimer le fichier
  const handleRemoveFile = () => {
    if (uploadedFile) {
      URL.revokeObjectURL(uploadedFile.preview);
    }
    setUploadedFile(null);
  };

  // Soumettre le formulaire
  const onSubmit = (values: MediaFormValues) => {
    addMediaMutation.mutate(values);
  };

  // Grouper les médias par type
  const videos = media?.filter((item) => item.mediaType === "video") || [];
  const images = media?.filter((item) => item.mediaType === "image") || [];
  const audio = media?.filter((item) => item.mediaType === "audio") || [];

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Médias de {user.firstName} {user.lastName}</CardTitle>
          <CardDescription>
            Gérer les médias du profil de l'utilisateur
          </CardDescription>
        </div>
        <Dialog open={isAddMediaDialogOpen} onOpenChange={setIsAddMediaDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un média
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Ajouter un nouveau média</DialogTitle>
              <DialogDescription>
                Ajoutez un nouveau média au profil de {user.firstName} {user.lastName}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="mediaType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type de média</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionnez un type de média" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="image">Image</SelectItem>
                          <SelectItem value="video">Vidéo</SelectItem>
                          <SelectItem value="audio">Audio</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Zone de téléchargement de fichier */}
                {form.watch("mediaType") !== "video" && (
                  <div className="border rounded-md p-4">
                    <div className="text-sm mb-2">Télécharger un fichier :</div>
                    <div className="flex flex-col items-center space-y-2">
                      {uploadedFile && (
                        <div className="relative w-full">
                          {uploadedFile.type === "image" && (
                            <img
                              src={uploadedFile.preview}
                              alt="Aperçu"
                              className="w-full h-48 object-contain mb-2"
                            />
                          )}
                          {uploadedFile.type === "audio" && (
                            <div className="flex items-center justify-center h-20 bg-gray-100 rounded mb-2">
                              <span className="text-sm">Fichier audio sélectionné</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-sm truncate">
                              {uploadedFile.file.name} ({Math.round(uploadedFile.file.size / 1024)} Ko)
                            </span>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={handleRemoveFile}
                              disabled={isUploading}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      {!uploadedFile && (
                        <>
                          <Input
                            id="file-upload"
                            type="file"
                            accept={
                              form.watch("mediaType") === "image"
                                ? "image/*"
                                : form.watch("mediaType") === "audio"
                                ? "audio/*"
                                : ""
                            }
                            className="hidden"
                            onChange={handleFileChange}
                          />
                          <label htmlFor="file-upload" className="w-full">
                            <Button variant="outline" className="w-full cursor-pointer" asChild>
                              <span>Choisir un fichier</span>
                            </Button>
                          </label>
                        </>
                      )}
                      
                      {uploadedFile && (
                        <Button
                          onClick={handleUploadFile}
                          disabled={isUploading}
                          className="w-full"
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Téléchargement en cours...
                            </>
                          ) : (
                            <>
                              <Upload className="mr-2 h-4 w-4" />
                              Télécharger le fichier
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
                
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Titre*</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Titre du média" />
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
                        <Textarea
                          {...field}
                          placeholder="Description optionnelle"
                          className="min-h-[80px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL*</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={
                            form.watch("mediaType") === "video"
                              ? "https://www.youtube.com/watch?v=..."
                              : "URL du média"
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddMediaDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" disabled={addMediaMutation.isPending}>
                    {addMediaMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Ajouter
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoadingMedia ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue={videos.length > 0 ? "videos" : (images.length > 0 ? "images" : "audio")}>
            <TabsList className="mb-4">
              <TabsTrigger value="images" disabled={images.length === 0}>
                Images ({images.length})
              </TabsTrigger>
              <TabsTrigger value="videos" disabled={videos.length === 0}>
                Vidéos ({videos.length})
              </TabsTrigger>
              <TabsTrigger value="audio" disabled={audio.length === 0}>
                Audio ({audio.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="images">
              {images.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {images.map((item) => (
                    <Card key={item.id} className="overflow-hidden">
                      <div className="relative">
                        <img
                          src={item.url}
                          alt={item.title}
                          className="w-full h-48 object-cover"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={() => deleteMediaMutation.mutate(item.id)}
                          disabled={deleteMediaMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <CardContent className="p-4">
                        <div className="font-medium">{item.title}</div>
                        {item.description && (
                          <FormattedText text={item.description} className="text-sm text-gray-500 mt-1" />
                        )}
                        <div className="flex justify-end mt-2">
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-500 flex items-center"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" /> Voir
                          </a>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-md">
                  <p className="text-gray-500">Aucune image disponible</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="videos">
              {videos.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {videos.map((video) => (
                    <Card key={video.id} className="overflow-hidden">
                      <div className="relative pt-[56.25%]">
                        <iframe
                          className="absolute top-0 left-0 w-full h-full"
                          src={video.url.replace('watch?v=', 'embed/')}
                          title={video.title}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        ></iframe>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 z-10"
                          onClick={() => deleteMediaMutation.mutate(video.id)}
                          disabled={deleteMediaMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <CardContent className="p-4">
                        <div className="font-medium">{video.title}</div>
                        {video.description && (
                          <FormattedText text={video.description} className="text-sm text-gray-500 mt-1" />
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-md">
                  <p className="text-gray-500">Aucune vidéo disponible</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="audio">
              {audio.length > 0 ? (
                <div className="space-y-4">
                  {audio.map((track) => (
                    <Card key={track.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-medium">{track.title}</div>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => deleteMediaMutation.mutate(track.id)}
                            disabled={deleteMediaMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        {track.description && (
                          <FormattedText text={track.description} className="text-sm text-gray-500 mb-3" />
                        )}
                        <audio controls className="w-full">
                          <source src={track.url} type="audio/mpeg" />
                          Votre navigateur ne supporte pas l'élément audio.
                        </audio>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-md">
                  <p className="text-gray-500">Aucun fichier audio disponible</p>
                </div>
              )}
            </TabsContent>
            
            {media?.length === 0 && (
              <div className="text-center py-8 bg-gray-50 rounded-md">
                <p className="text-gray-500">Aucun média n'a été ajouté pour cet utilisateur</p>
                <Button 
                  className="mt-4"
                  onClick={() => setIsAddMediaDialogOpen(true)}
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un média
                </Button>
              </div>
            )}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}