var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  events: () => events,
  insertEventSchema: () => insertEventSchema,
  insertMessageSchema: () => insertMessageSchema,
  insertProfileMediaSchema: () => insertProfileMediaSchema,
  insertSessionSchema: () => insertSessionSchema,
  insertTrocAdSchema: () => insertTrocAdSchema,
  insertUserSchema: () => insertUserSchema,
  messages: () => messages,
  profileMedia: () => profileMedia,
  sessions: () => sessions,
  trocAds: () => trocAds,
  users: () => users
});
import { pgTable, text, serial, integer, timestamp, json, uuid, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  profileImage: text("profile_image"),
  bio: text("bio"),
  discipline: text("discipline"),
  location: text("location"),
  website: text("website"),
  socialMedia: json("social_media").$type(),
  cv: text("cv"),
  isApproved: boolean("is_approved").default(false),
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow()
});
var insertUserSchema = createInsertSchema(users).omit({ id: true, isApproved: true, isAdmin: true, createdAt: true });
var profileMedia = pgTable("profile_media", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  mediaType: text("media_type").notNull(),
  // 'video', 'audio', 'image'
  url: text("url").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow()
});
var insertProfileMediaSchema = createInsertSchema(profileMedia).omit({ id: true, createdAt: true });
var events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  location: text("location").notNull(),
  eventDate: timestamp("event_date").notNull(),
  imageUrl: text("image_url"),
  organizerId: integer("organizer_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow()
});
var insertEventSchema = createInsertSchema(events).omit({ id: true, createdAt: true });
var trocAds = pgTable("troc_ads", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  // 'collaboration', 'equipment', 'service', 'event'
  userId: integer("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow()
});
var insertTrocAdSchema = createInsertSchema(trocAds).omit({ id: true, createdAt: true });
var messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull().references(() => users.id),
  receiverId: integer("receiver_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow()
});
var insertMessageSchema = createInsertSchema(messages).omit({ id: true, isRead: true, createdAt: true });
var sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id").notNull().references(() => users.id),
  expiresAt: timestamp("expires_at").notNull()
});
var insertSessionSchema = createInsertSchema(sessions);

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
console.log("Environnement:", process.env.NODE_ENV || "development");
console.log("DATABASE_URL d\xE9fini:", !!process.env.DATABASE_URL);
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}
var pool;
var db;
try {
  console.log("Tentative de connexion \xE0 la base de donn\xE9es...");
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 3e4,
    // 30 secondes de timeout
    idleTimeoutMillis: 6e4,
    // 1 minute d'inactivité max
    max: 20
    // Nombre max de clients dans le pool
  });
  db = drizzle({ client: pool, schema: schema_exports });
  console.log("Connexion \xE0 la base de donn\xE9es \xE9tablie avec succ\xE8s");
  pool.query("SELECT 1").then(() => console.log("Test de connexion r\xE9ussi")).catch((err) => {
    console.error("Erreur lors du test de connexion:", err);
    if (process.env.NODE_ENV === "production") {
      console.log("Tentative de reconnexion...");
      setTimeout(() => {
        pool.query("SELECT 1").then(() => console.log("Reconnexion r\xE9ussie")).catch((err2) => console.error("\xC9chec de la reconnexion:", err2));
      }, 5e3);
    }
  });
  pool.on("error", (err) => {
    console.error("Erreur inattendue du pool de connexion:", err);
    if (process.env.NODE_ENV !== "production") {
      throw err;
    }
  });
} catch (error) {
  console.error("ERREUR CRITIQUE lors de l'initialisation de la base de donn\xE9es:", error);
  if (process.env.NODE_ENV !== "production") {
    throw error;
  } else {
    console.warn("Cr\xE9ation d'objets de remplacement pour la production");
    pool = {
      query: () => Promise.reject(new Error("Database connection failed")),
      connect: () => Promise.reject(new Error("Database connection failed")),
      on: () => {
      },
      end: () => Promise.resolve()
    };
    db = drizzle({ client: pool, schema: schema_exports });
  }
}

