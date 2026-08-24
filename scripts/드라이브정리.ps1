# 드라이브정리.ps1 — 틱톡공장 방식 (내 PC 안에서 복사만)
# 실행: 우클릭 → "PowerShell에서 실행"
# all_saju 폴더의 영상을 구글드라이브 폴더로 캡컷용 이름으로 복사한다. 인터넷 불필요.

$ErrorActionPreference = "Stop"
Write-Host "=== 광고영상 드라이브 정리 ===" -ForegroundColor Cyan

# ── 1. all_saju 저장소 찾기 ──
$repo = $null
$cands = @(
    (Join-Path $env:USERPROFILE "OneDrive\Desktop\all_saju"),
    (Join-Path $env:USERPROFILE "Desktop\all_saju"),
    (Join-Path $env:USERPROFILE "OneDrive\바탕 화면\all_saju"),
    (Join-Path $env:USERPROFILE "all_saju"),
    (Join-Path (Get-Location) "")
)
foreach ($c in $cands) {
    if ($c -and (Test-Path (Join-Path $c "public\products\jiknyeo\j3.mp4"))) { $repo = $c; break }
}
if (-not $repo) {
    Write-Host "all_saju 폴더를 못 찾았어요. 전체 검색 중... (조금 걸려요)" -ForegroundColor Yellow
    $hit = Get-ChildItem -Path $env:USERPROFILE -Filter "j3.mp4" -Recurse -ErrorAction SilentlyContinue |
           Where-Object { $_.FullName -like "*public\products\jiknyeo*" } | Select-Object -First 1
    if ($hit) { $repo = (Get-Item $hit.FullName).Directory.Parent.Parent.Parent.FullName }
}
if (-not $repo) {
    Write-Host "못 찾았습니다. all_saju 폴더 안에서 이 스크립트를 실행해 주세요." -ForegroundColor Red
    Read-Host "엔터로 종료"; exit 1
}
Write-Host "저장소: $repo" -ForegroundColor Green

# ── 2. 구글드라이브 폴더 찾기 ──
$driveRoot = $null
foreach ($r in (Get-PSDrive -PSProvider FileSystem).Root) {
    foreach ($n in @("내 드라이브", "My Drive")) {
        $p = Join-Path $r $n
        if (Test-Path $p) { $driveRoot = $p; break }
    }
    if ($driveRoot) { break }
}
if (-not $driveRoot) {
    $lg = Join-Path $env:USERPROFILE "Google Drive"
    if (Test-Path $lg) { $driveRoot = $lg }
}
if ($driveRoot) {
    $base = Join-Path $driveRoot "광고영상_캡컷소재"
    Write-Host "구글드라이브: $driveRoot  → 복사하면 자동 업로드됩니다" -ForegroundColor Green
} else {
    $base = Join-Path ([Environment]::GetFolderPath('Desktop')) "광고영상_캡컷소재"
    Write-Host "드라이브 데스크톱 앱이 없어 바탕화면에 만듭니다 (끝나면 드래그)" -ForegroundColor Yellow
}

# ── 3. 복사 목록 (원본 → 캡컷용 이름) ──
$map = @(
  @("public\products\jiknyeo\j3.mp4",      "01_직녀_연애예보\직녀_01_게이트_까치착지_5초.mp4"),
  @("public\products\jiknyeo\w1.mp4",      "01_직녀_연애예보\직녀_02_설화1_은하수별_8초_루프.mp4"),
  @("public\products\jiknyeo\w2.mp4",      "01_직녀_연애예보\직녀_03_설화2_직녀클로즈업_5초_루프.mp4"),
  @("public\products\jiknyeo\w4.mp4",      "01_직녀_연애예보\직녀_04_설화3_까치떼비상_8초_루프.mp4"),
  @("public\products\jiknyeo\w7.mp4",      "01_직녀_연애예보\직녀_05_설화4_달력달빛_5초_루프.mp4"),
  @("public\products\jiknyeo\loading.mp4", "01_직녀_연애예보\직녀_06_베짜기_분석대기_5초_루프.mp4"),
  @("public\products\sangun\gate.mp4",     "02_산군_신점\산군_01_게이트_문_8초.mp4"),
  @("public\products\sangun\altar.mp4",    "02_산군_신점\산군_02_제단_촛불_8초.mp4"),
  @("public\products\sangun\face.mp4",     "02_산군_신점\산군_03_역광실루엣_갓_10초.mp4"),
  @("public\products\sangun\ritual.mp4",   "02_산군_신점\산군_04_의식_분석대기_3초.mp4"),
  @("public\products\sangun\gate-old.mp4", "02_산군_신점\산군_05_게이트_구버전_10초.mp4"),
  @("public\products\jiknyeo\j1.png",      "03_보조컷_이미지\직녀_스틸_J1_정면.png"),
  @("public\products\jiknyeo\j2.png",      "03_보조컷_이미지\직녀_스틸_J2_짜다만천.png"),
  @("public\products\jiknyeo\j3.png",      "03_보조컷_이미지\직녀_스틸_J3_베틀방.png"),
  @("public\products\jiknyeo\lettering-yeonae-yebo.png", "03_보조컷_이미지\직녀_레터링_연애예보.png"),
  @("public\brand\logo-h-ink.png",         "03_보조컷_이미지\로고_명운록_가로_먹색.png"),
  @("public\brand\logo-h-ivory.png",       "03_보조컷_이미지\로고_명운록_가로_상아색.png"),
  @("marketing\소재\산군\sangun_ad01_janbu_1080x1350.png", "03_보조컷_이미지\산군_광고완성본01_장부_1080x1350.png"),
  @("marketing\소재\산군\sangun_ad01_janbu_1080x1920.png", "03_보조컷_이미지\산군_광고완성본01_장부_1080x1920.png"),
  @("marketing\소재\산군\sangun_ad02_money_1080x1350.png", "03_보조컷_이미지\산군_광고완성본02_돈_1080x1350.png"),
  @("marketing\소재\산군\sangun_ad02_money_1080x1920.png", "03_보조컷_이미지\산군_광고완성본02_돈_1080x1920.png")
)

Write-Host ""
$ok = 0; $miss = @()
foreach ($m in $map) {
    $src = Join-Path $repo $m[0]
    $dst = Join-Path $base $m[1]
    $name = Split-Path $m[1] -Leaf
    if (Test-Path $src) {
        New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null
        Copy-Item $src $dst -Force
        Write-Host "  OK  $name"
        $ok++
    } else {
        Write-Host "  없음 $($m[0])" -ForegroundColor DarkYellow
        $miss += $m[0]
    }
}

Write-Host ""
Write-Host ("복사 완료: {0}/{1}" -f $ok, $map.Count) -ForegroundColor Green
Write-Host "위치: $base"
if ($miss.Count -gt 0) {
    Write-Host "빠진 파일(저장소에 없음): $($miss -join ', ')" -ForegroundColor DarkYellow
    Write-Host "→ 최신본을 받으려면 all_saju 폴더에서 git pull 후 다시 실행하세요."
}
if ($driveRoot) {
    Write-Host ""
    Write-Host "드라이브 폴더라 자동 업로드됩니다. 트레이 드라이브 아이콘에서 진행 확인." -ForegroundColor Cyan
} else {
    Start-Process "https://drive.google.com/drive/my-drive"
    Write-Host "열린 드라이브 창에 폴더를 드래그하세요." -ForegroundColor Cyan
}
Start-Process explorer.exe $base
Read-Host "엔터로 종료"
