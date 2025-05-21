
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

  // Generate the email content
  const generateEmailContent = () => {
    // Create table header
    let tableContent = "Name\tTitle\tLicense Type\tJoin Date\n";
    
    // Add table rows
    selectedHires.forEach(hire => {
      const joinDate = hire.on_site_date ? 
        format(new Date(hire.on_site_date), 'dd MMM yyyy') : 'N/A';
      const licenseType = hire.microsoft_365_license || "Not specified";
      
      tableContent += `${hire.name}\t${hire.title}\t${licenseType}\t${joinDate}\n`;
    });
    
    // Assemble the full email content
    const emailContent = `Dear Mas Ricky,

Mohon bantuannya untuk assign license untuk Tim Morowali dengan SRF terlampir.

Berikut detail user:
${tableContent}

Terima kasih,`;

    return emailContent;
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(generateEmailContent())
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
