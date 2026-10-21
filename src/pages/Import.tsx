import { FileImporter } from '@/components/import/FileImporter';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';
import '@/styles/merdeka-import.css';

const steps = [
  [
    'Download the template',
    'Use the CSV template for the expected column names and format.',
  ],
  [
    'Prepare your data',
    'Complete the required fields and check department names before uploading.',
  ],
  [
    'Upload and import',
    'Choose a CSV or Excel file, then select Import Data to validate and process it.',
  ],
  [
    'Review the results',
    'Review the result and any row errors. Imported records appear in New Hires.',
  ],
];

export default function Import() {
  return (
    <MainLayout>
      <div className="merdeka-import">
        <div className="merdeka-import-heading">
          <h1>Import New Hires</h1>
          <p>
            Upload employee records from CSV or Excel. Columns are mapped by
            their header names.
          </p>
        </div>
        <div className="merdeka-import-layout">
          <FileImporter />
          <aside
            className="merdeka-import-guidance"
            aria-label="Import guidance"
          >
            <Card className="merdeka-import-card">
              <CardHeader className="merdeka-import-card-header">
                <CardTitle>Import Process</CardTitle>
              </CardHeader>
              <CardContent className="merdeka-import-card-body">
                <ol className="merdeka-import-steps">
                  {steps.map(([title, description], index) => (
                    <li key={title}>
                      <span
                        className="merdeka-import-step-number"
                        aria-hidden="true"
                      >
                        {index + 1}
                      </span>
                      <div>
                        <h3>{title}</h3>
                        <p>{description}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
            <Card className="merdeka-import-card">
              <CardHeader className="merdeka-import-card-header">
                <CardTitle>Before You Import</CardTitle>
              </CardHeader>
              <CardContent className="merdeka-import-card-body">
                <ul className="merdeka-import-rules">
                  <li>
                    <CheckCircle2 aria-hidden="true" />
                    <span>
                      <strong>Required columns:</strong> name, title,
                      department, email and direct_report.
                    </span>
                  </li>
                  <li>
                    <CheckCircle2 aria-hidden="true" />
                    <span>
                      <strong>Departments:</strong> use names that already exist
                      in the database.
                    </span>
                  </li>
                  <li>
                    <CheckCircle2 aria-hidden="true" />
                    <span>
                      <strong>Dates:</strong> use YYYY-MM-DD format.
                    </span>
                  </li>
                  <li>
                    <CheckCircle2 aria-hidden="true" />
                    <span>
                      <strong>File formats:</strong> .csv, .xlsx and .xls.
                    </span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </MainLayout>
  );
}
