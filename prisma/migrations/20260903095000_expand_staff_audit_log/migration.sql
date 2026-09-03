ALTER TABLE "StaffAccessAuditLog"
  ADD COLUMN "resourceType" TEXT,
  ADD COLUMN "resourceId" TEXT;

CREATE INDEX "StaffAccessAuditLog_resourceType_resourceId_createdAt_idx"
  ON "StaffAccessAuditLog"("resourceType", "resourceId", "createdAt");

CREATE INDEX "StaffAccessAuditLog_action_createdAt_idx"
  ON "StaffAccessAuditLog"("action", "createdAt");

CREATE OR REPLACE FUNCTION prevent_staff_access_audit_log_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Staff access audit logs are append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER staff_access_audit_log_append_only
BEFORE UPDATE OR DELETE ON "StaffAccessAuditLog"
FOR EACH ROW EXECUTE FUNCTION prevent_staff_access_audit_log_mutation();
