import { Request, Response } from "express";
import * as fileUpload from "express-fileupload";
import { uploadFile, StorageBucket } from "../../supabase";
import { v4 as uuidv4 } from "uuid";
import * as fs from "fs";

export async function uploadTrocImage(req: Request, res: Response) {
  try {
    if (!req.files || (!req.files.file && !req.files.image)) {
      return res.status(400).json({ message: "Aucun fichier téléchargé" });
    }
    
    // Accepter soit 'file' (nouveau client) soit 'image' (ancien client) comme nom de paramètre
    const file = (req.files.file || req.files.image) as fileUpload.UploadedFile;
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({ 
        message: "Format de fichier non valide. Seuls JPEG, PNG, GIF et WebP sont acceptés." 
      });
    }
    
    const userId = req.session.userId!;
    
    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return res.status(400).json({
        message: "Fichier trop volumineux. Taille maximum: 5MB"
      });
    }
    
    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `troc-${uuidv4()}.${fileExt}`;
    const filePath = `troc-ads/${fileName}`;
    
    let fileUrl = "";
    
    try {
      // Utiliser le fichier temporaire au lieu de file.data
      const fileData = await fs.promises.readFile(file.tempFilePath);
      console.log(`Lecture du fichier temporaire (TROC): ${file.tempFilePath}, taille: ${fileData.length} bytes`);
      
      // Upload to Supabase
      fileUrl = await uploadFile(
        StorageBucket.MEDIA,
        filePath,
        fileData,
        file.mimetype
      );
      
      if (!fileUrl) {
        throw new Error("Échec du téléchargement du fichier");
      }
    } catch (uploadError: any) {
      console.error("Erreur lors de l'upload vers Supabase:", uploadError);
      
      // Si Supabase n'est pas configuré ou indisponible, utiliser un stockage fallback
      if (process.env.NODE_ENV === 'development' || process.env.ALLOW_FALLBACK_STORAGE === 'true') {
        console.log("Utilisation d'un stockage temporaire de secours pour l'image TROC");
        
        // En développement, on peut utiliser une URL de fallback
        // Generate a unique identifier for the placeholder
        const randomId = Math.floor(Math.random() * 1000);
        fileUrl = `https://placehold.co/600x400?text=TROC-${randomId}`;
        
        console.log("URL de fallback générée:", fileUrl);
      } else {
        // En production sans fallback configuré
        return res.status(500).json({ 
          message: "Erreur lors du téléchargement de l'image. Service de stockage non disponible."
        });
      }
    }
    
    res.status(200).json({ url: fileUrl });
  } catch (error) {
    console.error("Erreur lors de l'upload d'image TROC:", error);
    res.status(500).json({ message: "Erreur lors du téléchargement de l'image" });
  }
}