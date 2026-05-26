# 환경법 백엔드 구현 전략

이 문서는 UI를 나중에 만들고, 백엔드부터 다시 구축하기 위한 단일 기술 문서다. 기존 `law-api-integration.md`의 국가법령 API 호출/파싱 지식과 `technical-handover.md`의 DB 전략을 통합했다.

목표는 아래 순서로 안정적인 데이터 계층을 먼저 만드는 것이다.

```text
국가법령 Open API
-> API client
-> parser
-> DB/cache
-> backend API
-> later UI / later AI tools
```

## 1. 우선순위

이번 재시작의 작업 모드는 `backend-only`다. Codex나 Claude Code 같은 코딩 에이전트는 기본적으로 눈에 보이는 결과를 만들기 위해 UI부터 구현하려는 경향이 있다. 이 프로젝트에서는 그 흐름을 막고, 데이터 계층을 먼저 고정해야 한다.

UI를 먼저 만들면 안 되는 이유:

- 국가법령 API 응답 구조가 불안정하다.
- 검색/상세 파싱 규칙이 제품 품질의 핵심이다.
- DB/cache 전략이 나중 UI와 AI 기능 구조를 좌우한다.
- 법령 상세, 조문, 부칙 데이터 모델을 먼저 안정화해야 한다.
- AI 상담이나 MCP 확장도 결국 백엔드 데이터 계층 품질에 의존한다.

지금 단계에서 할 일:

- 국가법령 Open API 호출 계층 분리
- 검색 응답 파서 구현
- 상세 응답 파서 구현
- 내부 도메인 타입 확정
- 테스트 가능한 목업/fallback 구성
- DB 스키마 설계
- 검색 결과와 상세 결과 저장 정책 구현
- 백엔드 API route 또는 service 함수 구현

지금 단계에서 미룰 일:

- 화면 UI
- AI 법률 상담
- MCP 서버
- 사용자 계정
- 즐겨찾기
- 관리자 화면
- 대량 배치 동기화
- AI 요약 생성

명시적 금지 범위:

- `app/page.tsx` 중심의 화면 구현
- `components/` UI 컴포넌트 추가
- CSS/디자인 시스템 작업
- landing page, dashboard, card layout 구현
- 브라우저 스크린샷 기반 검증

검증 방식:

- 파서 단위 테스트
- service/repository 테스트
- 내부 API route 응답 테스트
- 필요 시 `curl`로 API route 확인
- 최종 `pnpm test`, `pnpm build`

## 2. 핵심 원칙

- 브라우저에서 국가법령 Open API를 직접 호출하지 않는다.
- `LAW_API_OC`는 서버 환경변수로만 보관한다.
- 외부 API 원본 payload는 UI나 제품 코드에서 직접 쓰지 않는다.
- 외부 응답은 내부 타입으로 정규화한 뒤 사용한다.
- 파서는 순수 함수로 작성한다.
- API 호출, 파싱, DB 저장 책임을 분리한다.
- API 키가 없어도 개발과 테스트가 가능해야 한다.
- DB는 처음부터 전체 법령을 담지 않고, 조회된 법령부터 점진적으로 저장한다.
- `any`는 쓰지 않는다. 외부 payload는 `unknown`으로 받고 안전하게 좁힌다.

## 3. 권장 모듈 구조

새 프로젝트의 백엔드 코드는 아래처럼 시작한다.

```text
lib/law/
  types.ts
  client.ts
  search-parser.ts
  detail-parser.ts
  fallback.ts
  repository.ts
  service.ts
  topics.ts

app/api/laws/search/route.ts
app/api/laws/[id]/route.ts
app/api/topics/route.ts
```

책임:

- `types.ts`: 서비스 내부 도메인 타입
- `client.ts`: 국가법령 API URL 생성, 인증값 주입, `fetch`, HTTP 에러 처리
- `search-parser.ts`: 검색 원본 payload를 `LawSummary[]`로 변환
- `detail-parser.ts`: 상세 원본 payload를 `LawDetail | undefined`로 변환
- `fallback.ts`: API 키 없음, 호출 실패, 파싱 실패 정책
- `repository.ts`: DB 조회/upsert/delete
- `service.ts`: client, parser, repository를 조합한 유스케이스
- `topics.ts`: 환경 주제와 키워드

## 4. 환경변수

```env
LAW_API_OC=국가법령정보센터 Open API OC 값
```

정책:

- 값이 없으면 외부 API를 호출하지 않는다.
- 개발 환경에서는 목업 또는 DB 캐시로 응답한다.
- 운영 환경에서는 키 누락을 서버 로그로 남기고 명확한 fallback 응답을 반환한다.

