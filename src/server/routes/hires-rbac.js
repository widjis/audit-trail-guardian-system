import express from 'express';
import { executeQuery } from '../utils/dbConnection.js';
import logger from '../utils/logger.js';
import RBACService from '../services/rbac-service.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Initialize RBAC service (will be set when database connection is available)
let rbacService = null;

// Middleware to initialize RBAC service
const initRBAC = async (req, res, next) => {
  try {
    if (!rbacService) {
      const { getDbConnection } = await import('../utils/dbConnection.js');
      const db = await getDbConnection();
      rbacService = new RBACService(db);
    }
    req.rbac = rbacService;
    next();
  } catch (error) {
    logger.error('RBAC', 'Failed to initialize RBAC service:', error);
    // Fall back to legacy behavior
    next();
  }
};

// Middleware to check RBAC permissions
const checkPermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.rbac) {
        // RBAC not available, use legacy auth
        return next();
      }

      const userRole = req.user?.role || 'user';
      
      if (!req.rbac.hasPermission(userRole, permission)) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          required: permission,
          userRole: userRole
        });
      }
      
      next();
    } catch (error) {
      logger.error('RBAC', 'Permission check error:', error);
      next(); // Fall back to legacy behavior
    }
  };
};

// Apply auth and RBAC middleware to all routes
router.use(requireAuth);
router.use(initRBAC);

/**
 * GET /api/hires-rbac - Get hires based on user role and permissions
 */
router.get('/', checkPermission('hires.view_own'), async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    let query;
    let params = {};
    
    if (!req.rbac || req.rbac.hasPermission(userRole, 'hires.view_all')) {
      // Admin, HRIS SPV, IT Superintendent can view all hires
      query = `
        SELECT 
          h.*,
          submitter.username as submitted_by_username,
          CASE 
            WHEN h.workflow_status IS NULL THEN 'approved'
            ELSE h.workflow_status
          END as current_workflow_status
        FROM hires h
        LEFT JOIN users submitter ON h.submitted_by = submitter.id
        ORDER BY h.created_at DESC
      `;
    } else if (req.rbac.hasPermission(userRole, 'hires.view_assigned')) {
      // IT Support can view hires assigned to them (in final stages)
      query = `
        SELECT 
          h.*,
          submitter.username as submitted_by_username,
          CASE 
            WHEN h.workflow_status IS NULL THEN 'approved'
            ELSE h.workflow_status
          END as current_workflow_status
        FROM hires h
        LEFT JOIN users submitter ON h.submitted_by = submitter.id
        WHERE h.workflow_status IN ('it_review', 'approved') OR h.workflow_status IS NULL
        ORDER BY h.created_at DESC
      `;
    } else {
      // Recruiters can only view their own hires
      query = `
        SELECT 
          h.*,
          submitter.username as submitted_by_username,
          CASE 
            WHEN h.workflow_status IS NULL THEN 'approved'
            ELSE h.workflow_status
          END as current_workflow_status
        FROM hires h
        LEFT JOIN users submitter ON h.submitted_by = submitter.id
        WHERE h.submitted_by = @userId OR h.submitted_by IS NULL
        ORDER BY h.created_at DESC
      `;
      params.userId = userId;
    }

    const result = await executeQuery(query, params);
    
    // Add workflow information if available
    const hiresWithWorkflow = await Promise.all(
      result.map(async (hire) => {
        if (req.rbac && await req.rbac.isWorkflowEnabled()) {
          const workflowStatus = await req.rbac.getWorkflowStatus(hire.id);
          return { ...hire, workflow_steps: workflowStatus };
        }
        return hire;
      })
    );
    
    res.json(hiresWithWorkflow);
  } catch (error) {
    logger.error('Hires RBAC', 'Error fetching hires:', error);
    res.status(500).json({ error: 'Failed to fetch hires' });
  }
});

/**
 * GET /api/hires-rbac/pending-approvals - Get pending approvals for current user
 */
router.get('/pending-approvals', checkPermission('hires.approve'), async (req, res) => {
  try {
    if (!req.rbac) {
      return res.json([]);
    }

    const userId = req.user.id;
    const userRole = req.user.role;
    
    const pendingApprovals = await req.rbac.getPendingApprovals(userId, userRole);
    res.json(pendingApprovals);
  } catch (error) {
    logger.error('Hires RBAC', 'Error fetching pending approvals:', error);
    res.status(500).json({ error: 'Failed to fetch pending approvals' });
  }
});

