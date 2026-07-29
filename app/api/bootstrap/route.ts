import { getD1 } from "../../../db";
import { requireSession } from "../../../lib/auth";
import { daysAgo, riyadhDate, route } from "../../../lib/api";
import { ensureDatabase } from "../../../lib/database";
import { getCatalog, getCustomers, getOrders } from "../../../lib/data";

export async function GET(request: Request) {
  return route(async () => {
    await ensureDatabase();
    const user = await requireSession(request);
    const db = getD1();
    const [shop, catalog, customers, recent, todaySummary] = await Promise.all([
      db
        .prepare(
          `SELECT shop_name AS shopName, shop_name_ar AS shopNameAr,
                  address, phone, email, vat_number AS vatNumber,
                  commercial_number AS commercialNumber,
                  invoice_prefix AS invoicePrefix,
                  receipt_footer AS receiptFooter
           FROM shop_settings WHERE id = 1`,
        )
        .first(),
      getCatalog(user.role === "admin"),
      getCustomers(user.role === "admin"),
      getOrders(user, {
        from: user.role === "admin" ? daysAgo(30) : daysAgo(2),
        to: riyadhDate(),
        pageSize: 25,
      }),
      db
        .prepare(
          `SELECT COUNT(*) AS orderCount,
                  COALESCE(SUM(total_amount), 0) AS grossSales,
                  COALESCE(SUM(amount_paid), 0) AS collected,
                  COALESCE(SUM(balance), 0) AS outstanding,
                  COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN amount_paid ELSE 0 END), 0) AS cashCollected,
                  COALESCE(SUM(CASE WHEN payment_method = 'card' THEN amount_paid ELSE 0 END), 0) AS cardCollected
           FROM orders WHERE order_date = ?`,
        )
        .bind(riyadhDate())
        .first(),
    ]);

    let admin:
      | {
          users: unknown[];
          grants: unknown[];
          categoryCount: number;
          serviceCount: number;
          customerCount: number;
        }
      | undefined;
    if (user.role === "admin") {
      const [users, grants, counts] = await Promise.all([
        db
          .prepare(
            `SELECT id, username, display_name AS displayName, role,
                    is_active AS isActive,
                    must_change_password AS mustChangePassword,
                    created_at AS createdAt
             FROM users ORDER BY role, display_name`,
          )
          .all<{
            id: number;
            username: string;
            displayName: string;
            role: "admin" | "staff";
            isActive: number;
            mustChangePassword: number;
            createdAt: string;
          }>(),
        db
          .prepare(
            `SELECT g.id, g.staff_user_id AS staffUserId, u.display_name AS staffName,
                    g.scope, g.from_date AS fromDate, g.to_date AS toDate,
                    g.expires_at AS expiresAt, g.created_at AS createdAt
             FROM permission_grants g JOIN users u ON u.id = g.staff_user_id
             ORDER BY g.id DESC LIMIT 100`,
          )
          .all(),
        db
          .prepare(
            `SELECT
               (SELECT COUNT(*) FROM categories) AS categoryCount,
               (SELECT COUNT(*) FROM services) AS serviceCount,
               (SELECT COUNT(*) FROM customers) AS customerCount`,
          )
          .first<{
            categoryCount: number;
            serviceCount: number;
            customerCount: number;
          }>(),
      ]);
      admin = {
        users: users.results.map((row) => ({
          ...row,
          isActive: Boolean(row.isActive),
          mustChangePassword: Boolean(row.mustChangePassword),
        })),
        grants: grants.results,
        categoryCount: Number(counts?.categoryCount ?? 0),
        serviceCount: Number(counts?.serviceCount ?? 0),
        customerCount: Number(counts?.customerCount ?? 0),
      };
    }

    return {
      user,
      shop,
      catalog,
      customers,
      recentOrders: recent.orders,
      reportRange: { from: recent.from, to: recent.to },
      reportTotal: recent.total,
      reportSummary: recent.summary,
      todaySummary,
      admin,
    };
  });
}
