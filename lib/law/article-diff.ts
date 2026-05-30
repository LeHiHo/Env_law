import type { ArticleChange, JsonValue, LawArticle, LawDetail, LawVersion } from "./types";

export function diffArticleVersions(from: LawDetail, to: LawDetail): ArticleChange[] {
  const fromArticles = mapArticles(from.articles);
  const toArticles = mapArticles(to.articles);
  const keys = [...new Set([...fromArticles.keys(), ...toArticles.keys()])];

  return keys.map((key, index) => toArticleChange(key, from, to, fromArticles.get(key), toArticles.get(key), index));
}

export function sortVersionsAscending(versions: LawVersion[]): LawVersion[] {
  return [...versions].sort((a, b) => compareDate(a, b) || a.mst.localeCompare(b.mst));
}

function toArticleChange(
  key: string,
  from: LawDetail,
  to: LawDetail,
  oldArticle: LawArticle | undefined,
  newArticle: LawArticle | undefined,
  index: number,
): ArticleChange {
  const changedFields = readChangedFields(oldArticle, newArticle);

  return {
    lawId: to.id,
    fromMst: from.mst ?? from.id,
    toMst: to.mst ?? to.id,
    articleMatchKey: key,
    articleNumber: newArticle?.number ?? oldArticle?.number,
    changeType: readChangeType(oldArticle, newArticle, changedFields),
    oldTitle: oldArticle?.title,
    newTitle: newArticle?.title,
    oldText: oldArticle?.text,
    newText: newArticle?.text,
    oldClauses: oldArticle ? toJsonValue(oldArticle.clauses) : undefined,
    newClauses: newArticle ? toJsonValue(newArticle.clauses) : undefined,
    changedFields,
    sortOrder: index,
  };
}

function mapArticles(articles: LawArticle[]): Map<string, LawArticle> {
  return new Map(articles.map((article) => [article.number ?? article.key, article]));
}

function readChangeType(
  oldArticle: LawArticle | undefined,
  newArticle: LawArticle | undefined,
  changedFields: string[],
): ArticleChange["changeType"] {
  if (!oldArticle) {
    return "added";
  }

  if (!newArticle) {
    return "deleted";
  }

  return changedFields.length ? "amended" : "unchanged";
}

function readChangedFields(oldArticle: LawArticle | undefined, newArticle: LawArticle | undefined): string[] {
  if (!oldArticle || !newArticle) {
    return [];
  }

  return [
    oldArticle.title !== newArticle.title ? "title" : "",
    oldArticle.text !== newArticle.text ? "text" : "",
    JSON.stringify(oldArticle.clauses) !== JSON.stringify(newArticle.clauses) ? "clauses" : "",
  ].filter(isNonEmpty);
}

function compareDate(a: LawVersion, b: LawVersion): number {
  return (a.effectiveDate ?? "").localeCompare(b.effectiveDate ?? "");
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

function isNonEmpty(value: string): boolean {
  return value.length > 0;
}
