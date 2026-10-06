"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import type { buildSangunPersonalPreview } from "@/lib/saju/sangun-personal-preview";
import { track } from "@/lib/analytics";
import { formatKRW } from "@/lib/utils";
import template from "./sangun-detail-template.json";
import { renderSangunDetail } from "./sangun-detail-render";

export type SangunPersonalData = ReturnType<typeof buildSangunPersonalPreview>;
// Keep the template object stable so a checkout-state render does not replace
// the personalized DOM and its observers with the empty template.
const detailMarkup = { __html: template.html };

export default function SangunPersonalDetail({ data, price, onBuy, payOpen, inlinePayVisible, onReady }: {
  data: SangunPersonalData; price: number; onBuy: () => void; payOpen: boolean;
  inlinePayVisible: boolean; onReady: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const buyRef = useRef(onBuy);
  const payRef = useRef(payOpen);
  buyRef.current = onBuy;
  payRef.current = payOpen || inlinePayVisible;
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    renderSangunDetail(root, data);
    root.querySelectorAll<HTMLElement>('[data-live-price]').forEach(e => { e.textContent = formatKRW(price); });
    document.documentElement.dataset.sangunDetail = "new";
    onReady();
    return () => { delete document.documentElement.dataset.sangunDetail; };
  }, [data, price, onReady]);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const dialog = root.querySelector<HTMLDialogElement>('#sample-dialog')!;
    const sticky = root.querySelector<HTMLElement>('[data-reference-sticky]');
    const opening = root.querySelector('section');
    const purchaseButtons = Array.from(root.querySelectorAll('[data-open="purchase"], [data-open-purchase]'))
      .filter(button => !sticky?.contains(button));
    const syncSticky = () => {
      if (!sticky || !opening) return;
      const buttonVisible = purchaseButtons.some(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top < innerHeight && r.bottom > 0; });
      sticky.hidden = payRef.current || dialog.open || opening.getBoundingClientRect().bottom > 0 || buttonVisible;
    };
    let opener: HTMLElement | null = null;
    let oldOverflow = "";
    const close = () => { document.body.style.overflow = oldOverflow; opener?.focus({ preventScroll: true }); syncSticky(); };
    const richText = (target: HTMLElement, text: string) => {
      for (const token of text.split(/(\*\*[\s\S]+?\*\*|==[\s\S]+?==)/g)) {
        const bold = token.startsWith("**") && token.endsWith("**");
        const marked = token.startsWith("==") && token.endsWith("==");
        if (bold || marked) { const e = document.createElement(bold ? "strong" : "mark"); e.textContent = token.slice(2, -2); target.append(e); }
        else target.append(document.createTextNode(token));
      }
    };
    const click = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>('button, [data-chapter]') : null;
      if (!target || !root.contains(target)) return;
      if (target.matches('[data-open="purchase"], [data-open-purchase]')) {
        track("detail_buy_click", { slug: "sangun-sinjeom", version: "personal_v1" }); buyRef.current();
      } else if (target.hasAttribute('data-chapter')) {
        const sample = template.samples.find(s => s.chapter === Number(target.dataset.chapter));
        if (!sample) return;
        root.querySelector('#sample-category')!.textContent = sample.label + ' · 다른 사주의 결과';
        root.querySelector('#sample-title')!.textContent = sample.title;
        root.querySelector('#sample-body')!.replaceChildren(...sample.paragraphs.map(text => {
          const heading = /^\*\*[^*]+\*\*$/.test(text) && text.length < 90;
          const p = document.createElement(heading ? 'h3' : 'p');
          if (heading) p.className = 'sample-subheading';
          richText(p, text); return p;
        }));
        opener = target; oldOverflow = document.body.style.overflow;
        dialog.showModal(); dialog.scrollTop = 0; document.body.style.overflow = 'hidden';
        syncSticky();
        track('detail_sample_open', { slug: 'sangun-sinjeom', chapter: sample.chapter });
      } else if (target.hasAttribute('data-close')) dialog.close();
    };
    root.addEventListener('click', click);
    dialog.addEventListener('close', close);
    window.addEventListener('scroll', syncSticky, { passive: true });
    window.addEventListener('resize', syncSticky);
    const payObserver = new MutationObserver(syncSticky);
    payObserver.observe(root, { attributes: true, attributeFilter: ['data-pay-open', 'data-inline-pay-visible'] });
    syncSticky();
    track('detail_shown', { slug: 'sangun-sinjeom', version: 'personal_v1' });
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const reveal = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-seen'); reveal.unobserve(e.target); }
    }), { threshold: 0.12 });
    root.querySelectorAll('[data-reveal], [data-dramatic]').forEach(e => {
      if (reduced.matches) e.classList.add('is-seen'); else reveal.observe(e);
    });
    if (!reduced.matches) root.querySelector('.reading-sequence')?.classList.add('motion-ready');
    const seen = new Set<string>();
    const sections = new IntersectionObserver(entries => entries.forEach(e => {
      if (!e.isIntersecting || seen.has(e.target.id)) return;
      seen.add(e.target.id);
      track('detail_section', { slug: 'sangun-sinjeom', version: 'personal_v1', section: e.target.id });
    }), { threshold: 0.12 });
    root.querySelectorAll('section[id]').forEach(e => sections.observe(e));
    return () => {
      root.removeEventListener('click', click); dialog.removeEventListener('close', close);
      window.removeEventListener('scroll', syncSticky); window.removeEventListener('resize', syncSticky); payObserver.disconnect();
      if (dialog.open) { dialog.close(); document.body.style.overflow = oldOverflow; }
      reveal.disconnect(); sections.disconnect();
    };
  }, []);

  useEffect(() => {
    const amount = ref.current?.querySelector('[data-live-price]');
    if (!amount) return;
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(e => e.isIntersecting)) return;
      track('price_view', { slug: 'sangun-sinjeom', basePrice: price, displayedAmount: price, member: false, stage: 'detail', version: 'personal_v1' });
      observer.disconnect();
    }, { threshold: 0.1 });
    observer.observe(amount);
    return () => observer.disconnect();
  }, [price]);

  return <>
    <link rel="stylesheet" href="/products/sangun/detail-v1/detail.css" precedence="sangun-detail" />
    <div ref={ref} className="sangun-detail-v1 mixed-page sangun-original dialogue-mix personal-page" data-pay-open={payOpen} data-inline-pay-visible={inlinePayVisible} dangerouslySetInnerHTML={detailMarkup} />
  </>;
}
