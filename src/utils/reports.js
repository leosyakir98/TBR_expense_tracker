import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import { buildRunningBalances, formatCurrency, formatDate } from "./format";

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function exportPdfReport({
  title,
  tripName,
  dateRange,
  openingBalance,
  expenses,
  currency = "USD",
}) {
  const doc = new jsPDF();
  const rows = buildRunningBalances(expenses, openingBalance);
  const totalSpent = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const remainingBalance = Number(openingBalance || 0) - totalSpent;
  let y = 18;

  doc.setFontSize(18);
  doc.text(title, 14, y);
  y += 10;
  doc.setFontSize(11);
  doc.text(`Trip: ${tripName || "Team report"}`, 14, y);
  y += 7;
  doc.text(`Date range: ${dateRange}`, 14, y);
  y += 7;
  doc.text(`Opening balance: ${formatCurrency(openingBalance, currency)}`, 14, y);
  y += 10;

  doc.setFont(undefined, "bold");
  doc.text("Date", 14, y);
  doc.text("Description", 40, y);
  doc.text("Category", 96, y);
  doc.text("Amount", 136, y);
  doc.text("Balance", 194, y, { align: "right" });
  doc.setFont(undefined, "normal");
  y += 8;

  rows.forEach((expense) => {
    if (y > 278) {
      doc.addPage();
      y = 20;
    }

    doc.text(formatDate(expense.date), 14, y);
    doc.text((expense.description || "No description").slice(0, 28), 40, y);
    doc.text((expense.category || "General").slice(0, 18), 96, y);
    doc.text(formatCurrency(expense.amount, currency), 136, y);
    doc.text(formatCurrency(expense.runningBalance, currency), 194, y, {
      align: "right",
    });
    y += 8;
  });

  y += 8;
  doc.setFont(undefined, "bold");
  doc.text(`Total spent: ${formatCurrency(totalSpent, currency)}`, 14, y);
  y += 7;
  doc.text(`Remaining balance: ${formatCurrency(remainingBalance, currency)}`, 14, y);

  doc.save(`${title.toLowerCase().replace(/\s+/g, "-")}.pdf`);
}

export async function exportExcelReport({
  title,
  tripName,
  dateRange,
  openingBalance,
  expenses,
}) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Report");
  const rows = buildRunningBalances(expenses, openingBalance);
  const totalSpent = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const remainingBalance = Number(openingBalance || 0) - totalSpent;

  sheet.columns = [
    { header: "Date", key: "date", width: 18 },
    { header: "Description", key: "description", width: 30 },
    { header: "Category", key: "category", width: 20 },
    { header: "Amount", key: "amount", width: 16 },
    { header: "Running Balance", key: "runningBalance", width: 18 },
  ];

  sheet.addRow([title]);
  sheet.addRow([`Trip: ${tripName || "Team report"}`]);
  sheet.addRow([`Date range: ${dateRange}`]);
  sheet.addRow([`Opening balance: ${Number(openingBalance || 0)}`]);
  sheet.addRow([]);
  sheet.addRow(["Date", "Description", "Category", "Amount", "Running Balance"]);

  rows.forEach((expense) => {
    sheet.addRow([
      formatDate(expense.date),
      expense.description || "No description",
      expense.category || "General",
      Number(expense.amount || 0),
      Number(expense.runningBalance || 0),
    ]);
  });

  sheet.addRow([]);
  sheet.addRow(["Total spent", "", "", totalSpent]);
  sheet.addRow(["Remaining balance", "", "", remainingBalance]);

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${title.toLowerCase().replace(/\s+/g, "-")}.xlsx`,
  );
}
