// 카카오 로그인 인가 URL 조립. 두 가지 완전히 별개인 용도로 쓰인다:
//   1) 회원가입 성인인증(age_range 동의항목) — 사업자등록번호가 필요해
//      막혀서 현재 미사용(KakaoCallbackScreen.tsx가 그대로 남아있음,
//      나중에 재활성화 대비)
//   2) 카카오 소셜 로그인/가입(닉네임·이메일만, age_range 없음) — 현재
//      사용 중(KakaoLoginCallbackScreen.tsx)
// client_secret은 백엔드만 알아야 하므로 여기엔 client_id만 있다.
const KAKAO_AUTHORIZE_URL = 'https://kauth.kakao.com/oauth/authorize'

function kakaoClientId(): string {
  return import.meta.env.VITE_KAKAO_CLIENT_ID ?? ''
}

/**
 * 성인인증(age_range) 콜백용 Redirect URI. 카카오 콘솔에 등록한 값과
 * 정확히 일치해야 한다(토큰 교환 요청에도 그대로 넘어감). 환경변수가
 * 없으면 현재 origin 기준으로 조립.
 */
export function kakaoAgeVerificationRedirectUri(): string {
  // env 값이 빈 문자열일 수도 있어서(.env.example 기본값) ?? 대신 ||를
  // 써야 빈 문자열도 "설정 안 됨"으로 취급해 origin 기준 기본값으로 빠진다.
  return import.meta.env.VITE_KAKAO_REDIRECT_URI || `${window.location.origin}/auth/kakao/callback`
}

/**
 * 소셜 로그인/가입 콜백용 Redirect URI. 별도 env 변수 없이 origin 기준
 * 고정 경로로 계산 — 사용자가 카카오 콘솔에 이 경로를 Redirect URI로
 * 추가 등록해야 한다.
 */
export function kakaoLoginRedirectUri(): string {
  return `${window.location.origin}/auth/kakao/login`
}

/** VITE_KAKAO_CLIENT_ID가 비어있으면 아직 카카오 콘솔 설정 전이라는 뜻 —
 * 로그인/회원가입 화면이 버튼 대신 안내 문구를 보여주거나 버튼 자체를
 * 숨길 때 씀. */
export function isKakaoConfigured(): boolean {
  return kakaoClientId() !== ''
}

export function buildKakaoAuthorizeUrl(options: { redirectUri: string; scope?: string }): string {
  const params = new URLSearchParams({
    client_id: kakaoClientId(),
    redirect_uri: options.redirectUri,
    response_type: 'code',
  })
  if (options.scope) params.set('scope', options.scope)
  return `${KAKAO_AUTHORIZE_URL}?${params.toString()}`
}
