import { NextRequest } from 'next/server';
import { AccountIdentityError, requireAccountIdentity } from '@/lib/auth/accountIdentity';
import { readSessionBody, requireSessionMutation, SessionAccessError, sessionResponse } from '@/lib/auth/session-http';
import {
  AccountProfileConflictError,
  AccountProfileNotFoundError,
  AccountProfileRepository,
  type AccountProfileDto,
} from '@/lib/supabase/repositories/AccountProfileRepository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const locales = new Set(['en', 'es', 'zh', 'ja', 'de', 'fr', 'pt', 'ko', 'ar']);

function validTimezone(value: string): boolean {
  if (value.length < 1 || value.length > 80) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

/** Re-project repository output at the HTTP boundary; never forward objects wholesale. */
function publicProfile(profile: AccountProfileDto) {
  return {
    displayName: profile.displayName,
    locale: profile.locale,
    timezone: profile.timezone,
    revision: profile.revision,
  };
}

function publicError(error: unknown) {
  if (error instanceof AccountIdentityError || error instanceof SessionAccessError) {
    return sessionResponse({ error: error.message }, error.status);
  }
  if (error instanceof AccountProfileConflictError) {
    return sessionResponse({ error: 'Your profile changed in another tab. Refresh and try again.' }, 409);
  }
  if (error instanceof AccountProfileNotFoundError) {
    return sessionResponse({ error: 'Profile is not available. Try again shortly.' }, 404);
  }
  return sessionResponse({ error: 'Profile is temporarily unavailable. Try again shortly.' }, 503);
}

export async function GET(request: NextRequest) {
  try {
    const actor = await requireAccountIdentity(request);
    const profile = await AccountProfileRepository.getInstance().get(actor.id, actor.id, actor.name);
    return sessionResponse({ profile: publicProfile(profile) });
  } catch (error) {
    return publicError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    requireSessionMutation(request);
    const actor = await requireAccountIdentity(request);
    const body = await readSessionBody(request);

    const expectedRevision = Number(body.revision);
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1) {
      return sessionResponse({ error: 'Refresh your profile before saving changes.' }, 400);
    }

    const rawName = body.displayName;
    const displayName = rawName === null || rawName === undefined
      ? null
      : typeof rawName === 'string' && rawName.trim().length > 0
        ? rawName.trim()
        : rawName === ''
          ? null
          : undefined;
    const locale = typeof body.locale === 'string' ? body.locale : '';
    const timezone = typeof body.timezone === 'string' ? body.timezone.trim() : '';
    if (displayName === undefined || (displayName !== null && displayName.length > 120)) {
      return sessionResponse({ error: 'Use a display name between 1 and 120 characters.' }, 400);
    }
    if (!locales.has(locale) || !validTimezone(timezone)) {
      return sessionResponse({ error: 'Choose a supported language and time zone.' }, 400);
    }

    const profile = await AccountProfileRepository.getInstance().update({
      ownerKey: actor.id,
      expectedRevision,
      displayName,
      locale,
      timezone,
    });
    return sessionResponse({ profile: publicProfile(profile) });
  } catch (error) {
    return publicError(error);
  }
}
