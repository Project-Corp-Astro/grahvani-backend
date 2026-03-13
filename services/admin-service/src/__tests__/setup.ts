// Test setup
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-at-least-32-characters-long-for-testing";
process.env.DATABASE_URL = "postgresql://mock:mock@localhost:5432/mock";
