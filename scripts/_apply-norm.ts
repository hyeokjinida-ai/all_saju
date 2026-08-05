// 후처리 정규화기를 기존 결과지 md 에 적용해 본다(재생성 없이 효과만 확인).
import { readFileSync, writeFileSync } from "node:fs";
import { normalizeResultVoice } from "../src/lib/saju/normalize-voice";
const [src, dst, name] = process.argv.slice(2);
const { text, fixed } = normalizeResultVoice(readFileSync(src, "utf8"), { banmal: true, name: name ?? null });
console.log("교정:", fixed.map((f) => `${f.rule} ${f.before}건`).join(" · ") || "없음");
writeFileSync(dst, text, "utf8");
