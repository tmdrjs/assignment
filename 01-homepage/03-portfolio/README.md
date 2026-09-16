# 포트폴리오 웹사이트

두 화면으로 이루어진 포트폴리오입니다.

1. **첫 화면** — 크림색 바탕에 입자가 떠다니는 인트로 (화면에 고정)
2. **섹션 패널** — 굴리면 아래에서 한 번에 올라와 화면을 채웁니다.
   그 안에 01 About · 02 Skills · 03 Projects · 04 Career · 05 Contact 가
   순서대로 들어 있고, 패널 안에서는 평범하게 스크롤됩니다.

> 디자인은 구조만 잡아 둔 상태입니다. 나중에 교체할 것을 전제로
> `Section.module.css` 한 파일에 공통 스타일을 모아 두었습니다.

## 실행

```bash
npm install
npm run dev        # 개발 서버 (http://localhost:5173)
npm run build      # 타입 검사 + 프로덕션 빌드
npm run preview    # 빌드 결과 미리보기
```

## 기술 스택

| 구분 | 사용 |
| --- | --- |
| 빌드 | Vite |
| UI | React 19 + TypeScript |
| 스타일 | 순수 CSS (CSS Modules + CSS 변수) |
| 외부 라이브러리 | 없음 (Tailwind·라우터·애니메이션 라이브러리 미사용) |

## 폴더 구조

```
src/
├─ components/
│  ├─ ParticleField.tsx    첫 화면 배경 입자 (캔버스)
│  ├─ Hero.tsx             첫 화면 문구
│  ├─ SectionsPanel.tsx    올라오는 두 번째 화면 (섹션을 담고 스크롤을 맡는다)
│  ├─ Header.tsx           섹션으로 이동하는 상단 바 (패널 안에 있다)
│  ├─ Section.tsx          모든 섹션이 공유하는 껍데기 (순번 · 제목 · 여백)
│  ├─ Section.module.css   섹션 공통 스타일
│  ├─ About.tsx            01 About Me
│  ├─ Skills.tsx           02 Skills
│  ├─ Projects.tsx         03 Projects
│  ├─ Career.tsx           04 Career (Education · Activities)
│  └─ Contact.tsx          05 Contact
├─ data/
│  ├─ profile.ts           모든 텍스트 콘텐츠
│  └─ sections.ts          섹션 목록 (순번 · 제목 · 앵커 id)
├─ hooks/
│  └─ useRisingPanel.ts    첫 화면에서 패널을 올리는 입력 처리
├─ styles/                 reset / tokens / global
├─ types/                  콘텐츠 타입 정의
└─ utils/                  cx · placeholder
```

## 콘텐츠 수정

텍스트는 전부 `src/data/` 안에 있습니다. 컴포넌트는 건드릴 필요가 없습니다.

| 내보내는 값 | 내용 |
| --- | --- |
| `profile` | 이름 · 직무 · Hero 제목과 설명 |
| `about` | About 문단 목록 |
| `skillGroups` | 기술 그룹 (Frontend / Backend / Tools) |
| `projects` | 프로젝트 카드 |
| `education` · `activities` | Career 항목 |
| `contactLinks` | 연락 수단 |
| `sectionTitles` | 섹션 순서와 상단 바 메뉴 |

`[이름]` 처럼 대괄호로 감싼 값은 아직 채워지지 않은 자리입니다.
PRD 22절에 따라 존재하지 않는 정보는 만들어 넣지 않았습니다.
이런 값은 화면에서 점선 밑줄로 표시되고, 실제 내용으로 바꾸면 일반 텍스트처럼 보입니다
(`src/utils/placeholder.ts`).

## 화면 구조

브라우저 스크롤은 쓰지 않습니다 (`html, body { overflow: hidden }`).
첫 화면은 고정이고, **스크롤은 위로 올라온 섹션 패널이 맡습니다.**

| 위치 | 입력 | 동작 |
| --- | --- | --- |
| 첫 화면 | 아래로 굴리기 · 위로 쓸기 · ↓ · PageDown · Space | 패널이 아래에서 올라와 화면을 채운다 |
| 패널 안 | 굴리기 · 드래그 | 평범한 스크롤 (01~05) |
| 패널 **맨 위** | 위로 굴리기 · 아래로 쓸기 · ↑ · PageUp · Esc | 패널이 내려가고 첫 화면으로 |

