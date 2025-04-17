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

declare module "express-session" {
  interface SessionData {
    userId: number;
    isAdmin: boolean;
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
      
      // Create user
      const user = await storage.createUser(userData);
      
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
      req.session.isAdmin = user.isAdmin;
      
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
      
      const event = await storage.createEvent(eventData);
      
      res.status(201).json(event);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
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
      
      const updatedEvent = await storage.updateEvent(id, req.body);
      
      if (!updatedEvent) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      res.status(200).json(updatedEvent);
    } catch (error) {
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

  app.post("/api/troc", requireAuth, async (req, res) => {
    try {
      // Only approved users can create ads
      const user = await storage.getUser(req.session.userId);
      
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
