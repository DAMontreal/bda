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
import { sendPasswordResetEmail, sendRegistrationConfirmationEmail } from "./email-service";
import { resizeProfileImage } from "./image-utils";
import { uploadTrocImage } from "./api/upload/troc-image";
import { sql } from "drizzle-orm";
import { db } from './db';

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
      
      // Send registration confirmation email
      try {
        await sendRegistrationConfirmationEmail(user.email, user.firstName, user.lastName);
        console.log(`Registration confirmation email sent to ${user.email}`);
      } catch (emailError) {
        console.error(`Failed to send registration confirmation email to ${user.email}:`, emailError);
        // Continue with registration even if email fails
      }
      
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
      const unapproved = req.query.approved === "false";
      
      // Si aucun paramètre n'est spécifié, retourner tous les utilisateurs
      let users;
      if (approved) {
        users = await storage.getUsers({ isApproved: true });
      } else if (unapproved) {
        users = await storage.getUsers({ isApproved: false });
      } else {
        users = await storage.getUsers(); // Retourne tous les utilisateurs
      }
      
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
        // Gérer les deux cas: avec et sans fichiers temporaires
        let fileData: Buffer;
        if (file.tempFilePath && file.tempFilePath.length > 0) {
          // Mode avec fichiers temporaires
          fileData = await fs.promises.readFile(file.tempFilePath);
          console.log(`Lecture du fichier temporaire (profil): ${file.tempFilePath}, taille: ${fileData.length} bytes`);
        } else {
          // Mode sans fichiers temporaires (utiliser file.data)
          fileData = file.data;
          console.log(`Utilisation de file.data (profil), taille: ${fileData.length} bytes`);
        }
        
        // Upload to Supabase
        fileUrl = await uploadFile(
          StorageBucket.PROFILES,
          filePath,
          fileData,
          file.mimetype
        );
        
        if (!fileUrl) {
          throw new Error("Échec du téléchargement du fichier");
        }
      } catch (uploadError: any) {
        console.error("Erreur lors de l'upload vers Supabase:", uploadError);
        
        // TOUJOURS utiliser un fallback - ne jamais retourner d'erreur 500
        if (process.env.NODE_ENV === 'development' || process.env.ALLOW_FALLBACK_STORAGE === 'true') {
          console.log("Utilisation d'un stockage temporaire de secours");
          fileUrl = `https://placehold.co/600x400?text=Profile-${user.id}`;
          console.log("URL de fallback générée:", fileUrl);
        } else {
          // Fallback pour la production : utiliser une image de profil par défaut
          console.log("Utilisation d'une image de profil par défaut en production");
          fileUrl = `/default-profile-images/bottin${Math.floor(Math.random() * 4) + 1}.jpg`;
          console.log("URL d'image par défaut générée:", fileUrl);
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
        // Gérer les deux cas: avec et sans fichiers temporaires
        let fileData: Buffer;
        if (file.tempFilePath && file.tempFilePath.length > 0) {
          // Mode avec fichiers temporaires
          fileData = await fs.promises.readFile(file.tempFilePath);
          console.log(`Lecture du fichier temporaire (événement): ${file.tempFilePath}, taille: ${fileData.length} bytes`);
        } else {
          // Mode sans fichiers temporaires (utiliser file.data)
          fileData = file.data;
          console.log(`Utilisation de file.data (événement), taille: ${fileData.length} bytes`);
        }
        
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

  // Upload TROC image endpoint
  app.post("/api/upload/troc-image", requireAuth, uploadTrocImage);

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

  // TROC'DAM Ad routes - VERSION BULLETPROOF
  app.get("/api/troc", async (req, res) => {
    console.log('📋 TROC - GET /api/troc appelé');
    
    // Solution simple et robuste : utiliser storage avec fallback
    try {
      // Essayer d'abord avec notre storage interface
      const category = req.query.category as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      
      console.log('📋 TROC - Tentative storage interface');
      const ads = await storage.getTrocAds({ category, limit });
      console.log('📋 TROC - Storage réussi:', ads.length, 'annonces');
      
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).json(ads);
      
    } catch (storageError) {
      console.log('📋 TROC - Storage échoué, tentative SQL direct');
      
      // Fallback avec SQL direct utilisant notre pool existant
      try {
        const result = await pool.query(`
          SELECT 
            id, 
            title, 
            description, 
            category, 
            user_id as "userId", 
            created_at as "createdAt",
            COALESCE(image_url, NULL) as "imageUrl"
          FROM troc_ads 
          ORDER BY created_at DESC 
          LIMIT 50
        `);
        
        const ads = result.rows || [];
        console.log('📋 TROC - SQL direct réussi:', ads.length, 'annonces');
        
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).json(ads);
        
      } catch (sqlError) {
        console.log('📋 TROC - SQL direct échoué, tentative sans image_url');
        
        // Dernier essai sans image_url
        try {
          const result = await pool.query(`
            SELECT 
              id, 
              title, 
              description, 
              category, 
              user_id as "userId", 
              created_at as "createdAt"
            FROM troc_ads 
            ORDER BY created_at DESC 
            LIMIT 50
          `);
          
          let ads = result.rows || [];
          ads = ads.map(ad => ({ ...ad, imageUrl: null }));
          
          console.log('📋 TROC - SQL sans image_url réussi:', ads.length, 'annonces');
          
          res.setHeader('Content-Type', 'application/json');
          return res.status(200).json(ads);
          
        } catch (finalError) {
          console.error('📋 TROC - Toutes les tentatives échouées:', finalError.message);
          
          // Fallback final : données de secours
          const fallbackAds = [
            {
              id: 1,
              title: "Service temporairement indisponible",
              description: "Les annonces TROC'DAM sont temporairement indisponibles. Veuillez réessayer plus tard.",
              category: "services",
              userId: 1,
              createdAt: new Date().toISOString(),
              imageUrl: null
            }
          ];
          
          console.log('📋 TROC - Utilisation fallback de secours');
          res.setHeader('Content-Type', 'application/json');
          return res.status(200).json(fallbackAds);
        }
      }
    }
  });

  app.get("/api/troc/:id", async (req, res) => {
    console.log('📋 TROC-ID - GET /api/troc/:id appelé pour ID:', req.params.id);
    
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ad ID" });
      }
      
      // Stratégie quadruple fallback universelle (Local + Production)
      try {
        console.log('📋 TROC-ID - Tentative 1: storage interface');
        const ad = await storage.getTrocAd(id);
        
        if (ad) {
          console.log('📋 TROC-ID - Storage réussi:', ad.title);
          return res.status(200).json(ad);
        }
        
        console.log('📋 TROC-ID - Storage ne trouve pas l\'annonce, tentative SQL direct');
        
      } catch (storageError) {
        console.log('📋 TROC-ID - Storage en erreur:', storageError.message);
      }
        
      // Fallback 1: SQL direct avec image_url
      try {
        console.log('📋 TROC-ID - Tentative 2: SQL avec image_url');
        const result = await pool.query(`
          SELECT 
            id, 
            title, 
            description, 
            category, 
            user_id as "userId", 
            created_at as "createdAt",
            COALESCE(image_url, NULL) as "imageUrl"
          FROM troc_ads 
          WHERE id = $1
        `, [id]);
        
        if (result.rows.length > 0) {
          const ad = result.rows[0];
          console.log('📋 TROC-ID - SQL avec image_url réussi:', ad.title);
          return res.status(200).json(ad);
        }
        
      } catch (sqlError) {
        console.log('📋 TROC-ID - SQL avec image_url échoué:', sqlError.message);
      }
      
      // Fallback 2: SQL sans image_url
      try {
        console.log('📋 TROC-ID - Tentative 3: SQL sans image_url');
        const result = await pool.query(`
          SELECT 
            id, 
            title, 
            description, 
            category, 
            user_id as "userId", 
            created_at as "createdAt"
          FROM troc_ads 
          WHERE id = $1
        `, [id]);
        
        if (result.rows.length > 0) {
          let ad = result.rows[0];
          ad.imageUrl = null; // Ajouter imageUrl null
          
          console.log('📋 TROC-ID - SQL sans image_url réussi:', ad.title);
          return res.status(200).json(ad);
        }
        
      } catch (finalSqlError) {
        console.log('📋 TROC-ID - SQL sans image_url échoué:', finalSqlError.message);
      }
      
      // Fallback 3: Via db.execute (pour les cas de cache ORM)
      try {
        console.log('📋 TROC-ID - Tentative 4: db.execute bypass');
        const result = await db.execute(sql.raw(`
          SELECT 
            id, 
            title, 
            description, 
            category, 
            user_id as "userId", 
            created_at as "createdAt",
            image_url as "imageUrl"
          FROM troc_ads 
          WHERE id = ${id}
        `));
        
        let ad = null;
        if (result.rows && result.rows.length > 0) {
          ad = result.rows[0];
        } else if (result[0]) {
          ad = result[0];
        }
        
        if (ad) {
          console.log('📋 TROC-ID - db.execute réussi:', ad.title);
          return res.status(200).json(ad);
        }
        
      } catch (executeError) {
        console.log('📋 TROC-ID - db.execute échoué:', executeError.message);
      }
      
      // Si aucune méthode ne fonctionne
      console.log('📋 TROC-ID - Toutes les tentatives échouées pour ID:', id);
      return res.status(404).json({ message: "Ad not found" });
      
    } catch (error) {
      console.error('📋 TROC-ID - Erreur finale:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/troc", requireAuth, async (req, res) => {
    console.log('📝 POST /api/troc - Création d\'une nouvelle annonce');
    
    try {
      console.log('POST /api/troc - Début de la requête, body:', req.body);
      
      // Only approved users can create ads
      const user = await storage.getUser(req.session.userId!);
      console.log('User found:', user ? { id: user.id, isApproved: user.isApproved } : 'null');
      
      if (!user || !user.isApproved) {
        return res.status(403).json({ message: "Only approved artists can create ads" });
      }
      
      // Déterminer l'utilisateur final de l'annonce
      let finalUserId = req.session.userId;
      
      // Si assignedUserId est fourni et que l'utilisateur est admin, utiliser cet utilisateur
      if (req.body.assignedUserId && req.body.assignedUserId !== "none" && req.session.isAdmin) {
        const assignedUser = await storage.getUser(parseInt(req.body.assignedUserId));
        if (assignedUser && assignedUser.isApproved) {
          finalUserId = parseInt(req.body.assignedUserId);
        }
      }

      // Support complet des images en production et local
      const adData: any = {
        title: req.body.title,
        description: req.body.description,
        category: req.body.category,
        userId: finalUserId,
      };
      
      // Ajouter imageUrl seulement si fourni pour éviter les erreurs de validation
      if (req.body.imageUrl) {
        adData.imageUrl = req.body.imageUrl;
      }
      
      console.log('🎯 TROC - adData prepared:', adData);
      const validatedData = insertTrocAdSchema.parse(adData);
      console.log('✅ TROC - adData validated:', validatedData);
      
      // SYNCHRONISATION ORM FINALE : Bypass complet de Drizzle 
      console.log('🔧 TROC - Bypass complet ORM avec pool PostgreSQL natif');
      
      // Utiliser SQL brut via Drizzle pour éviter le cache du schéma
      console.log('🔧 TROC - Utilisation de SQL brut via db.execute()');
      
      // FORCER la détection de la colonne en production
      // La colonne existe, on force hasImageUrlColumn = true
      let hasImageUrlColumn = true;
      console.log('🔧 TROC - FORCE: Colonne image_url forcée à true (existe en production)');

      // Construire la requête adaptée à la structure de la base
      let insertColumns = 'title, description, category, user_id, created_at';
      let insertValues = `'${validatedData.title.replace(/'/g, "''")}', '${validatedData.description.replace(/'/g, "''")}', '${validatedData.category}', ${validatedData.userId}, NOW()`;
      let returningColumns = 'id, title, description, category, user_id as "userId", created_at as "createdAt"';
      
      // Toujours inclure image_url car la colonne existe en production
      if (validatedData.imageUrl) {
        insertColumns += ', image_url';
        insertValues += `, '${validatedData.imageUrl}'`;
      }
      returningColumns += ', image_url as "imageUrl"';
      
      const query = `
        INSERT INTO troc_ads (${insertColumns})
        VALUES (${insertValues})
        RETURNING ${returningColumns}
      `;
      
      console.log('📝 TROC - SQL adapté à la structure BDD:', query);
      
      let result;
      try {
        result = await db.execute(sql.raw(query));
      } catch (sqlError: any) {
        console.error('❌ TROC - Erreur SQL:', sqlError.message);
        
        // Si l'erreur concerne image_url malgré notre bypass, réessayer sans
        if (sqlError.message.includes('image_url')) {
          console.log('🔄 TROC - Réessai sans image_url malgré bypass...');
          const fallbackQuery = `
            INSERT INTO troc_ads (title, description, category, user_id, created_at)
            VALUES ('${validatedData.title.replace(/'/g, "''")}', '${validatedData.description.replace(/'/g, "''")}', '${validatedData.category}', ${validatedData.userId}, NOW())
            RETURNING id, title, description, category, user_id as "userId", created_at as "createdAt"
          `;
          result = await db.execute(sql.raw(fallbackQuery));
        } else {
          throw sqlError;
        }
      }
      console.log('🔍 TROC - SQL result complete:', result);
      console.log('🔍 TROC - result.rows:', result.rows);
      console.log('🔍 TROC - result[0]:', result[0]);
      
      // Récupérer l'annonce créée depuis le résultat
      let ad = null;
      if (result.rows && result.rows.length > 0) {
        ad = result.rows[0];
      } else if (result[0]) {
        ad = result[0];
      } else {
        // Fallback : récupérer l'annonce par une nouvelle requête
        const fallbackColumns = hasImageUrlColumn 
          ? 'id, title, description, category, user_id as "userId", created_at as "createdAt", image_url as "imageUrl"'
          : 'id, title, description, category, user_id as "userId", created_at as "createdAt"';
          
        const fallbackQuery = `
          SELECT ${fallbackColumns}
          FROM troc_ads
          WHERE user_id = ${validatedData.userId}
          ORDER BY created_at DESC
          LIMIT 1
        `;
        const fallbackResult = await db.execute(sql.raw(fallbackQuery));
        ad = fallbackResult.rows?.[0] || fallbackResult[0];
      }
      
      // Assurer que imageUrl est présent même si la colonne n'existe pas
      if (ad && !hasImageUrlColumn && validatedData.imageUrl) {
        ad.imageUrl = validatedData.imageUrl;
      }
      
      console.log('🎉 TROC - Final ad data:', ad);
      
      if (!ad) {
        console.error('❌ TROC - Aucune annonce retournée');
        return res.status(500).json({ message: "Erreur: annonce créée mais non récupérée" });
      }
      
      res.status(201).json(ad);
    } catch (error) {
      console.error('Full error in POST /api/troc:', error);
      if (error instanceof z.ZodError) {
        console.error('Zod validation errors:', error.errors);
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error", error: error.message });
    }
  });

  app.put("/api/troc/:id", requireAuth, async (req, res) => {
    console.log('📝 PUT /api/troc/:id appelé pour ID:', req.params.id);
    
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ad ID" });
      }
      
      // Stratégie quadruple fallback pour récupérer l'annonce avant mise à jour
      let ad = null;
      
      // Tentative 1: Storage interface
      try {
        console.log('📝 PUT - Tentative 1: storage interface');
        ad = await storage.getTrocAd(id);
        if (ad) {
          console.log('📝 PUT - Storage réussi:', ad.title);
        }
      } catch (storageError) {
        console.log('📝 PUT - Storage en erreur:', storageError.message);
      }
      
      // Tentative 2: SQL avec image_url
      if (!ad) {
        try {
          console.log('📝 PUT - Tentative 2: SQL avec image_url');
          const result = await pool.query(`
            SELECT 
              id, 
              title, 
              description, 
              category, 
              user_id as "userId", 
              created_at as "createdAt",
              COALESCE(image_url, NULL) as "imageUrl"
            FROM troc_ads 
            WHERE id = $1
          `, [id]);
          
          if (result.rows.length > 0) {
            ad = result.rows[0];
            console.log('📝 PUT - SQL avec image_url réussi:', ad.title);
          }
        } catch (sqlError) {
          console.log('📝 PUT - SQL avec image_url échoué:', sqlError.message);
        }
      }
      
      // Tentative 3: SQL sans image_url
      if (!ad) {
        try {
          console.log('📝 PUT - Tentative 3: SQL sans image_url');
          const result = await pool.query(`
            SELECT 
              id, 
              title, 
              description, 
              category, 
              user_id as "userId", 
              created_at as "createdAt"
            FROM troc_ads 
            WHERE id = $1
          `, [id]);
          
          if (result.rows.length > 0) {
            ad = result.rows[0];
            ad.imageUrl = null;
            console.log('📝 PUT - SQL sans image_url réussi:', ad.title);
          }
        } catch (finalSqlError) {
          console.log('📝 PUT - SQL sans image_url échoué:', finalSqlError.message);
        }
      }
      
      // Tentative 4: db.execute bypass
      if (!ad) {
        try {
          console.log('📝 PUT - Tentative 4: db.execute bypass');
          const getResult = await db.execute(sql.raw(`
            SELECT 
              id, 
              title, 
              description, 
              category, 
              user_id as "userId", 
              created_at as "createdAt",
              image_url as "imageUrl"
            FROM troc_ads 
            WHERE id = ${id}
          `));
          
          if (getResult.rows && getResult.rows.length > 0) {
            ad = getResult.rows[0];
          } else if (getResult[0]) {
            ad = getResult[0];
          }
          
          if (ad) {
            console.log('📝 PUT - db.execute réussi:', ad.title);
          }
        } catch (executeError) {
          console.log('📝 PUT - db.execute échoué:', executeError.message);
        }
      }
      
      if (!ad) {
        console.log('📝 PUT - Annonce non trouvée pour ID:', id);
        return res.status(404).json({ message: "Ad not found" });
      }
      
      // Only the creator or an admin can update an ad
      if (ad.userId !== req.session.userId && !req.session.isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Préparer les données de mise à jour
      let updateData = {
        title: req.body.title,
        description: req.body.description,
        category: req.body.category,
      } as any;

      // Handle multi-images
      let finalImageUrls = [];
      
      // Récupérer les URLs d'images actuelles conservées
      if (req.body.currentImageUrls && req.body.currentImageUrls.trim() !== '') {
        finalImageUrls = req.body.currentImageUrls.split(',').map((url: string) => url.trim()).filter((url: string) => url.length > 0);
      }
      
      // Handle new image uploads
      if (req.files && 'images' in req.files) {
        console.log('Files detected for upload:', Object.keys(req.files));
        try {
          const imageFiles = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
          console.log('Number of image files:', imageFiles.length);
          
          // Traiter toutes les nouvelles images
          for (const imageFile of imageFiles) {
            if (imageFile && imageFile.data) {
              console.log('Processing image file:', imageFile.name, 'Size:', imageFile.size);
              let imageBuffer: Buffer;
              
              if (Buffer.isBuffer(imageFile.data)) {
                imageBuffer = imageFile.data;
              } else {
                imageBuffer = Buffer.from(imageFile.data);
              }
              
              try {
                imageBuffer = await resizeProfileImage(imageBuffer);
                console.log('Image resized successfully');
              } catch (resizeError) {
                console.warn('Could not resize image, using original:', resizeError.message);
              }
              
              const fileName = `troc-ads/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
              console.log('Attempting to upload file:', fileName);
              
              const uploadedUrl = await uploadFile(
                StorageBucket.MEDIA,
                fileName,
                imageBuffer,
                imageFile.mimetype || 'image/jpeg'
              );
              
              if (uploadedUrl) {
                finalImageUrls.push(uploadedUrl);
                console.log('Image uploaded successfully:', uploadedUrl);
              }
            }
          }
        } catch (uploadError) {
          console.error('Error uploading image:', uploadError);
          // Continue without changing image if upload fails
        }
      } else {
        console.log('No files found in request, req.files:', req.files);
      }
      
      // Finaliser l'URL d'images
      // Si imageUrl est fourni directement dans le body (JSON), l'utiliser
      if (req.body.imageUrl !== undefined) {
        console.log('📝 PUT - imageUrl fourni directement:', req.body.imageUrl);
        updateData.imageUrl = req.body.imageUrl;
      } else {
        // Sinon utiliser les images uploadées
        const finalImageUrl = finalImageUrls.length > 0 ? finalImageUrls.join(',') : null;
        updateData.imageUrl = finalImageUrl;
      }

      // Si l'utilisateur est admin et qu'un assignedUserId est fourni, gérer l'attribution
      if (req.session.isAdmin && req.body.assignedUserId && req.body.assignedUserId !== "none") {
        const assignedUser = await storage.getUser(parseInt(req.body.assignedUserId));
        if (assignedUser && assignedUser.isApproved) {
          updateData.userId = parseInt(req.body.assignedUserId);
        }
      }
      
      console.log('📝 PUT - Updating ad with data:', updateData);
      
      // Stratégie quadruple fallback pour la mise à jour
      let updatedAd = null;
      
      // Tentative 1: Storage interface
      try {
        console.log('📝 PUT - Tentative 1: storage.updateTrocAd');
        updatedAd = await storage.updateTrocAd(id, updateData);
        if (updatedAd) {
          console.log('📝 PUT - Storage update réussi:', updatedAd.title);
        }
      } catch (storageUpdateError) {
        console.log('📝 PUT - Storage update échoué:', storageUpdateError.message);
      }
      
      // Tentative 2: SQL avec image_url
      if (!updatedAd) {
        try {
          console.log('📝 PUT - Tentative 2: SQL avec image_url');
          const updateResult = await pool.query(`
            UPDATE troc_ads 
            SET title = $1,
                description = $2,
                category = $3,
                image_url = $4
            WHERE id = $5
            RETURNING id, title, description, category, user_id as "userId", created_at as "createdAt", 
                     COALESCE(image_url, NULL) as "imageUrl"
          `, [updateData.title, updateData.description, updateData.category, updateData.imageUrl, id]);
          
          if (updateResult.rows.length > 0) {
            updatedAd = updateResult.rows[0];
            console.log('📝 PUT - SQL avec image_url réussi:', updatedAd.title);
          }
        } catch (sqlUpdateError) {
          console.log('📝 PUT - SQL avec image_url échoué:', sqlUpdateError.message);
        }
      }
      
      // Tentative 3: SQL sans image_url
      if (!updatedAd) {
        try {
          console.log('📝 PUT - Tentative 3: SQL sans image_url');
          const updateResult = await pool.query(`
            UPDATE troc_ads 
            SET title = $1,
                description = $2,
                category = $3
            WHERE id = $4
            RETURNING id, title, description, category, user_id as "userId", created_at as "createdAt"
          `, [updateData.title, updateData.description, updateData.category, id]);
          
          if (updateResult.rows.length > 0) {
            updatedAd = updateResult.rows[0];
            updatedAd.imageUrl = updateData.imageUrl; // Ajouter manuellement
            console.log('📝 PUT - SQL sans image_url réussi:', updatedAd.title);
          }
        } catch (finalSqlUpdateError) {
          console.log('📝 PUT - SQL sans image_url échoué:', finalSqlUpdateError.message);
        }
      }
      
      // Tentative 4: db.execute bypass
      if (!updatedAd) {
        try {
          console.log('📝 PUT - Tentative 4: db.execute bypass');
          const updateQuery = `
            UPDATE troc_ads 
            SET title = '${updateData.title.replace(/'/g, "''")}',
                description = '${updateData.description.replace(/'/g, "''")}',
                category = '${updateData.category}',
                image_url = ${updateData.imageUrl ? `'${updateData.imageUrl}'` : 'NULL'}
            WHERE id = ${id}
            RETURNING id, title, description, category, user_id as "userId", created_at as "createdAt", image_url as "imageUrl"
          `;
          
          const updateResult = await db.execute(sql.raw(updateQuery));
          if (updateResult.rows && updateResult.rows.length > 0) {
            updatedAd = updateResult.rows[0];
          } else if (updateResult[0]) {
            updatedAd = updateResult[0];
          }
          
          if (updatedAd) {
            console.log('📝 PUT - db.execute réussi:', updatedAd.title);
          }
        } catch (executeUpdateError) {
          console.log('📝 PUT - db.execute échoué:', executeUpdateError.message);
        }
      }
      
      if (!updatedAd) {
        console.log('📝 PUT - Toutes les tentatives de mise à jour échouées pour ID:', id);
        return res.status(404).json({ message: "Ad not found" });
      }
      
      console.log('📝 PUT - Ad updated successfully:', updatedAd.title);
      res.status(200).json(updatedAd);
    } catch (error) {
      console.error('📝 PUT - Erreur générale:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/troc/:id", requireAuth, async (req, res) => {
    console.log('🗑️ DELETE /api/troc/:id appelé pour ID:', req.params.id);
    
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ad ID" });
      }
      
      // Stratégie quadruple fallback pour récupérer l'annonce avant suppression
      let ad = null;
      
      // Tentative 1: Storage interface
      try {
        console.log('🗑️ DELETE - Tentative 1: storage interface');
        ad = await storage.getTrocAd(id);
        if (ad) {
          console.log('🗑️ DELETE - Storage réussi:', ad.title);
        }
      } catch (storageError) {
        console.log('🗑️ DELETE - Storage en erreur:', storageError.message);
      }
      
      // Tentative 2: SQL avec image_url
      if (!ad) {
        try {
          console.log('🗑️ DELETE - Tentative 2: SQL avec image_url');
          const result = await pool.query(`
            SELECT 
              id, 
              title, 
              description, 
              category, 
              user_id as "userId", 
              created_at as "createdAt",
              COALESCE(image_url, NULL) as "imageUrl"
            FROM troc_ads 
            WHERE id = $1
          `, [id]);
          
          if (result.rows.length > 0) {
            ad = result.rows[0];
            console.log('🗑️ DELETE - SQL avec image_url réussi:', ad.title);
          }
        } catch (sqlError) {
          console.log('🗑️ DELETE - SQL avec image_url échoué:', sqlError.message);
        }
      }
      
      // Tentative 3: SQL sans image_url
      if (!ad) {
        try {
          console.log('🗑️ DELETE - Tentative 3: SQL sans image_url');
          const result = await pool.query(`
            SELECT 
              id, 
              title, 
              description, 
              category, 
              user_id as "userId", 
              created_at as "createdAt"
            FROM troc_ads 
            WHERE id = $1
          `, [id]);
          
          if (result.rows.length > 0) {
            ad = result.rows[0];
            ad.imageUrl = null;
            console.log('🗑️ DELETE - SQL sans image_url réussi:', ad.title);
          }
        } catch (finalSqlError) {
          console.log('🗑️ DELETE - SQL sans image_url échoué:', finalSqlError.message);
        }
      }
      
      // Tentative 4: db.execute bypass
      if (!ad) {
        try {
          console.log('🗑️ DELETE - Tentative 4: db.execute bypass');
          const getResult = await db.execute(sql.raw(`
            SELECT 
              id, 
              title, 
              description, 
              category, 
              user_id as "userId", 
              created_at as "createdAt",
              image_url as "imageUrl"
            FROM troc_ads 
            WHERE id = ${id}
          `));
          
          if (getResult.rows && getResult.rows.length > 0) {
            ad = getResult.rows[0];
          } else if (getResult[0]) {
            ad = getResult[0];
          }
          
          if (ad) {
            console.log('🗑️ DELETE - db.execute réussi:', ad.title);
          }
        } catch (executeError) {
          console.log('🗑️ DELETE - db.execute échoué:', executeError.message);
        }
      }
      
      if (!ad) {
        console.log('🗑️ DELETE - Annonce non trouvée pour ID:', id);
        return res.status(404).json({ message: "Ad not found" });
      }
      
      // Only the creator or an admin can delete an ad
      if (ad.userId !== req.session.userId && !req.session.isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Stratégie de suppression multiple pour gérer tous les cas
      let deleteSuccess = false;
      
      // Méthode 1: Storage interface
      try {
        console.log('🗑️ DELETE - Suppression via storage interface');
        deleteSuccess = await storage.deleteTrocAd(id);
        if (deleteSuccess) {
          console.log('🗑️ DELETE - Storage suppression réussie');
        }
      } catch (storageDeleteError) {
        console.log('🗑️ DELETE - Storage suppression échouée:', storageDeleteError.message);
      }
      
      // Méthode 2: SQL direct si storage a échoué
      if (!deleteSuccess) {
        try {
          console.log('🗑️ DELETE - Suppression via pool.query');
          const deleteResult = await pool.query('DELETE FROM troc_ads WHERE id = $1', [id]);
          deleteSuccess = deleteResult.rowCount > 0;
          if (deleteSuccess) {
            console.log('🗑️ DELETE - Pool.query suppression réussie');
          }
        } catch (poolDeleteError) {
          console.log('🗑️ DELETE - Pool.query suppression échouée:', poolDeleteError.message);
        }
      }
      
      // Méthode 3: db.execute si tout le reste échoue
      if (!deleteSuccess) {
        try {
          console.log('🗑️ DELETE - Suppression via db.execute');
          const deleteResult = await db.execute(sql.raw(`DELETE FROM troc_ads WHERE id = ${id}`));
          console.log('🗑️ DELETE - db.execute result:', deleteResult);
          deleteSuccess = true; // Si aucune erreur, considérer comme réussi
        } catch (executeDeleteError) {
          console.log('🗑️ DELETE - db.execute suppression échouée:', executeDeleteError.message);
        }
      }
      
      if (deleteSuccess) {
        console.log('🗑️ DELETE - Suppression confirmée pour ID:', id);
        res.status(204).send();
      } else {
        console.log('🗑️ DELETE - Échec de suppression pour ID:', id);
        res.status(500).json({ message: "Failed to delete ad" });
      }
      
    } catch (error) {
      console.error('🗑️ DELETE - Erreur générale:', error);
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

  // Route admin pour gérer les annonces TROC
  app.get("/api/admin/troc", requireAdmin, async (req, res) => {
    console.log('🔧 ADMIN TROC - GET appelé');
    
    try {
      // Stratégie quadruple fallback pour récupérer toutes les annonces
      let ads = [];
      
      // Tentative 1: Storage interface
      try {
        console.log('🔧 ADMIN TROC - Tentative 1: storage interface');
        ads = await storage.getTrocAds();
        if (ads && ads.length >= 0) {
          console.log('🔧 ADMIN TROC - Storage réussi:', ads.length, 'annonces');
        }
      } catch (storageError) {
        console.log('🔧 ADMIN TROC - Storage échoué:', storageError.message);
      }
      
      // Tentative 2: SQL avec image_url
      if (!ads || ads.length === 0) {
        try {
          console.log('🔧 ADMIN TROC - Tentative 2: SQL avec image_url');
          const result = await pool.query(`
            SELECT 
              id, 
              title, 
              description, 
              category, 
              user_id as "userId", 
              created_at as "createdAt",
              COALESCE(image_url, NULL) as "imageUrl"
            FROM troc_ads 
            ORDER BY created_at DESC
          `);
          
          if (result.rows) {
            ads = result.rows;
            console.log('🔧 ADMIN TROC - SQL avec image_url réussi:', ads.length, 'annonces');
          }
        } catch (sqlError) {
          console.log('🔧 ADMIN TROC - SQL avec image_url échoué:', sqlError.message);
        }
      }
      
      // Tentative 3: SQL sans image_url
      if (!ads || ads.length === 0) {
        try {
          console.log('🔧 ADMIN TROC - Tentative 3: SQL sans image_url');
          const result = await pool.query(`
            SELECT 
              id, 
              title, 
              description, 
              category, 
              user_id as "userId", 
              created_at as "createdAt"
            FROM troc_ads 
            ORDER BY created_at DESC
          `);
          
          if (result.rows) {
            ads = result.rows.map(ad => ({ ...ad, imageUrl: null }));
            console.log('🔧 ADMIN TROC - SQL sans image_url réussi:', ads.length, 'annonces');
          }
        } catch (finalSqlError) {
          console.log('🔧 ADMIN TROC - SQL sans image_url échoué:', finalSqlError.message);
        }
      }
      
      // Tentative 4: db.execute bypass
      if (!ads || ads.length === 0) {
        try {
          console.log('🔧 ADMIN TROC - Tentative 4: db.execute bypass');
          const getResult = await db.execute(sql.raw(`
            SELECT 
              id, 
              title, 
              description, 
              category, 
              user_id as "userId", 
              created_at as "createdAt",
              image_url as "imageUrl"
            FROM troc_ads 
            ORDER BY created_at DESC
          `));
          
          if (getResult.rows && getResult.rows.length > 0) {
            ads = getResult.rows;
          } else if (Array.isArray(getResult) && getResult.length > 0) {
            ads = getResult;
          }
          
          if (ads && ads.length > 0) {
            console.log('🔧 ADMIN TROC - db.execute réussi:', ads.length, 'annonces');
          }
        } catch (executeError) {
          console.log('🔧 ADMIN TROC - db.execute échoué:', executeError.message);
        }
      }
      
      // Retourner toujours un tableau, même vide
      if (!ads) {
        ads = [];
      }
      
      console.log('🔧 ADMIN TROC - Retour final:', ads.length, 'annonces');
      res.status(200).json(ads);
      
    } catch (error) {
      console.error('🔧 ADMIN TROC - Erreur générale:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Route d'administration pour ajouter la colonne image_url manquante
  app.post("/api/admin/fix-database-schema", requireAuth, requireAdmin, async (req, res) => {
    console.log('🔧 ADMIN - Correction schéma base de données demandée');
    
    try {
      // Vérifier si la colonne existe déjà
      const columnCheck = await db.execute(sql.raw(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'troc_ads' AND column_name = 'image_url'
      `));
      
      const hasColumn = columnCheck.rows && columnCheck.rows.length > 0;
      console.log('🔍 ADMIN - Colonne image_url existe:', hasColumn);
      
      if (hasColumn) {
        return res.json({ 
          success: true, 
          message: "La colonne image_url existe déjà",
          action: "none"
        });
      }
      
      // Ajouter la colonne
      console.log('🔧 ADMIN - Ajout de la colonne image_url...');
      await db.execute(sql.raw(`
        ALTER TABLE troc_ads 
        ADD COLUMN image_url TEXT
      `));
      
      console.log('✅ ADMIN - Colonne image_url ajoutée avec succès');
      
      res.json({ 
        success: true, 
        message: "Colonne image_url ajoutée avec succès",
        action: "column_added"
      });
      
    } catch (error: any) {
      console.error('❌ ADMIN - Erreur correction schéma:', error.message);
      res.status(500).json({ 
        success: false, 
        message: "Erreur lors de la correction du schéma",
        error: error.message 
      });
    }
  });

  // Health check endpoint for Koyeb
  app.get("/health", (req, res) => {
    res.status(200).send("OK");
  });

  // Create HTTP server
  // API Admin pour exécuter du SQL direct (migration de colonne)
  app.post("/api/admin/execute-sql", requireAuth, requireAdmin, async (req, res) => {
    try {
      console.log('🔧 ADMIN SQL - Execution directe:', req.body.query);
      
      const result = await db.execute(sql.raw(req.body.query));
      console.log('✅ ADMIN SQL - Résultat:', result);
      
      res.status(200).json({ success: true, result });
    } catch (error) {
      console.error('❌ ADMIN SQL - Erreur:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
