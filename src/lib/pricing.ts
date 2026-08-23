/**
 * 값 계산 한 곳 — 주문 생성(서버)과 결제 화면(영수증)이 **같은 상수**를 본다.
 *
 * ⚠ 전에는 `api/orders/create/route.ts` 안에만 있었다. 결제 화면이 「회원 할인 -1,900원」을
 *    보여주려면 같은 숫자가 필요한데, 화면이 자기 숫자를 따로 쓰면 영수증과 실제 청구액이
 *    갈라진다(그런 화면은 손님이 결제를 멈춘다). 그래서 여기로 뺐다.
 *
 * ⚠ 금액은 **언제나 서버에서 산정**한다. 이 파일은 그 산정식을 공유할 뿐,
 *    클라이언트가 보낸 금액을 믿는 자리는 어디에도 없다(orders/confirm 이 재검증).
 */

/** 회원(로그인) 할인. 비회원은 정가. */
export const MEMBER_DISCOUNT = 1900;

/** 토스 최소 결제금액 방어 — 가격/할인 오설정으로 0원 위젯 에러가 나는 걸 막는다. */
export const MIN_CHARGE = 100;

/** 이 손님이 이 상품을 살 때 실제로 청구되는 금액 */
export function chargeFor(price: number, isMember: boolean): number {
  return Math.max(0, price - (isMember ? MEMBER_DISCOUNT : 0));
}
