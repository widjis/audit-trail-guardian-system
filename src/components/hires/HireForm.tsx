
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { hiresApi } from "@/services/api";
import { NewHire } from "@/types/types";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft } from "lucide-react";

const emptyHire: Omit<NewHire, "id" | "created_at" | "updated_at"> = {
  name: "",
  title: "",
  department: "",
  email: "",
  direct_report: "",
  phone_number: "",
  mailing_list: "",
  remarks: "",
  account_creation_status: "Pending",
  license_assigned: false,
  status_srf: false,
  username: "",
  password: "",
  on_site_date: new Date().toISOString().split("T")[0],
  microsoft_365_license: false,
  laptop_ready: "Pending",
  note: "",
  ict_support_pic: "",
};

export function HireForm() {
  const { id } = useParams<{ id: string }>();
  const isNewHire = id === "new";
  const [hire, setHire] = useState<Omit<NewHire, "id" | "created_at" | "updated_at">>(emptyHire);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isNewHire && id) {
      fetchHire(id);
    }
  }, [id, isNewHire]);

  const fetchHire = async (hireId: string) => {
    setIsFetching(true);
    try {
      const data = await hiresApi.getOne(hireId);
      // Filter out id, created_at, and updated_at
      const { id, created_at, updated_at, ...hireData } = data;
      setHire(hireData);
    } catch (error) {
      console.error("Error fetching hire:", error);
      toast({
        title: "Error",
        description: "Failed to fetch hire details",
        variant: "destructive",
      });
      navigate("/hires");
    } finally {
      setIsFetching(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setHire((prev) => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    setHire((prev) => ({ ...prev, [name]: checked }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setHire((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isNewHire) {
        await hiresApi.create(hire);
        toast({
          title: "Success",
          description: "New hire added successfully",
        });
      } else if (id) {
        await hiresApi.update(id, hire);
        toast({
          title: "Success",
          description: "Hire details updated successfully",
        });
      }
      navigate("/hires");
    } catch (error) {
      console.error("Error saving hire:", error);
      toast({
        title: "Error",
        description: "Failed to save hire details",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate("/hires")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-2xl font-bold">{isNewHire ? "Add New Hire" : "Edit Hire"}</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Full Name
                </label>
                <Input
                  id="name"
                  name="name"
                  value={hire.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={hire.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label htmlFor="title" className="text-sm font-medium">
                  Job Title
                </label>
                <Input
                  id="title"
                  name="title"
                  value={hire.title}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="department" className="text-sm font-medium">
                  Department
                </label>
                <Input
                  id="department"
                  name="department"
                  value={hire.department}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="phone_number" className="text-sm font-medium">
                  Phone Number
                </label>
                <Input
                  id="phone_number"
                  name="phone_number"
                  value={hire.phone_number}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="direct_report" className="text-sm font-medium">
                  Reports To
                </label>
                <Input
                  id="direct_report"
                  name="direct_report"
                  value={hire.direct_report}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="on_site_date" className="text-sm font-medium">
                  On-site Date
                </label>
                <Input
                  id="on_site_date"
                  name="on_site_date"
                  type="date"
                  value={hire.on_site_date}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account & Setup Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="username" className="text-sm font-medium">
                  Username
                </label>
                <Input
                  id="username"
                  name="username"
                  value={hire.username}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Password (Temporary)
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={hire.password}
                  onChange={handleInputChange}
                  placeholder="Leave blank to keep current password"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label htmlFor="account_creation_status" className="text-sm font-medium">
                  Account Creation Status
                </label>
                <Select
                  value={hire.account_creation_status}
                  onValueChange={(value) => handleSelectChange("account_creation_status", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Done">Done</SelectItem>
                    <SelectItem value="NO NEED">NO NEED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label htmlFor="laptop_ready" className="text-sm font-medium">
                  Laptop Status
                </label>
                <Select
                  value={hire.laptop_ready}
                  onValueChange={(value) => handleSelectChange("laptop_ready", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Ready">Ready</SelectItem>
                    <SelectItem value="Done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label htmlFor="mailing_list" className="text-sm font-medium">
                  Mailing Lists
                </label>
                <Input
                  id="mailing_list"
                  name="mailing_list"
                  value={hire.mailing_list}
                  onChange={handleInputChange}
                  placeholder="Comma-separated list"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex items-center space-x-2">
                <Switch
                  id="license_assigned"
                  checked={hire.license_assigned}
                  onCheckedChange={(checked) => handleSwitchChange("license_assigned", checked)}
                />
                <label htmlFor="license_assigned" className="text-sm font-medium">
                  License Assigned
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="status_srf"
                  checked={hire.status_srf}
                  onCheckedChange={(checked) => handleSwitchChange("status_srf", checked)}
                />
                <label htmlFor="status_srf" className="text-sm font-medium">
                  SRF Status
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="microsoft_365_license"
                  checked={hire.microsoft_365_license}
                  onCheckedChange={(checked) => handleSwitchChange("microsoft_365_license", checked)}
                />
                <label htmlFor="microsoft_365_license" className="text-sm font-medium">
                  Microsoft 365 License
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="ict_support_pic" className="text-sm font-medium">
                ICT Support PIC
              </label>
              <Input
                id="ict_support_pic"
                name="ict_support_pic"
                value={hire.ict_support_pic}
                onChange={handleInputChange}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="remarks" className="text-sm font-medium">
                Remarks
              </label>
              <Textarea
                id="remarks"
                name="remarks"
                value={hire.remarks}
                onChange={handleInputChange}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="note" className="text-sm font-medium">
                Additional Notes
              </label>
              <Textarea
                id="note"
                name="note"
                value={hire.note}
                onChange={handleInputChange}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => navigate("/hires")}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : isNewHire ? "Create" : "Update"}
          </Button>
        </div>
      </form>
    </div>
  );
}
