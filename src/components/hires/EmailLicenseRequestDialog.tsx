
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NewHire } from "@/types/types";
import { Clipboard, ClipboardCheck } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

interface EmailLicenseRequestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedHires: NewHire[];
}

export function EmailLicenseRequestDialog({ isOpen, onClose, selectedHires }: EmailLicenseRequestDialogProps) {
  const [copied, setCopied] = useState(false);
  
  // Reset copied state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setCopied(false);
    }
  }, [isOpen]);

  // Generate the email content in HTML format
  const generateEmailHTMLContent = () => {
    // Create table HTML
    let tableRows = '';
    
    // Add table rows
    selectedHires.forEach(hire => {
      const joinDate = hire.on_site_date ? 
        format(new Date(hire.on_site_date), 'dd MMM yyyy') : 'N/A';
      const licenseType = hire.microsoft_365_license || "Not specified";
      
      tableRows += `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">${hire.name}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${hire.title}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${licenseType}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${joinDate}</td>
        </tr>
      `;
    });
    
    // Assemble the full email content in HTML
    const emailHTML = `
      <p>Dear Mas Ricky,</p>
      <p>Mohon bantuannya untuk assign license untuk Tim Morowali dengan SRF terlampir.</p>
      <p>Berikut detail user:</p>
      <table style="border-collapse: collapse; width: 100%;">
        <thead>
          <tr>
            <th style="padding: 8px; text-align: left; border: 1px solid #ddd; background-color: #f2f2f2;">Name</th>
            <th style="padding: 8px; text-align: left; border: 1px solid #ddd; background-color: #f2f2f2;">Title</th>
            <th style="padding: 8px; text-align: left; border: 1px solid #ddd; background-color: #f2f2f2;">License Type</th>
            <th style="padding: 8px; text-align: left; border: 1px solid #ddd; background-color: #f2f2f2;">Join Date</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
      <p>Terima kasih,</p>
    `;

    return emailHTML;
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(generateEmailHTMLContent())
      .then(() => {
        setCopied(true);
        // Reset the icon after 3 seconds
        setTimeout(() => setCopied(false), 3000);
      })
      .catch(err => {
        console.error("Failed to copy: ", err);
      });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Email License Request</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-grow py-4">
          <div className="space-y-6">
            <div className="font-medium">
              Dear Mas Ricky,
            </div>
            <p>
              Mohon bantuannya untuk assign license untuk Tim Morowali dengan SRF terlampir.
            </p>
            <div>
              <p className="mb-2">Berikut detail user:</p>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>License Type</TableHead>
                      <TableHead>Join Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedHires.map((hire) => (
                      <TableRow key={hire.id}>
                        <TableCell>{hire.name}</TableCell>
                        <TableCell>{hire.title}</TableCell>
                        <TableCell>{hire.microsoft_365_license || "Not specified"}</TableCell>
                        <TableCell>
                          {hire.on_site_date 
                            ? format(new Date(hire.on_site_date), 'dd MMM yyyy')
                            : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            <div>
              Terima kasih,
            </div>
          </div>
        </ScrollArea>
        
        <DialogFooter className="pt-4">
          <p className="text-xs text-muted-foreground mr-auto">
            HTML format will be copied for better email compatibility
          </p>
          <Button onClick={onClose} variant="outline">Close</Button>
          <Button onClick={handleCopyToClipboard} className="gap-2">
            {copied ? (
              <>
                <ClipboardCheck className="h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Clipboard className="h-4 w-4" />
                Copy to Clipboard
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
