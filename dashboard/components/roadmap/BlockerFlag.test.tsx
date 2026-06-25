import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import BlockerFlag from "./BlockerFlag";

describe("BlockerFlag", () => {
  it("renders nothing when hasCrossTeamBlocker is false", () => {
    const { container } = render(
      <BlockerFlag hasCrossTeamBlocker={false} onClick={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders ⚠ icon when hasCrossTeamBlocker is true", () => {
    render(<BlockerFlag hasCrossTeamBlocker={true} onClick={vi.fn()} />);
    expect(screen.getByTestId("blocker-flag")).toBeInTheDocument();
    expect(screen.getByText("⚠")).toBeInTheDocument();
  });

  it("has accessible button role with correct aria-label", () => {
    render(<BlockerFlag hasCrossTeamBlocker={true} onClick={vi.fn()} />);
    const button = screen.getByRole("button", {
      name: "View cross-team blockers",
    });
    expect(button).toBeInTheDocument();
  });

  it("calls onClick with event when clicked", () => {
    const handleClick = vi.fn();
    render(<BlockerFlag hasCrossTeamBlocker={true} onClick={handleClick} />);

    fireEvent.click(screen.getByTestId("blocker-flag"));
    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(handleClick).toHaveBeenCalledWith(expect.any(Object));
  });

  it("stops event propagation on click", () => {
    const parentClick = vi.fn();
    const flagClick = vi.fn();

    render(
      <div onClick={parentClick}>
        <BlockerFlag hasCrossTeamBlocker={true} onClick={flagClick} />
      </div>
    );

    fireEvent.click(screen.getByTestId("blocker-flag"));
    expect(flagClick).toHaveBeenCalledTimes(1);
    expect(parentClick).not.toHaveBeenCalled();
  });

  it("has type=button to prevent form submission", () => {
    render(<BlockerFlag hasCrossTeamBlocker={true} onClick={vi.fn()} />);
    const button = screen.getByTestId("blocker-flag");
    expect(button).toHaveAttribute("type", "button");
  });
});
