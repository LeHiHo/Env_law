export type LawStatus = "현행" | "시행예정" | "연혁";

export type Topic = {
  slug: string;
  title: string;
  description: string;
  keywords: string[];
  accent: string;
};

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
  aiSummaryPending?: boolean;
  relatedLaws: LawSummary[];
  articles: LawArticle[];
  supplementaryProvisions: SupplementaryProvision[];
};

export type ApiError = {
  message: string;
  code: string;
  details?: string;
};

export type SearchFilters = {
  query?: string;
  ministry?: string;
  status?: LawStatus | "전체";
  topic?: string;
  sort?: "relevance" | "effectiveDate";
};

export type SearchResult = {
  items: LawSummary[];
  total: number;
  fromMock: boolean;
  warning?: string;
};
