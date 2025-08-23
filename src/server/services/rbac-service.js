const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

/**
 * Role-Based Access Control Service
 * Handles user roles, permissions, and workflow approvals
 */
class RBACService {
  constructor(db) {
    this.db = db;
    
    // Define role hierarchy and permissions
    this.roles = {
      'admin': {
        name: 'Administrator',
        permissions: ['*'], // Full access
        level: 100
      },
      'it_superintendent': {
        name: 'IT Superintendent',
        permissions: [
          'hires.view_all',
          'hires.approve',
          'hires.reject',
          'workflow.manage',
          'users.view',
          'reports.view'
        ],
        level: 80
      },
      'hris_spv': {
        name: 'HRIS Supervisor',
        permissions: [
          'hires.view_all',
          'hires.approve',
          'hires.reject',
          'hires.edit',
          'workflow.review',
          'reports.view'
        ],
        level: 60
      },
      'it_support': {
        name: 'IT Support',
        permissions: [
          'hires.view_assigned',
          'hires.setup_account',
          'hires.update_status',
          'accounts.create',
          'accounts.manage'
        ],
        level: 40
      },
      'recruiter': {
        name: 'Recruiter',
        permissions: [
          'hires.create',
          'hires.view_own',
          'hires.edit_own',
          'hires.submit',
          'candidates.manage'
        ],
        level: 20
      },
      'user': {
        name: 'User',
        permissions: [
          'hires.view_own'
        ],
        level: 10
      }
    };

    // Define workflow steps
    this.workflowSteps = [
      { name: 'recruiter_submit', order: 1, required_role: 'recruiter', next_role: 'hris_spv' },
      { name: 'hris_spv_approve', order: 2, required_role: 'hris_spv', next_role: 'it_superintendent' },
      { name: 'it_superintendent_approve', order: 3, required_role: 'it_superintendent', next_role: 'it_support' },
      { name: 'it_support_setup', order: 4, required_role: 'it_support', next_role: null }
    ];
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(userRole, permission) {
    try {
      // Admin has all permissions
      if (userRole === 'admin') return true;
      
      // Check if role exists
      if (!this.roles[userRole]) {
        logger.warn('RBAC', `Unknown role: ${userRole}`);
        return false;
      }

      const rolePermissions = this.roles[userRole].permissions;
      
      // Check for wildcard permission
      if (rolePermissions.includes('*')) return true;
      
      // Check for exact permission match
      if (rolePermissions.includes(permission)) return true;
      
      // Check for wildcard pattern match (e.g., 'hires.*' matches 'hires.view')
      return rolePermissions.some(p => {
        if (p.endsWith('*')) {
          const prefix = p.slice(0, -1);
          return permission.startsWith(prefix);
        }
        return false;
      });
    } catch (error) {
      logger.error('RBAC', 'Error checking permission:', error);
      return false;
    }
  }

  /**
   * Get user role level for hierarchy comparison
   */
  getRoleLevel(role) {
    return this.roles[role]?.level || 0;
  }

  /**
   * Check if user can access hire record based on role and ownership
   */
  async canAccessHire(userId, userRole, hireId) {
    try {
      // Admin and supervisors can access all hires
      if (this.hasPermission(userRole, 'hires.view_all')) {
        return true;
      }

      // Check if user can view their own hires
      if (this.hasPermission(userRole, 'hires.view_own')) {
        const result = await this.db.request()
          .input('hireId', hireId)
          .input('userId', userId)
          .query(`
            SELECT COUNT(*) as count 
            FROM hires 
            WHERE id = @hireId AND submitted_by = @userId
          `);
        
        return result.recordset[0].count > 0;
      }

      // IT Support can view assigned hires
      if (this.hasPermission(userRole, 'hires.view_assigned')) {
        // For now, IT Support can view hires in final approval stages
        const result = await this.db.request()
          .input('hireId', hireId)
          .query(`
            SELECT COUNT(*) as count 
            FROM hires 
            WHERE id = @hireId AND workflow_status IN ('it_review', 'approved')
          `);
        
        return result.recordset[0].count > 0;
      }

      return false;
    } catch (error) {
      logger.error('RBAC', 'Error checking hire access:', error);
      return false;
    }
  }

  /**
   * Initialize workflow for a new hire
   */
  async initializeWorkflow(hireId, submittedBy) {
    try {
      const transaction = this.db.transaction();
      await transaction.begin();

      try {
        // Create workflow approval records
        for (const step of this.workflowSteps) {
          await transaction.request()
            .input('id', uuidv4())
            .input('hireId', hireId)
            .input('stepName', step.name)
            .input('stepOrder', step.order)
            .input('status', step.order === 1 ? 'completed' : 'pending')
            .input('approvedBy', step.order === 1 ? submittedBy : null)
            .input('approvedAt', step.order === 1 ? new Date() : null)
            .query(`
              INSERT INTO workflow_approvals 
              (id, hire_id, step_name, step_order, status, approved_by, approved_at)
              VALUES (@id, @hireId, @stepName, @stepOrder, @status, @approvedBy, @approvedAt)
            `);
        }

        // Update hire workflow status
        await transaction.request()
          .input('hireId', hireId)
          .input('submittedBy', submittedBy)
          .query(`
            UPDATE hires 
            SET workflow_status = 'hris_review', 
                submitted_by = @submittedBy,
                submitted_at = GETDATE()
            WHERE id = @hireId
          `);

        await transaction.commit();
        logger.info('RBAC', `Workflow initialized for hire ${hireId}`);
        return true;
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      logger.error('RBAC', 'Error initializing workflow:', error);
      return false;
    }
  }

  /**
   * Process workflow approval
   */
  async processApproval(hireId, userId, userRole, action, notes = null, rejectionReason = null) {
    try {
      // Get current workflow step
      const currentStepResult = await this.db.request()
        .input('hireId', hireId)
        .query(`
          SELECT TOP 1 * FROM workflow_approvals 
          WHERE hire_id = @hireId AND status = 'pending'
          ORDER BY step_order ASC
        `);

      if (currentStepResult.recordset.length === 0) {
        throw new Error('No pending workflow step found');
      }

      const currentStep = currentStepResult.recordset[0];
      const stepConfig = this.workflowSteps.find(s => s.name === currentStep.step_name);

      if (!stepConfig) {
        throw new Error('Invalid workflow step configuration');
      }

      // Check if user has permission to approve this step
      if (!this.hasPermission(userRole, 'hires.approve') || 
          (stepConfig.required_role !== userRole && userRole !== 'admin')) {
        throw new Error('Insufficient permissions for this approval step');
      }

      const transaction = this.db.transaction();
      await transaction.begin();

      try {
        if (action === 'approve') {
          // Update current step as approved
          await transaction.request()
            .input('stepId', currentStep.id)
            .input('userId', userId)
            .input('notes', notes)
            .query(`
              UPDATE workflow_approvals 
              SET status = 'approved', 
                  approved_by = @userId, 
                  approved_at = GETDATE(),
                  notes = @notes
              WHERE id = @stepId
            `);

          // Determine next workflow status
          let nextStatus;
          if (stepConfig.next_role) {
            const nextStep = this.workflowSteps.find(s => s.required_role === stepConfig.next_role);
            nextStatus = nextStep ? `${nextStep.required_role.replace('_', '_')}_review` : 'approved';
          } else {
            nextStatus = 'approved';
          }

          // Update hire workflow status
          await transaction.request()
            .input('hireId', hireId)
            .input('status', nextStatus)
            .query(`
              UPDATE hires 
              SET workflow_status = @status
              WHERE id = @hireId
            `);

        } else if (action === 'reject') {
          // Update current step as rejected
          await transaction.request()
            .input('stepId', currentStep.id)
            .input('userId', userId)
            .input('rejectionReason', rejectionReason)
            .input('notes', notes)
            .query(`
              UPDATE workflow_approvals 
              SET status = 'rejected', 
                  approved_by = @userId, 
                  approved_at = GETDATE(),
                  rejection_reason = @rejectionReason,
                  notes = @notes
              WHERE id = @stepId
            `);

          // Update hire workflow status to rejected
          await transaction.request()
            .input('hireId', hireId)
            .query(`
              UPDATE hires 
              SET workflow_status = 'rejected'
              WHERE id = @hireId
            `);
        }

        await transaction.commit();
        logger.info('RBAC', `Workflow ${action} processed for hire ${hireId} by user ${userId}`);
        return true;
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      logger.error('RBAC', 'Error processing approval:', error);
      throw error;
    }
  }

  /**
   * Get workflow status for a hire
   */
  async getWorkflowStatus(hireId) {
    try {
      const result = await this.db.request()
        .input('hireId', hireId)
        .query(`
          SELECT 
            wa.*,
            u.username as approved_by_username
          FROM workflow_approvals wa
          LEFT JOIN users u ON wa.approved_by = u.id
          WHERE wa.hire_id = @hireId
          ORDER BY wa.step_order ASC
        `);

      return result.recordset;
    } catch (error) {
      logger.error('RBAC', 'Error getting workflow status:', error);
      return [];
    }
  }

  /**
   * Get pending approvals for a user based on their role
   */
  async getPendingApprovals(userId, userRole) {
    try {
      if (!this.hasPermission(userRole, 'hires.approve')) {
        return [];
      }

      // Find workflow steps this role can approve
      const approvalSteps = this.workflowSteps
        .filter(step => step.required_role === userRole || userRole === 'admin')
        .map(step => step.name);

      if (approvalSteps.length === 0) {
        return [];
      }

      const stepsList = approvalSteps.map(step => `'${step}'`).join(',');
      
      const result = await this.db.request()
        .query(`
          SELECT 
            h.*,
            wa.step_name,
            wa.step_order,
            wa.created_at as pending_since,
            submitter.username as submitted_by_username
          FROM hires h
          INNER JOIN workflow_approvals wa ON h.id = wa.hire_id
          LEFT JOIN users submitter ON h.submitted_by = submitter.id
          WHERE wa.status = 'pending' 
            AND wa.step_name IN (${stepsList})
          ORDER BY wa.created_at ASC
        `);

      return result.recordset;
    } catch (error) {
      logger.error('RBAC', 'Error getting pending approvals:', error);
      return [];
    }
  }

  /**
   * Check if workflow system is enabled (backward compatibility)
   */
  async isWorkflowEnabled() {
    try {
      // Check if workflow_approvals table exists
      const result = await this.db.request()
        .query(`
          SELECT COUNT(*) as count 
          FROM INFORMATION_SCHEMA.TABLES 
          WHERE TABLE_NAME = 'workflow_approvals'
        `);
      
      return result.recordset[0].count > 0;
    } catch (error) {
      logger.warn('RBAC', 'Workflow system not available, using legacy mode');
      return false;
    }
  }
}

module.exports = RBACService;