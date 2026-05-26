import test from "node:test";
import assert from "node:assert/strict";

import { parseSearchPayload } from "../lib/law/search-parser";

test("law API parser keeps legacy representative search coverage", () => {
  const items = parseSearchPayload({
    LawSearch: {
      law: {
        법령명한글: "화학물질관리법",
        소관부처명: "환경부",
        현행연혁코드: "현행",
        법령ID: "000162",
      },
    },
  });

  assert.equal(items[0]?.title, "화학물질관리법");
  assert.equal(items[0]?.status, "현행");
});
