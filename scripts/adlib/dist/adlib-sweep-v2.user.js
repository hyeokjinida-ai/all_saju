// ==UserScript==
// @name         명운록 · 메타 광고 라이브러리 전카테고리 스윕
// @namespace    myeongunrok.adlib
// @version      0.1.0
// @description  키워드 큐를 돌며 광고 라이브러리 카드를 전량 로드·파싱해 키워드별 JSON으로 내려받는다 (Tampermonkey)
// @match        https://www.facebook.com/ads/library/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

/*
 * 사용법: scripts/adlib/README.md
 * 근거: 00_메타광고_업체랭킹.md §수집 방법 / 00_소재에서상품까지_연결지도.md §9
 *  - 라이브러리는 무한스크롤이 아니라 「더 보기」 버튼. setInterval 로 반복 클릭.
 *  - 착지 URL 은 l.facebook.com/l.php?u= 를 디코드해 host+pathname 만 남긴다 (query 금지).
 *  - 카드 5% 정도는 가상 스크롤로 본문이 비어 나온다. 오차로 안고 간다.
 */
(function () {
  'use strict';

  // build.mjs 가 keywords.json 에서 채운다: [{q, cat, catName, tier}, ...]
  const KEYWORDS = [{"q":"AI 관상","cat":"A","catName":"외모·얼굴·이미지 AI","tier":1},{"q":"얼굴 분석","cat":"A","catName":"외모·얼굴·이미지 AI","tier":1},{"q":"AI 프로필","cat":"A","catName":"외모·얼굴·이미지 AI","tier":1},{"q":"퍼스널컬러","cat":"A","catName":"외모·얼굴·이미지 AI","tier":1},{"q":"AI 사진","cat":"A","catName":"외모·얼굴·이미지 AI","tier":1},{"q":"얼굴 나이","cat":"A","catName":"외모·얼굴·이미지 AI","tier":1},{"q":"외모 점수","cat":"A","catName":"외모·얼굴·이미지 AI","tier":1},{"q":"AI 그림","cat":"A","catName":"외모·얼굴·이미지 AI","tier":1},{"q":"앰플","cat":"B","catName":"뷰티·화장품·미용기기","tier":1},{"q":"세럼","cat":"B","catName":"뷰티·화장품·미용기기","tier":1},{"q":"선크림","cat":"B","catName":"뷰티·화장품·미용기기","tier":1},{"q":"탈모 샴푸","cat":"B","catName":"뷰티·화장품·미용기기","tier":1},{"q":"홈케어 기기","cat":"B","catName":"뷰티·화장품·미용기기","tier":1},{"q":"리프팅","cat":"B","catName":"뷰티·화장품·미용기기","tier":1},{"q":"유아 교구","cat":"C","catName":"육아·유아·초등","tier":1},{"q":"학습지","cat":"C","catName":"육아·유아·초등","tier":1},{"q":"출산 준비물","cat":"C","catName":"육아·유아·초등","tier":1},{"q":"놀이 구독","cat":"C","catName":"육아·유아·초등","tier":1},{"q":"다이어트","cat":"D","catName":"다이어트·운동·바디","tier":1},{"q":"식단 관리","cat":"D","catName":"다이어트·운동·바디","tier":1},{"q":"홈트","cat":"D","catName":"다이어트·운동·바디","tier":1},{"q":"다이어트 챌린지","cat":"D","catName":"다이어트·운동·바디","tier":1},{"q":"체지방","cat":"D","catName":"다이어트·운동·바디","tier":1},{"q":"PT","cat":"D","catName":"다이어트·운동·바디","tier":1},{"q":"무료 특강","cat":"E","catName":"교육·강의·자격증","tier":1},{"q":"온라인 강의","cat":"E","catName":"교육·강의·자격증","tier":1},{"q":"전자책","cat":"E","catName":"교육·강의·자격증","tier":1},{"q":"자격증","cat":"E","catName":"교육·강의·자격증","tier":1},{"q":"AI 활용","cat":"E","catName":"교육·강의·자격증","tier":1},{"q":"챗GPT","cat":"E","catName":"교육·강의·자격증","tier":1},{"q":"원피스","cat":"F","catName":"패션·의류·잡화","tier":1},{"q":"니트","cat":"F","catName":"패션·의류·잡화","tier":1},{"q":"코트","cat":"F","catName":"패션·의류·잡화","tier":1},{"q":"가방","cat":"F","catName":"패션·의류·잡화","tier":1},{"q":"운동화","cat":"F","catName":"패션·의류·잡화","tier":1},{"q":"스니커즈","cat":"F","catName":"패션·의류·잡화","tier":1},{"q":"AI 앱","cat":"G","catName":"앱·SaaS·툴","tier":1},{"q":"AI 툴","cat":"G","catName":"앱·SaaS·툴","tier":1},{"q":"챗봇","cat":"G","catName":"앱·SaaS·툴","tier":1},{"q":"자동화","cat":"G","catName":"앱·SaaS·툴","tier":1},{"q":"노션 템플릿","cat":"G","catName":"앱·SaaS·툴","tier":1},{"q":"유산균","cat":"H","catName":"건강기능식품·헬스케어","tier":1},{"q":"콜라겐","cat":"H","catName":"건강기능식품·헬스케어","tier":1},{"q":"다이어트 보조제","cat":"H","catName":"건강기능식품·헬스케어","tier":1},{"q":"맞춤 영양제","cat":"H","catName":"건강기능식품·헬스케어","tier":1},{"q":"루테인","cat":"H","catName":"건강기능식품·헬스케어","tier":1},{"q":"오메가3","cat":"H","catName":"건강기능식품·헬스케어","tier":1},{"q":"밀키트","cat":"K","catName":"식품·간편식·주류","tier":1},{"q":"간편식","cat":"K","catName":"식품·간편식·주류","tier":1},{"q":"건강식","cat":"K","catName":"식품·간편식·주류","tier":1},{"q":"무선 청소기","cat":"L","catName":"생활·가전·홈리빙","tier":1},{"q":"제습기","cat":"L","catName":"생활·가전·홈리빙","tier":1},{"q":"가습기","cat":"L","catName":"생활·가전·홈리빙","tier":1},{"q":"공기청정기","cat":"L","catName":"생활·가전·홈리빙","tier":1},{"q":"에어프라이어","cat":"L","catName":"생활·가전·홈리빙","tier":1},{"q":"임플란트","cat":"M","catName":"의료·시술·병원(리드젠)","tier":1},{"q":"치아 교정","cat":"M","catName":"의료·시술·병원(리드젠)","tier":1},{"q":"라식","cat":"M","catName":"의료·시술·병원(리드젠)","tier":1},{"q":"탈모 치료","cat":"M","catName":"의료·시술·병원(리드젠)","tier":1},{"q":"비만 클리닉","cat":"M","catName":"의료·시술·병원(리드젠)","tier":1},{"q":"피부과 시술","cat":"M","catName":"의료·시술·병원(리드젠)","tier":1},{"q":"대출","cat":"N","catName":"금융·보험·법률(리드젠)","tier":1},{"q":"보험 비교","cat":"N","catName":"금융·보험·법률(리드젠)","tier":1},{"q":"개인회생","cat":"N","catName":"금융·보험·법률(리드젠)","tier":1},{"q":"세금 환급","cat":"N","catName":"금융·보험·법률(리드젠)","tier":1},{"q":"신용점수","cat":"N","catName":"금융·보험·법률(리드젠)","tier":1},{"q":"강아지 사료","cat":"P","catName":"반려동물","tier":1},{"q":"펫보험","cat":"P","catName":"반려동물","tier":1},{"q":"반려동물 영양제","cat":"P","catName":"반려동물","tier":1},{"q":"강아지 훈련","cat":"P","catName":"반려동물","tier":1},{"q":"사주","cat":"Q","catName":"운세·명리(대조군)","tier":1},{"q":"신점","cat":"Q","catName":"운세·명리(대조군)","tier":1},{"q":"궁합","cat":"Q","catName":"운세·명리(대조군)","tier":1},{"q":"재회","cat":"Q","catName":"운세·명리(대조군)","tier":1},{"q":"타로","cat":"Q","catName":"운세·명리(대조군)","tier":1},{"q":"점성술","cat":"Q","catName":"운세·명리(대조군)","tier":1},{"q":"인테리어 견적","cat":"R","catName":"부동산·인테리어·시공(리드젠)","tier":1},{"q":"입주청소","cat":"R","catName":"부동산·인테리어·시공(리드젠)","tier":1},{"q":"이사 견적","cat":"R","catName":"부동산·인테리어·시공(리드젠)","tier":1},{"q":"셀프 인테리어","cat":"R","catName":"부동산·인테리어·시공(리드젠)","tier":1},{"q":"구독","cat":"S","catName":"★구독·정기결제(전 업종)","tier":1},{"q":"정기구독","cat":"S","catName":"★구독·정기결제(전 업종)","tier":1},{"q":"정기결제","cat":"S","catName":"★구독·정기결제(전 업종)","tier":1},{"q":"월 구독","cat":"S","catName":"★구독·정기결제(전 업종)","tier":1},{"q":"무료체험","cat":"S","catName":"★구독·정기결제(전 업종)","tier":1},{"q":"첫 달 무료","cat":"S","catName":"★구독·정기결제(전 업종)","tier":1},{"q":"정기배송","cat":"S","catName":"★구독·정기결제(전 업종)","tier":1},{"q":"멤버십","cat":"S","catName":"★구독·정기결제(전 업종)","tier":1},{"q":"구독박스","cat":"S","catName":"★구독·정기결제(전 업종)","tier":1},{"q":"자동결제","cat":"S","catName":"★구독·정기결제(전 업종)","tier":1},{"q":"심리테스트","cat":"T","catName":"★진단·테스트형 유료 결과지(비운세)","tier":1},{"q":"성격검사","cat":"T","catName":"★진단·테스트형 유료 결과지(비운세)","tier":1},{"q":"MBTI 검사","cat":"T","catName":"★진단·테스트형 유료 결과지(비운세)","tier":1},{"q":"IQ 테스트","cat":"T","catName":"★진단·테스트형 유료 결과지(비운세)","tier":1},{"q":"성향 테스트","cat":"T","catName":"★진단·테스트형 유료 결과지(비운세)","tier":1},{"q":"유형 테스트","cat":"T","catName":"★진단·테스트형 유료 결과지(비운세)","tier":1},{"q":"무료 테스트","cat":"T","catName":"★진단·테스트형 유료 결과지(비운세)","tier":1},{"q":"진단 테스트","cat":"T","catName":"★진단·테스트형 유료 결과지(비운세)","tier":1},{"q":"AI 분석","cat":"T","catName":"★진단·테스트형 유료 결과지(비운세)","tier":1},{"q":"AI 진단","cat":"T","catName":"★진단·테스트형 유료 결과지(비운세)","tier":1},{"q":"항공권","cat":"V","catName":"여행·레저·티켓","tier":1},{"q":"호텔","cat":"V","catName":"여행·레저·티켓","tier":1},{"q":"패키지 여행","cat":"V","catName":"여행·레저·티켓","tier":1},{"q":"펜션","cat":"V","catName":"여행·레저·티켓","tier":1},{"q":"부업","cat":"W","catName":"부업·수익화","tier":1},{"q":"재택근무","cat":"W","catName":"부업·수익화","tier":1},{"q":"스마트스토어","cat":"W","catName":"부업·수익화","tier":1},{"q":"블로그 수익","cat":"W","catName":"부업·수익화","tier":1},{"q":"웹툰","cat":"X","catName":"콘텐츠·구독미디어","tier":1},{"q":"웹소설","cat":"X","catName":"콘텐츠·구독미디어","tier":1},{"q":"오디오북","cat":"X","catName":"콘텐츠·구독미디어","tier":1},{"q":"뉴스레터","cat":"X","catName":"콘텐츠·구독미디어","tier":1},{"q":"노후 준비","cat":"Y","catName":"시니어·5060","tier":1},{"q":"연금","cat":"Y","catName":"시니어·5060","tier":1},{"q":"보청기","cat":"Y","catName":"시니어·5060","tier":1},{"q":"무릎 관절","cat":"Y","catName":"시니어·5060","tier":1},{"q":"소상공인 마케팅","cat":"Z","catName":"B2B·소상공인 솔루션","tier":1},{"q":"홈페이지 제작","cat":"Z","catName":"B2B·소상공인 솔루션","tier":1},{"q":"예약 시스템","cat":"Z","catName":"B2B·소상공인 솔루션","tier":1},{"q":"리뷰 관리","cat":"Z","catName":"B2B·소상공인 솔루션","tier":1},{"q":"매장 관리","cat":"Z","catName":"B2B·소상공인 솔루션","tier":1},{"q":"골격 진단","cat":"A","catName":"외모·얼굴·이미지 AI","tier":2},{"q":"체형 분석","cat":"A","catName":"외모·얼굴·이미지 AI","tier":2},{"q":"피부 진단","cat":"A","catName":"외모·얼굴·이미지 AI","tier":2},{"q":"두피 진단","cat":"A","catName":"외모·얼굴·이미지 AI","tier":2},{"q":"얼굴형","cat":"A","catName":"외모·얼굴·이미지 AI","tier":2},{"q":"닮은 연예인","cat":"A","catName":"외모·얼굴·이미지 AI","tier":2},{"q":"2세 얼굴","cat":"A","catName":"외모·얼굴·이미지 AI","tier":2},{"q":"AI 증명사진","cat":"A","catName":"외모·얼굴·이미지 AI","tier":2},{"q":"AI 헤어","cat":"A","catName":"외모·얼굴·이미지 AI","tier":2},{"q":"이미지 컨설팅","cat":"A","catName":"외모·얼굴·이미지 AI","tier":2},{"q":"스타일링","cat":"A","catName":"외모·얼굴·이미지 AI","tier":2},{"q":"기초화장품","cat":"B","catName":"뷰티·화장품·미용기기","tier":2},{"q":"클렌징","cat":"B","catName":"뷰티·화장품·미용기기","tier":2},{"q":"마스크팩","cat":"B","catName":"뷰티·화장품·미용기기","tier":2},{"q":"향수","cat":"B","catName":"뷰티·화장품·미용기기","tier":2},{"q":"염색약","cat":"B","catName":"뷰티·화장품·미용기기","tier":2},{"q":"새치 커버","cat":"B","catName":"뷰티·화장품·미용기기","tier":2},{"q":"제모기","cat":"B","catName":"뷰티·화장품·미용기기","tier":2},{"q":"LED 마스크","cat":"B","catName":"뷰티·화장품·미용기기","tier":2},{"q":"두피 케어","cat":"B","catName":"뷰티·화장품·미용기기","tier":2},{"q":"네일","cat":"B","catName":"뷰티·화장품·미용기기","tier":2},{"q":"속눈썹","cat":"B","catName":"뷰티·화장품·미용기기","tier":2},{"q":"남성 화장품","cat":"B","catName":"뷰티·화장품·미용기기","tier":2},{"q":"여드름","cat":"B","catName":"뷰티·화장품·미용기기","tier":2},{"q":"기저귀","cat":"C","catName":"육아·유아·초등","tier":2},{"q":"분유","cat":"C","catName":"육아·유아·초등","tier":2},{"q":"아기 옷","cat":"C","catName":"육아·유아·초등","tier":2},{"q":"유모차","cat":"C","catName":"육아·유아·초등","tier":2},{"q":"카시트","cat":"C","catName":"육아·유아·초등","tier":2},{"q":"아기 침대","cat":"C","catName":"육아·유아·초등","tier":2},{"q":"젖병","cat":"C","catName":"육아·유아·초등","tier":2},{"q":"산후조리원","cat":"C","catName":"육아·유아·초등","tier":2},{"q":"돌잔치","cat":"C","catName":"육아·유아·초등","tier":2},{"q":"성장앨범","cat":"C","catName":"육아·유아·초등","tier":2},{"q":"초등 학습","cat":"C","catName":"육아·유아·초등","tier":2},{"q":"영어유치원","cat":"C","catName":"육아·유아·초등","tier":2},{"q":"한글 공부","cat":"C","catName":"육아·유아·초등","tier":2},{"q":"독서 논술","cat":"C","catName":"육아·유아·초등","tier":2},{"q":"코딩 교육","cat":"C","catName":"육아·유아·초등","tier":2},{"q":"수학 학원","cat":"C","catName":"육아·유아·초등","tier":2},{"q":"환급 챌린지","cat":"D","catName":"다이어트·운동·바디","tier":2},{"q":"식단 코칭","cat":"D","catName":"다이어트·운동·바디","tier":2},{"q":"필라테스","cat":"D","catName":"다이어트·운동·바디","tier":2},{"q":"요가","cat":"D","catName":"다이어트·운동·바디","tier":2},{"q":"헬스장","cat":"D","catName":"다이어트·운동·바디","tier":2},{"q":"단백질 쉐이크","cat":"D","catName":"다이어트·운동·바디","tier":2},{"q":"다이어트 도시락","cat":"D","catName":"다이어트·운동·바디","tier":2},{"q":"저당","cat":"D","catName":"다이어트·운동·바디","tier":2},{"q":"눈바디","cat":"D","catName":"다이어트·운동·바디","tier":2},{"q":"바디프로필","cat":"D","catName":"다이어트·운동·바디","tier":2},{"q":"골프 레슨","cat":"D","catName":"다이어트·운동·바디","tier":2},{"q":"수영","cat":"D","catName":"다이어트·운동·바디","tier":2},{"q":"영어회화","cat":"E","catName":"교육·강의·자격증","tier":2},{"q":"토익","cat":"E","catName":"교육·강의·자격증","tier":2},{"q":"오픽","cat":"E","catName":"교육·강의·자격증","tier":2},{"q":"중국어","cat":"E","catName":"교육·강의·자격증","tier":2},{"q":"일본어","cat":"E","catName":"교육·강의·자격증","tier":2},{"q":"코딩 부트캠프","cat":"E","catName":"교육·강의·자격증","tier":2},{"q":"데이터 분석","cat":"E","catName":"교육·강의·자격증","tier":2},{"q":"디자인 강의","cat":"E","catName":"교육·강의·자격증","tier":2},{"q":"영상 편집","cat":"E","catName":"교육·강의·자격증","tier":2},{"q":"포토샵","cat":"E","catName":"교육·강의·자격증","tier":2},{"q":"엑셀","cat":"E","catName":"교육·강의·자격증","tier":2},{"q":"국비지원","cat":"E","catName":"교육·강의·자격증","tier":2},{"q":"학점은행제","cat":"E","catName":"교육·강의·자격증","tier":2},{"q":"요양보호사","cat":"E","catName":"교육·강의·자격증","tier":2},{"q":"공인중개사","cat":"E","catName":"교육·강의·자격증","tier":2},{"q":"사회복지사","cat":"E","catName":"교육·강의·자격증","tier":2},{"q":"바리스타","cat":"E","catName":"교육·강의·자격증","tier":2},{"q":"제과제빵","cat":"E","catName":"교육·강의·자격증","tier":2},{"q":"빅사이즈","cat":"F","catName":"패션·의류·잡화","tier":2},{"q":"남성 정장","cat":"F","catName":"패션·의류·잡화","tier":2},{"q":"레깅스","cat":"F","catName":"패션·의류·잡화","tier":2},{"q":"속옷","cat":"F","catName":"패션·의류·잡화","tier":2},{"q":"주얼리","cat":"F","catName":"패션·의류·잡화","tier":2},{"q":"시계","cat":"F","catName":"패션·의류·잡화","tier":2},{"q":"모자","cat":"F","catName":"패션·의류·잡화","tier":2},{"q":"선글라스","cat":"F","catName":"패션·의류·잡화","tier":2},{"q":"지갑","cat":"F","catName":"패션·의류·잡화","tier":2},{"q":"패딩","cat":"F","catName":"패션·의류·잡화","tier":2},{"q":"트레이닝복","cat":"F","catName":"패션·의류·잡화","tier":2},{"q":"가계부 앱","cat":"G","catName":"앱·SaaS·툴","tier":2},{"q":"습관 앱","cat":"G","catName":"앱·SaaS·툴","tier":2},{"q":"일정 관리","cat":"G","catName":"앱·SaaS·툴","tier":2},{"q":"메모 앱","cat":"G","catName":"앱·SaaS·툴","tier":2},{"q":"사진 정리","cat":"G","catName":"앱·SaaS·툴","tier":2},{"q":"번역 앱","cat":"G","catName":"앱·SaaS·툴","tier":2},{"q":"녹음 앱","cat":"G","catName":"앱·SaaS·툴","tier":2},{"q":"PDF 편집","cat":"G","catName":"앱·SaaS·툴","tier":2},{"q":"이미지 편집","cat":"G","catName":"앱·SaaS·툴","tier":2},{"q":"동영상 편집","cat":"G","catName":"앱·SaaS·툴","tier":2},{"q":"디자인 툴","cat":"G","catName":"앱·SaaS·툴","tier":2},{"q":"미리캔버스","cat":"G","catName":"앱·SaaS·툴","tier":2},{"q":"VPN","cat":"G","catName":"앱·SaaS·툴","tier":2},{"q":"클라우드","cat":"G","catName":"앱·SaaS·툴","tier":2},{"q":"백업","cat":"G","catName":"앱·SaaS·툴","tier":2},{"q":"관절 영양제","cat":"H","catName":"건강기능식품·헬스케어","tier":2},{"q":"간 영양제","cat":"H","catName":"건강기능식품·헬스케어","tier":2},{"q":"수면 영양제","cat":"H","catName":"건강기능식품·헬스케어","tier":2},{"q":"갱년기","cat":"H","catName":"건강기능식품·헬스케어","tier":2},{"q":"혈당","cat":"H","catName":"건강기능식품·헬스케어","tier":2},{"q":"혈압","cat":"H","catName":"건강기능식품·헬스케어","tier":2},{"q":"면역력","cat":"H","catName":"건강기능식품·헬스케어","tier":2},{"q":"비타민","cat":"H","catName":"건강기능식품·헬스케어","tier":2},{"q":"단백질","cat":"H","catName":"건강기능식품·헬스케어","tier":2},{"q":"마그네슘","cat":"H","catName":"건강기능식품·헬스케어","tier":2},{"q":"밀크씨슬","cat":"H","catName":"건강기능식품·헬스케어","tier":2},{"q":"프로바이오틱스","cat":"H","catName":"건강기능식품·헬스케어","tier":2},{"q":"눈 영양제","cat":"H","catName":"건강기능식품·헬스케어","tier":2},{"q":"전립선","cat":"H","catName":"건강기능식품·헬스케어","tier":2},{"q":"여성 건강","cat":"H","catName":"건강기능식품·헬스케어","tier":2},{"q":"반찬","cat":"K","catName":"식품·간편식·주류","tier":2},{"q":"죽","cat":"K","catName":"식품·간편식·주류","tier":2},{"q":"이유식","cat":"K","catName":"식품·간편식·주류","tier":2},{"q":"샐러드","cat":"K","catName":"식품·간편식·주류","tier":2},{"q":"닭가슴살","cat":"K","catName":"식품·간편식·주류","tier":2},{"q":"곤약","cat":"K","catName":"식품·간편식·주류","tier":2},{"q":"저염","cat":"K","catName":"식품·간편식·주류","tier":2},{"q":"선물세트","cat":"K","catName":"식품·간편식·주류","tier":2},{"q":"한우","cat":"K","catName":"식품·간편식·주류","tier":2},{"q":"과일","cat":"K","catName":"식품·간편식·주류","tier":2},{"q":"커피 원두","cat":"K","catName":"식품·간편식·주류","tier":2},{"q":"차","cat":"K","catName":"식품·간편식·주류","tier":2},{"q":"와인","cat":"K","catName":"식품·간편식·주류","tier":2},{"q":"위스키","cat":"K","catName":"식품·간편식·주류","tier":2},{"q":"전통주","cat":"K","catName":"식품·간편식·주류","tier":2},{"q":"수제 맥주","cat":"K","catName":"식품·간편식·주류","tier":2},{"q":"온수매트","cat":"L","catName":"생활·가전·홈리빙","tier":2},{"q":"전기요","cat":"L","catName":"생활·가전·홈리빙","tier":2},{"q":"선풍기","cat":"L","catName":"생활·가전·홈리빙","tier":2},{"q":"창문형 에어컨","cat":"L","catName":"생활·가전·홈리빙","tier":2},{"q":"식기세척기","cat":"L","catName":"생활·가전·홈리빙","tier":2},{"q":"건조기","cat":"L","catName":"생활·가전·홈리빙","tier":2},{"q":"안마의자","cat":"L","catName":"생활·가전·홈리빙","tier":2},{"q":"마사지건","cat":"L","catName":"생활·가전·홈리빙","tier":2},{"q":"수납","cat":"L","catName":"생활·가전·홈리빙","tier":2},{"q":"주방 정리","cat":"L","catName":"생활·가전·홈리빙","tier":2},{"q":"프라이팬","cat":"L","catName":"생활·가전·홈리빙","tier":2},{"q":"냄비","cat":"L","catName":"생활·가전·홈리빙","tier":2},{"q":"텀블러","cat":"L","catName":"생활·가전·홈리빙","tier":2},{"q":"정수기","cat":"L","catName":"생활·가전·홈리빙","tier":2},{"q":"비데","cat":"L","catName":"생활·가전·홈리빙","tier":2},{"q":"매트리스","cat":"L","catName":"생활·가전·홈리빙","tier":2},{"q":"베개","cat":"L","catName":"생활·가전·홈리빙","tier":2},{"q":"이불","cat":"L","catName":"생활·가전·홈리빙","tier":2},{"q":"보톡스","cat":"M","catName":"의료·시술·병원(리드젠)","tier":2},{"q":"필러","cat":"M","catName":"의료·시술·병원(리드젠)","tier":2},{"q":"리프팅 시술","cat":"M","catName":"의료·시술·병원(리드젠)","tier":2},{"q":"여드름 치료","cat":"M","catName":"의료·시술·병원(리드젠)","tier":2},{"q":"점 빼기","cat":"M","catName":"의료·시술·병원(리드젠)","tier":2},{"q":"도수치료","cat":"M","catName":"의료·시술·병원(리드젠)","tier":2},{"q":"한의원","cat":"M","catName":"의료·시술·병원(리드젠)","tier":2},{"q":"다이어트 주사","cat":"M","catName":"의료·시술·병원(리드젠)","tier":2},{"q":"위고비","cat":"M","catName":"의료·시술·병원(리드젠)","tier":2},{"q":"제모 레이저","cat":"M","catName":"의료·시술·병원(리드젠)","tier":2},{"q":"치과","cat":"M","catName":"의료·시술·병원(리드젠)","tier":2},{"q":"교정 비용","cat":"M","catName":"의료·시술·병원(리드젠)","tier":2},{"q":"임플란트 가격","cat":"M","catName":"의료·시술·병원(리드젠)","tier":2},{"q":"주택담보대출","cat":"N","catName":"금융·보험·법률(리드젠)","tier":2},{"q":"전세자금대출","cat":"N","catName":"금융·보험·법률(리드젠)","tier":2},{"q":"사업자대출","cat":"N","catName":"금융·보험·법률(리드젠)","tier":2},{"q":"자동차보험","cat":"N","catName":"금융·보험·법률(리드젠)","tier":2},{"q":"실손보험","cat":"N","catName":"금융·보험·법률(리드젠)","tier":2},{"q":"암보험","cat":"N","catName":"금융·보험·법률(리드젠)","tier":2},{"q":"태아보험","cat":"N","catName":"금융·보험·법률(리드젠)","tier":2},{"q":"연금저축","cat":"N","catName":"금융·보험·법률(리드젠)","tier":2},{"q":"IRP","cat":"N","catName":"금융·보험·법률(리드젠)","tier":2},{"q":"파산","cat":"N","catName":"금융·보험·법률(리드젠)","tier":2},{"q":"채무조정","cat":"N","catName":"금융·보험·법률(리드젠)","tier":2},{"q":"이혼 변호사","cat":"N","catName":"금융·보험·법률(리드젠)","tier":2},{"q":"상속","cat":"N","catName":"금융·보험·법률(리드젠)","tier":2},{"q":"교통사고 합의","cat":"N","catName":"금융·보험·법률(리드젠)","tier":2},{"q":"노무 상담","cat":"N","catName":"금융·보험·법률(리드젠)","tier":2},{"q":"고양이 사료","cat":"P","catName":"반려동물","tier":2},{"q":"간식","cat":"P","catName":"반려동물","tier":2},{"q":"배변패드","cat":"P","catName":"반려동물","tier":2},{"q":"화장실 모래","cat":"P","catName":"반려동물","tier":2},{"q":"펫 미용","cat":"P","catName":"반려동물","tier":2},{"q":"펫 호텔","cat":"P","catName":"반려동물","tier":2},{"q":"동물병원","cat":"P","catName":"반려동물","tier":2},{"q":"슬개골","cat":"P","catName":"반려동물","tier":2},{"q":"치석","cat":"P","catName":"반려동물","tier":2},{"q":"펫 장례","cat":"P","catName":"반려동물","tier":2},{"q":"산책","cat":"P","catName":"반려동물","tier":2},{"q":"하네스","cat":"P","catName":"반려동물","tier":2},{"q":"자동급식기","cat":"P","catName":"반려동물","tier":2},{"q":"신년운세","cat":"Q","catName":"운세·명리(대조군)","tier":2},{"q":"토정비결","cat":"Q","catName":"운세·명리(대조군)","tier":2},{"q":"자미두수","cat":"Q","catName":"운세·명리(대조군)","tier":2},{"q":"관상","cat":"Q","catName":"운세·명리(대조군)","tier":2},{"q":"손금","cat":"Q","catName":"운세·명리(대조군)","tier":2},{"q":"꿈해몽","cat":"Q","catName":"운세·명리(대조군)","tier":2},{"q":"작명","cat":"Q","catName":"운세·명리(대조군)","tier":2},{"q":"이름풀이","cat":"Q","catName":"운세·명리(대조군)","tier":2},{"q":"택일","cat":"Q","catName":"운세·명리(대조군)","tier":2},{"q":"부적","cat":"Q","catName":"운세·명리(대조군)","tier":2},{"q":"오행팔찌","cat":"Q","catName":"운세·명리(대조군)","tier":2},{"q":"무당","cat":"Q","catName":"운세·명리(대조군)","tier":2},{"q":"살풀이","cat":"Q","catName":"운세·명리(대조군)","tier":2},{"q":"전생","cat":"Q","catName":"운세·명리(대조군)","tier":2},{"q":"중문","cat":"R","catName":"부동산·인테리어·시공(리드젠)","tier":2},{"q":"샷시 교체","cat":"R","catName":"부동산·인테리어·시공(리드젠)","tier":2},{"q":"줄눈","cat":"R","catName":"부동산·인테리어·시공(리드젠)","tier":2},{"q":"베란다 확장","cat":"R","catName":"부동산·인테리어·시공(리드젠)","tier":2},{"q":"화장실 리모델링","cat":"R","catName":"부동산·인테리어·시공(리드젠)","tier":2},{"q":"주방 리모델링","cat":"R","catName":"부동산·인테리어·시공(리드젠)","tier":2},{"q":"도배","cat":"R","catName":"부동산·인테리어·시공(리드젠)","tier":2},{"q":"장판","cat":"R","catName":"부동산·인테리어·시공(리드젠)","tier":2},{"q":"누수","cat":"R","catName":"부동산·인테리어·시공(리드젠)","tier":2},{"q":"곰팡이","cat":"R","catName":"부동산·인테리어·시공(리드젠)","tier":2},{"q":"방수","cat":"R","catName":"부동산·인테리어·시공(리드젠)","tier":2},{"q":"외벽","cat":"R","catName":"부동산·인테리어·시공(리드젠)","tier":2},{"q":"부동산 경매","cat":"R","catName":"부동산·인테리어·시공(리드젠)","tier":2},{"q":"분양","cat":"R","catName":"부동산·인테리어·시공(리드젠)","tier":2},{"q":"오피스텔","cat":"R","catName":"부동산·인테리어·시공(리드젠)","tier":2},{"q":"구독 서비스","cat":"S","catName":"★구독·정기결제(전 업종)","tier":2},{"q":"정기권","cat":"S","catName":"★구독·정기결제(전 업종)","tier":2},{"q":"이용권","cat":"S","catName":"★구독·정기결제(전 업종)","tier":2},{"q":"무제한 이용권","cat":"S","catName":"★구독·정기결제(전 업종)","tier":2},{"q":"프리미엄 구독","cat":"S","catName":"★구독·정기결제(전 업종)","tier":2},{"q":"연간 이용권","cat":"S","catName":"★구독·정기결제(전 업종)","tier":2},{"q":"월정액","cat":"S","catName":"★구독·정기결제(전 업종)","tier":2},{"q":"렌탈","cat":"S","catName":"★구독·정기결제(전 업종)","tier":2},{"q":"구독 할인","cat":"S","catName":"★구독·정기결제(전 업종)","tier":2},{"q":"체험판","cat":"S","catName":"★구독·정기결제(전 업종)","tier":2},{"q":"애착유형","cat":"T","catName":"★진단·테스트형 유료 결과지(비운세)","tier":2},{"q":"연애 유형","cat":"T","catName":"★진단·테스트형 유료 결과지(비운세)","tier":2},{"q":"자존감 테스트","cat":"T","catName":"★진단·테스트형 유료 결과지(비운세)","tier":2},{"q":"우울증 테스트","cat":"T","catName":"★진단·테스트형 유료 결과지(비운세)","tier":2},{"q":"ADHD 테스트","cat":"T","catName":"★진단·테스트형 유료 결과지(비운세)","tier":2},{"q":"번아웃 테스트","cat":"T","catName":"★진단·테스트형 유료 결과지(비운세)","tier":2},{"q":"스트레스 검사","cat":"T","catName":"★진단·테스트형 유료 결과지(비운세)","tier":2},{"q":"적성검사","cat":"T","catName":"★진단·테스트형 유료 결과지(비운세)","tier":2},{"q":"직업 적성","cat":"T","catName":"★진단·테스트형 유료 결과지(비운세)","tier":2},{"q":"기질 검사","cat":"T","catName":"★진단·테스트형 유료 결과지(비운세)","tier":2},{"q":"성격 유형","cat":"T","catName":"★진단·테스트형 유료 결과지(비운세)","tier":2},{"q":"에겐 테토","cat":"T","catName":"★진단·테스트형 유료 결과지(비운세)","tier":2},{"q":"국내 여행","cat":"V","catName":"여행·레저·티켓","tier":2},{"q":"제주도","cat":"V","catName":"여행·레저·티켓","tier":2},{"q":"일본 여행","cat":"V","catName":"여행·레저·티켓","tier":2},{"q":"동남아","cat":"V","catName":"여행·레저·티켓","tier":2},{"q":"크루즈","cat":"V","catName":"여행·레저·티켓","tier":2},{"q":"캠핑장","cat":"V","catName":"여행·레저·티켓","tier":2},{"q":"글램핑","cat":"V","catName":"여행·레저·티켓","tier":2},{"q":"리조트","cat":"V","catName":"여행·레저·티켓","tier":2},{"q":"워터파크","cat":"V","catName":"여행·레저·티켓","tier":2},{"q":"놀이공원","cat":"V","catName":"여행·레저·티켓","tier":2},{"q":"전시회","cat":"V","catName":"여행·레저·티켓","tier":2},{"q":"콘서트","cat":"V","catName":"여행·레저·티켓","tier":2},{"q":"뮤지컬","cat":"V","catName":"여행·레저·티켓","tier":2},{"q":"공연","cat":"V","catName":"여행·레저·티켓","tier":2},{"q":"스포츠 관람","cat":"V","catName":"여행·레저·티켓","tier":2},{"q":"쿠팡 파트너스","cat":"W","catName":"부업·수익화","tier":2},{"q":"제휴 마케팅","cat":"W","catName":"부업·수익화","tier":2},{"q":"해외구매대행","cat":"W","catName":"부업·수익화","tier":2},{"q":"위탁판매","cat":"W","catName":"부업·수익화","tier":2},{"q":"유튜브 수익화","cat":"W","catName":"부업·수익화","tier":2},{"q":"쇼츠","cat":"W","catName":"부업·수익화","tier":2},{"q":"릴스","cat":"W","catName":"부업·수익화","tier":2},{"q":"인스타 수익","cat":"W","catName":"부업·수익화","tier":2},{"q":"전자책 판매","cat":"W","catName":"부업·수익화","tier":2},{"q":"디지털 노마드","cat":"W","catName":"부업·수익화","tier":2},{"q":"앱테크","cat":"W","catName":"부업·수익화","tier":2},{"q":"리셀","cat":"W","catName":"부업·수익화","tier":2},{"q":"OTT","cat":"X","catName":"콘텐츠·구독미디어","tier":2},{"q":"드라마","cat":"X","catName":"콘텐츠·구독미디어","tier":2},{"q":"영화","cat":"X","catName":"콘텐츠·구독미디어","tier":2},{"q":"다큐","cat":"X","catName":"콘텐츠·구독미디어","tier":2},{"q":"독서","cat":"X","catName":"콘텐츠·구독미디어","tier":2},{"q":"전자도서관","cat":"X","catName":"콘텐츠·구독미디어","tier":2},{"q":"팟캐스트","cat":"X","catName":"콘텐츠·구독미디어","tier":2},{"q":"음악 스트리밍","cat":"X","catName":"콘텐츠·구독미디어","tier":2},{"q":"게임 패스","cat":"X","catName":"콘텐츠·구독미디어","tier":2},{"q":"숏폼 드라마","cat":"X","catName":"콘텐츠·구독미디어","tier":2},{"q":"요양","cat":"Y","catName":"시니어·5060","tier":2},{"q":"실버타운","cat":"Y","catName":"시니어·5060","tier":2},{"q":"장기요양등급","cat":"Y","catName":"시니어·5060","tier":2},{"q":"치매","cat":"Y","catName":"시니어·5060","tier":2},{"q":"파크골프","cat":"Y","catName":"시니어·5060","tier":2},{"q":"시니어 취미","cat":"Y","catName":"시니어·5060","tier":2},{"q":"임플란트 지원","cat":"Y","catName":"시니어·5060","tier":2},{"q":"상조","cat":"Y","catName":"시니어·5060","tier":2},{"q":"장례","cat":"Y","catName":"시니어·5060","tier":2},{"q":"묘지","cat":"Y","catName":"시니어·5060","tier":2},{"q":"유언장","cat":"Y","catName":"시니어·5060","tier":2},{"q":"POS","cat":"Z","catName":"B2B·소상공인 솔루션","tier":2},{"q":"키오스크","cat":"Z","catName":"B2B·소상공인 솔루션","tier":2},{"q":"전자계약","cat":"Z","catName":"B2B·소상공인 솔루션","tier":2},{"q":"세무 기장","cat":"Z","catName":"B2B·소상공인 솔루션","tier":2},{"q":"급여 관리","cat":"Z","catName":"B2B·소상공인 솔루션","tier":2},{"q":"재고 관리","cat":"Z","catName":"B2B·소상공인 솔루션","tier":2},{"q":"배달 대행","cat":"Z","catName":"B2B·소상공인 솔루션","tier":2},{"q":"광고 대행","cat":"Z","catName":"B2B·소상공인 솔루션","tier":2},{"q":"상세페이지 제작","cat":"Z","catName":"B2B·소상공인 솔루션","tier":2},{"q":"로고 제작","cat":"Z","catName":"B2B·소상공인 솔루션","tier":2},{"q":"쇼핑몰 제작","cat":"Z","catName":"B2B·소상공인 솔루션","tier":2},{"q":"CRM","cat":"Z","catName":"B2B·소상공인 솔루션","tier":2},{"q":"문자 발송","cat":"Z","catName":"B2B·소상공인 솔루션","tier":2},{"q":"전화 응대","cat":"Z","catName":"B2B·소상공인 솔루션","tier":2},{"q":"보정 앱","cat":"A","catName":"외모·얼굴·이미지 AI","tier":3},{"q":"사진 복원","cat":"A","catName":"외모·얼굴·이미지 AI","tier":3},{"q":"옛날 사진","cat":"A","catName":"외모·얼굴·이미지 AI","tier":3},{"q":"AI 아바타","cat":"A","catName":"외모·얼굴·이미지 AI","tier":3},{"q":"프로필 사진","cat":"A","catName":"외모·얼굴·이미지 AI","tier":3},{"q":"바디 프로필","cat":"A","catName":"외모·얼굴·이미지 AI","tier":3},{"q":"바디로션","cat":"B","catName":"뷰티·화장품·미용기기","tier":3},{"q":"핸드크림","cat":"B","catName":"뷰티·화장품·미용기기","tier":3},{"q":"치약","cat":"B","catName":"뷰티·화장품·미용기기","tier":3},{"q":"구강 관리","cat":"B","catName":"뷰티·화장품·미용기기","tier":3},{"q":"제모 왁싱","cat":"B","catName":"뷰티·화장품·미용기기","tier":3},{"q":"눈썹 문신","cat":"B","catName":"뷰티·화장품·미용기기","tier":3},{"q":"임신 선물","cat":"C","catName":"육아·유아·초등","tier":3},{"q":"태교","cat":"C","catName":"육아·유아·초등","tier":3},{"q":"육아 상담","cat":"C","catName":"육아·유아·초등","tier":3},{"q":"영재 검사","cat":"C","catName":"육아·유아·초등","tier":3},{"q":"놀이 치료","cat":"C","catName":"육아·유아·초등","tier":3},{"q":"언어 치료","cat":"C","catName":"육아·유아·초등","tier":3},{"q":"러닝","cat":"D","catName":"다이어트·운동·바디","tier":3},{"q":"등산","cat":"D","catName":"다이어트·운동·바디","tier":3},{"q":"클라이밍","cat":"D","catName":"다이어트·운동·바디","tier":3},{"q":"크로스핏","cat":"D","catName":"다이어트·운동·바디","tier":3},{"q":"재활 운동","cat":"D","catName":"다이어트·운동·바디","tier":3},{"q":"산후 다이어트","cat":"D","catName":"다이어트·운동·바디","tier":3},{"q":"독서 모임","cat":"E","catName":"교육·강의·자격증","tier":3},{"q":"글쓰기","cat":"E","catName":"교육·강의·자격증","tier":3},{"q":"말하기","cat":"E","catName":"교육·강의·자격증","tier":3},{"q":"스피치","cat":"E","catName":"교육·강의·자격증","tier":3},{"q":"면접","cat":"E","catName":"교육·강의·자격증","tier":3},{"q":"이력서","cat":"E","catName":"교육·강의·자격증","tier":3},{"q":"퇴사","cat":"E","catName":"교육·강의·자격증","tier":3},{"q":"이직","cat":"E","catName":"교육·강의·자격증","tier":3},{"q":"커리어 코칭","cat":"E","catName":"교육·강의·자격증","tier":3},{"q":"MBA","cat":"E","catName":"교육·강의·자격증","tier":3},{"q":"커플룩","cat":"F","catName":"패션·의류·잡화","tier":3},{"q":"하객룩","cat":"F","catName":"패션·의류·잡화","tier":3},{"q":"골프웨어","cat":"F","catName":"패션·의류·잡화","tier":3},{"q":"등산복","cat":"F","catName":"패션·의류·잡화","tier":3},{"q":"한복","cat":"F","catName":"패션·의류·잡화","tier":3},{"q":"수영복","cat":"F","catName":"패션·의류·잡화","tier":3},{"q":"교복","cat":"F","catName":"패션·의류·잡화","tier":3},{"q":"명상 앱","cat":"G","catName":"앱·SaaS·툴","tier":3},{"q":"수면 앱","cat":"G","catName":"앱·SaaS·툴","tier":3},{"q":"알람","cat":"G","catName":"앱·SaaS·툴","tier":3},{"q":"타이머","cat":"G","catName":"앱·SaaS·툴","tier":3},{"q":"일기 앱","cat":"G","catName":"앱·SaaS·툴","tier":3},{"q":"가족 앱","cat":"G","catName":"앱·SaaS·툴","tier":3},{"q":"건강 기록","cat":"G","catName":"앱·SaaS·툴","tier":3},{"q":"홍삼","cat":"H","catName":"건강기능식품·헬스케어","tier":3},{"q":"녹용","cat":"H","catName":"건강기능식품·헬스케어","tier":3},{"q":"다이어트 차","cat":"H","catName":"건강기능식품·헬스케어","tier":3},{"q":"이너뷰티","cat":"H","catName":"건강기능식품·헬스케어","tier":3},{"q":"콘드로이친","cat":"H","catName":"건강기능식품·헬스케어","tier":3},{"q":"루테인지아잔틴","cat":"H","catName":"건강기능식품·헬스케어","tier":3},{"q":"비건","cat":"K","catName":"식품·간편식·주류","tier":3},{"q":"글루텐프리","cat":"K","catName":"식품·간편식·주류","tier":3},{"q":"단백질바","cat":"K","catName":"식품·간편식·주류","tier":3},{"q":"견과류","cat":"K","catName":"식품·간편식·주류","tier":3},{"q":"꿀","cat":"K","catName":"식품·간편식·주류","tier":3},{"q":"김치","cat":"K","catName":"식품·간편식·주류","tier":3},{"q":"젓갈","cat":"K","catName":"식품·간편식·주류","tier":3},{"q":"캠핑용품","cat":"L","catName":"생활·가전·홈리빙","tier":3},{"q":"차박","cat":"L","catName":"생활·가전·홈리빙","tier":3},{"q":"공구","cat":"L","catName":"생활·가전·홈리빙","tier":3},{"q":"드릴","cat":"L","catName":"생활·가전·홈리빙","tier":3},{"q":"무드등","cat":"L","catName":"생활·가전·홈리빙","tier":3},{"q":"디퓨저","cat":"L","catName":"생활·가전·홈리빙","tier":3},{"q":"제로웨이스트","cat":"L","catName":"생활·가전·홈리빙","tier":3},{"q":"성형","cat":"M","catName":"의료·시술·병원(리드젠)","tier":3},{"q":"쌍꺼풀","cat":"M","catName":"의료·시술·병원(리드젠)","tier":3},{"q":"코 성형","cat":"M","catName":"의료·시술·병원(리드젠)","tier":3},{"q":"가슴 성형","cat":"M","catName":"의료·시술·병원(리드젠)","tier":3},{"q":"지방흡입","cat":"M","catName":"의료·시술·병원(리드젠)","tier":3},{"q":"건강검진","cat":"M","catName":"의료·시술·병원(리드젠)","tier":3},{"q":"산부인과","cat":"M","catName":"의료·시술·병원(리드젠)","tier":3},{"q":"비뇨기과","cat":"M","catName":"의료·시술·병원(리드젠)","tier":3},{"q":"정신과","cat":"M","catName":"의료·시술·병원(리드젠)","tier":3},{"q":"미수령 환급금","cat":"N","catName":"금융·보험·법률(리드젠)","tier":3},{"q":"숨은 보험금","cat":"N","catName":"금융·보험·법률(리드젠)","tier":3},{"q":"카드 추천","cat":"N","catName":"금융·보험·법률(리드젠)","tier":3},{"q":"적금","cat":"N","catName":"금융·보험·법률(리드젠)","tier":3},{"q":"청약","cat":"N","catName":"금융·보험·법률(리드젠)","tier":3},{"q":"해외주식","cat":"N","catName":"금융·보험·법률(리드젠)","tier":3},{"q":"절세","cat":"N","catName":"금융·보험·법률(리드젠)","tier":3},{"q":"반려동물 등록","cat":"P","catName":"반려동물","tier":3},{"q":"펫 유치원","cat":"P","catName":"반려동물","tier":3},{"q":"훈련사","cat":"P","catName":"반려동물","tier":3},{"q":"분리불안","cat":"P","catName":"반려동물","tier":3},{"q":"펫 카메라","cat":"P","catName":"반려동물","tier":3},{"q":"별자리","cat":"Q","catName":"운세·명리(대조군)","tier":3},{"q":"띠별 운세","cat":"Q","catName":"운세·명리(대조군)","tier":3},{"q":"오늘의 운세","cat":"Q","catName":"운세·명리(대조군)","tier":3},{"q":"이달의 운세","cat":"Q","catName":"운세·명리(대조군)","tier":3},{"q":"수능 운세","cat":"Q","catName":"운세·명리(대조군)","tier":3},{"q":"풍수","cat":"Q","catName":"운세·명리(대조군)","tier":3},{"q":"개운","cat":"Q","catName":"운세·명리(대조군)","tier":3},{"q":"가구 배치","cat":"R","catName":"부동산·인테리어·시공(리드젠)","tier":3},{"q":"조명","cat":"R","catName":"부동산·인테리어·시공(리드젠)","tier":3},{"q":"블라인드","cat":"R","catName":"부동산·인테리어·시공(리드젠)","tier":3},{"q":"커튼","cat":"R","catName":"부동산·인테리어·시공(리드젠)","tier":3},{"q":"붙박이장","cat":"R","catName":"부동산·인테리어·시공(리드젠)","tier":3},{"q":"에어컨 청소","cat":"R","catName":"부동산·인테리어·시공(리드젠)","tier":3},{"q":"소독","cat":"R","catName":"부동산·인테리어·시공(리드젠)","tier":3},{"q":"구독 해지","cat":"S","catName":"★구독·정기결제(전 업종)","tier":3},{"q":"해지 방법","cat":"S","catName":"★구독·정기결제(전 업종)","tier":3},{"q":"리커링","cat":"S","catName":"★구독·정기결제(전 업종)","tier":3},{"q":"서브스크립션","cat":"S","catName":"★구독·정기결제(전 업종)","tier":3},{"q":"월 9900원","cat":"S","catName":"★구독·정기결제(전 업종)","tier":3},{"q":"월 4900원","cat":"S","catName":"★구독·정기결제(전 업종)","tier":3},{"q":"다중지능","cat":"T","catName":"★진단·테스트형 유료 결과지(비운세)","tier":3},{"q":"학습유형","cat":"T","catName":"★진단·테스트형 유료 결과지(비운세)","tier":3},{"q":"독서 성향","cat":"T","catName":"★진단·테스트형 유료 결과지(비운세)","tier":3},{"q":"커플 테스트","cat":"T","catName":"★진단·테스트형 유료 결과지(비운세)","tier":3},{"q":"공감능력","cat":"T","catName":"★진단·테스트형 유료 결과지(비운세)","tier":3},{"q":"심리 분석","cat":"T","catName":"★진단·테스트형 유료 결과지(비운세)","tier":3},{"q":"무의식","cat":"T","catName":"★진단·테스트형 유료 결과지(비운세)","tier":3},{"q":"트라우마 검사","cat":"T","catName":"★진단·테스트형 유료 결과지(비운세)","tier":3},{"q":"렌터카","cat":"V","catName":"여행·레저·티켓","tier":3},{"q":"여행자보험","cat":"V","catName":"여행·레저·티켓","tier":3},{"q":"유심","cat":"V","catName":"여행·레저·티켓","tier":3},{"q":"환전","cat":"V","catName":"여행·레저·티켓","tier":3},{"q":"면세점","cat":"V","catName":"여행·레저·티켓","tier":3},{"q":"골프 여행","cat":"V","catName":"여행·레저·티켓","tier":3},{"q":"한 달 살기","cat":"V","catName":"여행·레저·티켓","tier":3},{"q":"주식 강의","cat":"W","catName":"부업·수익화","tier":3},{"q":"코인","cat":"W","catName":"부업·수익화","tier":3},{"q":"선물 옵션","cat":"W","catName":"부업·수익화","tier":3},{"q":"배당주","cat":"W","catName":"부업·수익화","tier":3},{"q":"부동산 투자","cat":"W","catName":"부업·수익화","tier":3},{"q":"경매 강의","cat":"W","catName":"부업·수익화","tier":3},{"q":"창업 지원금","cat":"W","catName":"부업·수익화","tier":3},{"q":"정부지원사업","cat":"W","catName":"부업·수익화","tier":3},{"q":"굿즈","cat":"X","catName":"콘텐츠·구독미디어","tier":3},{"q":"팬덤","cat":"X","catName":"콘텐츠·구독미디어","tier":3},{"q":"포토카드","cat":"X","catName":"콘텐츠·구독미디어","tier":3},{"q":"앨범","cat":"X","catName":"콘텐츠·구독미디어","tier":3},{"q":"포스터","cat":"X","catName":"콘텐츠·구독미디어","tier":3},{"q":"일러스트","cat":"X","catName":"콘텐츠·구독미디어","tier":3},{"q":"손주","cat":"Y","catName":"시니어·5060","tier":3},{"q":"은퇴 후 일자리","cat":"Y","catName":"시니어·5060","tier":3},{"q":"귀농","cat":"Y","catName":"시니어·5060","tier":3},{"q":"전원주택","cat":"Y","catName":"시니어·5060","tier":3},{"q":"해외 이주","cat":"Y","catName":"시니어·5060","tier":3},{"q":"창업 컨설팅","cat":"Z","catName":"B2B·소상공인 솔루션","tier":3},{"q":"프랜차이즈","cat":"Z","catName":"B2B·소상공인 솔루션","tier":3},{"q":"상권 분석","cat":"Z","catName":"B2B·소상공인 솔루션","tier":3},{"q":"임대","cat":"Z","catName":"B2B·소상공인 솔루션","tier":3},{"q":"권리금","cat":"Z","catName":"B2B·소상공인 솔루션","tier":3},{"q":"사업자 대출","cat":"Z","catName":"B2B·소상공인 솔루션","tier":3}];

  const KEY = 'MUR_ADLIB_SWEEP';
  const DEFAULT_CFG = {
    maxCards: 450,      // 키워드당 상한 (기존 3차 수집이 452장)
    maxMore: 15,        // 「더 보기」 최대 클릭
    tickMs: 900,        // 클릭 간격
    idleTicks: 10,      // 새 카드가 안 늘면 이만큼 기다렸다 종료 (≈9초)
    firstWaitMs: 20000, // 첫 카드 대기 상한
    betweenKwMs: [4000, 9000], // 키워드 사이 대기 (랜덤)
    tiers: [1],
  };

  // ---------- 상태 ----------
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } };
  const save = (s) => localStorage.setItem(KEY, JSON.stringify(s));
  let state = load() || { running: false, idx: 0, queue: [], results: {}, cfg: DEFAULT_CFG, log: [] };
  state.cfg = Object.assign({}, DEFAULT_CFG, state.cfg || {});

  const log = (m) => {
    const line = `${new Date().toLocaleTimeString()} ${m}`;
    state.log = (state.log || []).concat(line).slice(-60);
    save(state);
    render();
    console.log('[adlib]', m);
  };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const rand = ([a, b]) => a + Math.floor(Math.random() * (b - a));

  // ---------- URL ----------
  function buildUrl(q) {
    const p = new URLSearchParams({
      active_status: 'active', ad_type: 'all', country: 'KR', is_targeted_country: 'false',
      media_type: 'all', q, search_type: 'keyword_unordered',
      'sort_data[direction]': 'desc', 'sort_data[mode]': 'total_impressions',
    });
    return 'https://www.facebook.com/ads/library/?' + p.toString();
  }
  const currentQ = () => new URL(location.href).searchParams.get('q');

  // ---------- 파싱 ----------
  const RE_LIB = /(?:라이브러리|Library) ID:?\s*(\d{6,})/;
  const RE_LIB_G = /(?:라이브러리|Library) ID/g;
  const RE_START = /(?:게재 시작일|Started running on)[:\s]*([^\n]+)/;
  const RE_REUSE = /광고\s*(\d+)개에서 이 크리에이티브|(\d+)\s*ads? use this creative/;
  const RE_PARTNER = /함께합니다|is with|와\(과\) 함께|과\(와\) 함께/;
  const RE_SPONSOR = /^(후원|Sponsored)$/;
  const RE_CTA = /^(더 알아보기|지금 구매하기|구매하기|가입하기|지금 신청하기|신청하기|앱 설치|앱 다운로드|다운로드|자세히 알아보기|메시지 보내기|지금 예약하기|지금 문의하기|문의하기|더 보기|보기|참여하기|구독하기|시작하기|Learn more|Shop now|Sign up|Install now|Download|Book now|Send message|Apply now|Get offer|Subscribe|Watch more|Contact us|Get quote|Play game|Order now)$/i;
  const RE_DOMAINLINE = /^[a-z0-9.-]+\.[a-z]{2,}(\/\S*)?$/i;
  const RE_PRICE = /(\d{1,3}(?:,\d{3})+|\d{3,7})\s*원/g;
  const RE_DISC = /(\d{2,3})\s*%\s*(할인|off|OFF)/;
  const META_LINE = /^(활성|Active|비활성|Inactive|플랫폼|Platforms|광고 세부 정보 보기|See ad details|이 광고에는 여러 버전이 있습니다|This ad has multiple versions|카테고리|Categories|광고 요약 보기|See summary details)$/;

  function parseKoDate(s) {
    if (!s) return null;
    let m = s.match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})/);
    if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
    const d = new Date(s);
    return isNaN(d) ? s.trim() : d.toISOString().slice(0, 10);
  }
  const countLib = (el) => (el.textContent.match(RE_LIB_G) || []).length;

  function cardRoots() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const roots = new Map();
    let n;
    while ((n = walker.nextNode())) {
      if (!RE_LIB.test(n.nodeValue || '')) continue;
      let el = n.parentElement;
      let hops = 0;
      while (el.parentElement && hops < 30) {
        const p = el.parentElement;
        if (p === document.body || p.getAttribute('role') === 'main' || countLib(p) > 1) break;
        el = p; hops++;
      }
      const id = (el.textContent.match(RE_LIB) || [])[1];
      if (id && !roots.has(id)) roots.set(id, el);
    }
    return roots;
  }

  function landingOf(el) {
    for (const a of el.querySelectorAll('a[href]')) {
      let u; try { u = new URL(a.href, location.origin); } catch { continue; }
      let target = null;
      if (/l\.facebook\.com$/.test(u.host)) {
        const inner = u.searchParams.get('u');
        if (inner) { try { target = new URL(decodeURIComponent(inner)); } catch { /* skip */ } }
      } else if (!/facebook\.com$|fb\.com$|fb\.me$|facebook\.net$/.test(u.host)) {
        target = u;
      }
      if (!target) continue;
      const host = target.host.replace(/^www\./, '');
      const path = target.pathname.replace(/\/$/, '');
      let type = 'site';
      if (/play\.google\.com|apps\.apple\.com|onelink\.me|app\.link/.test(host)) type = 'app';
      else if (/forms\.gle|docs\.google\.com|tally\.so|typeform|smore/.test(host + path)) type = 'form';
      else if (/instagram\.com/.test(host)) type = 'instagram';
      else if (/kakao|pf\.kakao|open\.kakao/.test(host)) type = 'kakao';
      return { landing: host + path, landingType: type };
    }
    return { landing: '', landingType: 'fbpage' };
  }

  function parseCard(el, id) {
    const raw = el.innerText || '';
    const text = raw.replace(/https?:\/\/\S+/g, '');
    const lines = text.split('\n').map((s) => s.trim()).filter(Boolean);
    const startRaw = (text.match(RE_START) || [])[1] || '';
    const reuseM = text.match(RE_REUSE);
    const sponsorIdx = lines.findIndex((l) => RE_SPONSOR.test(l));
    let advertiser = sponsorIdx > 0 ? lines[sponsorIdx - 1] : '';
    if (!advertiser) {
      const a = [...el.querySelectorAll('a[href]')].find((x) => /facebook\.com\/(?!ads\/library)[^/?]+/.test(x.href) && (x.innerText || '').trim());
      advertiser = a ? a.innerText.trim() : '';
    }
    const partnerLine = lines.find((l) => RE_PARTNER.test(l)) || '';
    // 협업 카드: 「tami_real_love 페이지는 TIGHT 사주과(와) 함께합니다」 → advertiser=브랜드, partner=작가 계정
    let partner = '';
    const pm = partnerLine.match(/^(.+?)\s*(?:페이지는|님은|은|는)\s+(.+?)\s*(?:과\(와\)|와\(과\)|과|와)\s*함께합니다/) || partnerLine.match(/^(.+?)\s+is with\s+(.+)$/i);
    if (pm) { partner = pm[1].trim(); if (!advertiser || RE_PARTNER.test(advertiser)) advertiser = pm[2].trim(); }
    else if (partnerLine) partner = partnerLine.slice(0, 120);
    const body = [];
    let cta = '';
    for (let i = sponsorIdx + 1; i < lines.length && sponsorIdx >= 0; i++) {
      const l = lines[i];
      if (RE_CTA.test(l)) { cta = l; break; }
      if (RE_DOMAINLINE.test(l) && l.length < 60) break;
      if (META_LINE.test(l)) continue;
      body.push(l);
    }
    if (!cta) cta = (lines.find((l) => RE_CTA.test(l)) || '');
    const bodyText = body.join(' / ');
    const prices = [...new Set([...text.matchAll(RE_PRICE)].map((m) => parseInt(m[1].replace(/,/g, ''), 10)).filter((n) => n >= 500 && n <= 5000000))].slice(0, 5);
    const disc = (text.match(RE_DISC) || [])[1];
    const hasVideo = !!el.querySelector('video');
    const bigImg = [...el.querySelectorAll('img')].some((im) => Math.max(im.naturalWidth || 0, im.width || 0, im.clientWidth || 0) > 200);
    return {
      id,
      advertiser,
      partner,
      start: parseKoDate(startRaw),
      reuse: reuseM ? parseInt(reuseM[1] || reuseM[2], 10) : 1,
      versions: /여러 버전|multiple versions/.test(text),
      hook: (body[0] || '').slice(0, 140),
      text: bodyText.slice(0, 600),
      cta,
      media: hasVideo ? 'video' : bigImg ? 'image' : 'unknown',
      prices,
      discount: disc ? parseInt(disc, 10) : null,
      ...landingOf(el),
      empty: !advertiser && !body.length,
    };
  }

  function findMore() {
    return [...document.querySelectorAll('div[role="button"],button,a')]
      .find((e) => /^(더 보기|더보기|See more|Load more|결과 더 보기)/i.test((e.innerText || '').trim()) && e.offsetParent !== null);
  }
  const noResults = () => /결과 없음|결과가 없습니다|No ads match|검색 결과가 없|No results/.test(document.body.innerText || '');
  const rateLimited = () => /잠시 후 다시 시도|일시적으로 차단|rate limit|too many requests|문제가 발생했습니다/i.test(document.body.innerText || '');

  async function collect(kw) {
    const cfg = state.cfg;
    const t0 = Date.now();
    while (Date.now() - t0 < cfg.firstWaitMs) {
      if (cardRoots().size > 0) break;
      if (noResults()) break;
      await sleep(500);
    }
    let clicks = 0, idle = 0, last = 0;
    while (true) {
      const n = cardRoots().size;
      if (n >= cfg.maxCards) break;
      if (n > last) { last = n; idle = 0; } else idle++;
      const b = findMore();
      if (b && clicks < cfg.maxMore) { b.click(); clicks++; idle = 0; }
      window.scrollTo(0, document.body.scrollHeight);
      if (idle >= cfg.idleTicks) break;
      if (!b && clicks >= cfg.maxMore) break;
      setStatus(`${kw.q} · 카드 ${n} · 더보기 ${clicks}`);
      await sleep(cfg.tickMs);
    }
    // 언로드된 카드 복구 시도: 위로 천천히 스크롤
    for (let y = document.body.scrollHeight; y > 0; y -= 1500) { window.scrollTo(0, y); await sleep(120); }
    const roots = cardRoots();
    const cards = [];
    for (const [id, el] of roots) { try { cards.push(parseCard(el, id)); } catch (e) { cards.push({ id, error: String(e) }); } }
    return { cards, clicks, truncated: roots.size >= cfg.maxCards };
  }

  function download(name, obj) {
    const blob = new Blob([JSON.stringify(obj, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }
  const safe = (s) => s.replace(/[^\p{L}\p{N}_-]+/gu, '_');

  // ---------- 드라이버 ----------
  async function step() {
    if (!state.running) return;
    const cur = state.queue[state.idx];
    if (!cur) {
      state.running = false; save(state);
      download(`adlib_요약_${new Date().toISOString().slice(0, 10)}.json`, { results: state.results, queue: state.queue, cfg: state.cfg });
      log('✅ 큐 완료. 요약 JSON 내려받음.');
      return;
    }
    if (rateLimited()) { log('⚠ 속도 제한 감지 — 90초 대기 후 새로고침'); await sleep(90000); location.reload(); return; }
    if (currentQ() !== cur.q) { log(`→ ${state.idx + 1}/${state.queue.length} ${cur.q}`); location.href = buildUrl(cur.q); return; }
    const { cards, clicks, truncated } = await collect(cur);
    const date = new Date().toISOString().slice(0, 10);
    const file = `adlib_${cur.cat}_${safe(cur.q)}_${date}.json`;
    download(file, { meta: { q: cur.q, cat: cur.cat, catName: cur.catName, tier: cur.tier, collectedAt: new Date().toISOString(), url: location.href, cards: cards.length, moreClicks: clicks, truncated, emptyCards: cards.filter((c) => c.empty).length }, cards });
    state.results[cur.q] = { n: cards.length, file, at: date };
    state.idx++; save(state);
    log(`✔ ${cur.q}: ${cards.length}장 (빈 카드 ${cards.filter((c) => c.empty).length}) → ${file}`);
    await sleep(rand(state.cfg.betweenKwMs));
    if (state.running) step();
  }

  // ---------- 패널 ----------
  let panel, statusEl, logEl;
  function setStatus(s) { if (statusEl) statusEl.textContent = s; }
  function render() {
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'mur-adlib-panel';
      panel.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:2147483647;width:340px;background:#1b1b1f;color:#eee;font:12px/1.5 system-ui,sans-serif;border:1px solid #555;border-radius:10px;padding:10px;box-shadow:0 8px 24px rgba(0,0,0,.5)';
      document.body.appendChild(panel);
    }
    const done = Object.keys(state.results).length;
    const cur = state.queue[state.idx];
    panel.innerHTML = `
      <div style="font-weight:700;margin-bottom:6px">명운록 · 광고 라이브러리 스윕 <span style="float:right;opacity:.6">v0.1</span></div>
      <div id="mur-status" style="color:#ffd27a;min-height:18px">${state.running ? `실행 중 · ${cur ? cur.q : '-'}` : '대기'}</div>
      <div style="margin:4px 0">진행 ${done}/${state.queue.length || KEYWORDS.length} · 큐 ${state.idx}</div>
      <div style="margin:6px 0">
        <label><input type="checkbox" id="mur-t1" ${state.cfg.tiers.includes(1) ? 'checked' : ''}> tier1(${KEYWORDS.filter((k) => k.tier === 1).length})</label>
        <label style="margin-left:8px"><input type="checkbox" id="mur-t2" ${state.cfg.tiers.includes(2) ? 'checked' : ''}> tier2(${KEYWORDS.filter((k) => k.tier === 2).length})</label>
        <label style="margin-left:8px"><input type="checkbox" id="mur-t3" ${state.cfg.tiers.includes(3) ? 'checked' : ''}> tier3(${KEYWORDS.filter((k) => k.tier === 3).length})</label>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button id="mur-start">▶ 시작/재개</button>
        <button id="mur-pause">⏸ 일시정지</button>
        <button id="mur-skip">⏭ 이 키워드 건너뛰기</button>
        <button id="mur-one">1개만(현재 q)</button>
        <button id="mur-reset" style="color:#f88">초기화</button>
      </div>
      <details style="margin-top:6px"><summary>로그</summary><pre id="mur-log" style="max-height:160px;overflow:auto;white-space:pre-wrap;margin:4px 0;font-size:11px;opacity:.85">${(state.log || []).slice(-25).join('\n')}</pre></details>`;
    statusEl = panel.querySelector('#mur-status');
    logEl = panel.querySelector('#mur-log');
    panel.querySelectorAll('button').forEach((b) => (b.style.cssText = 'background:#333;color:#eee;border:1px solid #666;border-radius:6px;padding:4px 8px;cursor:pointer'));
    panel.querySelector('#mur-start').onclick = () => {
      const tiers = [1, 2, 3].filter((t) => panel.querySelector(`#mur-t${t}`).checked);
      if (!state.queue.length || !state.running && state.idx === 0) {
        state.queue = KEYWORDS.filter((k) => tiers.includes(k.tier));
        state.idx = 0; state.results = {};
      }
      state.cfg.tiers = tiers; state.running = true; save(state);
      log(`시작 · 키워드 ${state.queue.length}개 (tier ${tiers.join(',')})`);
      step();
    };
    panel.querySelector('#mur-pause').onclick = () => { state.running = false; save(state); log('일시정지'); };
    panel.querySelector('#mur-skip').onclick = () => { const c = state.queue[state.idx]; state.idx++; save(state); log(`건너뜀: ${c && c.q}`); if (state.running) step(); };
    panel.querySelector('#mur-one').onclick = async () => {
      const q = currentQ(); if (!q) return alert('검색어(q)가 있는 페이지에서 눌러주세요');
      const k = KEYWORDS.find((x) => x.q === q) || { q, cat: 'X', catName: '단발', tier: 0 };
      state.running = false; save(state);
      log(`단발 수집: ${q}`);
      const { cards, clicks, truncated } = await collect(k);
      download(`adlib_${k.cat}_${safe(q)}_${new Date().toISOString().slice(0, 10)}.json`, { meta: { ...k, collectedAt: new Date().toISOString(), url: location.href, cards: cards.length, moreClicks: clicks, truncated }, cards });
      log(`✔ ${q}: ${cards.length}장`);
    };
    panel.querySelector('#mur-reset').onclick = () => { if (confirm('진행 상태를 지울까요? (내려받은 파일은 남습니다)')) { localStorage.removeItem(KEY); location.reload(); } };
  }

  render();
  if (state.running) setTimeout(step, 1500);
})();
