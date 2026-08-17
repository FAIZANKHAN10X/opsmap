import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(process.cwd(), "..");

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry === ".next") continue;
      walk(full, acc);
    } else if (/(\.ts|\.tsx)$/.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

const SERVER_ONLY_MODULES = ["server-only", "@/lib/supabase/admin", "next/headers"];

describe("static server/client boundary guard", () => {
  const clientDirs = ["components", "features", "stores", "hooks", "lib/client"];
  const files = clientDirs.flatMap((dir) => {
    try {
      return walk(join(ROOT, "frontend", dir));
    } catch {
      return [];
    }
  });

  it("client bundles never import server-only or privileged modules", () => {
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      for (const mod of SERVER_ONLY_MODULES) {
        const line = source
          .split("\n")
          .find((l) => l.includes(`from "${mod}"`) || l.includes(`from '${mod}'`) || l.trim() === `import "${mod}";`);
        expect(line, `${file} imports forbidden module ${mod}`).toBeUndefined();
      }
      const serverImport = source
        .split("\n")
        .find((l) => /from ["']@\/lib\/server\//.test(l));
      expect(serverImport, `${file} imports from @/lib/server`).toBeUndefined();
    }
  });

  it("the service-role key is never referenced outside lib/server or env files", () => {
    const searched = ["features", "components", "stores", "hooks", "lib/client", "lib/supabase", "lib/services"]
      .flatMap((dir) => {
        try {
          return walk(join(ROOT, "frontend", dir));
        } catch {
          return [];
        }
      });
    for (const file of searched) {
      const source = readFileSync(file, "utf8");
      const line = source.split("\n").find((l) => l.includes("service_role") || l.includes("SERVICE_ROLE"));
      expect(line, `${file} references the service-role key`).toBeUndefined();
    }
  });
});

describe("database errors never leak raw messages to clients", () => {
  const repositories = walk(join(ROOT, "frontend", "lib", "server", "repositories"));

  it("no repository wraps a raw DB error message into a client-visible AppError", () => {
    expect(repositories.length).toBeGreaterThan(0);
    for (const file of repositories) {
      const source = readFileSync(file, "utf8");
      const line = source
        .split("\n")
        .find((l) => /AppError\([^)]*error\s*\.\s*message/.test(l));
      expect(line, `${file} leaks raw DB error message to clients`).toBeUndefined();
    }
  });

  it("toDatabaseError returns a generic message while logging the real cause", async () => {
    const { toDatabaseError } = await import("@/lib/server/errors");
    const raw = { message: "relation public.secrets does not exist" };
    const err = toDatabaseError(raw);
    expect(err.code).toBe("DATABASE_ERROR");
    expect(err.statusCode).toBe(500);
    expect(err.message).toBe("The database request failed.");
    expect(err.message).not.toContain(raw.message);
  });
});

describe("static RLS policy guard (notifications)", () => {
  const migration = readFileSync(
    join(ROOT, "supabase", "migrations", "20260730000003_auth.sql"),
    "utf8",
  );

  it("grants authenticated users select and update on their own notifications", () => {
    expect(migration).toContain('create policy "notifications_select_own"');
    expect(migration).toContain('create policy "notifications_update_own"');
  });

  it("does NOT grant authenticated users inserts on notifications (service_role only)", () => {
    expect(migration).not.toMatch(/create policy "notifications_insert/);
  });

  it("restricts notification access to the recipient's email", () => {
    expect(migration).toContain("recipient_email = auth.jwt() ->> 'email'");
  });
});