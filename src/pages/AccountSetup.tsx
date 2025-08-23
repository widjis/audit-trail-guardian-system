import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  User,
  Laptop,
  Shield,
  Mail,
  CheckCircle,
  X,
  Edit,
  Eye,
  ClipboardList,
  Building2,
  Calendar,
  UserCheck,
  Settings,
  Clock,
  AlertCircle,
  Download,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { hiresApi } from '@/services/api';
import { CreateADAccountDialog } from '@/components/hires/CreateADAccountDialog';
import { useAuth } from '@/services/auth-service';
import { MainLayout } from '@/components/layout/MainLayout';
import { useResponsive } from '@/hooks/use-responsive';

// TabPanel component is no longer needed with shadcn/ui Tabs

export default function AccountSetup() {
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedHire, setSelectedHire] = useState<any>(null);
  const [accountSetupDialog, setAccountSetupDialog] = useState(false);
  const [adAccountDialog, setAdAccountDialog] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [accountDetails, setAccountDetails] = useState({
    username: '',
    password: '',
    laptop_assigned: false,
    laptop_serial: '',
    microsoft_365_license: false,
    license_type: '',
    notes: ''
  });

  const { getCurrentUser } = useAuth();
  const currentUser = getCurrentUser();
  const queryClient = useQueryClient();
  const { isMobile, isTablet } = useResponsive();

  // Fetch approved hires that need account setup
  const { data: pendingAccountSetup = [], isLoading: isLoadingPending } = useQuery({
    queryKey: ['hires', 'pending-account-setup'],
    queryFn: async () => {
      const allHires = await hiresApi.getAll();
      return allHires.filter(hire => hire.workflow_status === 'approved_it_superintendent');
    }
  });

  // Fetch completed account setups
  const { data: completedSetups = [], isLoading: isLoadingCompleted } = useQuery({
    queryKey: ['hires', 'completed-setups'],
    queryFn: async () => {
      const allHires = await hiresApi.getAll();
      return allHires.filter(hire => hire.workflow_status === 'completed');
    }
  });

  // Update hire account details mutation
  const updateAccountMutation = useMutation({
    mutationFn: (data: { id: string; updates: any }) => 
      hiresApi.update(data.id, data.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hires'] });
      toast.success('Account details updated successfully');
      setAccountSetupDialog(false);
      setSelectedHire(null);
    },
    onError: (error) => {
      toast.error('Failed to update account details');
      console.error('Update error:', error);
    }
  });

  // Tab change is handled by shadcn/ui Tabs component

  const handleSetupAccount = (hire: any) => {
    setSelectedHire(hire);
    setAccountDetails({
      username: hire.username || '',
      password: hire.password || '',
      laptop_assigned: hire.laptop_assigned || false,
      laptop_serial: hire.laptop_serial || '',
      microsoft_365_license: hire.microsoft_365_license || false,
      license_type: hire.license_type || '',
      notes: hire.notes || ''
    });
    setAccountSetupDialog(true);
  };

  const handleSaveAccountSetup = () => {
    if (!selectedHire) return;

    const updates = {
      ...accountDetails,
      account_created: true,
      workflow_status: 'completed',
      ict_support_pic: currentUser?.username
    };

    updateAccountMutation.mutate({
      id: selectedHire.id,
      updates
    });
  };

  const getStatusBadge = (hire: any) => {
    if (hire.account_created) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Account Created</Badge>;
    }
    return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending Setup</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Filter and search functionality
  const filteredPendingSetups = pendingAccountSetup.filter(hire => {
    const matchesSearch = searchTerm === '' || 
      hire.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hire.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hire.position_grade?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || 
      (filterStatus === 'laptop_pending' && hire.laptop_ready !== 'Done') ||
      (filterStatus === 'license_required' && hire.microsoft_365_license && hire.microsoft_365_license !== 'None') ||
      (filterStatus === 'urgent' && new Date(hire.on_site_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    
    return matchesSearch && matchesFilter;
  });

  const filteredCompletedSetups = completedSetups.filter(hire => {
    return searchTerm === '' || 
      hire.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hire.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hire.position_grade?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hire.username?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Calculate setup progress
  const getSetupProgress = (hire: any) => {
    let progress = 0;
    const steps = [];
    
    if (hire.username) { progress += 25; steps.push('Username assigned'); }
    if (hire.password) { progress += 25; steps.push('Password set'); }
    if (hire.laptop_ready === 'Done') { progress += 25; steps.push('Laptop handled'); }
    if (!hire.microsoft_365_license || hire.license_type) { progress += 25; steps.push('License handled'); }
    
    return { progress, steps };
  };

  // Get priority badge
  const getPriorityBadge = (hire: any) => {
    const onSiteDate = new Date(hire.on_site_date);
    const today = new Date();
    const daysUntilOnsite = Math.ceil((onSiteDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilOnsite <= 1) {
      return <Badge variant="destructive" className="flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />
        Urgent
      </Badge>;
    } else if (daysUntilOnsite <= 3) {
      return <Badge variant="secondary" className="bg-orange-100 text-orange-800 flex items-center gap-1">
        <Clock className="h-3 w-3" />
        High Priority
      </Badge>;
    }
    return null;
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Account Setup Management</h1>
            <p className="text-muted-foreground">
              Manage account creation and setup for approved new hires
            </p>
          </div>
          
          {/* Quick Stats */}
          <div className="flex gap-4">
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <div>
                  <p className="text-sm font-medium">{filteredPendingSetups.length}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-sm font-medium">{filteredCompletedSetups.length}</p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <Card className="p-4">
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-y-0 md:space-x-4">
            <div className="flex-1">
              <Input
                placeholder="Search by name, department, or position..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Setups</SelectItem>
                  <SelectItem value="urgent">Urgent (≤7 days)</SelectItem>
                  <SelectItem value="laptop_pending">Laptop Pending</SelectItem>
                  <SelectItem value="license_required">License Required</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Pending Setup ({filteredPendingSetups.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Completed ({filteredCompletedSetups.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {isLoadingPending ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading pending setups...</p>
              </div>
            ) : filteredPendingSetups.length === 0 ? (
              <Card className="p-8 text-center">
                <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchTerm || filterStatus !== 'all' ? 'No Matching Setups Found' : 'No Pending Account Setups'}
                </h3>
                <p className="text-muted-foreground">
                  {searchTerm || filterStatus !== 'all' 
                    ? 'Try adjusting your search or filter criteria.'
                    : 'All approved hires have completed account setup.'
                  }
                </p>
              </Card>
            ) : (
              <ScrollArea className="h-[600px]">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pr-4">
                  {filteredPendingSetups.map((hire: any) => {
                    const { progress } = getSetupProgress(hire);
                    const priorityBadge = getPriorityBadge(hire);
                    
                    return (
                      <Card key={hire.id} className="p-6 hover:shadow-md transition-shadow">
                        <div className="space-y-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg">{hire.name}</h3>
                              <p className="text-sm text-muted-foreground">{hire.position_grade}</p>
                              <p className="text-sm text-muted-foreground">{hire.department}</p>
                            </div>
                            <div className="flex flex-col gap-2">
                              {priorityBadge}
                              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                                Pending
                              </Badge>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Setup Progress</span>
                              <span className="font-medium">{progress}%</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                          </div>

                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <span className="truncate">{hire.email}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>On-site: {formatDate(hire.on_site_date)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="truncate">Reports to: {hire.reports_to_ad_lookup_enabled}</span>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {hire.laptop_ready !== 'Done' && (
                              <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                                <Laptop className="h-3 w-3 mr-1" />
                                Laptop Required
                              </Badge>
                            )}
                            {hire.microsoft_365_license && (
                              <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-purple-200">
                                <Shield className="h-3 w-3 mr-1" />
                                M365 License
                              </Badge>
                            )}
                          </div>

                          <div className="flex gap-2 pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedHire(hire)}
                              className="flex-1"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleSetupAccount(hire)}
                              className="flex-1"
                            >
                              <Settings className="h-4 w-4 mr-2" />
                              Setup Account
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {filteredCompletedSetups.length === 0 ? (
              <Card className="p-8 text-center">
                <UserCheck className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchTerm || filterStatus !== 'all' ? 'No Matching Completed Setups' : 'No Completed Setups'}
                </h3>
                <p className="text-muted-foreground">
                  {searchTerm || filterStatus !== 'all'
                    ? 'Try adjusting your search or filter criteria.'
                    : 'Completed account setups will appear here.'
                  }
                </p>
              </Card>
            ) : (
              <Card>
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Completed Account Setups</h3>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">Name</TableHead>
                        <TableHead className="hidden md:table-cell">Position</TableHead>
                        <TableHead className="hidden lg:table-cell">Department</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead className="hidden md:table-cell">Setup Date</TableHead>
                        <TableHead className="hidden lg:table-cell">ICT Support PIC</TableHead>
                        <TableHead className="text-right w-[120px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingCompleted ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            Loading completed setups...
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredCompletedSetups.map((hire: any) => (
                          <TableRow key={hire.id} className="hover:bg-muted/50">
                            <TableCell>
                              <div>
                                <div className="font-medium">{hire.name}</div>
                                <div className="text-sm text-muted-foreground md:hidden">
                                  {hire.position_grade} • {hire.department}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">{hire.position_grade}</TableCell>
                            <TableCell className="hidden lg:table-cell">{hire.department}</TableCell>
                            <TableCell>
                              <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                                {hire.username || 'N/A'}
                              </code>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                {hire.updated_at ? formatDate(hire.updated_at) : 'N/A'}
                              </div>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <div className="flex items-center gap-2">
                                <UserCheck className="h-4 w-4 text-muted-foreground" />
                                {hire.ict_support_pic || 'N/A'}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="outline" size="sm" onClick={() => setSelectedHire(hire)}>
                                      <Eye className="h-4 w-4 mr-2" />
                                      <span className="hidden sm:inline">View Details</span>
                                      <span className="sm:hidden">View</span>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>View Details</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Account Setup Dialog */}
      <Dialog open={accountSetupDialog} onOpenChange={setAccountSetupDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Setup Account for {selectedHire?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                value={accountDetails.username}
                onChange={(e) => setAccountDetails(prev => ({ ...prev, username: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={accountDetails.password}
                onChange={(e) => setAccountDetails(prev => ({ ...prev, password: e.target.value }))}
                required
              />
            </div>
            
            <div className="col-span-full">
              <h3 className="text-lg font-semibold mb-4">Hardware & Licenses</h3>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="laptop-assigned"
                checked={accountDetails.laptop_assigned}
                onCheckedChange={(checked) => setAccountDetails(prev => ({ ...prev, laptop_assigned: checked }))}
              />
              <Label htmlFor="laptop-assigned">Laptop Assigned</Label>
            </div>
            
            {accountDetails.laptop_assigned && (
              <div className="space-y-2">
                <Label htmlFor="laptop-serial">Laptop Serial Number</Label>
                <Input
                  id="laptop-serial"
                  value={accountDetails.laptop_serial}
                  onChange={(e) => setAccountDetails(prev => ({ ...prev, laptop_serial: e.target.value }))}
                />
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <Switch
                id="m365-license"
                checked={accountDetails.microsoft_365_license}
                onCheckedChange={(checked) => setAccountDetails(prev => ({ ...prev, microsoft_365_license: checked }))}
              />
              <Label htmlFor="m365-license">Microsoft 365 License</Label>
            </div>
            
            {accountDetails.microsoft_365_license && (
              <div className="space-y-2">
                <Label htmlFor="license-type">License Type</Label>
                <Select value={accountDetails.license_type} onValueChange={(value) => setAccountDetails(prev => ({ ...prev, license_type: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select license type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="E1">Microsoft 365 E1</SelectItem>
                    <SelectItem value="E3">Microsoft 365 E3</SelectItem>
                    <SelectItem value="E5">Microsoft 365 E5</SelectItem>
                    <SelectItem value="Business Basic">Microsoft 365 Business Basic</SelectItem>
                    <SelectItem value="Business Standard">Microsoft 365 Business Standard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="col-span-full space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                rows={3}
                value={accountDetails.notes}
                onChange={(e) => setAccountDetails(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes or special requirements..."
              />
            </div>
            
            <div className="col-span-full">
              <Alert>
                <AlertTitle>Account Setup Process</AlertTitle>
                <AlertDescription>
                  After saving these details, you can proceed to create the Active Directory account using the AD Account Creation tool.
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
            <Button variant="outline" onClick={() => setAccountSetupDialog(false)}>Cancel</Button>
            <Button 
              onClick={() => setAdAccountDialog(true)}
              variant="outline"
            >
              <Shield className="h-4 w-4 mr-1" />
              Create AD Account
            </Button>
            <Button 
              onClick={handleSaveAccountSetup}
              disabled={!accountDetails.username || !accountDetails.password}
            >
              Save & Complete Setup
            </Button>
          </DialogFooter>
      </Dialog>

      {/* AD Account Creation Dialog */}
      {adAccountDialog && (
        <CreateADAccountDialog
          hire={selectedHire}
          onClose={() => setAdAccountDialog(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['hires'] });
            setAdAccountDialog(false);
            setAccountSetupDialog(false);
          }}
        />
      )}
    </MainLayout>
  );
}