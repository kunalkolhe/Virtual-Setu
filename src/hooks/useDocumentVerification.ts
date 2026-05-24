import { useState, useCallback } from 'react';
import { verifyDocument, VerificationResult } from '@/lib/groqVerify';

export type VerificationState = 'idle' | 'verifying' | 'success' | 'error';

interface UseDocumentVerificationReturn {
  verify: (file: File, selectedType: string) => Promise<VerificationResult | null>;
  state: VerificationState;
  result: VerificationResult | null;
  reset: () => void;
}

export function useDocumentVerification(): UseDocumentVerificationReturn {
  const [state, setState] = useState<VerificationState>('idle');
  const [result, setResult] = useState<VerificationResult | null>(null);

  const verify = useCallback(async (
    file: File,
    selectedType: string
  ): Promise<VerificationResult | null> => {
    setState('verifying');
    setResult(null);

    try {
      const verificationResult = await verifyDocument(file, selectedType);
      setResult(verificationResult);
      setState(verificationResult.isValid ? 'success' : 'error');
      return verificationResult;
    } catch (err) {
      console.error('Document verification error:', err);
      const fallback: VerificationResult = {
        isValid: false,
        detectedType: 'Unknown',
        message: err instanceof Error
          ? err.message
          : 'Verification failed. Please try again.',
      };
      setResult(fallback);
      setState('error');
      return fallback;
    }
  }, []);

  const reset = useCallback(() => {
    setState('idle');
    setResult(null);
  }, []);

  return { verify, state, result, reset };
}
