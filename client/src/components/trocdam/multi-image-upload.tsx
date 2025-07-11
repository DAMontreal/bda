import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Upload, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MultiImageUploadProps {
  onImagesChange: (images: File[]) => void;
  currentImages?: string[];
  onRemoveCurrentImage?: (imageUrl: string) => void;
  maxImages?: number;
  className?: string;
}

export const MultiImageUpload = ({ 
  onImagesChange, 
  currentImages = [], 
  onRemoveCurrentImage,
  maxImages = 5,
  className = "" 
}: MultiImageUploadProps) => {
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const { toast } = useToast();

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    // Vérifier la limite d'images
    const totalImages = currentImages.length + selectedImages.length + imageFiles.length;
    if (totalImages > maxImages) {
      toast({
        title: "Limite d'images atteinte",
        description: `Vous pouvez uploader maximum ${maxImages} images au total`,
        variant: "destructive",
      });
      return;
    }

    // Vérifier la taille des fichiers (max 5MB par image)
    const maxSize = 5 * 1024 * 1024; // 5MB
    const oversizedFiles = imageFiles.filter(file => file.size > maxSize);
    if (oversizedFiles.length > 0) {
      toast({
        title: "Fichiers trop volumineux",
        description: "Chaque image doit faire moins de 5MB",
        variant: "destructive",
      });
      return;
    }

    const newImages = [...selectedImages, ...imageFiles];
    setSelectedImages(newImages);
    onImagesChange(newImages);

    // Créer les URLs de prévisualisation
    const newPreviewUrls = [...previewUrls];
    imageFiles.forEach(file => {
      const url = URL.createObjectURL(file);
      newPreviewUrls.push(url);
    });
    setPreviewUrls(newPreviewUrls);
  };

  const removeSelectedImage = (index: number) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    setSelectedImages(newImages);
    onImagesChange(newImages);

    // Nettoyer les URLs de prévisualisation
    if (previewUrls[index]) {
      URL.revokeObjectURL(previewUrls[index]);
    }
    const newPreviewUrls = previewUrls.filter((_, i) => i !== index);
    setPreviewUrls(newPreviewUrls);
  };

  const removeCurrentImage = (imageUrl: string) => {
    if (onRemoveCurrentImage) {
      onRemoveCurrentImage(imageUrl);
    }
  };

  const totalCurrentImages = currentImages.length + selectedImages.length;
  const canAddMore = totalCurrentImages < maxImages;

  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <Label htmlFor="images" className="text-sm font-medium">
          Images ({totalCurrentImages}/{maxImages})
        </Label>
        <p className="text-sm text-gray-600 mb-2">
          Ajoutez jusqu'à {maxImages} images pour votre annonce. Format accepté: JPEG, PNG, WebP (max 5MB chacune)
        </p>

        {/* Images actuelles */}
        {currentImages.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2">Images actuelles :</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {currentImages.map((imageUrl, index) => (
                <div key={index} className="relative">
                  <div 
                    className="aspect-video bg-cover bg-center rounded-lg border-2 border-gray-200"
                    style={{ backgroundImage: `url('${imageUrl}')` }}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                    onClick={() => removeCurrentImage(imageUrl)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Images nouvellement sélectionnées */}
        {selectedImages.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2">Nouvelles images à ajouter :</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {previewUrls.map((url, index) => (
                <div key={index} className="relative">
                  <img
                    src={url}
                    alt={`Aperçu ${index + 1}`}
                    className="aspect-video object-cover rounded-lg border-2 border-gray-200 w-full"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                    onClick={() => removeSelectedImage(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bouton d'upload */}
        {canAddMore && (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <Input
              id="images"
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            <Label 
              htmlFor="images" 
              className="cursor-pointer flex flex-col items-center space-y-2"
            >
              <Upload className="h-8 w-8 text-gray-400" />
              <span className="text-sm font-medium text-gray-600">
                Cliquer pour ajouter des images
              </span>
              <span className="text-xs text-gray-500">
                ou glisser-déposer ici
              </span>
            </Label>
          </div>
        )}

        {!canAddMore && (
          <div className="border-2 border-gray-200 rounded-lg p-4 text-center bg-gray-50">
            <span className="text-sm text-gray-600">
              Limite de {maxImages} images atteinte
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiImageUpload;