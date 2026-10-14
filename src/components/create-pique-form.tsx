"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, GripVertical, Plus, X } from "lucide-react";
import { apiRequest } from "@/lib/api";
import type { PiqueKind } from "@/domain/models";
import { parseCreatePique } from "@/domain/validation";

const optionPreviewClose = "2099-01-01T00:00:00.000Z";

const kinds: { id: PiqueKind; label: string; hint: string }[] = [
  { id: "options", label: "Opciones libres", hint: "¿Quién llega tarde? ¿Quién paga?" },
  { id: "date", label: "Una fecha", hint: "¿Cuándo nace el bebé?" },
  { id: "number", label: "Un número", hint: "¿Cuántos días aguanta la planta?" },
];
const steps = ["El pique", "Opciones", "Reglas"];

export function CreatePiqueForm({ playgroundId }: { playgroundId: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [question, setQuestion] = useState("");
  const [detail, setDetail] = useState("");
  const [kind, setKind] = useState<PiqueKind>("options");
  const [options, setOptions] = useState(["", ""]);
  const [stake, setStake] = useState(80);
  const [closesAt, setClosesAt] = useState("");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const filledOptions = options.filter((option) => option.trim().length > 0);
  const optionsReady = parseCreatePique({
    question: "Pregunta válida",
    detail: "",
    kind,
    stake,
    closesAt: optionPreviewClose,
    options,
  }).ok;
  const canContinue = step === 0 ? question.trim().length > 3 : step === 1 ? optionsReady : closesAt !== "";

  function chooseKind(nextKind: PiqueKind) {
    setKind(nextKind);
    setOptions(["", ""]);
  }

  async function continueFlow() {
    if (step < steps.length - 1) {
      setStep((current) => current + 1);
      return;
    }
    setPending(true);
    setError(undefined);
    const closes = new Date(closesAt);
    const result = await apiRequest(`/playgrounds/${playgroundId}/piques`, {
      method: "POST",
      body: JSON.stringify({
        question,
        detail,
        kind,
        stake,
        closesAt: closes.toISOString(),
        options,
      }),
    });
    setPending(false);
    if (!result.ok) setError(result.error);
    else {
      router.push(`/playgrounds/${playgroundId}`);
      router.refresh();
    }
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div>
        <ol className="mb-7 flex items-center gap-2" aria-label="Progreso">
          {steps.map((label, index) => (
            <li key={label} className="flex flex-1 items-center gap-2">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-display text-xs font-bold ${index < step ? "bg-palma text-white" : index === step ? "bg-abismo text-crema" : "bg-abismo/10 text-tinta-suave"}`}>
                {index < step ? <Check className="h-3.5 w-3.5" aria-hidden /> : index + 1}
              </span>
              <span className={`hidden text-sm font-medium sm:inline ${index === step ? "text-abismo" : "text-tinta-suave"}`}>
                {label}
              </span>
              {index < steps.length - 1 && <span className="h-px flex-1 bg-abismo/10" aria-hidden />}
            </li>
          ))}
        </ol>
        <section className="rounded-2xl border border-abismo/10 bg-white p-6 shadow-card" aria-labelledby={`step-${step}`}>
          <h2 id={`step-${step}`} className="sr-only">{steps[step]}</h2>
          {step === 0 && (
            <div className="flex flex-col gap-5">
              <label htmlFor="question" className="block font-display text-sm font-bold text-abismo">
                ¿Qué se apuesta?
                <input id="question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="¿Quién se deja las llaves dentro de casa primero?" className="mt-2 h-12 w-full rounded-xl border border-abismo/15 bg-crema/50 px-4 text-base font-normal outline-none focus:border-laguna focus:bg-white" />
              </label>
              <label htmlFor="detail" className="block font-display text-sm font-bold text-abismo">
                Reglas de la casa <span className="font-sans font-normal text-tinta-suave">(opcional)</span>
                <textarea id="detail" value={detail} onChange={(event) => setDetail(event.target.value)} rows={3} placeholder="Define cuándo se considera que alguien ha ganado." className="mt-2 w-full resize-none rounded-xl border border-abismo/15 bg-crema/50 px-4 py-3 text-sm font-normal outline-none focus:border-laguna focus:bg-white" />
              </label>
              <fieldset>
                <legend className="font-display text-sm font-bold text-abismo">Tipo de respuesta</legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {kinds.map((item) => (
                    <label key={item.id} className={`cursor-pointer rounded-xl border px-3.5 py-3 ${kind === item.id ? "border-marea bg-espuma/50" : "border-abismo/15 bg-crema/40"}`}>
                      <input type="radio" name="kind" value={item.id} checked={kind === item.id} onChange={() => chooseKind(item.id)} className="sr-only" />
                      <span className="block text-sm font-semibold text-abismo">{item.label}</span>
                      <span className="mt-0.5 block text-xs font-normal text-tinta-suave">{item.hint}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          )}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <p className="text-xs text-tinta-suave">
                {kind === "date"
                  ? "Mínimo dos fechas reales. Cada jugador podrá elegir solo una."
                  : kind === "number"
                    ? "Mínimo dos números enteros. Cada jugador podrá elegir solo uno."
                    : "Mínimo dos. Cada jugador podrá elegir solo una."}
              </p>
              <ul className="flex flex-col gap-2">
                {options.map((option, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 shrink-0 text-tinta-suave/60" aria-hidden />
                    <input
                      type={kind === "date" ? "date" : kind === "number" ? "number" : "text"}
                      step={kind === "number" ? 1 : undefined}
                      value={option}
                      onChange={(event) => setOptions((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))}
                      aria-label={`Opción ${index + 1}`}
                      placeholder={kind === "number" ? "0" : `Opción ${index + 1}`}
                      className="h-11 flex-1 rounded-xl border border-abismo/15 bg-crema/50 px-4 text-sm outline-none focus:border-laguna focus:bg-white"
                    />
                    <button type="button" aria-label={`Eliminar opción ${index + 1}`} disabled={options.length <= 2} onClick={() => setOptions((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="flex h-9 w-9 items-center justify-center rounded-lg text-tinta-suave hover:bg-coral/10 hover:text-coral disabled:opacity-30">
                      <X className="h-4 w-4" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => setOptions((current) => [...current, ""])} className="flex items-center gap-2 self-start rounded-xl border border-dashed border-abismo/25 px-3.5 py-2 text-sm font-medium text-marea">
                <Plus className="h-4 w-4" aria-hidden />
                Añadir opción
              </button>
            </div>
          )}
          {step === 2 && (
            <div className="flex flex-col gap-5">
              <label htmlFor="stake" className="block font-display text-sm font-bold text-abismo">
                Puntos en juego por participante
                <span className="mt-3 flex items-center gap-4">
                  <input id="stake" type="range" min={20} max={300} step={20} value={stake} onChange={(event) => setStake(Number(event.target.value))} className="h-1.5 flex-1 accent-marea" />
                  <output htmlFor="stake" className="w-20 rounded-lg bg-abismo px-3 py-1.5 text-center font-display text-sm font-bold text-crema">{stake} pts</output>
                </span>
              </label>
              <label htmlFor="closes-at" className="block font-display text-sm font-bold text-abismo">
                Cierre del pique
                <input id="closes-at" type="datetime-local" value={closesAt} onChange={(event) => setClosesAt(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-abismo/15 bg-crema/50 px-4 text-sm font-normal outline-none focus:border-laguna sm:w-72" />
              </label>
              <p className="text-xs text-tinta-suave">Después de esa hora nadie podrá entrar, salir ni cambiar su opción.</p>
            </div>
          )}
        </section>
        {error && <p role="alert" className="mt-4 text-sm font-medium text-coral">{error}</p>}
        <div className="mt-5 flex items-center gap-3">
          {step > 0 && (
            <button type="button" onClick={() => setStep((current) => current - 1)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-tinta-suave">
              Atrás
            </button>
          )}
          <button type="button" disabled={!canContinue || pending} onClick={continueFlow} className="ml-auto flex items-center gap-2 rounded-xl bg-marea px-5 py-2.5 text-sm font-semibold text-crema disabled:opacity-40">
            {step === steps.length - 1 ? (pending ? "Publicando…" : "Publicar pique") : "Continuar"}
            {step < steps.length - 1 && <ArrowRight className="h-4 w-4" aria-hidden />}
          </button>
        </div>
      </div>
      <aside>
        <section aria-labelledby="preview" className="sticky top-24 rounded-2xl border border-abismo/10 bg-white p-5 shadow-card">
          <h2 id="preview" className="text-xs font-semibold uppercase tracking-wider text-tinta-suave">Vista previa</h2>
          <p className="mt-3 font-display text-lg font-bold leading-snug text-abismo">{question.trim() || "Tu pregunta aparecerá aquí"}</p>
          {detail.trim() && <p className="mt-1 text-sm text-tinta-suave">{detail}</p>}
          <ul className="mt-4 flex flex-col gap-2">
            {(filledOptions.length > 0 ? filledOptions : ["Opción A", "Opción B"]).map((option) => (
              <li key={option} className="rounded-xl border border-abismo/10 bg-crema/60 px-3 py-2 text-sm">{option}</li>
            ))}
          </ul>
          <p className="mt-4 border-t border-abismo/10 pt-3 text-xs text-tinta-suave">
            {stake} pts por participante · {closesAt ? "cierre programado" : "sin fecha de cierre"}
          </p>
        </section>
      </aside>
    </div>
  );
}
