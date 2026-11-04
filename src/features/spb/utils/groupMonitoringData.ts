// src/features/spb/utils/groupMonitoringData.ts
import type { SPBDocumentGroup } from "../../../shared/types";
import {
  filterVisibleSpbRows,
  isRestrictedSpbStatus,
  toSafeExternalUrl,
} from "../accessRules";
import {
  cleanDocNo,
  getSjTarget,
  isIgnoredSuratJalan,
  toIdNumber,
} from "../suratJalanRules";
import { getSortNumber, toStrOrNull } from "./statusHelpers";
import { buildPoOverrideKey, buildSpbOverrideKey } from "./titleOverrides";

interface InternalGroup {
  data: SPBDocumentGroup;
  hasAnyPO: boolean;
  hasAnyArrival: boolean;
  hasAnyBelumDiproses: boolean;
  hasAnySudahDiproses: boolean;
  latestTimestamp: number;
  poSet: Set<string>;
  completedItems: number;
  itemNames: Set<string>;
  firstItemName: string | null;
}

const buildSpbGroupKey = (
  spbNo: string | null,
  spbTitle: string | null,
  fallbackId: unknown,
): string =>
  spbNo
    ? `SPB_${spbNo}::${spbTitle ?? ""}`
    : `SPB_ID_${fallbackId ?? "UNKNOWN"}`;

/**
 * Judul fallback untuk PO agar card PO tidak pernah kosong walau judul_po NULL di DB.
 *
 * Urutan prioritas:
 *   1. Override manual dari user (localStorage)
 *   2. Kolom judul_po dari DB
 *   3. Judul SPB pasangannya (jika PO ini menempel ke SPB)
 *   4. Nama barang pertama di PO ini
 *   5. "PO {no_po}" sebagai penutup
 */
export const resolvePoTitle = (
  poNo: string | null,
  rawPoTitle: string | null,
  overrideValue: string | undefined,
  spbTitle: string | null,
  firstItemName: string | null,
): string | null => {
  if (overrideValue !== undefined) return overrideValue;
  if (rawPoTitle) return rawPoTitle;
  if (spbTitle) return spbTitle;
  if (firstItemName) return firstItemName;
  if (poNo) return `PO ${poNo}`;
  return null;
};

const updateLatestDate = (group: InternalGroup, dateStr: string | null) => {
  if (!dateStr) return;
  const time = new Date(dateStr).getTime();
  if (!isNaN(time) && time > group.latestTimestamp) {
    group.latestTimestamp = time;
    group.data.date = dateStr;
  }
};

const getGroupStatusWeight = (status: string): number => {
  if (status === "Belum Diproses") return 0;
  if (status === "Sudah PO" || status === "Belum PO") return 1;
  if (status === "Datang") return 2;
  if (status === "Selesai") return 3;
  return 4;
};

export interface GroupMonitoringInput {
  allSpbData: any[];
  poData: any[];
  sjData: any[];
  canViewRestricted: boolean;
  overrides: Record<string, string>;
}

/**
 * Mengelompokkan baris mentah SPB, PO, dan Surat Jalan menjadi daftar card `SPBDocumentGroup[]`.
 */
