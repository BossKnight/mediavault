"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader } from "@/components/ui/icons";
import type { MediaType, UnifiedSearchResult } from "@/types/media";

// EAN-13 covers both general product barcodes and ISBN-13 (its "Bookland"
// 978/979 prefix); EAN-8/UPC-A/UPC-E round out what's actually printed on
// physical media and books.
const BARCODE_FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e"];

interface BarcodeScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaType: MediaType;
  onResults: (results: UnifiedSearchResult[]) => void;
}

/**
 * Camera barcode scanning via the browser-native BarcodeDetector API, with
 * an always-present manual entry field as the fallback — both because not
 * every browser supports BarcodeDetector (notably Safari and Firefox) and
 * because camera permission can always be denied. A book's ISBN resolves
 * on its own; any other code needs the modal's currently-selected media
 * type to know what to search for once it resolves to a product name.
 */
export function BarcodeScannerModal({
  open,
  onOpenChange,
  mediaType,
  onResults,
}: BarcodeScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resolvedRef = useRef(false);

  const [cameraSupported, setCameraSupported] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [looking, setLooking] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  function stopCamera() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  useEffect(() => {
    if (!open) {
      stopCamera();
      return;
    }

    resolvedRef.current = false;
    setCameraError(null);
    setLookupError(null);
    setManualCode("");

    if (!("BarcodeDetector" in window) || !window.BarcodeDetector) {
      setCameraSupported(false);
      return;
    }
    setCameraSupported(true);

    let cancelled = false;
    const detector = new window.BarcodeDetector({ formats: BARCODE_FORMATS });

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }

        intervalRef.current = setInterval(async () => {
          if (resolvedRef.current || !videoRef.current) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            const code = barcodes[0]?.rawValue;
            if (code && !resolvedRef.current) {
              resolvedRef.current = true;
              stopCamera();
              void performLookup(code);
            }
          } catch {
            // A transient decode failure on one frame isn't worth surfacing
            // — the loop just tries again on the next frame.
          }
        }, 400);
      })
      .catch(() => {
        if (!cancelled) {
          setCameraError("Camera access wasn't available. Enter the barcode number below instead.");
        }
      });

    return () => {
      cancelled = true;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function performLookup(code: string) {
    setLooking(true);
    setLookupError(null);

    try {
      const response = await fetch(
        `/api/barcode?code=${encodeURIComponent(code)}&type=${mediaType.toLowerCase()}`,
      );
      const data = await response.json();

      if (!response.ok) {
        setLookupError(data.error ?? "Couldn't look up that barcode.");
        return;
      }
      if (!data.results || data.results.length === 0) {
        setLookupError("No match found for that barcode. Try searching by title instead.");
        return;
      }

      onResults(data.results as UnifiedSearchResult[]);
      onOpenChange(false);
    } catch {
      setLookupError("Couldn't look up that barcode. Check your connection and try again.");
    } finally {
      setLooking(false);
      resolvedRef.current = false;
    }
  }

  function handleManualSubmit(event: React.FormEvent) {
    event.preventDefault();
    const code = manualCode.trim();
    if (!code || looking) return;
    void performLookup(code);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Scan a barcode"
        description="Scan a book's ISBN, or a movie, show, or game's barcode."
      >
        <div className="flex flex-col gap-4">
          {cameraSupported && !cameraError && (
            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
              <video
                ref={videoRef}
                muted
                playsInline
                className="h-full w-full object-cover"
              />
              <div className="pointer-events-none absolute inset-8 rounded-lg border-2 border-white/70" />
              {looking && (
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 text-sm text-white">
                  <Loader className="h-4 w-4" />
                  Looking that up...
                </div>
              )}
            </div>
          )}

          {!cameraSupported && (
            <p className="text-sm text-muted-foreground">
              Live camera scanning isn&rsquo;t available in this browser. Enter the barcode
              number below instead.
            </p>
          )}

          {cameraError && <p className="text-sm text-danger">{cameraError}</p>}

          <form onSubmit={handleManualSubmit} className="flex flex-col gap-2">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-surface-foreground">
                Or enter the barcode number
              </span>
              <div className="flex gap-2">
                <Input
                  value={manualCode}
                  onChange={(event) => setManualCode(event.target.value)}
                  placeholder="e.g. 9780261103573"
                  inputMode="numeric"
                  className="flex-1"
                />
                <Button type="submit" disabled={!manualCode.trim() || looking}>
                  {looking ? "Looking up..." : "Look up"}
                </Button>
              </div>
            </label>
          </form>

          {lookupError && <p className="text-sm text-danger">{lookupError}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
