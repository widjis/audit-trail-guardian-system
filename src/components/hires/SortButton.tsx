import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SortDirection } from '@/types/types';
import { Button } from '@/components/ui/button';

interface SortButtonProps {
  label?: string;
  direction: SortDirection;
  onClick: () => void;
  className?: string;
}

export const SortButton = ({
  direction,
  onClick,
  className,
  label = 'Sort column',
}: SortButtonProps) => {
  return (
    <Button
      aria-label={label}
      title={label}
      onClick={onClick}
      variant="ghost"
      size="sm"
      className={cn('h-5 w-5 p-0 inline-flex', className)}
    >
      {direction === 'asc' ? (
        <ArrowUp className="h-3 w-3" />
      ) : direction === 'desc' ? (
        <ArrowDown className="h-3 w-3" />
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-50" />
      )}
    </Button>
  );
};
