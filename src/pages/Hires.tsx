import { HiresTable } from '@/components/hires/HiresTable';
import { MainLayout } from '@/components/layout/MainLayout';

export default function Hires() {
  return (
    <MainLayout>
      <section className="merdeka-hires" aria-labelledby="hires-title">
        <div className="merdeka-page-heading">
          <h1 id="hires-title">New Hires</h1>
          <p>Track onboarding, account provisioning and equipment readiness.</p>
        </div>
        <HiresTable />
      </section>
    </MainLayout>
  );
}
