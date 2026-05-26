import type { LawDetail, LawSummary } from "./types";

export const FALLBACK_WARNING =
  "LAW_API_OC가 없거나 국가법령 API 호출에 실패해 fallback 데이터를 반환했습니다.";

export const FALLBACK_LAWS: LawSummary[] = [
  {
    id: "000162",
    mst: "276815",
    title: "화학물질관리법",
    ministry: "환경부",
    category: "법률",
    effectiveDate: "2025-10-01",
    promulgationDate: "2025-10-01",
    status: "현행",
    sourceLink: "https://www.law.go.kr/lsInfoP.do?lsiSeq=276815",
    topicSlugs: ["chemicals"],
    summary: "화학물질 관리와 사고 대응을 위한 환경 법령입니다.",
  },
  {
    id: "000166",
    mst: "283441",
    title: "물환경보전법",
    ministry: "환경부",
    category: "법률",
    effectiveDate: "2027-02-20",
    promulgationDate: "2026-02-19",
    status: "시행예정",
    sourceLink: "https://www.law.go.kr/lsInfoP.do?lsiSeq=283441",
    topicSlugs: ["water"],
    summary: "수질과 수생태계 보전을 위한 환경 법령입니다.",
  },
  {
    id: "001765",
    title: "대기환경보전법",
    ministry: "환경부",
    category: "법률",
    status: "현행",
    sourceLink: "https://www.law.go.kr/lsInfoP.do?lsId=001765",
    topicSlugs: ["air"],
    summary: "대기오염물질 배출 관리를 위한 환경 법령입니다.",
  },
];

export function getFallbackDetail(id: string): LawDetail | undefined {
  const summary = FALLBACK_LAWS.find((item) => item.id === id || item.mst === id);

  if (!summary) {
    return undefined;
  }

  return {
    ...summary,
    officialTitle: summary.title,
    articles: [
      {
        key: "fallback-article-1",
        number: "1",
        title: "목적",
        text: `제1조(목적) 이 법은 ${summary.title}의 기본 사항을 정한다.`,
        clauses: [],
      },
    ],
    supplementaryProvisions: [],
  };
}
