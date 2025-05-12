
import { ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { SortDirection } from "@/types/types";
import { Button } from "@/components/ui/button";

interface SortButtonProps {
  direction: SortDirection;
  onClick: () => void;
  className?: string;
}

export const SortButton = ({ direction, onClick, className }: SortButtonProps) => {
  return (
    <Button 
      onClick={onClick} 
      variant="ghost" 
      size="sm" 
      className={cn("h-4 w-4 p-0", className)}
    >
      {direction === "asc" ? (
        <ArrowUp className="h-3 w-3" />
      ) : direction === "desc" ? (
        <ArrowDown className="h-3 w-3" />
      ) : (
        <div className="h-3 w-3 flex flex-col items-center opacity-30 hover:opacity-100">
          <ArrowUp className="h-2 w-2" />
          <ArrowDown className="h-2 w-2" />
        </div>
      )}
    </Button>
  );
};
