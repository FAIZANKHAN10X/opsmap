import { describe, expect, it } from "vitest";

import {
  isUuid,
  looksLikeEmail,
  normalizeAssignees,
  normalizeHexColor,
  normalizeSlug,
  requireUuid,
} from "@/lib/server/validation";
import { ValidationAppError } from "@/lib/server/errors";

describe("normalizeSlug", () => {
  it("lowercases and trims", () => {
    expect(normalizeSlug("  My Project ")).toBe("my-project");
  });

  it("converts underscores and whitespace to hyphens", () => {
    expect(normalizeSlug("foo_bar baz")).toBe("foo-bar-baz");
  });

  it("collapses hyphen runs and strips leading/trailing hyphens", () => {
    expect(normalizeSlug("--foo--bar--")).toBe("foo-bar");
  });

  it("rejects slugs with invalid characters", () => {
    expect(() => normalizeSlug("foo/bar")).toThrow(ValidationAppError);
  });

  it("rejects empty slugs", () => {
    expect(() => normalizeSlug("   ")).toThrow(ValidationAppError);
  });

  it("rejects slugs over 100 characters", () => {
    expect(() => normalizeSlug("a-".repeat(60) + "x")).toThrow(/100 characters/);
  });

  it("throws with a slug field", () => {
    try {
      normalizeSlug("bad slug!");
    } catch (e) {
      const err = e as ValidationAppError;
      expect(err.code).toBe("VALIDATION_ERROR");
      expect(err.statusCode).toBe(422);
      expect(err.fields).toEqual([
        { field: "slug", message: expect.stringContaining("Invalid slug") },
      ]);
    }
  });
});

describe("normalizeHexColor", () => {
  it("accepts #rgb and #rrggbb and lowercases", () => {
    expect(normalizeHexColor("#FFF")).toBe("#fff");
    expect(normalizeHexColor("  #22C55E  ")).toBe("#22c55e");
  });

  it("rejects invalid colors", () => {
    expect(() => normalizeHexColor("red")).toThrow(ValidationAppError);
    expect(() => normalizeHexColor("#12345")).toThrow(ValidationAppError);
  });
});

describe("normalizeAssignees", () => {
  it("trims, drops empties, and dedupes preserving order", () => {
    expect(normalizeAssignees(["  Alex  ", "", "Sam", "Alex", "  "])).toEqual([
      "Alex",
      "Sam",
    ]);
  });

  it("handles null/undefined", () => {
    expect(normalizeAssignees(null)).toEqual([]);
    expect(normalizeAssignees(undefined)).toEqual([]);
  });
});

describe("looksLikeEmail", () => {
  it("matches simple addresses", () => {
    expect(looksLikeEmail("alex@example.com")).toBe(true);
  });

  it("rejects names and malformed addresses", () => {
    expect(looksLikeEmail("Alex Smith")).toBe(false);
    expect(looksLikeEmail("a@b")).toBe(false);
    expect(looksLikeEmail("")).toBe(false);
    expect(looksLikeEmail(null)).toBe(false);
  });
});

describe("isUuid / requireUuid", () => {
  it("accepts valid uuids", () => {
    expect(isUuid("123e4567-e89b-12d3-a456-426614174000")).toBe(true);
    expect(isUuid("123E4567-E89B-12D3-A456-426614174000")).toBe(true);
  });

  it("rejects non-uuids", () => {
    expect(isUuid("not-a-uuid")).toBe(false);
    expect(isUuid("")).toBe(false);
    expect(isUuid("123e4567")).toBe(false);
  });

  it("throws a 422 ValidationAppError with the field name", () => {
    expect(() => requireUuid("bad", "asset_id")).toThrow(ValidationAppError);
    try {
      requireUuid(null, "asset_id");
    } catch (e) {
      const err = e as ValidationAppError;
      expect(err.fields).toEqual([{ field: "asset_id", message: "Input should be a valid UUID." }]);
    }
  });
});