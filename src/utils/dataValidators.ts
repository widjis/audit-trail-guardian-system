/**
 * Data validation utilities for type-safe operations
 */

/**
 * Union type for license assignment values that can come from different data sources
 */
export type LicenseAssignmentValue = boolean | "True" | "true" | "False" | "false" | null | undefined;

/**
 * Type-safe utility to check if a license is assigned
 * Handles the mixed boolean/string values that can come from different data sources
 */
export function isLicenseAssigned(value: LicenseAssignmentValue): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return value === "True" || value === "true";
  }
  return false;
}

/**
 * Type-safe utility to normalize laptop status
 */
export type LaptopStatus = "Pending" | "In Progress" | "Ready" | "Done" | null | undefined;

export function isLaptopReady(status: LaptopStatus): boolean {
  return status === "Ready" || status === "Done";
}

/**
 * Type-safe utility to check account creation status
 */
export type AccountStatus = "Active" | "Inactive" | "Pending" | null | undefined;

export function isAccountActive(status: AccountStatus): boolean {
  return status === "Active";
}

/**
 * Type-safe utility to check Microsoft 365 license
 */
export function hasM365License(license: string | null | undefined): boolean {
  return Boolean(license && license !== "None" && license.trim() !== "");
}

/**
 * Comprehensive data validator for hire records
 */
export interface HireValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateHireData(hire: Record<string, unknown>): HireValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields validation
  if (!hire.id) errors.push("Missing hire ID");
  if (!hire.first_name) errors.push("Missing first name");
  if (!hire.last_name) errors.push("Missing last name");
  if (!hire.department) warnings.push("Missing department information");

  // Type validation for license_assigned
  if (hire.license_assigned !== undefined && 
      typeof hire.license_assigned !== 'boolean' && 
      typeof hire.license_assigned !== 'string') {
    warnings.push("license_assigned field has unexpected type");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}