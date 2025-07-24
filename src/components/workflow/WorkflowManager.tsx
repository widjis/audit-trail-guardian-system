import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  Alert,
  AlertTitle,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Collapse,
  useTheme,
  useMediaQuery,
  Fab,
  Tooltip
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Save,
  Cancel,
  CheckCircle,
  Schedule,
  Error,
  Warning,
  PlayArrow,
  Pause,
  Stop,
  Refresh,
  ExpandMore,
  ExpandLess,
  Assignment,
  Person,
  Computer,
  Security,
  CloudSync,
  Email
} from '@mui/icons-material';
import { NewHire } from '@/types/types';

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  type: 'manual' | 'automated' | 'approval';
  estimatedDuration: number; // in hours
  dependencies: string[]; // step IDs
  assignedTo?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  completedAt?: string;
  notes?: string;
}

interface WorkflowInstance {
  id: string;
  templateId: string;
  hireId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  startedAt?: string;
  completedAt?: string;
  currentStep?: string;
  steps: WorkflowStep[];
  progress: number;
}

interface WorkflowManagerProps {
  hires: NewHire[];
  onCreateWorkflow?: (templateId: string, hireId: string) => void;
  onUpdateWorkflow?: (workflowId: string, updates: Partial<WorkflowInstance>) => void;
  onDeleteWorkflow?: (workflowId: string) => void;
}

interface CreateWorkflowDialogProps {
  open: boolean;
  templates: WorkflowTemplate[];
  hires: NewHire[];
  onClose: () => void;
  onCreate: (templateId: string, hireId: string) => void;
}

interface EditTemplateDialogProps {
  open: boolean;
  template?: WorkflowTemplate;
  onClose: () => void;
  onSave: (template: Partial<WorkflowTemplate>) => void;
}

