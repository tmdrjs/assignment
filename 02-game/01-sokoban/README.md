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
    storage.ts     localStorage 진행 상황
    format.ts      시간 표시
  hooks/       상태와 입력
    useGame.ts          게임 리듀서
    useKeyboard.ts      키보드 조작
    useSwipe.ts         스와이프 조작
    useTileSize.ts      보드 크기 계산
    useElapsedSeconds.ts 경과 시간
  components/  화면
  styles/      전역 스타일
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

## 조작

| 키 | 동작 |
| --- | --- |
| 방향키, W A S D | 이동 |
| Z | 되돌리기 |
| R | 다시 시작 |
| Esc | 스테이지 목록 |

모바일에서는 스와이프와 화면 하단 방향 버튼을 사용한다.
