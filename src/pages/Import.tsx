
import { FileImporter } from "@/components/import/FileImporter";
import { MainLayout } from "@/components/layout/MainLayout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText } from "lucide-react";

export default function Import() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Import Data</h1>
        <Alert>
          <FileText className="h-4 w-4" />
          <AlertDescription>
            Import new hire data from Excel or CSV files. Download the template to ensure your data is formatted correctly.
            The system will automatically map columns based on header names and update the database.
          </AlertDescription>
        </Alert>
        <FileImporter />
      </div>
    </MainLayout>
  );
}
