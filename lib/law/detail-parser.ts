import { inferTopicSlugs } from "./topics";
import type { LawArticle, LawDetail, LawSubItem, SupplementaryProvision } from "./types";
import { asRecord, buildSourceLink, compactText, normalizeDateString, toLawStatus, toRecordArray, toValueArray } from "./utils";

export function parseDetailPayload(payload: unknown): LawDetail | undefined {
  const root = asRecord(payload);
  const law = asRecord(root["법령"] ?? root.law ?? root);
  const basic = asRecord(law["기본정보"] ?? law.basicInfo);
  const title = getTitle(law, basic);

  if (!title) {
    return undefined;
  }

  const mst = firstText(law, ["MST", "lsiSeq", "법령일련번호"]);
  const id = firstText(basic, ["법령ID"]) || firstText(law, ["ID", "법령ID"]) || mst || title;

  return buildDetail(law, basic, { id, mst, title });
}

function buildDetail(
  law: Record<string, unknown>,
  basic: Record<string, unknown>,
  identity: { id: string; mst?: string; title: string },
): LawDetail {
  return {
    id: identity.id,
    mst: identity.mst || undefined,
    title: identity.title,
    officialTitle: identity.title,
    ministry: readNodeText(basic["소관부처"]) || firstText(basic, ["소관부처명"]) || firstText(law, ["소관부처명", "소관부처"]) || undefined,
    category: readNodeText(basic["법종구분"]) || firstText(basic, ["법종구분명"]) || firstText(law, ["법종구분", "법종구분명"]) || undefined,
    promulgationDate: normalizeDateString(firstText(basic, ["공포일자"]) || firstText(law, ["공포일자", "공포일"])),
    effectiveDate: normalizeDateString(firstText(basic, ["시행일자"]) || firstText(law, ["시행일자", "시행일"])),
    status: toLawStatus(firstText(law, ["현행연혁코드명", "현행연혁코드", "시행상태"]) || firstText(basic, ["현행연혁코드"])),
    sourceLink: buildSourceLink(identity),
    topicSlugs: inferTopicSlugs(identity.title),
    summary: getSummary(law) || undefined,
    articles: parseArticles(law["조문"] ?? law["조문단위"] ?? law.articleUnits),
    supplementaryProvisions: parseSupplementaryProvisions(law["부칙"] ?? law["부칙단위"]),
  };
}

function parseArticles(rawValue: unknown): LawArticle[] {
  const root = asRecord(rawValue);
  const units = toRecordArray(root["조문단위"] ?? root.articleUnits ?? rawValue);

  return units.flatMap((unit, index) => toArticle(unit, index));
}

function toArticle(unit: Record<string, unknown>, index: number): LawArticle[] {
  const text = firstText(unit, ["조문내용", "내용"]);

  if (!text) {
    return [];
  }

  return [{
    key: firstText(unit, ["조문키", "id"]) || `article-${index}`,
    number: firstText(unit, ["조문번호"]) || undefined,
    title: firstText(unit, ["조문제목"]) || undefined,
    text,
    changed: firstText(unit, ["조문변경여부"]) === "Y",
    notes: firstText(unit, ["조문참고자료"]) || undefined,
    clauses: parseClauses(unit["항"]),
  }];
}

function parseClauses(value: unknown): LawSubItem[] {
  return toRecordArray(value).flatMap((clause) => {
    const children = parseSubItems(clause["호"] ?? clause["호단위"] ?? clause["목"]);
    const text = firstText(clause, ["항내용", "내용"]);
    return text ? [buildSubItem(clause, text, children, ["항번호", "번호"])] : children;
  });
}

function parseSubItems(value: unknown): LawSubItem[] {
  return toRecordArray(value).flatMap((node) => {
    const children = parseSubItems(node["목"] ?? node["목단위"] ?? node["호"] ?? node["호단위"] ?? node.children);
    const text = firstText(node, ["목내용", "호내용", "항내용", "내용"]);
    return text ? [buildSubItem(node, text, children, ["목번호", "호번호", "항번호", "번호"])] : children;
  });
}

function buildSubItem(
  node: Record<string, unknown>,
  text: string,
  children: LawSubItem[],
  labelKeys: string[],
): LawSubItem {
  return { label: firstText(node, labelKeys) || undefined, text, children: children.length ? children : undefined };
}

function parseSupplementaryProvisions(rawValue: unknown): SupplementaryProvision[] {
  const root = asRecord(rawValue);
  const units = toRecordArray(root["부칙단위"] ?? rawValue);
  return units.flatMap((unit, index) => toSupplementaryProvision(unit, index));
}

function toSupplementaryProvision(unit: Record<string, unknown>, index: number): SupplementaryProvision[] {
  const paragraphs = flattenText(unit["부칙내용"]);

  if (paragraphs.length === 0) {
    return [];
  }

  return [{
    key: firstText(unit, ["부칙키"]) || `supplementary-${index}`,
    title: firstText(unit, ["부칙제목"]) || paragraphs[0],
    promulgationDate: normalizeDateString(firstText(unit, ["부칙공포일자"])),
    promulgationNumber: firstText(unit, ["부칙공포번호"]) || undefined,
    paragraphs,
  }];
}

function flattenText(value: unknown): string[] {
  return toValueArray(value).flatMap((item) =>
    toValueArray(item).map(compactText).filter((text) => text.length > 0),
  );
}

function getTitle(law: Record<string, unknown>, basic: Record<string, unknown>): string {
  return firstText(basic, ["법령명_한글", "법령명약칭"]) || firstText(law, ["법령명한글", "법령명", "제명"]);
}

function getSummary(law: Record<string, unknown>): string {
  const reason = asRecord(law["제개정이유"]);
  return firstText(law, ["법령개요"]) || firstText(reason, ["제개정이유내용", "content"]);
}

function readNodeText(value: unknown): string {
  const record = asRecord(value);
  return compactText(record.content);
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
