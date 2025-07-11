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

// Schema for TROC'DAM ads - Updated 2025-07-10 to fix empty fields issue
const adSchema = z.object({
  title: z.string().min(1, "Le titre est requis"),
  description: z.string().min(1, "La description est requise"),
  category: z.string().min(1, "La catégorie est requise"),
  contactPreference: z.string().optional(),
  assignedUserId: z.string().optional(),
  imageUrl: z.string().optional(),
});

type AdFormValues = z.infer<typeof adSchema>;

const CreateAd = ({ onSuccess }: CreateAdProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();

  // Fetch users for admin assignment - only if admin and authenticated
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: isAdmin && !!user,
    retry: false, // Ne pas réessayer si échec d'authentification
    staleTime: 5 * 60 * 1000, // Cache 5 minutes
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
      imageUrl: "",
    },
  });

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      
      // Prévisualisation immédiate
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      // Upload automatique de l'image
      setIsUploading(true);
      try {
        await uploadImageMutation.mutateAsync(file);
      } catch (error) {
        console.error("Erreur lors du téléchargement:", error);
      }
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    form.setValue("imageUrl", "");
  };

  // Upload image mutation
  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload/troc-image', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      form.setValue('imageUrl', data.url);
      setImagePreview(data.url);
      
      toast({
        title: "Image téléchargée",
        description: "L'image a été téléchargée avec succès"
      });
      
      setSelectedImage(null);
      setIsUploading(false);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Erreur lors du téléchargement de l'image"
      });
      setIsUploading(false);
    },
  });

  // Create ad mutation
  const createAdMutation = useMutation({
    mutationFn: async (data: AdFormValues) => {
      if (!user) throw new Error("Vous devez être connecté pour créer une annonce");
      
      // Préparer les données en nettoyant les champs vides
      const payload: any = {
        title: data.title,
        description: data.description,
        category: data.category,
      };
      
      // Ajouter imageUrl seulement si fourni
      if (data.imageUrl && data.imageUrl.trim() !== '') {
        payload.imageUrl = data.imageUrl;
      }
      
      // Ajouter assignedUserId seulement si fourni
      if (data.assignedUserId && data.assignedUserId !== "none") {
        payload.assignedUserId = parseInt(data.assignedUserId);
      }
      
      console.log('Envoi des données:', payload);
      const response = await apiRequest("POST", "/api/troc", payload);
      
      // Vérifier que la réponse a du contenu avant de parser JSON
      const text = await response.text();
      console.log('Réponse brute:', text);
      
      if (!text || text.trim() === '') {
        throw new Error('Réponse vide du serveur');
      }
      
      try {
        return JSON.parse(text);
      } catch (error) {
        console.error('Erreur parsing JSON:', error);
        console.error('Contenu reçu:', text);
        throw new Error(`Erreur de format de réponse: ${text.substring(0, 100)}`);
      }
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
        imageUrl: "",
      });
      
      setSelectedImage(null);
      setImagePreview(null);
      setIsSubmitting(false);
      
      // Call success callback if provided
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      console.error('Erreur complète:', error);
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
              {/* Image Preview */}
              <div className="h-48 w-full rounded-lg border border-gray-200 overflow-hidden">
                {imagePreview ? (
                  <img src={imagePreview} alt="Aperçu de l'annonce" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-gray-100">
                    <Upload size={48} className="text-gray-400" />
                  </div>
                )}
              </div>
              
              {/* Upload Controls */}
              <div className="flex gap-2">
                <div className="flex-1">
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
                    className="w-full"
                    disabled={isUploading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {isUploading ? "Upload en cours..." : imagePreview ? "Changer l'image" : "Choisir une image"}
                  </Button>
                </div>
                
                {imagePreview && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={removeImage}
                    disabled={isUploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              <p className="text-xs text-gray-500">
                Formats acceptés: JPG, PNG, GIF, WebP (max 5 MB)<br />
                L'image sera automatiquement uploadée dès que vous la sélectionnez
              </p>
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