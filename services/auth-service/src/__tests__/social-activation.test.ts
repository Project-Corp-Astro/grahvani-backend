import { AuthService } from '../services/auth.service';
import { prismaMock, supabaseClientMock } from './setup';
import { jest } from '@jest/globals';

describe('AuthService - Social Activation', () => {
    let authService: AuthService;
    const testEmail = 'naveenmotika143@gmail.com';

    beforeEach(() => {
        authService = new AuthService();
    });

    describe('socialLogin', () => {
        it('should automatically activate a pending user when they login with Google', async () => {
            // 1. Mock Supabase getting user from token
            const mockSbUser = {
                id: 'sb-uuid-123',
                email: testEmail,
                app_metadata: { provider: 'google' },
                user_metadata: { full_name: 'Naveen Motika' }
            };
            (supabaseClientMock.auth.getUser as any).mockResolvedValue({
                data: { user: mockSbUser },
                error: null,
            });

            // 2. Mock finding user in our DB (who is currently PENDING)
            const pendingUser = {
                id: 'sb-uuid-123',
                email: testEmail,
                status: 'pending_verification',
                role: 'user',
                tenantId: 'tenant-123',
                createdAt: new Date(),
            };
            (prismaMock.user.findUnique as any).mockResolvedValue(pendingUser);

            // 3. Mock the UPDATE call (the activation)
            (prismaMock.user.update as any).mockResolvedValue({
                ...pendingUser,
                status: 'active'
            });

            // 4. Mock session and token internal methods
            // For this test, we'll cast sub-services to any to mock them easily
            (authService as any).sessionService.createSession = (jest.fn() as any).mockResolvedValue({
                session: { deviceType: 'desktop' },
                sessionId: 'session-123'
            });
            (authService as any).tokenService.generateTokenPair = (jest.fn() as any).mockResolvedValue({
                accessToken: 'access-123',
                refreshToken: 'refresh-123'
            });

            const result = await authService.socialLogin('fake-sb-token', {
                ipAddress: '127.0.0.1',
                userAgent: 'test',
                deviceType: 'desktop'
            });

            // VERIFICATION
            expect(result.user.status).toBe('active');
            expect(prismaMock.user.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: pendingUser.id },
                    data: expect.objectContaining({
                        status: 'active',
                        emailVerified: true
                    })
                })
            );
        });
    });
});
