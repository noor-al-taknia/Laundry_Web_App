"use client";

import { FormEvent, useState } from "react";
import { api } from "../client";
import type { User } from "../types";

export function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await api<{ user: User }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      onLogin(result.user);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to sign in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-brand">
        <div className="login-logo">PL</div>
        <p className="eyebrow">LAUNDRY OPERATIONS</p>
        <h1>Every order, payment, and customer—under control.</h1>
        <p>
          Secure billing and shop management for the front desk and the owner.
        </p>
        <div className="login-feature-grid">
          <span>15% VAT invoices</span>
          <span>Role-based access</span>
          <span>Customer history</span>
          <span>Daily reports</span>
        </div>
      </section>
      <section className="login-card-wrap">
        <form className="login-card" onSubmit={submit}>
          <p className="eyebrow">SECURE ACCESS</p>
          <h2>Sign in to your shop</h2>
          <p className="muted">Use your admin or staff account.</p>
          {error && <div className="alert error">{error}</div>}
          <label>
            Username
            <input
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Enter username"
              required
              autoFocus
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
              required
            />
          </label>
          <button className="primary-button wide" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
          <div className="demo-credentials">
            <strong>First-time accounts</strong>
            <span>Admin: admin / Admin@123</span>
            <span>Staff: staff / Staff@123</span>
            <small>Change these passwords immediately after signing in.</small>
          </div>
        </form>
      </section>
    </main>
  );
}
