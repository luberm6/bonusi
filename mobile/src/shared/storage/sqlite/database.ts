import { OFFLINE_SQLITE_SCHEMA } from "./schema";

export interface SqliteExecutor {
  run(sql: string, params?: unknown[]): Promise<void>;
  all<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
}

export async function bootstrapOfflineSchema(db: SqliteExecutor): Promise<void> {
  const statements = OFFLINE_SQLITE_SCHEMA.split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const statement of statements) {
    await db.run(`${statement};`);
  }
}

// React Native adapter contract (expo-sqlite / react-native-sqlite-storage).
// Real project integration should provide implementation and pass it to repositories.
