import React, { useEffect, useState } from "react";
import QRCode from "qrcode";

interface QRGeneratorProps {
  value: string;
  className?: string;
}

export default function QRGenerator({ value, className = "w-full h-full" }: QRGeneratorProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(
      value || "empty",
      {
        margin: 1,
        width: 256,
        color: {
          dark: "#1c1a18",  // Clean deep charcoal
          light: "#faf9f5", // Soft cream off-white background
        },
      },
      (err, url) => {
        if (err) {
          console.error("QR Code generation error:", err);
          if (active) setError("Failed to generate QR");
          return;
        }
        if (active) {
          setQrDataUrl(url);
        }
      }
    );

    return () => {
      active = false;
    };
  }, [value]);

  if (error) {
    return (
      <div className={`flex items-center justify-center text-[10px] text-red-500 font-mono bg-red-50 border border-red-100 rounded p-1 ${className}`}>
        {error}
      </div>
    );
  }

  if (!qrDataUrl) {
    return (
      <div className={`bg-gray-100 rounded animate-pulse flex items-center justify-center ${className}`}>
        <span className="text-[10px] text-gray-400 font-mono">Generating QR...</span>
      </div>
    );
  }

  return (
    <img
      src={qrDataUrl}
      alt={`QR Code for ${value}`}
      className={`${className} object-contain`}
      referrerPolicy="no-referrer"
    />
  );
}
