import { describe, expect, it } from 'vitest'
import { MIN_ADULT_AGE, isAdultBirthdate, maxAdultBirthDate } from './age'

// 테스트에서도 toISOString()은 안 쓴다 — UTC 변환 과정에서 로컬 타임존에
// 따라 자정 근처 날짜가 하루 밀릴 수 있어서, age.ts가 그 문제를 피하려고
// 로컬 날짜 필드를 직접 포맷하는 것과 같은 방식으로 맞춘다.
function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

describe('isAdultBirthdate', () => {
  it('만 19세보다 훨씬 많으면 true', () => {
    expect(isAdultBirthdate('2000-01-01')).toBe(true)
  })

  it('만 19세 미만이면 false', () => {
    const tenYearsAgo = new Date()
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10)
    expect(isAdultBirthdate(formatLocalDate(tenYearsAgo))).toBe(false)
  })

  it('생일이 아직 안 지난 만 19세 경계값은 false', () => {
    const birthDate = new Date()
    birthDate.setFullYear(birthDate.getFullYear() - MIN_ADULT_AGE)
    birthDate.setDate(birthDate.getDate() + 1) // 내일이 생일 -> 아직 만 19세 안 됨
    expect(isAdultBirthdate(formatLocalDate(birthDate))).toBe(false)
  })

  it('생일이 오늘인 만 19세 경계값은 true', () => {
    const birthDate = new Date()
    birthDate.setFullYear(birthDate.getFullYear() - MIN_ADULT_AGE)
    expect(isAdultBirthdate(formatLocalDate(birthDate))).toBe(true)
  })

  it('형식이 잘못된 문자열은 false', () => {
    expect(isAdultBirthdate('')).toBe(false)
    expect(isAdultBirthdate('not-a-date')).toBe(false)
  })
})

describe('maxAdultBirthDate', () => {
  it('오늘로부터 19년 전 날짜를 YYYY-MM-DD로 반환한다', () => {
    const expected = new Date()
    expected.setFullYear(expected.getFullYear() - MIN_ADULT_AGE)
    expect(maxAdultBirthDate()).toBe(formatLocalDate(expected))
  })
})
