import { useState, useEffect } from 'react';

// Chemins des images par défaut
const bottinImage1 = '/default-profile-images/bottin1.jpg';
const bottinImage2 = '/default-profile-images/bottin2.jpg';
const bottinImage3 = '/default-profile-images/bottin3.jpg';
const bottinImage4 = '/default-profile-images/bottin4.jpg';

// Tableau des images par défaut
const defaultImages = [
  bottinImage1,
  bottinImage2,
  bottinImage3,
  bottinImage4
];

interface DefaultProfileImageProps {
  imageIndex?: number; // Index spécifique (0-3) ou aléatoire si non spécifié
  className?: string;
  alt?: string;
}

export function DefaultProfileImage({ 
  imageIndex, 
  className = "w-full h-full object-cover",
  alt = "Image de profil par défaut"
}: DefaultProfileImageProps) {
  // Si un index spécifique est fourni, l'utiliser, sinon générer un index aléatoire
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  
  useEffect(() => {
    if (imageIndex !== undefined && imageIndex >= 0 && imageIndex < defaultImages.length) {
      setSelectedImageIndex(imageIndex);
    } else {
      // Générer un index aléatoire entre 0 et 3
      const randomIndex = Math.floor(Math.random() * defaultImages.length);
      setSelectedImageIndex(randomIndex);
    }
  }, [imageIndex]);
  
  // Afficher l'image sélectionnée
  if (selectedImageIndex === null) {
    return null; // Rendu initial avant que l'effet ne soit exécuté
  }
  
  return (
    <img 
      src={defaultImages[selectedImageIndex]} 
      className={className} 
      alt={alt} 
    />
  );
}

/**
 * Obtient le nom de fichier d'une image par défaut basée sur l'index
 * @returns Nom de fichier (ex: "bottin1.jpg")
 */
export function getDefaultProfileImageFilename(imageIndex?: number): string {
  const index = imageIndex !== undefined ? 
    (imageIndex >= 0 && imageIndex < 4 ? imageIndex : Math.floor(Math.random() * 4)) : 
    Math.floor(Math.random() * 4);
  
  return `bottin${index + 1}.jpg`;
}