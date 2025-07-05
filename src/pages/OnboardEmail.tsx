import { MainLayout } from "@/components/layout/MainLayout";
import { OnboardEmailGenerator } from "@/components/onboard/OnboardEmailGenerator";

export default function OnboardEmail() {
  return (
    <MainLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Onboard Welcome Email</h2>
          <p className="text-muted-foreground">
            Generate personalized welcome emails for new hires based on their CV insights
          </p>
        </div>
        <OnboardEmailGenerator />
      </div>
    </MainLayout>
  );
}