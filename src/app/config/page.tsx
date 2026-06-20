"use client";

import { useState, useEffect } from "react";
import { SESSION_COOKIE } from "@/lib/adminAuth";

interface SiteConfig {
  locale: string;
  currency: string;
  price: string;
  checkoutUrl: string;
  firstButtonText: string;
  purchaseButtonText: string;
}

interface CheckResult {
  ok: boolean;
  detail?: string;
}

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=${60 * 60 * 24 * 7}`;
}

export default function ConfigPage() {
  const [authed, setAuthed]     = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [token, setToken]       = useState("");
  const [authError, setAuthError] = useState("");

  const [tab, setTab]           = useState<"config" | "check">("config");
  const [cfg, setCfg]           = useState<SiteConfig | null>(null);
  const [saving, setSaving]     = useState(false);
  const [saveMsg, setSaveMsg]   = useState("");

  const [checking, setChecking] = useState(false);
  const [checkResults, setCheckResults] = useState<Record<string, CheckResult> | null>(null);

  useEffect(() => {
    fetch("/api/config")
      .then(r => { if (r.ok) { setAuthed(true); return r.json(); } throw new Error("401"); })
      .then(data => setCfg(data))
      .catch(() => setAuthed(false))
      .finally(() => setAuthLoading(false));
  }, []);

  const handleLogin = () => {
    setCookie(SESSION_COOKIE, token);
    fetch("/api/config", { credentials: "include" })
      .then(r => { if (r.ok) { setAuthed(true); return r.json(); } throw new Error(); })
      .then(data => { setCfg(data); setAuthError(""); })
      .catch(() => { setAuthError("Token inválido"); document.cookie = `${SESSION_COOKIE}=; max-age=0; path=/`; });
  };

  const handleSave = async () => {
    if (!cfg) return;
    setSaving(true);
    setSaveMsg("");
    try {
      const r = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cfg),
      });
      setSaveMsg(r.ok ? "✅ Salvo com sucesso!" : "❌ Erro ao salvar");
    } catch {
      setSaveMsg("❌ Erro ao salvar");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(""), 4000);
    }
  };

  const handleCheck = async () => {
    setChecking(true);
    setCheckResults(null);
    try {
      const r = await fetch("/api/config/check");
      setCheckResults(await r.json());
    } catch {
      setCheckResults({ error: { ok: false, detail: "Falha na requisição" } });
    } finally {
      setChecking(false);
    }
  };

  const s: React.CSSProperties = {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    minHeight: "100vh",
    background: "#f0fdf4",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  };

  if (authLoading) {
    return <div style={s}><p style={{ color: "#64748b" }}>Carregando...</p></div>;
  }

  if (!authed) {
    return (
      <div style={s}>
        <div style={{ background: "#fff", borderRadius: 16, padding: 32, width: "100%", maxWidth: 360, boxShadow: "0 4px 24px rgba(0,0,0,.1)" }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#004030", marginBottom: 8 }}>Configuração</h1>
          <p style={{ color: "#64748b", fontSize: 13, marginBottom: 20 }}>Insira o ADMIN_TOKEN para acessar.</p>
          <input
            type="password"
            value={token}
            onChange={e => setToken(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            placeholder="Token de acesso"
            style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 14px", fontSize: 14, marginBottom: 12, boxSizing: "border-box" }}
          />
          {authError && <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 10 }}>{authError}</p>}
          <button onClick={handleLogin} style={{ width: "100%", background: "#006847", color: "#fff", border: "none", borderRadius: 8, padding: "11px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            Entrar
          </button>
        </div>
      </div>
    );
  }

  const fields: { key: keyof SiteConfig; label: string; hint: string }[] = [
    { key: "locale",              label: "Locale",                hint: "ex: es-MX, pt-BR" },
    { key: "currency",            label: "Moeda (currency)",      hint: "ex: MXN, BRL" },
    { key: "price",               label: "Preço exibido",         hint: "ex: MX$63.99" },
    { key: "checkoutUrl",         label: "URL de checkout",       hint: "URL completa do checkout" },
    { key: "firstButtonText",     label: "Texto botão inicial",   hint: "ex: ¡EMPEZAR!" },
    { key: "purchaseButtonText",  label: "Texto botão de compra", hint: "ex: ⚽ RECIBIR MI CROMO" },
  ];

  return (
    <div style={{ ...s, alignItems: "flex-start", paddingTop: 48 }}>
      <div style={{ width: "100%", maxWidth: 560 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#004030", marginBottom: 4 }}>Configuração do Site</h1>
        <p style={{ color: "#64748b", fontSize: 13, marginBottom: 24 }}>Alterações entram em vigor em até 60 segundos (cache).</p>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #e2e8f0", marginBottom: 28 }}>
          {(["config", "check"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ background: "none", border: "none", padding: "8px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer",
                color: tab === t ? "#006847" : "#94a3b8",
                borderBottom: tab === t ? "2px solid #006847" : "2px solid transparent",
                marginBottom: -2 }}>
              {t === "config" ? "Configuração" : "Checagem"}
            </button>
          ))}
        </div>

        {tab === "config" && cfg && (
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, boxShadow: "0 2px 8px rgba(0,0,0,.06)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {fields.map(f => (
                <div key={f.key}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 5 }}>
                    {f.label}
                  </label>
                  <input
                    value={cfg[f.key]}
                    onChange={e => setCfg(prev => prev ? { ...prev, [f.key]: e.target.value } : prev)}
                    placeholder={f.hint}
                    style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 14px", fontSize: 14, boxSizing: "border-box" }}
                  />
                  <p style={{ color: "#94a3b8", fontSize: 11, margin: "3px 0 0" }}>{f.hint}</p>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 14 }}>
              <button onClick={handleSave} disabled={saving}
                style={{ background: "#006847", color: "#fff", border: "none", borderRadius: 8, padding: "11px 28px", fontSize: 14, fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Salvando..." : "Salvar"}
              </button>
              {saveMsg && <span style={{ fontSize: 13, fontWeight: 600, color: saveMsg.startsWith("✅") ? "#16a34a" : "#dc2626" }}>{saveMsg}</span>}
            </div>
          </div>
        )}

        {tab === "check" && (
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, boxShadow: "0 2px 8px rgba(0,0,0,.06)" }}>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 18 }}>
              Verifica os segredos configurados no Vercel (DATABASE_URL, BLOB_READ_WRITE_TOKEN, OPENAI_API_KEY).
            </p>
            <button onClick={handleCheck} disabled={checking}
              style={{ background: "#006847", color: "#fff", border: "none", borderRadius: 8, padding: "10px 22px", fontSize: 14, fontWeight: 700, cursor: checking ? "default" : "pointer", opacity: checking ? 0.7 : 1, marginBottom: 20 }}>
              {checking ? "Verificando..." : "Rodar Checagem"}
            </button>
            {checkResults && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {Object.entries(checkResults).map(([key, val]) => (
                  <div key={key} style={{ display: "flex", alignItems: "center", gap: 12, background: val.ok ? "#f0fdf4" : "#fef2f2", border: `1px solid ${val.ok ? "#bbf7d0" : "#fecaca"}`, borderRadius: 8, padding: "10px 14px" }}>
                    <span style={{ fontSize: 18 }}>{val.ok ? "✅" : "❌"}</span>
                    <div>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: val.ok ? "#15803d" : "#dc2626" }}>{key}</p>
                      {val.detail && <p style={{ margin: "2px 0 0", fontSize: 11, color: "#94a3b8" }}>{val.detail}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
