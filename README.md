# 🌐 heromi01.github.io

> **GitHub Pages & Supabase 기반의 개인 포트폴리오, 기술 블로그 및 실시간 방명록 웹사이트**  
> 🔗 **배포 URL**: [https://heromi01.github.io](https://heromi01.github.io)

---

## 📁 디렉토리 구조 (Directory Architecture)

프로젝트가 확장됨에 따라 유지보수성을 극대화하기 위해 페이지, 스타일, 스크립트, 정적 에셋을 체계적으로 분리한 표준 웹 아키텍처를 채택하고 있습니다.

```text
heromi01.github.io/
├── index.html                 # 🌐 메인 랜딩 페이지 (GitHub Pages 진입점)
│
├── pages/                     # 📄 서브 페이지 디렉토리
│   ├── guestbook.html         # 💬 독립형 방명록 전용 페이지
│   └── study-log.html         # 📚 스터디 & 로그 (보안 아키텍처 연동기)
│
├── css/                       # 🎨 스타일시트 디렉토리
│   └── guestbook.css          # 방명록 컴포넌트, 모달 및 글래스모피즘 테마 스타일
│
├── js/                        # ⚙️ 자바스크립트 로직 디렉토리
│   ├── supabase-config.js     # Supabase 클라이언트 접속 설정 (Publishable Anon Key)
│   └── guestbook.js           # 방명록 CRUD, 실시간 동기화, UI 제어 로직
│
├── assets/                    # 🖼️ 정적 리소스 디렉토리
│   ├── images/                # 프로필 사진, 썸네일, 설명 다이어그램 등
│   └── icons/                 # 파비콘, SVG 아이콘 등
│
├── README.md                  # 📖 프로젝트 소개 및 아키텍처 가이드 문서
└── .gitignore                 # 🔒 민감 정보 및 시스템 임시 파일 Git 추적 제외
```

---

## ✨ 주요 기능 및 특징

1. **메인 랜딩 대시보드 (`index.html`)**
   - 현대적인 다크 모드 글래스모피즘(Glassmorphism) UI
   - 개발 활동, 프로젝트, 스터디 로그로 연결되는 반응형 카드 그리드
   - 메인 화면 내에서 바로 작성/조회 가능한 임베드형 실시간 방명록

2. **클라우드 연동 실시간 방명록 (`pages/guestbook.html`)**
   - **클라우드 DB**: Supabase PostgreSQL 기반 데이터 영구 보존
   - **실시간 반응**: 등록, 수정, 삭제, 공감(좋아요) 토글 즉시 반영
   - **독립 팝업 모달**: 등록 완료 확인창, 비밀번호 기반 수정 모달, 삭제 확인 모달
   - **관리자 권한**: 작성자 비밀번호 일치 시 또는 관리자 마스터 키 입력 시 삭제 권한 부여

3. **기술 아키텍처 기록 (`pages/study-log.html`)**
   - 정적 웹 호스팅 환경에서 BaaS 연동 시 발생하는 보안 이슈 분석
   - **최소 권한 RLS (Row Level Security)** 및 **PostgreSQL RPC 보안 함수** 설계 내역
   - 향후 고도화 과제(Edge Functions 분리, Rate Limiting 방어, 자동 백업 파이프라인 등) 정리

---

## 🔒 보안 아키텍처 원칙 (Security Architecture)

- **Zero Secret Exposure**: `service_role` 시크릿 키는 프론트엔드 코드 및 Git 저장소에 일절 포함되지 않습니다. 브라우저에는 공개용 Publishable Anon Key만 노출됩니다.
- **Server-side RPC Verification**: 마스터 비밀번호 및 사용자 비밀번호 검증은 브라우저 JavaScript가 아닌 Supabase PostgreSQL의 `SECURITY DEFINER` 함수(`verify_and_delete_guestbook`, `verify_and_update_guestbook`) 내부에서만 안전하게 수행됩니다.
- **Data Projection View**: 비밀번호 해시/평문이 클라이언트로 전송되는 것을 방지하기 위해 `guestbook_public` 뷰를 통해서만 데이터를 조회합니다.
- **Strict RLS**: 클라이언트가 직접 테이블에 UPDATE나 DELETE를 날릴 수 없도록 RLS가 원천 차단합니다.

---

## 🛠️ 향후 신규 페이지 및 파일 추가 가이드

앞으로 새로운 페이지나 기능을 추가할 때는 아래 규칙을 따릅니다:

1. **새로운 HTML 페이지 추가 시**:
   - `pages/` 폴더 아래에 새 파일 생성 (예: `pages/portfolio.html`, `pages/projects.html`)
   - CSS 참조: `<link rel="stylesheet" href="../css/styles.css" />` (상위 디렉토리 기준)
   - JS 참조: `<script src="../js/my-script.js"></script>`
   - 메인 홈 링크: `<a href="../index.html">← 홈으로</a>`
2. **새로운 이미지 및 에셋 추가 시**:
   - `assets/images/` 또는 `assets/icons/` 에 파일 배치
   - 웹페이지에서 상대 경로로 참조 (예: `assets/images/my-photo.png` 또는 `../assets/images/...`)
3. **스타일 및 스크립트 모듈화**:
   - 컴포넌트별로 `css/`, `js/` 하위에 깔끔하게 분리하여 저장

---

## 📝 라이선스 & 작성자

- 작성자: [heromi01](https://github.com/heromi01)
- 배포 플랫폼: GitHub Pages & Supabase