import { Skeleton } from "@/components/ui/skeleton";

export const PipelineSkeleton = () => (
  <div className="space-y-6 animate-in fade-in duration-300">
    {/* Header */}
    <div className="flex justify-between items-center">
      <Skeleton className="h-8 w-32" />
      <div className="flex gap-2">
        <Skeleton className="h-10 w-28" />
        <Skeleton className="h-10 w-28" />
      </div>
    </div>
    
    {/* Pipeline Columns */}
    <div className="flex gap-4 overflow-x-auto pb-4">
      {[...Array(5)].map((_, colIndex) => (
        <div key={colIndex} className="min-w-[300px] flex-shrink-0">
          <div className="p-4 rounded-xl border bg-card">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-8 rounded-full" />
            </div>
            
            <div className="space-y-3">
              {[...Array(3)].map((_, cardIndex) => (
                <div key={cardIndex} className="p-4 rounded-lg border bg-background">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2 mb-3" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);