- 휠 8px, 터치 36px 만 움직여도 넘어갑니다. (이전 작업과 같은 기준)
- 닫기는 **맨 위에서 시작한 동작**일 때만 받습니다 (`GESTURE_GAP_MS`).
  아래에서 위로 휙 쓸어 올렸을 때 남은 관성이 맨 위에 닿자마자
  첫 화면까지 튕겨 나가지 않도록, 손을 뗐다 다시 올려야 내려갑니다.
- 전환 직후 0.44초(`PANEL_TRANSITION_MS`)는 입력을 삼켜 곧바로 되돌아가지 않게 합니다.
- 패널이 다 내려가면 안쪽 스크롤 위치를 맨 위로 되돌립니다.
- 닫혀 있는 동안 패널은 `inert` 라 탭 이동·스크린 리더에 잡히지 않습니다.

상단 바는 패널 안에 붙어 있어 메뉴를 누르면 패널 안에서 해당 섹션으로 이동합니다.

쌓임 순서는 `ParticleField`(0) → `Hero`(1) → `SectionsPanel`(2) 입니다.
패널이 불투명하므로 배경 입자는 첫 화면에서만 보입니다.

## 배경 입자 (첫 화면)

- 커서가 없으면 모든 입자가 다 같이 왼쪽으로 흐릅니다.
- 커서가 움직이면 입자들이 커서 쪽으로 따라 이동합니다.
- `depth` 하나로 크기 · 농도 · 속도 · 이동폭을 묶어 z축이 있는 것처럼 보이게 합니다.

| depth | 크기 | 농도 | 왼쪽 흐름 | 커서 따라가는 폭 |
| --- | --- | --- | --- | --- |
| 0 (뒤) | 1px | 0.28 | 4px/초 | 25% |
| 1 (앞) | 3px | 0.85 | 20px/초 | 100% |

조절 상수는 `src/components/ParticleField.tsx` 상단에 있습니다
(`PARTICLE_DENSITY`, `MIN_DRIFT_SPEED`/`MAX_DRIFT_SPEED`, `FOLLOW_STRENGTH`, `FOLLOW_EASE_TIME` 등).

## 색상 바꾸기

`src/styles/tokens.css` 의 CSS 변수만 수정하면 전체에 반영됩니다.

```css
--color-bg: #f4f2ee;          /* 배경 */
--color-text: #17171a;        /* 본문 */
--color-accent: #2c4bd9;      /* 포인트 색상 (하나만 사용) */
```

## 접근성 · 성능

프레임을 잡아먹던 것들을 걷어내 스크롤·전환이 끊기지 않게 했습니다.

| 조치 | 이유 |
| --- | --- |
| 패널이 열려 있으면 배경 입자를 멈춤 (`<ParticleField paused>`) | 가려져 보이지도 않는 전체 화면 캔버스를 매 프레임 다시 그리고 있었습니다. |
| 섹션은 `content-visibility: auto`, 올리기 **한 프레임 전에** `visible` 로 전환 | 그리기와 올리기가 같은 프레임에 겹치면 처음 몇 프레임이 끊깁니다. 미리 그려 두면 올라오는 동안에는 합성만 남습니다. |
| 패널 내용을 `memo` 로 묶음 | 여닫는 상태가 바뀌어도 섹션 전체를 다시 렌더링하지 않습니다. |
| 상단 바의 `backdrop-filter` 제거, 불투명하게 칠함 | 스크롤할 때마다 바 뒤쪽을 다시 블러해야 해서 가장 비쌌습니다. |
| 패널은 `transform` 만 바꿔 여닫음 + `contain: paint` | 레이아웃·페인트 없이 합성 단계에서만 처리됩니다. |
| 휠·터치 리스너를 모두 `passive` 로 등록 | 스크롤이 리스너를 기다리지 않습니다. |

- 섹션마다 `aria-labelledby` 로 제목과 연결했습니다.
- 앵커 이동 시 상단 바에 제목이 가리지 않도록 `scroll-padding-top` 을 둡니다.
- `prefers-reduced-motion` 설정이면 배경 입자가 움직이지 않고 앵커 이동도 즉시 처리합니다.
- 배경 입자는 커서가 멈춰 있을 때 그리기 간격을 늘리고, 탭이 백그라운드로 가거나 패널이 열려 있으면 멈춥니다.
