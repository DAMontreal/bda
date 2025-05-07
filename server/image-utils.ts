import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

// Dimensions pour le redimensionnement
const PROFILE_WIDTH = 300; // largeur max pour les photos de profil
const FEATURED_WIDTH = 500; // largeur max pour les artistes en vedette

/**
 * Redimensionne une image pour l'adapter à la taille requise
 * @param buffer Buffer de l'image
 * @param maxWidth Largeur maximale
 * @param quality Qualité de l'image (1-100)
 * @returns Buffer de l'image redimensionnée
 */
export async function resizeImage(
  buffer: Buffer,
  maxWidth: number = PROFILE_WIDTH,
  quality: number = 80
): Promise<Buffer> {
  try {
    // Obtenir les métadonnées de l'image
    const metadata = await sharp(buffer).metadata();
    
    // Ne redimensionner que si l'image est plus large que maxWidth
    if (metadata.width && metadata.width > maxWidth) {
      return await sharp(buffer)
        .resize(maxWidth)
        .jpeg({ quality })
        .toBuffer();
    }
    
    // Sinon, optimiser l'image sans redimensionnement
    return await sharp(buffer)
      .jpeg({ quality })
      .toBuffer();
  } catch (error) {
    console.error('Erreur lors du redimensionnement de l\'image:', error);
    // En cas d'erreur, retourner l'image originale
    return buffer;
  }
}

/**
 * Redimensionne une image de profil
 */
export async function resizeProfileImage(buffer: Buffer): Promise<Buffer> {
  return resizeImage(buffer, PROFILE_WIDTH);
}

/**
 * Redimensionne une image pour les artistes en vedette
 */
export async function resizeFeaturedImage(buffer: Buffer): Promise<Buffer> {
  return resizeImage(buffer, FEATURED_WIDTH);
}

/**
 * Enregistre une image temporaire sur le disque
 * @param buffer Buffer de l'image
 * @returns Chemin du fichier temporaire
 */
export async function saveTempImage(buffer: Buffer): Promise<string> {
  const tempDir = path.join(process.cwd(), 'temp');
  
  // Créer le répertoire temp s'il n'existe pas
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const tempFilePath = path.join(tempDir, `${randomUUID()}.jpg`);
  fs.writeFileSync(tempFilePath, buffer);
  return tempFilePath;
}

/**
 * Supprime un fichier temporaire
 */
export function removeTempImage(tempFilePath: string): void {
  try {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  } catch (error) {
    console.error('Erreur lors de la suppression du fichier temporaire:', error);
  }
}

/**
 * Obtient le nom de fichier aléatoire pour une image de profil par défaut
 * @returns Chemin relatif vers l'image de profil par défaut
 */
export function getRandomDefaultProfileImage(): string {
  const imageNumber = Math.floor(Math.random() * 4) + 1; // 1-4
  return `bottin${imageNumber}.jpg`;
}