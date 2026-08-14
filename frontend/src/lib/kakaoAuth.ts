// 카카오 로그인 인가 URL 조립 — 회원가입 전 성인인증(age_range 동의항목)
// 전용. client_secret은 백엔드만 알아야 하므로 여기엔 client_id만 있다.
const KAKAO_AUTHORIZE_URL = 'https://kauth.kakao.com/oauth/authorize'

function kakaoClientId(): string {
  return import.meta.env.VITE_KAKAO_CLIENT_ID ?? ''
}

/**
 * 카카오 콘솔에 등록한 Redirect URI와 정확히 일치해야 한다(토큰 교환
 * 요청에도 그대로 넘어감). 환경변수가 없으면 현재 origin 기준으로
 * 조립 — 개발 중 포트가 바뀌어도 하드코딩 없이 맞아떨어지게.
 */
export function kakaoRedirectUri(): string {
  // env 값이 빈 문자열일 수도 있어서(.env.example 기본값) ?? 대신 ||를
  // 써야 빈 문자열도 "설정 안 됨"으로 취급해 origin 기준 기본값으로 빠진다.
  return import.meta.env.VITE_KAKAO_REDIRECT_URI || `${window.location.origin}/auth/kakao/callback`
}

/** VITE_KAKAO_CLIENT_ID가 비어있으면 아직 카카오 콘솔 설정 전이라는 뜻 —
 * 회원가입 화면이 버튼 대신 안내 문구를 보여줄 때 씀. */
export function isKakaoConfigured(): boolean {
  return kakaoClientId() !== ''
}

export function buildKakaoAuthorizeUrl(): string {
  const params = new URLSearchParams({
    client_id: kakaoClientId(),
    redirect_uri: kakaoRedirectUri(),
    response_type: 'code',
    scope: 'age_range',
  })
  return `${KAKAO_AUTHORIZE_URL}?${params.toString()}`
}
