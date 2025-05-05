
import { HiresTable } from "@/components/hires/HiresTable";
import { MainLayout } from "@/components/layout/MainLayout";

export default function Hires() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">New Hires</h1>
        <HiresTable />
      </div>
    </MainLayout>
  );
}
