import React from 'react'
import EmptyState from './EmptyState'

export default function DataTable({ title, subtitle, columns, data, renderRow, emptyIcon, emptyMessage }) {
  return (
    <div className="table-container">
      <div className="table-header-bar">
        <span className="table-title">{title}</span>
        {subtitle && (
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{subtitle}</span>
        )}
      </div>
      <table className="custom-table">
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th key={i} style={col.align ? { textAlign: col.align } : {}}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data && data.length > 0 ? (
            data.map((item, i) => renderRow(item, i))
          ) : (
            <tr>
              <td colSpan={columns.length}>
                <EmptyState icon={emptyIcon || 'inbox'} message={emptyMessage || 'No records found.'} />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
