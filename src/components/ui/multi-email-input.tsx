
import React, { useState, KeyboardEvent, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface MultiEmailInputProps {
  value: string[];
  onChange: (emails: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function MultiEmailInput({ 
  value = [], 
  onChange, 
  placeholder = "Enter email addresses...",
  className,
  disabled = false
}: MultiEmailInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [isValid, setIsValid] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  const addEmail = (email: string) => {
    const trimmedEmail = email.trim();
    if (trimmedEmail && validateEmail(trimmedEmail) && !value.includes(trimmedEmail)) {
      onChange([...value, trimmedEmail]);
      setInputValue("");
      setIsValid(true);
    } else if (trimmedEmail && !validateEmail(trimmedEmail)) {
      setIsValid(false);
    }
  };

  const removeEmail = (emailToRemove: string) => {
    onChange(value.filter(email => email !== emailToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
      e.preventDefault();
      if (inputValue.trim()) {
        addEmail(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeEmail(value[value.length - 1]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setIsValid(true);
  };

  const handleBlur = () => {
    if (inputValue.trim()) {
      addEmail(inputValue);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const emails = pastedText.split(/[,;\s]+/).filter(email => email.trim());
    
    emails.forEach(email => {
      addEmail(email);
    });
  };

  return (
    <div className={cn("min-h-[40px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2", className)}>
      <div className="flex flex-wrap gap-1 items-center">
        {value.map((email, index) => (
          <Badge key={index} variant="secondary" className="flex items-center gap-1">
            {email}
            {!disabled && (
              <button
                type="button"
                onClick={() => removeEmail(email)}
                className="ml-1 h-3 w-3 rounded-full hover:bg-muted-foreground/20"
              >
                <X className="h-2 w-2" />
              </button>
            )}
          </Badge>
        ))}
        {!disabled && (
          <Input
            ref={inputRef}
            type="email"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            onPaste={handlePaste}
            placeholder={value.length === 0 ? placeholder : ""}
            className={cn(
              "flex-1 min-w-[120px] border-0 p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0",
              !isValid && "text-destructive"
            )}
          />
        )}
      </div>
      {!isValid && (
        <p className="text-xs text-destructive mt-1">Please enter a valid email address</p>
      )}
    </div>
  );
}
