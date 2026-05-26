import { inferTopicSlugs } from "./topics";
import type { LawSummary, RawSearchRecord } from "./types";
import { asRecord, buildSourceLink, compactText, normalizeDateString, toLawStatus, toRecordArray } from "./utils";

export function parseSearchPayload(payload: unknown): LawSummary[] {
  return parseSearchRecords(payload).map((record) => record.item);
}

export function parseSearchRecords(payload: unknown): RawSearchRecord[] {
  const root = asRecord(payload);
  const candidate = asRecord(root.LawSearch ?? root.lawSearch ?? root);
  const records = [
    ...toRecordArray(candidate.law),
    ...toRecordArray(candidate.laws),
    ...toRecordArray(candidate["법령"]),
  ];

  return records.flatMap((record, index) => toSearchRecord(record, index));
}

function toSearchRecord(record: Record<string, unknown>, index: number): RawSearchRecord[] {
  const title = firstText(record, ["법령명한글", "법령명", "lawNameKor", "LM", "법령명약칭"]);

  if (!title) {
    return [];
  }

  const mst = firstText(record, ["MST", "lsiSeq", "법령일련번호"]);
  const id = firstText(record, ["ID", "법령ID", "lawId"]) || mst || `law-${index}`;
  const item = buildSearchItem(record, { id, mst, title });

  return [{ item, raw: record }];
}

function buildSearchItem(
  record: Record<string, unknown>,
  identity: { id: string; mst?: string; title: string },
): LawSummary {
  const ministry = firstText(record, ["소관부처명", "minister", "소관부처"]);

  return {
    id: identity.id,
    mst: identity.mst || undefined,
    title: identity.title,
    ministry: ministry || undefined,
    category: firstText(record, ["법종구분", "법종구분명", "lawType"]) || undefined,
    promulgationDate: normalizeDateString(firstText(record, ["공포일자", "공포일", "promulgationDate"])),
    effectiveDate: normalizeDateString(firstText(record, ["시행일자", "시행일", "effectiveDate"])),
    status: toLawStatus(firstText(record, ["현행연혁코드명", "현행연혁코드", "시행상태", "nw"])),
    sourceLink: buildSourceLink(identity),
    topicSlugs: inferTopicSlugs(identity.title),
    summary: ministry ? `${ministry} 소관 환경 법령입니다.` : undefined,
  };
}

function firstText(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const text = compactText(record[key]);

    if (text) {
      return text;
    }
  }

  return "";
}
