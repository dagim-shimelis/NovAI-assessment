import { fireEvent, screen, waitFor } from "@testing-library/react";
import { useSyncExternalStore } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { companyKeys } from "@/companies/queries";
import { SignInForm } from "./sign-in-form";
import { SessionAction } from "./session-action";
import { safeReturnTo, SESSION_KEY, DISPLAY_NAME_KEY } from "./session";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: (path: string) => window.history.replaceState(null, "", path) }),
  useSearchParams: () => {
    const search = useSyncExternalStore(
      (listener) => { window.addEventListener("popstate", listener); return () => window.removeEventListener("popstate", listener); },
      () => window.location.search,
      () => "",
    );
    return new URLSearchParams(search);
  },
}));

beforeEach(() => {
  window.sessionStorage.clear();
  window.history.replaceState(null, "", "/sign-in");
});
afterEach(() => window.sessionStorage.clear());

describe("fake session", () => {
  it("validates return paths and never redirects to external or unrelated destinations", () => {
    expect(safeReturnTo("/companies?q=Atlas&page=2")).toBe("/companies?q=Atlas&page=2");
    for (const invalid of ["https://evil.test", "//evil.test", "/\\evil.test", "/sign-in", "/companies%2f%2fevil.test", "javascript:alert(1)"]) {
      expect(safeReturnTo(invalid)).toBe("/companies");
    }
  });

  it("creates a demo session and returns to the intended local view", async () => {
    window.history.replaceState(null, "", "/sign-in?returnTo=%2Fcompanies%3Fq%3DAtlas%26page%3D2");
    renderWithProviders(<><SignInForm /><SessionAction /></>, { session: true });
    expect(window.sessionStorage.getItem(SESSION_KEY)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Sign in to demo" }));
    expect(screen.getByText("Enter your name.")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveFocus();
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "  Alex  " } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in to demo" }));
    expect(screen.getByLabelText("Password")).toHaveFocus();
    expect(window.sessionStorage.getItem(SESSION_KEY)).toBeNull();
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "fake-review-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in to demo" }));
    await waitFor(() => expect(window.location.pathname + window.location.search).toBe("/companies?q=Atlas&page=2"));
    expect(window.sessionStorage.getItem(DISPLAY_NAME_KEY)).toBe("Alex");
    expect(screen.getByText("Alex")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toHaveValue("");
    expect(JSON.stringify(window.sessionStorage)).not.toContain("fake-review-password");
    expect(window.sessionStorage.getItem(SESSION_KEY)).toMatch(/^demo-[0-9a-f-]{36}$/);
  });

  it("signs out, clears company data and returns to sign-in with the current view", async () => {
    window.sessionStorage.setItem(SESSION_KEY, "demo");
    window.sessionStorage.setItem(DISPLAY_NAME_KEY, "Alex");
    window.history.replaceState(null, "", "/companies?status=new");
    const view = renderWithProviders(<SessionAction />, { session: true });
    view.queryClient.setQueryData(companyKeys.list(), { items: [], total: 0, limit: 20, offset: 0 });
    fireEvent.click(await screen.findByRole("button", { name: "Sign out" }));
    expect(window.sessionStorage.getItem(SESSION_KEY)).toBeNull();
    expect(view.queryClient.getQueryData(companyKeys.list())).toBeUndefined();
    expect(window.sessionStorage.getItem(DISPLAY_NAME_KEY)).toBeNull();
    expect(window.location.pathname).toBe("/sign-in");
    expect(new URLSearchParams(window.location.search).get("returnTo")).toBe("/companies?status=new");
  });
});
