"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, SpinnerGap } from "@phosphor-icons/react/ssr";
import { ZonaMultiSelect } from "@/components/ninera/zona-multi-select";
import { savePerfilNineraDraftAction, uploadPerfilFotoAction } from "@/actions/perfil-ninera";
import { rangoEdadValues } from "@/lib/familia/necesidad-validation";
import { modalidadValues, type PerfilNineraDraft } from "@/lib/ninera/perfil-validation";
import type { ZonaOption } from "@/lib/zonas/queries";

const stepLabels = ["Perfil y zona", "Disponibilidad y referencias"];
const dayValues = ["lun", "mar", "mie", "jue", "vie", "sab", "dom"] as const;
const modalidadLabels: Record<(typeof modalidadValues)[number], string> = {
  planta: "Planta",
  entrada_salida: "Entrada por salida",
  ocasional: "Ocasional",
};

type WizardData = PerfilNineraDraft & {
  zonaIds: NonNullable<PerfilNineraDraft["zonaIds"]>;
  disponibilidad: NonNullable<PerfilNineraDraft["disponibilidad"]>;
  modalidadesAceptadas: NonNullable<PerfilNineraDraft["modalidadesAceptadas"]>;
  experienciaEdades: NonNullable<PerfilNineraDraft["experienciaEdades"]>;
  referencias: NonNullable<PerfilNineraDraft["referencias"]>;
};

type UpdateFn = (patch: Partial<WizardData>) => void;

