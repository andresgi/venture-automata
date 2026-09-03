-- E0-05 (Twilio Verify phone OTP): tracks the last time an OTP send was requested for a
-- profile, backing the app-layer resend cooldown (~60s, design/UX-spec.md AUTH-03) required
-- in addition to (not instead of) Twilio Verify's own native rate limiting/lockout
-- (engineering/security.md's OTP-brute-force row: "Twilio Verify's built-in rate limiting/
-- lockout; app-layer resend cooldown ... in addition"). Not stored via Twilio itself since
-- the cooldown must be enforced before ever calling Twilio (a serverless/multi-instance-safe
-- source of truth for "when did we last ask Twilio to send a code for this profile").

alter table public.profiles
  add column phone_otp_last_sent_at timestamptz;

comment on column public.profiles.phone_otp_last_sent_at is
  'Timestamp of the most recent Twilio Verify OTP send request for this profile -- backs '
  'the app-layer resend cooldown only (engineering/security.md); not itself a trust signal '
  '(unlike phone_verified). System-set only, same protection pattern as '
  'email_verified/phone_verified (see profiles_protect_system_fields below).';

-- Extend the existing system-fields guard (db/migrations/20260902000007_security_hardening.sql)
-- to also cover this new column: a non-privileged client should never be able to write it
-- directly (defense-in-depth -- the running app only ever writes it via the service-role
-- client, in actions/phone-verification.ts's sendPhoneOtpAction).
create or replace function public.profiles_protect_system_fields()
returns trigger
language plpgsql
as $$
declare
  caller_role text := auth.role();
  is_privileged boolean := caller_role is null or caller_role = 'service_role';
begin
  if is_privileged then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.email_verified is distinct from false
       or new.phone_verified is distinct from false
       or new.phone_otp_last_sent_at is not null then
      raise exception
        'profiles.email_verified/phone_verified/phone_otp_last_sent_at cannot be set on '
        'insert by a non-privileged client -- system-set only (database.md §1)';
    end if;
  elsif tg_op = 'UPDATE' then
    if new.email_verified is distinct from old.email_verified
       or new.phone_verified is distinct from old.phone_verified
       or new.phone_otp_last_sent_at is distinct from old.phone_otp_last_sent_at then
      raise exception
        'profiles.email_verified/phone_verified/phone_otp_last_sent_at are system-set and '
        'cannot be changed by a non-privileged client (database.md §1)';
    end if;
  end if;

  return new;
end;
$$;
