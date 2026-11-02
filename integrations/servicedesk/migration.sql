-- Additive bridge state only. Existing hires and approvals remain unchanged.
IF OBJECT_ID('dbo.servicedesk_bridge_jobs','U') IS NULL
BEGIN
  CREATE TABLE dbo.servicedesk_bridge_jobs (
    request_id VARCHAR(20) NOT NULL PRIMARY KEY,
    revision INT NOT NULL,
    payload_hash CHAR(64) NOT NULL,
    payload_json NVARCHAR(MAX) NOT NULL CHECK(ISJSON(payload_json)=1),
    evidence_json NVARCHAR(MAX) NOT NULL CHECK(ISJSON(evidence_json)=1),
    processing_status VARCHAR(40) NOT NULL DEFAULT 'PREPARED',
    document_path NVARCHAR(1000) NULL,
    document_hash CHAR(64) NULL,
    attachment_id VARCHAR(20) NULL,
    hire_id NVARCHAR(100) NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;
