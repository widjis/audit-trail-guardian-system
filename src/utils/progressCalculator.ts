
import { NewHire } from "@/types/types";

export function calculateProgressPercentage(hire: NewHire): number {
  let progress = 0;

  // Account Creation Status = Active (25%)
  if (hire.account_creation_status === "Active") {
    progress += 25;
  }

  // Laptop Status (25% total, divided by 4 stages)
  const laptopStatus = hire.laptop_ready?.toLowerCase();
  switch (laptopStatus) {
    case "pending":
      progress += 0;
      break;
    case "in progress":
      progress += 6.25;
      break;
    case "ready":
      progress += 12.5;
      break;
    case "done":
      progress += 25;
      break;
    default:
      progress += 0;
  }

  // License Assigned (20%)
  if (hire.license_assigned) {
    progress += 20;
  }

  // SRF Status (15%)
  if (hire.status_srf) {
    progress += 15;
  }

  // Microsoft 365 License (15%)
  if (hire.microsoft_365_license && hire.microsoft_365_license !== "None" && hire.microsoft_365_license !== "") {
    progress += 15;
  }

  return Math.round(progress);
}

export function getProgressColor(percentage: number): string {
  if (percentage < 50) return "bg-red-500";
  if (percentage < 75) return "bg-yellow-500";
  return "bg-green-500";
}

export function getProgressTextColor(percentage: number): string {
  if (percentage < 50) return "text-red-700";
  if (percentage < 75) return "text-yellow-700";
  return "text-green-700";
}
