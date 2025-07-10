import { 
  users, type User, type InsertUser,
  profileMedia, type ProfileMedia, type InsertProfileMedia,
  events, type Event, type InsertEvent,
  trocAds, type TrocAd, type InsertTrocAd,
  messages, type Message, type InsertMessage,
  sessions, type Session, type InsertSession
} from "@shared/schema";
import { db } from "./db";
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
      .orderBy(asc(events.eventDate));
    
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
      const [ad] = await db.select().from(trocAds).where(eq(trocAds.id, id));
      return ad;
    } catch (error) {
      console.error('Error in getTrocAd:', error);
      throw error;
    }
  }

  async getTrocAds(options?: { category?: string; limit?: number }): Promise<TrocAd[]> {
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
    } catch (error) {
      console.error('Error in getTrocAds:', error);
      throw error;
    }
  }

  async createTrocAd(ad: InsertTrocAd): Promise<TrocAd> {
    try {
      const [createdAd] = await db.insert(trocAds).values(ad).returning();
      return createdAd;
    } catch (error) {
      console.error('Error in createTrocAd:', error);
      throw error;
    }
  }

  async updateTrocAd(id: number, adData: Partial<TrocAd>): Promise<TrocAd | undefined> {
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