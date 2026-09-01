import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => {
  const run = vi.fn().mockResolvedValue({ meta: { changes: 2 } });
  const bind = vi.fn(() => ({ run }));
  const prepare = vi.fn(() => ({ bind }));
  return { run, bind, prepare };
});

vi.mock("../db", () => ({ getD1: () => ({ prepare: database.prepare }) }));

import { notifyAdmins } from "../lib/notifications";

describe("admin activity notifications", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates one durable notification for every active admin except the actor", async () => {
    await notifyAdmins({
      actorUserId: 31,
      eventType: "order_payment_updated",
      title: "Payment updated · T-260901-0001",
      message: "Office Staff changed PL-000005 from unpaid to paid using card · STC.",
      resourceType: "order",
      resourceId: 9001,
    });

    expect(database.prepare).toHaveBeenCalledWith(expect.stringContaining("WHERE role = 'admin' AND is_active = 1 AND id <> ?"));
    expect(database.bind).toHaveBeenCalledWith(
      31,
      "order_payment_updated",
      "Payment updated · T-260901-0001",
      "Office Staff changed PL-000005 from unpaid to paid using card · STC.",
      "order",
      "9001",
      31,
    );
    expect(database.run).toHaveBeenCalledOnce();
  });

  it("bounds user-visible fields before persistence", async () => {
    await notifyAdmins({
      actorUserId: 7,
      eventType: "e".repeat(100),
      title: "t".repeat(200),
      message: "m".repeat(700),
    });

    const values = database.bind.mock.calls[0] as unknown[];
    expect(values[1]).toHaveLength(60);
    expect(values[2]).toHaveLength(160);
    expect(values[3]).toHaveLength(500);
  });
});
