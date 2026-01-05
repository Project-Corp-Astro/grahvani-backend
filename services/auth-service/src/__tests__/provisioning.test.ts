import { ProvisioningService } from '../services/provision.service';
import { prismaMock, supabaseAdminMock } from './setup';
import { jest } from '@jest/globals';

describe('ProvisioningService', () => {
    let provisioningService: ProvisioningService;
    const testEmail = 'naveenmotika143@gmail.com';
    const testTenantId = 'tenant-123';

    beforeEach(() => {
        provisioningService = new ProvisioningService();
    });

    describe('provision', () => {
        it('should create a new user and generate an invitation token', async () => {
            // 1. Mock user doesn't exist
            (prismaMock.user.findUnique as any).mockResolvedValue(null);

            // 2. Mock Supabase create user
            const mockSbUser = { id: 'sb-uuid-123', email: testEmail };
            (supabaseAdminMock.auth.admin.createUser as any).mockResolvedValue({
                data: { user: mockSbUser },
                error: null,
            });

            // 3. Mock Prisma user creation
            const mockCreatedUser = {
                id: 'sb-uuid-123',
                email: testEmail,
                status: 'pending_verification',
                tenantId: testTenantId,
                name: 'Naveen Motika',
                role: 'user',
                createdAt: new Date(),
            };
            (prismaMock.user.create as any).mockResolvedValue(mockCreatedUser);

            // 4. Mock Token creation
            (prismaMock.invitationToken.create as any).mockResolvedValue({
                id: 'token-123',
                tokenHash: 'hashed-token',
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                userId: 'sb-uuid-123',
            });

            const result = await provisioningService.provision({
                email: testEmail,
                tenantId: testTenantId,
                name: 'Naveen Motika',
                role: 'user',
            });

            expect(result.email).toBe(testEmail);
            expect(result.status).toBe('invited');
            expect(result.invitationExpiresAt).toBeDefined();
            expect(prismaMock.user.create).toHaveBeenCalled();
        });

        it('should return already_exists if user is already active (idempotency)', async () => {
            const existingUser = {
                id: 'existing-id',
                email: testEmail,
                status: 'active',
                tenantId: testTenantId,
            };
            (prismaMock.user.findUnique as any).mockResolvedValue(existingUser);

            const result = await provisioningService.provision({
                email: testEmail,
                tenantId: testTenantId,
                name: 'Naveen Motika',
            });

            expect(result.status).toBe('already_exists');
            expect(prismaMock.user.create).not.toHaveBeenCalled();
        });
    });

    describe('activate', () => {
        it('should activate a pending user and set their password', async () => {
            const mockToken = {
                id: 'token-123',
                userId: 'user-123',
                expiresAt: new Date(Date.now() + 100000),
                usedAt: null,
                user: { id: 'user-123', email: testEmail, status: 'pending_verification' }
            };

            (prismaMock.invitationToken.findUnique as any).mockResolvedValue(mockToken);

            // Mock Transaction
            (prismaMock.$transaction as any).mockResolvedValue([
                { id: 'user-123', email: testEmail, status: 'active' }, // User update
                { id: 'token-123', usedAt: new Date() } // Token update
            ]);

            const result = await provisioningService.activate({
                token: 'valid-token',
                password: 'NewPassword123!'
            });

            expect(result.success).toBe(true);
            expect(result.email).toBe(testEmail);
        });
    });
});
