import { describe, expect, it } from "vitest";
import { isIsbn, isValidIsbn10, isValidIsbn13 } from "@/lib/isbn";

// Synthetic but checksum-correct ISBNs, not real published books — what
// matters here is that the check digit actually validates.
describe("isValidIsbn10", () => {
  it("accepts a code with a correct check digit", () => {
    expect(isValidIsbn10("0345275608")).toBe(true);
  });

  it("accepts a check digit of X", () => {
    expect(isValidIsbn10("000000006X")).toBe(true);
  });

  it("rejects a bad check digit", () => {
    expect(isValidIsbn10("0345275601")).toBe(false);
  });

  it("rejects the wrong length", () => {
    expect(isValidIsbn10("12345")).toBe(false);
  });
});

describe("isValidIsbn13", () => {
  it("accepts a code with a correct check digit", () => {
    expect(isValidIsbn13("9780345275608")).toBe(true);
  });

  it("rejects a bad check digit", () => {
    expect(isValidIsbn13("9780345275601")).toBe(false);
  });

  it("rejects a non-numeric code", () => {
    expect(isValidIsbn13("978034527560X")).toBe(false);
  });
});

describe("isIsbn", () => {
  it("recognizes a valid ISBN-13 with the 978 Bookland prefix", () => {
    expect(isIsbn("9780345275608")).toBe(true);
  });

  it("recognizes a valid ISBN-13 with the 979 Bookland prefix", () => {
    // 979 is real (mostly used for sheet music and newer books).
    expect(isIsbn("9791234567896")).toBe(true);
  });

  it("recognizes a valid ISBN-10", () => {
    expect(isIsbn("0345275608")).toBe(true);
  });

  it("rejects a checksum-valid EAN-13 that isn't a Bookland code", () => {
    // A real product UPC padded to EAN-13 with a correct check digit —
    // still not a book, since it doesn't start with 978/979.
    expect(isIsbn("0012345678905")).toBe(false);
  });

  it("rejects a 978-prefixed code with a bad check digit", () => {
    expect(isIsbn("9780345275601")).toBe(false);
  });

  it("rejects a code that's neither 10 nor 13 digits", () => {
    expect(isIsbn("12345")).toBe(false);
  });
});