## 5. 외부 API

### 검색

엔드포인트:

```text
GET https://www.law.go.kr/DRF/lawSearch.do
```

기본 파라미터:

- `OC`: 인증값
- `type=JSON`
- `target=eflaw`
- `search=1`
- `query`: 검색어
- `display`: 50부터 시작
- `page`: 1부터 시작
- `sort`: 관련도 또는 시행일 정렬
- `nw`: 현행/시행예정/연혁 상태 코드

예시:

```text
https://www.law.go.kr/DRF/lawSearch.do?OC=...&target=eflaw&type=JSON&search=1&query=화학물질&display=50&page=1
```

### 상세

엔드포인트:

```text
GET https://www.law.go.kr/DRF/lawService.do
```

기본 파라미터:

- `OC`: 인증값
- `type=JSON`
- `target=law`
- `ID`: 법령 ID

예시:

```text
https://www.law.go.kr/DRF/lawService.do?OC=...&target=law&type=JSON&ID=000162
```

주의:

- 검색 응답에는 `법령ID`와 `법령일련번호(MST)`가 함께 올 수 있다.
- 상세 조회는 우선 `ID` 기준으로 호출한다.
- 원문 링크는 `MST`가 있으면 `lsiSeq`, 없으면 `lsId` 기준으로 만든다.

### JSON/XML 선택

현재 구현은 `type=JSON` 중심으로 출발한다. 다만 `legalize-kr/legalize-pipeline`은 법령 수집에서 `type=XML`을 사용하고, `ElementTree`로 검색/상세/조문을 파싱한다. 특히 조문, 항, 호, 목, 부칙처럼 계층 구조가 중요한 상세 데이터는 XML이 더 안정적인 원본일 수 있다.

따라서 새 백엔드에서는 아래 전략을 열어둔다.

- 검색: 초기에는 JSON 또는 XML 중 구현이 단순한 쪽으로 시작한다.
- 상세: 조문 구조가 JSON에서 불안정하면 XML 상세 파서로 전환하거나 병행한다.
- raw 저장: JSON을 쓰더라도 원본 payload를 저장하고, XML을 쓰면 raw XML을 함께 저장한다.
- 테스트: 같은 법령에 대해 JSON 상세와 XML 상세의 조문 누락 여부를 비교한다.

### ID/MST 전략

`legalize-pipeline`은 상세 조회에서 `ID`보다 `MST`를 중심으로 사용한다.

- `ID`: 법령 자체를 가리키는 식별자에 가깝다.
- `MST`: 특정 법령 버전/일련번호에 가깝다.

현행 법령만 조회하면 `ID` 중심으로도 시작할 수 있다. 하지만 연혁, 시행예정, 특정 시점 법령, 개정 전후 비교까지 고려하면 `MST`를 반드시 저장하고 상세 조회에도 활용해야 한다.

권장 정책:

- 검색 결과에서 `id`와 `mst`를 모두 추출한다.
- DB의 `laws.id`는 우선 `법령ID`를 사용한다.
- 버전 단위 데이터가 필요해지면 `law_versions` 테이블을 추가하고 `mst`를 버전 primary key로 사용한다.
- 상세 조회는 `ID` 실패 시 `MST` fallback을 둔다.
- 원문 링크는 `MST`가 있으면 `lsiSeq`를 우선 사용한다.

## 6. 내부 타입 초안

처음부터 과도한 타입을 만들지 않는다. 검색, 상세, 조문, 부칙에 필요한 최소 타입으로 시작한다.

```ts
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

export type SearchResult = {
  items: LawSummary[];
  total: number;
  source: "api" | "db-cache" | "mock";
  warning?: string;
};
```

## 7. 검색 파싱 전략

검색 응답은 대체로 `LawSearch.law[]` 구조지만, 실제 응답은 단일 객체 또는 다른 키로 올 수 있다.

루트 후보:

- `LawSearch`
- `lawSearch`
- 응답 루트 자체

목록 후보:

- `law`
- `laws`
- `법령`

필드 후보:

- 제목: `법령명한글`, `법령명`, `lawNameKor`, `LM`, `법령명약칭`
- 부처: `소관부처명`, `minister`, `소관부처`
- 법종: `법종구분`, `법종구분명`, `lawType`
- 공포일: `공포일자`, `공포일`, `promulgationDate`
- 시행일: `시행일자`, `시행일`, `effectiveDate`
- 상태: `현행연혁코드명`, `현행연혁코드`, `시행상태`, `nw`
- MST: `MST`, `lsiSeq`, `법령일련번호`
- ID: `ID`, `법령ID`, `lawId`

