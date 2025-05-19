import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Save, Edit, Trash, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { settingsService } from "@/services/settings-service";
import { useQuery, useMutation } from "@tanstack/react-query";

export function MailingListSettings() {
  const [mailingLists, setMailingLists] = useState<Array<{ id: string; name: string; isDefault: boolean }>>([]);
  const [newListName, setNewListName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [useAsDropdown, setUseAsDropdown] = useState(true);
  
  // Fetch settings from the server
  const { data, isLoading, error } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsService.getSettings
  });
  
  // Update settings when data is loaded
  useEffect(() => {
    if (data) {
      if (data.mailingLists) {
        setMailingLists(data.mailingLists);
      }
      // Always set to true - dropdown is now permanently enabled
      setUseAsDropdown(true);
    }
  }, [data]);
  
  // Save mailing lists mutation
  const saveMailingListsMutation = useMutation({
    mutationFn: (params: { lists: typeof mailingLists, dropdown: boolean }) => 
      settingsService.updateMailingLists(params.lists, params.dropdown),
    onSuccess: () => {
      toast.success("Mailing list settings saved successfully");
    },
    onError: (error) => {
      toast.error("Failed to save mailing list settings");
      console.error("Error saving mailing lists:", error);
    }
  });

  const handleAddList = () => {
    if (!newListName.trim()) return;
    
    if (mailingLists.some(list => list.name.toLowerCase() === newListName.trim().toLowerCase())) {
      toast.error("This mailing list already exists");
      return;
    }
    
    const newId = String(Math.max(...mailingLists.map(list => Number(list.id)), 0) + 1);
    setMailingLists([...mailingLists, { 
      id: newId, 
      name: newListName.trim(), 
      isDefault: false 
    }]);
    setNewListName("");
    toast.success("New mailing list added");
  };

  const handleRemoveList = (id: string) => {
    setMailingLists(mailingLists.filter(list => list.id !== id));
    toast.success("Mailing list removed");
  };

  const handleStartEdit = (list: { id: string, name: string }) => {
    setEditingId(list.id);
    setEditName(list.name);
  };

  const handleSaveEdit = (id: string) => {
    if (!editName.trim()) {
      toast.error("Mailing list name cannot be empty");
      return;
    }
    
    setMailingLists(mailingLists.map(list => 
      list.id === id ? { ...list, name: editName.trim() } : list
    ));
    setEditingId(null);
    toast.success("Mailing list updated");
  };

  const handleSetDefault = (id: string) => {
    setMailingLists(mailingLists.map(list => 
      ({ ...list, isDefault: list.id === id })
    ));
    toast.success("Default mailing list updated");
  };

  const handleSaveSettings = () => {
    // Always save with dropdown set to true
    saveMailingListsMutation.mutate({ 
      lists: mailingLists, 
      dropdown: true 
    });
  };

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
          Manage mailing lists for new hires. Multiple mailing lists can be selected for each hire.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Remove the dropdown toggle option as it's now permanently enabled */}
        
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Available Mailing Lists</h3>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[150px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mailingLists.map(list => (
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
                    {list.isDefault && <Badge>Default</Badge>}
                  </TableCell>
                  <TableCell>
                    {editingId === list.id ? (
                      <Button size="sm" onClick={() => handleSaveEdit(list.id)}>Save</Button>
                    ) : (
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleStartEdit(list)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {!list.isDefault && (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleSetDefault(list.id)}
                            >
                              Set Default
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-red-500 hover:text-red-700"
                              onClick={() => handleRemoveList(list.id)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          <div className="flex gap-2">
            <Input 
              placeholder="Add new mailing list..." 
              value={newListName} 
              onChange={(e) => setNewListName(e.target.value)}
              className="max-w-xs"
            />
            <Button onClick={handleAddList} disabled={!newListName.trim()}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </div>
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
