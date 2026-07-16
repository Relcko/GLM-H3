// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "@/components/shared/ui/Badge";

describe("Badge", () => {
  it("renders children", () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText("New")).toBeDefined();
  });

  it("renders with variant classes", () => {
    render(<Badge variant="success">Active</Badge>);
    const badge = screen.getByText("Active");
    expect(badge.className).toContain("text-green-400");
  });

  it("renders dot indicator", () => {
    const { container } = render(<Badge dot>Live</Badge>);
    const dot = container.querySelector("span");
    expect(dot?.innerHTML).toContain("Live");
  });
});
