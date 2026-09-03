"use client";

import { useActionState, useEffect, useState } from "react";
import {
  sendPhoneOtpAction,
  initialSendPhoneOtpActionState,
  confirmPhoneOtpAction,
  initialConfirmPhoneOtpActionState,
  type SendPhoneOtpActionState,
} from "@/actions/phone-verification";

/** Mirrors actions/phone-verification.ts's RESEND_COOLDOWN_SECONDS -- only used here to seed
 * the client-side countdown display after a fresh send; the server is the actual source of
 * truth (a page reload mid-cooldown gets the real remaining time back from
 * `sendState.cooldownSecondsRemaining`). */
const RESEND_COOLDOWN_SECONDS = 60;

/**
 * AUTH-03 teléfono checklist item (design/UX-spec.md AUTH-03): send/resend an OTP with a
 * ~60s cooldown, confirm a 6-digit code, each with its own inline error/success state per
 * the spec's "error (invalid/expired OTP -- clear inline message with a retry action, not a
 * full-page failure)". Two separate forms (send vs. confirm) so submitting a wrong code
 * never has to re-trigger a send, and a failed confirm never touches the send/cooldown state.
 *
 * First-send trigger: UX-spec.md's AUTH-03 only documents "Reenviar código" (resend)
 * explicitly, implying a code is already in flight by the time this screen renders. Rather
 * than side-effecting an SMS send during the parent Server Component's render (no side
 * effects during render; also fragile before Twilio credentials are configured), the very
 * first send reuses this same button/action, just labeled "Enviar código" until one has gone
 * out. Flagged as an assumption for reviewer attention -- not explicitly specified.
 */
export function PhoneVerificationForm() {
  const [sendState, sendFormAction, isSending] = useActionState(
    sendPhoneOtpAction,
    initialSendPhoneOtpActionState
  );
  const [confirmState, confirmFormAction, isConfirming] = useActionState(
    confirmPhoneOtpAction,
    initialConfirmPhoneOtpActionState
  );

  // Seeds the cooldown counter from `sendState` during render (React's documented pattern
  // for "adjusting state when a prop/action-state changes" -- see
  // https://react.dev/learn/you-might-not-need-an-effect), rather than syncing it via a
  // `useEffect` that calls setState in response to a state value it also depends on. Only
  // ever reads pure values here (the `RESEND_COOLDOWN_SECONDS` constant, or a number already
  // computed server-side) -- no `Date.now()`/wall-clock reads during render.
  const [handledSendState, setHandledSendState] = useState<SendPhoneOtpActionState>(sendState);
  const [hasSentOnce, setHasSentOnce] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  if (sendState !== handledSendState) {
    setHandledSendState(sendState);
    if (sendState.status === "sent") {
      setHasSentOnce(true);
      setCooldownSeconds(RESEND_COOLDOWN_SECONDS);
    } else if (sendState.status === "cooldown") {
      setHasSentOnce(true);
      setCooldownSeconds(sendState.cooldownSecondsRemaining ?? RESEND_COOLDOWN_SECONDS);
    }
  }

  // Ticks the countdown down by one every second while active -- a legitimate effect use
  // (subscribing to a timer), not a reaction to another React state/prop value.
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  if (confirmState.status === "verified") {
    return (
      <p role="status" className="text-sm text-emerald-700">
        Teléfono verificado.
      </p>
    );
  }

  const sendButtonLabel = isSending
    ? "Enviando…"
    : cooldownSeconds > 0
      ? `Reenviar código (${cooldownSeconds}s)`
      : hasSentOnce
        ? "Reenviar código"
        : "Enviar código";

  return (
    <div className="flex flex-col gap-4">
      <form action={sendFormAction}>
        <button
          type="submit"
          disabled={isSending || cooldownSeconds > 0}
          className="h-11 w-full border border-zinc-300 text-sm font-medium disabled:opacity-60"
        >
          {sendButtonLabel}
        </button>
        {sendState.status === "error" ? (
          <p role="alert" className="mt-2 text-sm text-red-700">
            {sendState.message}
          </p>
        ) : null}
      </form>

      <form action={confirmFormAction} className="flex flex-col gap-2">
        <label className="flex flex-col gap-1 text-sm">
          Código de verificación
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            name="code"
            required
            autoComplete="one-time-code"
            className="h-11 border border-zinc-300 px-3 tracking-widest"
          />
        </label>
        {confirmState.status === "error" ? (
          <p role="alert" className="text-sm text-red-700">
            {confirmState.message}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={isConfirming}
          className="h-11 bg-zinc-900 text-sm font-medium text-white disabled:opacity-60"
        >
          {isConfirming ? "Verificando…" : "Continuar"}
        </button>
      </form>
    </div>
  );
}
