import { pool } from "../src/database/pool.js";

type DatabaseInfo = {
  database_name: string;
  database_user: string;
  server_version: string;
};

try {
  const result = await pool.query<DatabaseInfo>(`
    SELECT
      current_database() AS database_name,
      current_user AS database_user,
      current_setting('server_version') AS server_version
  `);
  const info = result.rows[0];
  if (!info) throw new Error("Database returned no connection metadata");

  console.log("PostgreSQL connected");
  console.log(`Database: ${info.database_name}`);
  console.log(`User: ${info.database_user}`);
  console.log(`Server version: ${info.server_version}`);
} catch (error) {
  console.error("PostgreSQL connection failed", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
