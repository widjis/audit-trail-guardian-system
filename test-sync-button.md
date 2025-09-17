# Testing Sync Selected Button

## Steps to Test:

1. Open http://localhost:8080/hris-sync in your browser
2. Navigate to the "Table View" tab
3. Select one or more users by checking the checkboxes
4. Click the "Sync Selected" button
5. Open browser Developer Tools (F12) and check the Console tab

## Expected Console Output:

```
Sync Selected button clicked
selectedRows: ["employeeID1", "employeeID2", ...]
onSync function: function handleManualSync() { ... }
handleManualSync called with: ["employeeID1", "employeeID2", ...]
idsToSync: ["employeeID1", "employeeID2", ...]
Starting manual sync for: ["employeeID1", "employeeID2", ...]
```

## If Nothing Happens:

- Check if users are actually selected (checkboxes checked)
- Check if the button is visible and enabled
- Check console for any JavaScript errors
- Verify the onSync prop is being passed correctly

## Current Status:

Debugging logs have been added to both:
- HrisTableView.tsx (button click handler)
- HrisSync.tsx (handleManualSync function)

The development server is running at http://localhost:8080/