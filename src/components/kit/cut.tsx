"use client";

// 컷 — 그림 자리. **파일을 폴더에 던지면 그 자리가 켜진다**(코드 수정 0).
//
// 직녀에서 꺼내 상품 고정을 풀었다(2026-08-23). 원래는 폴더·슬롯표가 직녀로 박혀 있어
// 산군·돈달이 같은 규칙을 쓰려면 파일을 통째로 복사해야 했다 — 그게 상품당 3,000줄의 씨앗이었다.
//
// 그림이 0장이어도 화면이 성립해야 대사·배치를 먼저 확정할 수 있다(형님 지시).
import { BgMedia } from "@/components/products/BgMedia";
import { FS, LH, type AssetMap, type SlotDef } from "@/components/kit/scale";

export function SlotCut({
  id,
  assets,
  slots,
  overlay,
  ratio = "4 / 5",
  pos = "center 18%",
  priority,
}: {
  id: string;
  assets?: AssetMap;
  /** 라벨·노트를 플레이스홀더에 찍으려면 상품 슬롯표를 넘긴다(없으면 id 만 뜬다) */
  slots?: readonly SlotDef[];
  /** 컷 위에 얹는 것(말풍선·나레이션) */
  overlay?: React.ReactNode;
  ratio?: string;
  pos?: string;
  priority?: boolean;
}) {
  const meta = slots?.find((s) => s.id === id);
  const a = assets?.[id];
  return (
    <figure className="relative w-full overflow-hidden" style={{ aspectRatio: ratio }}>
      {/* ⚠ BgMedia 는 포스터(img)가 필수다 — mp4 만 넣으면 폴백할 그림이 없어 검은 칸이 된다.
          그 경우엔 영상 승격을 포기하고 아래 이미지/플레이스홀더로 내려앉힌다. */}
      {a?.video && a.img ? (
        <BgMedia video={a.video} img={a.img} alt={meta?.label ?? ""} className="absolute inset-0 h-full w-full object-cover" />
      ) : a?.img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={a.img}
          alt={meta?.label ?? ""}
          // 컷은 **즉시** 받는다. lazy 로 뒀더니 화면 안에 들어와도 로딩이 발화하지 않아
          // 그림이 영영 안 뜨는 판이 나왔다(실측: currentSrc 가 빈 채로 남음).
          loading={priority === false ? "lazy" : "eager"}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: pos }}
        />
      ) : (
        // 그림이 아직 없는 자리. 배경을 하드코딩하면 **밝은 티저 안에서 검은 구멍**이 된다(실측) —
        // 토큰으로 그려서 어두운 무대·밝은 티저 양쪽에 앉게 한다.
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: "var(--gold-pale)", border: "1px dashed var(--gold-line)" }}
        >
          <div className="px-6 text-center">
            <p className="font-myeongjo tracking-[0.14em]" style={{ fontSize: FS.aux, color: "var(--bone-faint)" }}>
              {meta?.label ?? id}
            </p>
            {meta?.note && (
              <p className="mt-1.5" style={{ fontSize: FS.cap, lineHeight: LH.body, color: "var(--bone-faint)", opacity: 0.75 }}>
                {meta.note}
              </p>
            )}
          </div>
        </div>
      )}
      {/* 글자가 앉는 아래쪽만 눌러 준다 — 그림이 들어와도 대사가 그대로 읽힌다 */}
      {overlay && (
        <>
          <div
            className="pointer-events-none absolute inset-0"
            // 스크림도 세계관의 밤으로 — 직녀 값을 박아두면 산군 촛불 컷 아래가 파랗게 뜬다.
            style={{
              background:
                "linear-gradient(180deg, transparent 40%, color-mix(in srgb, var(--night-edge) 74%, transparent) 76%, color-mix(in srgb, var(--night-edge) 96%, transparent) 100%)",
            }}
          />
          <div className="absolute inset-x-5 bottom-4">{overlay}</div>
        </>
      )}
    </figure>
  );
}
