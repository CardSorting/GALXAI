import { Navigation } from '@/components/dashboard/Navigation';
export function RateLimitsClient() {
  return <div><Navigation /><main className="max-w-4xl mx-auto p-8 space-y-6">
    <h1 className="text-3xl font-bold">Rate limits</h1>
    <p>Your plan determines your usage allowance. Check your account for current usage.</p>
    <p>A rate-limited request returns HTTP 429. Reduce concurrent requests and wait for the Retry-After interval when supplied.</p>
    <p>Do not automatically repeat image requests after an uncertain outcome. Check the request status or contact support with the request ID.</p>
  </main></div>;
}
