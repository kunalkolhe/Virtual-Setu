import React, { useEffect, useState } from 'react';
import QRCodeLib from 'qrcode';

interface QRCodeProps {
  data: string;
  size?: number;
  className?: string;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

export default function QRCode({
  data,
  size = 128,
  className = '',
  errorCorrectionLevel = 'M',
}: QRCodeProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const generateQRCode = async () => {
      setLoading(true);
      setError(null);
      try {
        // Always render the bitmap at high resolution so it stays sharp
        // and remains scannable even when displayed at small sizes
        // (e.g. on a printed / downloaded ID card).
        const renderSize = Math.max(size * 6, 512);

        const url = await QRCodeLib.toDataURL(data, {
          width: renderSize,
          margin: 2,
          errorCorrectionLevel,
          color: { dark: '#000000', light: '#FFFFFF' },
        });
        if (!cancelled) setQrCodeUrl(url);
      } catch (e) {
        console.error('Error generating QR code:', e);
        if (!cancelled) setError('Failed to generate QR');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (data) {
      generateQRCode();
    } else {
      setLoading(false);
      setError('No data');
    }

    return () => {
      cancelled = true;
    };
  }, [data, size, errorCorrectionLevel]);

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center bg-white rounded ${className}`}
        style={{ width: size, height: size }}
      >
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !qrCodeUrl) {
    return (
      <div
        className={`flex items-center justify-center bg-white text-[8px] text-red-600 text-center p-1 rounded ${className}`}
        style={{ width: size, height: size }}
        title={error || 'QR error'}
      >
        QR unavailable
      </div>
    );
  }

  return (
    <img
      src={qrCodeUrl}
      alt="QR Code"
      className={`rounded ${className}`}
      style={{
        width: size,
        height: size,
        // Keep QR modules crisp at any display size
        imageRendering: 'pixelated',
      }}
    />
  );
}
