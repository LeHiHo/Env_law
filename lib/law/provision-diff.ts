import type { JsonValue, LawDetail, SupplementaryProvision, SupplementaryProvisionChange } from "./types";

export function diffSupplementaryProvisionVersions(from: LawDetail, to: LawDetail): SupplementaryProvisionChange[] {
  const fromProvisions = mapProvisions(from.supplementaryProvisions);
  const toProvisions = mapProvisions(to.supplementaryProvisions);
  const keys = [...new Set([...fromProvisions.keys(), ...toProvisions.keys()])];

  return keys.map((key, index) => toProvisionChange(key, from, to, fromProvisions.get(key), toProvisions.get(key), index));
}

function toProvisionChange(
  key: string,
  from: LawDetail,
  to: LawDetail,
  oldProvision: SupplementaryProvision | undefined,
  newProvision: SupplementaryProvision | undefined,
  index: number,
): SupplementaryProvisionChange {
  const changedFields = readChangedFields(oldProvision, newProvision);

  return {
    lawId: to.id,
    fromMst: from.mst ?? from.id,
    toMst: to.mst ?? to.id,
    provisionMatchKey: key,
    changeType: readChangeType(oldProvision, newProvision, changedFields),
    oldTitle: oldProvision?.title,
    newTitle: newProvision?.title,
    oldPromulgationDate: oldProvision?.promulgationDate,
    newPromulgationDate: newProvision?.promulgationDate,
    oldPromulgationNumber: oldProvision?.promulgationNumber,
    newPromulgationNumber: newProvision?.promulgationNumber,
    oldParagraphs: oldProvision ? toJsonValue(oldProvision.paragraphs) : undefined,
    newParagraphs: newProvision ? toJsonValue(newProvision.paragraphs) : undefined,
    changedFields,
    sortOrder: index,
  };
}

function mapProvisions(provisions: SupplementaryProvision[]): Map<string, SupplementaryProvision> {
  return new Map(provisions.map((provision) => [provisionMatchKey(provision), provision]));
}

function provisionMatchKey(provision: SupplementaryProvision): string {
  const dateNumberKey = joinKey(provision.promulgationDate, provision.promulgationNumber);
  const dateTitleKey = joinKey(provision.promulgationDate, provision.title);
  const numberTitleKey = joinKey(provision.promulgationNumber, provision.title);
  return dateNumberKey || dateTitleKey || numberTitleKey || provision.key;
}

function joinKey(first: string | undefined, second: string | undefined): string {
  return first && second ? `${first}:${second}` : "";
}

function readChangeType(
  oldProvision: SupplementaryProvision | undefined,
  newProvision: SupplementaryProvision | undefined,
  changedFields: string[],
): SupplementaryProvisionChange["changeType"] {
  if (!oldProvision) {
    return "added";
  }

  if (!newProvision) {
    return "deleted";
  }

  return changedFields.length ? "amended" : "unchanged";
}

function readChangedFields(
  oldProvision: SupplementaryProvision | undefined,
  newProvision: SupplementaryProvision | undefined,
): string[] {
  if (!oldProvision || !newProvision) {
    return [];
  }

  return [
    oldProvision.title !== newProvision.title ? "title" : "",
    oldProvision.promulgationDate !== newProvision.promulgationDate ? "promulgationDate" : "",
    oldProvision.promulgationNumber !== newProvision.promulgationNumber ? "promulgationNumber" : "",
    JSON.stringify(oldProvision.paragraphs) !== JSON.stringify(newProvision.paragraphs) ? "paragraphs" : "",
  ].filter(isNonEmpty);
}

function toJsonValue(value: unknown): JsonValue {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(toJsonValue);
  }

  return typeof value === "object" ? Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, toJsonValue(entry)])) : null;
}

function isNonEmpty(value: string | undefined): value is string {
  return Boolean(value);
}
