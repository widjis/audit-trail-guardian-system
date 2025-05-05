
import { useParams } from "react-router-dom";
import { HireForm } from "@/components/hires/HireForm";
import { AuditLogsList } from "@/components/hires/AuditLogsList";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function HireDetail() {
  const { id } = useParams<{ id: string }>();
  
  return (
    <MainLayout>
      <div className="space-y-6">
        <HireForm />
        {id && id !== "new" && (
          <>
            <Separator className="my-6" />
            <AuditLogsList hireId={id} />
          </>
        )}
      </div>
    </MainLayout>
  );
}
