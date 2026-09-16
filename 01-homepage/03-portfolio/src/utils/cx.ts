/** 조건부 className을 합친다. false/undefined는 무시한다. */
export function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ')
}
