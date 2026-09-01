import { getD1 } from "../db";
import { hashPassword } from "./crypto";

let initialization: Promise<void> | null = null;

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin','staff')),
    portal_role TEXT NOT NULL DEFAULT 'office_staff' CHECK(portal_role IN ('super_admin','admin','office_staff')),
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    must_change_password INTEGER NOT NULL DEFAULT 1,
    phone TEXT NOT NULL DEFAULT '',
    passport_number TEXT NOT NULL DEFAULT '',
    passport_expiry TEXT,
    visa_status TEXT NOT NULL DEFAULT 'not_recorded',
    visa_expiry TEXT,
    iqama_number TEXT NOT NULL DEFAULT '',
    iqama_expiry TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS shop_settings (
    id INTEGER PRIMARY KEY CHECK(id = 1),
    shop_name TEXT NOT NULL,
    shop_name_ar TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    vat_number TEXT NOT NULL DEFAULT '',
    commercial_number TEXT NOT NULL DEFAULT '',
    invoice_prefix TEXT NOT NULL DEFAULT 'INV',
    next_invoice_number INTEGER NOT NULL DEFAULT 1,
    receipt_footer TEXT NOT NULL DEFAULT 'Thank you for choosing our laundry service.',
    updated_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#0c5551',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    name_ar TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category_id, name)
  )`,
  `CREATE TABLE IF NOT EXISTS service_prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    price REAL NOT NULL CHECK(price > 0),
    effective_from TEXT NOT NULL,
    effective_to TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    vat_number TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_number TEXT NOT NULL UNIQUE,
    token_number TEXT UNIQUE,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL DEFAULT '',
    customer_email TEXT NOT NULL DEFAULT '',
    customer_address TEXT NOT NULL DEFAULT '',
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    assigned_staff_id INTEGER REFERENCES users(id) ON DELETE RESTRICT,
    order_date TEXT NOT NULL,
    supply_date TEXT NOT NULL,
    payment_method TEXT NOT NULL CHECK(payment_method IN ('cash','card')),
    card_account TEXT CHECK(card_account IS NULL OR card_account IN ('stc','anb')),
    cash_received REAL NOT NULL DEFAULT 0 CHECK(cash_received >= 0),
    balance_settled_by_staff INTEGER NOT NULL DEFAULT 0,
    settled_from_staff REAL NOT NULL DEFAULT 0 CHECK(settled_from_staff >= 0),
    settled_from_drawer REAL NOT NULL DEFAULT 0 CHECK(settled_from_drawer >= 0),
    payment_status TEXT NOT NULL CHECK(payment_status IN ('paid','unpaid','partial')),
    order_status TEXT NOT NULL DEFAULT 'active' CHECK(order_status IN ('active','void')),
    subtotal REAL NOT NULL CHECK(subtotal >= 0),
    discount REAL NOT NULL DEFAULT 0 CHECK(discount >= 0),
    vat_amount REAL NOT NULL CHECK(vat_amount >= 0),
    total_amount REAL NOT NULL CHECK(total_amount >= 0),
    amount_paid REAL NOT NULL DEFAULT 0 CHECK(amount_paid >= 0),
    balance REAL NOT NULL CHECK(balance >= 0),
    notes TEXT NOT NULL DEFAULT '',
    version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS staff_debts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    order_id INTEGER NOT NULL UNIQUE REFERENCES orders(id) ON DELETE RESTRICT,
    original_amount REAL NOT NULL CHECK(original_amount >= 0),
    outstanding_amount REAL NOT NULL CHECK(outstanding_amount >= 0 AND outstanding_amount <= original_amount),
    status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','settled','void')),
    notes TEXT NOT NULL DEFAULT '',
    settled_by INTEGER REFERENCES users(id),
    settled_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS order_sequences (
    business_date TEXT PRIMARY KEY,
    next_value INTEGER NOT NULL DEFAULT 1 CHECK(next_value > 0),
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY,
    expense_number TEXT NOT NULL UNIQUE,
    expense_date TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL CHECK(amount > 0),
    payment_method TEXT NOT NULL CHECK(payment_method IN ('cash','card','bank')),
    vendor TEXT NOT NULL DEFAULT '',
    receipt_reference TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'posted' CHECK(status IN ('posted','void')),
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    service_id INTEGER REFERENCES services(id) ON DELETE SET NULL,
    category_name TEXT NOT NULL,
    service_name TEXT NOT NULL,
    unit_price REAL NOT NULL CHECK(unit_price > 0),
    quantity REAL NOT NULL CHECK(quantity > 0),
    taxable_amount REAL NOT NULL CHECK(taxable_amount >= 0),
    vat_amount REAL NOT NULL CHECK(vat_amount >= 0),
    total_amount REAL NOT NULL CHECK(total_amount >= 0)
  )`,
  `CREATE TABLE IF NOT EXISTS order_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    actor_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    event_type TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS permission_grants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scope TEXT NOT NULL CHECK(scope IN ('reports_history','orders_history_write')),
    from_date TEXT NOT NULL,
    to_date TEXT NOT NULL,
    granted_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    expires_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK(from_date <= to_date)
  )`,
  `CREATE TABLE IF NOT EXISTS permission_requests (
    id INTEGER PRIMARY KEY,
    staff_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task TEXT NOT NULL CHECK(task IN ('collection_read','order_update','expense_update')),
    resource_type TEXT NOT NULL CHECK(resource_type IN ('collection_date','order','expense')),
    resource_id TEXT NOT NULL,
    reason TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','denied','revoked')),
    reviewed_by INTEGER REFERENCES users(id) ON DELETE RESTRICT,
    reviewed_at TEXT,
    expires_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS password_reset_requests (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','completed','denied')),
    requested_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_by INTEGER REFERENCES users(id) ON DELETE RESTRICT,
    completed_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS admin_notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipient_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    event_type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    resource_type TEXT NOT NULL DEFAULT '',
    resource_id TEXT NOT NULL DEFAULT '',
    is_read INTEGER NOT NULL DEFAULT 0 CHECK(is_read IN (0,1)),
    read_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  "CREATE INDEX IF NOT EXISTS categories_active_sort_idx ON categories(is_active, sort_order)",
  "CREATE INDEX IF NOT EXISTS services_category_active_idx ON services(category_id, is_active, sort_order)",
  "CREATE INDEX IF NOT EXISTS service_prices_current_idx ON service_prices(service_id, effective_from, effective_to)",
  "CREATE INDEX IF NOT EXISTS customers_name_idx ON customers(name)",
  "CREATE INDEX IF NOT EXISTS customers_phone_idx ON customers(phone)",
  "CREATE INDEX IF NOT EXISTS orders_date_idx ON orders(order_date)",
  "CREATE INDEX IF NOT EXISTS orders_customer_idx ON orders(customer_id)",
  "CREATE INDEX IF NOT EXISTS orders_status_method_idx ON orders(payment_status, payment_method)",
  "CREATE INDEX IF NOT EXISTS expenses_date_category_idx ON expenses(expense_date, category)",
  "CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items(order_id)",
  "CREATE INDEX IF NOT EXISTS order_events_order_idx ON order_events(order_id)",
  "CREATE INDEX IF NOT EXISTS permission_staff_scope_idx ON permission_grants(staff_user_id, scope, from_date, to_date)",
  "CREATE INDEX IF NOT EXISTS permission_requests_staff_status_idx ON permission_requests(staff_user_id, status, created_at)",
  "CREATE INDEX IF NOT EXISTS permission_requests_task_resource_idx ON permission_requests(task, resource_type, resource_id, status)",
  "CREATE INDEX IF NOT EXISTS password_resets_status_idx ON password_reset_requests(status, requested_at)",
  "CREATE INDEX IF NOT EXISTS staff_debts_staff_status_idx ON staff_debts(staff_user_id, status)",
  "CREATE INDEX IF NOT EXISTS admin_notifications_recipient_read_idx ON admin_notifications(recipient_user_id, is_read, created_at)",
  "CREATE INDEX IF NOT EXISTS admin_notifications_resource_idx ON admin_notifications(resource_type, resource_id)",
];

async function ensureCompatibilityColumns() {
  const db = getD1();
  const usersInfo = await db.prepare("PRAGMA table_info(users)").all<{ name: string }>();
  if (!usersInfo.results.some((column) => column.name === "portal_role")) {
    await db.prepare("ALTER TABLE users ADD COLUMN portal_role TEXT NOT NULL DEFAULT 'office_staff'").run();
  }
  const userColumns: Array<[string, string]> = [
    ["phone", "ALTER TABLE users ADD COLUMN phone TEXT NOT NULL DEFAULT ''"],
    ["passport_number", "ALTER TABLE users ADD COLUMN passport_number TEXT NOT NULL DEFAULT ''"],
    ["passport_expiry", "ALTER TABLE users ADD COLUMN passport_expiry TEXT"],
    ["visa_status", "ALTER TABLE users ADD COLUMN visa_status TEXT NOT NULL DEFAULT 'not_recorded'"],
    ["visa_expiry", "ALTER TABLE users ADD COLUMN visa_expiry TEXT"],
    ["iqama_number", "ALTER TABLE users ADD COLUMN iqama_number TEXT NOT NULL DEFAULT ''"],
    ["iqama_expiry", "ALTER TABLE users ADD COLUMN iqama_expiry TEXT"],
  ];
  for (const [name, statement] of userColumns) {
    if (!usersInfo.results.some((column) => column.name === name)) await db.prepare(statement).run();
  }
  await db
    .prepare("UPDATE users SET portal_role = 'super_admin' WHERE role = 'admin' AND portal_role = 'office_staff'")
    .run();

  const ordersInfo = await db.prepare("PRAGMA table_info(orders)").all<{ name: string }>();
  if (!ordersInfo.results.some((column) => column.name === "token_number")) {
    await db.prepare("ALTER TABLE orders ADD COLUMN token_number TEXT").run();
  }
  const orderColumns: Array<[string, string]> = [
    ["card_account", "ALTER TABLE orders ADD COLUMN card_account TEXT"],
    ["cash_received", "ALTER TABLE orders ADD COLUMN cash_received REAL NOT NULL DEFAULT 0"],
    ["balance_settled_by_staff", "ALTER TABLE orders ADD COLUMN balance_settled_by_staff INTEGER NOT NULL DEFAULT 0"],
    ["settled_from_staff", "ALTER TABLE orders ADD COLUMN settled_from_staff REAL NOT NULL DEFAULT 0"],
    ["settled_from_drawer", "ALTER TABLE orders ADD COLUMN settled_from_drawer REAL NOT NULL DEFAULT 0"],
    ["order_status", "ALTER TABLE orders ADD COLUMN order_status TEXT NOT NULL DEFAULT 'active'"],
    ["assigned_staff_id", "ALTER TABLE orders ADD COLUMN assigned_staff_id INTEGER REFERENCES users(id)"],
  ];
  for (const [name, statement] of orderColumns) {
    if (!ordersInfo.results.some((column) => column.name === name)) {
      await db.prepare(statement).run();
    }
  }
  await db
    .prepare("CREATE UNIQUE INDEX IF NOT EXISTS orders_token_number_uq ON orders(token_number) WHERE token_number IS NOT NULL")
    .run();
}

async function seedDatabase() {
  const db = getD1();
  const count = await db.prepare("SELECT COUNT(*) AS count FROM users").first<{
    count: number;
  }>();
  if (Number(count?.count ?? 0) === 0) {
    const superAdmin = await hashPassword("SuperAdmin@123");
    const admin = await hashPassword("Admin@123");
    const staff = await hashPassword("Staff@123");
    await db.batch([
      db
        .prepare(
          `INSERT INTO users (id, username, display_name, role, portal_role, password_hash, password_salt)
           VALUES (1, 'superadmin', 'Technical Administrator', 'admin', 'super_admin', ?, ?)`,
        )
        .bind(superAdmin.hash, superAdmin.salt),
      db
        .prepare(
          `INSERT INTO users (id, username, display_name, role, portal_role, password_hash, password_salt)
           VALUES (2, 'admin', 'Shop Administrator', 'admin', 'admin', ?, ?)`,
        )
        .bind(admin.hash, admin.salt),
      db
        .prepare(
          `INSERT INTO users (id, username, display_name, role, portal_role, password_hash, password_salt)
           VALUES (3, 'staff', 'Office Staff', 'staff', 'office_staff', ?, ?)`,
        )
        .bind(staff.hash, staff.salt),
    ]);
  }

  const currentAdmin = await db
    .prepare("SELECT id, username FROM users WHERE portal_role = 'super_admin' ORDER BY id LIMIT 1")
    .first<{ id: number; username: string }>();
  if (currentAdmin?.username === "admin") {
    const nameTaken = await db.prepare("SELECT id FROM users WHERE username = 'superadmin'").first();
    if (!nameTaken) {
      await db.prepare("UPDATE users SET username = 'superadmin' WHERE id = ?").bind(currentAdmin.id).run();
    }
  }
  const shopAdminExists = await db.prepare("SELECT id FROM users WHERE portal_role = 'admin' LIMIT 1").first();
  if (!shopAdminExists) {
    const shopAdmin = await hashPassword("Admin@123");
    await db.prepare(
      `INSERT INTO users (id, username, display_name, role, portal_role, password_hash, password_salt)
       VALUES (?, 'admin', 'Shop Administrator', 'admin', 'admin', ?, ?)`,
    ).bind(Date.now(), shopAdmin.hash, shopAdmin.salt).run();
  }

  await db.batch([
    db.prepare(
      `INSERT OR IGNORE INTO shop_settings
       (id, shop_name, shop_name_ar, address, phone, vat_number, commercial_number, invoice_prefix)
       VALUES (1, 'PEARL LAUNDRY', 'شركة بيرل بوليسر', 'Riyadh, Saudi Arabia', '', '314521232800003', '', 'PL')`,
    ),
    db.prepare(
      "INSERT OR IGNORE INTO categories (id, name, color, sort_order) VALUES (1, 'Bedding', '#2563eb', 1)",
    ),
    db.prepare(
      "INSERT OR IGNORE INTO categories (id, name, color, sort_order) VALUES (2, 'Clothing', '#7c3aed', 2)",
    ),
    db.prepare(
      "INSERT OR IGNORE INTO categories (id, name, color, sort_order) VALUES (3, 'Home', '#0f766e', 3)",
    ),
    db.prepare(
      "INSERT OR IGNORE INTO categories (id, name, color, sort_order) VALUES (4, 'Express', '#c2410c', 4)",
    ),
    db.prepare(
      "INSERT OR IGNORE INTO services (id, category_id, name, name_ar, sort_order) VALUES (1, 1, 'Bed Runner', 'مفرش سرير', 1)",
    ),
    db.prepare(
      "INSERT OR IGNORE INTO services (id, category_id, name, name_ar, sort_order) VALUES (2, 1, 'Bed Skirting', 'تنورة سرير', 2)",
    ),
    db.prepare(
      "INSERT OR IGNORE INTO services (id, category_id, name, name_ar, sort_order) VALUES (3, 2, 'Shirt', 'قميص', 1)",
    ),
    db.prepare(
      "INSERT OR IGNORE INTO services (id, category_id, name, name_ar, sort_order) VALUES (4, 2, 'Trousers', 'بنطال', 2)",
    ),
    db.prepare(
      "INSERT OR IGNORE INTO services (id, category_id, name, name_ar, sort_order) VALUES (5, 2, 'Belt', 'حزام', 3)",
    ),
    db.prepare(
      "INSERT OR IGNORE INTO services (id, category_id, name, name_ar, sort_order) VALUES (6, 3, 'Bath Mat', 'دعاسة حمام', 1)",
    ),
    db.prepare(
      "INSERT OR IGNORE INTO services (id, category_id, name, name_ar, sort_order) VALUES (7, 3, 'Curtain', 'ستارة', 2)",
    ),
    db.prepare(
      "INSERT OR IGNORE INTO services (id, category_id, name, name_ar, sort_order) VALUES (8, 4, 'Express Service', 'خدمة سريعة', 1)",
    ),
    ...[
      [1, 1.2],
      [2, 1.5],
      [3, 4],
      [4, 5],
      [5, 5],
      [6, 1],
      [7, 12],
      [8, 10],
    ].map(([serviceId, price], index) =>
      db
        .prepare(
          `INSERT OR IGNORE INTO service_prices
           (id, service_id, price, effective_from, created_by)
           VALUES (?, ?, ?, '2026-01-01T00:00:00+03:00', 1)`,
        )
        .bind(index + 1, serviceId, price),
    ),
  ]);
}

export async function ensureDatabase() {
  if (!initialization) {
    initialization = (async () => {
      const db = getD1();
      await db.batch(schemaStatements.map((statement) => db.prepare(statement)));
      await ensureCompatibilityColumns();
      await seedDatabase();
    })().catch((error) => {
      initialization = null;
      throw error;
    });
  }
  return initialization;
}
