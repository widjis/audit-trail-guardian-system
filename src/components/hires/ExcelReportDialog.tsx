
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NewHire } from "@/types/types";
import { FileSpreadsheet, Download } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

interface ExcelReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedHires: NewHire[];
}

export function ExcelReportDialog({ isOpen, onClose, selectedHires }: ExcelReportDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setIsGenerating(false);
    }
  }, [isOpen]);

  // Generate Excel file and trigger download
  const generateExcelReport = () => {
    setIsGenerating(true);
    
    try {
      // Create CSV content with headers
      let csvContent = "SRF No.,Name,Title,Department,License Type,Email,Join Date\n";
      
      // Add data rows
      selectedHires.forEach(hire => {
        const joinDate = hire.on_site_date ? 
          format(new Date(hire.on_site_date), 'dd/MM/yyyy') : 'N/A';
        const licenseType = hire.microsoft_365_license || "Not specified";
        const email = hire.email || "";
        // Format: SRF No. (empty), Name, Title, Department, License Type, Email, Join Date
        const row = [
          "", // SRF No. (empty as requested)
          hire.name,
          hire.title,
          hire.department,
          licenseType,
          email,
          joinDate
        ];
        // Properly escape fields for CSV format
        const escapedRow = row.map(field => {
          // If field contains commas or quotes, wrap in quotes and escape any quotes
          if (field && (field.includes(',') || field.includes('"'))) {
            return `"${field.replace(/"/g, '""')}"`;
          }
          return field;
        });
        csvContent += escapedRow.join(',') + "\n";
      });
      
      // Create a blob and generate download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      // Set download attributes
      link.setAttribute('href', url);
      link.setAttribute('download', `license_request_report_${format(new Date(), 'yyyyMMdd')}.csv`);
      
      // Append to body, click and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Success!
      setIsGenerating(false);
    } catch (error) {
      console.error("Error generating Excel report:", error);
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="pt-6 max-w-6xl w-full max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Generate License Report</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-grow py-4">
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Preview of the report that will be generated as a CSV file. This file can be opened in Excel or any spreadsheet application.
            </p>
            
            <div className="border rounded-md">
              <Table className="mb-2 min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead>SRF No.</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>License Type</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Join Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedHires.map((hire) => (
                    <TableRow key={hire.id}>
                      <TableCell>-</TableCell>
                      <TableCell>{hire.name}</TableCell>
                      <TableCell>{hire.title}</TableCell>
                      <TableCell>{hire.department}</TableCell>
                      <TableCell>{hire.microsoft_365_license || "Not specified"}</TableCell>
                      <TableCell>{hire.email || ""}</TableCell>
                      <TableCell>
                        {hire.on_site_date 
                          ? format(new Date(hire.on_site_date), 'dd/MM/yyyy')
                          : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </ScrollArea>
        
        <DialogFooter className="pt-4">
          <p className="text-xs text-muted-foreground mr-auto">
            CSV file will be downloaded that can be opened in Excel
          </p>
          <Button onClick={onClose} variant="outline">Close</Button>
          <Button onClick={generateExcelReport} disabled={isGenerating} className="gap-2">
            {isGenerating ? (
              <>
                <FileSpreadsheet className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download Report
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