export function PerfilNineraWizard({ zonas, draft }: { zonas: ZonaOption[]; draft?: Partial<PerfilNineraDraft> }) {
  const [data, setData] = useState<WizardData>({
    fotoUrl: draft?.fotoUrl ?? "",
    zonaIds: draft?.zonaIds ?? [],
    anosExperiencia: draft?.anosExperiencia,
    disponibilidad: draft?.disponibilidad ?? [],
    salarioMin: draft?.salarioMin,
    salarioMax: draft?.salarioMax,
    modalidadesAceptadas: draft?.modalidadesAceptadas ?? [],
    descripcion: draft?.descripcion ?? "",
    experienciaEdades: draft?.experienciaEdades ?? [],
    referencias: draft?.referencias ?? [],
  });
  const [step, setStep] = useState<1 | 2>(1);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isUploadingFoto, startFotoUpload] = useTransition();
  const [isDesktop, setIsDesktop] = useState(false);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Same "same wizard shell as FAM-03" media-query-driven desktop/mobile split as
  // `components/familia/necesidad-wizard.tsx` (design/UI-SPEC.md NIN-01/02: "sticky bottom
  // nav mobile / anchored side-rail desktop").
  useEffect(() => {
    if (!window.matchMedia) return;
    const query = window.matchMedia("(min-width: 1024px)");
    const updateDesktop = () => setIsDesktop(query.matches);
    updateDesktop();
    query.addEventListener("change", updateDesktop);
    return () => query.removeEventListener("change", updateDesktop);
  }, []);

  const update: UpdateFn = (patch) => setData((current) => ({ ...current, ...patch }));

  const persist = async () => {
    const form = new FormData();
    form.set("draft", JSON.stringify(data));
    return savePerfilNineraDraftAction({ status: "idle" }, form);
  };

  const afterSave = (result: Awaited<ReturnType<typeof savePerfilNineraDraftAction>>) => {
    if (result.status === "error") {
      setError(result.message ?? "No se pudo guardar tu perfil.");
      return false;
    }
    setNotice("Guardado");
    setTimeout(() => setNotice(""), 1800);
    return true;
  };

  const next = () => {
    setError("");
    startTransition(async () => {
      const ok = afterSave(await persist());
      if (ok) setStep(2);
    });
  };

  const back = () => {
    setError("");
    setStep(1);
  };

  const finish = () => {
    setError("");
    startTransition(async () => {
      const ok = afterSave(await persist());
      if (ok) setFinished(true);
    });
  };

  const handleFotoChange = (file: File | null) => {
    if (!file) return;
    startFotoUpload(async () => {
      setError("");
      const form = new FormData();
      form.set("foto", file);
      const result = await uploadPerfilFotoAction({ status: "idle" }, form);
      if (result.status === "error") {
        setError(result.message ?? "No se pudo subir la foto.");
        return;
      }
      update({ fotoUrl: result.fotoUrl });
    });
  };

  const canNext = data.zonaIds.length > 0;
  const canFinish =
    data.disponibilidad.length > 0 &&
    data.modalidadesAceptadas.length > 0 &&
    data.salarioMin !== undefined &&
    data.salarioMax !== undefined &&
    !!data.descripcion &&
    data.experienciaEdades.length > 0;

  const selectDesktopSection = (section: 1 | 2) => {
    setStep(section);
    document.getElementById(`step-${section}`)?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1040px] flex-col bg-bg px-4 py-6 text-ink-900 sm:px-6 lg:flex-row lg:gap-10 lg:py-12">
      <aside className="hidden w-[200px] shrink-0 lg:block">
        <nav aria-label="Pasos del perfil" className="sticky top-12 space-y-1">
          {stepLabels.map((label, i) => (
            <button
              key={label}
              type="button"
              aria-current={i + 1 === step ? "step" : undefined}
              disabled={isPending}
              onClick={() => selectDesktopSection((i + 1) as 1 | 2)}
              className={`min-h-11 w-full rounded-sm px-3 text-left text-body-sm ${i + 1 === step ? "bg-primary-50 font-semibold text-primary-700" : "text-ink-600"}`}
            >
              {i + 1}. {label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="w-full max-w-[640px]">
        <div className="mb-8 flex gap-1 lg:hidden" aria-label={`Paso ${step} de 2`}>
          {stepLabels.map((label, i) => (
            <span key={label} title={label} className={`h-1 flex-1 rounded-full ${i < step ? "bg-primary-600" : "bg-border"}`} />
          ))}
        </div>
        <div className="mb-6 flex items-center justify-between">
          <p className="text-body-sm text-ink-600">
            Paso {step} de 2 · {stepLabels[step - 1]}
          </p>
          {notice && <span className="text-body-sm text-ink-600">{notice}</span>}
        </div>

        {isDesktop ? (
          <DesktopSections
            data={data}
            update={update}
            zonas={zonas}
            fileInputRef={fileInputRef}
            isUploadingFoto={isUploadingFoto}
            handleFotoChange={handleFotoChange}
            onSectionVisible={setStep}
            finished={finished}
            onSkipIdentity={() => router.push("/ninera")}
          />
        ) : (
          <section className="min-h-[420px]">
            <h1 className="mb-2 text-h1">{stepLabels[step - 1]}</h1>
            <p className="mb-8 text-body text-ink-600">Cuéntanos sobre ti para conectar con familias compatibles.</p>

            {step === 1 && (
              <Step1Fields
                data={data}
                update={update}
                zonas={zonas}
                fileInputRef={fileInputRef}
                isUploadingFoto={isUploadingFoto}
                handleFotoChange={handleFotoChange}
              />
            )}
            {step === 2 && (
              <>
                <Step2Fields data={data} update={update} />
                {finished && <IdentityPromptCard onSkip={() => router.push("/ninera")} />}
              </>
            )}
          </section>
        )}

        {error && (
          <p role="alert" className="mt-5 text-body-sm text-danger-600">
            {error}
          </p>
        )}

        {!finished && (
          <div className="sticky bottom-0 z-10 -mx-4 mt-8 flex flex-wrap gap-3 border-t border-border bg-bg/95 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:bg-transparent lg:px-0">
            {step === 2 && (
              <button type="button" disabled={isPending} onClick={back} className="min-h-11 rounded-sm px-4 py-3 text-button text-ink-600 disabled:opacity-40">
                Atrás
              </button>
            )}
            <button
              type="button"
              disabled={(step === 1 ? !canNext : !canFinish) || isPending}
              onClick={step === 1 ? next : finish}
              className="flex min-h-11 flex-1 items-center justify-center rounded-sm bg-primary-600 px-4 py-3 text-button text-white disabled:opacity-40"
            >
              {isPending ? <SpinnerGap size={16} className="animate-spin" aria-label="Guardando" /> : step === 1 ? "Siguiente" : "Finalizar"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

function DesktopSections({
  data,
  update,
  zonas,
  fileInputRef,
  isUploadingFoto,
  handleFotoChange,
  onSectionVisible,
  finished,
  onSkipIdentity,
}: {
  data: WizardData;
  update: UpdateFn;
  zonas: ZonaOption[];
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  isUploadingFoto: boolean;
  handleFotoChange: (file: File | null) => void;
  onSectionVisible: (section: 1 | 2) => void;
  finished: boolean;
  onSkipIdentity: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || typeof IntersectionObserver === "undefined") return;
    const container = containerRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) onSectionVisible(Number((visible.target as HTMLElement).id.replace("step-", "")) as 1 | 2);
      },
      { root: container, threshold: [0.25, 0.5, 0.75] }
    );
    container.querySelectorAll("section[id^='step-']").forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [onSectionVisible]);

  return (
    <div ref={containerRef} className="max-h-[calc(100vh-6rem)] space-y-10 overflow-y-auto pr-4" data-testid="desktop-wizard-sections">
      <section id="step-1" tabIndex={-1}>
        <h1 className="text-h1">Perfil y zona</h1>
        <div className="mt-4">
          <Step1Fields data={data} update={update} zonas={zonas} fileInputRef={fileInputRef} isUploadingFoto={isUploadingFoto} handleFotoChange={handleFotoChange} />
        </div>
      </section>
      <section id="step-2" tabIndex={-1}>
        <h2 className="text-h2">Disponibilidad y referencias</h2>
        <div className="mt-4">
          <Step2Fields data={data} update={update} />
        </div>
        {finished && <IdentityPromptCard onSkip={onSkipIdentity} />}
      </section>
    </div>
  );
}

function Step1Fields({
  data,
  update,
  zonas,
  fileInputRef,
  isUploadingFoto,
  handleFotoChange,
}: {
  data: WizardData;
  update: UpdateFn;
  zonas: ZonaOption[];
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  isUploadingFoto: boolean;
  handleFotoChange: (file: File | null) => void;
}) {
  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Subir foto de perfil"
          className="relative flex h-[120px] w-[120px] items-center justify-center overflow-hidden rounded-full border border-border-strong bg-bg-raised"
        >
          {data.fotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage public URL, not a static asset
            <img src={data.fotoUrl} alt="Foto de perfil" className="h-full w-full object-cover" />
          ) : (
            <span className="text-body-sm text-ink-600">Foto</span>
          )}
          <span className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-primary-600 text-white">
            {isUploadingFoto ? <SpinnerGap size={16} className="animate-spin" aria-hidden /> : <Camera size={18} weight="fill" aria-hidden />}
          </span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(event) => handleFotoChange(event.target.files?.[0] ?? null)}
        />
      </div>

      <ZonaMultiSelect zonas={zonas} name="zona_ids" defaultZonaIds={data.zonaIds} onChange={(zonaIds) => update({ zonaIds })} />

      <div>
        <p className="mb-2 text-body-sm">Años de experiencia</p>
        <div className="flex items-center gap-5">
          <button
            type="button"
            aria-label="Quitar año de experiencia"
            className="min-h-11 min-w-11 rounded-sm border border-border-strong text-xl"
            onClick={() => update({ anosExperiencia: Math.max(0, (data.anosExperiencia ?? 0) - 1) })}
          >
            −
          </button>
          <span aria-live="polite">{data.anosExperiencia ?? 0}</span>
          <button
            type="button"
            aria-label="Agregar año de experiencia"
            className="min-h-11 min-w-11 rounded-sm border border-border-strong text-xl"
            onClick={() => update({ anosExperiencia: (data.anosExperiencia ?? 0) + 1 })}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

function Step2Fields({ data, update }: { data: WizardData; update: UpdateFn }) {
  const paymentSummary =
    data.salarioMin !== undefined || data.salarioMax !== undefined
      ? `$${data.salarioMin?.toLocaleString("es-MX") ?? "—"} – $${data.salarioMax?.toLocaleString("es-MX") ?? "—"} MXN/semana`
      : "Ejemplo: $4,500 – $6,500 MXN/semana";

  return (
    <div className="space-y-8">
      <fieldset>
        <legend className="mb-2 text-body-sm">Disponibilidad</legend>
        <div className="flex flex-wrap gap-3">
          {dayValues.map((day) => {
            const current = data.disponibilidad.find((item) => item.dia === day);
            return (
              <div key={day} className="flex flex-col gap-2">
                <button
                  type="button"
                  aria-pressed={!!current}
                  className={`min-h-11 rounded-full border px-4 ${current ? "border-primary-600 bg-primary-50" : "border-border-strong"}`}
                  onClick={() =>
                    update({
                      disponibilidad: current
                        ? data.disponibilidad.filter((item) => item.dia !== day)
                        : [...data.disponibilidad, { dia: day, horaInicio: "09:00", horaFin: "17:00" }],
                    })
                  }
                >
                  {day}
                </button>
                {current && (
                  <div className="flex gap-2">
                    <label className="text-body-sm">
                      Desde
                      <input
                        className="mt-1 h-11 rounded-sm border border-border-strong bg-bg-raised px-2"
                        type="time"
                        aria-label={`${day} desde`}
                        value={current.horaInicio}
                        onChange={(event) =>
                          update({
                            disponibilidad: data.disponibilidad.map((item) => (item.dia === day ? { ...item, horaInicio: event.target.value } : item)),
                          })
                        }
                      />
                    </label>
                    <label className="text-body-sm">
                      Hasta
                      <input
                        className="mt-1 h-11 rounded-sm border border-border-strong bg-bg-raised px-2"
                        type="time"
                        aria-label={`${day} hasta`}
                        value={current.horaFin}
                        onChange={(event) =>
                          update({
                            disponibilidad: data.disponibilidad.map((item) => (item.dia === day ? { ...item, horaFin: event.target.value } : item)),
                          })
                        }
                      />
                    </label>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-body-sm">Modalidades aceptadas</legend>
        <div className="flex flex-wrap gap-2">
          {modalidadValues.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={data.modalidadesAceptadas.includes(value)}
              className={`min-h-11 rounded-full border px-4 ${data.modalidadesAceptadas.includes(value) ? "border-primary-600 bg-primary-50" : "border-border-strong"}`}
              onClick={() =>
                update({
                  modalidadesAceptadas: data.modalidadesAceptadas.includes(value)
                    ? data.modalidadesAceptadas.filter((item) => item !== value)
                    : [...data.modalidadesAceptadas, value],
                })
              }
            >
              {modalidadLabels[value]}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-body-sm">
          Expectativa mínima (MXN)
          <span className="flex h-11 items-center rounded-sm border border-border-strong bg-bg-raised">
            <span className="px-3 text-ink-600">MXN</span>
            <input
              aria-label="Expectativa salarial mínima en MXN"
              type="number"
              min="0"
              className="h-full min-w-0 flex-1 bg-transparent px-2 outline-none"
              value={data.salarioMin ?? ""}
              onChange={(event) => update({ salarioMin: event.target.value ? Number(event.target.value) : undefined })}
            />
          </span>
        </label>
        <label className="flex flex-col gap-2 text-body-sm">
          Expectativa máxima (MXN)
          <span className="flex h-11 items-center rounded-sm border border-border-strong bg-bg-raised">
            <span className="px-3 text-ink-600">MXN</span>
            <input
              aria-label="Expectativa salarial máxima en MXN"
              type="number"
              min="0"
              className="h-full min-w-0 flex-1 bg-transparent px-2 outline-none"
              value={data.salarioMax ?? ""}
              onChange={(event) => update({ salarioMax: event.target.value ? Number(event.target.value) : undefined })}
            />
          </span>
        </label>
        <p className="text-body-sm text-ink-600 sm:col-span-2" aria-live="polite">
          {paymentSummary}
        </p>
      </div>

      <fieldset>
        <legend className="mb-2 text-body-sm">Experiencia con edades</legend>
        <div className="flex flex-wrap gap-2">
          {rangoEdadValues.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={data.experienciaEdades.includes(value)}
              className={`min-h-11 rounded-full border px-4 py-2 text-body-sm ${data.experienciaEdades.includes(value) ? "border-primary-600 bg-primary-50" : "border-border-strong"}`}
              onClick={() =>
                update({
                  experienciaEdades: data.experienciaEdades.includes(value)
                    ? data.experienciaEdades.filter((item) => item !== value)
                    : [...data.experienciaEdades, value],
                })
              }
            >
              {value}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2 text-body-sm">
        <label htmlFor="descripcion">Descripción personal</label>
        <textarea
          id="descripcion"
          value={data.descripcion ?? ""}
          maxLength={1000}
          rows={5}
          className="rounded-sm border border-border-strong bg-bg-raised p-3"
          onChange={(event) => update({ descripcion: event.target.value })}
        />
        <span className="text-body-sm text-ink-600">{(data.descripcion ?? "").length}/1000</span>
      </div>

      <fieldset className="space-y-4">
        <legend className="mb-2 text-body-sm">Referencias</legend>
        {data.referencias.map((reference, index) => (
          <div key={index} className="grid gap-3 rounded-sm border border-border-strong p-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-body-sm">
              Nombre
              <input
                className="h-11 rounded-sm border border-border-strong bg-bg-raised px-2"
                value={reference.nombre}
                onChange={(event) =>
                  update({ referencias: data.referencias.map((item, i) => (i === index ? { ...item, nombre: event.target.value } : item)) })
                }
              />
            </label>
            <label className="flex flex-col gap-1 text-body-sm">
              Relación
              <input
                className="h-11 rounded-sm border border-border-strong bg-bg-raised px-2"
                value={reference.relacion}
                onChange={(event) =>
                  update({ referencias: data.referencias.map((item, i) => (i === index ? { ...item, relacion: event.target.value } : item)) })
                }
              />
            </label>
            <label className="flex flex-col gap-1 text-body-sm">
              Periodo
              <input
                className="h-11 rounded-sm border border-border-strong bg-bg-raised px-2"
                value={reference.periodo}
                onChange={(event) =>
                  update({ referencias: data.referencias.map((item, i) => (i === index ? { ...item, periodo: event.target.value } : item)) })
                }
              />
            </label>
            <label className="flex flex-col gap-1 text-body-sm">
              Contacto (opcional)
              <input
                className="h-11 rounded-sm border border-border-strong bg-bg-raised px-2"
                value={reference.contacto ?? ""}
                onChange={(event) =>
                  update({ referencias: data.referencias.map((item, i) => (i === index ? { ...item, contacto: event.target.value } : item)) })
                }
              />
            </label>
            <button
              type="button"
              className="text-button text-danger-600 underline sm:col-span-2 sm:justify-self-start"
              onClick={() => update({ referencias: data.referencias.filter((_, i) => i !== index) })}
            >
              Quitar referencia
            </button>
          </div>
        ))}
        <button
          type="button"
          className="text-button text-primary-700 underline"
          onClick={() => update({ referencias: [...data.referencias, { nombre: "", relacion: "", periodo: "", contacto: "" }] })}
        >
          Agregar referencia
        </button>
      </fieldset>
    </div>
  );
}

/**
 * End-of-paso-2 non-blocking prompt (design/UX-spec.md; UI-SPEC.md NIN-01/02: "a
 * non-blocking prompt card... with a secondary 'Más tarde' and primary 'Subir ahora' (→
 * NIN-08)"). Rendered as a card *appended after paso 2's own field content* (both in the
 * mobile single-step view and the desktop step-2 section) -- per the spec's explicit
 * "(not a full step)" parenthetical -- rather than replacing the wizard with a separate
 * screen. NIN-08 (E7-03) doesn't exist yet in this codebase -- per this project's
 * established "build only what exists to depend on, defer the rest explicitly" pattern
 * (agent/BACKLOG.md's E1-02/E5-01/E5-03/E5-04/E6-01 precedent), "Subir ahora" is rendered
 * disabled with an explanatory note instead of routing to a route that doesn't exist yet,
 * mirroring E4-04's disabled-placeholder-with-reason precedent. "Más tarde" is the only
 * live action and completes onboarding.
 */
function IdentityPromptCard({ onSkip }: { onSkip: () => void }) {
  return (
    <div className="mt-8 rounded-sm border border-border p-6">
      <h2 className="mb-2 text-h2">Sube tu identificación</h2>
      <p className="mb-6 text-body-sm text-ink-600">
        Verificar tu identidad ayuda a las familias a confiar más en tu perfil. Puedes hacerlo cuando quieras — tu perfil ya es visible mientras tanto.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button type="button" disabled title="Próximamente" className="min-h-11 rounded-sm bg-primary-600 px-4 py-3 text-button text-white opacity-40 sm:flex-1">
          Subir ahora
        </button>
        <button type="button" onClick={onSkip} className="min-h-11 rounded-sm px-4 py-3 text-button text-ink-600 sm:flex-1">
          Más tarde
        </button>
      </div>
    </div>
  );
}
