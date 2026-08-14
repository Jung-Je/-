import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildKakaoAuthorizeUrl, isKakaoConfigured, kakaoRedirectUri } from './kakaoAuth'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('isKakaoConfigured', () => {
  it('VITE_KAKAO_CLIENT_ID가 있으면 true', () => {
    vi.stubEnv('VITE_KAKAO_CLIENT_ID', 'test-client-id')
    expect(isKakaoConfigured()).toBe(true)
  })

  it('VITE_KAKAO_CLIENT_ID가 없으면 false', () => {
    vi.stubEnv('VITE_KAKAO_CLIENT_ID', '')
    expect(isKakaoConfigured()).toBe(false)
  })
})

describe('kakaoRedirectUri', () => {
  it('VITE_KAKAO_REDIRECT_URI가 있으면 그 값을 그대로 쓴다', () => {
    vi.stubEnv('VITE_KAKAO_REDIRECT_URI', 'https://example.com/auth/kakao/callback')
    expect(kakaoRedirectUri()).toBe('https://example.com/auth/kakao/callback')
  })

  it('없으면 현재 origin 기준으로 조립한다', () => {
    vi.stubEnv('VITE_KAKAO_REDIRECT_URI', '')
    expect(kakaoRedirectUri()).toBe(`${window.location.origin}/auth/kakao/callback`)
  })
})

describe('buildKakaoAuthorizeUrl', () => {
  it('client_id·redirect_uri·response_type·scope=age_range를 담은 카카오 인가 URL을 만든다', () => {
    vi.stubEnv('VITE_KAKAO_CLIENT_ID', 'test-client-id')
    vi.stubEnv('VITE_KAKAO_REDIRECT_URI', 'http://localhost:3000/auth/kakao/callback')

    const url = new URL(buildKakaoAuthorizeUrl())

    expect(url.origin + url.pathname).toBe('https://kauth.kakao.com/oauth/authorize')
    expect(url.searchParams.get('client_id')).toBe('test-client-id')
    expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:3000/auth/kakao/callback')
    expect(url.searchParams.get('response_type')).toBe('code')
    expect(url.searchParams.get('scope')).toBe('age_range')
  })
})
