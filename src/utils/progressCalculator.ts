
import { NewHire } from "@/types/types";
import { isLicenseAssigned, isAccountActive, isLaptopReady, hasM365License, AccountStatus } from "@/utils/dataValidators";
import { getDashboardConfig } from '@/config/dashboardConfig';

// Distribution List Progress Logic
function getDistributionListProgress(status: NewHire['distribution_list_sync_status']): number {
  if (status === "Synced") return 10;     // full credit
  if (status === "Partial") return 5;     // half credit
  return 0; // Failed or null
}

export function calculateProgressPercentage(hire: NewHire): number {
  const config = getDashboardConfig();
  const weights = config.progressWeights;
  let progress = 0;

  // Account Creation Status
  if (isAccountActive(hire.account_creation_status as AccountStatus)) {
    progress += weights.accountCreation;
  }

  // Laptop Status
  const laptopStatus = hire.laptop_ready?.toLowerCase();
  switch (laptopStatus) {
    case "pending":
      progress += 0;
      break;
    case "in progress":
      progress += weights.laptopStatus * 0.25;
      break;
    case "ready":
      progress += weights.laptopStatus * 0.5;
      break;
    case "done":
      progress += weights.laptopStatus;
      break;
    default:
      progress += 0;
  }

  // License Assigned
  if (isLicenseAssigned(hire.license_assigned)) {
    progress += weights.licenseAssignment;
  }

  // SRF Status
  if (hire.status_srf) {
    progress += weights.srfStatus;
  }

  // Microsoft 365 License
  if (hasM365License(hire.microsoft_365_license)) {
    progress += weights.microsoft365License;
  }

  // Distribution List Sync
  progress += getDistributionListProgress(hire.distribution_list_sync_status) * (weights.distributionListSync / 10);

  return Math.round(Math.min(progress, 100));
}

export function getProgressColor(percentage: number): string {
  const config = getDashboardConfig();
  const thresholds = config.thresholds.completionRate;
  
  if (percentage >= thresholds.excellent) return "bg-green-500";
  if (percentage >= thresholds.good) return "bg-blue-500";
  if (percentage >= thresholds.warning) return "bg-yellow-500";
  return "bg-red-500";
}

export function getProgressTextColor(percentage: number): string {
  const config = getDashboardConfig();
  const thresholds = config.thresholds.completionRate;
  
  if (percentage >= thresholds.excellent) return "text-green-700";
  if (percentage >= thresholds.good) return "text-blue-700";
  if (percentage >= thresholds.warning) return "text-yellow-700";
  return "text-red-700";
}
