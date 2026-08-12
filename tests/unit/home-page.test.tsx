import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "@/app/page";

describe("HomePage", () => {
  it("sets honest expectations for the pilot", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { name: "Find fish evidence near you." }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/interactive map and verified pilot data/i),
    ).toBeVisible();
  });
});
