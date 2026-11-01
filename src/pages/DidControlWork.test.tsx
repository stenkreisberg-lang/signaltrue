import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, test, vi } from "vitest";
import DidControlWork from "./DidControlWork";
import { trackEvent } from "../lib/analytics";

vi.mock("../components/Navbar", () => ({ default: () => null }));
vi.mock("../components/Footer", () => ({ default: () => null }));
vi.mock("../components/PageMeta", () => ({ default: () => null }));
vi.mock("../lib/analytics", () => ({ trackEvent: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  Element.prototype.scrollIntoView = vi.fn();
});

test("copies a readable multiline review checklist", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  render(
    <MemoryRouter>
      <DidControlWork />
    </MemoryRouter>,
  );
  for (const heading of screen.getAllByRole("heading", { level: 3 })) {
    fireEvent.click(within(heading.parentElement!).getAllByRole("button")[0]);
  }
  fireEvent.click(
    screen.getByRole("button", { name: /show my control-review gaps/i }),
  );
  fireEvent.click(
    screen.getByRole("button", { name: /copy my evidence review checklist/i }),
  );
  await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
  const copied = writeText.mock.calls[0][0];
  expect(copied).not.toContain("\\n");
  expect(copied.split("\n")).toHaveLength(5);
  expect(copied.split("\n")[2]).toBe(
    "Readiness indication: 100/100 (eight self-reported questions).",
  );
});

test("counts one start and one completion despite result recalculation and answer edits", () => {
  render(
    <MemoryRouter>
      <DidControlWork />
    </MemoryRouter>,
  );
  const resultButton = screen.getByRole("button", {
    name: /show my control-review gaps/i,
  });
  expect(resultButton).toBeDisabled();
  const questions = screen.getAllByRole("heading", { level: 3 });
  for (const heading of questions) {
    fireEvent.click(within(heading.parentElement!).getAllByRole("button")[0]);
  }
  expect(
    vi
      .mocked(trackEvent)
      .mock.calls.filter(([name]) => name === "did_control_work_started"),
  ).toHaveLength(1);
  fireEvent.click(resultButton);
  expect(document.body.textContent).not.toContain("\\n");
  fireEvent.click(resultButton);
  fireEvent.click(
    within(questions[0].parentElement!).getAllByRole("button")[2],
  );
  fireEvent.click(resultButton);
  expect(
    screen.getByText("Assessment basis is weak or outdated"),
  ).toBeInTheDocument();
  expect(
    vi
      .mocked(trackEvent)
      .mock.calls.filter(([name]) => name === "did_control_work_completed"),
  ).toHaveLength(1);
});

test("offers a free pilot and does not complete a partially answered assessment", () => {
  render(
    <MemoryRouter>
      <DidControlWork />
    </MemoryRouter>,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Yes, within the last 12 months" }),
  );
  fireEvent.click(
    screen.getByRole("button", { name: /show my control-review gaps/i }),
  );
  expect(
    vi
      .mocked(trackEvent)
      .mock.calls.some(([name]) => name === "did_control_work_completed"),
  ).toBe(false);
  expect(
    screen.getByText("One risk. One control. A free pilot."),
  ).toBeInTheDocument();
  expect(screen.queryByText(/AU\$99/)).not.toBeInTheDocument();
});
