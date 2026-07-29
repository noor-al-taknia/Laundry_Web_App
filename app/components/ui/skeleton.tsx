import type { HTMLAttributes } from "react";
import { cn } from "../../../lib/utils";

export function Skeleton({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("skeleton", className)} {...props} />;
}

export function PageSkeleton() {
  return (
    <div className="page-content" aria-label="Loading page">
      <Skeleton className="skeleton-title" />
      <div className="metric-grid">
        {[0, 1, 2, 3].map((item) => (
          <Skeleton className="skeleton-card" key={item} />
        ))}
      </div>
      <Skeleton className="skeleton-panel" />
    </div>
  );
}
