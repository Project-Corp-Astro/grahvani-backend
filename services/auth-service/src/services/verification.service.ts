// Verification Service - Part of Auth Service
import crypto from 'crypto';
import { PrismaClient } from '../generated/prisma';
import { getPrismaClient } from '../config/database';
import { EventPublisher } from './event.publisher';
import { logger } from '../config/logger';

export class VerificationService {
    private prisma = getPrismaClient();
    private eventPublisher = new EventPublisher();

    /**
     * Generate a new verification token and publish event
     */
    async sendVerificationEmail(userId: string, email: string, name: string): Promise<void> {
        // 1. Generate token
        const token = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        // 2. Set expiry (24 hours)
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        // 3. Store in DB (upsert/delete old ones if any)
        await this.prisma.emailVerificationToken.deleteMany({
            where: { userId }
        });

        await this.prisma.emailVerificationToken.create({
            data: {
                userId,
                tokenHash,
                expiresAt
            }
        });

        // 4. Publish event for Notification Service
        await this.eventPublisher.publish('auth.verification_requested', {
            userId,
            email,
            name,
            token,
            expiresAt: expiresAt.toISOString()
        });

        logger.info({ userId }, 'Verification email event published');
    }

    /**
     * Verify email with token
     */
    async verifyEmail(token: string): Promise<{ userId: string; email: string }> {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        const verificationToken = await this.prisma.emailVerificationToken.findUnique({
            where: { tokenHash },
            include: { user: true }
        });

        if (!verificationToken) {
            throw new Error('Invalid or expired verification token');
        }

        if (verificationToken.usedAt) {
            throw new Error('Token already used');
        }

        if (verificationToken.expiresAt < new Date()) {
            throw new Error('Token expired');
        }

        // Mark as verified
        await this.prisma.$transaction([
            this.prisma.user.update({
                where: { id: verificationToken.userId },
                data: {
                    emailVerified: true,
                    emailVerifiedAt: new Date(),
                    status: 'active'
                }
            }),
            this.prisma.emailVerificationToken.update({
                where: { id: verificationToken.id },
                data: { usedAt: new Date() }
            })
        ]);

        logger.info({ userId: verificationToken.userId }, 'Email verified successfully');

        return {
            userId: verificationToken.userId,
            email: verificationToken.user.email
        };
    }
}