// server/database-storage.ts
import { and, eq, or, desc, asc } from "drizzle-orm";
var DatabaseStorage = class {
  // User operations
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async getUserByUsername(username) {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  async getUserByEmail(email) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  async createUser(insertUser) {
    const [user] = await db.insert(users).values([insertUser]).returning();
    return user;
  }
  async updateUser(id, userData) {
    const [updatedUser] = await db.update(users).set(userData).where(eq(users.id, id)).returning();
    return updatedUser;
  }
  async getUsers(options) {
    if (options?.isApproved !== void 0) {
      return db.select().from(users).where(eq(users.isApproved, options.isApproved)).orderBy(desc(users.createdAt));
    }
    return db.select().from(users).orderBy(desc(users.createdAt));
  }
  // ProfileMedia operations
  async getProfileMedia(userId) {
    return db.select().from(profileMedia).where(eq(profileMedia.userId, userId)).orderBy(desc(profileMedia.createdAt));
  }
  async createProfileMedia(media) {
    const [createdMedia] = await db.insert(profileMedia).values(media).returning();
    return createdMedia;
  }
  async deleteProfileMedia(id) {
    const result = await db.delete(profileMedia).where(eq(profileMedia.id, id)).returning({ id: profileMedia.id });
    return result.length > 0;
  }
  // Event operations
  async getEvent(id) {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event;
  }
  async getEvents(limit) {
    const query = db.select().from(events).orderBy(asc(events.eventDate));
    if (limit) {
      return query.limit(limit);
    }
    return query;
  }
  async createEvent(event) {
    const [createdEvent] = await db.insert(events).values(event).returning();
    return createdEvent;
  }
  async updateEvent(id, eventData) {
    const [updatedEvent] = await db.update(events).set(eventData).where(eq(events.id, id)).returning();
    return updatedEvent;
  }
  async deleteEvent(id) {
    const result = await db.delete(events).where(eq(events.id, id)).returning({ id: events.id });
    return result.length > 0;
  }
  // TrocAd operations
  async getTrocAd(id) {
    const [ad] = await db.select().from(trocAds).where(eq(trocAds.id, id));
    return ad;
  }
  async getTrocAds(options) {
    let result;
    const baseQuery = db.select().from(trocAds).orderBy(desc(trocAds.createdAt));
    if (options?.category) {
      result = await baseQuery.where(eq(trocAds.category, options.category)).limit(options?.limit || 100);
    } else if (options?.limit) {
      result = await baseQuery.limit(options.limit);
    } else {
      result = await baseQuery;
    }
    return result;
  }
  async createTrocAd(ad) {
    const [createdAd] = await db.insert(trocAds).values(ad).returning();
    return createdAd;
  }
  async updateTrocAd(id, adData) {
    const [updatedAd] = await db.update(trocAds).set(adData).where(eq(trocAds.id, id)).returning();
    return updatedAd;
  }
  async deleteTrocAd(id) {
    const result = await db.delete(trocAds).where(eq(trocAds.id, id)).returning({ id: trocAds.id });
    return result.length > 0;
  }
  // Message operations
  async getMessage(id) {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message;
  }
  async getMessages(userId) {
    return db.select().from(messages).where(or(eq(messages.senderId, userId), eq(messages.receiverId, userId))).orderBy(desc(messages.createdAt));
  }
  async getConversation(user1Id, user2Id) {
    return db.select().from(messages).where(
      or(
        and(eq(messages.senderId, user1Id), eq(messages.receiverId, user2Id)),
        and(eq(messages.senderId, user2Id), eq(messages.receiverId, user1Id))
      )
    ).orderBy(asc(messages.createdAt));
  }
  async createMessage(message) {
    const [createdMessage] = await db.insert(messages).values(message).returning();
    return createdMessage;
  }
  async markMessageAsRead(id) {
    const [updatedMessage] = await db.update(messages).set({ isRead: true }).where(eq(messages.id, id)).returning();
    return !!updatedMessage;
  }
  // Session operations
  async createSession(session2) {
    const [createdSession] = await db.insert(sessions).values(session2).returning();
    return createdSession;
  }
  async getSessionById(id) {
    const [session2] = await db.select().from(sessions).where(eq(sessions.id, id));
    return session2;
  }
  async deleteSession(id) {
    const result = await db.delete(sessions).where(eq(sessions.id, id)).returning({ id: sessions.id });
    return result.length > 0;
  }
};

// server/storage.ts
var storage = new DatabaseStorage();

// server/routes.ts
import session from "express-session";
import { z } from "zod";
import connectPg from "connect-pg-simple";
async function registerRoutes(app2) {
  console.log("Configuration des sessions...");
  let sessionConfig = {
    // Secret de session (utiliser une variable d'environnement en production)
    secret: process.env.SESSION_SECRET || "bottin-dam-secret-dev-only",
    // Options de cookie
    cookie: {
      secure: process.env.COOKIE_SECURE === "true",
      // Dépend du proxy et HTTPS
      maxAge: 7 * 24 * 60 * 60 * 1e3,
      // 7 jours
      sameSite: "lax",
      // Protection CSRF basique
      path: "/"
    },
    // Autres options
    resave: false,
    saveUninitialized: false,
    name: "dam_session",
    // Par défaut, pas de store (utilise MemoryStore)
    store: void 0
  };
  if (process.env.NODE_ENV === "production") {
    try {
      console.log("Initialisation du stockage PostgreSQL pour les sessions...");
      const PostgreSqlStore = connectPg(session);
      const sessionTableSchema = `
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" jsonb NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
      )`;
      try {
        await pool.query(sessionTableSchema);
        console.log("Table de session v\xE9rifi\xE9e/cr\xE9\xE9e avec succ\xE8s");
      } catch (err) {
        console.error("Erreur lors de la cr\xE9ation de la table de session:", err);
      }
      sessionConfig.store = new PostgreSqlStore({
        pool,
        tableName: "session",
        // Utilise 'session' au lieu de 'sessions'
        createTableIfMissing: false,
        // On a déjà créé la table manuellement
        pruneSessionInterval: 60
        // Nettoyer les sessions expirées toutes les 60 secondes
      });
      console.log("Stockage PostgreSQL pour les sessions configur\xE9 avec succ\xE8s");
    } catch (error) {
      console.error("ERREUR lors de l'initialisation du stockage PostgreSQL des sessions:", error);
      console.warn("\u26A0\uFE0F Utilisation du stockage m\xE9moire pour les sessions - NON RECOMMAND\xC9 EN PRODUCTION");
      if (process.env.NODE_ENV === "production") {
        console.warn("\u26A0\uFE0F AVERTISSEMENT: L'application utilise MemoryStore en production!");
        console.warn("\u26A0\uFE0F Cela peut causer des fuites de m\xE9moire et des pertes de sessions lors des red\xE9marrages.");
      }
    }
  } else {
    console.log("Mode d\xE9veloppement: utilisation du stockage m\xE9moire pour les sessions");
  }
  app2.use(session(sessionConfig));
  const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };
  const requireAdmin = (req, res, next) => {
    if (!req.session.userId || !req.session.isAdmin) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
  app2.get("/api/health-check/session", (req, res) => {
    res.json({
      cookie: {
        secure: sessionConfig.cookie?.secure,
        sameSite: sessionConfig.cookie?.sameSite
      },
      env: process.env.NODE_ENV,
      cookieSecureEnv: process.env.COOKIE_SECURE
    });
  });
  app2.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUserByUsername = await storage.getUserByUsername(userData.username);
      if (existingUserByUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }
      const existingUserByEmail = await storage.getUserByEmail(userData.email);
      if (existingUserByEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
      const user = await storage.createUser(userData);
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
  app2.post("/api/auth/login", async (req, res) => {
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
      req.session.userId = user.id;
      req.session.isAdmin = user.isAdmin;
      const { password: _, ...userWithoutPassword } = user;
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.status(200).json({ message: "Logout successful" });
    });
  });
  app2.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        req.session.destroy(() => {
        });
        return res.status(401).json({ message: "User not found" });
      }
      const { password, ...userWithoutPassword } = user;
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/users", async (req, res) => {
    try {
      const approved = req.query.approved === "true";
      const users2 = await storage.getUsers({ isApproved: approved });
      const usersWithoutPasswords = users2.map(({ password, ...user }) => user);
      res.status(200).json(usersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (!user.isApproved && (!req.session.userId || req.session.userId !== user.id && !req.session.isAdmin)) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password, ...userWithoutPassword } = user;
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.put("/api/users/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      if (req.session.userId !== id && !req.session.isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (req.body.isAdmin !== void 0 && !req.session.isAdmin) {
        delete req.body.isAdmin;
      }
      if (req.body.isApproved !== void 0 && !req.session.isAdmin) {
        delete req.body.isApproved;
      }
      const updatedUser = await storage.updateUser(id, req.body);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password, ...userWithoutPassword } = updatedUser;
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/users/:userId/media", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (!user.isApproved && (!req.session.userId || req.session.userId !== userId && !req.session.isAdmin)) {
        return res.status(404).json({ message: "User not found" });
      }
      const media = await storage.getProfileMedia(userId);
      res.status(200).json(media);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.post("/api/users/:userId/media", requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      if (req.session.userId !== userId && !req.session.isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const mediaData = insertProfileMediaSchema.parse({
        ...req.body,
        userId
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
  app2.delete("/api/users/:userId/media/:mediaId", requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const mediaId = parseInt(req.params.mediaId);
      if (isNaN(userId) || isNaN(mediaId)) {
        return res.status(400).json({ message: "Invalid IDs" });
      }
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
  app2.get("/api/events", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit) : void 0;
      const events2 = await storage.getEvents(limit);
      res.status(200).json(events2);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/events/:id", async (req, res) => {
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
  app2.post("/api/events", requireAuth, async (req, res) => {
    try {
      const eventData = insertEventSchema.parse(req.body);
      if (!eventData.organizerId) {
        eventData.organizerId = req.session.userId;
      }
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
  app2.put("/api/events/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }
      const event = await storage.getEvent(id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
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
  app2.delete("/api/events/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }
      const event = await storage.getEvent(id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
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
  app2.get("/api/troc", async (req, res) => {
    try {
      const category = req.query.category;
      const limit = req.query.limit ? parseInt(req.query.limit) : void 0;
      const ads = await storage.getTrocAds({ category, limit });
      res.status(200).json(ads);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/troc/:id", async (req, res) => {
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
  app2.post("/api/troc", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user || !user.isApproved) {
        return res.status(403).json({ message: "Only approved artists can create ads" });
      }
      const adData = insertTrocAdSchema.parse({
        ...req.body,
        userId: req.session.userId
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
  app2.put("/api/troc/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ad ID" });
      }
      const ad = await storage.getTrocAd(id);
      if (!ad) {
        return res.status(404).json({ message: "Ad not found" });
      }
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
  app2.delete("/api/troc/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ad ID" });
      }
      const ad = await storage.getTrocAd(id);
      if (!ad) {
        return res.status(404).json({ message: "Ad not found" });
      }
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
  app2.get("/api/messages", requireAuth, async (req, res) => {
    try {
      const messages2 = await storage.getMessages(req.session.userId);
      res.status(200).json(messages2);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/messages/:userId", requireAuth, async (req, res) => {
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
  app2.post("/api/messages", requireAuth, async (req, res) => {
    try {
      const messageData = insertMessageSchema.parse({
        ...req.body,
        senderId: req.session.userId
      });
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
  app2.patch("/api/messages/:id/read", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid message ID" });
      }
      const message = await storage.getMessage(id);
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }
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
  app2.get("/api/admin/pending-users", requireAdmin, async (req, res) => {
    try {
      const pendingUsers = await storage.getUsers({ isApproved: false });
      const usersWithoutPasswords = pendingUsers.map(({ password, ...user }) => user);
      res.status(200).json(usersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/admin/analytics", requireAdmin, async (req, res) => {
    try {
      const users2 = await storage.getUsers();
      const approvedUsers = users2.filter((user) => user.isApproved);
      const pendingUsers = users2.filter((user) => !user.isApproved);
      const events2 = await storage.getEvents();
      const trocAds2 = await storage.getTrocAds();
      const usersByDiscipline = {};
      approvedUsers.forEach((user) => {
        if (user.discipline) {
          usersByDiscipline[user.discipline] = (usersByDiscipline[user.discipline] || 0) + 1;
        }
      });
      const usersByLocation = {};
      approvedUsers.forEach((user) => {
        if (user.location) {
          usersByLocation[user.location] = (usersByLocation[user.location] || 0) + 1;
        }
      });
      const adsByCategory = {};
      trocAds2.forEach((ad) => {
        adsByCategory[ad.category] = (adsByCategory[ad.category] || 0) + 1;
      });
      const recentUsers = [...approvedUsers].sort((a, b) => new Date(b.createdAt || /* @__PURE__ */ new Date()).getTime() - new Date(a.createdAt || /* @__PURE__ */ new Date()).getTime()).slice(0, 10).map(({ password, ...user }) => user);
      const recentEvents = [...events2].sort((a, b) => new Date(b.createdAt || /* @__PURE__ */ new Date()).getTime() - new Date(a.createdAt || /* @__PURE__ */ new Date()).getTime()).slice(0, 10);
      const recentAds = [...trocAds2].sort((a, b) => new Date(b.createdAt || /* @__PURE__ */ new Date()).getTime() - new Date(a.createdAt || /* @__PURE__ */ new Date()).getTime()).slice(0, 10);
      res.json({
        counts: {
          totalUsers: users2.length,
          approvedUsers: approvedUsers.length,
          pendingUsers: pendingUsers.length,
          events: events2.length,
          trocAds: trocAds2.length
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
      console.error("Analytics error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.patch("/api/admin/users/:id/approve", requireAdmin, async (req, res) => {
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
      const { password, ...userWithoutPassword } = updatedUser;
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/health", (req, res) => {
    res.status(200).send("OK");
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    themePlugin(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom",
    root: path2.resolve(import.meta.dirname, "..", "client")
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(import.meta.dirname, "..", "client", "index.html");
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      if (e instanceof Error) {
        vite.ssrFixStacktrace(e);
      }
      next(e);
    }
  });
}
function serveStatic(app2) {
  const currentDir = typeof import.meta !== "undefined" ? import.meta.dirname : __dirname;
  const clientBuildPath = path2.resolve(currentDir, "..", "dist", "public");
  console.log(`[serveStatic] Resolved dist directory: ${clientBuildPath}`);
  if (!fs.existsSync(clientBuildPath)) {
    console.error(`ERROR: dist directory not found at: ${clientBuildPath}`);
    throw new Error(`Missing build output: ${clientBuildPath}`);
  }
  try {
    const files = fs.readdirSync(clientBuildPath);
    console.log(`[serveStatic] Contents of dist/: ${files.join(", ")}`);
    const assetsPath = path2.join(clientBuildPath, "assets");
    if (fs.existsSync(assetsPath)) {
      const assetFiles = fs.readdirSync(assetsPath);
      console.log(`[serveStatic] Contents of assets/: ${assetFiles.join(", ")}`);
    } else {
      console.warn(`[serveStatic] No assets/ directory found in dist/`);
    }
  } catch (err) {
    console.error(`[serveStatic] Failed to read build directory:`, err);
  }
  log(`Serving static files from: ${clientBuildPath}`);
  app2.use((req, res, next) => {
    if (req.path.includes(".") && !req.path.endsWith(".html")) {
      console.log(`[Static Check] Request potentially for static file: ${req.path}`);
    }
    if (req.path.startsWith("/assets/")) {
      console.log(`[Static Check] Request for asset: ${req.path}`);
    }
    next();
  });
  app2.use(express.static(clientBuildPath, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".js")) {
        res.setHeader("Content-Type", "application/javascript");
      }
    }
  }));
  app2.get("*", (req, res) => {
    if (!req.path.includes(".")) {
      console.log(`[Fallback Route] Serving index.html for request: ${req.originalUrl}`);
      const indexPath = path2.join(clientBuildPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath, (err) => {
          if (err) {
            console.error(`Error sending index.html:`, err);
            res.status(500).send("Error loading app.");
          } else {
            console.log(`[Fallback Route] Sent index.html for ${req.originalUrl}`);
          }
        });
      } else {
        console.error(`index.html not found at ${indexPath}`);
        res.status(404).send("App entry not found.");
      }
    } else {
      console.log(`[Fallback Route] Skipping index.html for static file: ${req.originalUrl}`);
      res.status(404).send("File not found.");
    }
  });
}

// server/index.ts
import { createServer as createServer2 } from "http";
var app = express2();
var healthApp = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    console.error("ERREUR NON G\xC9R\xC9E:", err);
    console.error("Stack trace:", err.stack);
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    const responseBody = {
      message,
      // Inclure les détails techniques seulement en développement
      ...process.env.NODE_ENV !== "production" && {
        error: err.toString(),
        stack: err.stack
      }
    };
    res.status(status).json(responseBody);
    if (process.env.NODE_ENV !== "production") {
      throw err;
    }
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5e3;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
  healthApp.get("/health", (req, res) => {
    res.status(200).send("OK");
  });
  if (process.env.NODE_ENV === "production") {
    const healthServer = createServer2(healthApp);
    healthServer.listen(8e3, "0.0.0.0", () => {
      log("Health check server running on port 8000");
    });
  }
})();
