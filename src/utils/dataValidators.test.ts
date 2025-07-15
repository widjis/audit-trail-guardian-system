/**
 * Unit tests for data validation utilities
 * Run with: npm test dataValidators.test.ts
 */

import { 
  isLicenseAssigned, 
  isLaptopReady, 
  isAccountActive, 
  hasM365License,
  validateHireData,
  type LicenseAssignmentValue,
  type LaptopStatus,
  type AccountStatus
} from './dataValidators';

describe('Data Validators', () => {
  describe('isLicenseAssigned', () => {
    it('should return true for boolean true', () => {
      expect(isLicenseAssigned(true)).toBe(true);
    });

    it('should return false for boolean false', () => {
      expect(isLicenseAssigned(false)).toBe(false);
    });

    it('should return true for string "True"', () => {
      expect(isLicenseAssigned("True")).toBe(true);
    });

    it('should return true for string "true"', () => {
      expect(isLicenseAssigned("true")).toBe(true);
    });

    it('should return false for string "False"', () => {
      expect(isLicenseAssigned("False")).toBe(false);
    });

    it('should return false for string "false"', () => {
      expect(isLicenseAssigned("false")).toBe(false);
    });

    it('should return false for null', () => {
      expect(isLicenseAssigned(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isLicenseAssigned(undefined)).toBe(false);
    });
  });

  describe('isLaptopReady', () => {
    it('should return true for "Ready"', () => {
      expect(isLaptopReady("Ready")).toBe(true);
    });

    it('should return true for "Done"', () => {
      expect(isLaptopReady("Done")).toBe(true);
    });

    it('should return false for "Pending"', () => {
      expect(isLaptopReady("Pending")).toBe(false);
    });

    it('should return false for "In Progress"', () => {
      expect(isLaptopReady("In Progress")).toBe(false);
    });

    it('should return false for null', () => {
      expect(isLaptopReady(null)).toBe(false);
    });
  });

  describe('isAccountActive', () => {
    it('should return true for "Active"', () => {
      expect(isAccountActive("Active")).toBe(true);
    });

    it('should return false for "Inactive"', () => {
      expect(isAccountActive("Inactive")).toBe(false);
    });

    it('should return false for "Pending"', () => {
      expect(isAccountActive("Pending")).toBe(false);
    });

    it('should return false for null', () => {
      expect(isAccountActive(null)).toBe(false);
    });
  });

  describe('hasM365License', () => {
    it('should return true for valid license', () => {
      expect(hasM365License("E3")).toBe(true);
      expect(hasM365License("E5")).toBe(true);
      expect(hasM365License("Business Premium")).toBe(true);
    });

    it('should return false for "None"', () => {
      expect(hasM365License("None")).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(hasM365License("")).toBe(false);
      expect(hasM365License("   ")).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(hasM365License(null)).toBe(false);
      expect(hasM365License(undefined)).toBe(false);
    });
  });

  describe('validateHireData', () => {
    it('should validate complete hire data', () => {
      const validHire = {
        id: 1,
        first_name: "John",
        last_name: "Doe",
        department: "IT",
        license_assigned: true
      };

      const result = validateHireData(validHire);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const invalidHire = {
        first_name: "John"
        // Missing id, last_name
      };

      const result = validateHireData(invalidHire);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Missing hire ID");
      expect(result.errors).toContain("Missing last name");
    });

    it('should warn about missing optional fields', () => {
      const hireWithoutDept = {
        id: 1,
        first_name: "John",
        last_name: "Doe"
        // Missing department
      };

      const result = validateHireData(hireWithoutDept);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain("Missing department information");
    });

    it('should warn about unexpected license_assigned type', () => {
      const hireWithBadLicense = {
        id: 1,
        first_name: "John",
        last_name: "Doe",
        license_assigned: 123 // Invalid type
      };

      const result = validateHireData(hireWithBadLicense);
      expect(result.warnings).toContain("license_assigned field has unexpected type");
    });
  });
});

// Example usage for documentation
export const exampleUsage = {
  // Type-safe license checking
  checkLicense: (hire: { license_assigned?: boolean | string }) => {
    // Old way (type unsafe):
    // return hire.license_assigned === true || hire.license_assigned === "True";
    
    // New way (type safe):
    return isLicenseAssigned(hire.license_assigned as LicenseAssignmentValue);
  },

  // Comprehensive validation
  processHire: (hire: Record<string, unknown>) => {
    const validation = validateHireData(hire);
    
    if (!validation.isValid) {
      console.error('Hire validation failed:', validation.errors);
      return false;
    }
    
    if (validation.warnings.length > 0) {
      console.warn('Hire validation warnings:', validation.warnings);
    }
    
    return true;
  }
};