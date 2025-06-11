
/**
 * Maps department names to their corresponding Active Directory ACL group names
 * This ensures users are added to the correct department-specific groups during AD account creation
 */

export interface DepartmentACLMapping {
  [department: string]: string;
}

// Default mapping of departments to ACL groups
const DEPARTMENT_ACL_MAP: DepartmentACLMapping = {
  "Human Resources": "MTI Human Resources",
  "HR": "MTI Human Resources",
  "Information Technology": "MTI Information Technology",
  "IT": "MTI Information Technology",
  "Finance": "MTI Finance",
  "Accounting": "MTI Finance", // Finance and Accounting might use same ACL
  "Operations": "MTI Operations",
  "Marketing": "MTI Marketing",
  "Sales": "MTI Sales",
  "Engineering": "MTI Engineering",
  "Administration": "MTI Administration",
  "Management": "MTI Management",
  "Support": "MTI Support",
  "Legal": "MTI Legal",
  "Procurement": "MTI Procurement",
  "Quality Assurance": "MTI Quality Assurance",
  "QA": "MTI Quality Assurance",
  "Research and Development": "MTI Research and Development",
  "R&D": "MTI Research and Development"
};

/**
 * Gets the appropriate ACL group name for a given department
 * @param department - The department name from the hire record
 * @returns The corresponding ACL group name, or a default if no mapping exists
 */
export function getDepartmentACL(department: string | null | undefined): string {
  if (!department) {
    console.warn('No department provided, using default ACL group');
    return 'MTI Default-Group';
  }
  
  // Normalize the department name (trim whitespace and handle case variations)
  const normalizedDepartment = department.trim();
  
  // First try exact match
  if (DEPARTMENT_ACL_MAP[normalizedDepartment]) {
    console.log(`Mapped department "${normalizedDepartment}" to ACL group "${DEPARTMENT_ACL_MAP[normalizedDepartment]}"`);
    return DEPARTMENT_ACL_MAP[normalizedDepartment];
  }
  
  // Try case-insensitive match
  const departmentLower = normalizedDepartment.toLowerCase();
  for (const [dept, acl] of Object.entries(DEPARTMENT_ACL_MAP)) {
    if (dept.toLowerCase() === departmentLower) {
      console.log(`Mapped department "${normalizedDepartment}" to ACL group "${acl}" (case-insensitive match)`);
      return acl;
    }
  }
  
  // Try partial match (contains)
  for (const [dept, acl] of Object.entries(DEPARTMENT_ACL_MAP)) {
    if (departmentLower.includes(dept.toLowerCase()) || dept.toLowerCase().includes(departmentLower)) {
      console.log(`Mapped department "${normalizedDepartment}" to ACL group "${acl}" (partial match with "${dept}")`);
      return acl;
    }
  }
  
  // No match found, log warning and use default
  console.warn(`No ACL mapping found for department "${normalizedDepartment}", using default ACL group`);
  return 'MTI Default-Group';
}

/**
 * Gets all available department-to-ACL mappings
 * Useful for settings/configuration UI
 */
export function getAllDepartmentACLMappings(): DepartmentACLMapping {
  return { ...DEPARTMENT_ACL_MAP };
}

/**
 * Adds or updates a department-to-ACL mapping
 * This could be used in future settings functionality
 */
export function updateDepartmentACLMapping(department: string, aclGroup: string): void {
  DEPARTMENT_ACL_MAP[department] = aclGroup;
  console.log(`Updated ACL mapping: "${department}" -> "${aclGroup}"`);
}
