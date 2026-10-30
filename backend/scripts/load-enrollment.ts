import { randomUUID } from "node:crypto";
import { config } from "dotenv";

config();

const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) throw new Error("TEST_DATABASE_URL is required");
const parsed = new URL(testUrl);
if (
  !["localhost", "127.0.0.1"].includes(parsed.hostname) ||
  !parsed.pathname.endsWith("_test") ||
  testUrl === process.env.DATABASE_URL
) {
  throw new Error("Load test requires an isolated local _test database");
}

process.env.DATABASE_URL = testUrl;
process.env.NODE_ENV = "test";

const [
  { app },
  { pool },
  { createTestAuthCookie },
  { insertTestClass, insertTestUser },
] = await Promise.all([
  import("../src/app.js"),
  import("../src/database/pool.js"),
  import("../tests/helpers/auth-cookie.js"),
  import("../tests/helpers/test-data.js"),
]);

const attempts = 50;
const capacity = 10;
const runId = randomUUID();
const userIds: string[] = [];
let classId: string | undefined;
const server = app.listen(0);

try {
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("HTTP server did not bind");
  const url = `http://127.0.0.1:${address.port}`;
  const adminId = await insertTestUser(pool, {
    name: "Load Test Admin",
    email: `load-admin-${runId}@example.com`,
    role: "admin",
  });
  userIds.push(adminId);
  classId = await insertTestClass(pool, {
    ownerId: adminId,
    title: `Load Test ${runId}`,
    maxStudents: capacity,
  });
  for (let index = 0; index < attempts; index += 1) {
    userIds.push(
      await insertTestUser(pool, {
        name: `Load Test User ${index}`,
        email: `load-${runId}-${index}@example.com`,
      }),
    );
  }

  const startedAt = performance.now();
  const results = await Promise.all(
    userIds.slice(1).map(async (userId) => {
      const requestStartedAt = performance.now();
      const response = await fetch(
        `${url}/api/classes/${classId}/enrollments`,
        {
          method: "POST",
          headers: { Cookie: createTestAuthCookie(userId) },
        },
      );
      return {
        status: response.status,
        durationMs: performance.now() - requestStartedAt,
      };
    }),
  );
  const elapsedSeconds = (performance.now() - startedAt) / 1_000;
  const latencies = results
    .map((result) => result.durationMs)
    .sort((a, b) => a - b);
  const successful = results.filter((result) => result.status === 201).length;
  const full = results.filter((result) => result.status === 409).length;
  const enrolled = await pool.query<{ count: number }>(
    "SELECT COUNT(*)::integer AS count FROM enrollments WHERE class_id = $1",
    [classId],
  );
  const summary = {
    attempts,
    capacity,
    successful,
    full,
    enrolled: enrolled.rows[0]?.count,
    rps: Number((attempts / elapsedSeconds).toFixed(1)),
    p95Ms: Number(latencies[Math.ceil(attempts * 0.95) - 1]?.toFixed(1)),
  };
  console.log(JSON.stringify(summary));
  if (
    successful !== capacity ||
    full !== attempts - capacity ||
    summary.enrolled !== capacity
  ) {
    throw new Error("Capacity invariant or expected HTTP outcomes failed");
  }
} finally {
  if (classId) await pool.query("DELETE FROM classes WHERE id = $1", [classId]);
  await pool.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [userIds]);
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  await pool.end();
}