const CreateWorkflowDialog: React.FC<CreateWorkflowDialogProps> = ({
  open,
  templates,
  hires,
  onClose,
  onCreate
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedHire, setSelectedHire] = useState('');

  const handleCreate = () => {
    if (selectedTemplate && selectedHire) {
      onCreate(selectedTemplate, selectedHire);
      onClose();
      setSelectedTemplate('');
      setSelectedHire('');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create New Workflow</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <FormControl fullWidth>
            <InputLabel>Workflow Template</InputLabel>
            <Select
              value={selectedTemplate}
              label="Workflow Template"
              onChange={(e) => setSelectedTemplate(e.target.value)}
            >
              {templates.map(template => (
                <MenuItem key={template.id} value={template.id}>
                  {template.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>New Hire</InputLabel>
            <Select
              value={selectedHire}
              label="New Hire"
              onChange={(e) => setSelectedHire(e.target.value)}
            >
              {hires.map(hire => (
                <MenuItem key={hire.id} value={hire.id}>
                  {hire.name} - {hire.title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {selectedTemplate && (
            <Alert severity="info">
              <AlertTitle>Template Preview</AlertTitle>
              {templates.find(t => t.id === selectedTemplate)?.description}
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleCreate} 
          variant="contained"
          disabled={!selectedTemplate || !selectedHire}
        >
          Create Workflow
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const EditTemplateDialog: React.FC<EditTemplateDialogProps> = ({
  open,
  template,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState<Partial<WorkflowTemplate>>({});

  useEffect(() => {
    if (template) {
      setFormData(template);
    } else {
      setFormData({
        name: '',
        description: '',
        steps: [],
        isActive: true
      });
    }
  }, [template]);

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {template ? 'Edit Template' : 'Create Template'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            fullWidth
            label="Template Name"
            value={formData.name || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          />
          
          <TextField
            fullWidth
            label="Description"
            multiline
            rows={3}
            value={formData.description || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          />

          {/* Step management would go here - simplified for this example */}
          <Typography variant="h6">Workflow Steps</Typography>
          <Alert severity="info">
            Step management interface would be implemented here with drag-and-drop reordering,
            step creation, editing, and dependency management.
          </Alert>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">
          Save Template
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export const WorkflowManager: React.FC<WorkflowManagerProps> = ({
  hires,
  onCreateWorkflow,
  onUpdateWorkflow,
  onDeleteWorkflow
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editTemplateOpen, setEditTemplateOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | undefined>();
  const [expandedWorkflow, setExpandedWorkflow] = useState<string | null>(null);

  // Mock data - in real implementation, this would come from props or API
  const [templates] = useState<WorkflowTemplate[]>([
    {
      id: '1',
      name: 'Standard Onboarding',
      description: 'Complete onboarding process for new hires',
      isActive: true,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
      steps: [
        {
          id: 'step1',
          name: 'Account Creation',
          description: 'Create user account and basic permissions',
          type: 'automated',
          estimatedDuration: 2,
          dependencies: [],
          status: 'pending'
        },
        {
          id: 'step2',
          name: 'Laptop Setup',
          description: 'Prepare and configure laptop',
          type: 'manual',
          estimatedDuration: 4,
          dependencies: [],
          status: 'pending'
        },
        {
          id: 'step3',
          name: 'License Assignment',
          description: 'Assign software licenses',
          type: 'automated',
          estimatedDuration: 1,
          dependencies: ['step1'],
          status: 'pending'
        }
      ]
    }
  ]);

  const [workflows] = useState<WorkflowInstance[]>([
    {
      id: 'wf1',
      templateId: '1',
      hireId: '1',
      status: 'running',
      startedAt: '2024-01-15T09:00:00Z',
      currentStep: 'step2',
      progress: 33,
      steps: [
        {
          id: 'step1',
          name: 'Account Creation',
          description: 'Create user account and basic permissions',
          type: 'automated',
          estimatedDuration: 2,
          dependencies: [],
          status: 'completed',
          completedAt: '2024-01-15T11:00:00Z'
        },
        {
          id: 'step2',
          name: 'Laptop Setup',
          description: 'Prepare and configure laptop',
          type: 'manual',
          estimatedDuration: 4,
          dependencies: [],
          status: 'in_progress'
        },
        {
          id: 'step3',
          name: 'License Assignment',
          description: 'Assign software licenses',
          type: 'automated',
          estimatedDuration: 1,
          dependencies: ['step1'],
          status: 'pending'
        }
      ]
    }
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'running':
      case 'in_progress': return 'info';
      case 'pending': return 'warning';
      case 'failed': return 'error';
      case 'paused': return 'default';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle color="success" />;
      case 'running':
      case 'in_progress': return <PlayArrow color="info" />;
      case 'pending': return <Schedule color="warning" />;
      case 'failed': return <Error color="error" />;
      case 'paused': return <Pause color="disabled" />;
      default: return <Warning color="disabled" />;
    }
  };

  const getStepIcon = (type: string) => {
    switch (type) {
      case 'manual': return <Person />;
      case 'automated': return <Computer />;
      case 'approval': return <Security />;
      default: return <Assignment />;
    }
  };

  const handleCreateWorkflow = (templateId: string, hireId: string) => {
    if (onCreateWorkflow) {
      onCreateWorkflow(templateId, hireId);
    }
  };

  const handleEditTemplate = (template?: WorkflowTemplate) => {
    setSelectedTemplate(template);
    setEditTemplateOpen(true);
  };

  const handleSaveTemplate = (templateData: Partial<WorkflowTemplate>) => {
    // Implementation would save template
    console.log('Saving template:', templateData);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getHireName = (hireId: string) => {
    const hire = hires.find(h => h.id === hireId);
    return hire ? hire.name : 'Unknown';
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Workflow Manager
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Add />}
            onClick={() => handleEditTemplate()}
          >
            New Template
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Create Workflow
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Templates Section */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Workflow Templates
              </Typography>
              <List>
                {templates.map((template, index) => (
                  <React.Fragment key={template.id}>
                    <ListItem>
                      <ListItemIcon>
                        <Assignment color={template.isActive ? 'primary' : 'disabled'} />
                      </ListItemIcon>
                      <ListItemText
                        primary={template.name}
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {template.description}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                              <Chip
                                size="small"
                                label={template.isActive ? 'Active' : 'Inactive'}
                                color={template.isActive ? 'success' : 'default'}
                              />
                              <Chip
                                size="small"
                                label={`${template.steps.length} steps`}
                                variant="outlined"
                              />
                            </Box>
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          onClick={() => handleEditTemplate(template)}
                        >
                          <Edit />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                    {index < templates.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Active Workflows Section */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Active Workflows
              </Typography>
              <List>
                {workflows.map((workflow, index) => (
                  <React.Fragment key={workflow.id}>
                    <ListItem>
                      <ListItemIcon>
                        {getStatusIcon(workflow.status)}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle1">
                              {getHireName(workflow.hireId)}
                            </Typography>
                            <Chip
                              size="small"
                              label={`${workflow.progress}%`}
                              color={getStatusColor(workflow.status) as any}
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              Template: {templates.find(t => t.id === workflow.templateId)?.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Started: {workflow.startedAt ? formatDateTime(workflow.startedAt) : 'Not started'}
                            </Typography>
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          onClick={() => setExpandedWorkflow(
                            expandedWorkflow === workflow.id ? null : workflow.id
                          )}
                        >
                          {expandedWorkflow === workflow.id ? <ExpandLess /> : <ExpandMore />}
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                    
                    <Collapse in={expandedWorkflow === workflow.id}>
                      <Box sx={{ pl: 4, pr: 2, pb: 2 }}>
                        <Stepper orientation="vertical">
                          {workflow.steps.map((step) => (
                            <Step key={step.id} active={step.status === 'in_progress'} completed={step.status === 'completed'}>
                              <StepLabel
                                icon={getStepIcon(step.type)}
                                error={step.status === 'failed'}
                              >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="subtitle2">
                                    {step.name}
                                  </Typography>
                                  <Chip
                                    size="small"
                                    label={step.status.replace('_', ' ')}
                                    color={getStatusColor(step.status) as any}
                                  />
                                </Box>
                              </StepLabel>
                              <StepContent>
                                <Typography variant="body2" color="text.secondary">
                                  {step.description}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Estimated duration: {step.estimatedDuration}h
                                </Typography>
                                {step.completedAt && (
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    Completed: {formatDateTime(step.completedAt)}
                                  </Typography>
                                )}
                              </StepContent>
                            </Step>
                          ))}
                        </Stepper>
                      </Box>
                    </Collapse>
                    
                    {index < workflows.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Floating Action Button for Mobile */}
      {isMobile && (
        <Fab
          color="primary"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={() => setCreateDialogOpen(true)}
        >
          <Add />
        </Fab>
      )}

      {/* Dialogs */}
      <CreateWorkflowDialog
        open={createDialogOpen}
        templates={templates}
        hires={hires}
        onClose={() => setCreateDialogOpen(false)}
        onCreate={handleCreateWorkflow}
      />

      <EditTemplateDialog
        open={editTemplateOpen}
        template={selectedTemplate}
        onClose={() => setEditTemplateOpen(false)}
        onSave={handleSaveTemplate}
      />
    </Box>
  );
};

export default WorkflowManager;