'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bookmark, ArrowRight, X } from 'lucide-react';
import { SAVED_WORKS_EVENT } from '@/lib/collections/saved-works';

export function CurationToast() {
  const [toast, setToast] = useState<{ id: string; message: string; isSaved: boolean } | null>(null);

  useEffect(() => {
    const handleSaveEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string; isSaved: boolean }>;
      if (customEvent.detail) {
        setToast({
          id: customEvent.detail.id,
          isSaved: customEvent.detail.isSaved,
          message: customEvent.detail.isSaved
            ? 'Saved to your Collection'
            : 'Removed from your Collection',
        });
      }
    };

    window.addEventListener(SAVED_WORKS_EVENT, handleSaveEvent);
    return () => window.removeEventListener(SAVED_WORKS_EVENT, handleSaveEvent);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 18px',
        borderRadius: '10px',
        background: 'rgba(13, 16, 28, 0.95)',
        border: '1px solid rgba(251, 191, 36, 0.3)',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.5), 0 0 20px rgba(251, 191, 36, 0.1)',
        backdropFilter: 'blur(16px)',
        color: '#f3f4f6',
        fontSize: '13px',
        fontWeight: 500,
        animation: 'curation-toast-in 0.24s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <Bookmark
        size={16}
        style={{
          color: toast.isSaved ? '#fbbf24' : '#9ca3af',
          fill: toast.isSaved ? '#fbbf24' : 'none',
          flexShrink: 0,
        }}
      />
      <span>{toast.message}</span>
      {toast.isSaved && (
        <Link
          href="/collections"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            color: '#fbbf24',
            fontWeight: 600,
            fontSize: '12px',
            textDecoration: 'none',
            marginLeft: '4px',
          }}
        >
          View <ArrowRight size={12} />
        </Link>
      )}
      <button
        type="button"
        onClick={() => setToast(null)}
        aria-label="Dismiss notification"
        style={{
          background: 'none',
          border: 'none',
          color: '#9ca3af',
          cursor: 'pointer',
          padding: '2px',
          marginLeft: '4px',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
