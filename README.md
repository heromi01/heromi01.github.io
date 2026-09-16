# heromi01.github.io

GitHub Pages로 운영하는 개인 웹사이트입니다. 현재는 메인 페이지, 방명록, 보안/개발 기록 페이지를 중심으로 구성되어 있으며, 앞으로 포트폴리오, 프로젝트 기록, 학습 로그, 이미지와 문서 자산이 계속 추가될 수 있도록 파일 역할을 분리해 둡니다.

- 배포 URL: https://heromi01.github.io
- 저장소: https://github.com/heromi01/heromi01.github.io
- 호스팅: GitHub Pages
- 데이터베이스: Supabase PostgreSQL

## 현재 구성

```text
heromi01.github.io/
├── index.html
├── pages/
│   ├── guestbook.html
│   └── study-log.html
├── css/
│   └── guestbook.css
├── js/
│   ├── supabase-config.js
│   └── guestbook.js
├── assets/
│   ├── icons/
│   └── images/
├── README.md
└── .gitignore
```

## 파일 역할

| 경로 | 역할 | 운영 기준 |
| --- | --- | --- |
| `index.html` | 사이트 첫 화면 | 주요 페이지로 이동하는 허브 역할을 유지합니다. 새 페이지가 생기면 이곳에 링크를 추가합니다. |
| `pages/` | 독립 HTML 페이지 | 방명록, 학습 기록, 포트폴리오, 프로젝트 상세 페이지를 둡니다. |
| `css/` | 스타일 파일 | 기능이나 페이지 단위로 CSS를 분리합니다. 공통 스타일이 커지면 `base.css` 같은 공통 파일을 추가합니다. |
| `js/` | 브라우저 JavaScript | 화면 동작과 Supabase 호출 코드를 둡니다. 비밀 키나 관리자 권한 키는 절대 넣지 않습니다. |
| `assets/images/` | 이미지 자료 | 프로필, 썸네일, 설명 이미지 등을 보관합니다. |
| `assets/icons/` | 아이콘 자료 | 파비콘, SVG 아이콘 등을 보관합니다. |
| `.gitignore` | Git 제외 규칙 | `.env`, 비밀 키, 로컬 설정 파일이 GitHub에 올라가지 않도록 관리합니다. |

## 주요 기능

### 메인 페이지

`index.html`은 사이트 진입점입니다. 방문자가 방명록, 학습 기록, GitHub 저장소로 이동할 수 있는 허브 역할을 합니다.

### 방명록

방명록은 GitHub Pages의 정적 페이지에서 Supabase를 호출하는 구조입니다.

- 목록 조회: `guestbook_public` 뷰 사용
- 등록: `create_guestbook_entry` RPC 사용
- 수정: `verify_and_update_guestbook` RPC 사용
- 삭제: `verify_and_delete_guestbook` RPC 사용
- 공감: 별도 RPC 함수로 처리

브라우저에는 Supabase URL과 publishable key만 둡니다. 원본 `guestbook` 테이블과 `password_hash` 컬럼은 공개 키로 직접 조회할 수 없도록 차단합니다.

### 보안/개발 기록

`pages/study-log.html`은 GitHub Pages와 Supabase를 함께 사용할 때의 보안 설계와 향후 개선 과제를 기록합니다. 운영 상태가 바뀌면 이 문서도 함께 갱신합니다.

## 보안 원칙

1. `service_role`, `sb_secret`, DB 비밀번호, 관리자용 비밀 값은 GitHub와 브라우저 코드에 넣지 않습니다.
2. Supabase URL과 publishable key는 공개될 수 있는 값입니다. 대신 RLS, 권한, RPC 함수로 가능한 동작을 제한합니다.
3. 방명록 원본 테이블을 브라우저에서 직접 읽거나 쓰지 않습니다.
4. 비밀번호 해시 컬럼은 공개 뷰에 포함하지 않습니다.
5. 새 기능을 추가할 때는 먼저 공개 조회가 필요한 데이터와 서버 내부에서만 처리해야 할 데이터를 분리합니다.
6. 배포 전에는 `README.md`, HTML, JS 주석에 예전 비밀 값이나 테스트용 비밀번호가 남아 있지 않은지 확인합니다.

## 새 파일 추가 기준

### 새 HTML 페이지

새 페이지는 `pages/` 아래에 만듭니다.

```text
pages/project-name.html
```

추가 후 확인할 것:

- `index.html` 또는 관련 페이지에 이동 링크 추가
- 필요한 CSS/JS 파일 연결
- 모바일 화면에서 내용이 깨지지 않는지 확인
- 외부 링크에는 필요한 경우 `target="_blank"`와 `rel="noopener noreferrer"` 사용

### 새 CSS 파일

페이지나 기능 단위로 분리합니다.

```text
css/project-name.css
```

공통 스타일이 반복되면 나중에 `css/base.css` 또는 `css/layout.css`로 분리합니다.

### 새 JavaScript 파일

기능 단위로 분리합니다.

```text
js/project-name.js
```

주의할 것:

- 비밀 키를 넣지 않습니다.
- 관리자 권한 작업을 브라우저에서 직접 처리하지 않습니다.
- DB 쓰기는 가능한 한 Supabase RPC나 서버 측 함수로 제한합니다.

### 새 이미지와 아이콘

이미지는 `assets/images/`, 아이콘은 `assets/icons/`에 둡니다.

파일명은 나중에 찾기 쉽도록 소문자와 하이픈을 사용합니다.

```text
assets/images/profile-main.png
assets/icons/site-favicon.svg
```

## 운영 체크리스트

변경 전:

- 어떤 페이지/기능을 바꾸는지 정합니다.
- 보안에 영향을 주는 DB, JS, 설정 변경인지 확인합니다.
- 관련 파일만 수정합니다.

변경 후:

- 사이트에서 직접 새로고침 후 동작을 확인합니다.
- 방명록 등록, 수정, 삭제, 공감처럼 사용자 흐름을 한 번씩 테스트합니다.
- 공개 파일에 `service_role`, `sb_secret`, 테스트용 비밀번호 같은 문자열이 없는지 확인합니다.
- Supabase 공개 키로 원본 테이블과 비밀번호 컬럼이 직접 조회되지 않는지 확인합니다.
- README와 `study-log.html` 내용이 실제 구현 상태와 맞는지 확인합니다.

## 앞으로의 개선 후보

- 스팸 방어: Cloudflare Turnstile, Rate Limiting, Edge Functions 검토
- 관리자 기능: GitHub OAuth 또는 이메일 Magic Link 기반 관리자 세션 검토
- 공감 기능 강화: 익명 사용자 식별 또는 중복 공감 방지 구조 검토
- 백업: 방명록 데이터를 정기적으로 JSON 또는 CSV로 백업하는 방식 검토
- 문서화: 새 페이지가 늘어날 때 README의 파일 역할 표와 운영 체크리스트 갱신

## 참고 문서

- Supabase API Keys: https://supabase.com/docs/guides/getting-started/api-keys
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- GitHub Pages: https://docs.github.com/pages
