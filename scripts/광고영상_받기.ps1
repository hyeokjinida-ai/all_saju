# 광고영상_받기.ps1 (v2 — 드라이브 자동 업로드 지원)
# 실행: 파일 우클릭 → "PowerShell에서 실행"
# 1) 구글드라이브 데스크톱 앱이 있으면: 드라이브 폴더에 바로 받아서 → 자동으로 드라이브에 올라감 (할 일 없음)
# 2) 없으면: 바탕화면에 받고 drive.google.com 을 열어줌 → 폴더 하나만 드래그

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
$site = "https://myeongunrok.com"

# ─ 구글드라이브 데스크톱 폴더 찾기 ─
$driveRoot = $null
foreach ($dl in (Get-PSDrive -PSProvider FileSystem).Root) {
    foreach ($name in @("내 드라이브", "My Drive")) {
        $p = Join-Path $dl $name
        if (Test-Path $p) { $driveRoot = $p; break }
    }
    if ($driveRoot) { break }
}
if (-not $driveRoot) {
    $legacy = Join-Path $env:USERPROFILE "Google Drive"
    if (Test-Path $legacy) { $driveRoot = $legacy }
}

if ($driveRoot) {
    $base = Join-Path $driveRoot "광고영상_캡컷소재"
    Write-Host "구글드라이브 데스크톱 발견! 여기에 바로 받습니다 (자동 업로드됨):" -ForegroundColor Green
} else {
    $base = Join-Path ([Environment]::GetFolderPath('Desktop')) "광고영상_캡컷소재"
    Write-Host "드라이브 데스크톱 앱이 없어서 바탕화면에 받습니다. 끝나면 드라이브 창이 열려요." -ForegroundColor Yellow
}
Write-Host $base
Write-Host ""

$files = @(
    @{ u="/products/jiknyeo/j3.mp4";      d="01_직녀_연애예보\직녀_01_게이트_까치착지_5초.mp4" },
    @{ u="/products/jiknyeo/w1.mp4";      d="01_직녀_연애예보\직녀_02_설화1_은하수별_8초_루프.mp4" },
    @{ u="/products/jiknyeo/w2.mp4";      d="01_직녀_연애예보\직녀_03_설화2_직녀클로즈업_5초_루프.mp4" },
    @{ u="/products/jiknyeo/w4.mp4";      d="01_직녀_연애예보\직녀_04_설화3_까치떼비상_8초_루프.mp4" },
    @{ u="/products/jiknyeo/w7.mp4";      d="01_직녀_연애예보\직녀_05_설화4_달력달빛_5초_루프.mp4" },
    @{ u="/products/jiknyeo/loading.mp4"; d="01_직녀_연애예보\직녀_06_베짜기_분석대기_5초_루프.mp4" },
    @{ u="/products/sangun/gate.mp4";     d="02_산군_신점\산군_01_게이트_문_8초.mp4" },
    @{ u="/products/sangun/altar.mp4";    d="02_산군_신점\산군_02_제단_촛불_8초.mp4" },
    @{ u="/products/sangun/face.mp4";     d="02_산군_신점\산군_03_역광실루엣_갓_10초.mp4" },
    @{ u="/products/sangun/ritual.mp4";   d="02_산군_신점\산군_04_의식_분석대기_3초.mp4" },
    @{ u="/products/sangun/gate-old.mp4"; d="02_산군_신점\산군_05_게이트_구버전_10초.mp4" },
    @{ u="/products/jiknyeo/j1.png";      d="03_보조컷_이미지\직녀_스틸_J1_정면.png" },
    @{ u="/products/jiknyeo/j2.png";      d="03_보조컷_이미지\직녀_스틸_J2_짜다만천.png" },
    @{ u="/products/jiknyeo/j3.png";      d="03_보조컷_이미지\직녀_스틸_J3_베틀방.png" },
    @{ u="/products/jiknyeo/lettering-yeonae-yebo.png"; d="03_보조컷_이미지\직녀_레터링_연애예보.png" },
    @{ u="/brand/logo-h-ink.png";         d="03_보조컷_이미지\로고_명운록_가로_먹색.png" },
    @{ u="/brand/logo-h-ivory.png";       d="03_보조컷_이미지\로고_명운록_가로_상아색.png" }
)
# 산군 광고완성본 4장(1080 사이즈)은 사이트에 없음 — 채팅으로 보낸 zip 2of2 안에 있음.

$ok = 0; $fail = @()
$n = 0
foreach ($f in $files) {
    $n++
    $dest = Join-Path $base $f.d
    New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
    $name = Split-Path $f.d -Leaf
    try {
        Write-Host ("[{0}/{1}] {2}" -f $n, $files.Count, $name)
        Invoke-WebRequest -Uri ($site + $f.u) -OutFile $dest -UseBasicParsing
        $ok++
    } catch {
        Write-Host ("  실패: {0}" -f $_.Exception.Message) -ForegroundColor Red
        $fail += $name
    }
}

Write-Host ""
Write-Host ("완료: {0}/{1}" -f $ok, $files.Count) -ForegroundColor Green
if ($fail.Count -gt 0) { Write-Host ("실패 목록: " + ($fail -join ", ")) -ForegroundColor Red }

if ($driveRoot) {
    Write-Host "드라이브 폴더라 자동으로 동기화(업로드)됩니다. 트레이의 드라이브 아이콘에서 진행 확인."
    Start-Process explorer.exe $base
} else {
    Write-Host "이제 열리는 드라이브 화면에 [광고영상_캡컷소재] 폴더를 통째로 드래그하세요."
    Start-Process explorer.exe (Split-Path $base)
    Start-Process "https://drive.google.com/drive/my-drive"
}
Read-Host "엔터를 누르면 닫힘"
