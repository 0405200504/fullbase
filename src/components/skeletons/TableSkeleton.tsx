import { Skeleton } from "@/components/ui/skeleton";

interface TableSkeletonProps {
  title?: string;
  columns?: number;
  rows?: number;
  showActions?: boolean;
}

export const TableSkeleton = ({ 
  title = "Carregando...", 
  columns = 5, 
  rows = 8,
  showActions = true 
}: TableSkeletonProps) => (
  <div className="space-y-6 animate-in fade-in duration-300">
    {/* Header */}
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <Skeleton className="h-8 w-32" />
      <div className="flex gap-2">
        <Skeleton className="h-10 w-64" /> {/* Search */}
        {showActions && <Skeleton className="h-10 w-28" />}
      </div>
    </div>
    
    {/* Filters */}
    <div className="flex flex-wrap gap-2">
      {[...Array(3)].map((_, i) => (
        <Skeleton key={i} className="h-8 w-24" />
      ))}
    </div>
    
    {/* Table */}
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Table Header */}
      <div className="grid border-b bg-muted/50 p-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {[...Array(columns)].map((_, i) => (
          <Skeleton key={i} className="h-4 w-20" />
        ))}
      </div>
      
      {/* Table Rows */}
      {[...Array(rows)].map((_, rowIndex) => (
        <div 
          key={rowIndex} 
          className="grid border-b last:border-0 p-4"
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {[...Array(columns)].map((_, colIndex) => (
            <Skeleton 
              key={colIndex} 
              className={`h-4 ${colIndex === 0 ? 'w-32' : 'w-20'}`} 
            />
          ))}
        </div>
      ))}
    </div>
    
    {/* Pagination */}
    <div className="flex justify-between items-center">
      <Skeleton className="h-4 w-40" />
      <div className="flex gap-1">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-8" />
        ))}
      </div>
    </div>
  </div>
);
