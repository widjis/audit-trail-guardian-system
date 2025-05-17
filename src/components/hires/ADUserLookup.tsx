
import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { Check, ChevronsUpDown, Loader2, UserSearch } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { activeDirectoryService } from "@/services/active-directory-service";
import { useToast } from "@/components/ui/use-toast";
import logger from "@/utils/logger";

interface ADUser {
  displayName: string;
  username: string;
  email: string;
  title: string;
  department: string;
  dn: string;
}

interface ADUserLookupProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ADUserLookup({ value, onChange, placeholder = "Search managers...", disabled = false }: ADUserLookupProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<ADUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  
  // Handle search query changes with debouncing
  useEffect(() => {
    if (searchQuery.length < 2) {
      setUsers([]);
      setError(null);
      return;
    }
    
    // Clear any existing timeout
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    // Set a new timeout to debounce the search
    searchTimeout.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      
      try {
        logger.ui.debug('ADUserLookup', 'Searching AD users with query:', searchQuery);
        const result = await activeDirectoryService.searchUsers(searchQuery);
        
        if (result.success && Array.isArray(result.users)) {
          setUsers(result.users);
          if (result.users.length === 0) {
            setError(`No users found matching "${searchQuery}"`);
          }
        } else {
          setError(result.error || "Failed to search Active Directory");
          setUsers([]);
        }
      } catch (err) {
        logger.ui.error('ADUserLookup', 'Error searching AD users:', err);
        setError("Error searching Active Directory");
        setUsers([]);
        toast({
          title: "Search Error",
          description: "Failed to search Active Directory users.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }, 300); // 300ms debounce delay
    
    // Cleanup function
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [searchQuery, toast]);
  
  const handleSelect = (selectedUser: ADUser) => {
    logger.ui.debug('ADUserLookup', 'Selected user:', selectedUser.displayName);
    onChange(selectedUser.displayName);
    setOpen(false);
  };
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between"
        >
          {value || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="Search Active Directory users..." 
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          {loading && (
            <div className="py-6 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-2">Searching directory...</p>
            </div>
          )}
          {!loading && error && (
            <CommandEmpty className="py-6">
              <UserSearch className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-center">{error}</p>
              <p className="text-xs text-muted-foreground text-center mt-1">
                Try a different search term or continue typing to search
              </p>
            </CommandEmpty>
          )}
          {!loading && !error && users && users.length > 0 && (
            <CommandGroup>
              {users.map((user) => (
                <CommandItem
                  key={user.dn}
                  value={user.displayName}
                  onSelect={() => handleSelect(user)}
                  className="flex flex-col items-start"
                >
                  <div className="flex w-full items-center">
                    <span>{user.displayName}</span>
                    {value === user.displayName && (
                      <Check className="ml-auto h-4 w-4 shrink-0" />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground flex flex-col w-full">
                    {user.title && <span>{user.title}</span>}
                    {user.email && <span>{user.email}</span>}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {!loading && !error && (!users || users.length === 0) && searchQuery.length >= 2 && (
            <CommandEmpty className="py-6">
              <UserSearch className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-center">No users found</p>
              <p className="text-xs text-muted-foreground text-center mt-1">
                Try a different search term
              </p>
            </CommandEmpty>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
