"use client";

// 카탈로그 본체 — `/dev/kit` 이 스킨마다 이걸 한 벌씩 세운다. **개발 전용**(운영 화면에서 쓰지 않는다).
// 부품을 추가하면 여기에도 한 줄 넣는다 — 안 넣으면 그 부품은 아무도 안 보고 지나간다.
import { FS } from "@/components/kit/scale";
import { Head, Peak, Badge, Body, Cap, Rule, Em, Val, BigNum } from "@/components/kit/type";
import { HanjiCard, BarCard, Chip, LockRow, DarkBand, ChatLine } from "@/components/kit/panel";
import { ComicSay, ThoughtBubble, Narration, Sfx, TiltCut, InkFade } from "@/components/kit/comic";
import { InkMark, ScribbleLine, ScribbleStar, NeonMask, GlowBand, ThreadDivider } from "@/components/kit/ink";
import { Lettering } from "@/components/kit/lettering";
import { SlotCut } from "@/components/kit/cut";

const SLOTS = [{ id: "demo", label: "데모 · 그림 없는 자리", note: "파일을 넣으면 여기가 켜진다" }];

function Row({ t, children }: { t: string; children: React.ReactNode }) {
  return (
    <div className="mt-9">
      <p className="mb-2 tracking-[0.14em]" style={{ fontSize: FS.cap, color: "var(--bone-faint)" }}>
        {t}
      </p>
      {children}
    </div>
  );
}

export function KitCatalog() {
  return (
    <div>
      <Row t="LETTERING — 제호(획 테두리 · 폭 고정)">
        <Lettering text="연애예보" height={260} stretch={1.15} />
      </Row>

      <Row t="TYPE — 헤드 · 정점 · 본문 · 캡션">
        <Badge>POINT 1</Badge>
        <div className="mt-3">
          <Head lines={["내 연애 이야기를", "그림으로 읽어요"]} accent={1} />
        </div>
        <Rule />
        <Body>
          줄글로 빼곡한 결과지, 끝까지 읽으신 적 있으세요? 여기선 <Em>그림으로</Em> 읽습니다.
        </Body>
        <div className="mt-4">
          <Peak>열두 달 전부</Peak>
        </div>
        <div className="mt-3 text-center">
          <BigNum value={9} unit="회" />
          <ScribbleStar className="ml-1" />
        </div>
        <div className="mt-3">
          <Cap>* 캡션은 여기까지. 정점 한 줄만 크고 나머지는 조용해야 한다.</Cap>
        </div>
      </Row>

      <Row t="INK — 형광펜 · 낙서 · 가림 · 발광">
        <Body center={false}>
          이 문장에 도착하면 <InkMark>형광펜이 그어진다</InkMark>.
        </Body>
        <div className="mt-3">
          <ScribbleLine />
        </div>
        <p className="mt-4 text-center">
          <NeonMask />
        </p>
        <div className="mt-4">
          <GlowBand>
            <Head lines={["발광 띠 위의 헤드"]} />
          </GlowBand>
        </div>
        <ThreadDivider />
      </Row>

      <Row t="PANEL — 한지 · 바 카드 · 칩 · 잠금">
        <HanjiCard>
          <p className="font-bold" style={{ fontSize: FS.say, color: "var(--ink-mu)" }}>
            1장. 내 인연 그릇
          </p>
          <p className="mt-1" style={{ fontSize: FS.body, color: "var(--ink-mu)", opacity: 0.75 }}>
            풀이 1. 내가 타고난 연애 그릇은?
          </p>
        </HanjiCard>
        <div className="mt-3">
          <BarCard>
            <p style={{ fontSize: FS.body, color: "var(--bone)" }}>계산이 먼저, 문장은 그다음</p>
          </BarCard>
        </div>
        <div className="mt-3 flex gap-2">
          <Chip>솔로탈출 가능해요</Chip>
          <Chip>热 인기</Chip>
        </div>
        <div className="mt-4">
          <LockRow label="처음 마주치는 곳" />
          <LockRow label="그 사람의 나이대" />
        </div>
      </Row>

      <Row t="COMIC — 말풍선 · 생각 · 나레이션 · 효과음 · 기울임">
        <ComicSay name="직녀" tail="down">
          달이 열리는 자리는 정해져 있어요.
        </ComicSay>
        <div className="mt-6">
          <ThoughtBubble>…이번에도 아닌가?</ThoughtBubble>
        </div>
        <div className="mt-4">
          <Narration>은하수가 갈라지던 밤, 까치들이 다리를 놓았다.</Narration>
        </div>
        <div className="mt-4 flex items-center gap-4">
          <Sfx>멈칫</Sfx>
          <Sfx rotate={9} color="var(--gold-bright)">
            갸웃
          </Sfx>
        </div>
        <div className="mt-4">
          <TiltCut deg={-2.5} bleed={false}>
            <SlotCut id="demo" slots={SLOTS} ratio="16 / 9" />
          </TiltCut>
        </div>
      </Row>

      <Row t="CUT — 그림 없는 자리(슬롯) + 대사 오버레이">
        <SlotCut id="demo" slots={SLOTS} ratio="4 / 5" overlay={<ComicSay name="직녀">여기가 컷 위 대사 자리예요.</ComicSay>} />
      </Row>

      <Row t="TEXTURE — 그레인 · 사선 광택 (통짜 색면의 AI 티를 지운다)">
        <div className="flex gap-3">
          <div className="tx-grain flex-1 overflow-hidden rounded-[10px] py-8 text-center" style={{ background: "var(--gold-pale)", border: "1px solid var(--gold-line)" }}>
            <span style={{ fontSize: FS.aux, color: "var(--bone)" }}>.tx-grain</span>
          </div>
          <div className="tx-gloss flex-1 overflow-hidden rounded-[10px] py-8 text-center" style={{ background: "var(--gold-soft)", border: "1px solid var(--gold-line)" }}>
            <span style={{ fontSize: FS.aux, color: "var(--wine-deep)" }}>.tx-gloss</span>
          </div>
        </div>
      </Row>

      <Row t="INK FADE + DARK BAND — 섹션 사이 먹 번짐 · 짧은 어두운 밴드">
        <InkFade height={70} />
        <DarkBand>
          <ChatLine>요즘 사람은 만나는데 왜 이어지질 않을까요</ChatLine>
          <ChatLine>올해는 결혼 얘기가 나올까요</ChatLine>
        </DarkBand>
        <InkFade height={70} flip />
      </Row>
    </div>
  );
}
