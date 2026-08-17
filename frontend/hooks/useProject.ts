"use client";

import { useEffect, useState } from "react";

import { getProject } from "@/services/projects";
import type { Project } from "@/types/domain";

/**
 * Loads a single project by id (client-side) so chrome like the sidebar can
 * render the live property name. Swallows errors — callers render a fallback.
 */
export function useProject(projectId: string | null): Project | null {
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!projectId) {
      // Deferred so no synchronous setState happens inside the effect body.
      void Promise.resolve().then(() => {
        if (!cancelled) setProject(null);
      });
      return () => {
        cancelled = true;
      };
    }
    getProject(projectId)
      .then((res) => {
        if (!cancelled) setProject(res.data);
      })
      .catch(() => {
        if (!cancelled) setProject(null);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return project;
}