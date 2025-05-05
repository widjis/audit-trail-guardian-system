
import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Save, Edit, Trash } from "lucide-react";
import { toast } from "sonner";

export function DepartmentListSettings() {
  const [departments, setDepartments] = useState([
    { id: "1", name: "Engineering", code: "ENG" },
    { id: "2", name: "Human Resources", code: "HR" },
    { id: "3", name: "Finance", code: "FIN" },
    { id: "4", name: "Marketing", code: "MKT" },
    { id: "5", name: "Sales", code: "SLS" }
  ]);
  
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptCode, setNewDeptCode] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");

  const handleAddDepartment = () => {
    if (!newDeptName.trim() || !newDeptCode.trim()) {
      toast.error("Department name and code are required");
      return;
    }
    
    if (departments.some(dept => dept.name.toLowerCase() === newDeptName.trim().toLowerCase())) {
      toast.error("This department already exists");
      return;
    }
    
    if (departments.some(dept => dept.code.toUpperCase() === newDeptCode.trim().toUpperCase())) {
      toast.error("This department code is already in use");
      return;
    }
    
    const newId = String(Math.max(...departments.map(dept => Number(dept.id))) + 1);
    setDepartments([...departments, { 
      id: newId, 
      name: newDeptName.trim(), 
      code: newDeptCode.trim().toUpperCase()
    }]);
    
    setNewDeptName("");
    setNewDeptCode("");
    toast.success("New department added");
  };

  const handleRemoveDepartment = (id: string) => {
    setDepartments(departments.filter(dept => dept.id !== id));
    toast.success("Department removed");
  };

  const handleStartEdit = (dept: { id: string, name: string, code: string }) => {
    setEditingId(dept.id);
    setEditName(dept.name);
    setEditCode(dept.code);
  };

  const handleSaveEdit = (id: string) => {
    if (!editName.trim() || !editCode.trim()) {
      toast.error("Department name and code are required");
      return;
    }
    
    const codeExists = departments.some(
      dept => dept.id !== id && dept.code.toUpperCase() === editCode.trim().toUpperCase()
    );
    
    if (codeExists) {
      toast.error("This department code is already in use");
      return;
    }
    
    setDepartments(departments.map(dept => 
      dept.id === id ? { 
        ...dept, 
        name: editName.trim(),
        code: editCode.trim().toUpperCase()
      } : dept
    ));
    
    setEditingId(null);
    toast.success("Department updated");
  };

  const handleSaveChanges = () => {
    // In a real app, this would save to API
    toast.success("Department settings saved successfully");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Department Settings</CardTitle>
        <CardDescription>
          Manage the list of departments available for new hires.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Available Departments</h3>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead className="w-[150px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.map(dept => (
                <TableRow key={dept.id}>
                  <TableCell>
                    {editingId === dept.id ? (
                      <Input 
                        value={editName} 
                        onChange={e => setEditName(e.target.value)} 
                        className="max-w-xs" 
                      />
                    ) : (
                      dept.name
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === dept.id ? (
                      <Input 
                        value={editCode} 
                        onChange={e => setEditCode(e.target.value)} 
                        className="w-24"
                        maxLength={5}
                      />
                    ) : (
                      dept.code
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === dept.id ? (
                      <Button size="sm" onClick={() => handleSaveEdit(dept.id)}>Save</Button>
                    ) : (
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleStartEdit(dept)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-red-500 hover:text-red-700"
                          onClick={() => handleRemoveDepartment(dept.id)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input 
              placeholder="Department Name" 
              value={newDeptName} 
              onChange={(e) => setNewDeptName(e.target.value)}
            />
            <Input 
              placeholder="Code (e.g. HR, FIN)" 
              value={newDeptCode} 
              onChange={(e) => setNewDeptCode(e.target.value)}
              className="md:col-span-1"
              maxLength={5}
            />
            <Button 
              onClick={handleAddDepartment} 
              disabled={!newDeptName.trim() || !newDeptCode.trim()}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Department
            </Button>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSaveChanges}>
          <Save className="h-4 w-4 mr-2" />
          Save All Changes
        </Button>
      </CardFooter>
    </Card>
  );
}
