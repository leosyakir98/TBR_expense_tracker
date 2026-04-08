import { useEffect, useMemo, useState } from "react";

const categories = [
  "Transport",
  "Accommodation",
  "Meals",
  "Entertainment",
  "Business",
  "Shopping",
  "Other",
];

const emptyForm = {
  amount: "",
  category: "Transport",
  description: "",
  date: "",
  remark: "",
};

export function ExpenseForm({
  expense,
  onSave,
  onCancel,
  loading,
  uploadProgress,
  uploadError,
  disabled,
}) {
  const [form, setForm] = useState(emptyForm);
  const [receiptFile, setReceiptFile] = useState(null);
  const [localPreview, setLocalPreview] = useState("");

  useEffect(() => {
    if (expense) {
      setForm({
        amount: expense.amount || "",
        category: expense.category || "Transport",
        description: expense.description || "",
        date: expense.date || "",
        remark: expense.remark || "",
      });
      setLocalPreview(expense.receiptPreviewUrl || "");
      setReceiptFile(null);
      return;
    }

    setForm({
      ...emptyForm,
      date: new Date().toISOString().slice(0, 10),
    });
    setLocalPreview("");
    setReceiptFile(null);
  }, [expense]);

  const isPdfPreview = useMemo(() => {
    if (receiptFile) {
      return receiptFile.type === "application/pdf";
    }

    return localPreview.endsWith(".pdf");
  }, [localPreview, receiptFile]);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    setReceiptFile(file || null);

    if (!file) {
      setLocalPreview(expense?.receiptPreviewUrl || "");
      return;
    }

    if (file.type.startsWith("image/")) {
      setLocalPreview(URL.createObjectURL(file));
      return;
    }

    setLocalPreview(file.name);
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSave(
      {
        ...form,
        amount: Number(form.amount || 0),
      },
      receiptFile,
    );
  }

  return (
    <form className="panel stack-md" onSubmit={handleSubmit}>
      <div className="section-heading">
        <h3>{expense ? "Edit expense" : "Add expense"}</h3>
        {expense ? (
          <button className="button ghost" type="button" onClick={onCancel}>
            Cancel
          </button>
        ) : null}
      </div>

      <div className="grid two">
        <label className="field">
          <span>Amount</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(event) => updateField("amount", event.target.value)}
            required
            disabled={disabled}
          />
        </label>

        <label className="field">
          <span>Date</span>
          <input
            type="date"
            value={form.date}
            onChange={(event) => updateField("date", event.target.value)}
            required
            disabled={disabled}
          />
        </label>
      </div>

      <div className="grid two">
        <label className="field">
          <span>Category</span>
          <select
            value={form.category}
            onChange={(event) => updateField("category", event.target.value)}
            disabled={disabled}
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Description</span>
          <input
            value={form.description}
            onChange={(event) => updateField("description", event.target.value)}
            placeholder="Hotel check-in"
            required
            disabled={disabled}
          />
        </label>
      </div>

      <label className="field">
        <span>Remark</span>
        <textarea
          rows="3"
          value={form.remark}
          onChange={(event) => updateField("remark", event.target.value)}
          placeholder="Anything worth noting about this receipt"
          disabled={disabled}
        />
      </label>

      <label className="field upload-field">
        <span>Receipt upload</span>
        <input
          type="file"
          accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
          onChange={handleFileChange}
          disabled={disabled}
        />
        {uploadProgress > 0 && uploadProgress < 100 ? (
          <div className="progress-row">
            <progress value={uploadProgress} max="100" />
            <span>{uploadProgress}%</span>
          </div>
        ) : null}
        {uploadError ? <span className="feedback error">{uploadError}</span> : null}
      </label>

      {localPreview ? (
        <div className="receipt-preview">
          <span>Receipt preview</span>
          {isPdfPreview ? (
            <div className="receipt-file">{receiptFile?.name || "PDF receipt uploaded"}</div>
          ) : (
            <img src={localPreview} alt="Receipt preview" />
          )}
        </div>
      ) : null}

      <button className="button primary" type="submit" disabled={loading || disabled}>
        {loading ? "Saving..." : expense ? "Update expense" : "Save expense"}
      </button>
    </form>
  );
}
