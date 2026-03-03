import { ReactNode } from "react";
import { DashboardSkeleton } from "./DashboardSkeleton";
import { PipelineSkeleton } from "./PipelineSkeleton";
import { TableSkeleton } from "./TableSkeleton";
import { ProfileSkeleton } from "./ProfileSkeleton";
import { PerformanceSkeleton } from "./PerformanceSkeleton";
import { CardGridSkeleton } from "./CardGridSkeleton";

type SkeletonType = 
  | "dashboard" 
  | "pipeline" 
  | "table" 
  | "profile" 
  | "performance" 
  | "cards";

interface PageSkeletonWrapperProps {
  type: SkeletonType;
  children?: ReactNode;
}

const skeletonMap: Record<SkeletonType, () => ReactNode> = {
  dashboard: () => <DashboardSkeleton />,
  pipeline: () => <PipelineSkeleton />,
  table: () => <TableSkeleton />,
  profile: () => <ProfileSkeleton />,
  performance: () => <PerformanceSkeleton />,
  cards: () => <CardGridSkeleton />,
};

export const PageSkeletonWrapper = ({ type }: PageSkeletonWrapperProps) => {
  const SkeletonComponent = skeletonMap[type];
  return SkeletonComponent ? SkeletonComponent() : <DashboardSkeleton />;
};

export default PageSkeletonWrapper;
