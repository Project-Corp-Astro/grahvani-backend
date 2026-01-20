import { clientService } from '../services/client.service';
import { chartService } from '../services/chart.service';
import { clientRepository } from '../repositories/client.repository';
import { chartRepository } from '../repositories/chart.repository';
import { getPrismaClient } from '../config/database';
import { logger } from '../config';

async function testPermanentDeletion() {
    const prisma = getPrismaClient();
    const tenantId = '00000000-0000-0000-0000-000000000000'; // Standard test tenant
    const metadata = {
        userId: '00000000-0000-0000-0000-000000000000',
        ipAddress: '127.0.0.1'
    };

    try {
        logger.info('🚀 Starting Permanent Deletion Test...');

        // 1. Create a Test Client
        const clientData = {
            fullName: 'Deletion Test Client',
            email: `test-delete-${Date.now()}@example.com`,
            phonePrimary: `+91${Math.floor(1000000000 + Math.random() * 9000000000)}`,
            birthDate: '1990-01-01',
            birthTime: '12:00:00',
            birthLatitude: 12.9716,
            birthLongitude: 77.5946,
            birthTimezone: 'Asia/Kolkata'
        };

        const client = await clientService.createClient(tenantId, clientData, metadata);
        const clientId = client.id;
        logger.info({ clientId }, '✅ Created Test Client');

        // 2. Create Related Records
        // A. Saved Chart
        await chartRepository.create(tenantId, {
            clientId,
            chartType: 'D1',
            chartName: 'Test Chart for Deletion',
            chartData: { test: true },
            calculatedAt: new Date(),
            system: 'lahiri'
        });
        logger.info('✅ Created Saved Chart');

        // B. Note
        await prisma.clientNote.create({
            data: {
                tenantId,
                clientId,
                noteContent: 'This note should be deleted'
            }
        });
        logger.info('✅ Created Client Note');

        // 3. Verify they exist
        const chartsBefore = await chartRepository.findByClientId(tenantId, clientId);
        const notesBefore = await prisma.clientNote.findMany({ where: { clientId } });

        if (chartsBefore.length === 0 || notesBefore.length === 0) {
            throw new Error('Pre-deletion verification failed: Records not found');
        }
        logger.info({ charts: chartsBefore.length, notes: notesBefore.length }, '📊 Records exist before deletion');

        // 4. Perform Permanent Deletion
        logger.info('⏳ Triggering Permanent Deletion...');
        await clientService.deleteClient(tenantId, clientId, metadata);
        logger.info('✅ Deletion Command Completed');

        // 5. Verify Cascaded Deletion
        const clientAfter = await prisma.client.findUnique({ where: { id: clientId } });
        const chartsAfter = await prisma.clientSavedChart.findMany({ where: { clientId } });
        const notesAfter = await prisma.clientNote.findMany({ where: { clientId } });

        logger.info('🏁 Final Verification:');
        logger.info({ exists: !!clientAfter }, `Client Still Exists? ${!!clientAfter}`);
        logger.info({ count: chartsAfter.length }, `Charts Remaining: ${chartsAfter.length}`);
        logger.info({ count: notesAfter.length }, `Notes Remaining: ${notesAfter.length}`);

        if (!clientAfter && chartsAfter.length === 0 && notesAfter.length === 0) {
            logger.info('🏆 TEST PASSED: All records permanently deleted via cascade.');
        } else {
            logger.error('❌ TEST FAILED: Residual data found.');
            process.exit(1);
        }

    } catch (error) {
        logger.error({ err: error }, '❌ Test Error');
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

testPermanentDeletion();
