import { z } from "zod";

// Schéma pour les annonces TROC avec support multi-images
export const multiImageTrocAdSchema = z.object({
  title: z.string().min(1, "Le titre est requis"),
  description: z.string().min(1, "La description est requise"), 
  category: z.string().min(1, "La catégorie est requise"),
  userId: z.number(),
  imageUrls: z.array(z.string().url()).optional(), // Array d'URLs d'images
});

export type MultiImageTrocAd = z.infer<typeof multiImageTrocAdSchema>;

// Helper pour convertir imageUrl string vers array et vice versa
export const ImageUrlHelpers = {
  // Convertir string "url1,url2,url3" vers array ["url1", "url2", "url3"]
  stringToArray: (imageUrl: string | null): string[] => {
    if (!imageUrl || imageUrl.trim() === '') return [];
    return imageUrl.split(',').map(url => url.trim()).filter(url => url.length > 0);
  },
  
  // Convertir array ["url1", "url2", "url3"] vers string "url1,url2,url3"
  arrayToString: (imageUrls: string[]): string => {
    return imageUrls.filter(url => url && url.trim().length > 0).join(',');
  },
  
  // Ajouter une nouvelle URL à un string existant
  addUrl: (existingImageUrl: string | null, newUrl: string): string => {
    const existing = ImageUrlHelpers.stringToArray(existingImageUrl);
    existing.push(newUrl);
    return ImageUrlHelpers.arrayToString(existing);
  },
  
  // Supprimer une URL d'un string existant
  removeUrl: (existingImageUrl: string | null, urlToRemove: string): string => {
    const existing = ImageUrlHelpers.stringToArray(existingImageUrl);
    const filtered = existing.filter(url => url !== urlToRemove);
    return ImageUrlHelpers.arrayToString(filtered);
  }
};