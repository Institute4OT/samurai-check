// lib/hooks/useResolvedRidEmail.ts
'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

/** URL → localStorage → なし、の順で rid / email を復元します */
export function useResolvedRidEmail() {
  const sp = useSearchParams();
  const ridQ =
    sp.get('resultId') ||
    sp.get('result') ||
    sp.get('rid') ||
    sp.get('id') ||
    '';
  const emailQ = sp.get('email') || '';

  const [rid, setRid] = useState('');
  const [email, setEmail] = useState('');
  const [ridLocked, setRidLocked] = useState(false);

  useEffect(() => {
    const ridStored =
      localStorage.getItem('samurai:lastRid') ||
      localStorage.getItem('samurai_last_rid') ||
      sessionStorage.getItem('samurai:lastRid') ||
      '';

    const emailStored = localStorage.getItem('samurai:lastEmail') || '';

    const ridFinal = ridQ || ridStored || '';
    const emailFinal = emailQ || emailStored || '';

    setRid(ridFinal);
    setEmail(emailFinal);
    setRidLocked(Boolean(ridQ));

    if (ridQ) localStorage.setItem('samurai:lastRid', ridQ);
    if (emailQ) localStorage.setItem('samurai:lastEmail', emailQ);
  }, [ridQ, emailQ]);

  return { rid, setRid, ridLocked, email, setEmail };
}
