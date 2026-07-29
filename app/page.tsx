"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  AdminDashboard,
  CatalogAdmin,
  CustomersAdmin,
  DataImportAdmin,
  SettingsAdmin,
  TeamAdmin,
} from "./components/Admin";
import { Billing } from "./components/Billing";
import { Login } from "./components/Login";
import { Reports } from "./components/Reports";
import { PageSkeleton } from "./components/ui/skeleton";
import { MuiCircularProgress } from "./components/ui/mui";
import { api, ApiError } from "./client";
import { useAppStore, type AppView } from "./store";
import type { BootstrapData, User } from "./types";

const navItems: Array<{
  id: AppView;
  label: string;
  icon: string;
  adminOnly?: boolean;
}> = [
  { id: "dashboard", label: "Dashboard", icon: "⌂", adminOnly: true },
  { id: "billing", label: "New order", icon: "+", adminOnly: false },
  { id: "reports", label: "Reports", icon: "▥", adminOnly: false },
  { id: "catalog", label: "Services & prices", icon: "◇", adminOnly: true },
  { id: "customers", label: "Customers", icon: "◎", adminOnly: true },
  { id: "imports", label: "Import data", icon: "⇩", adminOnly: true },
  { id: "team", label: "Team access", icon: "♙", adminOnly: true },
  { id: "settings", label: "Shop settings", icon: "⚙", adminOnly: true },
];

export default function Home() {
  const {
    data,
    loading,
    navLoading,
    view,
    menuOpen,
    setData,
    setLoading,
    setView,
    setMenuOpen,
  } = useAppStore();
  const [error, setError] = useState("");
  const [passwordOpen, setPasswordOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await api<BootstrapData>("/api/bootstrap");
      setData(result);
      setError("");
      if (result.user.role === "staff" && view === "dashboard") {
        setView("billing");
      }
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        setData(null);
      } else {
        setError(caught instanceof Error ? caught.message : "Unable to load app");
      }
    } finally {
      setLoading(false);
    }
  }, [setData, setLoading, setView, view]);

  useEffect(() => {
    let cancelled = false;
    api<BootstrapData>("/api/bootstrap")
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setError("");
        setView(result.user.role === "admin" ? "dashboard" : "billing");
      })
      .catch((caught) => {
        if (cancelled) return;
        if (caught instanceof ApiError && caught.status === 401) {
          setData(null);
        } else {
          setError(
            caught instanceof Error ? caught.message : "Unable to load app",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [setData, setLoading, setView]);

  async function logout() {
    await api("/api/auth/logout", { method: "POST", body: "{}" });
    setData(null);
    setView("billing");
  }

  if (loading) {
    return (
      <main className="app-loading">
        <div className="login-logo">PL</div>
        <b>Preparing your shop…</b>
      </main>
    );
  }

  if (!data) {
    return (
      <>
        {error && <div className="global-error">{error}</div>}
        <Login
          onLogin={async (user: User) => {
            setView(user.role === "admin" ? "dashboard" : "billing");
            setLoading(true);
            await load();
          }}
        />
      </>
    );
  }

  const navigation = navItems.filter(
    (item) => !item.adminOnly || data.user.role === "admin",
  );

  return (
    <main className="management-app">
      <aside className={`sidebar no-print ${menuOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            {data.shop.shopName
              .split(/\s+/)
              .slice(0, 2)
              .map((part) => part[0])
              .join("")}
          </div>
          <div>
            <b>{data.shop.shopName}</b>
            <span>Shop operations</span>
          </div>
        </div>
        <nav>
          <p>WORKSPACE</p>
          {navigation.map((item) => (
            <button
              key={item.id}
              className={view === item.id ? "active" : ""}
              onClick={() => {
                setView(item.id);
              }}
            >
              <span>{item.icon}</span>
              {item.label}
              {navLoading && view !== item.id && (
                <MuiCircularProgress size={13} color="inherit" />
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-user">
          <div>{data.user.displayName.slice(0, 1).toUpperCase()}</div>
          <span>
            <b>{data.user.displayName}</b>
            <small>{data.user.role}</small>
          </span>
          <button onClick={logout} title="Sign out">
            ↗
          </button>
        </div>
      </aside>

      <section className="app-main">
        <header className="mobile-header no-print">
          <button onClick={() => setMenuOpen(!menuOpen)}>☰</button>
          <b>{data.shop.shopName}</b>
          <span className="role-chip">{data.user.role}</span>
        </header>

        {data.user.mustChangePassword && (
          <div className="security-banner no-print">
            <span>
              <b>Secure your account.</b> Change the temporary password before
              continuing regular shop use.
            </span>
            <button onClick={() => setPasswordOpen(true)}>Change password</button>
          </div>
        )}
        {error && <div className="alert error app-error">{error}</div>}

        {navLoading && <PageSkeleton />}
        {!navLoading && view === "dashboard" && <AdminDashboard data={data} />}
        {!navLoading && view === "billing" && (
          <Billing
            shop={data.shop}
            catalog={data.catalog}
            customers={data.customers}
            onSaved={load}
          />
        )}
        {!navLoading && view === "reports" && (
          <Reports
            key={`${data.reportRange.from}-${data.recentOrders.length}`}
            user={data.user}
            initialOrders={data.recentOrders}
            initialRange={data.reportRange}
            initialTotal={data.reportTotal}
            initialSummary={data.reportSummary}
            onChanged={load}
          />
        )}
        {!navLoading && view === "catalog" && data.user.role === "admin" && (
          <CatalogAdmin catalog={data.catalog} refresh={load} />
        )}
        {!navLoading && view === "customers" && data.user.role === "admin" && (
          <CustomersAdmin customers={data.customers} refresh={load} />
        )}
        {!navLoading && view === "imports" && data.user.role === "admin" && (
          <DataImportAdmin refresh={load} />
        )}
        {!navLoading && view === "team" && data.user.role === "admin" && data.admin && (
          <TeamAdmin
            users={data.admin.users}
            grants={data.admin.grants}
            refresh={load}
          />
        )}
        {!navLoading && view === "settings" && data.user.role === "admin" && (
          <SettingsAdmin shop={data.shop} refresh={load} />
        )}
      </section>

      {passwordOpen && (
        <PasswordModal
          onClose={() => setPasswordOpen(false)}
          onChanged={async () => {
            setPasswordOpen(false);
            await load();
          }}
        />
      )}
    </main>
  );
}

function PasswordModal({
  onClose,
  onChanged,
}: {
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await api("/api/account", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      await onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Password change failed");
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form
        className="modal password-modal"
        onSubmit={submit}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <p className="eyebrow">ACCOUNT SECURITY</p>
            <h3>Change password</h3>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            ×
          </button>
        </header>
        {error && <div className="alert error">{error}</div>}
        <label>
          Current password
          <input
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
          />
        </label>
        <label>
          New password
          <input
            type="password"
            minLength={8}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
          />
        </label>
        <button className="primary-button wide">Update password</button>
      </form>
    </div>
  );
}
