import { formatCurrency, formatDate } from "../utils/format";

export function ExpenseGrid({ expenses, canManage, onEdit, onDelete }) {
  if (!expenses.length) {
    return (
      <div className="panel empty-state">
        <h3>No expenses yet</h3>
        <p className="muted">Expenses for the selected filters will appear here.</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="section-heading">
        <h3>Expenses</h3>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Owner</th>
              <th>Receipt</th>
              <th>Remark</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {expenses.map((expense) => (
              <tr key={expense.id}>
                <td>{formatDate(expense.date)}</td>
                <td>{expense.description}</td>
                <td>{expense.category}</td>
                <td>{formatCurrency(expense.amount)}</td>
                <td>{expense.ownerName || "You"}</td>
                <td>
                  {expense.receiptPreviewUrl ? (
                    <a href={expense.receiptPreviewUrl} target="_blank" rel="noreferrer">
                      View
                    </a>
                  ) : (
                    "-"
                  )}
                </td>
                <td>{expense.remark || "-"}</td>
                <td className="actions-cell">
                  {canManage ? (
                    <>
                      <button type="button" className="button ghost" onClick={() => onEdit(expense)}>
                        Edit
                      </button>
                      <button type="button" className="button danger" onClick={() => onDelete(expense)}>
                        Delete
                      </button>
                    </>
                  ) : (
                    <span className="muted">Read only</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
