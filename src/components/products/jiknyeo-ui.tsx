"use client";

// 직녀 공용 UI — **몰입 랜딩(JiknyeoStory)과 결제 전 티저(SajuWizard)가 같이 쓴다.**
//
// 왜 따로 뺐나: 같은 세계관인데 컷 렌더링 규칙이 파일마다 따로 있으면 반드시 어긋난다
// (실측으로 겪음 — 랜딩은 슬롯 방식인데 티저만 이미지 경로를 손으로 박아 화풍이 갈렸다).
// 슬롯 규칙은 여기 한 곳에만 둔다.
import { BgMedia } from "@/components/products/BgMedia";
import { SLOTS, type Asset, type AssetMap, type SlotId } from "@/lib/jiknyeo-slots";

/** 달빛 팔레트 — JiknyeoLanding 과 같은 값(세계관 한 벌) */
export const MOON = "#d9c7e8";
export const SILVER = "#cfd6e6";
export const LINE = "rgba(207,214,230,0.22)";
export const INK = "linear-gradient(180deg,#0b0f1a 0%,#141026 100%)";

/**
 * 슬롯 컷 — 파일이 있으면 그림(영상 있으면 영상), 없으면 **라벨 붙은 달빛 패널**.
 *
 * 그림이 0장이어도 화면이 성립해야 대사·배치를 먼저 확정할 수 있다(형님 지시).
 * 파일을 폴더에 넣고 새로고침하면 그 자리가 그대로 켜진다 — 코드 수정 0.
 */
export function SlotCut({
  id,
  assets,
  overlay,
  ratio = "4 / 5",
  pos = "center 18%",
  priority,
}: {
  id: SlotId;
  assets?: AssetMap;
  /** 컷 위에 얹는 것(말풍선·나레이션) */
  overlay?: React.ReactNode;
  ratio?: string;
  pos?: string;
  priority?: boolean;
}) {
  const meta = SLOTS.find((s) => s.id === id);
  const a: Asset | undefined = assets?.[id];
  return (
    <figure className="relative w-full overflow-hidden" style={{ aspectRatio: ratio }}>
      {/* ⚠ BgMedia 는 포스터(img)가 필수다 — mp4 만 넣으면 폴백할 그림이 없어 검은 칸이 된다.
          그 경우엔 영상 승격을 포기하고 아래 이미지/플레이스홀더로 내려앉힌다. */}
      {a?.video && a.img ? (
        <BgMedia video={a.video} img={a.img} alt={meta?.label ?? ""} className="absolute inset-0 h-full w-full object-cover" />
      ) : a?.img ? (
        <img
          src={a.img}
          alt={meta?.label ?? ""}
          loading={priority ? "eager" : "lazy"}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: pos }}
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            background:
              "radial-gradient(ellipse 90% 60% at 50% 24%, #241d3f 0%, transparent 70%), radial-gradient(circle 130px at 50% 22%, rgba(207,214,230,0.20) 0%, transparent 100%), linear-gradient(180deg,#141026,#0b0f1a)",
          }}
        >
          <div className="px-6 text-center">
            <p className="font-myeongjo text-[13px] tracking-[0.14em]" style={{ color: SILVER, opacity: 0.85 }}>
              {meta?.label ?? id}
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed" style={{ color: "#98a0b4" }}>
              {meta?.note ?? ""}
            </p>
          </div>
        </div>
      )}
      {/* 글자가 앉는 아래쪽만 눌러 준다 — 그림이 들어와도 대사가 그대로 읽힌다 */}
      {overlay && (
        <>
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "linear-gradient(180deg, rgba(11,15,26,0) 40%, rgba(11,15,26,0.74) 76%, rgba(11,15,26,0.96) 100%)" }}
          />
          <div className="absolute inset-x-5 bottom-4">{overlay}</div>
        </>
      )}
    </figure>
  );
}

/** 나레이션 — 이야기가 말하는 자리(사각 박스). 캐릭터 대사(말풍선)와 반드시 구분한다. */
export function Narration({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-[4px] px-4 py-3"
      style={{ background: "rgba(11,15,26,0.82)", border: `1px solid ${LINE}`, backdropFilter: "blur(2px)" }}
    >
      <p className="font-myeongjo text-[19px] leading-[1.75]" style={{ color: "#cfd0d8" }}>
        {children}
      </p>
    </div>
  );
}

/** 은사 디바이더 — 붉은 실의 대체(직녀는 NO RED) */
export function SilverThread() {
  return (
    <div className="flex justify-center py-6">
      <svg aria-hidden viewBox="0 0 12 72" className="h-16 w-3">
        <path d="M6 0 C 8 14, 4 22, 6 34 C 8 46, 4 56, 6 72" stroke={SILVER} strokeOpacity="0.55" strokeWidth="1.2" fill="none" />
        <circle cx="6" cy="35" r="2.2" fill={SILVER} fillOpacity="0.9" />
      </svg>
    </div>
  );
}
