// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Input } from "@/components/shared/ui/Input";

describe("Input", () => {
  it("renders with label", () => {
    render(<Input label="Email" />);
    expect(screen.getByLabelText("Email")).toBeDefined();
  });

  it("shows error message", () => {
    render(<Input label="Email" error="Invalid email" />);
    expect(screen.getByText("Invalid email")).toBeDefined();
  });

  it("shows hint", () => {
    render(<Input label="Email" hint="Enter your email address" />);
    expect(screen.getByText("Enter your email address")).toBeDefined();
  });

  it("accepts input", () => {
    render(<Input label="Name" />);
    const input = screen.getByLabelText("Name") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "John" } });
    expect(input.value).toBe("John");
  });
});
