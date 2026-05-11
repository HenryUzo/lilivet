process.env.NODE_ENV = "test";
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/lilivet_test?sslmode=disable";
process.env.JWT_SECRET ??= "test-secret-value-that-is-long-enough";
process.env.JWT_ISSUER ??= "lili-vet-backend";
process.env.JWT_AUDIENCE ??= "lili-vet-staff";
