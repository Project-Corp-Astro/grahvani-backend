// Test setup
process.env.NODE_ENV = "test";
// gitleaks:allow
process.env.JWT_SECRET = "testonly-secret-for-testing-32chars";
process.env.DATABASE_URL = "postgresql://mock:mock@localhost:5432/mock";
