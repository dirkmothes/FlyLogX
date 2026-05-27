import type { ReactNode } from "react";

type Column<T> = {
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
};

type Props<T> = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  columns: Column<T>[];
  rows: T[];
  emptyMessage?: string;
};

export function DataTable<T>({ title, subtitle, actions, columns, rows, emptyMessage = "No data available." }: Props<T>) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {actions ? <div className="panel-header-actions">{actions}</div> : null}
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.header} className={column.className}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="table-empty">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={index}>
                  {columns.map((column) => (
                    <td key={column.header} className={column.className}>
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
