// The Barcode Detection API isn't in TypeScript's bundled DOM lib yet
// (Chromium/Edge/Android Chrome support it; Safari and Firefox don't — the
// scanner modal feature-detects at runtime and always offers manual entry
// as a fallback). Minimal ambient types for just what the scanner uses.

interface DetectedBarcode {
  rawValue: string;
  format: string;
}

interface BarcodeDetectorOptions {
  formats?: string[];
}

declare class BarcodeDetector {
  constructor(options?: BarcodeDetectorOptions);
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}

interface Window {
  BarcodeDetector?: typeof BarcodeDetector;
}
