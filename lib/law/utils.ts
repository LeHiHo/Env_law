import type { LawStatus } from "./types";

export function compactText(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

export function asRecord(value: unknown): Record<string, unknown> {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

export function toRecordArray(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.map(asRecord).filter(hasKeys);
  }

  const record = asRecord(value);
  return hasKeys(record) ? [record] : [];
}

export function toValueArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  return value === undefined || value === null ? [] : [value];
}

export function normalizeDateString(value: unknown): string | undefined {
  const text = compactText(value).replace(/[./]/g, "-");
  const compact = text.replace(/-/g, "");

  if (/^\d{8}$/.test(compact)) {
    return `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`;
  }

  return /^\d{4}-\d{1,2}-\d{1,2}$/.test(text) ? padDate(text) : undefined;
}

export function toLawStatus(value: unknown): LawStatus {
  const text = compactText(value);

  if (text.includes("예정") || text === "2") {
    return "시행예정";
  }

  if (text.includes("연혁") || text === "1") {
    return "연혁";
  }

  return "현행";
}

export function buildSourceLink(input: { id?: string; mst?: string; title: string }): string {
  if (input.mst) {
    return `https://www.law.go.kr/lsInfoP.do?lsiSeq=${encodeURIComponent(input.mst)}`;
  }

  if (input.id) {
    return `https://www.law.go.kr/lsInfoP.do?lsId=${encodeURIComponent(input.id)}`;
  }

  return `https://www.law.go.kr/lsSc.do?query=${encodeURIComponent(input.title)}`;
}

function hasKeys(value: Record<string, unknown>): boolean {
  return Object.keys(value).length > 0;
}

function padDate(value: string): string {
  const [year = "", month = "", day = ""] = value.split("-");
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}
