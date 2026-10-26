import pg from 'pg';
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

class DatabaseManager {
  private pgPool: pg.Pool | null = null;
  private pglite: PGlite | null = null;
  private isInitialized = false;

  async init(): Promise<void> {
    if (this.isInitialized) return;

    const databaseUrl = process.env.DATABASE_URL;

    if (databaseUrl && databaseUrl.trim().length > 0) {
      try {
        console.log('[DB] Connecting to PostgreSQL via DATABASE_URL...');
        this.pgPool = new pg.Pool({
          connectionString: databaseUrl,
          ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
        });

        // Test connection
        const client = await this.pgPool.connect();
        client.release();
        console.log('[DB] Connected to PostgreSQL successfully.');
      } catch (err) {
        console.warn('[DB] Failed to connect to external PostgreSQL, falling back to embedded PGlite:', err);
        this.pgPool = null;
      }
    }

    if (!this.pgPool) {
      console.log('[DB] Initializing embedded PostgreSQL (PGlite)...');
      const dataDir = path.resolve(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      this.pglite = new PGlite(path.join(dataDir, 'bharatchat_pg'));
      console.log('[DB] Embedded PostgreSQL initialized at:', path.join(dataDir, 'bharatchat_pg'));
    }

    await this.runMigrations();
    this.isInitialized = true;
  }

  async runMigrations(): Promise<void> {
    let schemaPath = path.resolve(__dirname, 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      schemaPath = path.resolve(process.cwd(), 'src', 'db', 'schema.sql');
    }
    if (!fs.existsSync(schemaPath)) {
      schemaPath = path.resolve(process.cwd(), 'dist', 'db', 'schema.sql');
    }

    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf8');
      await this.executeRaw(sql);
      console.log('[DB] Schema migrations executed successfully.');
    } else {
      console.warn('[DB] Schema file not found at:', schemaPath);
    }
  }

  async executeRaw(sql: string): Promise<void> {
    if (this.pgPool) {
      await this.pgPool.query(sql);
    } else if (this.pglite) {
      await this.pglite.exec(sql);
    } else {
      throw new Error('[DB] Database not initialized');
    }
  }

  async query<T = any>(text: string, params: any[] = []): Promise<QueryResult<T>> {
    if (!this.isInitialized) {
      await this.init();
    }

    if (this.pgPool) {
      const res = await this.pgPool.query(text, params);
      return {
        rows: res.rows as T[],
        rowCount: res.rowCount ?? 0,
      };
    } else if (this.pglite) {
      // PGlite query
      const res = await this.pglite.query<T>(text, params);
      return {
        rows: res.rows,
        rowCount: res.rows.length,
      };
    } else {
      throw new Error('[DB] Database is not available');
    }
  }

  async close(): Promise<void> {
    if (this.pgPool) {
      await this.pgPool.end();
      this.pgPool = null;
    }
    if (this.pglite) {
      await this.pglite.close();
      this.pglite = null;
    }
    this.isInitialized = false;
  }
}

export const db = new DatabaseManager();
