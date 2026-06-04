import type { AnnexChange, LawAnnex, LawAnnexType, LawDetail } from "./types";

export function diffAnnexVersions(from: LawDetail, to: LawDetail): AnnexChange[] {
  const fromAnnexes = mapAnnexes(from.annexes);
  const toAnnexes = mapAnnexes(to.annexes);
  const keys = [...new Set([...fromAnnexes.keys(), ...toAnnexes.keys()])];

  return keys.map((key, index) => toAnnexChange(key, from, to, fromAnnexes.get(key), toAnnexes.get(key), index));
}

function toAnnexChange(
  key: string,
  from: LawDetail,
  to: LawDetail,
  oldAnnex: LawAnnex | undefined,
  newAnnex: LawAnnex | undefined,
  index: number,
): AnnexChange {
  const changedFields = readChangedFields(oldAnnex, newAnnex);

  return {
    lawId: to.id,
    fromMst: from.mst ?? from.id,
    toMst: to.mst ?? to.id,
    annexMatchKey: key,
    annexType: readAnnexType(oldAnnex, newAnnex),
    annexNumber: newAnnex?.number ?? oldAnnex?.number,
    branchNumber: newAnnex?.branchNumber ?? oldAnnex?.branchNumber,
    changeType: readChangeType(oldAnnex, newAnnex, changedFields),
    oldTitle: oldAnnex?.title,
    newTitle: newAnnex?.title,
    oldText: oldAnnex?.text,
    newText: newAnnex?.text,
    oldHwpUrl: oldAnnex?.hwpUrl,
    newHwpUrl: newAnnex?.hwpUrl,
    oldPdfUrl: oldAnnex?.pdfUrl,
    newPdfUrl: newAnnex?.pdfUrl,
    changedFields,
    sortOrder: index,
  };
}

function mapAnnexes(annexes: LawAnnex[]): Map<string, LawAnnex> {
  return new Map(annexes.map((annex) => [annexMatchKey(annex), annex]));
}

function annexMatchKey(annex: LawAnnex): string {
  const numberKey = [annex.number, annex.branchNumber].filter(isNonEmpty).join("-");
  return numberKey ? `${annex.type}:${numberKey}` : `${annex.type}:${annex.key}`;
}

function readAnnexType(oldAnnex: LawAnnex | undefined, newAnnex: LawAnnex | undefined): LawAnnexType {
  return newAnnex?.type ?? oldAnnex?.type ?? "기타";
}

function readChangeType(
  oldAnnex: LawAnnex | undefined,
  newAnnex: LawAnnex | undefined,
  changedFields: string[],
): AnnexChange["changeType"] {
  if (!oldAnnex) {
    return "added";
  }

  if (!newAnnex) {
    return "deleted";
  }

  return changedFields.length ? "amended" : "unchanged";
}

function readChangedFields(oldAnnex: LawAnnex | undefined, newAnnex: LawAnnex | undefined): string[] {
  if (!oldAnnex || !newAnnex) {
    return [];
  }

  return [
    oldAnnex.title !== newAnnex.title ? "title" : "",
    oldAnnex.text !== newAnnex.text ? "text" : "",
    oldAnnex.hwpUrl !== newAnnex.hwpUrl ? "hwpUrl" : "",
    oldAnnex.pdfUrl !== newAnnex.pdfUrl ? "pdfUrl" : "",
    oldAnnex.number !== newAnnex.number ? "number" : "",
    oldAnnex.branchNumber !== newAnnex.branchNumber ? "branchNumber" : "",
  ].filter(isNonEmpty);
}

function isNonEmpty(value: string | undefined): value is string {
  return Boolean(value);
}
