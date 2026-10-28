"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { SajuTeaser } from "@/lib/saju/teaser";
import type { ResultView } from "@/lib/saju/result-view";
import type { SangunPersonalData } from "@/components/products/SangunPersonalDetail";
import { PARTNER_OPTIONS, RELATIONSHIP_OPTIONS, JOB_OPTIONS } from "@/lib/saju/profile-tags";
import { siteConfig, businessInfo } from "@/config/site";
import { reportReadingLines } from "./report-reading-copy";
import styles from "./SajuReportFlow.module.css";

export type ReportFormValues = {
  name: string; birthDate: string; birthTime: string; timeUnknown: boolean;
  gender: "male" | "female" | ""; calendar: "solar" | "lunar" | "";
  partner: string; relationship: string; job: string; concerns: string[]; concernText: string;
};

const CONCERN_LABELS = ["재물", "연애·결혼", "일·이직", "건강", "올해 흐름", "앞으로의 변화"];
const ELEMENT_LABELS: Record<string, string> = {wood:"목",fire:"화",earth:"토",metal:"금",water:"수"};

export function ReportInput({ value, birthDisplay, concerns, error, onBirthInput, onUpdate, onSubmit }: {
  value: ReportFormValues; birthDisplay: string; concerns: string[]; error: string | null;
  onBirthInput: (value: string) => void;
  onUpdate: <Key extends keyof ReportFormValues>(key: Key, value: ReportFormValues[Key]) => void;
  onSubmit: () => void;
}) {
  const birthRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (error && !value.birthDate) birthRef.current?.focus(); }, [error, value.birthDate]);
  return (
    <form onSubmit={event => {event.preventDefault(); onSubmit();}} noValidate aria-label="무료 사주 미리보기 입력">
      <Link href="/" className={styles.brand}>명운록</Link>
      <p className={styles.eyebrow}>무료 미리보기</p>
      <h1 className={styles.title}>내 사주를<br />먼저 살펴보세요</h1>
      <p className={styles.intro}>생년월일과 기본 정보를 입력하면 사주의 구성과 요약을 볼 수 있어요. 전체 풀이 구매는 미리보기를 본 뒤 선택해 주세요.</p>
      {error && <p id="report-input-error" role="alert" className={styles.error}>{error}</p>}
      <div className={styles.card}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="report-birth">생년월일</label>
          <input ref={birthRef} id="report-birth" className={styles.input} value={birthDisplay}
            onChange={event => onBirthInput(event.target.value)} inputMode="numeric" autoComplete="bday"
            placeholder="예: 1994.06.01" maxLength={10} aria-required="true"
            aria-invalid={!!error && !value.birthDate} aria-describedby={error ? "report-input-error" : undefined} />
        </div>
        <fieldset className={styles.field}>
          <legend className={styles.label}>양력·음력</legend>
          <div className={styles.choices}>
            {([['solar','양력'],['lunar','음력']] as const).map(([key,label]) => <label key={key} className={styles.choice}>
              <input type="radio" name="report-calendar" value={key} checked={value.calendar===key} onChange={() => onUpdate('calendar',key)} /><span>{label}</span>
            </label>)}
          </div>
        </fieldset>
        <fieldset className={styles.field}>
          <legend className={styles.label}>성별</legend>
          <div className={styles.choices}>
            {([['female','여성'],['male','남성']] as const).map(([key,label]) => <label key={key} className={styles.choice}>
              <input type="radio" name="report-gender" value={key} checked={value.gender===key} onChange={() => onUpdate('gender',key)} /><span>{label}</span>
            </label>)}
          </div>
        </fieldset>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="report-time">태어난 시각</label>
          <input id="report-time" type="time" className={styles.input} value={value.birthTime}
            disabled={value.timeUnknown} onChange={event => onUpdate('birthTime',event.target.value)} />
          <label className={styles.check}><input type="checkbox" checked={value.timeUnknown} onChange={event => onUpdate('timeUnknown',event.target.checked)} />태어난 시각을 몰라요</label>
        </div>
      </div>
      <details className={styles.details}>
        <summary>내 상황과 궁금한 점 <span className={styles.optional}>선택</span></summary>
        <div className={styles.detailsBody}>
          <div className={styles.field}><label htmlFor="report-name" className={styles.label}>결과지에 쓸 이름 <span className={styles.optional}>선택</span></label>
            <input id="report-name" className={styles.input} maxLength={30} value={value.name} placeholder="이름 또는 별명" autoComplete="nickname" onChange={e=>onUpdate('name',e.target.value)} /></div>
          <div className={styles.field}><label htmlFor="report-partner" className={styles.label}>마음이 가는 상대</label>
            <select id="report-partner" className={styles.select} value={value.partner} onChange={e=>onUpdate('partner',e.target.value)}><option value="">선택하지 않을게요</option>{PARTNER_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
          <div className={styles.field}><label htmlFor="report-relationship" className={styles.label}>현재 관계</label>
            <select id="report-relationship" className={styles.select} value={value.relationship} onChange={e=>onUpdate('relationship',e.target.value)}><option value="">선택하지 않을게요</option>{RELATIONSHIP_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
          <div className={styles.field}><label htmlFor="report-job" className={styles.label}>현재 하는 일</label>
            <select id="report-job" className={styles.select} value={value.job} onChange={e=>onUpdate('job',e.target.value)}><option value="">선택하지 않을게요</option>{JOB_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
          <fieldset className={styles.field}><legend className={styles.label}>궁금한 주제 <span className={styles.optional}>여러 개 선택할 수 있어요</span></legend><div className={styles.chips}>{concerns.map((concern,index)=><button key={concern} type="button" className={styles.chip} aria-pressed={value.concerns.includes(concern)} onClick={()=>onUpdate('concerns',value.concerns.includes(concern)?value.concerns.filter(c=>c!==concern):[...value.concerns,concern])}>{CONCERN_LABELS[index]??concern}</button>)}</div></fieldset>
          <div className={styles.field}><label className={styles.label} htmlFor="report-question">직접 묻고 싶은 내용 <span className={styles.optional}>선택</span></label><textarea id="report-question" className={styles.textarea} value={value.concernText} maxLength={500} placeholder="지금 가장 궁금한 점을 적어주세요." onChange={e=>onUpdate('concernText',e.target.value)} /><p className={styles.help}>적어주신 내용은 전체 풀이를 만들 때 함께 참고해요.</p></div>
        </div>
      </details>
      <button type="submit" className={styles.primary}>무료 미리보기 보기</button>
      <p className={styles.privacy}>이 단계에서는 결제되지 않아요.<br />결과 받을 이메일은 구매를 선택한 뒤 입력해 주세요.</p>
    </form>
  );
}

export function ReportPreview({ teaser, pillars, personal, loading, error, name, birthDate, calendar, timeUnknown, busy = false, onEdit, onRetry, onBuy }: {
  teaser: SajuTeaser | null; pillars: ResultView['pillars'] | null; personal: SangunPersonalData | null;
  loading: boolean; error: string | null; name: string; birthDate: string; calendar: string; timeUnknown: boolean; busy?: boolean;
  onEdit: () => void; onRetry: () => void; onBuy: () => void;
}) {
  const headingRef=useRef<HTMLHeadingElement>(null);
  useEffect(()=>{if(!loading)headingRef.current?.focus({preventScroll:true});},[loading]);
  if(loading)return <section className={styles.loading} role="status" aria-live="polite"><span className={styles.loadingMark} aria-hidden="true" /><h1>사주를 살펴보고 있어요</h1><p>입력한 생년월일로 사주를 계산해<br />미리보기를 준비하고 있어요.</p></section>;
  const columns=personal?.chart.columns ?? (pillars??[]).slice().reverse().filter(p=>p.gan.char!=='?');
  const lines=reportReadingLines(teaser?.coldRead??[]);
  const elements=personal?.chart.elements??[];
  return <>
    <Link href="/" className={styles.brand}>명운록</Link>
    <p className={styles.eyebrow}>사주 미리보기</p>
    <h1 className={styles.title} ref={headingRef} tabIndex={-1}>{teaser?`${name?`${name}님의`:'나의'} 사주를 살펴봤어요`:'미리보기를 준비하지 못했어요'}</h1>
    <p className={styles.birthLine}>{birthDate.replaceAll('-','.')} · {calendar==='lunar'?'음력':'양력'}{timeUnknown?' · 태어난 시각 미상':''}</p>
    {error&&<div role="alert" className={styles.error}><p>{error}</p><button type="button" className={styles.secondary} disabled={busy} onClick={onRetry}>다시 시도하기</button></div>}
    {lines.length>0&&<section className={styles.card}><h3 className={styles.cardTitle}>먼저 살펴볼 성향</h3><ul className={styles.summaryList}>{lines.map((line,index)=><li key={index}>{line}</li>)}</ul><p className={styles.note}>사주 해석을 바탕으로 한 참고 풀이예요. 실제 경험과 함께 살펴보세요.</p></section>}
    {columns.length>0&&<section className={styles.card}><h3 className={styles.cardTitle}>나의 사주 구성</h3><table className={styles.table}><thead><tr>{columns.map((p,index)=><th key={index} scope="col">{p.label}{p.isDay?' · 나':''}</th>)}</tr></thead><tbody><tr>{columns.map((p,index)=><td key={index}><strong>{p.gan.char}</strong><small>{p.gan.read} · {ELEMENT_LABELS[p.gan.element]??p.gan.element}</small></td>)}</tr><tr>{columns.map((p,index)=><td key={index}><strong>{p.ji.char}</strong><small>{p.ji.read} · {ELEMENT_LABELS[p.ji.element]??p.ji.element}</small></td>)}</tr></tbody></table>{elements.length>0&&<div className={styles.elementList} aria-label="오행 분포">{elements.map(e=><div className={styles.element} key={e.key}><strong>{e.count}</strong><span>{ELEMENT_LABELS[e.key]??e.key}</span></div>)}</div>}<p className={styles.note}>입력한 출생 정보로 계산한 구성이에요.{timeUnknown?' 태어난 시각을 모르면 시주는 표시하지 않아요.':''}</p></section>}
    {teaser&&<><section className={styles.card}><h3 className={styles.cardTitle}>전체 풀이에서 이어서 볼 내용</h3><ul className={styles.lockedList}>{teaser.locked.slice(0,6).map((item,index)=><li key={index}>{item.label.replaceAll('네 ','나의 ')}</li>)}</ul><p className={styles.note}>위 내용은 전체 풀이에서 확인할 수 있어요. 다음 화면에서 단품 또는 묶음 상품의 구성과 금액을 선택해 주세요.</p></section><p className={styles.ctaNote}>미리보기는 여기까지 무료예요.<br />전체 풀이가 필요하다면 상품을 선택해 주세요.</p><button type="button" className={styles.primary} disabled={busy} onClick={onBuy}>전체 풀이 구성·가격 보기</button></>}
    <button type="button" className={styles.secondary} disabled={busy} onClick={onEdit}>입력 정보 수정하기</button>
  </>;
}

export function ReportFooter(){return <footer>
  <nav className={styles.footer} aria-label="이용 안내"><Link href="/legal/terms">이용약관</Link><Link href="/legal/privacy">개인정보처리방침</Link><Link href="/legal/refund-policy">환불 안내</Link><Link href="/">명운록 홈</Link></nav>
  <div className={styles.footerBusiness}>
    <p>{businessInfo.companyName} · 대표 {businessInfo.representative}</p>
    <p>사업자등록번호 {businessInfo.businessNumber}<br />통신판매업 신고번호 {businessInfo.mailOrderNumber}</p>
    <p>{businessInfo.address}</p>
    <p>고객센터 {businessInfo.email}{businessInfo.phone?` · ${businessInfo.phone}`:''}</p>
    <p>© {new Date().getFullYear()} {siteConfig.name}</p>
  </div>
</footer>;}

export { styles as reportStyles };
