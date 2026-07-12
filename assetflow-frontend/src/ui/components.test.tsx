import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusChip } from "./components";

describe("StatusChip", () => {
  it("renders a readable status label", () => {
    render(<StatusChip status="UNDER_MAINTENANCE" />);
    expect(screen.getByText("Under Maintenance")).toBeInTheDocument();
    expect(screen.getByLabelText("Status: Under Maintenance")).toBeInTheDocument();
  });
});
