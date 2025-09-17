import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/services/auth-service';
import { useToast } from '@/hooks/use-toast';
import {
  Button,
  TextField,
  Grid,
  MenuItem,
  Box,
  Typography,
  Autocomplete
} from '@mui/material';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { ArrowBack, Save } from '@mui/icons-material';

interface PersonalInfo {
  fullName: string;
  email: string;
  jobTitle: string;
  positionGrade: string;
  department: string;
  phoneNumber: string;
  reportsTo: string;
  onSiteDate: string;
}

const POSITION_GRADES = [
  'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5',
  'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'
];

const DEPARTMENTS = [
  'Human Resources', 'Information Technology', 'Finance',
  'Operations', 'Marketing', 'Sales', 'Legal', 'Administration'
];

export function RecruiterHireForm() {
  const navigate = useNavigate();
  const { getCurrentUser } = useAuth();
  const { toast } = useToast();
  const currentUser = getCurrentUser();

  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({
    fullName: '',
    email: '',
    jobTitle: '',
    positionGrade: '',
    department: '',
    phoneNumber: '',
    reportsTo: '',
    onSiteDate: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [supervisors, setSupervisors] = useState<Array<{id: string, name: string}>>([]);

  const handlePersonalInfoChange = (field: keyof PersonalInfo, value: string) => {
    setPersonalInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!personalInfo.fullName || !personalInfo.email || !personalInfo.jobTitle) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const hireData = {
        ...personalInfo,
        submittedBy: currentUser?.id,
        status: 'pending_hris_review',
        createdAt: new Date().toISOString()
      };

      const response = await fetch('/api/hires', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(hireData)
      });

      if (!response.ok) {
        throw new Error('Failed to submit hire request');
      }

      const result = await response.json();

      toast({
        title: 'Success',
        description: 'New hire request submitted successfully!',
        variant: 'default'
      });

      navigate('/dashboard');
    } catch (error) {
      console.error('Error submitting hire:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit hire request. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/dashboard')}
          sx={{ mr: 2 }}
        >
          Back
        </Button>
        <Typography variant="h4" component="h1">
          Submit New Hire Request
        </Typography>
      </Box>

      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Full Name"
                  required
                  value={personalInfo.fullName}
                  onChange={(e) => handlePersonalInfoChange('fullName', e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  required
                  value={personalInfo.email}
                  onChange={(e) => handlePersonalInfoChange('email', e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Job Title"
                  required
                  value={personalInfo.jobTitle}
                  onChange={(e) => handlePersonalInfoChange('jobTitle', e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  select
                  label="Position Grade"
                  required
                  value={personalInfo.positionGrade}
                  onChange={(e) => handlePersonalInfoChange('positionGrade', e.target.value)}
                >
                  <MenuItem value="">Select position grade</MenuItem>
                  {POSITION_GRADES.map((grade) => (
                    <MenuItem key={grade} value={grade}>
                      {grade}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  select
                  label="Department"
                  required
                  value={personalInfo.department}
                  onChange={(e) => handlePersonalInfoChange('department', e.target.value)}
                >
                  <MenuItem value="">Select department</MenuItem>
                  {DEPARTMENTS.map((dept) => (
                    <MenuItem key={dept} value={dept}>
                      {dept}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  value={personalInfo.phoneNumber}
                  onChange={(e) => handlePersonalInfoChange('phoneNumber', e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Reports To (AD Lookup Enabled)"
                  value={personalInfo.reportsTo}
                  onChange={(e) => handlePersonalInfoChange('reportsTo', e.target.value)}
                  placeholder="Search for manager..."
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="On-site Date"
                  type="date"
                  required
                  value={personalInfo.onSiteDate}
                  onChange={(e) => handlePersonalInfoChange('onSiteDate', e.target.value)}
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={() => navigate('/dashboard')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            startIcon={<Save />}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </Button>
        </Box>
      </form>
    </Box>
  );
}