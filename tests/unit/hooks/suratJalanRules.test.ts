import { describe, it, expect } from "vitest";
import {
  cleanDocNo,
  getSjTarget,
  hasValue,
  isIgnoredSuratJalan,
} from "@/features/spb/suratJalanRules";

describe("isIgnoredSuratJalan", () => {
  it.each(["1", "2", 1, 2, " 1 "])("mengabaikan Surat Jalan no %s", (no) => {
    expect(isIgnoredSuratJalan(no)).toBe(true);
  });

  it.each(["3", 3, "4", "10", "12", "SJ-001", "", null, undefined])(
    "memproses Surat Jalan no %s",
    (no) => {
      expect(isIgnoredSuratJalan(no)).toBe(false);
    },
  );
});

describe("hasValue", () => {
  it.each([null, undefined, "", "   "])("menganggap %j sebagai kosong", (v) => {
    expect(hasValue(v)).toBe(false);
  });
  it.each([0, 1, "5", "abc"])("menganggap %j sebagai terisi", (v) => {
    expect(hasValue(v)).toBe(true);
  });
});

describe("cleanDocNo", () => {
  it.each([null, undefined, "", "  ", "-", "null", "NULL", "undefined"])(
    "mengubah %j menjadi null (tanpa nomor)",
    (v) => {
      expect(cleanDocNo(v)).toBeNull();
    },
  );

  it("mempertahankan nomor valid (dan memangkas spasi)", () => {
    expect(cleanDocNo("PO-123")).toBe("PO-123");
    expect(cleanDocNo("63#R1")).toBe("63#R1");
    expect(cleanDocNo(" 10 REV ")).toBe("10 REV");
    expect(cleanDocNo(34)).toBe("34");
  });
});

describe("getSjTarget — penentuan card tujuan Surat Jalan", () => {
  it("punya id_spb -> card SPB (walau juga punya id_po)", () => {
    expect(getSjTarget({ id_spb: 5, id_po: null })).toBe("spb");
    expect(getSjTarget({ id_spb: 5, id_po: 9 })).toBe("spb");
  });

  it("tanpa id_spb, punya id_po -> card PO", () => {
    expect(getSjTarget({ id_spb: null, id_po: 9 })).toBe("po");
    expect(getSjTarget({ id_po: 9 })).toBe("po");
  });

  it("tanpa id_spb dan id_po -> card Surat Jalan", () => {
    expect(getSjTarget({ id_spb: null, id_po: null })).toBe("sj");
    expect(getSjTarget({})).toBe("sj");
  });
});