/**
 * GET /api/hires-rbac/:id - Get specific hire with access control
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Check access permissions
    if (req.rbac && !(await req.rbac.canAccessHire(userId, userRole, id))) {
      return res.status(403).json({ error: 'Access denied to this hire record' });
    }
    
    const query = `
      SELECT 
        h.*,
        submitter.username as submitted_by_username,
        CASE 
          WHEN h.workflow_status IS NULL THEN 'approved'
          ELSE h.workflow_status
        END as current_workflow_status
      FROM hires h
      LEFT JOIN users submitter ON h.submitted_by = submitter.id
      WHERE h.id = @id
    `;
    
    const result = await executeQuery(query, { id });
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Hire not found' });
    }
    
    const hire = result[0];
    
    // Add workflow information if available
    if (req.rbac && await req.rbac.isWorkflowEnabled()) {
      hire.workflow_steps = await req.rbac.getWorkflowStatus(id);
    }
    
    res.json(hire);
  } catch (error) {
    logger.error('Hires RBAC', 'Error fetching hire:', error);
    res.status(500).json({ error: 'Failed to fetch hire' });
  }
});

/**
 * POST /api/hires-rbac - Create new hire (Recruiter role)
 */
router.post('/', checkPermission('hires.create'), async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const hireData = req.body;
    
    // Generate ID for new hire
    const hireId = uuidv4();
    
    // Prepare hire data with workflow fields
    const insertData = {
      id: hireId,
      name: hireData.name || '',
      title: hireData.title || '',
      position_grade: hireData.position_grade || '',
      department: hireData.department || '',
      email: hireData.email || '',
      direct_report: hireData.direct_report || '',
      phone_number: hireData.phone_number || '',
      on_site_date: hireData.on_site_date || new Date().toISOString().split('T')[0],
      workflow_status: req.rbac && await req.rbac.isWorkflowEnabled() ? 'draft' : 'approved',
      submitted_by: userId,
      account_creation_status: 'Pending',
      microsoft_365_license: hireData.microsoft_365_license || 'None',
      laptop_ready: 'Pending',
      remarks: hireData.remarks || '',
      note: hireData.note || ''
    };
    
    const query = `
      INSERT INTO hires (
        id, name, title, position_grade, department, email, direct_report, 
        phone_number, on_site_date, workflow_status, submitted_by, 
        account_creation_status, microsoft_365_license, laptop_ready, 
        remarks, note, created_at, updated_at
      ) VALUES (
        @id, @name, @title, @position_grade, @department, @email, @direct_report,
        @phone_number, @on_site_date, @workflow_status, @submitted_by,
        @account_creation_status, @microsoft_365_license, @laptop_ready,
        @remarks, @note, GETDATE(), GETDATE()
      )
    `;
    
    await executeQuery(query, insertData);
    
    logger.info('Hires RBAC', `New hire created: ${hireId} by user ${userId}`);
    
    // Return the created hire
    const createdHire = await executeQuery(
      'SELECT * FROM hires WHERE id = @id', 
      { id: hireId }
    );
    
    res.status(201).json(createdHire[0]);
  } catch (error) {
    logger.error('Hires RBAC', 'Error creating hire:', error);
    res.status(500).json({ error: 'Failed to create hire' });
  }
});

/**
 * POST /api/hires-rbac/:id/submit - Submit hire for approval workflow
 */
router.post('/:id/submit', checkPermission('hires.submit'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    if (!req.rbac || !(await req.rbac.isWorkflowEnabled())) {
      return res.status(400).json({ error: 'Workflow system not available' });
    }
    
    // Check if user can access this hire
    if (!(await req.rbac.canAccessHire(userId, userRole, id))) {
      return res.status(403).json({ error: 'Access denied to this hire record' });
    }
    
    // Check if hire is in draft status
    const hireResult = await executeQuery(
      'SELECT workflow_status FROM hires WHERE id = @id',
      { id }
    );
    
    if (hireResult.length === 0) {
      return res.status(404).json({ error: 'Hire not found' });
    }
    
    if (hireResult[0].workflow_status !== 'draft') {
      return res.status(400).json({ error: 'Hire is not in draft status' });
    }
    
    // Initialize workflow
    const success = await req.rbac.initializeWorkflow(id, userId);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to submit hire for approval' });
    }
    
    logger.info('Hires RBAC', `Hire ${id} submitted for approval by user ${userId}`);
    res.json({ message: 'Hire submitted for approval successfully' });
  } catch (error) {
    logger.error('Hires RBAC', 'Error submitting hire:', error);
    res.status(500).json({ error: 'Failed to submit hire for approval' });
  }
});

/**
 * POST /api/hires-rbac/:id/approve - Approve hire in workflow
 */
