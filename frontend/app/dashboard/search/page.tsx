import { Suspense } from "react";

import { SearchPage } from "@/features/search/SearchPage";
import { Skeleton } from "@/components/ui/Skeleton";

export default function SearchRoutePage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-3 p-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <SearchPage />
    </Suspense>
  );
}
