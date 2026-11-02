-- Manual additive migration. Review and back up before execution. Never auto-run.
-- MSSQL only. HR payloads inherit database access and backup protections.
IF OBJECT_ID('dbo.servicedesk_new_hire_inbox', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.servicedesk_new_hire_inbox (
    id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    source_request_id VARCHAR(20) NOT NULL,
    revision INT NOT NULL CHECK (revision > 0),
    template_id VARCHAR(20) NOT NULL,
    payload_hash CHAR(64) NOT NULL,
    payload_json NVARCHAR(MAX) NOT NULL CHECK (ISJSON(payload_json) = 1),
    processing_status VARCHAR(40) NOT NULL DEFAULT 'RECEIVED_PENDING_VERIFICATION',
    received_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_sdp_new_hire_revision UNIQUE (source_request_id, revision)
  );
END;