완료 기준:

- 배열 응답과 단일 객체 응답을 모두 처리한다.
- 제목이 없는 항목은 버린다.
- `YYYYMMDD`, `YYYY-MM-DD`, `YYYY.MM.DD`를 내부 날짜 문자열로 정규화한다.
- 상태는 `현행 | 시행예정 | 연혁`만 반환한다.
- `sourceLink`를 항상 만든다.
- 검색 파서는 네트워크와 DB를 모른다.

## 8. 상세 파싱 전략

상세 응답은 검색보다 구조가 복잡하다. 핵심 메타는 `법령.기본정보` 아래에 오는 경우가 많다.

루트 후보:

- `법령`
- `law`
- 응답 루트 자체

기본정보 후보:

- `법령.기본정보`
- `law.basicInfo`

메타 후보:

- 제목: `기본정보.법령명_한글`, `법령명한글`, `법령명`, `제명`, `기본정보.법령명약칭`
- 법령 ID: `기본정보.법령ID`, `ID`, `법령ID`, `MST`
- 소관부처: `기본정보.소관부처.content`, `기본정보.소관부처명`, `소관부처명`, `소관부처`
- 법종: `기본정보.법종구분.content`, `기본정보.법종구분명`, `법종구분`, `법종구분명`
- 공포일: `기본정보.공포일자`, `공포일자`, `공포일`
- 시행일: `기본정보.시행일자`, `시행일자`, `시행일`
- 상태: `현행연혁코드명`, `현행연혁코드`, `기본정보.현행연혁코드`, `시행상태`
- 요약 후보: `법령개요`, `제개정이유.제개정이유내용`, `제개정이유.content`

조문 후보:

- 조문 루트: `조문.조문단위`, `조문단위`, `articleUnits`
- 조문 key: `조문키`, `id`
- 조문 번호: `조문번호`
- 조문 제목: `조문제목`
- 조문 내용: `조문내용`, `내용`
- 변경 여부: `조문변경여부`
- 참고 자료: `조문참고자료`
- 항: `항`
- 호: `호`, `호단위`
- 목: `목`, `목단위`

부칙 후보:

- 부칙 루트: `부칙.부칙단위`, `부칙단위`
- 부칙 key: `부칙키`
- 공포일자: `부칙공포일자`
- 공포번호: `부칙공포번호`
- 내용: `부칙내용`

완료 기준:

- 조문이 없어도 상세 메타는 반환한다.
- 항/호/목은 재귀 구조로 보존한다.
- 본문이 없는 중간 노드는 children만 끌어올릴 수 있다.
- 부칙 내용이 문자열, 배열, 중첩 배열이어도 `paragraphs: string[]`로 만든다.
- 파싱 실패는 throw보다 `undefined` 또는 실패 result로 처리한다.

## 9. 내부 백엔드 API

UI는 나중에 만들더라도 백엔드 API는 먼저 고정할 수 있다.

### `GET /api/laws/search`

쿼리:

- `q`: 검색어
- `topic`: 내부 주제 slug
- `ministry`: 소관부처
- `status`: `현행 | 시행예정 | 연혁 | 전체`
- `sort`: `relevance | effectiveDate`

응답:

```json
{
  "items": [
    {
      "id": "000162",
      "mst": "276815",
      "title": "화학물질관리법",
      "ministry": "기후에너지환경부",
      "category": "법률",
      "promulgationDate": "2025-10-01",
      "effectiveDate": "2025-10-01",
      "status": "현행",
      "sourceLink": "https://www.law.go.kr/lsInfoP.do?lsiSeq=276815",
      "topicSlugs": ["chemicals"],
      "summary": "기후에너지환경부 소관 환경 법령입니다."
    }
  ],
  "total": 1,
  "source": "api"
}
```

### `GET /api/laws/:id`

응답:

```json
{
  "item": {
    "id": "000162",
    "title": "화학물질관리법",
    "officialTitle": "화학물질관리법",
    "ministry": "기후에너지환경부",
    "category": "법률",
    "promulgationDate": "2025-10-01",
    "effectiveDate": "2025-10-01",
    "status": "현행",
    "sourceLink": "https://www.law.go.kr/lsInfoP.do?lsId=000162",
    "topicSlugs": ["chemicals"],
    "articles": [],
    "supplementaryProvisions": []
  },
  "source": "api"
}
```

## 10. DB 전략

DB는 캐시 데이터와 제품 데이터를 분리한다.

단계:

