import { MainLayout } from '@/components/layout/MainLayout';
import { OnboardEmailGenerator } from '@/components/onboard/OnboardEmailGenerator';

import '@/styles/merdeka-onboard.css';

export default function OnboardEmail() {
  return (
    <MainLayout>
      <div className="merdeka-onboard">
        <div className="merdeka-onboard-heading">
          <h2 className="merdeka-onboard-title">Onboard Welcome Email</h2>
          <p className="text-muted-foreground">
            Generate personalized welcome emails for new hires based on their CV
            insights
          </p>
        </div>
        <OnboardEmailGenerator />
      </div>
    </MainLayout>
  );
}
