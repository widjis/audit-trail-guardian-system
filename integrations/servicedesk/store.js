import sql from 'mssql';
import { randomUUID } from 'node:crypto';
import { Hold } from './source.js';

export async function createStore(env) {
  const pool=await new sql.ConnectionPool({server:env.DB_HOST,port:Number(env.DB_PORT||1433),database:env.DB_NAME,
    user:env.DB_USER,password:env.DB_PASSWORD,options:{encrypt:env.DB_ENCRYPT==='true',
      trustServerCertificate:env.DB_TRUST_SERVER_CERTIFICATE==='true',...(env.DB_INSTANCE?{instanceName:env.DB_INSTANCE}:{})},
    pool:{max:2,min:0,idleTimeoutMillis:30000},connectionTimeout:10000,requestTimeout:15000}).connect();
  const lookup=async requestId => (await pool.request().input('request',sql.VarChar(20),requestId)
    .query('SELECT * FROM dbo.servicedesk_bridge_jobs WHERE request_id=@request')).recordset[0];
  return {
    close:()=>pool.close(),
    lookup,
    async gradeActive(name) { return (await pool.request().input('name',sql.VarChar(255),name)
      .query('SELECT name FROM dbo.position_grades WHERE is_active=1 AND name=@name')).recordset.some(r=>r.name===name); },
    async prepare(payload,hash,evidence) {
      const tx=new sql.Transaction(pool);await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
      try {
        const found=(await new sql.Request(tx).input('request',sql.VarChar(20),payload.request_id)
          .query('SELECT * FROM dbo.servicedesk_bridge_jobs WITH(UPDLOCK,HOLDLOCK) WHERE request_id=@request')).recordset[0];
        if(found) {
          if(found.revision!==payload.revision || found.payload_hash!==hash) throw new Hold('EXISTING_REQUEST_REQUIRES_REVISION_REVIEW');
          await tx.commit();return found;
        }
        await new sql.Request(tx).input('request',sql.VarChar(20),payload.request_id).input('revision',sql.Int,payload.revision)
          .input('hash',sql.Char(64),hash).input('payload',sql.NVarChar(sql.MAX),JSON.stringify(payload))
          .input('evidence',sql.NVarChar(sql.MAX),JSON.stringify(evidence))
          .query(`INSERT INTO dbo.servicedesk_bridge_jobs(request_id,revision,payload_hash,payload_json,evidence_json)
            VALUES(@request,@revision,@hash,@payload,@evidence)`);
        await tx.commit();return lookup(payload.request_id);
      } catch(error) {await tx.rollback();throw error;}
    },
    async document(requestId,file,hash) {
      await pool.request().input('request',sql.VarChar(20),requestId).input('file',sql.NVarChar(1000),file).input('hash',sql.Char(64),hash)
        .query(`UPDATE dbo.servicedesk_bridge_jobs SET document_path=@file,document_hash=@hash,updated_at=SYSUTCDATETIME()
          WHERE request_id=@request AND processing_status='PREPARED'`);
    },
    async claimUpload(requestId) {
      return (await pool.request().input('request',sql.VarChar(20),requestId).query(`UPDATE dbo.servicedesk_bridge_jobs
        SET processing_status='UPLOAD_IN_FLIGHT',updated_at=SYSUTCDATETIME()
        WHERE request_id=@request AND processing_status='PREPARED' AND document_hash IS NOT NULL`)).rowsAffected[0]===1;
    },
    async attachment(requestId,attachmentId) {
      await pool.request().input('request',sql.VarChar(20),requestId).input('attachment',sql.VarChar(20),attachmentId)
        .query(`UPDATE dbo.servicedesk_bridge_jobs SET attachment_id=@attachment,processing_status='ATTACHED',updated_at=SYSUTCDATETIME()
          WHERE request_id=@request AND processing_status IN ('PREPARED','UPLOAD_IN_FLIGHT','ATTACHED')`);
    },
    async promote(payload,hash,file,docHash) {
      const tx=new sql.Transaction(pool);await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
      try {
        const job=(await new sql.Request(tx).input('request',sql.VarChar(20),payload.request_id)
          .query('SELECT * FROM dbo.servicedesk_bridge_jobs WITH(UPDLOCK,HOLDLOCK) WHERE request_id=@request')).recordset[0];
        if(job?.processing_status==='COMPLETE') {await tx.commit();return job.hire_id;}
        if(job?.processing_status!=='ATTACHED'||job.payload_hash!==hash||job.document_hash!==docHash||job.document_path!==file)
          throw new Hold('JOB_NOT_READY');
        const grade=(await new sql.Request(tx).input('grade',sql.VarChar(255),payload.employee.position_grade)
          .query('SELECT name FROM dbo.position_grades WITH(HOLDLOCK) WHERE name=@grade AND is_active=1')).recordset;
        if(!grade.some(g=>g.name===payload.employee.position_grade)) throw new Hold('GRADE_NOT_ACTIVE');
        // submitted_by is an FK to local users, not a ServiceDesk display name.
        // Keep it NULL until an explicit local identity mapping exists. The TA
        // identity remains in the immutable source payload/evidence and SRF.
        const hireId=randomUUID(),p=payload.employee;
        await new sql.Request(tx).input('id',sql.NVarChar(100),hireId).input('name',sql.NVarChar(250),p.name)
          .input('title',sql.NVarChar(250),p.title).input('grade',sql.NVarChar(250),p.position_grade)
          .input('department',sql.NVarChar(250),p.department_name).input('manager',sql.NVarChar(250),p.direct_manager_name)
          .input('date',sql.Date,p.join_date).input('mailing',sql.NVarChar(sql.MAX),payload.requirements.mailing_lists.join(','))
          .input('path',sql.VarChar(1000),file).input('document',sql.VarChar(250),file.split('/').pop())
          .input('remarks',sql.NVarChar(sql.MAX),`Ready for ICT Processing | ServiceDesk #${payload.request_id} revision ${payload.revision}. Requirements and approval evidence retained in SRF. No provisioning performed.`)
          .query(`INSERT INTO dbo.hires(id,name,title,position_grade,department,direct_report,on_site_date,mailing_list,
            account_creation_status,license_assigned,status_srf,microsoft_365_license,laptop_ready,
            srf_document_path,srf_document_name,srf_document_uploaded_at,remarks,workflow_status,submitted_by,submitted_at)
            VALUES(@id,@name,@title,@grade,@department,@manager,@date,@mailing,
              'Pending',0,1,'None','Pending',@path,@document,GETDATE(),@remarks,'approved',NULL,GETDATE())`);
        await new sql.Request(tx).input('id',sql.NVarChar(100),randomUUID()).input('hire',sql.NVarChar(100),hireId)
          .input('details',sql.NVarChar(sql.MAX),JSON.stringify({request_id:payload.request_id,revision:payload.revision,payload_hash:hash,document_hash:docHash,attachment_id:job.attachment_id}))
          .query(`INSERT INTO dbo.audit_logs(id,new_hire_id,action_type,status,message,details,performed_by)
            VALUES(@id,@hire,'ServiceDesk Intake','Success','Ready for ICT Processing',@details,'ServiceDesk integration')`);
        await new sql.Request(tx).input('request',sql.VarChar(20),payload.request_id).input('hire',sql.NVarChar(100),hireId)
          .query(`UPDATE dbo.servicedesk_bridge_jobs SET hire_id=@hire,processing_status='COMPLETE',updated_at=SYSUTCDATETIME() WHERE request_id=@request`);
        await tx.commit();return hireId;
      } catch(error) {await tx.rollback();throw error;}
    },
  };
}
