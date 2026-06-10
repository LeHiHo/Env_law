export type LawStatus = "현행" | "시행예정" | "연혁";
export type LawRelationType = "enforcement_decree" | "enforcement_rule" | "delegated_notice" | "related_law";
export type LawAnnexType = "별표" | "서식" | "별지" | "별도" | "부록" | "기타";

export type LawSummary = {
  id: string;
  mst?: string;
  title: string;
  ministry?: string;
  category?: string;
  promulgationDate?: string;
  effectiveDate?: string;
  status: LawStatus;
  sourceLink: string;
  topicSlugs: string[];
  summary?: string;
};

export type LawSubItem = {
  label?: string;
  text: string;
  children?: LawSubItem[];
};

export type LawArticle = {
  key: string;
  number?: string;
  title?: string;
  text: string;
  changed?: boolean;
  notes?: string;
  clauses: LawSubItem[];
};

export type SupplementaryProvision = {
  key: string;
  title?: string;
  promulgationDate?: string;
  promulgationNumber?: string;
  paragraphs: string[];
};

export type LawAnnex = {
  key: string;
  type: LawAnnexType;
  title: string;
  number?: string;
  branchNumber?: string;
  text?: string;
  hwpUrl?: string;
  pdfUrl?: string;
  raw?: JsonValue;
};

export type LawDetail = LawSummary & {
  officialTitle?: string;
  contactAgency?: string;
  articles: LawArticle[];
  supplementaryProvisions: SupplementaryProvision[];
  annexes: LawAnnex[];
};

export type LawRelation = {
  parentLawId: string;
  childLawId: string;
  relationType: LawRelationType;
  source: "manual" | "api" | "parser";
  sortOrder: number;
};

export type LawVersion = {
  mst: string;
  lawId: string;
  title: string;
  status: LawStatus;
  promulgationDate?: string;
  effectiveDate?: string;
  sourceLink: string;
};

export type LawHistoryItem = LawVersion & {
  promulgationNumber?: string;
  revisionType?: string;
  rawText?: string;
};

export type ArticleChangeType = "added" | "deleted" | "amended" | "unchanged";
export type AnnexChangeType = ArticleChangeType;
export type SupplementaryProvisionChangeType = ArticleChangeType;

export type ArticleChange = {
  lawId: string;
  fromMst: string;
  toMst: string;
  articleMatchKey: string;
  articleNumber?: string;
  changeType: ArticleChangeType;
  oldTitle?: string;
  newTitle?: string;
  oldText?: string;
  newText?: string;
  oldClauses?: JsonValue;
  newClauses?: JsonValue;
  changedFields: string[];
  sortOrder: number;
};

export type AnnexChange = {
  lawId: string;
  fromMst: string;
  toMst: string;
  annexMatchKey: string;
  annexType: LawAnnexType;
  annexNumber?: string;
  branchNumber?: string;
  changeType: AnnexChangeType;
  oldTitle?: string;
  newTitle?: string;
  oldText?: string;
  newText?: string;
  oldHwpUrl?: string;
  newHwpUrl?: string;
  oldPdfUrl?: string;
  newPdfUrl?: string;
  changedFields: string[];
  sortOrder: number;
};

export type SupplementaryProvisionChange = {
  lawId: string;
  fromMst: string;
  toMst: string;
  provisionMatchKey: string;
  changeType: SupplementaryProvisionChangeType;
  oldTitle?: string;
  newTitle?: string;
  oldPromulgationDate?: string;
  newPromulgationDate?: string;
  oldPromulgationNumber?: string;
  newPromulgationNumber?: string;
  oldParagraphs?: JsonValue;
  newParagraphs?: JsonValue;
  changedFields: string[];
  sortOrder: number;
};

export type SearchFilters = {
  query?: string;
  ministry?: string;
  status?: LawStatus | "전체";
  topic?: string;
  sort?: "relevance" | "effectiveDate";
};

export type SearchResultSource = "api" | "db-cache" | "mock";

export type SearchResult = {
  items: LawSummary[];
  total: number;
  source: SearchResultSource;
  warning?: string;
};

export type LawDetailResult = {
  item?: LawDetail;
  source: SearchResultSource;
  warning?: string;
};

export type Topic = {
  slug: string;
  title: string;
  keywords: string[];
};

export type RawSearchRecord = {
  item: LawSummary;
  raw: Record<string, unknown>;
};

export type RawDetailRecord = {
  item: LawDetail;
  raw: unknown;
};

export type LawApiClient = {
  search(filters: SearchFilters): Promise<unknown | undefined>;
  detailById(id: string): Promise<unknown | undefined>;
  detailByMst(mst: string): Promise<unknown | undefined>;
  historyByTitle(title: string): Promise<string | undefined>;
};

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue | undefined };
