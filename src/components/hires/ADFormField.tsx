
import React from "react";
import { Input } from "@/components/ui/input";
import { ADUserLookup } from "./ADUserLookup";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ADFormFieldProps {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectChange?: (name: string, value: string) => void;
  isADEnabled?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
  type?: string;
  adLabel?: string;
}

export function ADFormField({
  id,
  name,
  label,
  value,
  onChange,
  onSelectChange,
  isADEnabled = false,
  required = false,
  placeholder = "",
  className = "",
  type = "text",
  adLabel = "AD Lookup Enabled",
}: ADFormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id} className="text-sm font-medium">
        {label} {isADEnabled && onSelectChange && <span className="text-xs text-muted-foreground">({adLabel})</span>}
      </Label>
      
      {isADEnabled && onSelectChange ? (
        <ADUserLookup 
          value={value} 
          onChange={(newValue) => onSelectChange(name, newValue)}
          placeholder={placeholder || `Search ${label.toLowerCase()}...`}
        />
      ) : (
        <Input
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
        />
      )}
    </div>
  );
}
