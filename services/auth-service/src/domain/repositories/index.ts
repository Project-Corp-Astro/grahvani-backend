// Repository Interfaces - Domain Layer
// These are contracts that infrastructure layer must implement

import { User, CreateUserData, UpdateUserData } from "../entities/user.entity";
import { Session, CreateSessionData } from "../entities/session.entity";

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(data: CreateUserData): Promise<User>;
  update(id: string, data: UpdateUserData): Promise<User>;
  delete(id: string): Promise<void>;
}

export interface ISessionRepository {
  findById(id: string): Promise<Session | null>;
  findByUserId(userId: string): Promise<Session[]>;
  create(data: CreateSessionData): Promise<Session>;
  revoke(id: string): Promise<void>;
  revokeAllByUser(userId: string): Promise<void>;
  updateActivity(id: string): Promise<void>;
}
