import React, { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { motion } from "motion/react";
import { AlertCircle, Camera, RefreshCw } from "lucide-react";

interface ScannerProps {
  onScan: (data: string) => void;
}

export default function Scanner({ onScan }: ScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    // Create new scanner instance
    const scanner = new Html5QrcodeScanner(
      "reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ]
      },
      /* verbose= */ false
    );

    const onScanSuccess = (decodedText: string) => {
      onScan(decodedText);
      // Optional: Stop scanner after success or keep it going? 
      // We'll keep it for multiple scans if needed, or user can navigate away.
    };

    const onScanFailure = (error: string) => {
      // Just a warning, not critical
      // console.warn(`Code scan error = ${error}`);
    };

    scanner.render(onScanSuccess, onScanFailure);
    scannerRef.current = scanner;

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => {
           console.error("Failed to clear scanner", err);
        });
      }
    };
  }, [onScan]);

  return (
    <div className="flex h-full flex-col items-center justify-center p-4">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border-4 border-brand/50 bg-slate-900 shadow-2xl ring-1 ring-brand/20">
        <div id="reader" className="w-full"></div>
      </div>

      <div className="mt-8 max-w-xs text-center space-y-4">
        <div className="flex items-center justify-center gap-2 text-brand">
          <Camera className="h-5 w-5" />
          <h3 className="text-xl font-bold text-white">Smart QR Scanner</h3>
        </div>
        <p className="text-sm text-slate-500">
          Mount the tablet facing the repair station. Position the item's label inside the square to auto-identify the part.
        </p>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 flex items-center gap-3 rounded-xl bg-red-950/20 px-6 py-4 ring-1 ring-red-900/50"
        >
          <AlertCircle className="h-5 w-5 text-red-500" />
          <p className="text-sm font-medium text-red-400">{error}</p>
        </motion.div>
      )}

      {/* Override html5-qrcode styles to match our theme */}
      <style>{`
        #reader { border: none !important; }
        #reader__dashboard_section_csr button {
          background-color: #3b82f6 !important;
          color: white !important;
          border: none !important;
          padding: 8px 16px !important;
          border-radius: 8px !important;
          font-weight: 600 !important;
          cursor: pointer !important;
          margin: 5px !important;
        }
        #reader__dashboard_section_csr button:hover {
          background-color: #2563eb !important;
        }
        #reader__scan_region video {
          border-radius: 12px !important;
          object-fit: cover !important;
        }
        #reader__status_span {
          color: #94a3b8 !important;
          font-size: 12px !important;
        }
      `}</style>
    </div>
  );
}
