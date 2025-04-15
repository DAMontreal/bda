import { useState } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { disciplines } from "@/lib/utils";

interface ProfileFormProps {
  user: User;
}

// Schema for updating profile
const profileSchema = z.object({
  firstName: z.string().min(1, "Le prénom est requis"),
  lastName: z.string().min(1, "Le nom est requis"),
  bio: z.string().optional(),
  discipline: z.string().optional(),
  location: z.string().optional(),
  website: z.string().url("Veuillez entrer une URL valide").optional().or(z.literal("")),
  profileImage: z.string().url("Veuillez entrer une URL valide").optional().or(z.literal("")),
  cv: z.string().url("Veuillez entrer une URL valide").optional().or(z.literal("")),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const ProfileForm = ({ user }: ProfileFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Initialize the form with current user data
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user.firstName,
      lastName: user.lastName,
      bio: user.bio || "",
      discipline: user.discipline || "",
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
                <FormLabel>Discipline artistique</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  value={field.value} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez votre discipline" />
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
          name="profileImage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL de la photo de profil</FormLabel>
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
          <Button type="submit" className="bg-[#FF5500]" disabled={isSubmitting}>
            {isSubmitting ? "Enregistrement..." : "Enregistrer les modifications"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default ProfileForm;
