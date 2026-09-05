"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Camera, FileArrowUp, SpinnerGap, WarningCircle } from "@phosphor-icons/react/ssr";
import { TrustBadge, type VerificationStatus } from "@/components/shared/trust-badge";
import { submitIdentityDocumentAction } from "@/actions/perfil-ninera";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ACCEPTED_EXTENSION = /\.(jpg|jpeg|png|webp)$/i;

export function IdentityUpload({ status, rejectionReason }: { status: VerificationStatus; rejectionReason?: string | null }) {
  const [current, setCurrent] = useState(status);
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isPending, startTransition] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const submitFile = (file: File) => {
    startTransition(async () => {
      const data = new FormData();
      data.set("documento", file);
      try {
        const result = await submitIdentityDocumentAction({ status: "idle" }, data);
        if (result.status === "error") setError(result.message ?? "No se pudo subir el documento.");
        else { setError(""); setCurrent("en_proceso"); }
      } catch {
        setError("No se pudo subir el documento. Intenta de nuevo.");
      }
    });
  };

  const choose = (file: File | undefined) => {
    if (!file) return;
    setError("");
    if (file.size > MAX_FILE_SIZE || !ACCEPTED_TYPES.includes(file.type) || !ACCEPTED_EXTENSION.test(file.name)) {
      setSelectedFile(null);
      setPreviewUrl("");
      setError("Usa una imagen JPG, PNG o WEBP de máximo 10 MB.");
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    submitFile(file);
  };

  const canUpload = current !== "en_proceso";
  return <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-6 px-5 py-10 pb-24 lg:py-16">
    <div className="flex flex-col items-center gap-3 text-center"><TrustBadge status={current} size="large" /><p className="text-body text-ink-600">{current === "no_verificada" ? "Aún no has enviado tu identificación." : current === "verificada" ? "Tu identidad fue verificada por el equipo de Clin." : ""}</p></div>
    {rejectionReason && current === "no_verificada" && <div className="rounded-sm border border-border bg-bg-raised p-4 text-body-sm text-ink-600"><strong className="text-ink-900">Motivo de rechazo:</strong> {rejectionReason}</div>}
    {current === "en_proceso" && <div className="rounded-sm border border-border bg-bg-raised p-5 text-center text-body text-ink-600">Recibimos tu identificación, la estamos revisando. Normalmente toma 24–48 horas.</div>}
    {current === "verificada" && <button type="button" className="inline-flex min-h-11 self-center items-center justify-center px-2 text-button text-primary-700 underline" onClick={() => setCurrent("no_verificada")}>Reemplazar documento</button>}
    {canUpload && <section className="flex flex-col gap-4 rounded-md border border-border bg-bg-raised p-5">
      <p className="text-body-sm text-ink-600">Asegúrate de que la imagen esté nítida, bien iluminada y que todos los datos se lean con claridad.</p>

      {previewUrl && <div className="relative h-48 w-full overflow-hidden rounded-sm border border-border-strong bg-bg" data-testid="selected-image-preview">
        <Image src={previewUrl} alt="Vista previa de la identificación seleccionada" fill unoptimized className="object-contain" />
        {isPending && <div className="absolute inset-x-0 bottom-0 bg-bg-raised/90 p-3" aria-live="polite"><div role="progressbar" aria-label="Progreso de carga" aria-valuetext="Subiendo" className="h-2 w-full overflow-hidden rounded-full bg-border"><div className="h-full w-2/5 animate-pulse rounded-full bg-primary-600" /></div><p className="mt-2 flex items-center justify-center gap-2 text-body-sm text-ink-600"><SpinnerGap className="animate-spin" aria-hidden="true" />Subiendo…</p></div>}
      </div>}

      <div className="flex flex-col gap-3 lg:hidden">
        <button type="button" disabled={isPending} onClick={() => camera.current?.click()} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-sm bg-primary-600 px-3 py-3 text-button text-white disabled:opacity-50"><Camera size={20} aria-hidden="true" />Tomar foto</button>
        <input ref={camera} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" onChange={(e) => choose(e.target.files?.[0])} />
        <button type="button" disabled={isPending} onClick={() => input.current?.click()} className="min-h-11 w-full rounded-sm border border-border-strong px-3 py-3 text-button text-ink-900 disabled:opacity-50">Subir desde galería</button>
      </div>
      <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); choose(e.dataTransfer.files[0]); }} className="hidden flex-col items-center gap-3 rounded-sm border border-dashed border-border-strong p-6 text-center lg:flex"><FileArrowUp size={28} className="text-ink-400" aria-hidden="true" /><p className="text-body-sm text-ink-600">Arrastra tu archivo aquí</p><button type="button" disabled={isPending} onClick={() => input.current?.click()} className="min-h-11 rounded-sm bg-primary-600 px-5 py-3 text-button text-white disabled:opacity-50">Seleccionar archivo</button><input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => choose(e.target.files?.[0])} /></div>

      {error && <div role="alert" className="flex items-start gap-2 rounded-sm border border-danger-600 bg-danger-50 p-3 text-body-sm text-danger-600"><WarningCircle size={20} weight="regular" className="mt-0.5 shrink-0" aria-hidden="true" /><div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2"><span>{error}</span>{selectedFile && <button type="button" disabled={isPending} onClick={() => submitFile(selectedFile)} className="min-h-11 text-button text-danger-600 underline disabled:opacity-50">Intentar de nuevo</button>}</div></div>}
      <p className="text-body-sm text-ink-600">Aceptamos JPG, PNG o WEBP, hasta 10 MB. Tu perfil permanece visible mientras revisamos tu documento.</p>
    </section>}
  </main>;
}
