import { describe, expect, it } from "vitest";

import { paginationMeta, parsePagination } from "@/lib/server/pagination";
import { ValidationAppError } from "@/lib/server/errors";

describe("paginationMeta", () => {
  it("computes pages as ceil(total/limit)", () => {
    expect(paginationMeta(1, 25, 0)).toEqual({ page: 1, limit: 25, total: 0, pages: 0 });
    expect(paginationMeta(1, 25, 25)).toEqual({ page: 1, limit: 25, total: 25, pages: 1 });
    expect(paginationMeta(2, 25, 30)).toEqual({ page: 2, limit: 25, total: 30, pages: 2 });
  });

  it("returns 0 pages when limit is 0", () => {
    expect(paginationMeta(1, 0, 10).pages).toBe(0);
  });
});

describe("parsePagination", () => {
  it("defaults page to 1 and limit to the given default", () => {
    expect(parsePagination(undefined, undefined)).toEqual({ page: 1, limit: 25 });
    expect(parsePagination(undefined, undefined, 100)).toEqual({ page: 1, limit: 100 });
  });

  it("accepts integer inputs", () => {
    expect(parsePagination(3, 50)).toEqual({ page: 3, limit: 50 });
  });

  it("rejects page < 1 and non-integer page", () => {
    expect(() => parsePagination(0, 25)).toThrow(ValidationAppError);
    expect(() => parsePagination(1.5, 25)).toThrow(ValidationAppError);
  });

  it("rejects limit out of 1..100 range", () => {
    expect(() => parsePagination(1, 0)).toThrow(ValidationAppError);
    expect(() => parsePagination(1, 101)).toThrow(ValidationAppError);
  });

  it("collects both field errors", () => {
    try {
      parsePagination(0, 500);
    } catch (e) {
      const err = e as ValidationAppError;
      expect(err.fields?.map((f) => f.field)).toEqual(["page", "limit"]);
    }
  });
});