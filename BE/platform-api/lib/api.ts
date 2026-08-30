export function json(data: unknown, status = 200, headers?: HeadersInit) {
  return Response.json(data, {
    status,
    headers: {
      "cache-control": "no-store",
      ...headers,
    },
  });
}

export async function payload<T>(request: Request) {
  try {
    return (await request.json()) as T;
  } catch {
    throw new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
}

export function textValue(value: unknown, max = 200) {
  return String(value ?? "").trim().slice(0, max);
}

export function positiveNumber(value: unknown, field: string) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new Response(JSON.stringify({ error: `${field} must be positive` }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  return number;
}

export function money(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function riyadhDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function riyadhIso(date = new Date()) {
  const local = new Date(date.getTime() + 3 * 60 * 60_000)
    .toISOString()
    .slice(0, 19);
  return `${local}+03:00`;
}

export function daysAgo(days: number) {
  return riyadhDate(new Date(Date.now() - days * 86_400_000));
}

export function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    throw new Response(JSON.stringify({ error: "Cross-origin request denied" }), {
      status: 403,
      headers: { "content-type": "application/json" },
    });
  }
}

export async function route<T>(handler: () => Promise<T | Response>) {
  try {
    const result = await handler();
    return result instanceof Response ? result : json(result);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Unexpected server error";
    if (message.includes("UNIQUE constraint failed")) {
      return json(
        { error: "A record with the same unique value already exists." },
        409,
      );
    }
    if (
      message.includes("FOREIGN KEY constraint failed") ||
      message.includes("CHECK constraint failed")
    ) {
      return json({ error: "The data violates a relationship or rule." }, 400);
    }
    return json(
      { error: message },
      500,
    );
  }
}
