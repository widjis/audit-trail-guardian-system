
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
  isDefault?: boolean;
}

interface MultiSelectMailingListProps {
  value: string[] | string;
  onChange: (value: string[]) => void;
  lists: MailingList[];
  disabled?: boolean;
  placeholder?: string;
}

export function MultiSelectMailingList({ 
  value = [], 
  onChange, 
  lists = [],
  disabled = false,
  placeholder = "Select mailing lists..." 
}: MultiSelectMailingListProps) {
  const [open, setOpen] = useState(false);
  const [selectedLists, setSelectedLists] = useState<string[]>([]);

  // Update component state when prop value changes
  useEffect(() => {
    if (Array.isArray(value)) {
      setSelectedLists(value);
    } else if (typeof value === 'string' && value) {
      // Handle legacy format (comma-separated string)
      const listArray = value.split(',').map(item => item.trim());
      setSelectedLists(listArray);
      onChange(listArray);
    } else {
      // Handle case when value is empty
      setSelectedLists([]);
    }
  }, [value, onChange]);

  const handleSelect = (listName: string) => {
    // If already selected, don't add it again
    if (selectedLists.includes(listName)) {
      return;
    }

    const newSelectedLists = [...selectedLists, listName];
    setSelectedLists(newSelectedLists);
    onChange(newSelectedLists);
  };

  const handleRemove = (listName: string) => {
    const newSelectedLists = selectedLists.filter(name => name !== listName);
    setSelectedLists(newSelectedLists);
    onChange(newSelectedLists);
  };

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
        <PopoverContent className="p-0 w-full" align="start">
          <Command>
            <CommandInput placeholder="Search mailing lists..." />
            <CommandList>
              <CommandEmpty>No mailing list found</CommandEmpty>
              <CommandGroup>
                {lists.map((list) => (
                  <CommandItem
                    key={list.id}
                    value={list.name}
                    onSelect={() => {
                      handleSelect(list.name);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedLists.includes(list.name) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {list.name}
                    {list.isDefault && <span className="ml-2 text-xs text-muted-foreground">(Default)</span>}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Display selected items as badges */}
      {selectedLists.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {selectedLists.map((list) => (
            <Badge key={list} variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1">
              {list}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 ml-1 hover:bg-muted"
                onClick={() => handleRemove(list)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
