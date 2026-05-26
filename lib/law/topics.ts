import type { Topic } from "./types";

export const ENVIRONMENT_TOPICS: Topic[] = [
  { slug: "chemicals", title: "화학물질", keywords: ["화학물질", "화관법", "화평법"] },
  { slug: "water", title: "물환경", keywords: ["물환경", "수질", "하천"] },
  { slug: "air", title: "대기", keywords: ["대기", "악취", "배출가스"] },
  { slug: "waste", title: "폐기물", keywords: ["폐기물", "자원순환"] },
  { slug: "soil", title: "토양", keywords: ["토양", "지하수"] },
  { slug: "permit", title: "인허가", keywords: ["허가", "신고", "인허가"] },
];

export function inferTopicSlugs(title: string): string[] {
  const matches = ENVIRONMENT_TOPICS.filter((topic) =>
    topic.keywords.some((keyword) => title.includes(keyword)),
  ).map((topic) => topic.slug);

  return matches.length > 0 ? matches : ["permit"];
}
