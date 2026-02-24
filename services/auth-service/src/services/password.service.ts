// Password Service - Complete Implementation per LLD
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { getPrismaClient } from "../config/database";
import { getRedisClient } from "../config/redis";
import { SessionService } from "./session.service";
import { TokenService } from "./token.service";
import { EventPublisher } from "./event.publisher";
import { RequestMetadata } from "./auth.service";
import { logger } from "../config/logger";
import { config } from "../config";
import {
  ForgotPasswordInput,
  ResetPasswordInput,
  ChangePasswordInput,
} from "../validators/auth.validator";
import { NotFoundError, InvalidTokenError, InvalidCredentialsError } from "../errors/auth.errors";

export class PasswordService {
  private prisma = getPrismaClient();
  private redis = getRedisClient();
  private sessionService = new SessionService();
  private tokenService = new TokenService();
  private eventPublisher = new EventPublisher();

  /**
   * Initiate password reset flow
   * Always returns success to prevent email enumeration
   */
  async forgotPassword(data: ForgotPasswordInput): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    // Always succeed to prevent email enumeration
    if (!user) {
      logger.info({ email: data.email }, "Password reset requested for non-existent email");
      return;
    }

    // Check rate limit (max 3 per hour)
    const rateKey = `pwd_reset:${user.id}`;
    const attempts = await this.redis.incr(rateKey);
    if (attempts === 1) {
      await this.redis.expire(rateKey, 3600); // 1 hour
    }
    if (attempts > 3) {
      logger.warn({ userId: user.id }, "Password reset rate limit exceeded");
      return;
    }

    // Generate reset token
    const token = await this.generateResetToken(user.id);

    // Store token in database
    const tokenHash = this.hashToken(token);
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    // Publish event for notification service to send email
    await this.eventPublisher.publish("auth.password_reset_requested", {
      userId: user.id,
      email: user.email,
      name: user.name,
      token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });

    logger.info({ userId: user.id }, "Password reset token generated");
  }

  /**
   * Reset password with token
   */
  async resetPassword(data: ResetPasswordInput, metadata: RequestMetadata): Promise<void> {
    // Find valid token
    const tokenHash = this.hashToken(data.token);
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!resetToken) {
      throw new InvalidTokenError();
    }

    if (resetToken.used) {
      throw new InvalidTokenError();
    }

    if (resetToken.expiresAt < new Date()) {
      throw new InvalidTokenError();
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(data.password, config.bcrypt.rounds);

    // Update password and mark token as used
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true, usedAt: new Date() },
      }),
    ]);

    // Revoke all sessions (security measure)
    await this.sessionService.revokeAllSessions(resetToken.userId);

    // Publish event
    await this.eventPublisher.publish("auth.password_reset", {
      userId: resetToken.userId,
      metadata: {
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        deviceType: metadata.deviceType,
        deviceName: metadata.deviceName,
      },
    });

    logger.info({ userId: resetToken.userId }, "Password reset successfully");
  }

  /**
   * Change password for authenticated user
   */
  async changePassword(
    userId: string,
    data: ChangePasswordInput,
    currentSessionId: string,
    metadata: RequestMetadata,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError("User");
    }

    // Verify current password
    if (!user.passwordHash) {
      throw new InvalidCredentialsError();
    }

    const isValid = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!isValid) {
      throw new InvalidCredentialsError();
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(data.newPassword, config.bcrypt.rounds);

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Revoke other sessions (keep current)
    await this.sessionService.revokeOtherSessions(userId, currentSessionId);

    // Publish event
    await this.eventPublisher.publish("auth.password_changed", {
      userId,
      metadata: {
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        deviceType: metadata.deviceType,
        deviceName: metadata.deviceName,
      },
    });

    logger.info({ userId }, "Password changed successfully");
  }

  // ============ PRIVATE METHODS ============

  private async generateResetToken(_userId: string): Promise<string> {
    const buffer = crypto.randomBytes(32);
    return buffer.toString("hex");
  }

  private hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }
}
