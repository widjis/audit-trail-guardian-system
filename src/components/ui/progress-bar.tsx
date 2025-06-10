
import { cn } from "@/lib/utils";
import { getProgressColor, getProgressTextColor } from "@/utils/progressCalculator";

interface ProgressBarProps {
  percentage: number;
  showText?: boolean;
  className?: string;
}

export function ProgressBar({ percentage, showText = true, className }: ProgressBarProps) {
  const progressColor = getProgressColor(percentage);
  const textColor = getProgressTextColor(percentage);

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <div className="flex-1 bg-gray-200 rounded-full h-2 min-w-[60px]">
        <div
          className={cn("h-2 rounded-full transition-all duration-300", progressColor)}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      {showText && (
        <span className={cn("text-xs font-medium min-w-[35px]", textColor)}>
          {percentage}%
        </span>
      )}
    </div>
  );
}
