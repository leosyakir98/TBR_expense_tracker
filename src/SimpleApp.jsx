import { useEffect, useMemo, useState } from "react";
import { ExpenseForm } from "./components/ExpenseForm";
import { ExpenseGrid } from "./components/ExpenseGrid";
import { TripForm } from "./components/TripForm";
import { SimpleAuthForm } from "./SimpleAuthForm";
import { formatCurrency, formatDate } from "./utils/format";
import { exportExcelReport, exportPdfReport } from "./utils/reports";

const STORAGE_KEY = "travel-expense-simple-app";
const SESSION_KEY = "travel-expense-simple-session";

function generateId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read receipt file."));
    reader.readAsDataURL(file);
  });
}

function readStoredJson(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export default function SimpleApp() {
  const [session, setSession] = useState(null);
  const [trips, setTrips] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState("");
  const [tripEditor, setTripEditor] = useState(null);
  const [expenseEditor, setExpenseEditor] = useState(null);
  const [tripSaving, setTripSaving] = useState(false);
  const [expenseSaving, setExpenseSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const isAdmin = session?.role === "admin";

  useEffect(() => {
    setSession(readStoredJson(SESSION_KEY, null));
    const stored = readStoredJson(STORAGE_KEY, { trips: [], expenses: [] });
    setTrips(stored.trips || []);
    setExpenses(stored.expenses || []);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        trips,
        expenses,
      }),
    );
  }, [expenses, trips]);

  const visibleTrips = useMemo(() => {
    if (isAdmin) {
      return trips;
    }

    return trips.filter((trip) => trip.user_id === session?.username);
  }, [isAdmin, session?.username, trips]);

  const selectedTrip = useMemo(
    () => visibleTrips.find((trip) => trip.id === selectedTripId) || null,
    [selectedTripId, visibleTrips],
  );

  const visibleExpenses = useMemo(() => {
    const tripIds = new Set(visibleTrips.map((trip) => trip.id));
    return expenses
      .filter((expense) => tripIds.has(expense.trip_id))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [expenses, visibleTrips]);

  const totals = useMemo(() => {
    const totalBudget = visibleTrips.reduce((sum, trip) => sum + Number(trip.budget || 0), 0);
    const totalSpent = visibleExpenses.reduce(
      (sum, expense) => sum + Number(expense.amount || 0),
      0,
    );

    return {
      totalBudget,
      totalSpent,
      remainingBalance: totalBudget - totalSpent,
    };
  }, [visibleExpenses, visibleTrips]);

  const recentExpenses = useMemo(() => visibleExpenses.slice(0, 6), [visibleExpenses]);

  useEffect(() => {
    if (!visibleTrips.length) {
      setSelectedTripId("");
      return;
    }

    setSelectedTripId((current) =>
      visibleTrips.some((trip) => trip.id === current) ? current : visibleTrips[0].id,
    );
  }, [visibleTrips]);

  function handleLogin(nextSession) {
    setSession(nextSession);
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
  }

  function handleSignOut() {
    setSession(null);
    setTripEditor(null);
    setExpenseEditor(null);
    window.localStorage.removeItem(SESSION_KEY);
  }

  function canEditTrip(trip) {
    return isAdmin || trip?.user_id === session?.username;
  }

  function canEditExpense(expense) {
    const ownerTrip = trips.find((trip) => trip.id === expense.trip_id);
    return isAdmin || ownerTrip?.user_id === session?.username;
  }

  async function handleTripSave(payload) {
    if (!session?.username) {
      return;
    }

    setTripSaving(true);

    if (tripEditor) {
      setTrips((currentTrips) =>
        currentTrips.map((trip) =>
          trip.id === tripEditor.id
            ? {
                ...trip,
                ...payload,
              }
            : trip,
        ),
      );
      setStatusMessage("Trip updated.");
    } else {
      const newTrip = {
        id: generateId("trip"),
        user_id: session.username,
        name: payload.name,
        budget: payload.budget,
        start_date: payload.start_date,
        end_date: payload.end_date,
        created_at: new Date().toISOString(),
      };
      setTrips((currentTrips) => [newTrip, ...currentTrips]);
      setSelectedTripId(newTrip.id);
      setStatusMessage("Trip created.");
    }

    setTripEditor(null);
    setTripSaving(false);
  }

  function handleTripDelete() {
    if (!isAdmin || !selectedTrip) {
      return;
    }

    const confirmed = window.confirm(`Delete "${selectedTrip.name}" and all its expenses?`);
    if (!confirmed) {
      return;
    }

    setTrips((currentTrips) => currentTrips.filter((trip) => trip.id !== selectedTrip.id));
    setExpenses((currentExpenses) =>
      currentExpenses.filter((expense) => expense.trip_id !== selectedTrip.id),
    );
    setTripEditor(null);
    setExpenseEditor(null);
    setStatusMessage("Trip deleted.");
  }

  async function handleExpenseSave(payload, file) {
    if (!selectedTrip) {
      setStatusMessage("Select a trip first.");
      return;
    }

    setExpenseSaving(true);
    setUploadError("");

    try {
      let receiptUrl = expenseEditor?.receipt_url || "";

      if (file) {
        setUploadProgress(35);
        receiptUrl = await readFileAsDataUrl(file);
        setUploadProgress(100);
        window.setTimeout(() => setUploadProgress(0), 700);
      }

      if (expenseEditor) {
        setExpenses((currentExpenses) =>
          currentExpenses.map((expense) =>
            expense.id === expenseEditor.id
              ? {
                  ...expense,
                  ...payload,
                  receipt_url: receiptUrl,
                  receiptPreviewUrl: receiptUrl,
                }
              : expense,
          ),
        );
        setStatusMessage("Expense updated.");
      } else {
        const newExpense = {
          id: generateId("expense"),
          trip_id: selectedTrip.id,
          amount: payload.amount,
          category: payload.category,
          description: payload.description,
          date: payload.date,
          receipt_url: receiptUrl,
          receiptPreviewUrl: receiptUrl,
          remark: payload.remark,
          created_at: new Date().toISOString(),
          ownerName: selectedTrip.user_id,
          tripName: selectedTrip.name,
        };

        setExpenses((currentExpenses) => [newExpense, ...currentExpenses]);
        setStatusMessage("Expense added.");
      }

      setExpenseEditor(null);
    } catch (error) {
      setUploadError(error.message || "Receipt upload failed.");
      setStatusMessage(error.message || "Receipt upload failed.");
    } finally {
      setExpenseSaving(false);
    }
  }

  function handleExpenseDelete(expense) {
    if (!isAdmin) {
      return;
    }

    const confirmed = window.confirm(`Delete "${expense.description}"?`);
    if (!confirmed) {
      return;
    }

    setExpenses((currentExpenses) =>
      currentExpenses.filter((currentExpense) => currentExpense.id !== expense.id),
    );
    setStatusMessage("Expense deleted.");
  }

  async function handleExport(type) {
    const reportExpenses = [...visibleExpenses].sort((a, b) => new Date(a.date) - new Date(b.date));
    const report = {
      title: isAdmin ? "Admin travel report" : `${session?.username} travel report`,
      tripName: selectedTrip?.name || "All trips",
      dateRange: selectedTrip
        ? `${formatDate(selectedTrip.start_date)} - ${formatDate(selectedTrip.end_date)}`
        : "All dates",
      openingBalance: selectedTrip?.budget || totals.totalBudget,
      expenses: reportExpenses,
    };

    if (type === "pdf") {
      await exportPdfReport(report);
      return;
    }

    await exportExcelReport(report);
  }

  if (!session) {
    return <SimpleAuthForm onLogin={handleLogin} />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-card">
          <p className="eyebrow">Simple Travel Tracker</p>
          <h2>{isAdmin ? "Admin" : "Member"} workspace</h2>
          <p>Signed in as {session.username}</p>
          <button className="button ghost" type="button" onClick={handleSignOut}>
            Sign out
          </button>
        </div>

        <TripForm
          trip={tripEditor}
          onSave={handleTripSave}
          onCancel={() => setTripEditor(null)}
          loading={tripSaving}
          disabled={false}
        />

        <div className="panel stack-md">
          <div className="section-heading">
            <h3>{isAdmin ? "All trips" : "My trips"}</h3>
          </div>

          <div className="trip-list">
            {visibleTrips.map((trip) => (
              <button
                key={trip.id}
                type="button"
                className={`trip-card ${trip.id === selectedTripId ? "active" : ""}`}
                onClick={() => {
                  setSelectedTripId(trip.id);
                  setExpenseEditor(null);
                }}
              >
                <span>{trip.name}</span>
                <small>
                  {formatDate(trip.start_date)} - {formatDate(trip.end_date)}
                </small>
                <small>Owner: {trip.user_id}</small>
                <strong>{formatCurrency(trip.budget)}</strong>
              </button>
            ))}
          </div>

          {selectedTrip ? (
            <div className="inline-actions">
              {canEditTrip(selectedTrip) ? (
                <button
                  className="button ghost"
                  type="button"
                  onClick={() => setTripEditor(selectedTrip)}
                >
                  Edit trip
                </button>
              ) : null}
              {isAdmin ? (
                <button className="button danger" type="button" onClick={handleTripDelete}>
                  Delete trip
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </aside>

      <main className="content">
        <header className="hero panel">
          <div>
            <p className="eyebrow">Dashboard</p>
            <h1>{selectedTrip?.name || "Travel expense tracker"}</h1>
            <p className="muted">
              Login with username `admin` and password `HSUJ` for admin access.
              Only admin can delete trips and expenses.
            </p>
          </div>

          <div className="inline-actions">
            <button className="button primary" type="button" onClick={() => handleExport("pdf")}>
              Download PDF
            </button>
            <button className="button secondary" type="button" onClick={() => handleExport("xlsx")}>
              Download Excel
            </button>
          </div>
        </header>

        {statusMessage ? <div className="banner">{statusMessage}</div> : null}

        <section className="metrics">
          <div className="metric-card">
            <span>Total budget</span>
            <strong>{formatCurrency(totals.totalBudget)}</strong>
          </div>
          <div className="metric-card">
            <span>Total spent</span>
            <strong>{formatCurrency(totals.totalSpent)}</strong>
          </div>
          <div className="metric-card">
            <span>Remaining balance</span>
            <strong>{formatCurrency(totals.remainingBalance)}</strong>
          </div>
        </section>

        <section className="content-grid">
          <div className="stack-lg">
            <ExpenseForm
              expense={expenseEditor}
              onSave={handleExpenseSave}
              onCancel={() => setExpenseEditor(null)}
              loading={expenseSaving}
              uploadProgress={uploadProgress}
              uploadError={uploadError}
              disabled={!selectedTrip || !canEditTrip(selectedTrip)}
            />

            <ExpenseGrid
              expenses={visibleExpenses.map((expense) => ({
                ...expense,
                ownerName:
                  expense.ownerName || trips.find((trip) => trip.id === expense.trip_id)?.user_id || "-",
                receiptPreviewUrl: expense.receiptPreviewUrl || expense.receipt_url || "",
              }))}
              canManage={isAdmin}
              onEdit={(expense) => {
                if (canEditExpense(expense)) {
                  setExpenseEditor(expense);
                }
              }}
              onDelete={handleExpenseDelete}
            />
          </div>

          <div className="stack-lg">
            <div className="panel">
              <div className="section-heading">
                <h3>Recent expenses</h3>
              </div>
              <div className="recent-list">
                {recentExpenses.length ? (
                  recentExpenses.map((expense) => (
                    <div className="recent-item" key={expense.id}>
                      <div>
                        <strong>{expense.description}</strong>
                        <p className="muted">
                          {expense.category} | {formatDate(expense.date)}
                        </p>
                      </div>
                      <span>{formatCurrency(expense.amount)}</span>
                    </div>
                  ))
                ) : (
                  <p className="muted">Your latest expenses will appear here.</p>
                )}
              </div>
            </div>

            <div className="panel">
              <div className="section-heading">
                <h3>Access</h3>
              </div>
              <div className="summary-list">
                <div>
                  <span>Username</span>
                  <strong>{session.username}</strong>
                </div>
                <div>
                  <span>Role</span>
                  <strong>{session.role}</strong>
                </div>
                <div>
                  <span>Trips visible</span>
                  <strong>{visibleTrips.length}</strong>
                </div>
                <div>
                  <span>Delete access</span>
                  <strong>{isAdmin ? "Allowed" : "Blocked"}</strong>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
