import { PrismaClient } from './src/generated/prisma';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
    const email = 'naveenmotika143@gmail.com';
    const password = 'Naveen@143';
    const tenantId = uuidv4();

    console.log('--- Creating Test User ---');

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
        where: { email }
    });

    if (existingUser) {
        console.log('User already exists, updating status...');
        await prisma.user.update({
            where: { id: existingUser.id },
            data: {
                status: 'active',
                emailVerified: true,
                emailVerifiedAt: new Date()
            }
        });
        console.log('User updated successfully.');
    } else {
        const passwordHash = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                email,
                passwordHash,
                name: 'Test Business User',
                tenantId,
                role: 'user',
                status: 'active',
                emailVerified: true,
                emailVerifiedAt: new Date(),
                metadata: { source: 'test-seed' }
            }
        });

        console.log('Test User Created:', user.id);
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
