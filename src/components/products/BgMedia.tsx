"use client";

// 배경 영상 — 파일이 없거나 못 틀면 같은 자리의 이미지로 조용히 내려앉는다.
// 그래서 영상이 준비되기 전에도 화면이 성립하고, 파일만 올리면 살아난다.
//
// 신당(스토리)과 입력 위저드가 같이 쓴다. 타이트 MZ무당은 입력 중에도 캐릭터 영상이 말을 거는데,
// 그 화면을 만들려면 위저드 배경도 같은 폴백 규칙을 따라야 한다. 로직을 복사하면 반드시 어긋난다.

import { useState } from "react";

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
  if (fallback) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={img} alt={alt} width={860} height={1471} className={className} />;
  }
  return (
    <video
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
  );
}
