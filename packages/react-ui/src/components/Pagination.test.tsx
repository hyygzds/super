import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Pagination } from "./Pagination";

describe("Pagination (React)", () => {
  it("renders total and current page, navigates next/prev", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <Pagination
        total={95}
        page={1}
        pageSize={10}
        onPageChange={onPageChange}
      />,
    );

    expect(screen.getByText("共 95 条")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "下一页" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "上一页" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "下一页" }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("calls onPageChange when a page number is clicked", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <Pagination
        total={30}
        page={1}
        pageSize={10}
        onPageChange={onPageChange}
      />,
    );
    await user.click(screen.getByRole("button", { name: "3" }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("resets to page 1 when page size changes", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();
    render(
      <Pagination
        total={100}
        page={3}
        pageSize={10}
        pageSizeOptions={[10, 20]}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />,
    );
    await user.selectOptions(screen.getByLabelText("每页条数"), "20");
    expect(onPageSizeChange).toHaveBeenCalledWith(20);
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("supports uncontrolled defaultPage", async () => {
    const user = userEvent.setup();
    render(
      <Pagination total={50} defaultPage={2} defaultPageSize={10} />,
    );
    expect(screen.getByRole("button", { name: "2" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await user.click(screen.getByRole("button", { name: "下一页" }));
    expect(screen.getByRole("button", { name: "3" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
