import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "@/app/page";

describe("HomePage", () => {
  it("renders a clearly labeled, searchable map preview", () => {
    render(<HomePage />);

    expect(screen.getByText("Fish Nearby")).toBeVisible();
    expect(screen.getByTestId("map-canvas")).toHaveAccessibleName(
      /interactive map of preview fishing waters/i,
    );
    expect(screen.getByRole("searchbox")).toHaveAttribute(
      "placeholder",
      "Search lakes, reservoirs…",
    );
    expect(screen.getByText("5 preview waters")).toBeVisible();
    expect(screen.getByText("Fixture data")).toBeVisible();
  });

  it("filters preview waters and opens honest fixture details", () => {
    render(<HomePage />);

    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "Hopatcong" },
    });

    expect(
      screen.getByRole("button", { name: /Lake Hopatcong/i }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /Ramapo Lake/i }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Lake Hopatcong/i }));

    expect(
      screen.getByRole("heading", { name: "Lake Hopatcong" }),
    ).toBeVisible();
    expect(
      screen.getByText(/fixture content and are not yet verified/i),
    ).toBeVisible();
    expect(screen.getByText("Hybrid striped bass")).toBeVisible();

    fireEvent.click(
      screen.getByRole("button", { name: "Close water details" }),
    );
    expect(
      screen.queryByRole("heading", { name: "Lake Hopatcong" }),
    ).not.toBeInTheDocument();
  });
});
