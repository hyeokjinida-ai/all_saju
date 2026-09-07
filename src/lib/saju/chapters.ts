// =====================================================
// 결과지 챕터 파서 — **출고 검사(서버)와 조판(화면)이 같은 자를 쓴다.**
// 자를 두 벌 두면 화면엔 보이는 장이 검사에선 안 보인다(2026-08-29: 되물음 게이트가
// 자기만의 정규식을 들고 있다가 `\s` 이스케이프가 문자열 안에서 풀려 한 번도 안 맞았다).
// =====================================================

export type Chapter = { title: string; body: string };

/** 아직 못 쓴 장에 대신 박아 두는 줄.
 *  손님에겐 「준비 중」으로 읽히고, 복구 크론에겐 「이 결과지는 아직 안 끝났다」는 표시가 된다.
 *  ⚠ 이 문구를 바꾸면 **이미 저장된 미완 결과지를 크론이 못 찾는다.** 바꿀 때는
 *     PENDING_MARK 를 옛 문구까지 포함하도록 넓힐 것. */
export const PENDING_CHAPTER_NOTE = "*(이 장은 아직 준비 중입니다. 잠시 뒤 다시 열어 주세요.)*";

/** 자리표시 판별용 불변 조각 — 위 문구에서 장식(괄호·별표)을 뺀 본체. */
const PENDING_MARK = "이 장은 아직 준비 중입니다";

export function isPendingChapter(body: string | null | undefined): boolean {
  return !!body && body.includes(PENDING_MARK);
}

/** 저장된 결과지에 남아 있는 미완 장의 수. 0 이면 완성본. */
export function countPendingChapters(md: string | null | undefined): number {
  if (!md) return 0;
  return splitChapters(md).chapters.filter((c) => isPendingChapter(c.body)).length;
}

/** 모델이 본문 대신 **자료를 달라고 되묻는** 장인지.
 *
 * 챕터 호출은 성공(200)으로 떨어지므로 완성도 카운터는 이걸 성공으로 센다 — 그래서
 * 「### 4. 결혼하는 해」 자리에 "아래 세 가지만 보내주세요"가 박힌 결과지가 게이트를
 * 통과해 손님에게 나갈 수 있다(2026-08-21 실측: 결혼사주 1·4장에서 재현).
 * 값이 실제로 프롬프트에 있어도 모델이 못 찾았다고 판단하면 이 문장이 나오므로,
 * 프롬프트를 고치는 것과 별개로 **생성 단계에서 실패로 취급해 다시 던진다.** */
export function looksLikeDataRequest(md: string | null | undefined): boolean {
  if (!md) return false;
  return /(보내\s?주세요|보내주시면|값이 오면|자료만 보내|작성할 수 없)/.test(md);
}

/** 헤딩 줄을 뺀 본문이 실제로 채워졌는지. 빈 결과지 저장을 막는 최소 기준. */
export function hasRealInterpretation(md: string | null | undefined): boolean {
  if (!md) return false;
  const body = md.replace(/^#{1,3}\s.*$/gm, "").trim(); // 헤딩 줄 제거 후 본문만
  return body.length >= 40;
}

// ## 대제목은 버리고, ### 단위로 챕터를 가른다. 첫 ### 이전 글은 intro.
// (산군·직녀 결과지와 출고 검사가 전부 이 파서를 쓴다 — 따로 만들면 챕터 경계가 어긋난다)
export function splitChapters(md: string): { intro: string; chapters: Chapter[] } {
  const chapters: Chapter[] = [];
  const intro: string[] = [];
  let cur: { title: string; body: string[] } | null = null;
  // CRLF 내성: 윈도우에서 저장·복사된 md 는 줄끝에 \r 이 남는다. \r 이 있으면 `(.*)$` 가
  // 통째로 안 걸려 챕터 0개 → 결과지 전체가 intro 로 뭉개진다(회귀 테스트에서 실측).
  for (const rawLine of md.split("\n")) {
    const line = rawLine.replace(/\r$/, "");
    const h3 = line.match(/^###\s+(.*)$/);
    if (h3) {
      if (cur) chapters.push({ title: cur.title, body: cur.body.join("\n").trim() });
      cur = { title: h3[1].trim(), body: [] };
    } else if (/^##\s+/.test(line)) {
      continue; // 전체 제목 줄은 버림(상단에서 이미 노출)
    } else if (cur) {
      cur.body.push(line);
    } else {
      intro.push(line);
    }
  }
  if (cur) chapters.push({ title: cur.title, body: cur.body.join("\n").trim() });
  return { intro: intro.join("\n").trim(), chapters };
}

/** 재생성분이 이전 저장분보다 나빠지지 않게 **장 단위로 좋은 쪽을 남긴다.**
 *
 *  왜 필요한가: 미완 결과지는 크론이 다시 만든다. 그런데 재생성은 전 장을 새로 뽑으므로,
 *  이번 판에서 다른 장이 실패하면 **이미 잘 나온 장을 자리표시로 덮어쓴다.** 그러면
 *  손님의 결과지가 재시도 때마다 좋아졌다 나빠졌다 한다. 여기서 단조 증가로 못 박는다.
 *
 *  미완 장이 하나도 없으면 next 를 **손대지 않고 그대로** 돌려준다 —
 *  정상 결과지가 이 함수를 지나며 공백만 바뀌는 일이 없어야 한다. */
export function mergeCompletedChapters(prevMd: string | null | undefined, nextMd: string): string {
  const next = splitChapters(nextMd);
  if (!next.chapters.some((c) => isPendingChapter(c.body))) return nextMd;
  if (!prevMd) return nextMd;

  const prevByTitle = new Map(splitChapters(prevMd).chapters.map((c) => [c.title, c]));
  let salvaged = 0;
  const merged = next.chapters.map((c) => {
    if (!isPendingChapter(c.body)) return c;
    const old = prevByTitle.get(c.title);
    if (!old || isPendingChapter(old.body) || !old.body.trim()) return c;
    salvaged++;
    return old;
  });
  if (!salvaged) return nextMd;

  const docTitle = nextMd.match(/^##\s+(.*)$/m)?.[1]?.trim();
  return [
    docTitle ? `## ${docTitle}` : null,
    next.intro || null,
    ...merged.map((c) => `### ${c.title}\n\n${c.body}`),
  ]
    .filter(Boolean)
    .join("\n\n");
}
