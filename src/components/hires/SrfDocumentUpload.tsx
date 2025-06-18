
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Upload, Download, Trash2, FileText, AlertCircle } from "lucide-react";
import { srfService } from "@/services/srf-service";
import { NewHire } from "@/types/types";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface SrfDocumentUploadProps {
  hire: NewHire;
  onUploadSuccess: () => void;
}

export function SrfDocumentUpload({ hire, onUploadSuccess }: SrfDocumentUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !hire.id) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF or Word document",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      await srfService.uploadSrfDocument(hire.id, file);
      toast({
        title: "Success",
        description: "SRF document uploaded successfully",
      });
      onUploadSuccess();
    } catch (error) {
      console.error("Error uploading SRF document:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload SRF document",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // Reset the input
      event.target.value = '';
    }
  };

  const handleDownload = async () => {
    if (!hire.id || !hire.srf_document_name) return;

    try {
      const blob = await srfService.downloadSrfDocument(hire.id, hire.srf_document_name);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = hire.srf_document_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Download started",
        description: "SRF document download has started",
      });
    } catch (error) {
      console.error("Error downloading SRF document:", error);
      toast({
        title: "Download failed",
        description: "Failed to download SRF document",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!hire.id) return;

    setIsDeleting(true);

    try {
      await srfService.deleteSrfDocument(hire.id);
      toast({
        title: "Success",
        description: "SRF document deleted successfully",
      });
      onUploadSuccess();
      setShowDeleteDialog(false);
    } catch (error) {
      console.error("Error deleting SRF document:", error);
      toast({
        title: "Delete failed",
        description: "Failed to delete SRF document",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const hasDocument = hire.srf_document_path && hire.srf_document_name;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          SRF Document
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasDocument ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="font-medium text-sm">{hire.srf_document_name}</p>
                  <p className="text-xs text-gray-500">
                    Uploaded on {hire.srf_document_uploaded_at ? new Date(hire.srf_document_uploaded_at).toLocaleDateString() : 'Unknown date'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleDownload}
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-1"
                >
                  <Download className="h-3 w-3" />
                  Download
                </Button>
                <Button
                  onClick={() => setShowDeleteDialog(true)}
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-1 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Replace Document</label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="flex-1"
                />
                <Button
                  disabled={isUploading}
                  className="flex items-center gap-1"
                  size="sm"
                >
                  <Upload className="h-3 w-3" />
                  {isUploading ? "Uploading..." : "Replace"}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">No SRF document uploaded</span>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Upload SRF Document</label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="flex-1"
                />
                <Button
                  disabled={isUploading}
                  className="flex items-center gap-1"
                  size="sm"
                >
                  <Upload className="h-3 w-3" />
                  {isUploading ? "Uploading..." : "Upload"}
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Supported formats: PDF, DOC, DOCX (max 10MB)
              </p>
            </div>
          </div>
        )}

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete SRF Document</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this SRF document? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
