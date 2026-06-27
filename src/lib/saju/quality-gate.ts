// =====================================================
// 결정론적 품질 게이트 — 가족 단정 차단(검출 → 재생성 → 최후 문장 제거)
// =====================================================
// 실측: 프롬프트 지시만으로는 "자녀와의 관계가 깊어집니다" 같은 가족 단정이 종종 남는다.
// 미혼·무자녀 고객에게 이런 단정은 신뢰를 한 번에 무너뜨린다. LLM 출력 후 코드로 검출해,
// 단정형이면 그 챕터를 1회 재생성하고, 그래도 남으면 문장 단위로 제거한다.
// 조건형("자녀가 있으시다면~")은 통과시킨다.
//
// ⚠️ 나이 자동 교정은 두지 않는다: 출력의 "NN세"가 '현재 나이 오기'인지 '대운 N세 시점
//    언급'인지 문장 맥락 없이 구분할 수 없어, 정당한 대운 나이를 오히려 망가뜨린다(리뷰 확인).
//    나이 정확도는 프롬프트의 [확정 사실] 주입(buildKeyFactsBlock)으로 처리한다.

// 직접 가족 구성원 지칭 — 자녀/자식 존재·상태 단정 신호.
// '딸'은 딸기·딸깍·딸린·딸려·딸랑·딸꾹 등 동음 substring 오탐을 부정형 lookahead로 배제.
// (한글은 \b·[^가-힣] 경계가 통하지 않아 조사 이/을/과가 붙은 정상형까지 막히므로 쓰지 않는다.)
const FAMILY_WORD = /자녀|자식|아들|아드님|자제분|딸(?!기|깍|린|려|랑|꾹)/;

// 배우자 존재 단정 — 주격/목적격 조사 + 바로 뒤 존재 동사로 좁힌다.
// 넓은 lookahead(…20자…있)는 "배우자와의 미래에 대한 불안이 있습니다" 같은 정상 문장을
// 오삭제하므로 금지. '…와/과' 소유격형은 (이|가|을|를) 에 안 걸려 자연히 제외된다.
const SPOUSE_EXIST = /(배우자|남편|아내|부인|신랑|신부)(이|가|을|를)\s?(있|계신|계십|두|둔)/;

// 조건형은 단정이 아니므로 통과.
const CONDITIONAL = /다면|만약|혹시|있으시|계시/;

// 마침표 뒤 공백이 없어도 문장 분리(공백 없는 경우 앞 조건절이 뒤 단정을 가리는 fail-open 방지).
// 다음 글자 종류는 제한하지 않는다(숫자·따옴표 등으로 시작하는 정상 분리를 깨지 않기 위해).
function splitSentences(line: string): string[] {
  return line.split(/(?<=[.!?])\s*(?=\S)/g);
}

function isFamilyAssertion(s: string): boolean {
  return (FAMILY_WORD.test(s) || SPOUSE_EXIST.test(s)) && !CONDITIONAL.test(s);
}

// 단정형 가족 문장 목록(검출용).
export function findFamilyAssertions(text: string): string[] {
  const out: string[] = [];
  for (const line of text.split("\n")) {
    if (line.startsWith("#")) continue; // 소제목 제외
    for (const s of splitSentences(line)) {
      if (isFamilyAssertion(s)) out.push(s.trim());
    }
  }
  return out;
}

// 재생성으로도 안 잡힌 단정형 가족 문장을 문장 단위로 제거(최후 수단).
export function stripFamilyAssertions(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      if (line.startsWith("#")) return line;
      return splitSentences(line)
        .filter((s) => !isFamilyAssertion(s))
        .join(" ");
    })
    .join("\n");
}
