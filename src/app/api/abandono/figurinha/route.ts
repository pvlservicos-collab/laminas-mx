import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const maxDuration = 15;

const REC_VENDAS_URL = "https://webhook.folemmidia.com/webhook/rec-vendas";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let _colsMigrated = false;
async function ensureCols() {
  if (_colsMigrated) return;
  const sql = getDb();
  await sql`ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS abandoned_at TIMESTAMPTZ`.catch(() => {});
  await sql`ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS recovery_whatsapp_sent_at TIMESTAMPTZ`.catch(() => {});
  await sql`ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS rec_vendas_sent_at TIMESTAMPTZ`.catch(() => {});
  _colsMigrated = true;
}

async function dispararRecVendas(payload: Record<string, unknown>) {
  try {
    await fetch(REC_VENDAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // silencia — não bloqueia a resposta
  }
}

// POST { email, stickerId? }      → registra abandono + dispara webhook
// POST { email, _cancel: true }   → usuário voltou, cancela abandono
export async function POST(req: NextRequest) {
  let body: { email?: string; stickerId?: string; _cancel?: boolean };
  try { body = await req.json(); } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const emailSafe = body.email?.trim().toLowerCase().slice(0, 255);
  if (!emailSafe || !EMAIL_REGEX.test(emailSafe)) return NextResponse.json({ ok: false }, { status: 400 });

  await ensureCols();
  const sql = getDb();

  if (body._cancel) {
    await sql`
      UPDATE pedidos SET abandoned_at = NULL
      WHERE email = ${emailSafe}
        AND recovery_whatsapp_sent_at IS NULL
        AND abandoned_at IS NOT NULL
    `.catch(() => {});
    return NextResponse.json({ ok: true, action: "cancelled" });
  }

  // Busca pedido elegível (não pago, figurinha pronta, rec-vendas ainda não disparado)
  const rows = await sql`
    SELECT id, nome, email, sticker_id, sticker_url, preview_url
    FROM pedidos
    WHERE email = ${emailSafe}
      AND status NOT IN ('pago', 'entregue', 'recuperado')
      AND sticker_url IS NOT NULL
      AND rec_vendas_sent_at IS NULL
      ${body.stickerId ? sql`AND sticker_id = ${body.stickerId}` : sql``}
    ORDER BY created_at DESC
    LIMIT 1
  `.catch(() => []);

  if (rows.length === 0) {
    await sql`
      UPDATE pedidos SET abandoned_at = NOW()
      WHERE id = (
        SELECT id FROM pedidos
        WHERE email = ${emailSafe}
          AND recovery_whatsapp_sent_at IS NULL
          ${body.stickerId ? sql`AND sticker_id = ${body.stickerId}` : sql``}
        ORDER BY created_at DESC LIMIT 1
      )
    `.catch(() => {});
    return NextResponse.json({ ok: true, action: "recorded_no_webhook" });
  }

  const { id, nome, email, sticker_id, sticker_url, preview_url } = rows[0];

  await sql`
    UPDATE pedidos
    SET abandoned_at = NOW(), rec_vendas_sent_at = NOW()
    WHERE id = ${id}
  `.catch(() => {});

  dispararRecVendas({
    event: "preview_abandono",
    email: emailSafe,
    nome: nome || null,
    email_db: email || null,
    sticker_id: sticker_id || body.stickerId || null,
    sticker_url: sticker_url || null,
    preview_url: preview_url || sticker_url || null,
  });

  console.log(`Abandono preview — email=${emailSafe}, webhook rec-vendas disparado`);
  return NextResponse.json({ ok: true, action: "recorded" });
}
