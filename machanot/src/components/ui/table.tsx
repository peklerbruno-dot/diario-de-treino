import * as React from "react";
import { cn } from "@/lib/cn";

export function Tabela({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full border-collapse text-sm", className)} {...props} />
    </div>
  );
}

export function Th({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "border-b border-borda px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-suave",
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("border-b border-borda/70 px-2 py-1.5 align-middle", className)} {...props} />;
}
