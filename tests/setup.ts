// Every test process: isolated in-memory DB, deterministic secrets, no real integrations.
process.env.PGLITE_DATA_DIR = "memory://";
process.env.APP_SECRET = "test-secret-not-for-production";
process.env.APP_URL = "http://localhost:3000";
delete process.env.DATABASE_URL;
delete process.env.MANAGER_EMAIL;
delete process.env.EMAIL_PROVIDER;
delete process.env.GEMINI_API_KEY;
delete process.env.PAYME_MERCHANT_ID;
delete process.env.PAYME_SECRET_KEY;
delete process.env.GOOGLE_CLIENT_ID;
delete process.env.GOOGLE_CLIENT_SECRET;
delete process.env.ADMIN_EMAILS;
delete process.env.STAFF_EMAILS;
