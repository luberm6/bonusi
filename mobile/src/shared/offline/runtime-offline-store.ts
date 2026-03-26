import { SqliteOfflineStore } from "./sqlite-offline-store";
import { bootstrapOfflineSchema } from "../storage/sqlite/database";
import { createRnSqliteExecutor } from "../storage/sqlite/rn-sqlite-executor";

type ExpoLikeDb = {
  runAsync?: (sql: string, params?: unknown[]) => Promise<unknown>;
  getAllAsync?: <T = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<T[]>;
};

export async function createRuntimeOfflineStore(db: ExpoLikeDb): Promise<SqliteOfflineStore> {
  const executor = createRnSqliteExecutor(db);
  await bootstrapOfflineSchema(executor);
  return new SqliteOfflineStore(executor);
}
