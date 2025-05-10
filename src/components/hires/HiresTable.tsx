import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { hiresApi } from "@/services/api";
import { NewHire } from "@/types/types";
import { useToast } from "@/components/ui/use-toast";
import { Edit, Trash2, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function HiresTable() {
  const [hires, setHires] = useState<NewHire[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedHires, setSelectedHires] = useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchHires();
  }, []);

  // Reset selected hires when the search query changes
  useEffect(() => {
    setSelectedHires([]);
  }, [searchQuery]);

  const fetchHires = async () => {
    try {
      setIsLoading(true);
      const data = await hiresApi.getAll();
      setHires(data);
    } catch (error) {
      console.error("Error fetching hires:", error);
      toast({
        title: "Error",
        description: "Failed to fetch new hires data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this record?")) {
      try {
        await hiresApi.delete(id);
        toast({
          title: "Success",
          description: "Record deleted successfully",
        });
        fetchHires();
      } catch (error) {
        console.error("Error deleting hire:", error);
        toast({
          title: "Error",
          description: "Failed to delete record",
          variant: "destructive",
        });
      }
    }
  };

  const filteredHires = hires.filter((hire) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      hire.name.toLowerCase().includes(searchLower) ||
      hire.email.toLowerCase().includes(searchLower) ||
      hire.department.toLowerCase().includes(searchLower) ||
      hire.title.toLowerCase().includes(searchLower)
    );
  });

  const handleSelectAll = () => {
    if (selectedHires.length === filteredHires.length) {
      setSelectedHires([]);
    } else {
      setSelectedHires(filteredHires.map(hire => hire.id));
    }
  };

  const handleSelectHire = (id: string) => {
    if (selectedHires.includes(id)) {
      setSelectedHires(selectedHires.filter(hireId => hireId !== id));
    } else {
      setSelectedHires([...selectedHires, id]);
    }
  };

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    try {
      await hiresApi.bulkDelete(selectedHires);
      toast({
        title: "Success",
        description: `${selectedHires.length} records deleted successfully`,
      });
      setSelectedHires([]);
      fetchHires();
    } catch (error) {
      console.error("Error deleting multiple hires:", error);
      toast({
        title: "Error",
        description: "Failed to delete selected records",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, department..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          {selectedHires.length > 0 && (
            <Button 
              variant="destructive" 
              onClick={() => setIsDeleteDialogOpen(true)}
              disabled={isDeleting}
            >
              Delete Selected ({selectedHires.length})
            </Button>
          )}
          <Button onClick={() => navigate("/hires/new")}>Add New Hire</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : filteredHires.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {searchQuery ? "No matching records found" : "No records available. Import or add new hires."}
        </div>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={selectedHires.length === filteredHires.length && filteredHires.length > 0}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Onsite Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHires.map((hire) => (
                <TableRow key={hire.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedHires.includes(hire.id)}
                      onCheckedChange={() => handleSelectHire(hire.id)}
                      aria-label={`Select ${hire.name}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{hire.name}</TableCell>
                  <TableCell>{hire.title}</TableCell>
                  <TableCell>{hire.department}</TableCell>
                  <TableCell>{hire.email}</TableCell>
                  <TableCell>{new Date(hire.on_site_date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      hire.account_creation_status === "Done" ? 
                        "bg-green-100 text-green-800" : 
                        "bg-yellow-100 text-yellow-800"
                    }`}>
                      {hire.account_creation_status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => navigate(`/hires/${hire.id}`)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDelete(hire.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to delete {selectedHires.length} record{selectedHires.length !== 1 ? 's' : ''}. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDelete} 
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
