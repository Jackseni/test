import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BrandLogo } from "@/components/brand/brand-logo";

describe("BrandLogo", () => {
  it("exposes the accessible name FinTrack exactly once", () => {
    render(<BrandLogo />);
    expect(screen.getAllByRole("img", { name: "FinTrack" })).toHaveLength(1);
  });
});
