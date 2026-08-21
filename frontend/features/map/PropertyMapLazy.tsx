"use client";

import dynamic from "next/dynamic";

import { MapSkeleton } from "@/components/feedback/LoadingBlock";

import type { PropertyMapProps } from "./PropertyMap";

/**
 * Client-only loader for the real map. MapLibre GL touches `window` at import
 * time, so it must never be evaluated during SSR (Next.js App Router).
 */
const PropertyMapLazy = dynamic(() => import("./PropertyMap"), {
  ssr: false,
  loading: () => <MapSkeleton />,
}) as unknown as React.ComponentType<PropertyMapProps>;

export function PropertyMap(props: PropertyMapProps) {
  return <PropertyMapLazy {...props} />;
}
