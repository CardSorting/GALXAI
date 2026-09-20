import { permanentRedirect } from 'next/navigation';

/**
 * The former grant page advertised an unapproved credit program and access path.
 * Keep the historical component for reference, but remove the stale public offer.
 */
export default function GrantsPage() {
  permanentRedirect('/');
}
