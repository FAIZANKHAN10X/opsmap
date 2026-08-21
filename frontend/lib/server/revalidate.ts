import { revalidatePath } from "next/cache";

export function revalidatePaths(paths: readonly string[]): void {
  for (const path of paths) revalidatePath(path);
}
