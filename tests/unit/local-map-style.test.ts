import { describe, expect, it } from "vitest";

import {
  createLocalMapStyle,
  localMapLabels,
} from "@/features/map/local-map-style";

describe("local map style", () => {
  it("contains geographic context without remote dependencies", () => {
    const style = createLocalMapStyle();

    expect(style.glyphs).toBeUndefined();
    expect(style.sprite).toBeUndefined();
    expect(Object.keys(style.sources)).toEqual(
      expect.arrayContaining([
        "north-jersey-land",
        "parks",
        "county-lines",
        "waterways",
        "roads",
        "water-bodies",
      ]),
    );
    expect(style.layers.map((layer) => layer.id)).toEqual(
      expect.arrayContaining([
        "north-jersey-land",
        "parks",
        "waterways",
        "major-roads",
        "state-outline",
      ]),
    );
    expect(localMapLabels.length).toBeGreaterThan(2);
  });
});
