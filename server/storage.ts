import {
  users, User, InsertUser,
  profileMedia, ProfileMedia, InsertProfileMedia,
  events, Event, InsertEvent,
  trocAds, TrocAd, InsertTrocAd,
  messages, Message, InsertMessage,
  sessions, Session, InsertSession
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;
  getUsers(options?: { isApproved?: boolean }): Promise<User[]>;

  // ProfileMedia operations
  getProfileMedia(userId: number): Promise<ProfileMedia[]>;
  createProfileMedia(media: InsertProfileMedia): Promise<ProfileMedia>;
  deleteProfileMedia(id: number): Promise<boolean>;

  // Event operations
  getEvent(id: number): Promise<Event | undefined>;
  getEvents(limit?: number): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: number, eventData: Partial<Event>): Promise<Event | undefined>;
  deleteEvent(id: number): Promise<boolean>;

  // TrocAd operations
  getTrocAd(id: number): Promise<TrocAd | undefined>;
  getTrocAds(options?: { category?: string, limit?: number }): Promise<TrocAd[]>;
  createTrocAd(ad: InsertTrocAd): Promise<TrocAd>;
  updateTrocAd(id: number, adData: Partial<TrocAd>): Promise<TrocAd | undefined>;
  deleteTrocAd(id: number): Promise<boolean>;

  // Message operations
  getMessage(id: number): Promise<Message | undefined>;
  getMessages(userId: number): Promise<Message[]>;
  getConversation(user1Id: number, user2Id: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessageAsRead(id: number): Promise<boolean>;

  // Session operations
  createSession(session: InsertSession): Promise<Session>;
  getSessionById(id: string): Promise<Session | undefined>;
  deleteSession(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private profileMedia: Map<number, ProfileMedia>;
  private events: Map<number, Event>;
  private trocAds: Map<number, TrocAd>;
  private messages: Map<number, Message>;
  private sessions: Map<string, Session>;
  
  private userIdCounter: number;
  private profileMediaIdCounter: number;
  private eventIdCounter: number;
  private trocAdIdCounter: number;
  private messageIdCounter: number;

  constructor() {
    this.users = new Map();
    this.profileMedia = new Map();
    this.events = new Map();
    this.trocAds = new Map();
    this.messages = new Map();
    this.sessions = new Map();
    
    this.userIdCounter = 1;
    this.profileMediaIdCounter = 1;
    this.eventIdCounter = 1;
    this.trocAdIdCounter = 1;
    this.messageIdCounter = 1;
    
    // Create admin user
    const adminUser: User = {
      id: this.userIdCounter++,
      username: "admin",
      password: "admin123", // In a real app, this would be hashed
      email: "admin@dam.org",
      firstName: "Admin",
      lastName: "DAM",
      profileImage: undefined,
      bio: "DAM Administrator",
      discipline: "Administration",
      location: "Montreal",
      website: undefined,
      socialMedia: {},
      cv: undefined,
      isApproved: true,
      isAdmin: true,
      createdAt: new Date(),
    };
    
    this.users.set(adminUser.id, adminUser);
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase(),
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase(),
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { 
      ...insertUser, 
      id, 
      isApproved: false, 
      isAdmin: false, 
      createdAt: new Date() 
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getUsers(options?: { isApproved?: boolean }): Promise<User[]> {
    let users = Array.from(this.users.values());
    
    if (options?.isApproved !== undefined) {
      users = users.filter(user => user.isApproved === options.isApproved);
    }
    
    return users;
  }

  // ProfileMedia operations
  async getProfileMedia(userId: number): Promise<ProfileMedia[]> {
    return Array.from(this.profileMedia.values()).filter(
      (media) => media.userId === userId,
    );
  }

  async createProfileMedia(insertMedia: InsertProfileMedia): Promise<ProfileMedia> {
    const id = this.profileMediaIdCounter++;
    const media: ProfileMedia = { ...insertMedia, id, createdAt: new Date() };
    this.profileMedia.set(id, media);
    return media;
  }

  async deleteProfileMedia(id: number): Promise<boolean> {
    return this.profileMedia.delete(id);
  }

  // Event operations
  async getEvent(id: number): Promise<Event | undefined> {
    return this.events.get(id);
  }

  async getEvents(limit?: number): Promise<Event[]> {
    let events = Array.from(this.events.values());
    
    // Sort by event date (newest first) - changed to descending order
    events = events.sort((a, b) => b.eventDate.getTime() - a.eventDate.getTime());
    
    if (limit) {
      events = events.slice(0, limit);
    }
    
    return events;
  }

  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const id = this.eventIdCounter++;
    const event: Event = { ...insertEvent, id, createdAt: new Date() };
    this.events.set(id, event);
    return event;
  }

  async updateEvent(id: number, eventData: Partial<Event>): Promise<Event | undefined> {
    const event = this.events.get(id);
    if (!event) return undefined;
    
    const updatedEvent = { ...event, ...eventData };
    this.events.set(id, updatedEvent);
    return updatedEvent;
  }

  async deleteEvent(id: number): Promise<boolean> {
    return this.events.delete(id);
  }

  // TrocAd operations
  async getTrocAd(id: number): Promise<TrocAd | undefined> {
    return this.trocAds.get(id);
  }

  async getTrocAds(options?: { category?: string, limit?: number }): Promise<TrocAd[]> {
    let ads = Array.from(this.trocAds.values());
    
    if (options?.category) {
      ads = ads.filter(ad => ad.category === options.category);
    }
    
    // Sort by created date (newest first)
    ads = ads.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    if (options?.limit) {
      ads = ads.slice(0, options.limit);
    }
    
    return ads;
  }

  async createTrocAd(insertAd: InsertTrocAd): Promise<TrocAd> {
    const id = this.trocAdIdCounter++;
    const ad: TrocAd = { ...insertAd, id, createdAt: new Date() };
    this.trocAds.set(id, ad);
    return ad;
  }

  async updateTrocAd(id: number, adData: Partial<TrocAd>): Promise<TrocAd | undefined> {
    const ad = this.trocAds.get(id);
    if (!ad) return undefined;
    
    const updatedAd = { ...ad, ...adData };
    this.trocAds.set(id, updatedAd);
    return updatedAd;
  }

  async deleteTrocAd(id: number): Promise<boolean> {
    return this.trocAds.delete(id);
  }

  // Message operations
  async getMessage(id: number): Promise<Message | undefined> {
    return this.messages.get(id);
  }

  async getMessages(userId: number): Promise<Message[]> {
    return Array.from(this.messages.values()).filter(
      message => message.senderId === userId || message.receiverId === userId
    );
  }

  async getConversation(user1Id: number, user2Id: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(
        message => 
          (message.senderId === user1Id && message.receiverId === user2Id) ||
          (message.senderId === user2Id && message.receiverId === user1Id)
      )
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.messageIdCounter++;
    const message: Message = { 
      ...insertMessage, 
      id, 
      isRead: false, 
      createdAt: new Date() 
    };
    this.messages.set(id, message);
    return message;
  }

  async markMessageAsRead(id: number): Promise<boolean> {
    const message = this.messages.get(id);
    if (!message) return false;
    
    message.isRead = true;
    this.messages.set(id, message);
    return true;
  }

  // Session operations
  async createSession(session: InsertSession): Promise<Session> {
    this.sessions.set(session.id, session as Session);
    return session as Session;
  }

  async getSessionById(id: string): Promise<Session | undefined> {
    return this.sessions.get(id);
  }

  async deleteSession(id: string): Promise<boolean> {
    return this.sessions.delete(id);
  }
}

import { DatabaseStorage } from "./database-storage";

// Use the DatabaseStorage implementation instead of MemStorage
export const storage = new DatabaseStorage();
