import { randomUUID } from 'node:crypto';

// Lazy connection: importing this module cannot connect or change a database.
// Use a dedicated pool so the legacy SQL logger never prints HR payloads.
let poolPromise;
async function pool() {
  if ((process.env.DB_TYPE || 'mssql') !== 'mssql') throw new Error('MSSQL required');
  if (!poolPromise) poolPromise = (async () => {
    const { default: sql } = await import('mssql');
    const connection = new sql.ConnectionPool({
      server: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 1433),
      database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD,
      options: { encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
        ...(process.env.DB_INSTANCE ? { instanceName: process.env.DB_INSTANCE } : {}) },
      pool: { max: 3, min: 0, idleTimeoutMillis: 30000 },
      connectionTimeout: 10000, requestTimeout: 15000,
    });
    await connection.connect();
    return { connection, sql };
  })().catch(error => { poolPromise = undefined; throw error; });
  return poolPromise;
}

export const serviceDeskInboxStore = {
  async activeGrades() {
    const { connection } = await pool();
    const result = await connection.request().query(
      'SELECT name FROM dbo.position_grades WHERE is_active = 1 ORDER BY sort_order, name'
    );
    return result.recordset.map(r => r.name);
  },
  async accept(payload, hash) {
    const { connection, sql } = await pool();
    const transaction = new sql.Transaction(connection);
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    try {
      const existing = await new sql.Request(transaction)
        .input('request_id', sql.VarChar(20), payload.request_id)
        .input('revision', sql.Int, payload.revision)
        .query(`SELECT id, payload_hash FROM dbo.servicedesk_new_hire_inbox WITH (UPDLOCK, HOLDLOCK)
          WHERE source_request_id = @request_id AND revision = @revision`);
      if (existing.recordset.length) {
        const row = existing.recordset[0];
        await transaction.commit();
        return { id: row.id, duplicate: true, conflict: row.payload_hash !== hash };
      }
      const id = randomUUID();
      await new sql.Request(transaction)
        .input('id', sql.UniqueIdentifier, id)
        .input('request_id', sql.VarChar(20), payload.request_id)
        .input('revision', sql.Int, payload.revision)
        .input('template_id', sql.VarChar(20), payload.template_id)
        .input('hash', sql.Char(64), hash)
        .input('payload', sql.NVarChar(sql.MAX), JSON.stringify(payload))
        .query(`INSERT INTO dbo.servicedesk_new_hire_inbox
          (id, source_request_id, revision, template_id, payload_hash, payload_json)
          VALUES (@id, @request_id, @revision, @template_id, @hash, @payload)`);
      await transaction.commit();
      return { id, duplicate: false, conflict: false };
    } catch (error) {
      try { await transaction.rollback(); } catch { /* original error wins */ }
      throw error;
    }
  },
};
