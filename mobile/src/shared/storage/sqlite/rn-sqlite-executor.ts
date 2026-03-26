import type { SqliteExecutor } from "./database";

type ExpoLikeDb = {
  runAsync?: (sql: string, params?: unknown[]) => Promise<unknown>;
  getAllAsync?: <T = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<T[]>;
  execAsync?: (sql: string) => Promise<unknown>;
};

export function createRnSqliteExecutor(db: ExpoLikeDb): SqliteExecutor {
  if (typeof db.runAsync !== "function" || typeof db.getAllAsync !== "function") {
    throw new Error("SQLite adapter requires runAsync and getAllAsync methods");
  }

  return {
    async run(sql: string, params?: unknown[]): Promise<void> {
      await db.runAsync!(sql, params ?? []);
    },
    async all<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]> {
      return db.getAllAsync!(sql, params ?? []) as Promise<T[]>;
    }
  };
}
