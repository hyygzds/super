import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VirtualGrid } from "./VirtualGrid";

const columns = [
  { field: "code", title: "编号", width: 120 },
  { field: "name", title: "名称", width: 120 },
];

const data = [
  { id: "1", code: "0001", name: "Sagi" },
  { id: "2", code: "0002", name: "Nancy" },
];

describe("VirtualGrid (React)", () => {
  it("renders headers and cell text", () => {
    render(<VirtualGrid data={data} columns={columns} showRowNumber={false} />);
    expect(screen.getByText("编号")).toBeInTheDocument();
    expect(screen.getByText("名称")).toBeInTheDocument();
    expect(screen.getByText("0001")).toBeInTheDocument();
    expect(screen.getByText("Nancy")).toBeInTheDocument();
  });

  it("hides hidden columns", () => {
    render(
      <VirtualGrid
        data={data}
        columns={[
          { field: "code", title: "编号" },
          { field: "name", title: "名称", hidden: true },
        ]}
        showRowNumber={false}
      />,
    );
    expect(screen.getByText("编号")).toBeInTheDocument();
    expect(screen.queryByText("名称")).not.toBeInTheDocument();
    expect(screen.queryByText("Sagi")).not.toBeInTheDocument();
  });

  it("shows empty state when data is empty", () => {
    render(<VirtualGrid data={[]} columns={columns} />);
    expect(screen.getByText("暂无数据")).toBeInTheDocument();
  });

  it("shows row numbers when enabled", () => {
    render(<VirtualGrid data={data} columns={columns} showRowNumber />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("uses column render for cells", () => {
    render(
      <VirtualGrid
        data={data}
        columns={[
          {
            field: "name",
            title: "名称",
            render: ({ row }) => <span>Hi-{String(row.name)}</span>,
          },
        ]}
        showRowNumber={false}
      />,
    );
    expect(screen.getByText("Hi-Sagi")).toBeInTheDocument();
  });

  it("calls onRowClick with row data", async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    render(
      <VirtualGrid
        data={data}
        columns={columns}
        showRowNumber={false}
        onRowClick={onRowClick}
      />,
    );
    await user.click(screen.getByText("0001"));
    expect(onRowClick).toHaveBeenCalled();
    expect(onRowClick.mock.calls[0][0]).toMatchObject({ id: "1", code: "0001" });
  });

  it("virtual mode renders fewer DOM rows than data length", () => {
    const many = Array.from({ length: 200 }, (_, i) => ({
      id: String(i),
      code: `c${i}`,
      name: `n${i}`,
    }));
    const { container } = render(
      <div style={{ height: 200 }}>
        <VirtualGrid
          data={many}
          columns={columns}
          enableVirtual
          rowHeight={36}
          showRowNumber={false}
          className="h-[200px]"
        />
      </div>,
    );
    const body = container.querySelector(
      '[data-testid="virtual-grid-body"]',
    ) as HTMLElement;
    Object.defineProperty(body, "clientHeight", { configurable: true, value: 200 });
    body.scrollTop = 0;
    body.dispatchEvent(new Event("scroll"));
    const grid = container.querySelector('[data-testid="virtual-grid"]') as HTMLElement;
    const bodyRows = within(grid).queryAllByRole("row").filter((r) =>
      r.hasAttribute("data-row-index"),
    );
    expect(bodyRows.length).toBeGreaterThan(0);
    expect(bodyRows.length).toBeLessThan(80);
  });
});
