-- Migration script to fix CHK_POSITION_GRADE constraint
-- This script drops the existing constraint and recreates it with updated position grades

-- Drop existing CHECK constraint if it exists
IF EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CHK_POSITION_GRADE')
BEGIN
    ALTER TABLE hires DROP CONSTRAINT CHK_POSITION_GRADE;
    PRINT 'Dropped existing CHK_POSITION_GRADE constraint';
END

-- Add new CHECK constraint with all current position grades from settings.json
ALTER TABLE hires ADD CONSTRAINT CHK_POSITION_GRADE 
CHECK (position_grade IN (
    'General Management',
    'Manager',
    'Superintendent', 
    'Supervisor',
    'Staff',
    'Non-Staff'
) OR position_grade IS NULL);

PRINT 'Added updated CHK_POSITION_GRADE constraint with Manager position';

-- Verify the constraint was created
SELECT 
    cc.name AS constraint_name,
    cc.definition AS constraint_definition
FROM sys.check_constraints cc
INNER JOIN sys.tables t ON cc.parent_object_id = t.object_id
WHERE t.name = 'hires' AND cc.name = 'CHK_POSITION_GRADE';