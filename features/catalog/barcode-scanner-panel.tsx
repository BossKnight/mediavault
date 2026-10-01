"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader } from "@/components/ui/icons";
import type { MediaType, UnifiedSearchResult } from "@/types/media";

// EAN-13 covers both general product barcodes and ISBN-13 (its "Bookland"
// 978/979 prefix); EAN-8/UPC-A/UPC-E round out what's actually printed on
// physical media and books.
const BARCODE_FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e"];

interface BarcodeScannerPanelProps {
  mediaType: MediaType;
  onResults: (results: UnifiedSearchResult[]) => void;
  onBack: () => void;
}

/**
 * The camera/manual-entry barcode scan step. Rendered as a step inside
 * AddItemModal's single dialog rather than its own nested Dialog (see
 * AddItemModal for why). AddItemModal mounts this fresh each time the
 * step is entered and unmounts it on leaving, so "start the camera on
 * mount, stop it on unmount" is this component's whole lifecycle — no
 * open/close prop needed.
 */
export function BarcodeScannerPanel({ mediaType, onResults, onBack }: BarcodeScannerPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resolvedRef = useRef(false);

  // Computed once on mount: this panel only mounts after a user clicks
  // "Scan barcode", so it never renders on the server.
  const [cameraSupported] = useState(() => Boolean(window.BarcodeDetector));
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [looking, setLooking] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [cameraState, setCameraState] = useState<"starting" | "scanning" | "stopped">("starting");
  const manualCodeId = useId();

  function stopCamera() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  // Bumped whenever a camera session starts or the panel unmounts, so a
  // getUserMedia call that resolves late (unmount, React's dev double-mount,
  // or a newer "Scan again") can tell it's stale and release its stream.
  const cameraSessionRef = useRef(0);

  function startCamera() {
    if (!window.BarcodeDetector) return;

    const session = ++cameraSessionRef.current;
    const detector = new window.BarcodeDetector({ formats: BARCODE_FORMATS });

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        if (session !== cameraSessionRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setCameraState("scanning");

        intervalRef.current = setInterval(async () => {
          if (resolvedRef.current || !videoRef.current) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            const code = barcodes[0]?.rawValue;
            if (code && !resolvedRef.current) {
              resolvedRef.current = true;
              stopCamera();
              setCameraState("stopped");
              void performLookup(code);
            }
          } catch {
            // A transient decode failure on one frame isn't worth surfacing;
            // the loop just tries again on the next frame.
          }
        }, 400);
      })
      .catch(() => {
        if (session === cameraSessionRef.current) {
          setCameraError("Camera access wasn't available. Enter the barcode number below instead.");
        }
      });
  }

  function endCameraSession() {
    cameraSessionRef.current++;
    stopCamera();
  }

  useEffect(() => {
    if (cameraSupported) startCamera();

    return endCameraSession;
    // Runs once per mount by design; see the component doc comment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The camera stops once a code is read, and isn't restarted automatically
  // after a failed lookup: it would immediately re-read the same barcode.
  function handleScanAgain() {
    setLookupError(null);
    setCameraState("starting");
    startCamera();
  }

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
    <div className="flex flex-col gap-4">
      {cameraSupported && !cameraError && (
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
          <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
          <div className="pointer-events-none absolute inset-8 rounded-lg border-2 border-white/70" />
          {looking && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 text-sm text-white">
              <Loader className="h-4 w-4" />
              Looking that up...
            </div>
          )}
          {cameraState === "stopped" && !looking && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70">
              <Button type="button" variant="secondary" onClick={handleScanAgain}>
                Scan again
              </Button>
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

      {cameraError && (
        <p role="alert" className="text-sm text-danger">
          {cameraError}
        </p>
      )}

      <form onSubmit={handleManualSubmit} className="flex flex-col gap-2">
        <div className="flex flex-col gap-1.5 text-sm">
          <label htmlFor={manualCodeId} className="font-medium text-surface-foreground">
            Or enter the barcode number
          </label>
          <div className="flex gap-2">
            <Input
              id={manualCodeId}
              value={manualCode}
              onChange={(event) => setManualCode(event.target.value)}
              placeholder="e.g. 9780261103573"
              inputMode="numeric"
              className="flex-1"
              autoFocus
            />
            <Button type="submit" disabled={!manualCode.trim() || looking}>
              {looking ? "Looking up..." : "Look up"}
            </Button>
          </div>
        </div>
      </form>

      {lookupError && (
        <p role="alert" className="text-sm text-danger">
          {lookupError}
        </p>
      )}

      <Button type="button" variant="secondary" onClick={onBack} disabled={looking}>
        Back
      </Button>
    </div>
  );
}
