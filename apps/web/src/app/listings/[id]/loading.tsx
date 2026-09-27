import { Skeleton } from "@/components/ui/misc";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Skeleton className="mb-4 h-4 w-64" />
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="grid content-start gap-6">
          <Skeleton className="h-6 w-32 rounded-full" />
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-32" />
          <Skeleton className="h-36 rounded-xl" />
        </div>
        <Skeleton className="h-[480px] rounded-xl" />
      </div>
    </div>
  );
}
