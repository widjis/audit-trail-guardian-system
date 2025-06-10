
import * as React from "react";
import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

interface MailingList {
  id: string;
  name: string;
  email: string;
  code?: string;
  departmentCode?: string;
  positionGrade?: string;
  isDefault?: boolean;
}

interface MailingListStructure {
  mandatory: MailingList[];
  optional: MailingList[];
  roleBased: MailingList[];
}

interface MultiSelectMailingListProps {
  value: string[] | string;
  onChange: (value: string[]) => void;
  lists: MailingListStructure | MailingList[];
  disabled?: boolean;
  placeholder?: string;
  department?: string;
  positionGrade?: string;
}

export function MultiSelectMailingList({ 
  value = [], 
  onChange, 
  lists = { mandatory: [], optional: [], roleBased: [] },
  disabled = false,
  placeholder = "Select mailing lists...",
  department,
  positionGrade
}: MultiSelectMailingListProps) {
  const [open, setOpen] = useState(false);
  const [selectedLists, setSelectedLists] = useState<string[]>([]);

  // Convert lists to structured format if it's an old array format
  const structuredLists = React.useMemo(() => {
    if (Array.isArray(lists)) {
      // Convert old format to new format
      return {
        mandatory: [],
        optional: lists,
        roleBased: []
      };
    }
    return lists;
  }, [lists]);

  // Auto-assign mailing lists based on department and position grade
  useEffect(() => {
    const autoAssignedLists: string[] = [];

    // Auto-assign mandatory mailing list based on department
    if (department) {
      const mandatoryList = structuredLists.mandatory.find(
        list => list.departmentCode === department || list.name === department
      );
      if (mandatoryList) {
        autoAssignedLists.push(mandatoryList.email);
      }
    }

    // Auto-assign role-based mailing list based on position grade
    if (positionGrade) {
      const roleBasedList = structuredLists.roleBased.find(
        list => list.positionGrade === positionGrade
      );
      if (roleBasedList) {
        autoAssignedLists.push(roleBasedList.email);
      }
    }

    // Merge auto-assigned with existing selected lists
    if (autoAssignedLists.length > 0) {
      const currentSelected = Array.isArray(value) ? value : 
        (typeof value === 'string' && value ? value.split(',').map(item => item.trim()).filter(Boolean) : []);
      
      const mergedLists = [...new Set([...currentSelected, ...autoAssignedLists])];
      if (JSON.stringify(mergedLists.sort()) !== JSON.stringify(currentSelected.sort())) {
        onChange(mergedLists);
      }
    }
  }, [department, positionGrade, structuredLists, value, onChange]);

  // Update component state when prop value changes
  useEffect(() => {
    if (Array.isArray(value)) {
      setSelectedLists(value);
    } else if (typeof value === 'string' && value) {
      // Handle legacy format (comma-separated string)
      const listArray = value.split(',').map(item => item.trim()).filter(Boolean);
      setSelectedLists(listArray);
      onChange(listArray);
    } else {
      // Handle case when value is empty
      setSelectedLists([]);
    }
  }, [value, onChange]);

  const handleSelect = (listEmail: string) => {
    // If already selected, don't add it again
    if (selectedLists.includes(listEmail)) {
      return;
    }

    const newSelectedLists = [...selectedLists, listEmail];
    setSelectedLists(newSelectedLists);
    onChange(newSelectedLists);
  };

  const handleRemove = (listEmail: string) => {
    const newSelectedLists = selectedLists.filter(email => email !== listEmail);
    setSelectedLists(newSelectedLists);
    onChange(newSelectedLists);
  };

  // Get all lists for display
  const allLists = [
    ...structuredLists.mandatory,
    ...structuredLists.optional,
    ...structuredLists.roleBased
  ];

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between"
          >
            {selectedLists.length > 0 ? `${selectedLists.length} list(s) selected` : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[400px] max-h-[400px]" align="start">
          <Command>
            <CommandInput placeholder="Search mailing lists..." />
            <CommandList className="max-h-[350px]">
              <CommandEmpty>No mailing list found</CommandEmpty>
              
              {structuredLists.mandatory.length > 0 && (
                <CommandGroup heading="Mandatory (Department-based)">
                  {structuredLists.mandatory.map((list) => (
                    <CommandItem
                      key={list.id}
                      value={`${list.name} ${list.email}`}
                      onSelect={() => {
                        handleSelect(list.email);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedLists.includes(list.email) ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium">{list.name}</span>
                        <span className="text-xs text-muted-foreground">{list.email}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {structuredLists.roleBased.length > 0 && (
                <CommandGroup heading="Role-based">
                  {structuredLists.roleBased.map((list) => (
                    <CommandItem
                      key={list.id}
                      value={`${list.name} ${list.email}`}
                      onSelect={() => {
                        handleSelect(list.email);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedLists.includes(list.email) ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium">{list.name}</span>
                        <span className="text-xs text-muted-foreground">{list.email}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {structuredLists.optional.length > 0 && (
                <CommandGroup heading="Optional">
                  {structuredLists.optional.map((list) => (
                    <CommandItem
                      key={list.id}
                      value={`${list.name} ${list.email}`}
                      onSelect={() => {
                        handleSelect(list.email);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedLists.includes(list.email) ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium">{list.name}</span>
                        <span className="text-xs text-muted-foreground">{list.email}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Display selected items as badges */}
      {selectedLists.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {selectedLists.map((email) => {
            const list = allLists.find(l => l.email === email);
            const displayName = list ? list.name : email;
            
            return (
              <Badge key={email} variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1">
                {displayName}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 p-0 ml-1 hover:bg-muted"
                  onClick={() => handleRemove(email)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
