import * as React from "react";
import { Card, CardContent, CardHeader } from "./card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface KPICardProps {
  label: string;
  value: string | number;
  change?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function KPICard({ label, value, change, className }: KPICardProps) {
  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <span className="text-small font-medium text-neutral-sub">{label}</span>
          {change && (
            <div
              className={cn(
                "flex items-center gap-1 text-xs font-medium rounded-sm px-2 py-1",
                change.isPositive
                  ? "text-success bg-success/10"
                  : "text-danger bg-danger/10"
              )}
            >
              {change.isPositive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {change.isPositive ? "+" : ""}
              {change.value}%
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-display font-bold text-neutral-ink">{value}</div>
      </CardContent>
    </Card>
  );
}
