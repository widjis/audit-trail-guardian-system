
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { hiresApi } from "@/services/api";
import { useToast } from "@/components/ui/use-toast";
import { Upload, AlertCircle, CheckCircle2, Download, FileText } from "lucide-react";

export function FileImporter() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; rowsImported?: number } | null>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const fileExt = selectedFile.name.split('.').pop()?.toLowerCase();
      
      if (fileExt === 'csv' || fileExt === 'xlsx' || fileExt === 'xls') {
        setFile(selectedFile);
        setResult(null);
      } else {
        toast({
          title: "Invalid File Type",
          description: "Please upload a CSV or Excel file (.csv, .xlsx, .xls)",
          variant: "destructive",
        });
        e.target.value = '';
      }
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast({
        title: "No File Selected",
        description: "Please select a file to import",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await hiresApi.import(file);
      setResult({
        success: response.success,
        message: response.message,
        rowsImported: response.rowsImported,
      });
      
      if (response.success) {
        toast({
          title: "Import Successful",
          description: `Successfully imported ${response.rowsImported} records`,
        });
      } else {
        toast({
          title: "Import Failed",
          description: response.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Import error:", error);
      setResult({
        success: false,
        message: error instanceof Error ? error.message : "An unknown error occurred",
      });
      toast({
        title: "Import Failed",
        description: "An error occurred during import",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    setIsDownloading(true);
    try {
      await hiresApi.downloadTemplate();
      toast({
        title: "Template Downloaded",
        description: "CSV template has been downloaded successfully",
      });
    } catch (error) {
      console.error("Download template error:", error);
      toast({
        title: "Download Failed",
        description: "Failed to download CSV template",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setResult(null);
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-xl">Import Data</CardTitle>
        <CardDescription>
          Upload CSV or Excel files containing new hire audit records
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-medium">Template</h3>
            <p className="text-xs text-muted-foreground">
              Download a CSV template with the required columns
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            className="gap-2"
            onClick={handleDownloadTemplate}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <>Downloading...</>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download Template
              </>
            )}
          </Button>
        </div>

        <div className="space-y-2">
          <label htmlFor="file-upload" className="text-sm font-medium">
            Select File
          </label>
          <Input 
            id="file-upload" 
            type="file" 
            accept=".csv,.xlsx,.xls"
            onChange={handleFileChange}
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Accepted formats: .csv, .xlsx, .xls
          </p>
        </div>
        
        {file && (
          <div className="p-4 border rounded flex items-center gap-2 bg-muted/50">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <Upload className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(2)} KB
              </p>
            </div>
          </div>
        )}

        {result && (
          <Alert variant={result.success ? "default" : "destructive"}>
            {result.success ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertTitle>
              {result.success ? "Import Successful" : "Import Failed"}
            </AlertTitle>
            <AlertDescription>
              {result.success 
                ? `Successfully imported ${result.rowsImported} records`
                : result.message}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <h3 className="text-sm font-medium">Required Column Mapping</h3>
          <div className="text-xs text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1">
            <div>name</div>
            <div>title</div>
            <div>department</div>
            <div>email</div>
            <div>direct_report</div>
            <div>phone_number</div>
            <div>mailing_list</div>
            <div>account_creation_status</div>
            <div>on_site_date</div>
            <div>ict_support_pic</div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Column headers in your file should match these names (case-insensitive)
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={resetForm}
          disabled={isLoading || (!file && !result)}
        >
          Reset
        </Button>
        <Button onClick={handleImport} disabled={!file || isLoading}>
          {isLoading ? "Importing..." : "Import Data"}
        </Button>
      </CardFooter>
    </Card>
  );
}
