import { NextRequest, NextResponse } from "next/server";
import { validateAdminRequest } from "@/lib/adminAuth";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  if (!validateAdminRequest(req)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const results: Record<string, { ok: boolean; detail?: string }> = {};

  // DATABASE_URL
  try {
    const sql = getDb();
    await sql`SELECT 1`;
    results.DATABASE_URL = { ok: true };
  } catch (e) {
    results.DATABASE_URL = { ok: false, detail: e instanceof Error ? e.message : String(e) };
  }

  // BLOB_READ_WRITE_TOKEN
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    results.BLOB_READ_WRITE_TOKEN = { ok: true };
  } else {
    results.BLOB_READ_WRITE_TOKEN = { ok: false, detail: "Variável não configurada" };
  }

  // OPENAI_API_KEY
  if (!process.env.OPENAI_API_KEY) {
    results.OPENAI_API_KEY = { ok: false, detail: "Variável não configurada" };
  } else {
    try {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      });
      if (res.ok) {
        results.OPENAI_API_KEY = { ok: true };
      } else {
        results.OPENAI_API_KEY = { ok: false, detail: `Status ${res.status}` };
      }
    } catch (e) {
      results.OPENAI_API_KEY = { ok: false, detail: e instanceof Error ? e.message : String(e) };
    }
  }

  return NextResponse.json(results);
}
