"use client";

import { useState } from "react";
import { CircleNotch, CheckCircle } from "@phosphor-icons/react";
import Link from "next/link";
import { confirmContactAction } from "@/actions/entitlements";

export function ContactRequestForm({ necesidadId, nineraId, initialPhone, initialContactEstablished, cancelHref }: {
  necesidadId: string; nineraId: string; initialPhone?: string | null; initialContactEstablished?: boolean; cancelHref: string;
}) {
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<{ phone: string | null; status: "contacted" | "already_contacted" } | null>(
    initialContactEstablished ? { phone: initialPhone ?? null, status: "already_contacted" } : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true); setError(null);
    try {
      const response = await confirmContactAction({ necesidadId, nineraId, mensaje: message || undefined });
      if (response.status === "contacted" || response.status === "already_contacted") setResult(response);
      else if ("message" in response) setError(response.message);
    } catch { setError("No se pudo registrar la solicitud. Intenta de nuevo."); }
    finally { setPending(false); }
  }

  if (result) return (
    <div className="mt-6 flex flex-col gap-4">
      <div role="status" className="flex items-start gap-3 border-l-2 border-trust-verified-600 pl-3 text-body text-ink-900">
        <CheckCircle size={22} weight="fill" className="shrink-0 text-trust-verified-600" aria-hidden="true" />
        <span>Solicitud confirmada. Ya puedes contactar a esta candidata.</span>
      </div>
      <div className="rounded-sm border border-border bg-bg-raised p-4">
        <p className="text-body-sm text-ink-600">Teléfono / WhatsApp</p>
        <p className="mt-1 text-body text-ink-900">{result.phone || "La candidata no tiene teléfono disponible."}</p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href={`/familia/necesidad/${necesidadId}`} className="inline-flex min-h-11 items-center justify-center rounded-sm bg-primary-600 px-5 text-button text-white">Seguir buscando candidatas</Link>
        <Link href={cancelHref} className="inline-flex min-h-11 items-center justify-center rounded-sm border border-border-strong px-5 text-button text-primary-600">Cancelar</Link>
      </div>
    </div>
  );

  return (
    <div className="mt-6 flex flex-col gap-4">
      <label htmlFor="contact-message" className="text-body text-ink-900">Mensaje opcional</label>
      <textarea id="contact-message" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={1000}
        rows={5} placeholder="Cuéntale brevemente sobre tu necesidad…" className="rounded-sm border border-border-strong bg-bg px-3 py-3 text-body text-ink-900 outline-none focus:border-primary-600" disabled={pending} />
      {error && <div role="alert" className="rounded-sm border border-danger-600 bg-danger-50 px-4 py-3 text-body-sm text-danger-600">{error}</div>}
      <div className="flex flex-col gap-3 sm:flex-row-reverse">
        <button type="button" onClick={submit} disabled={pending} className="flex h-11 items-center justify-center gap-2 rounded-sm bg-primary-600 px-5 text-button text-white disabled:pointer-events-none disabled:opacity-40">
          {pending && <CircleNotch size={16} className="animate-spin" aria-hidden="true" />}Confirmar solicitud
        </button>
        <Link href={cancelHref} className="inline-flex min-h-11 items-center justify-center rounded-sm border border-border-strong px-5 text-button text-primary-600">Cancelar</Link>
      </div>
    </div>
  );
}
