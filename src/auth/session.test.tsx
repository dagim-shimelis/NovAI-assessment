import { fireEvent, screen, waitFor } from "@testing-library/react";
import { useSyncExternalStore } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { companyKeys } from "@/companies/queries";
import { SignInForm } from "./sign-in-form";
import { SessionAction } from "./session-action";
import { safeReturnTo, SESSION_KEY } from "./session";

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

  it("requires a nonblank token, stores it in sessionStorage, and returns to the intended local view", async () => {
    window.history.replaceState(null, "", "/sign-in?returnTo=%2Fcompanies%3Fq%3DAtlas%26page%3D2");
    renderWithProviders(<SignInForm />, { session: true });
    fireEvent.change(screen.getByLabelText("Access token"), { target: { value: "  " } });
    fireEvent.click(screen.getByRole("button", { name: "Continue to companies" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a token");
    expect(window.sessionStorage.getItem(SESSION_KEY)).toBeNull();
    fireEvent.change(screen.getByLabelText("Access token"), { target: { value: "  demo-token  " } });
    fireEvent.click(screen.getByRole("button", { name: "Continue to companies" }));
    await waitFor(() => expect(window.location.pathname + window.location.search).toBe("/companies?q=Atlas&page=2"));
    expect(window.sessionStorage.getItem(SESSION_KEY)).toBe("demo-token");
  });

  it("signs out, clears company data and returns to sign-in with the current view", async () => {
    window.sessionStorage.setItem(SESSION_KEY, "demo");
    window.history.replaceState(null, "", "/companies?status=new");
    const view = renderWithProviders(<SessionAction />, { session: true });
    view.queryClient.setQueryData(companyKeys.list(), { items: [], total: 0, limit: 20, offset: 0 });
    fireEvent.click(await screen.findByRole("button", { name: "Sign out" }));
    expect(window.sessionStorage.getItem(SESSION_KEY)).toBeNull();
    expect(view.queryClient.getQueryData(companyKeys.list())).toBeUndefined();
    expect(window.location.pathname).toBe("/sign-in");
    expect(new URLSearchParams(window.location.search).get("returnTo")).toBe("/companies?status=new");
  });
});
