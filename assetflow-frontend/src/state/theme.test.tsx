import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ThemeProvider, useTheme } from "./theme";

const ThemeProbe = () => {
  const { mode, setMode } = useTheme();
  return <button onClick={() => setMode("dark")}>{mode}</button>;
};

describe("ThemeProvider", () => {
  it("persists and applies selected theme", () => {
    render(<ThemeProvider><ThemeProbe /></ThemeProvider>);
    fireEvent.click(screen.getByRole("button"));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("assetflow.theme")).toBe("dark");
  });
});
