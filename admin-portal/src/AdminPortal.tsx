"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CatalogAdmin,
  CustomersAdmin,
  DataImportAdmin,
  SettingsAdmin,
  TeamAdmin,
} from "../../app/components/Admin";
import { Reports } from "../../app/components/Reports";
import { api, ApiError } from "../../app/client";
import type { BootstrapData, Expense, User } from "../../contracts/src";

type AdminView = "dashboard" | "reports" | "expenses" | "catalog" | "customers" | "imports" | "team" | "settings" | "platform";
type Locale = "en" | "ar";

const tr = (locale: Locale, en: string, ar: string) => locale === "ar" ? ar : en;

const money = new Intl.NumberFormat("en-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const today = () => new Date(Date.now() + 3 * 60 * 60_000).toISOString().slice(0, 10);
const daysAgo = (days: number) => new Date(Date.now() + 3 * 60 * 60_000 - days * 86_400_000).toISOString().slice(0, 10);

const navigation: Array<{ id: AdminView; label: string; labelAr: string; icon: string; superOnly?: boolean }> = [
  { id: "dashboard", label: "Dashboard", labelAr: "لوحة المعلومات", icon: "⌂" },
  { id: "reports", label: "Sales reports", labelAr: "تقارير المبيعات", icon: "▥" },
  { id: "expenses", label: "Expenses", labelAr: "المصروفات", icon: "↘" },
  { id: "catalog", label: "Services & pricing", labelAr: "الخدمات والأسعار", icon: "◇" },
  { id: "customers", label: "Customers", labelAr: "العملاء", icon: "◎" },
  { id: "imports", label: "Data imports", labelAr: "استيراد البيانات", icon: "⇩" },
  { id: "team", label: "Users & access", labelAr: "المستخدمون والصلاحيات", icon: "♙" },
  { id: "settings", label: "Shop settings", labelAr: "إعدادات المتجر", icon: "⚙" },
  { id: "platform", label: "Platform controls", labelAr: "إدارة المنصة", icon: "⌘", superOnly: true },
];

export default function AdminPortal() {
  const [data, setData] = useState<BootstrapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<AdminView>("dashboard");
  const [error, setError] = useState("");
  const [locale, setLocale] = useState<Locale>(() => typeof window !== "undefined" && localStorage.getItem("laundry-admin-locale") === "ar" ? "ar" : "en");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  function changeLocale(next: Locale) {
    setLocale(next);
    localStorage.setItem("laundry-admin-locale", next);
  }

  const load = useCallback(async () => {
    try {
      const result = await api<BootstrapData>("/api/bootstrap");
      setData(result);
      setError("");
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) setData(null);
      else setError(caught instanceof Error ? caught.message : "Unable to open admin portal");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial data synchronization with the backend.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function logout() {
    await api("/api/auth/logout", { method: "POST", body: "{}" });
    setData(null);
  }

  if (loading) return <div className="admin-loading">Loading admin portal…</div>;
  if (!data) return <AdminLogin onLogin={async () => { setLoading(true); await load(); }} error={error} locale={locale} changeLocale={changeLocale} />;
  if (data.user.role !== "admin") {
    return <main className="admin-denied" dir={locale === "ar" ? "rtl" : "ltr"}><div><b>{tr(locale, "Admin access required", "مطلوب صلاحية مسؤول")}</b><p>{tr(locale, "Your office account cannot open this portal.", "حساب المكتب لا يملك صلاحية فتح هذه البوابة.")}</p><Link href="/">{tr(locale, "Return to office portal", "العودة إلى بوابة المكتب")}</Link></div></main>;
  }

  const allowedNavigation = navigation.filter((item) => !item.superOnly || data.user.portalRole === "super_admin");
  return (
    <main className="admin-shell" dir={locale === "ar" ? "rtl" : "ltr"} lang={locale}>
      {mobileNavOpen && <button className="admin-nav-scrim no-print" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
      <aside className={`admin-nav no-print ${mobileNavOpen ? "mobile-open" : ""}`}>
        <div className="admin-brand"><span>PL</span><div><b>{data.shop.shopName}</b><small>Admin portal</small></div></div>
        <nav>{allowedNavigation.map((item) => <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => { setView(item.id); setMobileNavOpen(false); }}><i>{item.icon}</i>{locale === "ar" ? item.labelAr : item.label}</button>)}</nav>
        <Link className="office-link" href="/">↗ {tr(locale, "Open office portal", "فتح بوابة المكتب")}</Link>
        <div className="admin-user"><span>{data.user.displayName.slice(0, 2).toUpperCase()}</span><div><b>{data.user.displayName}</b><small>{data.user.portalRole.replaceAll("_", " ")}</small></div><button onClick={logout}>↗</button></div>
      </aside>
      <section className="admin-main">
        <header className="admin-topbar no-print"><button className="admin-menu-trigger" onClick={() => setMobileNavOpen(true)} aria-label={tr(locale, "Open navigation", "فتح القائمة")}>☰</button><div><span>{tr(locale, "ADMIN WORKSPACE", "مساحة إدارة المتجر")}</span><b>{locale === "ar" ? navigation.find((item) => item.id === view)?.labelAr : navigation.find((item) => item.id === view)?.label}</b></div><div className="admin-top-actions"><div className="language-switch" aria-label="Language"><button className={locale === "en" ? "active" : ""} onClick={() => changeLocale("en")}>EN</button><button className={locale === "ar" ? "active" : ""} onClick={() => changeLocale("ar")}>ع</button></div><div className={`admin-role ${data.user.portalRole}`}>{data.user.portalRole.replaceAll("_", " ")}</div></div></header>
        {error && <div className="admin-alert">{error}</div>}
        {view === "dashboard" && <AnalyticsDashboard data={data} locale={locale} />}
        {view === "reports" && <Reports user={data.user} initialOrders={data.recentOrders} initialRange={data.reportRange} initialTotal={data.reportTotal} initialSummary={data.reportSummary} onChanged={load} />}
        {view === "expenses" && <AdminExpenses locale={locale} />}
        {view === "catalog" && <CatalogAdmin catalog={data.catalog} refresh={load} />}
        {view === "customers" && <CustomersAdmin customers={data.customers} refresh={load} />}
        {view === "imports" && <DataImportAdmin refresh={load} />}
        {view === "team" && data.admin && <TeamAdmin users={data.admin.users} grants={data.admin.grants} refresh={load} />}
        {view === "settings" && <SettingsAdmin shop={data.shop} refresh={load} />}
        {view === "platform" && data.user.portalRole === "super_admin" && <PlatformControls data={data} locale={locale} />}
      </section>
    </main>
  );
}

function AdminLogin({ onLogin, error, locale, changeLocale }: { onLogin: (user: User) => Promise<void>; error: string; locale: Locale; changeLocale: (locale: Locale) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(error);
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const result = await api<{ user: User }>("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
      if (result.user.role !== "admin") throw new Error("This account does not have admin portal access.");
      await onLogin(result.user);
    } catch (caught) { setMessage(caught instanceof Error ? caught.message : "Sign in failed"); }
    finally { setBusy(false); }
  }
  return <main className="admin-login" dir={locale === "ar" ? "rtl" : "ltr"}><form onSubmit={submit}><div className="login-language"><button type="button" onClick={() => changeLocale(locale === "en" ? "ar" : "en")}>{locale === "en" ? "العربية" : "English"}</button></div><div className="admin-login-mark">PL</div><p>{tr(locale, "ADMIN PORTAL", "بوابة الإدارة")}</p><h1>{tr(locale, "Manage your laundry business", "إدارة أعمال المغسلة بسهولة")}</h1><span>{tr(locale, "Owners and authorized technical administrators only.", "للمالك ومسؤولي التقنية المصرح لهم فقط.")}</span>{message && <div>{message}</div>}<label>{tr(locale, "Username", "اسم المستخدم")}<input value={username} onChange={(event) => setUsername(event.target.value)} required /></label><label>{tr(locale, "Password", "كلمة المرور")}<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label><button disabled={busy}>{busy ? tr(locale, "Signing in…", "جارٍ تسجيل الدخول…") : tr(locale, "Sign in", "تسجيل الدخول")}</button><Link href="/">{tr(locale, "Return to office portal", "العودة إلى بوابة المكتب")}</Link></form></main>;
}

function AnalyticsDashboard({ data, locale }: { data: BootstrapData; locale: Locale }) {
  const [expenseTotal, setExpenseTotal] = useState(0);
  useEffect(() => {
    api<{ totalAmount: number }>(`/api/expenses?from=${today()}&to=${today()}&pageSize=1`).then((result) => setExpenseTotal(result.totalAmount)).catch(() => setExpenseTotal(0));
  }, []);
  const net = Number(data.todaySummary.grossSales) - expenseTotal;
  const paidRate = data.reportSummary.sales ? (data.reportSummary.collected / data.reportSummary.sales) * 100 : 0;
  return <div className="admin-page"><header className="admin-page-title"><div><p>{tr(locale,"BUSINESS OVERVIEW","نظرة عامة على الأعمال")}</p><h1>{tr(locale,"Today’s performance","أداء اليوم")}</h1><span>{tr(locale,"Sales, collections, costs, and operating position.","المبيعات والتحصيل والمصروفات وصافي التشغيل.")}</span></div><strong>{new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-SA", { dateStyle: "full", timeZone: "Asia/Riyadh" }).format(new Date())}</strong></header><section className="analytics-metrics"><article className="blue"><span>{tr(locale,"Gross sales","إجمالي المبيعات")}</span><b>SAR {money.format(Number(data.todaySummary.grossSales))}</b><small>{data.todaySummary.orderCount} {tr(locale,"orders today","طلبات اليوم")}</small></article><article><span>{tr(locale,"Collected","المحصّل")}</span><b>SAR {money.format(Number(data.todaySummary.collected))}</b><small>{paidRate.toFixed(0)}% {tr(locale,"collection rate","نسبة التحصيل")}</small></article><article className="orange"><span>{tr(locale,"Expenses","المصروفات")}</span><b>SAR {money.format(expenseTotal)}</b><small>{tr(locale,"Posted operating costs today","مصروفات التشغيل المسجلة اليوم")}</small></article><article className={net < 0 ? "red" : "green"}><span>{tr(locale,"Net operating","صافي التشغيل")}</span><b>SAR {money.format(net)}</b><small>{tr(locale,"Gross sales less posted expenses","المبيعات ناقص المصروفات")}</small></article></section><section className="analytics-grid"><article><header><h2>{tr(locale,"Collection mix","طرق التحصيل")}</h2><span>{tr(locale,"Today","اليوم")}</span></header><div className="mix-row"><span>{tr(locale,"Cash","نقدي")}</span><div><i style={{ width: `${data.todaySummary.collected ? Number(data.todaySummary.cashCollected) / Number(data.todaySummary.collected) * 100 : 0}%` }} /></div><b>SAR {money.format(Number(data.todaySummary.cashCollected))}</b></div><div className="mix-row"><span>{tr(locale,"Card","بطاقة")}</span><div><i style={{ width: `${data.todaySummary.collected ? Number(data.todaySummary.cardCollected) / Number(data.todaySummary.collected) * 100 : 0}%` }} /></div><b>SAR {money.format(Number(data.todaySummary.cardCollected))}</b></div></article><article><header><h2>{tr(locale,"Outstanding","الرصيد المستحق")}</h2><span>{tr(locale,"Action needed","بحاجة للمتابعة")}</span></header><div className="outstanding-number">SAR {money.format(Number(data.todaySummary.outstanding))}</div><p>{tr(locale,"Review partial and unpaid invoices in Sales reports.","راجع الفواتير الجزئية وغير المدفوعة في تقارير المبيعات.")}</p></article></section><section className="admin-recent"><header><h2>{tr(locale,"Recent orders","أحدث الطلبات")}</h2><span>{tr(locale,"Token-searchable sales","مبيعات قابلة للبحث بالرمز")}</span></header>{data.recentOrders.slice(0, 8).map((order) => <div key={order.id}><strong>{order.tokenNumber || tr(locale,"Legacy","قديم")}</strong><span>{order.invoiceNumber}</span><b>{order.customerName}</b><i className={order.paymentStatus}>{order.paymentStatus}</i><em>SAR {money.format(Number(order.totalAmount))}</em></div>)}</section></div>;
}

function AdminExpenses({ locale }: { locale: Locale }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    const result = await api<{ expenses: Expense[]; totalAmount: number }>(`/api/expenses?from=${daysAgo(30)}&to=${today()}&pageSize=100`);
    setExpenses(result.expenses); setTotal(result.totalAmount);
  }, []);
  useEffect(() => {
    // Initial expense synchronization with the backend.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load().catch((error) => setMessage(error.message));
  }, [load]);
  async function voidExpense(expense: Expense) {
    await api("/api/expenses", { method: "PATCH", body: JSON.stringify({ ...expense, status: "void", version: expense.version }) });
    await load();
  }
  return <div className="admin-page"><header className="admin-page-title"><div><p>{tr(locale,"EXPENSE CONTROL","إدارة المصروفات")}</p><h1>{tr(locale,"Expense register","سجل المصروفات")}</h1><span>{tr(locale,"Thirty-day cost history. New entries are created in the office portal.","سجل مصروفات 30 يوماً. تُضاف المصروفات الجديدة من بوابة المكتب.")}</span></div><strong>SAR {money.format(total)} {tr(locale,"posted","مسجل")}</strong></header>{message && <div className="admin-alert">{message}</div>}<section className="admin-expense-table"><table><thead><tr><th>{tr(locale,"Reference","المرجع")}</th><th>{tr(locale,"Date","التاريخ")}</th><th>{tr(locale,"Category","الفئة")}</th><th>{tr(locale,"Description","الوصف")}</th><th>{tr(locale,"Method","الطريقة")}</th><th>{tr(locale,"Amount","المبلغ")}</th><th>{tr(locale,"Status","الحالة")}</th><th /></tr></thead><tbody>{expenses.map((expense) => <tr key={expense.id}><td><b>{expense.expenseNumber}</b></td><td>{expense.expenseDate}</td><td>{expense.category}</td><td>{expense.description}<small>{expense.vendor}</small></td><td>{expense.paymentMethod}</td><td><b>SAR {money.format(Number(expense.amount))}</b></td><td><span className={expense.status}>{expense.status}</span></td><td>{expense.status === "posted" && <button onClick={() => voidExpense(expense)}>{tr(locale,"Void","إلغاء")}</button>}</td></tr>)}</tbody></table></section></div>;
}

function PlatformControls({ data, locale }: { data: BootstrapData; locale: Locale }) {
  const activeUsers = useMemo(() => data.admin?.users.filter((user) => user.isActive).length ?? 0, [data.admin?.users]);
  return <div className="admin-page"><header className="admin-page-title"><div><p>{tr(locale,"SUPER-ADMIN","المسؤول التقني")}</p><h1>{tr(locale,"Platform controls","إدارة المنصة")}</h1><span>{tr(locale,"Technical governance, diagnostics, and service ownership.","الحوكمة التقنية والتشخيص وملكية الخدمات.")}</span></div><strong>{tr(locale,"Restricted access","وصول مقيّد")}</strong></header><section className="platform-grid"><article><span>{tr(locale,"DEPLOYMENT MODEL","نموذج النشر")}</span><h2>{tr(locale,"Domain microservices","خدمات مصغرة حسب النطاق")}</h2><p>{tr(locale,"Identity, catalog, customer, orders, expenses, reporting, and settings are isolated service boundaries.","الهوية والدليل والعملاء والطلبات والمصروفات والتقارير والإعدادات نطاقات مستقلة.")}</p></article><article><span>{tr(locale,"ACTIVE USERS","المستخدمون النشطون")}</span><h2>{activeUsers}</h2><p>{tr(locale,"Owner and office identities currently enabled.","حسابات المالك والمكتب المفعلة حالياً.")}</p></article><article><span>{tr(locale,"DATA INTEGRITY","سلامة البيانات")}</span><h2>{tr(locale,"Healthy","سليمة")}</h2><p>{tr(locale,"Effective prices, immutable invoice snapshots, optimistic versions, and audit events are enabled.","الأسعار الفعالة ولقطات الفواتير والإصدارات وأحداث التدقيق مفعلة.")}</p></article><article><span>{tr(locale,"OPERATIONS","التشغيل")}</span><h2>{tr(locale,"Service diagnostics","تشخيص الخدمات")}</h2><p>{tr(locale,"Each backend repository exposes health and readiness endpoints for deployment monitoring.","كل خدمة خلفية توفر نقاط فحص الصحة والجاهزية.")}</p></article></section><section className="platform-note"><b>{tr(locale,"Security boundary","حدود الأمان")}</b><p>{tr(locale,"Shop admins control business data. Only super-admins can grant technical access or change platform-level configuration.","مديرو المتجر يتحكمون ببيانات العمل، والمسؤول التقني وحده يمنح الوصول التقني.")}</p></section></div>;
}
