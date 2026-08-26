// ISBN-10/13 validation, used to tell a book's barcode apart from a
// general product UPC/EAN when a scan comes in with no media type hint.

/** Strips everything but digits and the ISBN-10 check character "X". */
function clean(code: string): string {
  return code.replace(/[^0-9Xx]/g, "").toUpperCase();
}

export function isValidIsbn10(code: string): boolean {
  const isbn = clean(code);
  if (isbn.length !== 10) return false;

  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const char = isbn[i];
    const value = char === "X" ? 10 : Number(char);
    if (Number.isNaN(value)) return false;
    sum += value * (10 - i);
  }
  return sum % 11 === 0;
}

export function isValidIsbn13(code: string): boolean {
  const isbn = clean(code);
  if (!/^\d{13}$/.test(isbn)) return false;

  let sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += Number(isbn[i]) * (i % 2 === 0 ? 1 : 3);
  }
  return sum % 10 === 0;
}

/**
 * Whether a scanned barcode is a book's ISBN rather than a general product
 * UPC/EAN. An ISBN-13 is itself an EAN-13 with a 978/979 "Bookland" prefix,
 * so it's what actually reaches a barcode scanner in practice; ISBN-10 is
 * included too since it's still what's printed on many older books' pages
 * (a manual-entry path can end up with either).
 */
export function isIsbn(code: string): boolean {
  const cleaned = clean(code);
  if (cleaned.length === 13) {
    return (cleaned.startsWith("978") || cleaned.startsWith("979")) && isValidIsbn13(cleaned);
  }
  if (cleaned.length === 10) {
    return isValidIsbn10(cleaned);
  }
  return false;
}
