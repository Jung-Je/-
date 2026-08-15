// 회원가입 최소 연령(만 19세) 관련 순수 함수 — 이메일 가입(SignupForm)과
// 카카오 소셜 가입(KakaoLoginCallbackScreen) 둘 다 같은 관문을 프론트에서
// 먼저 확인해야 해서 한 곳에 모아둔다. 진짜 방어선은 항상 서버
// (UserCreateSerializer.validate_date_of_birth 등) — 여긴 빠른 피드백일 뿐.
export const MIN_ADULT_AGE = 19

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

/** `<input type="date">`가 주는 "YYYY-MM-DD" 문자열을 `new Date(string)`로
 * 파싱하면 UTC 자정으로 해석돼서(로컬 자정이 아님), 로컬 타임존이 UTC보다
 * 뒤쳐진 경우 자정 근처에서 하루가 밀리는 문제가 생긴다. 그래서 여기선
 * `new Date()`를 아예 안 쓰고 연/월/일 정수만 직접 뽑아 비교한다. */
function parseDateOnly(value: string): { year: number; month: number; day: number } | null {
  const match = DATE_ONLY_PATTERN.exec(value)
  if (!match) return null
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) }
}

/** 로컬 날짜를 "YYYY-MM-DD"로 포맷 — `toISOString()`은 UTC로 변환하면서
 * 자정 근처에 하루가 밀릴 수 있어 안 쓴다(네이티브 date input의 max
 * 속성값이 실제 로컬 날짜와 어긋나면 안 됨). */
function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** 네이티브 날짜 선택기의 max 속성용 — 오늘부터 19년 전 날짜를 넘기면
 * 애초에 만 19세 미만이 되는 생년월일을 고를 수 없게 원천 차단한다. */
export function maxAdultBirthDate(): string {
  const date = new Date()
  date.setFullYear(date.getFullYear() - MIN_ADULT_AGE)
  return formatLocalDate(date)
}

export function isAdultBirthdate(value: string): boolean {
  const parsed = parseDateOnly(value)
  if (!parsed) return false

  const today = new Date()
  let age = today.getFullYear() - parsed.year
  const todayMonth = today.getMonth() + 1 // getMonth()는 0-11
  const hasHadBirthdayThisYear =
    todayMonth > parsed.month || (todayMonth === parsed.month && today.getDate() >= parsed.day)
  if (!hasHadBirthdayThisYear) age -= 1

  return age >= MIN_ADULT_AGE
}
