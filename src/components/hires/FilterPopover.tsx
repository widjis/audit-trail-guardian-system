import React from 'react';
import { Filter, FilterX } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface FilterPopoverProps {
  label?: string;
  isActive: boolean;
  onClear: () => void;
  children: React.ReactNode;
}

export function FilterPopover({
  isActive,
  onClear,
  children,
  label = 'Filter',
}: FilterPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger
        aria-label={label}
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'sm' }),
          'h-6 w-6 p-0 merdeka-legacy',
          isActive && 'text-primary bg-muted',
        )}
      >
        {isActive ? (
          <FilterX className="h-3 w-3" />
        ) : (
          <Filter className="h-3 w-3" />
        )}
        <span className="sr-only">{label}</span>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="start">
        <div className="space-y-4">
          <div className="space-y-2">{children}</div>
          <div className="flex justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="text-xs"
            >
              Clear
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
