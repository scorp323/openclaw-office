import React from 'react';

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
  height?: number;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded bg-gray-200 dark:bg-gray-700/50 ${className}`}
    />
  );
}

export function SkeletonCard({ className = "" }: SkeletonProps) {
  return (
    <div className={`rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700/30 dark:bg-[rgba(0,10,0,0.6)] ${className}`}>
      <div className="mb-4 flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <Skeleton className="mb-3 h-5 w-24 rounded-full" />
      <Skeleton className="mb-3 h-3 w-full" />
      <div className="border-t border-gray-100 pt-3 dark:border-gray-800">
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export function SkeletonStatCard() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700/30 dark:bg-[rgba(0,10,0,0.6)]">
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-5 w-12" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonTableRow() {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700/30 dark:bg-[rgba(0,10,0,0.6)]">
      <Skeleton className="h-4 w-4 rounded" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-4 w-24" />
      <Skeleton className="ml-auto h-4 w-20" />
      <Skeleton className="h-4 w-16" />
    </div>
  );
}

export function SkeletonLogLine() {
  return (
    <div className="flex gap-3 py-0.5">
      <Skeleton className="h-3 w-16 rounded-sm" />
      <Skeleton className="h-3 w-12 rounded-sm" />
      <Skeleton className="h-3 rounded-sm" style={{ width: `${40 + Math.random() * 50}%` }} />
    </div>
  );
}

export function SkeletonChart({ height = 250 }: { height?: number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700/30 dark:bg-[rgba(0,10,0,0.6)]">
      <Skeleton className="mb-3 h-4 w-40" />
      <Skeleton className="w-full rounded" style={{ height }} />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-[rgba(0,255,65,0.15)] dark:bg-[rgba(0,10,0,0.6)]">
          <Skeleton className="mb-3 h-4 w-12" />
          <div className="grid grid-cols-2 gap-3">
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </div>
        </div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-lg border border-gray-200 bg-white p-4 dark:border-[rgba(0,255,65,0.15)] dark:bg-[rgba(0,10,0,0.6)]">
            <Skeleton className="mb-3 h-4 w-24" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AgentsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function CronSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <SkeletonTableRow key={i} />
      ))}
    </div>
  );
}

export function LogsSkeleton() {
  return (
    <div className="space-y-1 p-4">
      {Array.from({ length: 20 }, (_, i) => (
        <SkeletonLogLine key={i} />
      ))}
    </div>
  );
}

export function CostsSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonChart height={250} />
      <div className="grid gap-4 md:grid-cols-2">
        <SkeletonChart height={250} />
        <SkeletonChart height={250} />
      </div>
      <SkeletonChart height={200} />
    </div>
  );
}
