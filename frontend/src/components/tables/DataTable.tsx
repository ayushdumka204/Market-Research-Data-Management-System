import type { ReactNode } from "react";
import EmptyState from "../ui/EmptyState";
export default function DataTable({
  headers,
  emptyTitle,
  emptyDescription,
  empty,
  children,
}: {
  headers: string[];
  emptyTitle: string;
  emptyDescription: string;
  empty: boolean;
  children: ReactNode;
}) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
      {empty && (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      )}
    </div>
  );
}
