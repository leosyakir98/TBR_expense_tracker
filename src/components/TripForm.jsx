import { useEffect, useState } from "react";

const initialState = {
  name: "",
  budget: "",
  start_date: "",
  end_date: "",
};

export function TripForm({ trip, onSave, onCancel, loading, disabled }) {
  const [form, setForm] = useState(initialState);

  useEffect(() => {
    if (trip) {
      setForm({
        name: trip.name || "",
        budget: trip.budget || "",
        start_date: trip.start_date || "",
        end_date: trip.end_date || "",
      });
    } else {
      setForm(initialState);
    }
  }, [trip]);

  function handleSubmit(event) {
    event.preventDefault();
    onSave({
      ...form,
      budget: Number(form.budget || 0),
    });
  }

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  return (
    <form className="panel stack-md" onSubmit={handleSubmit}>
      <div className="section-heading">
        <h3>{trip ? "Edit trip" : "Create trip"}</h3>
        {trip ? (
          <button className="button ghost" type="button" onClick={onCancel}>
            Cancel
          </button>
        ) : null}
      </div>

      <label className="field">
        <span>Trip name</span>
        <input
          value={form.name}
          onChange={(event) => updateField("name", event.target.value)}
          placeholder="Berlin client visit"
          required
          disabled={disabled}
        />
      </label>

      <div className="grid two">
        <label className="field">
          <span>Budget</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.budget}
            onChange={(event) => updateField("budget", event.target.value)}
            required
            disabled={disabled}
          />
        </label>

        <label className="field">
          <span>Start date</span>
          <input
            type="date"
            value={form.start_date}
            onChange={(event) => updateField("start_date", event.target.value)}
            required
            disabled={disabled}
          />
        </label>
      </div>

      <label className="field">
        <span>End date</span>
        <input
          type="date"
          value={form.end_date}
          onChange={(event) => updateField("end_date", event.target.value)}
          required
          disabled={disabled}
        />
      </label>

      <button className="button primary" type="submit" disabled={loading || disabled}>
        {loading ? "Saving..." : trip ? "Update trip" : "Save trip"}
      </button>
    </form>
  );
}
