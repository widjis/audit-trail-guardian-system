
import { FileImporter } from "@/components/import/FileImporter";
import { MainLayout } from "@/components/layout/MainLayout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { FileText, AlertCircle, CheckCircle2 } from "lucide-react";

export default function Import() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Import Data</h1>
        
        <Alert>
          <FileText className="h-4 w-4" />
          <AlertDescription>
            Import new hire data from Excel or CSV files. Download the template to ensure your data is formatted correctly.
            The system will validate departments against the database and automatically map columns based on header names.
          </AlertDescription>
        </Alert>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle>Import Process</CardTitle>
              <CardDescription>Steps to successfully import new hire data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-medium">1</span>
                </div>
                <div>
                  <h3 className="font-medium">Download Template</h3>
                  <p className="text-sm text-muted-foreground">
                    Download the CSV template to see the required columns and format.
                  </p>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-medium">2</span>
                </div>
                <div>
                  <h3 className="font-medium">Prepare Your Data</h3>
                  <p className="text-sm text-muted-foreground">
                    Fill in the template with your data. Required fields include name, title, department, email, and direct_report.
                  </p>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-medium">3</span>
                </div>
                <div>
                  <h3 className="font-medium">Upload and Import</h3>
                  <p className="text-sm text-muted-foreground">
                    Upload your CSV file and click Import. The system will validate the data and process it.
                  </p>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-medium">4</span>
                </div>
                <div>
                  <h3 className="font-medium">Review Results</h3>
                  <p className="text-sm text-muted-foreground">
                    Check the import results for any errors. Successfully imported records will be available in the system.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Validation Rules</CardTitle>
              <CardDescription>Data requirements for import</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                <p className="text-sm">
                  <span className="font-medium">Department validation:</span> Departments must exist in the database
                </p>
              </div>
              
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                <p className="text-sm">
                  <span className="font-medium">Required fields:</span> Name, Title, Department, Email, Direct Report
                </p>
              </div>
              
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                <p className="text-sm">
                  <span className="font-medium">Boolean fields:</span> license_assigned, status_srf, microsoft_365_license (accept "true", "false", "yes", "no", "1", "0")
                </p>
              </div>
              
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                <p className="text-sm">
                  <span className="font-medium">Date format:</span> Use YYYY-MM-DD format for dates
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <FileImporter />
      </div>
    </MainLayout>
  );
}
