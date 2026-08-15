-- PostgreSQL requires this enum value to be committed before a later migration uses it.
ALTER TYPE "StaffRole" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
