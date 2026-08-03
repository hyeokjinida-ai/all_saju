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
}: {
  video: string;
  img: string;
  alt: string;
  className: string;
  loop?: boolean; // false = 1회 재생 후 마지막 프레임 정지(게이트: 문 통과 → 제단 앞 도착 연출)
}) {
  const [fallback, setFallback] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);

  // 화면이 바뀌어도 React 가 같은 자리의 <video> 노드를 재사용하는데, <source> 주소만 갈아끼우면
  // 브라우저는 다시 읽지 않는다(게이트 영상이 스토리 화면까지 그대로 남던 버그).
  // 소스가 바뀌면 폴백 상태를 되돌리고 직접 load() 를 불러 새 영상을 읽게 한다.
  useEffect(() => {
    setFallback(false);
    ref.current?.load();
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
        loop={loop}
        playsInline
        poster={img}
        aria-label={alt}
        onError={() => setFallback(true)}
      >
        <source src={video} type="video/mp4" onError={() => setFallback(true)} />
      </video>
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
