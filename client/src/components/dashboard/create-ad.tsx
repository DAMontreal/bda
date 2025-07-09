import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { getTrocCategoryLabel, trocCategories } from "@/lib/utils";
import type { User } from "@shared/schema";

interface CreateAdProps {
  onSuccess?: () => void;
}

// Schema for TROC'DAM ads
const adSchema = z.object({
  title: z.string().min(1, "Le titre est requis"),
  description: z.string().min(1, "La description est requise"),
  category: z.string().min(1, "La catégorie est requise"),
  contactPreference: z.string().optional(),
  assignedUserId: z.string().optional(),
  image: z.any().optional(),
});

type AdFormValues = z.infer<typeof adSchema>;

const CreateAd = ({ onSuccess }: CreateAdProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();

  // Fetch users for admin assignment
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: isAdmin
  });

  // Initialize form
  const form = useForm<AdFormValues>({
    resolver: zodResolver(adSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      contactPreference: "message",
      assignedUserId: "",
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          variant: "destructive",
          title: "Erreur",
          description: "L'image ne doit pas dépasser 5 MB",
        });
        return;
      }
      
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  // Create ad mutation
  const createAdMutation = useMutation({
    mutationFn: async (data: AdFormValues) => {
      if (!user) throw new Error("Vous devez être connecté pour créer une annonce");
      
      // Prepare form data
      const formData = new FormData();
      formData.append("title", data.title);
      formData.append("description", data.description);
      formData.append("category", data.category);
      formData.append("userId", user.id.toString());
      
      if (data.assignedUserId) {
        formData.append("assignedUserId", data.assignedUserId);
      }
      
      if (selectedImage) {
        formData.append("images", selectedImage);
      }
      
      console.log('Envoi de la requête avec formData:', {
        title: data.title,
        hasImage: !!selectedImage,
        imageSize: selectedImage?.size,
        imageName: selectedImage?.name
      });

      const response = await fetch("/api/troc", {
        method: "POST",
        body: formData,
        credentials: "include", // Important pour les sessions
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Erreur lors de la création de l'annonce");
      }
      
      return response.json();
    },
    onSuccess: async () => {
      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ["/api/troc"] });
      
      toast({
        title: "Annonce créée",
        description: "Votre annonce a été publiée avec succès",
      });
      
      // Reset form and image
      form.reset({
        title: "",
        description: "",
        category: "",
        contactPreference: "message",
      });
      
      setSelectedImage(null);
      setImagePreview(null);
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

        {/* Admin User Assignment */}
        {isAdmin && (
          <FormField
            control={form.control}
            name="assignedUserId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Attribuer à un membre</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez un membre (optionnel)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Aucune attribution (moi-même)</SelectItem>
                    {users.filter(u => u.isApproved).map(user => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.firstName} {user.lastName} (@{user.username})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  En tant qu'administrateur, vous pouvez créer une annonce au nom d'un autre membre
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Image Upload */}
        <FormItem>
          <FormLabel>Image (optionnelle)</FormLabel>
          <FormControl>
            <div className="space-y-4">
              {!imagePreview ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-sm text-gray-500 mb-2">
                    Sélectionnez une image pour votre annonce
                  </p>
                  <p className="text-xs text-gray-400 mb-4">
                    PNG, JPG, JPEG jusqu'à 5MB
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    id="image-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('image-upload')?.click()}
                    className="bg-gray-100 hover:bg-gray-200"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Choisir une image
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Aperçu"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={removeImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </FormControl>
          <FormDescription>
            Ajoutez une image pour illustrer votre annonce (optionnel)
          </FormDescription>
        </FormItem>
        
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