'use client';
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function ReceiveCodePage() {
  const params = useParams();
  const router = useRouter();
  const code = (params?.code as string || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);

  useEffect(() => {
    if (code.length === 5) {
      // Store code in sessionStorage then redirect to receive page
      sessionStorage.setItem('voiddrop_code', code);
      router.replace('/receive');
    } else {
      router.replace('/receive');
    }
  }, [code, router]);

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid rgba(155,48,255,0.2)', borderTop: '3px solid #9b30ff', animation: 'spin 1s linear infinite' }} />
      <p style={{ color: '#c084fc', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.9rem' }}>Joining session {code}…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}
