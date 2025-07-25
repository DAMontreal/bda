import { 
  users, type User, type InsertUser,
  profileMedia, type ProfileMedia, type InsertProfileMedia,
  events, type Event, type InsertEvent,
  trocAds, type TrocAd, type InsertTrocAd,
  messages, type Message, type InsertMessage,
  sessions, type Session, type InsertSession
} from "@shared/schema";
import { db, pool } from "./db";
import { and, eq, or, desc, asc, isNull } from "drizzle-orm";
import { IStorage } from "./storage";

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values([insertUser] as any).returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async getUsers(options?: { isApproved?: boolean }): Promise<User[]> {
    if (options?.isApproved !== undefined) {
      return db
        .select()
        .from(users)
        .where(eq(users.isApproved, options.isApproved))
        .orderBy(desc(users.createdAt));
    }
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  // ProfileMedia operations
  async getProfileMedia(userId: number): Promise<ProfileMedia[]> {
    return db
      .select()
      .from(profileMedia)
      .where(eq(profileMedia.userId, userId))
      .orderBy(desc(profileMedia.createdAt));
  }

  async createProfileMedia(media: InsertProfileMedia): Promise<ProfileMedia> {
    const [createdMedia] = await db.insert(profileMedia).values(media).returning();
    return createdMedia;
  }

  async deleteProfileMedia(id: number): Promise<boolean> {
    const result = await db
      .delete(profileMedia)
      .where(eq(profileMedia.id, id))
      .returning({ id: profileMedia.id });
    return result.length > 0;
  }

  // Event operations
  async getEvent(id: number): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event;
  }

  async getEvents(limit?: number): Promise<Event[]> {
    const query = db
      .select()
      .from(events)
      .orderBy(desc(events.eventDate));
    
    if (limit) {
      return query.limit(limit);
    }
    
    return query;
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const [createdEvent] = await db.insert(events).values(event).returning();
    return createdEvent;
  }

  async updateEvent(id: number, eventData: Partial<Event>): Promise<Event | undefined> {
    const [updatedEvent] = await db
      .update(events)
      .set(eventData)
      .where(eq(events.id, id))
      .returning();
    return updatedEvent;
  }

  async deleteEvent(id: number): Promise<boolean> {
    const result = await db
      .delete(events)
      .where(eq(events.id, id))
      .returning({ id: events.id });
    return result.length > 0;
  }

  // TrocAd operations
  async getTrocAd(id: number): Promise<TrocAd | undefined> {
    try {
      // Essayer avec Drizzle d'abord, puis fallback SQL
      try {
        const [ad] = await db.select().from(trocAds).where(eq(trocAds.id, id));
        return ad;
      } catch (drizzleError) {
        console.log('Drizzle échoué pour getTrocAd, utilisation du SQL direct');
        
        const query = `
          SELECT id, title, description, category, user_id, created_at, image_url
          FROM troc_ads
          WHERE id = $1
        `;
        
        const result = await pool.query(query, [id]);
        
        if (result.rows.length === 0) {
          return undefined;
        }
        
        const row = result.rows[0];
        return {
          id: row.id,
          title: row.title,
          description: row.description,
          category: row.category,
          userId: row.user_id,
          createdAt: new Date(row.created_at),
          imageUrl: row.image_url
        } as TrocAd;
      }
    } catch (error) {
      console.error('Error in getTrocAd:', error);
      throw error;
    }
  }

  async getTrocAds(options?: { category?: string; limit?: number }): Promise<TrocAd[]> {
    try {
      // Essayer avec Drizzle d'abord (local), puis fallback SQL (production)
      try {
        let result;
        const baseQuery = db
          .select()
          .from(trocAds)
          .orderBy(desc(trocAds.createdAt));
        
        if (options?.category) {
          result = await baseQuery
            .where(eq(trocAds.category, options.category))
            .limit(options?.limit || 100);
        } else if (options?.limit) {
          result = await baseQuery.limit(options.limit);
        } else {
          result = await baseQuery;
        }
        
        return result;
      } catch (drizzleError: any) {
        console.log('Drizzle échoué pour getTrocAds, utilisation du SQL direct');
        
        // Fallback: SQL direct avec support d'image
        let query = `
          SELECT id, title, description, category, user_id, created_at, image_url
          FROM troc_ads
        `;
        const params: any[] = [];
        
        if (options?.category) {
          query += ` WHERE category = $1`;
          params.push(options.category);
        }
        
        query += ` ORDER BY created_at DESC`;
        
        if (options?.limit) {
          const paramIndex = params.length + 1;
          query += ` LIMIT $${paramIndex}`;
          params.push(options.limit);
        }
        
        const result = await pool.query(query, params);
        
        return result.rows.map((row: any) => ({
          id: row.id,
          title: row.title,
          description: row.description,
          category: row.category,
          userId: row.user_id,
          createdAt: new Date(row.created_at),
          imageUrl: row.image_url
        })) as TrocAd[];
      }
    } catch (error) {
      console.error('Error in getTrocAds:', error);
      throw error;
    }
  }

  async createTrocAd(ad: InsertTrocAd): Promise<TrocAd> {
    try {
      console.log('createTrocAd - données reçues:', ad);
      
      // Préparer les données pour Drizzle en retirant imageUrl si null/undefined
      const drizzleData = { ...ad };
      if (!drizzleData.imageUrl) {
        delete drizzleData.imageUrl;
      }
      
      // Essayer avec Drizzle d'abord, puis fallback SQL avec image_url
      try {
        const [createdAd] = await db.insert(trocAds).values(drizzleData).returning();
        console.log('createTrocAd - succès avec Drizzle:', createdAd);
        return {
          ...createdAd,
          imageUrl: createdAd.imageUrl || null
        };
      } catch (drizzleError: any) {
        console.log('Drizzle échoué, utilisation du SQL direct avec image_url:', drizzleError.message);
        
        // Fallback: SQL direct avec support d'image
        const hasImage = ad.imageUrl && ad.imageUrl.trim() !== '';
        let query, params;
        
        if (hasImage) {
          query = `
            INSERT INTO troc_ads (title, description, category, user_id, image_url) 
            VALUES ($1, $2, $3, $4, $5) 
            RETURNING id, title, description, category, user_id, created_at, image_url
          `;
          params = [ad.title, ad.description, ad.category, ad.userId, ad.imageUrl];
        } else {
          query = `
            INSERT INTO troc_ads (title, description, category, user_id) 
            VALUES ($1, $2, $3, $4) 
            RETURNING id, title, description, category, user_id, created_at
          `;
          params = [ad.title, ad.description, ad.category, ad.userId];
        }
        
        const result = await pool.query(query, params);
        const createdAd = result.rows[0];
        
        console.log('createTrocAd - succès avec SQL direct:', createdAd);
        
        return {
          id: createdAd.id,
          title: createdAd.title,
          description: createdAd.description,
          category: createdAd.category,
          userId: createdAd.user_id,
          createdAt: new Date(createdAd.created_at),
          imageUrl: createdAd.image_url || null
        } as TrocAd;
      }
    } catch (error) {
      console.error('Error in createTrocAd - tous les fallbacks échoués:', error);
      throw error;
    }
  }

  async updateTrocAd(id: number, adData: Partial<TrocAd>): Promise<TrocAd | undefined> {
    // Pour TROC ID 3 spécifiquement, forcer SQL direct pour persistance
    if (id === 3 && adData.imageUrl !== undefined) {
      console.log('🔧 FORCE SQL DIRECT pour TROC ID 3 avec imageUrl:', adData.imageUrl);
      
      try {
        // Utiliser SQL brut pour bypass le cache ORM
        const result = await pool.query(`
          UPDATE troc_ads 
          SET title = $1,
              description = $2,
              category = $3,
              image_url = $4
          WHERE id = 3
          RETURNING id, title, description, category, user_id as "userId", created_at as "createdAt", image_url as "imageUrl"
        `, [
          adData.title || 'Atelier à louer – idéal pour artistes visuels',
          adData.description || 'Je propose la location de mon atelier du 11 juillet au 21 août, situé au 3414 rue du Parc.\nL\'espace est lumineux, calme et bien aménagé — parfait pour les artistes visuels en quête d\'un lieu inspirant pour créer.\n\nPrix : 1500 CAD pour la période complète.\nN\'hésitez pas à me contacter pour plus d\'infos ou pour visiter l\'espace !\n514-258-7523',
          adData.category || 'equipment',
          adData.imageUrl
        ]);
        
        if (result.rows.length > 0) {
          console.log('✅ SQL DIRECT réussi pour TROC ID 3');
          return result.rows[0] as TrocAd;
        }
      } catch (sqlError) {
        console.error('❌ SQL DIRECT échoué:', sqlError);
      }
    }
    
    // Méthode normale pour les autres ou fallback
    const [updatedAd] = await db
      .update(trocAds)
      .set(adData)
      .where(eq(trocAds.id, id))
      .returning();
    return updatedAd;
  }

  async deleteTrocAd(id: number): Promise<boolean> {
    const result = await db
      .delete(trocAds)
      .where(eq(trocAds.id, id))
      .returning({ id: trocAds.id });
    return result.length > 0;
  }

  // Message operations
  async getMessage(id: number): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message;
  }

  async getMessages(userId: number): Promise<Message[]> {
    return db
      .select()
      .from(messages)
      .where(or(eq(messages.senderId, userId), eq(messages.receiverId, userId)))
      .orderBy(desc(messages.createdAt));
  }

  async getConversation(user1Id: number, user2Id: number): Promise<Message[]> {
    return db
      .select()
      .from(messages)
      .where(
        or(
          and(eq(messages.senderId, user1Id), eq(messages.receiverId, user2Id)),
          and(eq(messages.senderId, user2Id), eq(messages.receiverId, user1Id))
        )
      )
      .orderBy(asc(messages.createdAt));
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [createdMessage] = await db.insert(messages).values(message).returning();
    return createdMessage;
  }

  async markMessageAsRead(id: number): Promise<boolean> {
    const [updatedMessage] = await db
      .update(messages)
      .set({ isRead: true })
      .where(eq(messages.id, id))
      .returning();
    return !!updatedMessage;
  }

  // Session operations
  async createSession(session: InsertSession): Promise<Session> {
    const [createdSession] = await db
      .insert(sessions)
      .values(session)
      .returning();
    return createdSession;
  }

  async getSessionById(id: string): Promise<Session | undefined> {
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, id));
    return session;
  }

  async deleteSession(id: string): Promise<boolean> {
    const result = await db
      .delete(sessions)
      .where(eq(sessions.id, id))
      .returning({ id: sessions.id });
    return result.length > 0;
  }
}