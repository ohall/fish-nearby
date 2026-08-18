import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { MapWater } from "@/contracts";
import { MapExperience } from "@/features/map/map-experience";

const mapWaters: MapWater[] = [
  {
    id: "396be7f0-37a4-411a-8c20-382083abdafa",
    displayName: "Lake Hopatcong",
    type: "lake",
    state: "NJ",
    representativePoint: { latitude: 40.955, longitude: -74.637 },
    distanceMeters: 38_624,
    species: [
      {
        id: "10000000-0000-4000-8000-000000000006",
        commonName: "Walleye",
        scientificName: "Sander vitreus",
        evidence: [
          {
            id: "20000000-0000-4000-8000-000000000001",
            evidenceType: "agency_listed_presence",
            sourceLabel: "Great Fishing Close to Home",
            sourceUrl: "https://example.test/njdep",
            confidenceTier: "high",
          },
        ],
      },
    ],
  },
  {
    id: "cf4ef082-22ac-4045-b726-ae4a8ac8769a",
    displayName: "Ramapo Lake",
    type: "lake",
    state: "NJ",
    representativePoint: { latitude: 41.032, longitude: -74.251 },
    distanceMeters: 10_307,
    species: [],
  },
];

describe("MapExperience", () => {
  it("renders searchable waters from the database-shaped contract", () => {
    render(<MapExperience waters={mapWaters} />);

    expect(screen.getByText("Fish Nearby")).toBeVisible();
    expect(screen.getByTestId("map-canvas")).toHaveAccessibleName(
      /interactive map of fishing waters/i,
    );
    expect(screen.getByRole("searchbox")).toHaveAttribute(
      "placeholder",
      "Search lakes, reservoirs…",
    );
    expect(screen.getByText("2 waters")).toBeVisible();
    expect(screen.getByText("Local database")).toBeVisible();
  });

  it("filters waters and shows their accepted source evidence", () => {
    render(<MapExperience waters={mapWaters} />);

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
      screen.getByText(
        /accepted NJDEP records loaded from the local database/i,
      ),
    ).toBeVisible();
    expect(screen.getByText("Walleye")).toBeVisible();
    expect(screen.getByText(/Great Fishing Close to Home/i)).toBeVisible();

    fireEvent.click(
      screen.getByRole("button", { name: "Close water details" }),
    );
    expect(
      screen.queryByRole("heading", { name: "Lake Hopatcong" }),
    ).not.toBeInTheDocument();
  });
});
