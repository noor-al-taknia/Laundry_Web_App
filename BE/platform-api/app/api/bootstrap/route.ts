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
    const [shop, catalog, customers, recent, todaySummary, staffUsers] = await Promise.all([
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
      db.prepare(
        `SELECT id, username, display_name AS displayName, phone, role, portal_role AS portalRole,
                is_active AS isActive, must_change_password AS mustChangePassword
         FROM users WHERE role = 'staff' AND is_active = 1 ORDER BY display_name`,
      ).all(),
    ]);

    let admin:
      | {
          users: unknown[];
          grants: unknown[];
          categoryCount: number;
          serviceCount: number;
          customerCount: number;
          permissionRequests: unknown[];
          passwordResetRequests: unknown[];
          staffDebts: unknown[];
        }
      | undefined;
    if (user.role === "admin") {
      const [users, grants, counts, permissionRequests, staffDebts, passwordResetRequests] = await Promise.all([
        db
          .prepare(
            `SELECT id, username, display_name AS displayName, role,
                    portal_role AS portalRole,
                    is_active AS isActive,
                    must_change_password AS mustChangePassword,
                    phone, passport_number AS passportNumber, passport_expiry AS passportExpiry,
                    visa_status AS visaStatus, visa_expiry AS visaExpiry,
                    iqama_number AS iqamaNumber, iqama_expiry AS iqamaExpiry,
                    created_at AS createdAt
             FROM users ORDER BY role, display_name`,
          )
          .all<{
            id: number;
            username: string;
            displayName: string;
            role: "admin" | "staff";
            portalRole: "super_admin" | "admin" | "office_staff";
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
        db.prepare(
          `SELECT p.id, p.staff_user_id AS staffUserId, u.display_name AS staffName,
                  p.task, p.resource_type AS resourceType, p.resource_id AS resourceId,
                  p.reason, p.status, reviewer.display_name AS reviewedByName,
                  p.reviewed_at AS reviewedAt, p.expires_at AS expiresAt,
                  p.created_at AS createdAt
           FROM permission_requests p JOIN users u ON u.id = p.staff_user_id
           LEFT JOIN users reviewer ON reviewer.id = p.reviewed_by
           ORDER BY CASE p.status WHEN 'pending' THEN 0 ELSE 1 END, p.created_at DESC
           LIMIT 100`,
        ).all(),
        db.prepare(
          `SELECT d.id, d.staff_user_id AS staffUserId, u.display_name AS staffName,
                  d.order_id AS orderId, o.token_number AS tokenNumber,
                  o.invoice_number AS invoiceNumber, d.original_amount AS originalAmount,
                  d.outstanding_amount AS outstandingAmount, d.status, d.notes,
                  d.created_at AS createdAt, d.settled_at AS settledAt
           FROM staff_debts d JOIN users u ON u.id = d.staff_user_id
           JOIN orders o ON o.id = d.order_id
           ORDER BY CASE d.status WHEN 'open' THEN 0 ELSE 1 END, d.created_at DESC LIMIT 500`,
        ).all(),
        db.prepare(
          `SELECT r.id, r.user_id AS userId, u.username, u.display_name AS displayName,
                  r.status, r.requested_at AS requestedAt, r.completed_at AS completedAt
           FROM password_reset_requests r JOIN users u ON u.id = r.user_id
           ORDER BY CASE r.status WHEN 'pending' THEN 0 ELSE 1 END, r.requested_at DESC
           LIMIT 100`,
        ).all(),
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
        permissionRequests: permissionRequests.results,
        passwordResetRequests: passwordResetRequests.results,
        staffDebts: staffDebts.results,
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
      staffUsers: staffUsers.results.map((row) => ({ ...row, isActive: Boolean(row.isActive), mustChangePassword: Boolean(row.mustChangePassword) })),
      admin,
    };
  });
}
