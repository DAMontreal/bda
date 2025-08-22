import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { User } from "@shared/schema";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { disciplines } from "@/lib/utils";
import { UploadCloud, Camera } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ProfileFormProps {
  user: User;
}

// Schema for updating profile
const profileSchema = z.object({
  firstName: z.string().min(1, "Le prénom est requis"),
  lastName: z.string().min(1, "Le nom est requis"),
  bio: z.string().optional(),
  discipline: z.string().optional(),
  disciplines: z.array(z.string()).optional(),
  location: z.string().optional(),
  website: z.string().url("Veuillez entrer une URL valide").optional().or(z.literal("")),
  profileImage: z.string().url("Veuillez entrer une URL valide").optional().or(z.literal("")),
  cv: z.string().url("Veuillez entrer une URL valide").optional().or(z.literal("")),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const ProfileForm = ({ user }: ProfileFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadMethod, setUploadMethod] = useState<"url" | "file">("url");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>(user.profileImage || "");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Initialize the form with current user data
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user.firstName,
      lastName: user.lastName,
      bio: user.bio || "",
      discipline: user.discipline || "",
      disciplines: user.disciplines || [],
      location: user.location || "",
      website: user.website || "",
      profileImage: user.profileImage || "",
      cv: user.cv || "",
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      return apiRequest("PUT", `/api/users/${user.id}`, data);
    },
    onSuccess: async () => {
      // Invalidate the user query to get the updated data
      await queryClient.invalidateQueries({ queryKey: [`/api/users/${user.id}`] });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      
      toast({
        title: "Profil mis à jour",
        description: "Vos informations ont été enregistrées avec succès",
      });
      
      setIsSubmitting(false);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de la mise à jour de votre profil",
      });
      
      setIsSubmitting(false);
    },
  });
  
  // Upload profile image mutation
  const uploadProfileImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      return fetch('/api/upload/profile-image', {
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
      form.setValue('profileImage', data.url);
      setImagePreviewUrl(data.url);
      
      // Automatically update profile with new image
      toast({
        title: "Photo de profil téléchargée",
        description: "Votre photo de profil a été mise à jour avec succès"
      });
      
      // Invalidate queries to refresh user data
      await queryClient.invalidateQueries({ queryKey: [`/api/users/${user.id}`] });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      
      setSelectedImage(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setIsUploading(false);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors du téléchargement de l'image"
      });
      setIsUploading(false);
    }
  });

  const onSubmit = async (data: ProfileFormValues) => {
    setIsSubmitting(true);
    await updateProfileMutation.mutateAsync(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prénom*</FormLabel>
                <FormControl>
                  <Input placeholder="Prénom" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nom*</FormLabel>
                <FormControl>
                  <Input placeholder="Nom" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Biographie</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Parlez de vous et de votre démarche artistique..." 
                  className="min-h-[150px]" 
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                Décrivez votre parcours, votre pratique et vos inspirations artistiques
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="discipline"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Discipline principale</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  value={field.value} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez votre discipline principale" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {disciplines.map(discipline => (
                      <SelectItem key={discipline.value} value={discipline.value}>
                        {discipline.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Cette discipline s'affichera en premier sur votre profil
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
                <FormLabel>Localisation</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Montréal, QC" {...field} />
                </FormControl>
                <FormDescription>
                  Ville ou région où vous êtes basé(e)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="disciplines"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Disciplines artistiques (optionnel)</FormLabel>
              <FormDescription>
                Sélectionnez toutes les disciplines qui décrivent votre pratique artistique
              </FormDescription>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                {disciplines.map((discipline) => (
                  <FormItem key={discipline.value} className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value?.includes(discipline.value) || false}
                        onCheckedChange={(checked) => {
                          const currentValue = field.value || [];
                          if (checked) {
                            field.onChange([...currentValue, discipline.value]);
                          } else {
                            field.onChange(currentValue.filter((item) => item !== discipline.value));
                          }
                        }}
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-normal">
                      {discipline.label}
                    </FormLabel>
                  </FormItem>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Photo de profil</h3>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-1/3">
              <div className="rounded-md border border-gray-200 p-4">
                <div className="mb-4 text-center">
                  {imagePreviewUrl ? (
                    <div className="h-48 w-48 mx-auto overflow-hidden rounded-md">
                      <img src={imagePreviewUrl} alt="Photo de profil" className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-48 w-48 mx-auto flex items-center justify-center rounded-md bg-gray-100">
                      <Camera size={48} className="text-gray-400" />
                    </div>
                  )}
                </div>
                
                <Tabs defaultValue="url" onValueChange={(value) => setUploadMethod(value as "url" | "file")}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="url">Par URL</TabsTrigger>
                    <TabsTrigger value="file">Télécharger</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="url" className="mt-4">
                    <FormField
                      control={form.control}
                      name="profileImage"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="https://example.com/votre-photo.jpg" {...field} />
                          </FormControl>
                          <FormDescription>
                            Entrez l'URL d'une image pour votre profil
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
                          ref={fileInputRef}
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
                                setSelectedImage(null);
                              } else {
                                setSelectedImage(file);
                                // Create preview URL
                                const url = URL.createObjectURL(file);
                                setImagePreviewUrl(url);
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
                        disabled={!selectedImage || isUploading}
                        onClick={async () => {
                          if (selectedImage) {
                            setIsUploading(true);
                            try {
                              await uploadProfileImageMutation.mutateAsync(selectedImage);
                            } catch (error) {
                              console.error("Erreur lors du téléchargement:", error);
                            }
                          }
                        }}
                      >
                        {isUploading ? (
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
              {/* Le reste du formulaire continue ici */}
            </div>
          </div>
        </div>
        
        <FormField
          control={form.control}
          name="website"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Site web</FormLabel>
              <FormControl>
                <Input placeholder="https://www.votresite.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="cv"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL du CV</FormLabel>
              <FormControl>
                <Input placeholder="https://example.com/votre-cv.pdf" {...field} />
              </FormControl>
              <FormDescription>
                Lien vers votre CV ou portfolio en ligne
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end">
          <Button type="submit" className="bg-[#F89720]" disabled={isSubmitting}>
            {isSubmitting ? "Enregistrement..." : "Enregistrer les modifications"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default ProfileForm;
