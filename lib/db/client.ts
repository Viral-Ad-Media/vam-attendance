import { getPool } from "./pool";
import { DatabaseClient } from "./query";

// Each query has an independent transaction; identity/role cannot leak via pooling.
export function createDatabaseClient(userId?: string) {
  return new DatabaseClient(async (sql, values) => {
    const connection = await getPool().connect();
    try {
      await connection.query("BEGIN");
      if (userId) {
        await connection.query("SET LOCAL ROLE authenticated");
        await connection.query("SELECT set_config('app.user_id', $1, true)", [
          userId,
        ]);
      }
      const result = await connection.query(sql, values);
      await connection.query("COMMIT");
      return result;
    } catch (error) {
      await connection.query("ROLLBACK");
      throw error;
    } finally {
      connection.release();
    }
  });
}
