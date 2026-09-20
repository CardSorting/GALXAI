import { permanentRedirect } from 'next/navigation';

/** The former token-economics calculator advertised unsupported public terms. */
export default function CalculatorPage() {
  permanentRedirect('/');
}
