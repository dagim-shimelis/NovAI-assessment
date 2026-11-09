import { describe, expect, it } from "vitest";
import { listApiParams, normalizeListUrl, updateListUrl } from "./url-state";

describe("list URL normalization", () => {
  it("defaults invalid values and prevents unsafe offsets", () => {
    const state = normalizeListUrl(new URLSearchParams("page=9007199254740991&status=other&sort=other&q=%20Atlas%20"));
    expect(state).toEqual({ q: "Atlas", status: null, sort: "-created_at", page: 1, drawer: null });
    expect(listApiParams(state)).toEqual({ q: "Atlas", status: null, sort: "-created_at", limit: 20, offset: 0 });
    expect(normalizeListUrl(new URLSearchParams("page=0"))).toMatchObject({ page: 1 });
    expect(normalizeListUrl(new URLSearchParams("page=2.5"))).toMatchObject({ page: 1 });
  });

  it("preserves list parameters when opening and closing the drawer", () => {
    expect(updateListUrl(new URLSearchParams("page=2&q=Old&status=new"), { drawer: "company-001" }))
      .toBe("/companies?page=2&q=Old&status=new&drawer=company-001");
    expect(updateListUrl(new URLSearchParams("drawer=company-001&page=2&q=Old"), { drawer: null }))
      .toBe("/companies?page=2&q=Old");
    expect(normalizeListUrl(new URLSearchParams("drawer=new")).drawer).toBe("new");
    expect(updateListUrl(new URLSearchParams("drawer=company-001&page=2&q=Old"), { q: " New ", page: 1 }))
      .toBe("/companies?drawer=company-001&q=New");
  });
});
