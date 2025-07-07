import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { 
  insertUserSchema, 
  insertProfileMediaSchema, 
  insertEventSchema, 
  insertTrocAdSchema,
  insertMessageSchema
} from "@shared/schema";
import { StorageBucket, uploadFile, deleteFile } from "./supabase";
import fileUpload from "express-fileupload";
import * as fs from 'fs';
import { sendPasswordResetEmail } from "./email-service";

declare module "express-session" {
  interface SessionData {
    userId: number;
    isAdmin: boolean;
    passwordResetToken?: string;
    passwordResetEmail?: string;
    passwordResetExpiry?: Date;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Configuration des sessions avec une gestion robuste des erreurs
  console.log("Configuration des sessions...");
  
  let sessionConfig: session.SessionOptions = {
    // Secret de session (utiliser une variable d'environnement en production)
    secret: process.env.SESSION_SECRET || "bottin-dam-secret-dev-only",
    
    // Options de cookie
    cookie: { 
      secure: process.env.COOKIE_SECURE === "true",  // Dépend du proxy et HTTPS
      maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 jours
      sameSite: 'lax',                  // Protection CSRF basique
      path: '/',
    },
    
    // Autres options
    resave: false,
    saveUninitialized: false,
    name: "dam_session",
    
    // Par défaut, pas de store (utilise MemoryStore)
    store: undefined,
  };
  
  // En production, on utilise PostgreSQL pour le stockage des sessions
  if (process.env.NODE_ENV === "production") {
    try {
      console.log("Initialisation du stockage PostgreSQL pour les sessions...");
      const PostgreSqlStore = connectPg(session);
      
      // Table SQL pour les sessions PostgreSQL - en accord avec connect-pg-simple
      const sessionTableSchema = `
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" jsonb NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
      )`;
      
      try {
        // Créer la table de session si elle n'existe pas
        await pool.query(sessionTableSchema);
        console.log("Table de session vérifiée/créée avec succès");
      } catch (err) {
        console.error("Erreur lors de la création de la table de session:", err);
      }
      
      sessionConfig.store = new PostgreSqlStore({
        pool,
        tableName: 'session', // Utilise 'session' au lieu de 'sessions'
        createTableIfMissing: false, // On a déjà créé la table manuellement
        pruneSessionInterval: 60, // Nettoyer les sessions expirées toutes les 60 secondes
      });
      
      console.log("Stockage PostgreSQL pour les sessions configuré avec succès");
    } catch (error) {
      console.error("ERREUR lors de l'initialisation du stockage PostgreSQL des sessions:", error);
      console.warn("⚠️ Utilisation du stockage mémoire pour les sessions - NON RECOMMANDÉ EN PRODUCTION");
      
      // On reste avec MemoryStore par défaut, mais on log un avertissement
      if (process.env.NODE_ENV === "production") {
        console.warn("⚠️ AVERTISSEMENT: L'application utilise MemoryStore en production!");
        console.warn("⚠️ Cela peut causer des fuites de mémoire et des pertes de sessions lors des redémarrages.");
      }
    }
  } else {
    console.log("Mode développement: utilisation du stockage mémoire pour les sessions");
  }
  
  // Appliquer la configuration des sessions
  app.use(session(sessionConfig));

  // Auth middleware
  const requireAuth = (req: Request, res: Response, next: Function) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  const requireAdmin = (req: Request, res: Response, next: Function) => {
    if (!req.session.userId || !req.session.isAdmin) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };

