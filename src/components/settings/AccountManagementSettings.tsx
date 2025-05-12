
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/use-toast";
import { usersService } from "@/services/users-service";
import { Pencil, Trash2, Key, ShieldCheck, UserCheck, UserX } from "lucide-react";
import { UserAccount } from "@/types/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function AccountManagementSettings() {
  const [newAccount, setNewAccount] = useState<Partial<UserAccount>>({
    username: "",
    password: "",
    role: "support"
  });
  const [editAccount, setEditAccount] = useState<UserAccount | null>(null);
  const [resetPasswordId, setResetPasswordId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("active");

  const queryClient = useQueryClient();

  // Fetch all support accounts
  const { data: accounts = [], isLoading: isLoadingAccounts } = useQuery({
    queryKey: ["supportAccounts"],
    queryFn: usersService.getSupportAccounts
  });
  
  // Fetch pending approval accounts
  const { data: pendingAccounts = [], isLoading: isLoadingPending } = useQuery({
    queryKey: ["pendingAccounts"],
    queryFn: usersService.getPendingAccounts
  });

  // Add new account mutation
  const addAccountMutation = useMutation({
    mutationFn: usersService.createAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supportAccounts"] });
      toast({ title: "Success", description: "Support account created successfully" });
      setIsAddDialogOpen(false);
      setNewAccount({ username: "", password: "", role: "support" });
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to create account", 
        variant: "destructive" 
      });
    }
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: usersService.deleteAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supportAccounts"] });
      queryClient.invalidateQueries({ queryKey: ["pendingAccounts"] });
      toast({ title: "Success", description: "Account deleted successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to delete account", 
        variant: "destructive" 
      });
    }
  });

  // Update account mutation
  const updateAccountMutation = useMutation({
    mutationFn: usersService.updateAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supportAccounts"] });
      queryClient.invalidateQueries({ queryKey: ["pendingAccounts"] });
      toast({ title: "Success", description: "Account updated successfully" });
      setIsEditDialogOpen(false);
      setEditAccount(null);
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to update account", 
        variant: "destructive" 
      });
    }
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) => 
      usersService.resetPassword(id, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supportAccounts"] });
      toast({ title: "Success", description: "Password reset successfully" });
      setIsResetDialogOpen(false);
      setResetPasswordId(null);
      setNewPassword("");
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to reset password", 
        variant: "destructive" 
      });
    }
  });
  
  // Approve account mutation
  const approveAccountMutation = useMutation({
    mutationFn: usersService.approveAccount,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["supportAccounts"] });
      queryClient.invalidateQueries({ queryKey: ["pendingAccounts"] });
      toast({ title: "Success", description: data.message || "Account approved successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to approve account", 
        variant: "destructive" 
      });
    }
  });
  
  // Disapprove account mutation
  const disapproveAccountMutation = useMutation({
    mutationFn: usersService.disapproveAccount,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["supportAccounts"] });
      queryClient.invalidateQueries({ queryKey: ["pendingAccounts"] });
      toast({ title: "Success", description: data.message || "Account disapproved successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to disapprove account", 
        variant: "destructive" 
      });
    }
  });

  const handleAddAccount = () => {
    if (!newAccount.username || !newAccount.password) {
      toast({
        title: "Validation Error",
        description: "Username and password are required",
        variant: "destructive"
      });
      return;
    }
    addAccountMutation.mutate(newAccount as UserAccount);
  };

  const handleUpdateAccount = () => {
    if (!editAccount || !editAccount.username) {
      toast({
        title: "Validation Error",
        description: "Username is required",
        variant: "destructive"
      });
      return;
    }
    updateAccountMutation.mutate(editAccount);
  };

  const handleResetPassword = () => {
    if (!resetPasswordId || !newPassword) {
      toast({
        title: "Validation Error",
        description: "Password is required",
        variant: "destructive"
      });
      return;
    }
    resetPasswordMutation.mutate({ id: resetPasswordId, password: newPassword });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>ICT Support Account Management</CardTitle>
        <CardDescription>
          Manage ICT Support personnel accounts that have access to the system
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="active">Active Accounts</TabsTrigger>
            <TabsTrigger value="pending" className="flex items-center gap-1">
              <ShieldCheck className="h-4 w-4" />
              <span>Pending Approval</span>
              {pendingAccounts.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {pendingAccounts.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="active">
            {isLoadingAccounts ? (
              <div className="flex justify-center py-8">Loading accounts...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        No support accounts found
                      </TableCell>
                    </TableRow>
                  ) : (
                    accounts.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell>{account.username}</TableCell>
                        <TableCell>{account.role}</TableCell>
                        <TableCell>
                          {account.approved ? (
                            <Badge variant="success" className="bg-green-500">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditAccount(account);
                                setIsEditDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setResetPasswordId(account.id);
                                setIsResetDialogOpen(true);
                              }}
                            >
                              <Key className="h-4 w-4" />
                              <span className="sr-only">Reset Password</span>
                            </Button>
                            
                            {account.approved ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => disapproveAccountMutation.mutate(account.id)}
                              >
                                <UserX className="h-4 w-4 text-yellow-500" />
                                <span className="sr-only">Disapprove</span>
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => approveAccountMutation.mutate(account.id)}
                              >
                                <UserCheck className="h-4 w-4 text-green-500" />
                                <span className="sr-only">Approve</span>
                              </Button>
                            )}
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                  <span className="sr-only">Delete</span>
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Account</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete the account "{account.username}"? 
                                    This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => deleteAccountMutation.mutate(account.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </TabsContent>
          
          <TabsContent value="pending">
            {isLoadingPending ? (
              <div className="flex justify-center py-8">Loading pending accounts...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingAccounts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8">
                        No pending approval accounts
                      </TableCell>
                    </TableRow>
                  ) : (
                    pendingAccounts.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell>{account.username}</TableCell>
                        <TableCell>{account.role}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-green-50 border-green-200 hover:bg-green-100"
                              onClick={() => approveAccountMutation.mutate(account.id)}
                            >
                              <UserCheck className="h-4 w-4 text-green-500 mr-1" />
                              <span>Approve</span>
                            </Button>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Trash2 className="h-4 w-4 text-destructive mr-1" />
                                  <span>Delete</span>
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Account</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete the account "{account.username}"? 
                                    This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => deleteAccountMutation.mutate(account.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>Add Support Account</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Support Account</DialogTitle>
              <DialogDescription>
                Create a new ICT support account with system access.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="username" className="text-right">
                  Username
                </Label>
                <Input
                  id="username"
                  value={newAccount.username}
                  onChange={(e) => setNewAccount({...newAccount, username: e.target.value})}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="password" className="text-right">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={newAccount.password}
                  onChange={(e) => setNewAccount({...newAccount, password: e.target.value})}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleAddAccount}>Create Account</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardFooter>

      {/* Edit Account Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Support Account</DialogTitle>
            <DialogDescription>
              Update the support account details.
            </DialogDescription>
          </DialogHeader>
          {editAccount && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-username" className="text-right">
                  Username
                </Label>
                <Input
                  id="edit-username"
                  value={editAccount.username}
                  onChange={(e) => setEditAccount({...editAccount, username: e.target.value})}
                  className="col-span-3"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="submit" onClick={handleUpdateAccount}>Update Account</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Enter a new password for this account.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-password" className="text-right">
                New Password
              </Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleResetPassword}>Reset Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