router.post('/:id/approve', checkPermission('hires.approve'), async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    if (!req.rbac || !(await req.rbac.isWorkflowEnabled())) {
      return res.status(400).json({ error: 'Workflow system not available' });
    }
    
    await req.rbac.processApproval(id, userId, userRole, 'approve', notes);
    
    logger.info('Hires RBAC', `Hire ${id} approved by user ${userId}`);
    res.json({ message: 'Hire approved successfully' });
  } catch (error) {
    logger.error('Hires RBAC', 'Error approving hire:', error);
    res.status(500).json({ error: error.message || 'Failed to approve hire' });
  }
});

/**
 * POST /api/hires-rbac/:id/reject - Reject hire in workflow
 */
router.post('/:id/reject', checkPermission('hires.approve'), async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason, notes } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    if (!req.rbac || !(await req.rbac.isWorkflowEnabled())) {
      return res.status(400).json({ error: 'Workflow system not available' });
    }
    
    if (!rejectionReason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }
    
    await req.rbac.processApproval(id, userId, userRole, 'reject', notes, rejectionReason);
    
    logger.info('Hires RBAC', `Hire ${id} rejected by user ${userId}`);
    res.json({ message: 'Hire rejected successfully' });
  } catch (error) {
    logger.error('Hires RBAC', 'Error rejecting hire:', error);
    res.status(500).json({ error: error.message || 'Failed to reject hire' });
  }
});

/**
 * PUT /api/hires-rbac/:id - Update hire with role-based restrictions
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const updateData = req.body;
    
    // Check access permissions
    if (req.rbac && !(await req.rbac.canAccessHire(userId, userRole, id))) {
      return res.status(403).json({ error: 'Access denied to this hire record' });
    }
    
    // Check edit permissions
    const canEditAll = !req.rbac || req.rbac.hasPermission(userRole, 'hires.edit');
    const canEditOwn = req.rbac && req.rbac.hasPermission(userRole, 'hires.edit_own');
    
    if (!canEditAll && !canEditOwn) {
      return res.status(403).json({ error: 'Insufficient permissions to edit hire' });
    }
    
    // If user can only edit own hires, verify ownership
    if (!canEditAll && canEditOwn) {
      const ownershipResult = await executeQuery(
        'SELECT submitted_by FROM hires WHERE id = @id',
        { id }
      );
      
      if (ownershipResult.length === 0 || ownershipResult[0].submitted_by !== userId) {
        return res.status(403).json({ error: 'Can only edit your own hire records' });
      }
    }
    
    // Build update query dynamically based on provided fields
    const allowedFields = [
      'name', 'title', 'position_grade', 'department', 'email', 'direct_report',
      'phone_number', 'on_site_date', 'account_creation_status', 'microsoft_365_license',
      'laptop_ready', 'remarks', 'note'
    ];
    
    // Role-based field restrictions
    if (userRole === 'recruiter') {
      // Recruiters can only edit basic information
      const recruiterFields = ['name', 'title', 'position_grade', 'department', 'email', 'direct_report', 'phone_number', 'on_site_date', 'remarks'];
      allowedFields.splice(0, allowedFields.length, ...recruiterFields);
    }
    
    const updateFields = [];
    const updateParams = { id };
    
    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updateFields.push(`${key} = @${key}`);
        updateParams[key] = value;
      }
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    updateFields.push('updated_at = GETDATE()');
    
    const query = `
      UPDATE hires 
      SET ${updateFields.join(', ')}
      WHERE id = @id
    `;
    
    await executeQuery(query, updateParams);
    
    // Return updated hire
    const updatedHire = await executeQuery(
      'SELECT * FROM hires WHERE id = @id',
      { id }
    );
    
    logger.info('Hires RBAC', `Hire ${id} updated by user ${userId}`);
    res.json(updatedHire[0]);
  } catch (error) {
    logger.error('Hires RBAC', 'Error updating hire:', error);
    res.status(500).json({ error: 'Failed to update hire' });
  }
});

/**
 * GET /api/hires-rbac/workflow/status - Get workflow system status
 */
router.get('/workflow/status', async (req, res) => {
  try {
    const isEnabled = req.rbac ? await req.rbac.isWorkflowEnabled() : false;
    const userRole = req.user.role;
    const permissions = req.rbac ? {
      canCreate: req.rbac.hasPermission(userRole, 'hires.create'),
      canApprove: req.rbac.hasPermission(userRole, 'hires.approve'),
      canViewAll: req.rbac.hasPermission(userRole, 'hires.view_all'),
      canEdit: req.rbac.hasPermission(userRole, 'hires.edit')
    } : {};
    
    res.json({
      workflowEnabled: isEnabled,
      userRole: userRole,
      permissions: permissions
    });
  } catch (error) {
    logger.error('Hires RBAC', 'Error getting workflow status:', error);
    res.status(500).json({ error: 'Failed to get workflow status' });
  }
});

export default router;