import { useState } from "react";

export function SimpleAuthForm({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!username || !password) {
      setError("Enter both username and password.");
      return;
    }

    if (username === "admin" && password === "HSUJ") {
      onLogin({
        username: "admin",
        role: "admin",
      });
      return;
    }

    onLogin({
      username,
      role: "member",
    });
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <p className="eyebrow">Simple Travel Expense Tracker</p>
        <h1>Log in with a simple username and password.</h1>
        <p className="muted">
          Use username `admin` and password `HSUJ` for admin access. Any other
          username signs in as a member. Only admin can delete.
        </p>

        <form className="stack-lg" onSubmit={handleSubmit}>
          <label className="field">
            <span>Username</span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="admin"
              required
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="HSUJ"
              required
            />
          </label>

          <button className="button primary" type="submit">
            Sign in
          </button>
        </form>

        {error ? <p className="feedback error">{error}</p> : null}
      </div>
    </div>
  );
}
