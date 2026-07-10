import type { TableLayoutCell, KeyItem } from "@/lib/mcq/types";
import type { RichNode } from "@/lib/mcq/rich";
import { Rich } from "@/lib/mcq/rich";
import { TableKey } from "./TableKey";
import { CellImage } from "./CellImage";

const wrap = "overflow-hidden rounded-xl border border-border bg-card shadow-sm";
const tableCls = "w-full border-collapse text-base";
const baseCellCls = "border border-border/70 align-middle text-base";

/** Read-only intro-data table renderer built from the unified
 *  TableLayoutCell grid model (rowSpan/colSpan/header/bg/align). */
export function IntroTableGrid({
  grid,
  caption,
  keyItems,
}: {
  grid: TableLayoutCell[][];
  caption?: RichNode[];
  keyItems?: KeyItem[];
}) {
  return (
    <div className="space-y-3">
      <div className={wrap}>
        <div className="overflow-x-auto">
          <table className={tableCls}>
            <tbody>
              {grid.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => {
                    if (cell.hidden) return null;
                    const Tag = cell.header ? "th" : "td";
                    const headerTint = cell.header ? "bg-muted/50 font-semibold" : "";
                    const hasImage = !!cell.image?.src;
                    return (
                      <Tag
                        key={c}
                        rowSpan={cell.rowSpan && cell.rowSpan > 1 ? cell.rowSpan : undefined}
                        colSpan={cell.colSpan && cell.colSpan > 1 ? cell.colSpan : undefined}
                        className={`${baseCellCls} ${headerTint} ${hasImage ? "p-0" : "p-2.5"}`}
                        style={{
                          ...(cell.bg ? { background: cell.bg } : {}),
                          ...(cell.align ? { textAlign: cell.align } : {}),
                        }}
                      >
                        {hasImage ? (
                          <CellImage image={cell.image!} />
                        ) : (
                          <Rich nodes={cell.content} />
                        )}
                      </Tag>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {caption && (
        <p className="text-center text-xs italic text-muted-foreground">
          <Rich nodes={caption} />
        </p>
      )}
      {keyItems && <TableKey items={keyItems} />}
    </div>
  );
}