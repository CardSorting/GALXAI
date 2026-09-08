"use client";
import { useEffect, useState } from 'react';
export function LiveStatusDashboard() {
  const [status, setStatus] = useState('Checking availability');
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/health', { cache: 'no-store', signal: controller.signal })
      .then(response => { setStatus(response.ok ? 'GALX API is reachable' : 'Temporarily unavailable'); })
      .catch(() => { if (!controller.signal.aborted) setStatus('Unable to check availability'); });
    return () => controller.abort();
  }, []);
  return <section className="glass-panel rounded-3xl p-8 space-y-4"><h2 className="text-2xl font-bold">Service availability</h2><p role="status">{status}</p><p>Availability checks do not guarantee that every generation request will succeed. Follow the error guidance returned with your request.</p></section>;
}