  // Ajouter une route pour vérifier la configuration de session
  app.get("/api/health-check/session", (req, res) => {
    res.json({
      cookie: {
        secure: sessionConfig.cookie?.secure,
        sameSite: sessionConfig.cookie?.sameSite,
      },
      env: process.env.NODE_ENV,
      cookieSecureEnv: process.env.COOKIE_SECURE
    });
  });

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user with username or email already exists
      const existingUserByUsername = await storage.getUserByUsername(userData.username);
      if (existingUserByUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const existingUserByEmail = await storage.getUserByEmail(userData.email);
      if (existingUserByEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
      
      // Utiliser l'image par défaut fournie par le client ou en générer une
      let profileImagePath = `/default-profile-images/bottin${Math.floor(Math.random() * 4) + 1}.jpg`;
      
      // Si le client a envoyé un nom d'image spécifique, l'utiliser
      if (req.body.defaultProfileImage) {
        profileImagePath = `/default-profile-images/${req.body.defaultProfileImage}`;
      }
      
      // Create user with profile image
      const user = await storage.createUser({
        ...userData,
        profileImage: profileImagePath
      });
      
      // Don't return password
      const { password, ...userWithoutPassword } = user;
      
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Registration error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ 
        message: "Internal server error", 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      const user = await storage.getUserByUsername(username);
      
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      if (!user.isApproved) {
        return res.status(403).json({ message: "Your account is pending approval" });
      }
      
      // Set session
      req.session.userId = user.id;
      req.session.isAdmin = user.isAdmin || false;
      
      // Don't return password
      const { password: _, ...userWithoutPassword } = user;
      
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.status(200).json({ message: "Logout successful" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const user = await storage.getUser(req.session.userId);
      
      if (!user) {
        req.session.destroy(() => {});
        return res.status(401).json({ message: "User not found" });
      }
      
      // Don't return password
      const { password, ...userWithoutPassword } = user;
      
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Password reset request
  app.post("/api/auth/password-reset-request", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists or not for security
        return res.status(200).json({ message: "If this email exists, a reset link will be sent" });
      }

      // Generate a temporary reset token (in production, this should be more secure)
      const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const resetExpiry = new Date(Date.now() + 3600000); // 1 hour from now

      // Store token in session
      (req.session as any).passwordResetToken = resetToken;
      (req.session as any).passwordResetEmail = email;
      (req.session as any).passwordResetExpiry = resetExpiry;

      // Send email with reset token
      try {
        await sendPasswordResetEmail(user.email, user.firstName, resetToken);
        console.log(`Password reset email sent to ${email}`);
      } catch (emailError) {
        console.error(`Failed to send password reset email to ${email}:`, emailError);
        // Still continue with success response for security reasons
      }

      res.status(200).json({ 
        message: "If this email exists, a reset link will be sent"
      });
    } catch (error) {
      console.error("Error requesting password reset:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Password reset confirmation
  app.post("/api/auth/password-reset", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }

      // Verify token
      if ((req.session as any).passwordResetToken !== token || 
          !(req.session as any).passwordResetExpiry || 
          new Date() > new Date((req.session as any).passwordResetExpiry)) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      const email = (req.session as any).passwordResetEmail;
      if (!email) {
        return res.status(400).json({ message: "Invalid reset session" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Hash the new password
      const bcrypt = require('bcryptjs');
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update user password
      await storage.updateUser(user.id, { password: hashedPassword });

      // Clear reset session data
      delete (req.session as any).passwordResetToken;
      delete (req.session as any).passwordResetEmail;
      delete (req.session as any).passwordResetExpiry;

      res.status(200).json({ message: "Password reset successfully" });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // User routes
  app.get("/api/users", async (req, res) => {
    try {
      const approved = req.query.approved === "true";
      const users = await storage.getUsers({ isApproved: approved });
      
      // Don't return passwords
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      
      res.status(200).json(usersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Only return approved users unless it's the current user or an admin
      if (!user.isApproved && (!req.session.userId || (req.session.userId !== user.id && !req.session.isAdmin))) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't return password
      const { password, ...userWithoutPassword } = user;
      
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/users/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Users can only update their own profiles unless they're admins
      if (req.session.userId !== id && !req.session.isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't allow changing isAdmin status unless you're an admin
      if (req.body.isAdmin !== undefined && !req.session.isAdmin) {
        delete req.body.isAdmin;
      }
      
      // Don't allow changing isApproved status unless you're an admin
      if (req.body.isApproved !== undefined && !req.session.isAdmin) {
        delete req.body.isApproved;
      }
      
      const updatedUser = await storage.updateUser(id, req.body);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't return password
      const { password, ...userWithoutPassword } = updatedUser;
      
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Profile Media routes
  app.get("/api/users/:userId/media", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Only return media for approved users unless it's the current user or an admin
      if (!user.isApproved && (!req.session.userId || (req.session.userId !== userId && !req.session.isAdmin))) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const media = await storage.getProfileMedia(userId);
      
      res.status(200).json(media);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/users/:userId/media", requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Users can only add media to their own profiles
      if (req.session.userId !== userId && !req.session.isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const mediaData = insertProfileMediaSchema.parse({
        ...req.body,
        userId,
      });
      
      const media = await storage.createProfileMedia(mediaData);
      
      res.status(201).json(media);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/users/:userId/media/:mediaId", requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const mediaId = parseInt(req.params.mediaId);
      
      if (isNaN(userId) || isNaN(mediaId)) {
        return res.status(400).json({ message: "Invalid IDs" });
      }
      
      // Users can only delete their own media
      if (req.session.userId !== userId && !req.session.isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const success = await storage.deleteProfileMedia(mediaId);
      
      if (!success) {
        return res.status(404).json({ message: "Media not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // File Upload routes
  app.post("/api/upload/profile-image", requireAuth, async (req, res) => {
    try {
      if (!req.files || (!req.files.file && !req.files.image)) {
        return res.status(400).json({ message: "Aucun fichier téléchargé" });
      }
      
      // Vérifier si on met à jour l'image d'un autre utilisateur (admin uniquement)
      const targetUserId = req.query.userId ? parseInt(req.query.userId as string) : req.session.userId!;
      
      // Si on modifie un autre utilisateur, vérifier les permissions d'admin
      if (targetUserId !== req.session.userId && !req.session.isAdmin) {
        return res.status(403).json({ message: "Vous n'avez pas les droits pour modifier cet utilisateur" });
      }
      
      const user = await storage.getUser(targetUserId);
      
      if (!user) {
        return res.status(404).json({ message: "Utilisateur non trouvé" });
      }
      
      // Accepter soit 'file' (nouveau client) soit 'image' (ancien client) comme nom de paramètre
      const file = (req.files.file || req.files.image) as fileUpload.UploadedFile;
      
      // DEBUG: Vérifier les informations du fichier
      console.log('DEBUG UPLOAD: Détails du fichier:');
      console.log(`- Nom: ${file.name}`);
      console.log(`- MIME: ${file.mimetype}`);
      console.log(`- Taille: ${file.size} bytes`);
      console.log(`- Est-ce un Buffer?: ${Buffer.isBuffer(file.data)}`);
      console.log(`- Longueur du Buffer: ${file.data ? file.data.length : 'N/A'} bytes`);
      
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({ 
          message: "Format de fichier non valide. Seuls JPEG, PNG, GIF et WebP sont acceptés." 
        });
      }
      
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${uuidv4()}.${fileExt}`;
      const filePath = `profile-images/${fileName}`;
      
      let fileUrl = "";
      
      try {
        // Upload to Supabase
        // Utiliser le chemin tempFilePath au lieu de file.data puisque nous utilisons useTempFiles: true
        const fileData = await fs.promises.readFile(file.tempFilePath);
        console.log(`Lecture du fichier temporaire: ${file.tempFilePath}, taille: ${fileData.length} bytes`);
        
        fileUrl = await uploadFile(
          StorageBucket.PROFILES,
          filePath,
          fileData, // Utiliser le contenu lu du fichier temporaire
          file.mimetype
        );
        
        if (!fileUrl) {
          throw new Error("Échec du téléchargement du fichier");
        }
      } catch (uploadError: any) {
        console.error("Erreur lors de l'upload vers Supabase:", uploadError);
        
        // Si Supabase n'est pas configuré ou indisponible, utiliser un stockage fallback
        if (process.env.NODE_ENV === 'development' || process.env.ALLOW_FALLBACK_STORAGE === 'true') {
          console.log("Utilisation d'un stockage temporaire de secours");
          
          // En développement, on peut utiliser une URL de fallback
          // En production, si configuré, on pourrait utiliser un autre service comme AWS S3, GCS, etc.
          fileUrl = `https://placehold.co/600x400?text=Profile-${user.id}`;
          
          console.log("URL de fallback générée:", fileUrl);
        } else {
          // En production sans fallback configuré
          return res.status(500).json({ 
            message: "Erreur lors du téléchargement de l'image. Service de stockage non disponible."
          });
        }
      }
      
      // Update user profile with the file URL (real or fallback)
      const updatedUser = await storage.updateUser(targetUserId, { profileImage: fileUrl });
      
      res.status(200).json({ 
        url: fileUrl,
        user: updatedUser ? { ...updatedUser, password: undefined } : undefined
      });
    } catch (error) {
      console.error("Error uploading profile image:", error);
      res.status(500).json({ message: "Erreur interne du serveur" });
    }
  });
  
  app.post("/api/upload/media", requireAuth, async (req, res) => {
    try {
      if (!req.files || !req.files.file) {
        return res.status(400).json({ message: "Aucun fichier n'a été téléchargé" });
      }
      
      const { title, description, mediaType } = req.body;
      
      if (!title || !mediaType) {
        return res.status(400).json({ message: "Le titre et le type de média sont requis" });
      }
      
      const userId = req.session.userId!;
      
      const file = req.files.file as fileUpload.UploadedFile;
      
      // Validate file type based on mediaType
      let allowedTypes: string[] = [];
      let maxSize = 5 * 1024 * 1024; // 5MB default
      let bucket = StorageBucket.MEDIA;
      
      if (mediaType === 'image') {
        allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        maxSize = 5 * 1024 * 1024; // 5MB
      } else if (mediaType === 'video') {
        allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];
        maxSize = 50 * 1024 * 1024; // 50MB
      } else if (mediaType === 'audio') {
        allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg'];
        maxSize = 10 * 1024 * 1024; // 10MB
      } else {
        return res.status(400).json({ message: "Type de média invalide" });
      }
      
      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({ 
          message: `Type de fichier invalide pour ${mediaType}. Types acceptés: ${allowedTypes.join(', ')}` 
        });
      }
      
      // Check file size
      if (file.size > maxSize) {
        return res.status(400).json({
          message: `Fichier trop volumineux. Taille maximum: ${maxSize / (1024 * 1024)}MB`
        });
      }
      
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${uuidv4()}.${fileExt}`;
      const filePath = `${mediaType}s/${fileName}`;
      
      try {
        // Utiliser le fichier temporaire au lieu de file.data
        const fileData = await fs.promises.readFile(file.tempFilePath);
        console.log(`Lecture du fichier temporaire (média): ${file.tempFilePath}, taille: ${fileData.length} bytes`);
        
        // Upload to Supabase
        const fileUrl = await uploadFile(
          bucket,
          filePath,
          fileData,
          file.mimetype
        );
        
        if (!fileUrl) {
          throw new Error("Échec du téléchargement du fichier");
        }
        
        // Create media entry
        const mediaData = {
          userId,
          title,
          description: description || '',
          mediaType,
          url: fileUrl
        };
        
        const createdMedia = await storage.createProfileMedia(mediaData);
        
        res.status(201).json(createdMedia);
      } catch (uploadError: any) {
        console.error("Erreur lors du téléchargement sur Supabase:", uploadError);
        
        // Si Supabase n'est pas configuré ou indisponible, utiliser un stockage local temporaire
        if (uploadError.message.includes("bucket") || uploadError.message.includes("storage") || 
            uploadError.message.includes("Échec du téléchargement du fichier")) {
          console.log("Utilisation d'un stockage temporaire pour les tests");
          
          // Sauvegarder le fichier localement
          let fileUrl = "";
          
          // En mode test/dev, on peut utiliser une URL de base pour tester
          if (mediaType === 'image') {
            fileUrl = "https://placehold.co/600x400?text=Image";
          } else if (mediaType === 'audio') {
            fileUrl = "https://placehold.co/600x400?text=Audio";
          } else if (mediaType === 'video') {
            fileUrl = "https://placehold.co/600x400?text=Video";
          }
          
          const mediaData = {
            userId,
            title,
            description: description || '',
            mediaType,
            url: fileUrl
          };
          
          const createdMedia = await storage.createProfileMedia(mediaData);
          
          return res.status(201).json({
            ...createdMedia,
            _note: "Stockage temporaire utilisé pour les tests. Le fichier n'a pas été réellement téléchargé."
          });
        } else {
          throw uploadError;
        }
      }
    } catch (error: any) {
      console.error("Erreur lors du téléchargement du média:", error);
      res.status(500).json({ 
        message: error.message || "Erreur interne du serveur lors du téléchargement"
      });
    }
  });
  
  app.post("/api/upload/event-image", requireAuth, async (req, res) => {
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
      const fileName = `event-${uuidv4()}.${fileExt}`;
      const filePath = `events/${fileName}`;
      
      let fileUrl = "";
      
      try {
        // Utiliser le fichier temporaire au lieu de file.data
        const fileData = await fs.promises.readFile(file.tempFilePath);
        console.log(`Lecture du fichier temporaire (événement): ${file.tempFilePath}, taille: ${fileData.length} bytes`);
        
        // Upload to Supabase
        fileUrl = await uploadFile(
          StorageBucket.EVENTS,
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
          console.log("Utilisation d'un stockage temporaire de secours pour l'image d'événement");
          
          // En développement, on peut utiliser une URL de fallback
          // Generate a unique identifier for the placeholder
          const randomId = Math.floor(Math.random() * 1000);
          fileUrl = `https://placehold.co/600x400?text=Event-${randomId}`;
          
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
      console.error("Error uploading event image:", error);
      res.status(500).json({ message: "Erreur interne du serveur" });
    }
  });

  // Event routes
  app.get("/api/events", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const events = await storage.getEvents(limit);
      res.status(200).json(events);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/events/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }
      
      const event = await storage.getEvent(id);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      res.status(200).json(event);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/events", requireAuth, async (req, res) => {
    try {
      const eventData = insertEventSchema.parse(req.body);
      
      // Set organizer ID to current user if not provided
      if (!eventData.organizerId) {
        eventData.organizerId = req.session.userId;
      }
      
      // Only admins can create events for other users
      if (eventData.organizerId !== req.session.userId && !req.session.isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Convertir la chaîne ISO en objet Date si nécessaire
      if (typeof eventData.eventDate === 'string') {
        eventData.eventDate = new Date(eventData.eventDate);
      }
      
      const event = await storage.createEvent(eventData);
      
      res.status(201).json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      
      console.error('Erreur création événement:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/events/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }
      
      const event = await storage.getEvent(id);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Only the organizer or an admin can update an event
      if (event.organizerId !== req.session.userId && !req.session.isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Valider les données avec le schéma approprié
      const eventData = insertEventSchema.parse(req.body);
      
      // Convertir la chaîne ISO en objet Date si nécessaire
      const updateData = {
        ...eventData,
        eventDate: typeof eventData.eventDate === 'string' ? new Date(eventData.eventDate) : eventData.eventDate
      } as Partial<Event>;
      
      const updatedEvent = await storage.updateEvent(id, updateData);
      
      if (!updatedEvent) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      res.status(200).json(updatedEvent);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      
      console.error('Erreur mise à jour événement:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/events/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }
      
      const event = await storage.getEvent(id);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Only the organizer or an admin can delete an event
      if (event.organizerId !== req.session.userId && !req.session.isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const success = await storage.deleteEvent(id);
      
      if (!success) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // TROC'DAM Ad routes
  app.get("/api/troc", async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      
      const ads = await storage.getTrocAds({ category, limit });
      
      res.status(200).json(ads);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/troc/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ad ID" });
      }
      
      const ad = await storage.getTrocAd(id);
      
      if (!ad) {
        return res.status(404).json({ message: "Ad not found" });
      }
      
      res.status(200).json(ad);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/troc/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ad ID" });
      }
      
      const ad = await storage.getTrocAd(id);
      
      if (!ad) {
        return res.status(404).json({ message: "Ad not found" });
      }
      
      res.status(200).json(ad);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/troc", requireAuth, async (req, res) => {
    try {
      // Only approved users can create ads
      const user = await storage.getUser(req.session.userId!);
      
      if (!user || !user.isApproved) {
        return res.status(403).json({ message: "Only approved artists can create ads" });
      }
      
      const adData = insertTrocAdSchema.parse({
        ...req.body,
        userId: req.session.userId,
      });
      
      const ad = await storage.createTrocAd(adData);
      
      res.status(201).json(ad);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/troc/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ad ID" });
      }
      
      const ad = await storage.getTrocAd(id);
      
      if (!ad) {
        return res.status(404).json({ message: "Ad not found" });
      }
      
      // Only the creator or an admin can update an ad
      if (ad.userId !== req.session.userId && !req.session.isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const updatedAd = await storage.updateTrocAd(id, req.body);
      
      if (!updatedAd) {
        return res.status(404).json({ message: "Ad not found" });
      }
      
      res.status(200).json(updatedAd);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/troc/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ad ID" });
      }
      
      const ad = await storage.getTrocAd(id);
      
      if (!ad) {
        return res.status(404).json({ message: "Ad not found" });
      }
      
      // Only the creator or an admin can delete an ad
      if (ad.userId !== req.session.userId && !req.session.isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const success = await storage.deleteTrocAd(id);
      
      if (!success) {
        return res.status(404).json({ message: "Ad not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Message routes
  app.get("/api/messages", requireAuth, async (req, res) => {
    try {
      const messages = await storage.getMessages(req.session.userId!);
      
      res.status(200).json(messages);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Route spécifique pour les conversations entre deux utilisateurs
  app.get("/api/messages/conversation/:user1Id/:user2Id", requireAuth, async (req, res) => {
    try {
      const user1Id = parseInt(req.params.user1Id);
      const user2Id = parseInt(req.params.user2Id);
      
      if (isNaN(user1Id) || isNaN(user2Id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Vérification de sécurité : l'utilisateur demandant les messages doit être l'un des deux participants
      if (req.session.userId !== user1Id && req.session.userId !== user2Id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const conversation = await storage.getConversation(user1Id, user2Id);
      
      res.status(200).json(conversation);
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Route pour obtenir tous les messages de l'utilisateur actuel
  app.get("/api/messages", requireAuth, async (req, res) => {
    try {
      const messages = await storage.getMessages(req.session.userId);
      res.status(200).json(messages);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/messages/:userId", requireAuth, async (req, res) => {
    try {
      const otherUserId = parseInt(req.params.userId);
      
      if (isNaN(otherUserId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const conversation = await storage.getConversation(req.session.userId, otherUserId);
      
      res.status(200).json(conversation);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.post("/api/messages", requireAuth, async (req, res) => {
    try {
      const messageData = insertMessageSchema.parse({
        ...req.body,
        senderId: req.session.userId,
      });
      
      // Verify the receiver exists and is approved
      const receiver = await storage.getUser(messageData.receiverId);
      
      if (!receiver || !receiver.isApproved) {
        return res.status(404).json({ message: "Recipient not found" });
      }
      
      const message = await storage.createMessage(messageData);
      
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/messages/:id/read", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid message ID" });
      }
      
      const message = await storage.getMessage(id);
      
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }
      
      // Only the receiver can mark a message as read
      if (message.receiverId !== req.session.userId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const success = await storage.markMessageAsRead(id);
      
      if (!success) {
        return res.status(404).json({ message: "Message not found" });
      }
      
      res.status(200).json({ message: "Message marked as read" });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Admin routes
  app.get("/api/admin/pending-users", requireAdmin, async (req, res) => {
    try {
      const pendingUsers = await storage.getUsers({ isApproved: false });
      
      // Don't return passwords
      const usersWithoutPasswords = pendingUsers.map(({ password, ...user }) => user);
      
      res.status(200).json(usersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Analytics API
  app.get("/api/admin/analytics", requireAdmin, async (req, res) => {
    try {
      // Get counts of various entities
      const users = await storage.getUsers();
      const approvedUsers = users.filter(user => user.isApproved);
      const pendingUsers = users.filter(user => !user.isApproved);
      const events = await storage.getEvents();
      const trocAds = await storage.getTrocAds();
      
      // Count users by discipline
      const usersByDiscipline: Record<string, number> = {};
      approvedUsers.forEach(user => {
        if (user.discipline) {
          usersByDiscipline[user.discipline] = (usersByDiscipline[user.discipline] || 0) + 1;
        }
      });
      
      // Count users by location
      const usersByLocation: Record<string, number> = {};
      approvedUsers.forEach(user => {
        if (user.location) {
          usersByLocation[user.location] = (usersByLocation[user.location] || 0) + 1;
        }
      });
      
      // Count ads by category
      const adsByCategory: Record<string, number> = {};
      trocAds.forEach(ad => {
        adsByCategory[ad.category] = (adsByCategory[ad.category] || 0) + 1;
      });
      
      // Recent activities (last 10 users, events, and ads)
      const recentUsers = [...approvedUsers]
        .sort((a, b) => new Date(b.createdAt || new Date()).getTime() - new Date(a.createdAt || new Date()).getTime())
        .slice(0, 10)
        .map(({ password, ...user }) => user);
        
      const recentEvents = [...events]
        .sort((a, b) => new Date(b.createdAt || new Date()).getTime() - new Date(a.createdAt || new Date()).getTime())
        .slice(0, 10);
        
      const recentAds = [...trocAds]
        .sort((a, b) => new Date(b.createdAt || new Date()).getTime() - new Date(a.createdAt || new Date()).getTime())
        .slice(0, 10);
      
      // Return analytics data
      res.json({
        counts: {
          totalUsers: users.length,
          approvedUsers: approvedUsers.length,
          pendingUsers: pendingUsers.length,
          events: events.length,
          trocAds: trocAds.length
        },
        distribution: {
          usersByDiscipline,
          usersByLocation,
          adsByCategory
        },
        recent: {
          users: recentUsers,
          events: recentEvents,
          ads: recentAds
        }
      });
    } catch (error) {
      console.error('Analytics error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/admin/users/:id/approve", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const updatedUser = await storage.updateUser(id, { isApproved: true });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't return password
      const { password, ...userWithoutPassword } = updatedUser;
      
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Health check endpoint for Koyeb
  app.get("/health", (req, res) => {
    res.status(200).send("OK");
  });

  // Create HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
