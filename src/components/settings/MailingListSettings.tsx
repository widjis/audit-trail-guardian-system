
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Save, Edit, Trash, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { settingsService } from "@/services/settings-service";
import { useQuery, useMutation } from "@tanstack/react-query";

interface MailingList {
  id: string;
  name: string;
  email: string;
  code?: string;
  departmentCode?: string;
  positionGrade?: string;
  isDefault?: boolean;
}

interface MailingListStructure {
  mandatory: MailingList[];
  optional: MailingList[];
  roleBased: MailingList[];
}

export function MailingListSettings() {
  const [mailingLists, setMailingLists] = useState<MailingListStructure>({
    mandatory: [],
    optional: [],
    roleBased: []
  });
  const [newListName, setNewListName] = useState("");
  const [newListEmail, setNewListEmail] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  
  // Fetch settings from the server
  const { data, isLoading, error } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsService.getSettings
  });
  
  // Update settings when data is loaded
  useEffect(() => {
    if (data?.mailingLists) {
      if (Array.isArray(data.mailingLists)) {
        // Handle old format - convert to new structure
        setMailingLists({
          mandatory: [],
          optional: data.mailingLists,
          roleBased: []
        });
      } else {
        // New structured format
        setMailingLists(data.mailingLists);
      }
    }
  }, [data]);
  
  // Save mailing lists mutation
  const saveMailingListsMutation = useMutation({
    mutationFn: (params: { lists: MailingListStructure, dropdown: boolean }) => 
      settingsService.updateMailingLists(params.lists, params.dropdown),
    onSuccess: () => {
      toast.success("Mailing list settings saved successfully");
    },
    onError: (error) => {
      toast.error("Failed to save mailing list settings");
      console.error("Error saving mailing lists:", error);
    }
  });

  const handleAddList = (category: 'mandatory' | 'optional' | 'roleBased') => {
    if (!newListName.trim() || !newListEmail.trim()) {
      toast.error("Please provide both name and email");
      return;
    }
    
    // Check if email already exists in any category
    const allLists = [...mailingLists.mandatory, ...mailingLists.optional, ...mailingLists.roleBased];
    if (allLists.some(list => list.email.toLowerCase() === newListEmail.trim().toLowerCase())) {
      toast.error("This email address already exists");
      return;
    }
    
    const newId = String(Date.now());
    const newList: MailingList = { 
      id: newId, 
      name: newListName.trim(), 
      email: newListEmail.trim()
    };
    
    setMailingLists(prev => ({
      ...prev,
      [category]: [...prev[category], newList]
    }));
    
    setNewListName("");
    setNewListEmail("");
    toast.success("New mailing list added");
  };

  const handleRemoveList = (id: string, category: 'mandatory' | 'optional' | 'roleBased') => {
    setMailingLists(prev => ({
      ...prev,
      [category]: prev[category].filter(list => list.id !== id)
    }));
    toast.success("Mailing list removed");
  };

  const handleStartEdit = (list: MailingList) => {
    setEditingId(list.id);
    setEditName(list.name);
    setEditEmail(list.email);
  };

  const handleSaveEdit = (id: string, category: 'mandatory' | 'optional' | 'roleBased') => {
    if (!editName.trim() || !editEmail.trim()) {
      toast.error("Name and email cannot be empty");
      return;
    }
    
    setMailingLists(prev => ({
      ...prev,
      [category]: prev[category].map(list => 
        list.id === id ? { ...list, name: editName.trim(), email: editEmail.trim() } : list
      )
    }));
    
    setEditingId(null);
    toast.success("Mailing list updated");
  };

  const handleSaveSettings = () => {
    saveMailingListsMutation.mutate({ 
      lists: mailingLists, 
      dropdown: true 
    });
  };

  const renderTable = (lists: MailingList[], category: 'mandatory' | 'optional' | 'roleBased', title: string) => (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">{title}</h3>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead className="w-[150px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lists.map(list => (
            <TableRow key={list.id}>
              <TableCell>
                {editingId === list.id ? (
                  <Input 
                    value={editName} 
                    onChange={e => setEditName(e.target.value)} 
                    className="max-w-xs" 
                  />
                ) : (
                  list.name
                )}
              </TableCell>
              <TableCell>
                {editingId === list.id ? (
                  <Input 
                    value={editEmail} 
                    onChange={e => setEditEmail(e.target.value)} 
                    className="max-w-xs" 
                  />
                ) : (
                  <span className="text-muted-foreground">{list.email}</span>
                )}
              </TableCell>
              <TableCell>
                {editingId === list.id ? (
                  <Button size="sm" onClick={() => handleSaveEdit(list.id, category)}>Save</Button>
                ) : (
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleStartEdit(list)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {category !== 'mandatory' && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-red-500 hover:text-red-700"
                        onClick={() => handleRemoveList(list.id, category)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      {category !== 'mandatory' && (
        <div className="flex gap-2">
          <Input 
            placeholder="Mailing list name..." 
            value={newListName} 
            onChange={(e) => setNewListName(e.target.value)}
            className="max-w-xs"
          />
          <Input 
            placeholder="Email address..." 
            value={newListEmail} 
            onChange={(e) => setNewListEmail(e.target.value)}
            className="max-w-xs"
          />
          <Button onClick={() => handleAddList(category)} disabled={!newListName.trim() || !newListEmail.trim()}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center py-6">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading settings...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="text-red-500">Error loading settings. Please try again later.</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mailing List Settings</CardTitle>
        <CardDescription>
          Manage mailing lists for new hires. Mandatory lists are auto-assigned based on department, role-based lists are auto-assigned based on position grade.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="mandatory" className="space-y-4">
          <TabsList>
            <TabsTrigger value="mandatory">Mandatory ({mailingLists.mandatory.length})</TabsTrigger>
            <TabsTrigger value="roleBased">Role-based ({mailingLists.roleBased.length})</TabsTrigger>
            <TabsTrigger value="optional">Optional ({mailingLists.optional.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="mandatory">
            {renderTable(mailingLists.mandatory, 'mandatory', 'Mandatory Mailing Lists (Department-based)')}
            <div className="text-sm text-muted-foreground mt-2">
              <Badge variant="outline">Note</Badge> Mandatory lists are automatically assigned based on the employee's department and cannot be deleted.
            </div>
          </TabsContent>
          
          <TabsContent value="roleBased">
            {renderTable(mailingLists.roleBased, 'roleBased', 'Role-based Mailing Lists')}
            <div className="text-sm text-muted-foreground mt-2">
              <Badge variant="outline">Note</Badge> Role-based lists are automatically assigned based on the employee's position grade.
            </div>
          </TabsContent>
          
          <TabsContent value="optional">
            {renderTable(mailingLists.optional, 'optional', 'Optional Mailing Lists')}
            <div className="text-sm text-muted-foreground mt-2">
              <Badge variant="outline">Note</Badge> Optional lists can be manually selected for each employee.
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleSaveSettings}
          disabled={saveMailingListsMutation.isPending}
        >
          {saveMailingListsMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save All Changes
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
