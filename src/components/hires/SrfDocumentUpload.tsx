import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Upload, Download, Trash2, FileText, AlertCircle, Eye } from "lucide-react";
import { srfService } from "@/services/srf-service";
import { NewHire } from "@/types/types";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { SrfDocumentPreview } from "./SrfDocumentPreview";

interface SrfDocumentUploadProps {
  hire: NewHire;
}

export function SrfDocumentUpload({ hire }: SrfDocumentUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
      
      // Invalidate and refetch hire data
      queryClient.invalidateQueries({ queryKey: ['hire', hire.id] });
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

  const handleDownload = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
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

  const handleDeleteClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!hire.id) return;

    setIsDeleting(true);

    try {
      console.log("Attempting to delete SRF document for hire ID:", hire.id);
      await srfService.deleteSrfDocument(hire.id);
      toast({
        title: "Success",
        description: "SRF document deleted successfully",
      });
      
      // Invalidate and refetch hire data
      queryClient.invalidateQueries({ queryKey: ['hire', hire.id] });
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

  const handlePreview = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (!hire.id || !hire.srf_document_name) return;

    // Check if file is PDF
    const fileExtension = hire.srf_document_name.split('.').pop()?.toLowerCase();
    if (fileExtension !== 'pdf') {
      toast({
        title: "Preview not available",
        description: "Preview is only available for PDF files. Please download to view this document.",
        variant: "destructive",
      });
      return;
    }

    setIsPreviewing(true);

    try {
      const blobUrl = await srfService.previewSrfDocument(hire.id);
      setPreviewUrl(blobUrl);
      setShowPreview(true);
      
      toast({
        title: "Document loaded",
        description: "SRF document is ready for preview",
      });
    } catch (error) {
      console.error("Error previewing SRF document:", error);
      toast({
        title: "Preview failed",
        description: "Failed to load SRF document for preview",
        variant: "destructive",
      });
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleClosePreview = () => {
    setShowPreview(false);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const hasDocument = hire.srf_document_path && hire.srf_document_name;
  const isPdfDocument = hasDocument && hire.srf_document_name?.split('.').pop()?.toLowerCase() === 'pdf';

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
                {isPdfDocument && (
                  <Button
                    type="button"
                    onClick={handlePreview}
                    size="sm"
                    variant="outline"
                    disabled={isPreviewing}
                    className="flex items-center gap-1"
                  >
                    <Eye className="h-3 w-3" />
                    {isPreviewing ? "Loading..." : "View"}
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={handleDownload}
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-1"
                >
                  <Download className="h-3 w-3" />
                  Download
                </Button>
                <Button
                  type="button"
                  onClick={handleDeleteClick}
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-1 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </Button>
              </div>
            </div>
            
            {!isPdfDocument && (
              <div className="flex items-center gap-2 text-amber-600 text-xs">
                <AlertCircle className="h-3 w-3" />
                <span>Preview is only available for PDF files</span>
              </div>
            )}
            
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
                  type="button"
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
                  type="button"
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

        <SrfDocumentPreview
          isOpen={showPreview}
          onClose={handleClosePreview}
          pdfUrl={previewUrl}
          documentName={hire.srf_document_name || ""}
        />
      </CardContent>
    </Card>
  );
}
