# 소코반 (Sokoban)

브라우저에서 바로 즐기는 소코반 퍼즐 게임. 요구사항은 [prd.md](./prd.md) 참고.

## 실행

```bash
npm install
npm run dev      # 개발 서버
npm run build    # 타입 검사 + 프로덕션 빌드
npm run preview  # 빌드 결과 확인
```

## 구조

```
src/
  game/        게임 로직 (UI 와 분리된 순수 함수)
    types.ts       좌표 / 레벨 / 보드 상태 타입
    constants.ts   XSB 표기 문자, 방향 상수
    levels.ts      스테이지 데이터 (10개)
    parseLevel.ts  XSB 파싱, 레벨 검증
    engine.ts      이동 / 밀기 / 되돌리기 / 클리어 판정
    deadlock.ts    벽 코너에 박힌 상자 감지
    apples.ts      사과 생성 위치 / 간격 / 최대 개수
    appleStore.ts  사과 기록을 Supabase 에 저장
    storage.ts     localStorage 진행 상황
    format.ts      시간 표시
  hooks/       상태와 입력
    useGame.ts          게임 리듀서
    useApples.ts        사과 생성 타이머 / 먹기
    useKeyboard.ts      키보드 조작
    useSwipe.ts         스와이프 조작
    useTileSize.ts      보드 크기 계산
    useElapsedSeconds.ts 경과 시간
  components/  화면
  lib/         Supabase 클라이언트, uuid
  styles/      전역 스타일
supabase/
  migrations/  apples 테이블 SQL
```

## 레벨 데이터

표준 소코반 표기법(XSB)을 사용한다.

| 문자 | 의미 |
| --- | --- |
| `#` | 벽 |
| ` ` | 바닥 |
| `.` | 목표 지점 |
| `$` | 상자 |
| `*` | 목표 지점 위의 상자 |
| `@` | 플레이어 |
| `+` | 목표 지점 위의 플레이어 |

10개 스테이지 모두 BFS 탐색으로 클리어 가능 여부를 확인했고,
`minMoves` 는 그때 구한 최소 이동 수다.

레벨을 추가할 때는 `validateLevel()` 조건(플레이어 1명 / 상자 수와 목표 수 일치 /
플레이 영역이 벽으로 닫혀 있음)을 만족하는지, 그리고 실제로 풀 수 있는지 확인한다.

## 사과 아이템

- 게임 중 5초마다 벽 안쪽의 빈 칸에 사과가 하나 생긴다.
  플레이어·상자·목표 지점·다른 사과가 있는 칸에는 생기지 않는다.
- 보드에는 최대 5개까지 놓이고, 가득 차면 먹을 때까지 새로 생기지 않는다.
- 플레이어가 사과 칸으로 이동하면 먹는다. 먹은 수는 상단 `사과` 에 표시된다.
- 상자를 사과 위로 밀면 사과는 상자 밑에 가려졌다가 상자를 치우면 다시 보인다.
- 사과는 퍼즐 상태와 따로 관리한다. 되돌리기나 다시 시작으로 먹은 사과가 돌아오지 않는다.
- 간격과 최대 개수는 `src/game/apples.ts` 의 `APPLE_SPAWN_INTERVAL_MS`, `MAX_APPLES` 로 바꾼다.

## Supabase 연결

환경 변수가 없으면 사과 기록을 저장하지 않고 게임만 동작한다.
(브라우저 콘솔에 `Supabase 환경 변수가 없어…` 안내가 한 번 나온다.)

1. Supabase 대시보드 → SQL Editor 에서
   [`supabase/migrations/20260929000000_create_apples.sql`](./supabase/migrations/20260929000000_create_apples.sql)
   을 실행한다. (Supabase CLI 를 쓰면 `supabase db push`)
2. `.env.example` 을 `.env.local` 로 복사하고 프로젝트 URL 과 anon(publishable) 키를 넣는다.
3. 실행 중인 개발 서버는 `.env.local` 변경을 감지해 자동으로 재시작한다.

`apples` 테이블(`id`, `user_id`, `eaten_at`, `created_at`)에는 사과를 먹을 때마다 한 줄이 추가된다.
RLS 가 켜져 있고 추가와 조회는 누구나 가능하다. (수정·삭제는 막혀 있다)
플레이어는 로그인 없이 브라우저마다 만든 `user_id` 로 구분한다.

```sql
-- 플레이어별 먹은 사과 수
select user_id, count(*) from apples group by user_id;
```

## 조작

| 키 | 동작 |
| --- | --- |
| 방향키, W A S D | 이동 |
| Z | 되돌리기 |
| R | 다시 시작 |
| Esc | 스테이지 목록 |

모바일에서는 스와이프와 화면 하단 방향 버튼을 사용한다.
