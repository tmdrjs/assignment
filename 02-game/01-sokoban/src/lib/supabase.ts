import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Supabase 클라이언트. 환경 변수가 없으면 null 이고, 게임은 저장 없이 그대로 동작한다.
 * 연결 방법은 README 의 "Supabase 연결" 참고.
 */
export const supabase = url && key ? createClient(url, key) : null

if (!supabase) {
  console.info('[sokoban] Supabase 환경 변수가 없어 사과 기록을 저장하지 않습니다.')
}
