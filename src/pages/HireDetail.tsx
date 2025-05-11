
import { useParams } from "react-router-dom";
import { HireForm } from "@/components/hires/HireForm";
import { AuditLogsList } from "@/components/hires/AuditLogsList";
import { MainLayout } from "@/components/layout/MainLayout";
import { Separator } from "@/components/ui/separator";
import { useEffect } from "react";

export default function HireDetail() {
  const { id } = useParams<{ id: string }>();
  
  useEffect(() => {
    // Log the ID to help with debugging
    console.log("HireDetail page loaded with ID:", id);
  }, [id]);

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
