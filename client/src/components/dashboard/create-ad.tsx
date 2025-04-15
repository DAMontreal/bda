import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { getTrocCategoryLabel, trocCategories } from "@/lib/utils";

interface CreateAdProps {
  onSuccess?: () => void;
}

// Schema for TROC'DAM ads
const adSchema = z.object({
  title: z.string().min(1, "Le titre est requis"),
  description: z.string().min(1, "La description est requise"),
  category: z.string().min(1, "La catégorie est requise"),
  contactPreference: z.string().optional(),
});

type AdFormValues = z.infer<typeof adSchema>;

const CreateAd = ({ onSuccess }: CreateAdProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Initialize form
  const form = useForm<AdFormValues>({
    resolver: zodResolver(adSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      contactPreference: "message",
    },
  });

  // Create ad mutation
  const createAdMutation = useMutation({
    mutationFn: async (data: AdFormValues) => {
      if (!user) throw new Error("Vous devez être connecté pour créer une annonce");
      
      return apiRequest("POST", "/api/troc", {
        ...data,
        userId: user.id,
      });
    },
    onSuccess: async () => {
      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ["/api/troc"] });
      
      toast({
        title: "Annonce créée",
        description: "Votre annonce a été publiée avec succès",
      });
      
      // Reset form
      form.reset({
        title: "",
        description: "",
        category: "",
        contactPreference: "message",
      });
      
      setIsSubmitting(false);
      
      // Call success callback if provided
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de la création de l'annonce",
      });
      
      setIsSubmitting(false);
    },
  });

  const onSubmit = async (data: AdFormValues) => {
    setIsSubmitting(true);
    await createAdMutation.mutateAsync(data);
  };

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
                <Input placeholder="Titre de votre annonce" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Catégorie*</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez une catégorie" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {trocCategories.map(category => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Choisissez la catégorie qui correspond le mieux à votre annonce
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description*</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Décrivez votre offre ou demande en détail..." 
                  className="min-h-[150px]" 
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                Soyez précis dans la description pour augmenter vos chances de trouver ce que vous cherchez
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="contactPreference"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Préférence de contact</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Comment souhaitez-vous être contacté?" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="message">Message via la plateforme</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="both">Les deux</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Comment les autres artistes peuvent-ils vous contacter pour cette annonce?
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end pt-4">
          <Button type="submit" className="bg-[#FF5500]" disabled={isSubmitting}>
            {isSubmitting ? "Publication en cours..." : "Publier l'annonce"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default CreateAd;