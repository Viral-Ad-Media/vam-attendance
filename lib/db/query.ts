/* eslint-disable @typescript-eslint/no-explicit-any */
// Server-only SQL query builder for the application's existing data-access shapes.
// Identifiers are validated; all values use PostgreSQL bind parameters.
export type Row = Record<string, any>;
export type DbError = { code?: string; message: string };
export type DbResult<T = Row[]> =
  | { data: T; error: null; count?: number }
  | { data: null; error: DbError; count?: number };
export type Executor = (
  sql: string,
  values: unknown[],
) => Promise<{ rows: Row[]; rowCount?: number | null }>;
export const tables = new Set([
  "organizations",
  "memberships",
  "invites",
  "subscriptions",
  "audit_logs",
  "users",
  "teachers",
  "students",
  "courses",
  "sessions",
  "enrollments",
  "attendance",
  "student_feedback",
  "student_feedback_requests",
]);
export function identifier(value: string): string {
  if (!/^[a-z_][a-z0-9_]*$/i.test(value))
    throw new Error("Invalid SQL identifier");
  return `"${value}"`;
}
export class Query implements PromiseLike<DbResult> {
  private mode = "select";
  private fields = "*";
  private returning = false;
  private records: Row[] = [];
  private filters: Array<{ column: string; op: string; value: unknown }> = [];
  private orders: string[] = [];
  private max?: number;
  private offset = 0;
  private conflict?: { onConflict?: string; ignoreDuplicates?: boolean };
  private result?: Promise<DbResult>;
  constructor(
    private table: string,
    private execute: Executor,
  ) {
    if (!tables.has(table)) throw new Error("Unknown application table");
  }
  select(fields = "*") {
    this.fields = fields;
    this.returning = true;
    return this;
  }
  insert(rows: Row | Row[]) {
    this.mode = "insert";
    this.records = Array.isArray(rows) ? rows : [rows];
    return this;
  }
  upsert(
    rows: Row | Row[],
    options: { onConflict?: string; ignoreDuplicates?: boolean } = {},
  ) {
    this.insert(rows);
    this.conflict = options;
    return this;
  }
  update(row: Row) {
    this.mode = "update";
    this.records = [row];
    return this;
  }
  delete() {
    this.mode = "delete";
    return this;
  }
  eq(column: string, value: unknown) {
    return this.filter(column, "=", value);
  }
  neq(column: string, value: unknown) {
    return this.filter(column, "<>", value);
  }
  in(column: string, value: unknown[]) {
    return this.filter(column, "IN", value);
  }
  is(column: string, value: null | boolean) {
    return this.filter(column, "IS", value);
  }
  gte(column: string, value: unknown) {
    return this.filter(column, ">=", value);
  }
  lte(column: string, value: unknown) {
    return this.filter(column, "<=", value);
  }
  lt(column: string, value: unknown) {
    return this.filter(column, "<", value);
  }
  gt(column: string, value: unknown) {
    return this.filter(column, ">", value);
  }
  ilike(column: string, value: unknown) {
    return this.filter(column, "ILIKE", value);
  }
  private filter(column: string, op: string, value: unknown) {
    identifier(column);
    this.filters.push({ column, op, value });
    return this;
  }
  order(column: string, options?: { ascending?: boolean }) {
    this.orders.push(
      `${identifier(column)} ${options?.ascending === false ? "DESC" : "ASC"}`,
    );
    return this;
  }
  limit(count: number) {
    if (!Number.isInteger(count) || count < 0) throw new Error("Invalid limit");
    this.max = count;
    return this;
  }
  range(start: number, end: number) {
    this.offset = start;
    return this.limit(end - start + 1);
  }
  async single<T = Row>(): Promise<DbResult<T>> {
    const result = await this.run();
    if (result.error) return { data: null, error: result.error };
    if (result.data?.length !== 1)
      return {
        data: null,
        error: { code: "PGRST116", message: "Expected one record" },
      };
    return { ...result, data: result.data[0] as T };
  }
  async maybeSingle<T = Row>(): Promise<DbResult<T | null>> {
    const result = await this.run();
    if (result.error) return { data: null, error: result.error };
    if (result.data?.length > 1)
      return {
        data: null,
        error: { code: "PGRST116", message: "Expected at most one record" },
      };
    return { ...result, data: (result.data?.[0] as T) ?? null };
  }
  then<TResult1 = DbResult, TResult2 = never>(
    onfulfilled?:
      | ((value: DbResult) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.run().then(onfulfilled, onrejected);
  }
  private run(): Promise<DbResult> {
    return (this.result ??= this.perform());
  }
  private async perform(): Promise<DbResult> {
    try {
      const args: unknown[] = [];
      const bind = (value: unknown) => {
        args.push(value);
        return `$${args.length}`;
      };
      const table = identifier(this.table);
      const alias = this.mode === "select" ? "t." : "";
      const where = this.filters.map(({ column, op, value }) => {
        const key = `${alias}${identifier(column)}`;
        if (op === "IN") {
          const list = value as unknown[];
          return list.length
            ? `${key} IN (${list.map(bind).join(",")})`
            : "FALSE";
        }
        if (op === "IS")
          return `${key} IS ${value === null ? "NULL" : value ? "TRUE" : "FALSE"}`;
        return `${key} ${op} ${bind(value)}`;
      });
      let sql: string;
      const conditions = where.length ? ` WHERE ${where.join(" AND ")}` : "";
      if (this.mode === "select") {
        // Only the two embedded relationships used in server handlers are allowed.
        if (this.fields === "session_id, sessions!inner(teacher_id)") {
          sql = `SELECT t.session_id, jsonb_build_object('teacher_id', s.teacher_id) AS sessions FROM public.${table} t JOIN public.sessions s ON s.id=t.session_id AND s.org_id=t.org_id${conditions}`;
        } else if (
          this.fields ===
          "student_id, students(id, name, email, program, class_name)"
        ) {
          sql = `SELECT t.student_id, (SELECT jsonb_build_object('id',s.id,'name',s.name,'email',s.email,'program',s.program,'class_name',s.class_name) FROM public.students s WHERE s.id=t.student_id AND s.org_id=t.org_id) AS students FROM public.${table} t${conditions}`;
        } else {
          const fields = this.fields
            .split(",")
            .map((f) => f.trim())
            .filter(Boolean);
          const selection = fields.includes("*")
            ? "t.*"
            : fields.map((f) => `t.${identifier(f)}`).join(",");
          sql = `SELECT ${selection} FROM public.${table} t${conditions}`;
        }
        if (this.orders.length) sql += ` ORDER BY ${this.orders.join(",")}`;
        if (this.max !== undefined) sql += ` LIMIT ${bind(this.max)}`;
        if (this.offset) sql += ` OFFSET ${bind(this.offset)}`;
      } else {
        if (this.mode === "insert") {
          if (!this.records.length) return { data: [], error: null };
          const keys = [
            ...new Set(
              this.records.flatMap((r) =>
                Object.keys(r).filter((k) => r[k] !== undefined),
              ),
            ),
          ];
          if (!keys.length) throw new Error("Empty insert");
          sql =
            `INSERT INTO public.${table} (${keys.map(identifier).join(",")}) VALUES ` +
            this.records
              .map(
                (r) =>
                  `(${keys.map((key) => (r[key] === undefined ? "DEFAULT" : bind(r[key]))).join(",")})`,
              )
              .join(",");
          if (this.conflict) {
            const targets = (this.conflict.onConflict ?? "id")
              .split(",")
              .map((x) => x.trim());
            const updates = keys.filter((k) => !targets.includes(k));
            sql +=
              ` ON CONFLICT (${targets.map(identifier).join(",")}) DO ` +
              (this.conflict.ignoreDuplicates || !updates.length
                ? "NOTHING"
                : `UPDATE SET ${updates.map((key) => `${identifier(key)}=EXCLUDED.${identifier(key)}`).join(",")}`);
          }
        } else if (this.mode === "update") {
          const keys = Object.keys(this.records[0]).filter(
            (key) => this.records[0][key] !== undefined,
          );
          if (!keys.length) throw new Error("Empty update");
          // WHERE parameters were bound first; bind update values afterwards.
          sql = `UPDATE public.${table} SET ${keys.map((key) => `${identifier(key)}=${bind(this.records[0][key])}`).join(",")}${conditions}`;
        } else sql = `DELETE FROM public.${table}${conditions}`;
        if (!where.length && this.mode !== "insert")
          throw new Error("Unfiltered mutation refused");
        if (this.returning) {
          const fields = this.fields.split(",").map((f) => f.trim());
          sql +=
            " RETURNING " +
            (fields.includes("*") ? "*" : fields.map(identifier).join(","));
        }
      }
      const result = await this.execute(sql, args);
      return {
        data:
          this.mode === "select" || this.returning
            ? JSON.parse(JSON.stringify(result.rows))
            : [],
        error: null,
        count: result.rowCount ?? result.rows.length,
      };
    } catch (error) {
      const e = error as { code?: string; message?: string };
      return {
        data: null,
        error: {
          code: e.code,
          message: e.message ?? "Database operation failed",
        },
      };
    }
  }
}
export class DatabaseClient {
  constructor(private execute: Executor) {}
  from(table: string) {
    return new Query(table, this.execute);
  }
}