1. DB 없이 파서와 API client를 완성한다.
2. 조회된 검색 결과를 `laws`에 upsert한다.
3. 조회된 상세 결과를 `laws`, `law_articles`, `supplementary_provisions`에 저장한다.
4. 외부 API 실패 시 DB stale cache를 반환한다.
5. 사람이 만든 요약, 태그, 실무 메모는 별도 테이블에 저장한다.

`legalize-pipeline`은 DB 대신 `.cache/detail/{MST}.xml`, `.cache/history/{법령명}.json`, checkpoint 파일을 둔다. 웹서비스에서는 파일 캐시를 그대로 채택하지 않더라도 같은 개념을 DB에 반영한다.

반영할 점:

- 원본 상세 payload를 보존해 재파싱 가능하게 한다.
- 실패한 법령 MST를 기록해 재시도 대상을 관리한다.
- 증분 동기화 checkpoint를 둔다.
- 이력 수집은 MVP 이후로 미루되, 스키마 확장 여지를 남긴다.

권장 TTL:

- 검색 결과 캐시: 1시간
- 상세 법령 캐시: 1일
- 강제 새로고침은 MVP 이후 구현

## 11. 개정 이력과 증분 동기화 전략

초기 MVP에서는 개정 이력을 구현하지 않는다. 다만 나중에 법령 변경 감지와 시점별 조회가 필요하므로 구조를 미리 이해해 둔다.

`legalize-pipeline` 참고 방식:

- 검색 API에서 `ancYd` 파라미터로 특정 공포일 범위를 조회한다.
- 이미 처리한 MST는 checkpoint로 제외한다.
- 실패한 MST는 별도 목록에 기록한다.
- 개정 이력은 `lawSearch.do`의 `target=lsHistory`, `type=HTML` 응답을 파싱해 과거 MST를 얻는다.

우리 프로젝트의 권장 확장:

- `sync_checkpoints` 테이블로 마지막 성공 동기화 시각과 처리 범위를 저장한다.
- `failed_law_fetches` 테이블로 실패한 `id`, `mst`, 요청 종류, 에러 메시지를 저장한다.
- `law_versions` 테이블을 추가해 같은 `법령ID`의 여러 `MST` 버전을 보존한다.
- 이력 수집은 HTML 파싱 의존도가 있으므로 별도 모듈로 격리한다.
- 운영 첫 단계에서는 현행 상세 cache만 구현하고, 이력/버전 관리는 기능 요구가 생길 때 추가한다.

## 12. DB 테이블 초안

Postgres/Supabase 기준 초안이다.

### `laws`

