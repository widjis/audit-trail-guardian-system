
/**
 * Determines the appropriate ACL group for a user based on their department
 * This logic matches the existing implementation in CreateADAccountDialog.tsx
 */
export function getACLForDepartment(department: string | null | undefined): string {
  if (!department) {
    return "ACL MTI Users";
  }

  // Special handling for specific departments
  if (department === "Occupational Health and Safety" || department === "Environment") {
    return "ACL MTI OHSE";
  }
  
  // Standard department mapping - remove ' Plant' suffix if present
  return `ACL MTI ${department.replace(' Plant', '')}`;
}
