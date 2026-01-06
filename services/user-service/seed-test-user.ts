import { PrismaClient } from './src/generated/prisma';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
    const email = 'test@grahvani.com';
    // We need to match the ID from Auth if possible, but for this test, we can just create it with a new ID if it doesn't exist.
    // Actually, the email is unique, so we can use that.

    console.log('--- Creating User Service Profile ---');

    const existingUser = await prisma.user.findUnique({
        where: { email }
    });

    if (existingUser) {
        console.log('User profile already exists.');
    } else {
        // Generate the same tenantId or a new one
        const tenantId = uuidv4();

        const user = await prisma.user.create({
            data: {
                id: uuidv4(), // In production this would match the Auth User ID
                email,
                name: 'Test Business User',
                tenantId,
                role: 'user',
                status: 'active',
                isVerified: true,
                emailVerified: true,
                displayName: 'Test User',
            }
        });

        console.log('User Profile Created:', user.id);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
