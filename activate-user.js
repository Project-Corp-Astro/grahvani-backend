const { PrismaClient } = require('./services/auth-service/src/generated/prisma');
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: "postgresql://postgres:Grahvani%40123@db.gfrpsjodqoxwubwulueh.supabase.co:5432/postgres?schema=app_auth"
        }
    }
});

async function activateUser() {
    const email = 'chandukomera999@gmail.com';
    try {
        console.log(`Activating user: ${email}...`);
        const result = await prisma.user.update({
            where: { email },
            data: {
                status: 'active',
                emailVerified: true
            }
        });
        console.log('Success! Account activated and status set to "active".');
    } catch (error) {
        console.error('Activation failed:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

activateUser();
