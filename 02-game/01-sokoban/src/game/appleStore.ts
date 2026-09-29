import { supabase } from '../lib/supabase'
import { createUuid } from '../lib/uuid'

const USER_ID_KEY = 'sokoban:player-id:v1'
const TABLE = 'apples'

/** supabase/migrations 의 apples 테이블 한 줄. created_at 은 DB 가 채운다. */
interface AppleRow {
  id: string
  user_id: string
  eaten_at: string
}

let userId: string | null = null

/** 로그인 없이 플레이어를 구분하기 위한 id. 브라우저마다 한 번 만들어 둔다. */
function getUserId(): string {
  if (userId) return userId

  try {
    userId = localStorage.getItem(USER_ID_KEY)
  } catch {
    // 저장소 접근이 막힌 경우: 이번 세션에서만 쓰는 id 를 만든다.
  }

  if (!userId) {
    userId = createUuid()
    try {
      localStorage.setItem(USER_ID_KEY, userId)
    } catch {
      // 무시
    }
  }

  return userId
}

/** 먹은 사과를 기록한다. 저장 실패가 게임 진행을 막지 않도록 경고만 남긴다. */
export async function saveEatenApple(appleId: string, eatenAt: number): Promise<void> {
  if (!supabase) return

  const row: AppleRow = {
    id: appleId,
    user_id: getUserId(),
    eaten_at: new Date(eatenAt).toISOString(),
  }

  const { error } = await supabase.from(TABLE).insert(row)
  if (error) console.warn('[sokoban] 사과 먹음 기록 실패', error)
}
