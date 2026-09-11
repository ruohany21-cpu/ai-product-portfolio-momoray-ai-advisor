import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import Home from "./page";

test("presents the MomoRay advisor as a live workflow demo", () => {
  render(<Home />);

  expect(
    screen.getByRole("heading", { name: "MomoRay AI Advisor" }),
  ).toBeInTheDocument();
  expect(screen.getByText("Agent Workflow Demo")).toBeInTheDocument();
  expect(screen.getByText("LIVE")).toBeInTheDocument();
});
