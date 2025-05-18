
import { useQuery } from "@tanstack/react-query";
import { hiresApi } from "@/services/api";
import { AuditLog } from "@/types/types";

/**
 * Custom hook to fetch and cache audit logs for a hire
 */
export const useAuditLogs = (hireId: string | undefined) => {
  const enabled = !!hireId && hireId !== "new";
  
  return useQuery({
    queryKey: ['audit-logs', hireId],
    queryFn: async () => {
      if (!hireId) return [];
      const hire = await hiresApi.getOne(hireId);
      return hire.audit_logs || [];
    },
    enabled,
    staleTime: 10000, // 10 seconds before refetching
    gcTime: 300000, // Keep in cache for 5 minutes
  });
};
