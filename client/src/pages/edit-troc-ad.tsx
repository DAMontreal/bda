import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTrocAdSchema, TrocAd } from "@shared/schema";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, Save } from "lucide-react";
import { trocCategories } from "@/lib/utils";
import { useEffect } from "react";

const editTrocAdSchema = insertTrocAdSchema.omit({ userId: true }).extend({
  id: z.number(),
});

type EditTrocAdForm = z.infer<typeof editTrocAdSchema>;

export default function EditTrocAdPage() {
  const [, params] = useRoute("/troc/:id/edit");
  const [, setLocation] = useLocation();
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  const adId = params?.id ? parseInt(params.id) : null;

  // Redirect if not admin
  useEffect(() => {
    if (!isAdmin) {
      setLocation("/");
    }
  }, [isAdmin, setLocation]);

  // Fetch the ad data
  const { data: ad, isLoading } = useQuery<TrocAd>({
    queryKey: [`/api/troc/${adId}`],
    enabled: !!adId,
  });

  const form = useForm<EditTrocAdForm>({
    resolver: zodResolver(editTrocAdSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
    },
  });

  // Update form when ad data is loaded
  useEffect(() => {
    if (ad) {
      form.reset({
        id: ad.id,
        title: ad.title,
        description: ad.description,
        category: ad.category,
      });
    }
  }, [ad, form]);

  const updateAdMutation = useMutation({
    mutationFn: async (data: EditTrocAdForm) => {
      const response = await apiRequest('PUT', `/api/troc/${data.id}`, {
        title: data.title,
        description: data.description,
        category: data.category,
      });
      if (!response.ok) {
        throw new Error('Échec de la modification');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/troc'] });
      queryClient.invalidateQueries({ queryKey: [`/api/troc/${adId}`] });
      toast({
        title: "Annonce modifiée",
        description: "L'annonce a été modifiée avec succès.",
      });
      setLocation("/trocdam");
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de modifier l'annonce.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditTrocAdForm) => {
    updateAdMutation.mutate(data);
  };

  if (!isAdmin) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!ad) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Annonce non trouvée</p>
          <Button onClick={() => setLocation("/trocdam")} className="mt-4">
            Retour
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/trocdam")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">Modifier l'annonce</h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-orange-600">Modification de l'annonce</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div>
                  <Label htmlFor="title">Titre *</Label>
                  <Input
                    id="title"
                    {...form.register("title")}
                    placeholder="Ex: Recherche partenaire pour spectacle"
                  />
                  {form.formState.errors.title && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.title.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="category">Catégorie *</Label>
                  <Select
                    value={form.watch("category")}
                    onValueChange={(value) => form.setValue("category", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez une catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      {trocCategories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.category && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.category.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    {...form.register("description")}
                    placeholder="Décrivez votre annonce en détail..."
                    rows={5}
                  />
                  {form.formState.errors.description && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.description.message}
                    </p>
                  )}
                </div>

                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation("/trocdam")}
                    className="flex-1"
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateAdMutation.isPending}
                    className="flex-1 bg-orange-600 hover:bg-orange-700 flex items-center gap-2"
                  >
                    {updateAdMutation.isPending ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Enregistrer
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}