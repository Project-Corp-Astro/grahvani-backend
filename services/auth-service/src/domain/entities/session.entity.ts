// Session Entity - Domain Layer
export interface Session {
  id: string;
  userId: string;
  tokenHash: string;
  refreshTokenHash: string;
  ipAddress: string | null;
  userAgent: string | null;
  deviceType: string | null;
  deviceName: string | null;
  isActive: boolean;
  expiresAt: Date;
  lastActivityAt: Date;
  createdAt: Date;
}

export interface CreateSessionData {
  userId: string;
  tokenHash: string;
  refreshTokenHash: string;
  ipAddress?: string;
  userAgent?: string;
  deviceType?: string;
  deviceName?: string;
  expiresAt: Date;
}
