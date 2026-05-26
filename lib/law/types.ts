export type LawStatus = "현행" | "시행예정" | "연혁";

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

export type LawDetail = LawSummary & {
  officialTitle?: string;
  contactAgency?: string;
  articles: LawArticle[];
  supplementaryProvisions: SupplementaryProvision[];
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
};

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue | undefined };
