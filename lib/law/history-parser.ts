import type { LawHistoryItem, LawStatus } from "./types";
import { buildSourceLink, compactText, normalizeDateString, toLawStatus } from "./utils";

export function parseHistoryHtml(html: string, lawId: string, fallbackTitle: string): LawHistoryItem[] {
  const rows = splitRows(html);
  const seen = new Set<string>();

  return rows.flatMap((row) => {
    const item = parseHistoryRow(row, lawId, fallbackTitle);

    if (!item || seen.has(item.mst)) {
      return [];
    }

    seen.add(item.mst);
    return [item];
  });
}

function splitRows(html: string): string[] {
  const rows = html.match(/<tr[\s\S]*?<\/tr>/gi);
  return rows?.length ? rows : html.split(/(?=<a\b|<li\b|<div\b)/i);
}

function parseHistoryRow(row: string, lawId: string, fallbackTitle: string): LawHistoryItem | undefined {
  const mst = readMst(row);

  if (!mst) {
    return undefined;
  }

  const text = htmlToText(row);
  const title = readTitle(text, fallbackTitle);
  const dates = readDates(text);
  const revisionType = readRevisionType(text);

  return {
    mst,
    lawId,
    title,
    status: readStatus(text),
    promulgationDate: dates[0],
    effectiveDate: dates[1] ?? dates[0],
    promulgationNumber: readPromulgationNumber(text),
    revisionType,
    sourceLink: buildSourceLink({ id: lawId, mst, title }),
    rawText: text,
  };
}

function readMst(value: string): string {
  const match = value.match(/(?:MST|lsiSeq|lsSeq|seq)=?["']?(\d+)/i);
  return match?.[1] ?? "";
}

function htmlToText(value: string): string {
  return compactText(decodeHtml(value.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")));
}

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#40;/g, "(")
    .replace(/&#41;/g, ")");
}

function readTitle(text: string, fallbackTitle: string): string {
  const index = text.indexOf(fallbackTitle);

  if (index >= 0) {
    return text.slice(index, index + fallbackTitle.length);
  }

  const match = text.match(/^\d+\s+(.+?)\s+[가-힣]+(?:부|청|처|위원회)\s+/);
  return compactText(match?.[1]) || fallbackTitle;
}

function readDates(text: string): string[] {
  const matches = [...text.matchAll(/\d{8}|\d{4}[./-]\d{1,2}[./-]\d{1,2}/g)];
  return matches.map((match) => normalizeDateString(match[0])).filter(isString);
}

function readPromulgationNumber(text: string): string | undefined {
  return text.match(/(?:제)?(\d+)호/)?.[1];
}

function readRevisionType(text: string): string | undefined {
  const match = text.match(/(일부개정|전부개정|제정|폐지제정|폐지|타법개정|타법폐지|일괄개정|일괄폐지|기타)/);
  return match?.[1];
}

function readStatus(text: string): LawStatus {
  if (text.includes("현행") || text.includes("예정")) {
    return toLawStatus(text);
  }

  return "연혁";
}

function isString(value: string | undefined): value is string {
  return typeof value === "string";
}
