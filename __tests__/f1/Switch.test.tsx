// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Switch } from "@/components/shared/ui/Switch";

describe("Switch", () => {
  it("renders with label", () => {
    render(<Switch checked={false} onChange={() => {}} label="Dark mode" />);
    expect(screen.getByText("Dark mode")).toBeDefined();
  });

  it("calls onChange when clicked", () => {
    const onChange = vi.fn();
    render(<Switch checked={false} onChange={onChange} label="Toggle" />);
    fireEvent.click(screen.getByText("Toggle"));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("reflects checked state", () => {
    const { container } = render(<Switch checked={true} onChange={() => {}} label="Active" />);
    const btn = container.querySelector('[role="switch"]');
    expect(btn?.getAttribute("aria-checked")).toBe("true");
  });
});
