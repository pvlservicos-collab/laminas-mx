import { NextRequest, NextResponse } from "next/server";
import { validateAdminRequest } from "@/lib/adminAuth";
import { getConfig, saveConfig } from "@/lib/config";

export async function GET(req: NextRequest) {
  if (!validateAdminRequest(req)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const config = await getConfig();
  return NextResponse.json(config);
}

export async function POST(req: NextRequest) {
  if (!validateAdminRequest(req)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  let body: Record<string, string>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }
  await saveConfig(body);
  return NextResponse.json({ ok: true });
}
