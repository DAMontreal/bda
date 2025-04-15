import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { User } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { FaInstagram, FaFacebook, FaTwitter, FaYoutube, FaSpotify, FaBehance, FaLinkedin, FaGlobe } from "react-icons/fa";

interface SocialLinksProps {
  user: User;
}

// Schema for social media updates
const socialSchema = z.object({
  website: z.string().url("Veuillez entrer une URL valide").optional().or(z.literal("")),
  socialMedia: z.object({
    instagram: z.string().url("Veuillez entrer une URL valide").optional().or(z.literal("")),
    facebook: z.string().url("Veuillez entrer une URL valide").optional().or(z.literal("")),
    twitter: z.string().url("Veuillez entrer une URL valide").optional().or(z.literal("")),
    youtube: z.string().url("Veuillez entrer une URL valide").optional().or(z.literal("")),
    spotify: z.string().url("Veuillez entrer une URL valide").optional().or(z.literal("")),
    behance: z.string().url("Veuillez entrer une URL valide").optional().or(z.literal("")),
    linkedin: z.string().url("Veuillez entrer une URL valide").optional().or(z.literal("")),
    other: z.string().url("Veuillez entrer une URL valide").optional().or(z.literal("")),
  }),
});

type SocialFormValues = z.infer<typeof socialSchema>;

const SocialLinks = ({ user }: SocialLinksProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Fill default values
  const defaultSocialMedia = {
    instagram: "",
    facebook: "",
    twitter: "",
    youtube: "",
    spotify: "",
    behance: "",
    linkedin: "",
    other: "",
    ...user.socialMedia,
  };

  // Initialize form
  const form = useForm<SocialFormValues>({
    resolver: zodResolver(socialSchema),
    defaultValues: {
      website: user.website || "",
      socialMedia: defaultSocialMedia,
    },
  });

  // Update social links mutation
  const updateSocialMutation = useMutation({
    mutationFn: async (data: SocialFormValues) => {
      return apiRequest("PUT", `/api/users/${user.id}`, {
        website: data.website,
        socialMedia: data.socialMedia,
      });
    },
    onSuccess: async () => {
      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: [`/api/users/${user.id}`] });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      
      toast({
        title: "Liens mis à jour",
        description: "Vos réseaux sociaux ont été mis à jour avec succès",
      });
      
      setIsSubmitting(false);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de la mise à jour de vos réseaux sociaux",
      });
      
      setIsSubmitting(false);
    },
  });

  const onSubmit = async (data: SocialFormValues) => {
    setIsSubmitting(true);
    await updateSocialMutation.mutateAsync(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="website"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Site web personnel</FormLabel>
              <div className="flex">
                <div className="p-2 bg-gray-100 border border-r-0 border-gray-300 rounded-l-md flex items-center">
                  <FaGlobe className="h-5 w-5 text-gray-500" />
                </div>
                <FormControl>
                  <Input 
                    placeholder="https://www.votresite.com" 
                    {...field} 
                    className="rounded-l-none"
                  />
                </FormControl>
              </div>
              <FormDescription>
                Votre site web personnel ou portfolio en ligne
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <h3 className="text-lg font-semibold mt-8 mb-4">Réseaux sociaux</h3>
        
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="socialMedia.instagram"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Instagram</FormLabel>
                <div className="flex">
                  <div className="p-2 bg-gray-100 border border-r-0 border-gray-300 rounded-l-md flex items-center">
                    <FaInstagram className="h-5 w-5 text-gray-500" />
                  </div>
                  <FormControl>
                    <Input 
                      placeholder="https://www.instagram.com/username" 
                      {...field} 
                      className="rounded-l-none"
                    />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="socialMedia.facebook"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Facebook</FormLabel>
                <div className="flex">
                  <div className="p-2 bg-gray-100 border border-r-0 border-gray-300 rounded-l-md flex items-center">
                    <FaFacebook className="h-5 w-5 text-gray-500" />
                  </div>
                  <FormControl>
                    <Input 
                      placeholder="https://www.facebook.com/username" 
                      {...field} 
                      className="rounded-l-none"
                    />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="socialMedia.twitter"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Twitter</FormLabel>
                <div className="flex">
                  <div className="p-2 bg-gray-100 border border-r-0 border-gray-300 rounded-l-md flex items-center">
                    <FaTwitter className="h-5 w-5 text-gray-500" />
                  </div>
                  <FormControl>
                    <Input 
                      placeholder="https://twitter.com/username" 
                      {...field} 
                      className="rounded-l-none"
                    />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="socialMedia.youtube"
            render={({ field }) => (
              <FormItem>
                <FormLabel>YouTube</FormLabel>
                <div className="flex">
                  <div className="p-2 bg-gray-100 border border-r-0 border-gray-300 rounded-l-md flex items-center">
                    <FaYoutube className="h-5 w-5 text-gray-500" />
                  </div>
                  <FormControl>
                    <Input 
                      placeholder="https://www.youtube.com/channel/..." 
                      {...field} 
                      className="rounded-l-none"
                    />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="socialMedia.spotify"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Spotify</FormLabel>
                <div className="flex">
                  <div className="p-2 bg-gray-100 border border-r-0 border-gray-300 rounded-l-md flex items-center">
                    <FaSpotify className="h-5 w-5 text-gray-500" />
                  </div>
                  <FormControl>
                    <Input 
                      placeholder="https://open.spotify.com/artist/..." 
                      {...field} 
                      className="rounded-l-none"
                    />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="socialMedia.behance"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Behance</FormLabel>
                <div className="flex">
                  <div className="p-2 bg-gray-100 border border-r-0 border-gray-300 rounded-l-md flex items-center">
                    <FaBehance className="h-5 w-5 text-gray-500" />
                  </div>
                  <FormControl>
                    <Input 
                      placeholder="https://www.behance.net/username" 
                      {...field} 
                      className="rounded-l-none"
                    />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="socialMedia.linkedin"
            render={({ field }) => (
              <FormItem>
                <FormLabel>LinkedIn</FormLabel>
                <div className="flex">
                  <div className="p-2 bg-gray-100 border border-r-0 border-gray-300 rounded-l-md flex items-center">
                    <FaLinkedin className="h-5 w-5 text-gray-500" />
                  </div>
                  <FormControl>
                    <Input 
                      placeholder="https://www.linkedin.com/in/username" 
                      {...field} 
                      className="rounded-l-none"
                    />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="socialMedia.other"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Autre lien</FormLabel>
                <FormControl>
                  <Input placeholder="https://..." {...field} />
                </FormControl>
                <FormDescription>
                  Tout autre lien pertinent pour votre profil d'artiste
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="flex justify-end pt-4">
          <Button type="submit" className="bg-[#FF5500]" disabled={isSubmitting}>
            {isSubmitting ? "Enregistrement..." : "Enregistrer les modifications"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default SocialLinks;
