// Schéma temporaire pour production sans imageUrl
import { pgTable, serial, text, integer, timestamp, boolean, uuid, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users (même schéma)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
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

// TROC'DAM - VERSION PRODUCTION SANS imageUrl
export const trocAdsProd = pgTable("troc_ads", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  userId: integer("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTrocAdSchemaProd = createInsertSchema(trocAdsProd)
  .omit({ id: true, createdAt: true });

export type InsertTrocAdProd = z.infer<typeof insertTrocAdSchemaProd>;
export type TrocAdProd = typeof trocAdsProd.$inferSelect;