"use client";

// 배경 영상 — 파일이 없거나 못 틀면 같은 자리의 이미지로 조용히 내려앉는다.
// 그래서 영상이 준비되기 전에도 화면이 성립하고, 파일만 올리면 살아난다.
//
// 신당(스토리)과 입력 위저드가 같이 쓴다. 타이트 MZ무당은 입력 중에도 캐릭터 영상이 말을 거는데,
// 그 화면을 만들려면 위저드 배경도 같은 폴백 규칙을 따라야 한다. 로직을 복사하면 반드시 어긋난다.

import { useEffect, useRef, useState } from "react";

export function BgMedia({
  video,
  img,
  alt,
  className,
  loop = true,
  loopVideo,
}: {
  video: string;
  img: string;
  alt: string;
  className: string;
  loop?: boolean; // false = 1회 재생 후 마지막 프레임 정지(게이트: 문 통과 → 제단 앞 도착 연출)
  /** 인트로(video) 1회 재생이 끝나면 이 영상으로 갈아타 무한 루프한다(직녀 게이트: 줌인 → 클로즈업 아이들).
      루프의 첫 프레임 = 인트로의 끝 프레임(같은 그림)으로 만들어야 전환이 안 보인다.
      로드 실패 시 인트로 끝 프레임 정지로 자연 강등 — 검은 화면이 나올 길이 없다. */
  loopVideo?: string;
}) {
  const [fallback, setFallback] = useState(false);
  // "intro" 동안 루프 영상은 opacity 0 으로 미리 로드만 해둔다(전환 순간 로딩 공백 방지)
  const [phase, setPhase] = useState<"intro" | "loop">("intro");
  const ref = useRef<HTMLVideoElement>(null);
  const loopRef = useRef<HTMLVideoElement>(null);

  // 화면이 바뀌어도 React 가 같은 자리의 <video> 노드를 재사용하는데, src 만 갈아끼우면
  // 브라우저는 다시 읽지 않는다(게이트 영상이 스토리 화면까지 그대로 남던 버그).
  // 소스가 바뀌면 폴백 상태를 되돌리고 직접 load() 를 부른다.
  //
  // 그리고 load() 뒤에는 반드시 play() 를 직접 불러야 한다. autoPlay 속성은 **처음 마운트될 때
  // 한 번만** 동작하고, load() 로 리셋된 뒤에는 모바일 브라우저가 스스로 재생을 재개하지 않는다.
  // 데스크톱에서는 그냥 돌아가서 안 보이는데, 폰에서는 여기서 화면이 검게 멈춘다.
  useEffect(() => {
    setFallback(false);
    setPhase("intro");
    const el = ref.current;
    if (!el) return;
    el.load();
    // 자동재생이 막히면(저전력·데이터 절약 모드) 예외가 난다 — 그때는 poster 가 그대로 보이면 된다.
    void el.play().catch(() => {});
  }, [video]);

  if (fallback) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={img} alt={alt} width={860} height={1471} className={className} />;
  }
  return (
    <>
      <video
        ref={ref}
        className={className}
        width={860}
        height={1471}
        autoPlay
        muted
        loop={loopVideo ? false : loop}
        playsInline
        poster={img}
        aria-label={alt}
        onError={() => setFallback(true)}
        onEnded={() => {
          // 인트로가 끝나는 프레임에서 루프로 넘어간다. play() 가 거부되면 phase 를 안 바꿔
          // 인트로 마지막 프레임 정지로 남는다(loop=false 의 기본 동작).
          const lv = loopRef.current;
          if (!loopVideo || !lv) return;
          lv.play().then(() => setPhase("loop")).catch(() => {});
        }}
      >
        {/* <source> 를 여러 개 두면 폰에서 첫 소스를 못 읽는 동안 화면이 검게 남는다.
            src 하나만 두고, 못 읽으면 onError 로 poster/img 에 내려앉힌다. */}
        <source src={video} type="video/mp4" />
      </video>
      {loopVideo && (
        // 인트로와 같은 자리에 겹쳐 두고 opacity 로만 바꾼다 — DOM 상 뒤라서 보일 때 인트로를 덮는다
        <video
          ref={loopRef}
          className={className}
          width={860}
          height={1471}
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden
          style={phase === "intro" ? { opacity: 0 } : undefined}
        >
          <source src={loopVideo} type="video/mp4" />
        </video>
      )}
      {/* 생성 툴이 우하단에 남기는 워터마크를 묻는 비네팅.
          실측(720x1280): 오른쪽 125px · 아래 129px 지점, 최대 밝기 95.
          잘라내려면 화면이 20% 넘게 날아가서, 모서리만 어둡게 덮는다.
          배경 영상 위엔 어차피 어두운 그라데이션이 얹히므로 비네팅으로만 읽힌다. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 100% 100%, rgba(7,6,9,0.92) 0%, rgba(7,6,9,0.55) 22%, rgba(7,6,9,0) 42%)",
        }}
      />
    </>
  );
}
