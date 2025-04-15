import { pgTable, text, serial, integer, timestamp, json, uuid, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
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
  socialMedia: json("social_media").$type<{
    instagram?: string;
    facebook?: string;
    twitter?: string;
    youtube?: string;
    spotify?: string;
    behance?: string;
    linkedin?: string;
    other?: string;
  }>(),
  cv: text("cv"),
  isApproved: boolean("is_approved").default(false),
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users)
  .omit({ id: true, isApproved: true, isAdmin: true, createdAt: true });

// Extended profile media (videos, music, gallery)
export const profileMedia = pgTable("profile_media", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  mediaType: text("media_type").notNull(), // 'video', 'audio', 'image'
  url: text("url").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProfileMediaSchema = createInsertSchema(profileMedia)
  .omit({ id: true, createdAt: true });

// Events
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  location: text("location").notNull(),
  eventDate: timestamp("event_date").notNull(),
  imageUrl: text("image_url"),
  organizerId: integer("organizer_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEventSchema = createInsertSchema(events)
  .omit({ id: true, createdAt: true });

// TROC'DAM classifieds
export const trocAds = pgTable("troc_ads", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // 'collaboration', 'equipment', 'service', 'event'
  userId: integer("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTrocAdSchema = createInsertSchema(trocAds)
  .omit({ id: true, createdAt: true });

// Messages
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull().references(() => users.id),
  receiverId: integer("receiver_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messages)
  .omit({ id: true, isRead: true, createdAt: true });

// Sessions
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id").notNull().references(() => users.id),
  expiresAt: timestamp("expires_at").notNull(),
});

export const insertSessionSchema = createInsertSchema(sessions);

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertProfileMedia = z.infer<typeof insertProfileMediaSchema>;
export type ProfileMedia = typeof profileMedia.$inferSelect;

export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;

export type InsertTrocAd = z.infer<typeof insertTrocAdSchema>;
export type TrocAd = typeof trocAds.$inferSelect;

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;