```sql
create table laws (
  id text primary key,
  mst text,
  title text not null,
  official_title text,
  ministry text,
  category text,
  status text not null,
  promulgation_date date,
  effective_date date,
  source_link text not null,
  raw_search_payload jsonb,
  raw_detail_payload jsonb,
  raw_detail_xml text,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### `law_articles`

```sql
create table law_articles (
  id bigserial primary key,
  law_id text not null references laws(id) on delete cascade,
  article_key text not null,
  article_number text,
  title text,
  body text not null,
  changed boolean not null default false,
  notes text,
  sort_order integer not null,
  clauses jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (law_id, article_key)
);
```

초기에는 항/호/목을 `clauses jsonb`에 저장한다. 조문 단위 검색, 조문별 permalink, 세부 조문 검색이 필요해질 때 별도 테이블로 정규화한다.

### `supplementary_provisions`

```sql
create table supplementary_provisions (
  id bigserial primary key,
  law_id text not null references laws(id) on delete cascade,
  provision_key text not null,
  title text,
  promulgation_date date,
  promulgation_number text,
  paragraphs jsonb not null default '[]'::jsonb,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (law_id, provision_key)
);
```

### `topics`

```sql
create table topics (
  slug text primary key,
  title text not null,
  description text,
  keywords text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### `law_topics`

```sql
create table law_topics (
  law_id text not null references laws(id) on delete cascade,
  topic_slug text not null references topics(slug) on delete cascade,
  source text not null default 'keyword',
  created_at timestamptz not null default now(),
  primary key (law_id, topic_slug)
);
```

### `law_versions` later

연혁/시행예정/개정 전후 비교가 필요해질 때 추가한다. MVP에서는 만들지 않아도 된다.

```sql
create table law_versions (
  mst text primary key,
  law_id text not null references laws(id) on delete cascade,
  title text not null,
  status text not null,
  promulgation_date date,
  effective_date date,
  promulgation_number text,
  revision_type text,
  source_link text not null,
  raw_detail_payload jsonb,
  raw_detail_xml text,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### `sync_checkpoints` later

증분 동기화가 필요해질 때 추가한다.

```sql
create table sync_checkpoints (
  key text primary key,
  last_success_at timestamptz,
  cursor_value text,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
```

### `failed_law_fetches` later

실패한 외부 API 요청을 재시도하기 위해 추가한다.

```sql
create table failed_law_fetches (
  id bigserial primary key,
  law_id text,
  mst text,
  request_type text not null,
  error_code text,
  error_message text,
  retry_count integer not null default 0,
  last_failed_at timestamptz not null default now(),
  resolved_at timestamptz
);
```

### `law_annotations`

```sql
create table law_annotations (
  law_id text primary key references laws(id) on delete cascade,
  plain_summary text,
  practical_notes jsonb not null default '[]'::jsonb,
  tags text[] not null default '{}',
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

## 13. 저장 정책

검색 결과 저장:

- 검색 API 응답에서 파싱한 `LawSummary`를 `laws`에 upsert한다.
- 검색 단계에서는 조문을 만들지 않는다.
- 가능하면 원본 검색 record를 `raw_search_payload`에 저장한다.

상세 결과 저장:

- 상세 API 응답 파싱 성공 시 `laws`를 upsert한다.
- `law_articles`, `supplementary_provisions`는 해당 `law_id` 기준으로 재동기화한다.
- 초기 구현은 삭제 후 재삽입이 단순하다.
- 이후에는 `article_key`, `provision_key` 기준 upsert로 바꿀 수 있다.

fallback:

- API 키 없음: 목업 또는 DB cache 반환
- API 호출 실패: 신선한 DB cache 반환
- 신선한 cache 없음: stale cache 반환하며 warning 포함
- DB에도 없음: 목업 또는 명확한 오류 반환

## 14. 구현 순서

1. `lib/law/types.ts` 작성
2. 날짜, 문자열, record helper 작성
3. 검색 파서 작성
4. 검색 파서 테스트 작성
5. 상세 파서 작성
6. 상세 파서 테스트 작성
7. API client 작성
8. API 키 없음 fallback 작성
9. DB 스키마 추가
10. repository upsert/query 구현
11. service 함수 구현
12. 내부 API route 구현
13. JSON 상세 파싱에서 조문 누락이 보이면 XML 상세 파서 검토
14. raw payload 또는 raw XML 저장 확인
15. `pnpm test`
16. `pnpm build`

## 15. 테스트 전략

필수 테스트:

- 검색 응답 배열 파싱
- 검색 응답 단일 객체 파싱
- 날짜 정규화
- 상태 정규화
- 상세 기본정보 파싱
- 조문 `항/호/목` 재귀 파싱
- 부칙 문자열/배열/중첩 배열 파싱
- API 키 없음 fallback
- 외부 API 실패 시 DB cache fallback
- `ID` 상세 조회 실패 시 `MST` fallback
- JSON/XML 상세 응답의 조문 수 비교

대표 검색어:

- `물환경보전법`
- `화학물질관리법`
- `대기환경보전법`
- `폐기물관리법`
- `토양환경보전법`

검증 명령:

```bash
pnpm test
pnpm build
```

## 16. legalize-pipeline에서 참고할 점

`legalize-kr/legalize-pipeline`은 최종 산출물이 DB가 아니라 Markdown/Git 데이터셋이다. 따라서 저장 방식은 그대로 따르지 않는다. 대신 아래 실전 전략을 참고한다.

참고할 점:

- 법령 목록 수집은 `lawSearch.do`에서 시작한다.
- 상세 조회는 `MST` 중심으로 설계할 수 있다.
- 상세 원본은 XML로 보존하면 재파싱과 디버깅에 유리하다.
- 조문은 `조문단위 -> 항 -> 호 -> 목` 계층으로 처리한다.
- 부칙은 별도 단위로 분리한다.
- 증분 업데이트는 공포일 범위, checkpoint, failed list가 필요하다.
- 개정 이력은 별도 파서로 격리한다.

채택하지 않을 점:

- Markdown을 최종 저장소로 쓰지 않는다.
- Git commit을 주된 이력 DB로 쓰지 않는다.
- HTML 이력 파싱을 MVP 핵심 경로에 넣지 않는다.

우리 프로젝트의 방향:

```text
legalize-pipeline: API -> XML -> Markdown/YAML -> Git
our backend: API -> parser -> Postgres/cache -> backend API
```

## 17. 나중에 붙일 확장

백엔드 데이터 계층이 안정화된 뒤 붙인다.

- UI
- AI 대화형 법령 검색
- MCP 서버
- 법령 변경 알림
- 주요 조문 북마크
- 사람이 검수한 요약과 체크리스트
