
import { FileImporter } from "@/components/import/FileImporter";
import { MainLayout } from "@/components/layout/MainLayout";

export default function Import() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Import Data</h1>
        <p className="text-muted-foreground">
          Import new hire data from Excel or CSV files. The system will automatically map columns
          based on header names and update the database.
        </p>
        <FileImporter />
      </div>
    </MainLayout>
  );
}