export const groupMonitoringData = ({
  allSpbData,
  poData,
  sjData,
  canViewRestricted,
  overrides,
}: GroupMonitoringInput): SPBDocumentGroup[] => {
  // 1. Terapkan aturan akses: sembunyikan SPB "belum di proses" untuk user belum login
  const spbData = filterVisibleSpbRows(allSpbData, canViewRestricted);
  const hiddenSpbIds = new Set<number>();
  if (!canViewRestricted) {
    allSpbData.forEach((s: any) => {
      if (isRestrictedSpbStatus(s.status)) {
        const id = toIdNumber(s.id);
        if (id !== null) hiddenSpbIds.add(id);
      }
    });
  }

  // 2. Normalisasi judul SPB per no_spb
  const titleBySpbNo = new Map<string, string>();
  spbData.forEach((row: any) => {
    const no = toStrOrNull(row.no_spb);
    const t = toStrOrNull(row.judul_spb);
    if (no && t && !titleBySpbNo.has(no)) titleBySpbNo.set(no, t);
  });

  // 3. Index id SPB & PO (number-keyed)
  const spbById = new Map<number, any>();
  spbData.forEach((s: any) => {
    const id = toIdNumber(s.id);
    if (id !== null) spbById.set(id, s);
  });

  const poBySpbId = new Map<number, any[]>();
  const poById = new Map<number, any>();
  poData.forEach((p: any) => {
    const poIdNum = toIdNumber(p.id);
    if (poIdNum !== null) poById.set(poIdNum, p);
    const idSpb = toIdNumber(p.id_spb);
    if (idSpb !== null) {
      if (!poBySpbId.has(idSpb)) poBySpbId.set(idSpb, []);
      poBySpbId.get(idSpb)!.push(p);
    }
  });

  const groups = new Map<string, InternalGroup>();

  // 4. Proses baris SPB
  spbData.forEach((row: any) => {
    const spbNo = toStrOrNull(row.no_spb);
    const rawTitle = toStrOrNull(row.judul_spb);
    const spbTitleRaw =
      rawTitle ?? (spbNo ? titleBySpbNo.get(spbNo) ?? null : null);
    const key = buildSpbGroupKey(spbNo, spbTitleRaw, row.id);

    const overrideKey = spbNo ? buildSpbOverrideKey(spbNo, spbTitleRaw) : null;
    const spbOverride = overrideKey ? overrides[overrideKey] : undefined;

    if (!groups.has(key)) {
      groups.set(key, {
        data: {
          id: key,
          spbNo,
          spbTitle:
            spbOverride !== undefined ? spbOverride : spbTitleRaw || null,
          poNo: null,
          poTitle: null,
          date: "-",
          itemsCount: 0,
          sortNumber: getSortNumber(spbNo),
          status: "Belum PO",
        },
        hasAnyPO: false,
        hasAnyArrival: false,
        hasAnyBelumDiproses: false,
        hasAnySudahDiproses: false,
        latestTimestamp: 0,
        poSet: new Set<string>(),
        completedItems: 0,
        itemNames: new Set<string>(),
        firstItemName: null,
      });
    }

    const group = groups.get(key)!;
    if (!group.data.spbTitle && spbTitleRaw) {
      group.data.spbTitle =
        spbOverride !== undefined ? spbOverride : spbTitleRaw;
    }
    if (!group.data.spbSourceFile) {
      group.data.spbSourceFile = toSafeExternalUrl(row.source_file);
    }
    const parentPoId = toIdNumber(row.id_po);
    if (!group.data.poSourceFile && parentPoId !== null) {
      group.data.poSourceFile = toSafeExternalUrl(
        poById.get(parentPoId)?.source_file,
      );
    }
    group.data.itemsCount += 1;

    const itemName = toStrOrNull(row.nama_barang_spb);
    if (itemName) {
      group.itemNames.add(itemName);
      if (!group.firstItemName) group.firstItemName = itemName;
    }

    updateLatestDate(group, row.tgl_spb);

    const rowStatus = toStrOrNull(row.status)?.toLowerCase() || "";
    if (rowStatus === "belum di proses") {
      group.hasAnyBelumDiproses = true;
    } else if (rowStatus === "sudah di proses") {
      group.hasAnySudahDiproses = true;
    }

    const req = row.qty_permintaan || 0;
    const arr = row.material_datang_qty || 0;
    const isArrived = !!row.material_datang_tgl;

    if (isArrived) {
      group.hasAnyArrival = true;
      updateLatestDate(group, row.material_datang_tgl);
      if (arr >= req) group.completedItems += 1;
    }

    const joinedPo = Array.isArray(row.po) ? row.po[0] : row.po;
    if (joinedPo && cleanDocNo(joinedPo.no_po)) {
      group.poSet.add(String(cleanDocNo(joinedPo.no_po)));
      group.hasAnyPO = true;
      updateLatestDate(group, joinedPo.tanggal_po);
    }

    const spbIdNum = toIdNumber(row.id);
    const linkedPos =
      spbIdNum !== null ? poBySpbId.get(spbIdNum) || [] : [];
    linkedPos.forEach((p: any) => {
      if (cleanDocNo(p.no_po)) {
        if (!group.data.poSourceFile) {
          group.data.poSourceFile = toSafeExternalUrl(p.source_file);
        }
        group.poSet.add(String(cleanDocNo(p.no_po)));
        group.hasAnyPO = true;
        updateLatestDate(group, p.tanggal_po);
      }
    });
  });

  // 5. Proses PO (murni atau orphan)
  poData.forEach((p: any) => {
    const idSpb = toIdNumber(p.id_spb);
    const poId = toIdNumber(p.id);

    if (idSpb !== null && hiddenSpbIds.has(idSpb)) return;

    const linkedViaIdSpb = idSpb !== null && spbById.has(idSpb);
    const linkedViaSpbIdPo =
      poId !== null &&
      spbData.some((s: any) => toIdNumber(s.id_po) === poId);

    if (linkedViaIdSpb || linkedViaSpbIdPo) return;

    const poNo = cleanDocNo(p.no_po);
    const key = poNo ? `PO_${poNo}` : `PO_ID_${p.id}`;

    if (!groups.has(key)) {
      groups.set(key, {
        data: {
          id: key,
          spbNo: null,
          spbTitle: null,
          poNo,
          poTitle: null,
          date: p.tanggal_po || "-",
          itemsCount: 0,
          sortNumber: getSortNumber(poNo),
          status: "Sudah PO",
        },
        hasAnyPO: true,
        hasAnyArrival: false,
        hasAnyBelumDiproses: false,
        hasAnySudahDiproses: true,
        latestTimestamp: 0,
        poSet: new Set([poNo || ""]),
        completedItems: 0,
        itemNames: new Set<string>(),
        firstItemName: null,
      });
    }

    const group = groups.get(key)!;
    if (!group.data.poSourceFile) {
      group.data.poSourceFile = toSafeExternalUrl(p.source_file);
    }
    if (!group.data.poTitle) {
      const rawPoTitle = toStrOrNull(p.judul_po);
      if (rawPoTitle) group.data.poTitle = rawPoTitle;
    }
    group.data.itemsCount += 1;

    const itemName = toStrOrNull(p.nama_barang_po);
    if (itemName) {
      group.itemNames.add(itemName);
      if (!group.firstItemName) group.firstItemName = itemName;
    }

    updateLatestDate(group, p.tanggal_po);

    if (p.material_datang_tgl) {
      group.hasAnyArrival = true;
      updateLatestDate(group, p.material_datang_tgl);
      if ((p.material_datang_qty || 0) > 0) group.completedItems += 1;
    }
  });

  // 6. Proses Surat Jalan (no 3+)
  sjData.forEach((sj: any) => {
    if (isIgnoredSuratJalan(sj.no_surat_jalan)) return;

    const spbRel = Array.isArray(sj.spb) ? sj.spb[0] : sj.spb;
    const poRel = Array.isArray(sj.po) ? sj.po[0] : sj.po;
    const sjNo = toStrOrNull(sj.no_surat_jalan);
    const target = getSjTarget(sj);
    const idSpb = toIdNumber(sj.id_spb);

    if (idSpb !== null && hiddenSpbIds.has(idSpb)) return;

    let targetKey: string;
    let spbNo: string | null = null;
    let spbTitle: string | null = null;
    let poNo: string | null = null;

    if (target === "spb") {
      const parentSpb = idSpb !== null ? spbById.get(idSpb) : null;
      spbNo = cleanDocNo(parentSpb?.no_spb) ?? cleanDocNo(spbRel?.no_spb);
      const rawTitle =
        toStrOrNull(parentSpb?.judul_spb) ?? toStrOrNull(spbRel?.judul_spb);
      spbTitle =
        rawTitle ?? (spbNo ? titleBySpbNo.get(spbNo) ?? null : null);
      targetKey = buildSpbGroupKey(spbNo, spbTitle, sj.id_spb);
    } else if (target === "po") {
      poNo = cleanDocNo(poRel?.no_po);
      targetKey = poNo ? `PO_${poNo}` : `PO_ID_${sj.id_po}`;
    } else {
      targetKey = `SJ_${sjNo}`;
    }

    if (!groups.has(targetKey)) {
      groups.set(targetKey, {
        data: {
          id: targetKey,
          spbNo,
          spbTitle,
          poNo,
          poTitle: poNo
            ? resolvePoTitle(
                poNo,
                null,
                overrides[buildPoOverrideKey(poNo)],
                null,
                null,
              )
            : null,
          suratJalanNo: target === "sj" ? sjNo : null,
          date: "-",
          itemsCount: 0,
          sortNumber: getSortNumber(spbNo ?? poNo ?? sjNo),
          status: "Sudah PO",
        },
        hasAnyPO: true,
        hasAnyArrival: false,
        hasAnyBelumDiproses: false,
        hasAnySudahDiproses: true,
        latestTimestamp: 0,
        poSet: new Set<string>(poNo ? [poNo] : []),
        completedItems: 0,
        itemNames: new Set<string>(),
        firstItemName: null,
      });
    }

    const group = groups.get(targetKey)!;
    group.data.itemsCount += 1;

    if (sj.nama_barang) {
      const sjName = String(sj.nama_barang);
      group.itemNames.add(sjName);
      if (!group.firstItemName) group.firstItemName = sjName;
    }

    if (sj.material_datang_tgl) {
      group.hasAnyArrival = true;
      updateLatestDate(group, sj.material_datang_tgl);
      if ((sj.material_datang_qty || 0) > 0) group.completedItems += 1;
    }
  });

  // 7. Finalisasi status + judul PO fallback + sorting
  const result = Array.from(groups.values()).map((g) => {
    const isSelesai =
      g.data.itemsCount > 0 && g.completedItems >= g.data.itemsCount;

    let status = "Belum PO";
    if (isSelesai) status = "Selesai";
    else if (g.hasAnyArrival) status = "Datang";
    else if (g.hasAnyPO) status = "Sudah PO";
    else if (g.hasAnyBelumDiproses && !g.hasAnySudahDiproses) {
      status = "Belum Diproses";
    }

    const combinedPo = Array.from(g.poSet).filter(Boolean).join(", ");
    const firstPo = Array.from(g.poSet).filter(Boolean)[0];

    const poTitle = g.data.poNo
      ? resolvePoTitle(
          firstPo ?? null,
          g.data.poTitle ?? null,
          firstPo && overrides[buildPoOverrideKey(firstPo)] !== undefined
            ? overrides[buildPoOverrideKey(firstPo)]
            : undefined,
          g.data.spbTitle ?? null,
          g.firstItemName,
        )
      : null;

    return {
      ...g.data,
      poNo: combinedPo || null,
      poTitle,
      status,
      sortNumber:
        getSortNumber(g.data.spbNo) + getSortNumber(combinedPo) * 0.01,
      itemNames: Array.from(g.itemNames),
    };
  });

  return result.sort((a, b) => {
    const weightA = getGroupStatusWeight(a.status || "");
    const weightB = getGroupStatusWeight(b.status || "");
    if (weightA !== weightB) return weightA - weightB;

    const dateA = a.date !== "-" ? new Date(a.date).getTime() : 0;
    const dateB = b.date !== "-" ? new Date(b.date).getTime() : 0;
    if (dateA === dateB) return a.sortNumber - b.sortNumber;
    return dateB - dateA;
  });
};

