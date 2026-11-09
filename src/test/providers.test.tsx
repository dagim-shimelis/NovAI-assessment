import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalization } from "@/i18n/provider";
import { renderWithProviders } from "./render";

function Probe() {
  const { dictionary } = useLocalization();
  const client = useQueryClient();
  return <h1 data-client={client ? "ready" : "missing"} data-cache={client.getQueryData(["smoke"]) ?? ""}>{dictionary.title}</h1>;
}

describe("test providers", () => {
  it("renders the selected translation inside a QueryClient provider", () => {
    const { queryClient } = renderWithProviders(<Probe />, { locale: "nl" });
    expect(screen.getByRole("heading", { name: "Bedrijven" })).toHaveAttribute("data-client", "ready");
    expect(queryClient.getDefaultOptions().queries?.retry).toBe(false);
  });

  it("keeps the providers and query client across rerenders", () => {
    const first = renderWithProviders(<Probe />, { locale: "nl" });
    first.queryClient.setQueryData(["smoke"], "preserved");
    first.rerender(<Probe />);
    expect(screen.getByRole("heading", { name: "Bedrijven" })).toHaveAttribute("data-cache", "preserved");
    expect(first.queryClient.getDefaultOptions().queries?.retry).toBe(false);
  });

  it("uses a fresh query client per render", () => {
    const first = renderWithProviders(<Probe />);
    const second = renderWithProviders(<Probe />);
    expect(first.queryClient).not.toBe(second.queryClient);
    expect(screen.getAllByRole("heading", { name: "Companies" })).toHaveLength(2);
  });
});
