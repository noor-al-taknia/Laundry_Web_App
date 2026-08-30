"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { api, ApiError } from "../../app/client";
import { Receipt, type ReceiptData } from "../../app/components/Receipt";
import { calculateInvoice } from "../../lib/invoice";
import type {
  BootstrapData,
  Category,
  Customer,
  Expense,
  Order,
  OrderDetail,
  User,
} from "../../contracts/src";
import { useOfficeStore } from "./store";

const sar = new Intl.NumberFormat("en-SA", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
type Locale = "en" | "ar";
const tr = (locale: Locale, en: string, ar: string) => locale === "ar" ? ar : en;

function riyadhToday() {
  return new Date(Date.now() + 3 * 60 * 60_000).toISOString().slice(0, 10);
}

function receiptFromOrder(detail: OrderDetail): ReceiptData {
  return {
    invoiceNumber: detail.order.invoiceNumber,
    tokenNumber: detail.order.tokenNumber,
    orderDateTime: detail.order.createdAt,
    supplyDate: detail.order.supplyDate,
    customerName: detail.order.customerName,
    customerPhone: detail.order.customerPhone,
    customerAddress: detail.order.customerAddress,
    paymentMethod: detail.order.paymentMethod,
    paymentStatus: detail.order.paymentStatus,
    subtotal: Number(detail.order.subtotal),
    discount: Number(detail.order.discount),
    vatAmount: Number(detail.order.vatAmount),
    totalAmount: Number(detail.order.totalAmount),
    amountPaid: Number(detail.order.amountPaid),
    balance: Number(detail.order.balance),
    items: detail.items.map((item) => ({
      ...item,
      unitPrice: Number(item.unitPrice),
      quantity: Number(item.quantity),
      taxableAmount: Number(item.taxableAmount),
      vatAmount: Number(item.vatAmount),
      totalAmount: Number(item.totalAmount),
    })),
  };
}

export default function OfficePortal() {
  const [data, setData] = useState<BootstrapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [tokenSearch, setTokenSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Order[]>([]);
  const [locale, setLocale] = useState<Locale>(() => typeof window !== "undefined" && localStorage.getItem("laundry-office-locale") === "ar" ? "ar" : "en");
  const { section, setSection } = useOfficeStore();

  const load = useCallback(async () => {
    try {
      const result = await api<BootstrapData>("/api/bootstrap");
      setData(result);
      setError("");
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) setData(null);
      else setError(caught instanceof Error ? caught.message : "Unable to open office portal");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial data synchronization with the backend.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  function changeLocale(next: Locale) {
    setLocale(next);
    localStorage.setItem("laundry-office-locale", next);
  }

  async function logout() {
    await api("/api/auth/logout", { method: "POST", body: "{}" });
    setData(null);
    setProfileOpen(false);
  }

  async function searchToken(event: FormEvent) {
    event.preventDefault();
    if (!tokenSearch.trim()) return setSearchResults([]);
    try {
      const query = new URLSearchParams({
        customer: tokenSearch.trim(),
        from: data?.reportRange.from ?? riyadhToday(),
        to: riyadhToday(),
        pageSize: "10",
      });
      const result = await api<{ orders: Order[] }>(`/api/orders?${query}`);
      setSearchResults(result.orders);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Token search failed");
    }
  }

  if (loading) return <OfficeLoading />;
  if (!data) return <OfficeLogin error={error} onLogin={async () => { setLoading(true); await load(); }} locale={locale} changeLocale={changeLocale} />;

  return (
    <main className="office-shell" dir={locale === "ar" ? "rtl" : "ltr"} lang={locale}>
      <header className="office-topbar no-print">
        <div className="office-brand">
          <span>{data.shop.shopName.split(/\s+/).slice(0, 2).map((word) => word[0]).join("")}</span>
          <div><b>{locale === "ar" && data.shop.shopNameAr ? data.shop.shopNameAr : data.shop.shopName}</b><small>{tr(locale,"Office portal","بوابة المكتب")}</small></div>
        </div>
        <nav className="office-tabs" aria-label="Office workspace">
          <button className={section === "sales" ? "active" : ""} onClick={() => setSection("sales")}>{tr(locale,"Sales","المبيعات")}</button>
          <button className={section === "expenses" ? "active" : ""} onClick={() => setSection("expenses")}>{tr(locale,"Expenses","المصروفات")}</button>
        </nav>
        <div className="office-actions">
          <form className="token-search" onSubmit={searchToken}>
            <input value={tokenSearch} onChange={(event) => setTokenSearch(event.target.value)} placeholder={tr(locale,"Search token","بحث بالرمز")} aria-label={tr(locale,"Search token number","البحث برمز الطلب")} />
            <button aria-label="Run token search">⌕</button>
          </form>
          <button className="profile-trigger" onClick={() => setProfileOpen((open) => !open)} aria-label="Open profile menu">
            {data.user.displayName.slice(0, 2).toUpperCase()}
          </button>
          {profileOpen && (
            <div className="profile-menu">
              <div><b>{data.user.displayName}</b><span>{data.user.portalRole.replaceAll("_", " ")}</span></div>
              <button className="profile-language" onClick={() => changeLocale(locale === "en" ? "ar" : "en")}>{locale === "en" ? "العربية" : "English"}</button>
              <button onClick={() => setError(tr(locale,"Profile editing is available from the admin portal.","تعديل الملف الشخصي متاح من بوابة الإدارة."))}>{tr(locale,"Profile","الملف الشخصي")}</button>
              {data.user.role === "admin" && <a href="/admin">{tr(locale,"Admin portal","بوابة الإدارة")}</a>}
              <button onClick={() => setError(tr(locale,"Account and shop settings are managed in the admin portal.","تُدار إعدادات الحساب والمتجر من بوابة الإدارة."))}>{tr(locale,"Settings","الإعدادات")}</button>
              <button className="logout" onClick={logout}>{tr(locale,"Logout","تسجيل الخروج")}</button>
            </div>
          )}
        </div>
      </header>

      {error && <div className="office-alert no-print">{error}<button onClick={() => setError("")}>×</button></div>}
      {searchResults.length > 0 && (
        <div className="token-results no-print">
          <div><b>{tr(locale,"Token results","نتائج البحث بالرمز")}</b><button onClick={() => setSearchResults([])}>×</button></div>
          {searchResults.map((order) => (
            <article key={order.id}><strong>{order.tokenNumber || "Legacy order"}</strong><span>{order.invoiceNumber} · {order.customerName}</span><b>SAR {sar.format(Number(order.totalAmount))}</b></article>
          ))}
        </div>
      )}

      {section === "sales" ? (
        <SalesWorkspace data={data} refresh={load} reportError={setError} locale={locale} />
      ) : (
        <ExpenseWorkspace reportError={setError} locale={locale} />
      )}
    </main>
  );
}

function OfficeLoading() {
  return (
    <main className="office-shell office-loading">
      <div className="office-loading-mark">PL</div>
      <div><b>Opening office portal</b><span>Loading shop data…</span></div>
    </main>
  );
}

function OfficeLogin({ error, onLogin, locale, changeLocale }: { error: string; onLogin: (user: User) => Promise<void>; locale: Locale; changeLocale: (locale: Locale) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(error);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const result = await api<{ user: User }>("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
      await onLogin(result.user);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="office-login" dir={locale === "ar" ? "rtl" : "ltr"}>
      <section className="office-login-copy"><span>PL</span><p>PEARL LAUNDRY</p><h1>{tr(locale,"Fast orders.","طلبات أسرع.")}<br />{tr(locale,"Clear daily costs.","مصروفات يومية واضحة.")}</h1><small>{tr(locale,"Secure office operations for your front desk.","تشغيل آمن وسهل لمكتب الاستقبال.")}</small></section>
      <form onSubmit={submit}>
        <button className="login-language" type="button" onClick={() => changeLocale(locale === "en" ? "ar" : "en")}>{locale === "en" ? "العربية" : "English"}</button><p>{tr(locale,"OFFICE PORTAL","بوابة المكتب")}</p><h2>{tr(locale,"Welcome back","مرحباً بعودتك")}</h2><span>{tr(locale,"Sign in with your assigned account.","سجّل الدخول بالحساب المخصص لك.")}</span>
        {message && <div className="office-login-error">{message}</div>}
        <label>{tr(locale,"Username","اسم المستخدم")}<input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required /></label>
        <label>{tr(locale,"Password","كلمة المرور")}<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>
        <button disabled={busy}>{busy ? tr(locale,"Signing in…","جارٍ تسجيل الدخول…") : tr(locale,"Sign in","تسجيل الدخول")}</button>
      </form>
    </main>
  );
}

function SalesWorkspace({ data, refresh, reportError, locale }: { data: BootstrapData; refresh: () => Promise<void>; reportError: (message: string) => void; locale: Locale }) {
  const { cart, customer, categoryId, setCategoryId, addItem, setQuantity, setCustomer, resetSale } = useOfficeStore();
  const activeCategories = data.catalog.filter((category) => category.isActive);
  const activeCategory = activeCategories.find((category) => category.id === categoryId) ?? activeCategories[0];
  const [showCustomers, setShowCustomers] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [amountPaid, setAmountPaid] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState("");
  const [savedReceipt, setSavedReceipt] = useState<ReceiptData | null>(null);
  const totals = useMemo(() => calculateInvoice(cart, discount, amountPaid), [cart, discount, amountPaid]);
  const matches = useMemo(() => {
    const query = customer.query.trim().toLowerCase();
    return data.customers.filter((entry) => !query || `${entry.name} ${entry.phone}`.toLowerCase().includes(query)).slice(0, 6);
  }, [customer.query, data.customers]);

  function selectCustomer(selected: Customer) {
    setCustomer({ id: selected.id, query: selected.name, name: selected.name, phone: selected.phone, email: selected.email, address: selected.address });
    setShowCustomers(false);
  }

  function addService(category: Category, service: Category["services"][number]) {
    if (!service.price) return reportError(`${service.name} needs an active price.`);
    setSavedReceipt(null);
    addItem({ serviceId: service.id, categoryName: category.name, categoryColor: category.color, serviceName: service.name, unitPrice: service.price, quantity: 1 });
  }

  async function save(printAfter: boolean) {
    if (!cart.length) return reportError("Add at least one service.");
    setBusy(true);
    try {
      const result = await api<{ order: OrderDetail }>("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          customerId: customer.id,
          saveCustomer: !customer.id && Boolean(customer.name),
          customer,
          items: cart.map((item) => ({ serviceId: item.serviceId, quantity: item.quantity })),
          discount: totals.discount,
          amountPaid: totals.amountPaid,
          paymentMethod,
          supplyDate: riyadhToday(),
        }),
      });
      const receipt = receiptFromOrder(result.order);
      flushSync(() => {
        setSavedReceipt(receipt);
        resetSale();
        setDiscount(0);
        setAmountPaid(0);
      });
      setSuccess(`${receipt.tokenNumber} saved · ${receipt.invoiceNumber}`);
      await refresh();
      if (printAfter) requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
    } catch (caught) {
      reportError(caught instanceof Error ? caught.message : "Order could not be saved");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="sales-screen no-print-preview">
      <div className="sales-main">
        <div className="sales-heading"><div><p>{tr(locale,"NEW SALE","طلب جديد")}</p><h1>{tr(locale,"Take an order","إنشاء طلب")}</h1></div>{success && <div className="token-card success"><span>{tr(locale,"LAST TOKEN","آخر رمز")}</span><b>{success.split(" saved")[0]}</b></div>}</div>
        <div className="sales-controls">
          <div className="customer-control">
            <label>{tr(locale,"Customer","العميل")}<input value={customer.query} onFocus={() => setShowCustomers(true)} onChange={(event) => { setCustomer({ id: null, query: event.target.value, name: event.target.value }); setShowCustomers(true); }} placeholder={tr(locale,"Search or enter customer","ابحث أو أدخل اسم العميل")} /></label>
            {showCustomers && <div className="office-customer-results">{matches.map((entry) => <button key={entry.id} onClick={() => selectCustomer(entry)}><b>{entry.name}</b><span>{entry.phone || entry.email || tr(locale,"No contact","لا توجد بيانات اتصال")}</span></button>)}{!matches.length && <p>{tr(locale,"No saved match. Continue as a new customer.","لا يوجد عميل مطابق. أكمل كعميل جديد.")}</p>}</div>}
          </div>
          <label>{tr(locale,"Mobile","الجوال")}<input value={customer.phone} onChange={(event) => setCustomer({ phone: event.target.value })} placeholder="05xxxxxxxx" /></label>
        </div>
        <div className="item-grid">
          {activeCategory?.services.filter((service) => service.isActive).map((service) => (
            <button key={service.id} style={{ "--item-accent": activeCategory.color } as React.CSSProperties} onClick={() => addService(activeCategory, service)}><span>{service.name}<small>{service.nameAr}</small></span><b>SAR {sar.format(service.price)}</b></button>
          ))}
        </div>
        <div className="sale-cart">
          <header><div><p>{tr(locale,"ORDER ITEMS","عناصر الطلب")}</p><h2>{cart.length ? `${cart.length} ${tr(locale,"service lines","خدمات")}` : tr(locale,"No items added","لم تتم إضافة عناصر")}</h2></div><button onClick={resetSale}>{tr(locale,"Clear","مسح")}</button></header>
          <div className="sale-cart-lines">
            {cart.map((item) => <article key={item.serviceId}><i style={{ background: item.categoryColor }} /><div><b>{item.serviceName}</b><span>{item.categoryName} · SAR {sar.format(item.unitPrice)}</span></div><div className="office-qty"><button onClick={() => setQuantity(item.serviceId, item.quantity - 1)}>−</button><strong>{item.quantity}</strong><button onClick={() => setQuantity(item.serviceId, item.quantity + 1)}>+</button></div><b>SAR {sar.format(item.unitPrice * item.quantity * 1.15)}</b></article>)}
            {!cart.length && <div className="office-empty">{tr(locale,"Choose a category, then tap service buttons to build the order.","اختر فئة ثم اضغط على أزرار الخدمات لإنشاء الطلب.")}</div>}
          </div>
          <footer>
            <div className="office-payment"><div className="office-segment"><button className={paymentMethod === "cash" ? "active" : ""} onClick={() => setPaymentMethod("cash")}>{tr(locale,"Cash","نقدي")}</button><button className={paymentMethod === "card" ? "active" : ""} onClick={() => setPaymentMethod("card")}>{tr(locale,"Card","بطاقة")}</button></div><label>{tr(locale,"Discount","الخصم")}<input type="number" min="0" step="0.01" value={discount} onChange={(event) => setDiscount(Number(event.target.value))} /></label><label>{tr(locale,"Paid now","المدفوع الآن")}<input type="number" min="0" step="0.01" value={amountPaid} onChange={(event) => setAmountPaid(Number(event.target.value))} /></label></div>
            <div className="office-total"><span>{tr(locale,"VAT","الضريبة")} SAR {sar.format(totals.vatAmount)}</span><b>SAR {sar.format(totals.totalAmount)}</b><small>{tr(locale,"Balance","الرصيد")} SAR {sar.format(totals.balance)}</small></div>
            <button className="save-order" disabled={busy} onClick={() => save(false)}>{busy ? tr(locale,"Saving…","جارٍ الحفظ…") : tr(locale,"Save","حفظ")}</button>
            <button className="save-print" disabled={busy} onClick={() => save(true)}>{tr(locale,"Save & print","حفظ وطباعة")}</button>
          </footer>
        </div>
      </div>
      <aside className="category-rail">
        <p>{tr(locale,"CATEGORIES","الفئات")}</p>
        {activeCategories.map((category) => <button key={category.id} className={activeCategory?.id === category.id ? "active" : ""} style={{ "--category": category.color } as React.CSSProperties} onClick={() => setCategoryId(category.id)}><span>{category.name}</span><small>{category.services.filter((service) => service.isActive).length} {tr(locale,"items","عناصر")}</small></button>)}
      </aside>
      {savedReceipt && <div className="office-print-receipt"><Receipt shop={data.shop} receipt={savedReceipt} /></div>}
    </section>
  );
}

function ExpenseWorkspace({ reportError, locale }: { reportError: (message: string) => void; locale: Locale }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ expenseDate: riyadhToday(), category: "Utilities", description: "", amount: 0, paymentMethod: "cash", vendor: "", receiptReference: "", notes: "" });
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api<{ expenses: Expense[]; totalAmount: number }>(`/api/expenses?from=${riyadhToday()}&to=${riyadhToday()}`);
      setExpenses(result.expenses);
      setTotalAmount(result.totalAmount);
    } catch (caught) {
      reportError(caught instanceof Error ? caught.message : tr(locale,"Expenses could not be loaded","تعذر تحميل المصروفات"));
    } finally {
      setLoading(false);
    }
  }, [reportError, locale]);
  useEffect(() => {
    // Initial expense synchronization with the backend.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await api("/api/expenses", { method: "POST", body: JSON.stringify(form) });
      setFormOpen(false);
      setForm((current) => ({ ...current, description: "", amount: 0, vendor: "", receiptReference: "", notes: "" }));
      await load();
    } catch (caught) {
      reportError(caught instanceof Error ? caught.message : tr(locale,"Expense could not be saved","تعذر حفظ المصروف"));
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="expense-workspace no-print">
      <header><div><p>{tr(locale,"EXPENSES","المصروفات")}</p><h1>{tr(locale,"Daily operating costs","تكاليف التشغيل اليومية")}</h1><span>{tr(locale,"Record and review today’s shop expenses.","سجّل وراجع مصروفات المتجر اليوم.")}</span></div><div className="expense-total"><span>{tr(locale,"TODAY","اليوم")}</span><b>SAR {sar.format(totalAmount)}</b></div><button onClick={() => setFormOpen(true)}>+ {tr(locale,"Add expense","إضافة مصروف")}</button></header>
      <div className="expense-table-card"><table><thead><tr><th>{tr(locale,"Reference","المرجع")}</th><th>{tr(locale,"Category","الفئة")}</th><th>{tr(locale,"Description","الوصف")}</th><th>{tr(locale,"Vendor","المورد")}</th><th>{tr(locale,"Method","الطريقة")}</th><th>{tr(locale,"Amount","المبلغ")}</th><th>{tr(locale,"Status","الحالة")}</th></tr></thead><tbody>{expenses.map((expense) => <tr key={expense.id}><td><b>{expense.expenseNumber}</b><span>{expense.expenseDate}</span></td><td>{expense.category}</td><td>{expense.description}</td><td>{expense.vendor || "—"}</td><td><span className="expense-method">{expense.paymentMethod}</span></td><td><b>SAR {sar.format(Number(expense.amount))}</b></td><td><span className={`expense-status ${expense.status}`}>{expense.status}</span></td></tr>)}{!expenses.length && !loading && <tr><td colSpan={7}><div className="office-empty">{tr(locale,"No expenses recorded today.","لا توجد مصروفات مسجلة اليوم.")}</div></td></tr>}{loading && <tr><td colSpan={7}><div className="office-empty">{tr(locale,"Loading expenses…","جارٍ تحميل المصروفات…")}</div></td></tr>}</tbody></table></div>
      {formOpen && <div className="office-modal-backdrop" onMouseDown={() => setFormOpen(false)}><form className="expense-form" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}><header><div><p>{tr(locale,"NEW EXPENSE","مصروف جديد")}</p><h2>{tr(locale,"Add operating cost","إضافة تكلفة تشغيل")}</h2></div><button type="button" onClick={() => setFormOpen(false)}>×</button></header><div className="expense-form-grid"><label>{tr(locale,"Date","التاريخ")}<input type="date" value={form.expenseDate} onChange={(event) => setForm({ ...form, expenseDate: event.target.value })} required /></label><label>{tr(locale,"Category","الفئة")}<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}><option>Utilities</option><option>Supplies</option><option>Maintenance</option><option>Transport</option><option>Rent</option><option>Payroll</option><option>Other</option></select></label><label className="wide">{tr(locale,"Description","الوصف")}<input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required /></label><label>{tr(locale,"Amount (SAR)","المبلغ (ر.س)")}<input type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: Number(event.target.value) })} required /></label><label>{tr(locale,"Payment","الدفع")}<select value={form.paymentMethod} onChange={(event) => setForm({ ...form, paymentMethod: event.target.value })}><option value="cash">{tr(locale,"Cash","نقدي")}</option><option value="card">{tr(locale,"Card","بطاقة")}</option><option value="bank">{tr(locale,"Bank","تحويل بنكي")}</option></select></label><label>{tr(locale,"Vendor","المورد")}<input value={form.vendor} onChange={(event) => setForm({ ...form, vendor: event.target.value })} /></label><label>{tr(locale,"Receipt reference","مرجع الإيصال")}<input value={form.receiptReference} onChange={(event) => setForm({ ...form, receiptReference: event.target.value })} /></label><label className="wide">{tr(locale,"Notes","ملاحظات")}<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label></div><footer><button type="button" onClick={() => setFormOpen(false)}>{tr(locale,"Cancel","إلغاء")}</button><button className="primary" disabled={saving}>{saving ? tr(locale,"Saving…","جارٍ الحفظ…") : tr(locale,"Save expense","حفظ المصروف")}</button></footer></form></div>}
    </section>
  );
}
