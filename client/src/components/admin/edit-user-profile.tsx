import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { disciplines } from "@/lib/utils";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Upload, Loader2 } from "lucide-react";

// Schéma de validation pour le formulaire
const userProfileSchema = z.object({
  firstName: z.string().min(1, "Le prénom est requis"),
  lastName: z.string().min(1, "Le nom est requis"),
  email: z.string().email("Email invalide"),
  username: z.string().min(3, "Le nom d'utilisateur doit contenir au moins 3 caractères"),
  bio: z.string().optional(),
  location: z.string().optional(),
  discipline: z.string().optional(),
  website: z.string().optional(),
  profileImage: z.string().optional(),
  isApproved: z.boolean().optional(),
  isAdmin: z.boolean().optional(),
  socialMedia: z.object({
    instagram: z.string().optional(),
    facebook: z.string().optional(),
    twitter: z.string().optional(),
    youtube: z.string().optional(),
    spotify: z.string().optional(),
    behance: z.string().optional(),
    linkedin: z.string().optional(),
    other: z.string().optional()
  }).optional()
});

type UserProfileFormValues = z.infer<typeof userProfileSchema>;

interface EditUserProfileProps {
  user: User;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const EditUserProfile = ({ user, onSuccess, onCancel }: EditUserProfileProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(user.profileImage || null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Initialiser le formulaire
  const form = useForm<UserProfileFormValues>({
    resolver: zodResolver(userProfileSchema),
    defaultValues: {
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email || "",
      username: user.username || "",
      bio: user.bio || "",
      location: user.location || "",
      discipline: user.discipline || "",
      website: user.website || "",
      isApproved: user.isApproved ?? false,
      isAdmin: user.isAdmin ?? false,
      socialMedia: user.socialMedia || {}
    }
  });

  // Mutation pour mettre à jour le profil
  const updateProfileMutation = useMutation({
    mutationFn: async (data: UserProfileFormValues) => {
      return apiRequest("PUT", `/api/users/${user.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user.id}`] });
      toast({
        title: "Profil mis à jour",
        description: "Le profil a été mis à jour avec succès",
      });
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de la mise à jour du profil",
      });
    }
  });

  // Mutation pour télécharger l'image de profil
  const uploadProfileImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch(`/api/upload/profile-image?userId=${user.id}`, {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erreur lors du téléchargement de l'image");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setProfileImagePreview(data.url);
      toast({
        title: "Image téléchargée",
        description: "L'image de profil a été mise à jour",
      });
      
      // Mettre à jour l'utilisateur avec la nouvelle image
      updateProfileMutation.mutate({ ...form.getValues(), profileImage: data.url });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Erreur lors du téléchargement de l'image",
      });
    },
    onSettled: () => {
      setUploadingImage(false);
    }
  });

  // Gérer le changement d'image de profil
  const handleProfileImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setProfileImage(file);
      setProfileImagePreview(URL.createObjectURL(file));
    }
  };

  // Télécharger l'image de profil
  const handleUploadProfileImage = async () => {
    if (profileImage) {
      setUploadingImage(true);
      uploadProfileImageMutation.mutate(profileImage);
    }
  };

  // Supprimer l'image de profil prévisualisée
  const handleRemoveProfileImage = () => {
    setProfileImage(null);
    setProfileImagePreview(user.profileImage || null);
  };

  // Soumettre le formulaire
  const onSubmit = async (data: UserProfileFormValues) => {
    updateProfileMutation.mutate(data);
  };

  // Gérer le bouton annuler
  const handleCancel = () => {
    if (onCancel) onCancel();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Modifier le profil de {user.firstName} {user.lastName}</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="profile">Profil</TabsTrigger>
            <TabsTrigger value="photo">Photo de profil</TabsTrigger>
            <TabsTrigger value="settings">Paramètres</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prénom</FormLabel>
                        <FormControl>
                          <Input {...field} />
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
                        <FormLabel>Nom</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom d'utilisateur</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" />
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
                          {...field}
                          placeholder="Présentez l'artiste en quelques phrases..."
                          className="min-h-[100px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lieu</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ville, Pays" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="discipline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discipline artistique</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionnez une discipline" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {disciplines.map((discipline) => (
                              <SelectItem key={discipline.value} value={discipline.value}>
                                {discipline.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Site web</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={handleCancel}>
                    Annuler
                  </Button>
                  <Button type="submit" disabled={updateProfileMutation.isPending}>
                    {updateProfileMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Enregistrer
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>
          
          <TabsContent value="photo">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Avatar className="h-32 w-32">
                  <AvatarImage 
                    src={profileImagePreview || ""} 
                    alt={`${user.firstName} ${user.lastName}`} 
                  />
                  <AvatarFallback>
                    {user.firstName && user.lastName 
                      ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`
                      : "??"
                    }
                  </AvatarFallback>
                </Avatar>
                {profileImage && (
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                    onClick={handleRemoveProfileImage}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              
              <div className="flex flex-col items-center space-y-2 w-full max-w-sm">
                <Input
                  id="profile-image"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleProfileImageChange}
                />
                <label htmlFor="profile-image">
                  <Button variant="outline" className="cursor-pointer" asChild>
                    <span>Choisir une image</span>
                  </Button>
                </label>
                
                {profileImage && (
                  <Button
                    onClick={handleUploadProfileImage}
                    disabled={uploadingImage}
                    className="w-full"
                  >
                    {uploadingImage ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Téléchargement en cours...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Télécharger l'image
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="settings">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="isApproved"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Statut du compte</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          {field.value ? "Compte approuvé" : "Compte en attente d'approbation"}
                        </div>
                      </div>
                      <FormControl>
                        <Select
                          onValueChange={(value) => field.onChange(value === "true")}
                          defaultValue={field.value ? "true" : "false"}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Statut" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true">Approuvé</SelectItem>
                            <SelectItem value="false">En attente</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="isAdmin"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Droits d'administration</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          {field.value ? "Administrateur" : "Utilisateur standard"}
                        </div>
                      </div>
                      <FormControl>
                        <Select
                          onValueChange={(value) => field.onChange(value === "true")}
                          defaultValue={field.value ? "true" : "false"}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Droits" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true">Administrateur</SelectItem>
                            <SelectItem value="false">Standard</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={handleCancel}>
                    Annuler
                  </Button>
                  <Button type="submit" disabled={updateProfileMutation.isPending}>
                    {updateProfileMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Enregistrer
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default EditUserProfile;