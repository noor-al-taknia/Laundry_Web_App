import { getD1 } from "../db";
import { hashPassword } from "./crypto";

let initialization: Promise<void> | null = null;

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin','staff')),
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    must_change_password INTEGER NOT NULL DEFAULT 1,
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
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL DEFAULT '',
    customer_email TEXT NOT NULL DEFAULT '',
    customer_address TEXT NOT NULL DEFAULT '',
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    order_date TEXT NOT NULL,
    supply_date TEXT NOT NULL,
    payment_method TEXT NOT NULL CHECK(payment_method IN ('cash','card')),
    payment_status TEXT NOT NULL CHECK(payment_status IN ('paid','unpaid','partial')),
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
  "CREATE INDEX IF NOT EXISTS categories_active_sort_idx ON categories(is_active, sort_order)",
  "CREATE INDEX IF NOT EXISTS services_category_active_idx ON services(category_id, is_active, sort_order)",
  "CREATE INDEX IF NOT EXISTS service_prices_current_idx ON service_prices(service_id, effective_from, effective_to)",
  "CREATE INDEX IF NOT EXISTS customers_name_idx ON customers(name)",
  "CREATE INDEX IF NOT EXISTS customers_phone_idx ON customers(phone)",
  "CREATE INDEX IF NOT EXISTS orders_date_idx ON orders(order_date)",
  "CREATE INDEX IF NOT EXISTS orders_customer_idx ON orders(customer_id)",
  "CREATE INDEX IF NOT EXISTS orders_status_method_idx ON orders(payment_status, payment_method)",
  "CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items(order_id)",
  "CREATE INDEX IF NOT EXISTS order_events_order_idx ON order_events(order_id)",
  "CREATE INDEX IF NOT EXISTS permission_staff_scope_idx ON permission_grants(staff_user_id, scope, from_date, to_date)",
];

async function seedDatabase() {
  const db = getD1();
  const count = await db.prepare("SELECT COUNT(*) AS count FROM users").first<{
    count: number;
  }>();
  if (Number(count?.count ?? 0) === 0) {
    const admin = await hashPassword("Admin@123");
    const staff = await hashPassword("Staff@123");
    await db.batch([
      db
        .prepare(
          `INSERT INTO users (id, username, display_name, role, password_hash, password_salt)
           VALUES (1, 'admin', 'Shop Administrator', 'admin', ?, ?)`,
        )
        .bind(admin.hash, admin.salt),
      db
        .prepare(
          `INSERT INTO users (id, username, display_name, role, password_hash, password_salt)
           VALUES (2, 'staff', 'Billing Staff', 'staff', ?, ?)`,
        )
        .bind(staff.hash, staff.salt),
    ]);
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
      await seedDatabase();
    })().catch((error) => {
      initialization = null;
      throw error;
    });
  }
  return initialization;
}
