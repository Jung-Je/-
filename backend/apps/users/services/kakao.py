import logging

from django.conf import settings

import requests

logger = logging.getLogger(__name__)

KAKAO_TOKEN_URL = "https://kauth.kakao.com/oauth/token"
KAKAO_USER_ME_URL = "https://kapi.kakao.com/v2/user/me"

# 카카오가 문서화한 age_range 값 중 "구간 전체가 확실히 만 19세 이상"인
# 것만 성인으로 인정한다. "15~19"는 19세를 포함하지만 15~18세도 섞여 있어서
# 안전하게 거부 — PASS만큼 정밀하진 않지만, 지금(검증 전혀 없음)보다는
# 실질적인 방어가 된다.
_ADULT_AGE_RANGES = {
    "20~29",
    "30~39",
    "40~49",
    "50~59",
    "60~69",
    "70~79",
    "80~89",
    "90~",
}

_REQUEST_TIMEOUT = 5  # 초 — 카카오 API가 응답 안 하면 회원가입 흐름 전체가 멈춰버리므로 짧게 자름


class KakaoVerificationError(Exception):
    """카카오 인증 흐름 중 사용자에게 그대로 보여줘도 되는 실패 사유.

    메시지 자체가 API 응답의 detail이 된다 — 호출부(뷰)는 전부 이걸
    잡아서 400으로 변환하기만 하면 되도록 실패 사유를 통일했다.
    """


def verify_kakao_adult(code: str, redirect_uri: str) -> dict:
    """카카오 인가코드를 성인 여부 판정 결과로 바꾼다.

    흐름: 인가코드 -> 액세스 토큰 교환(카카오 서버) -> 사용자 정보 조회
    (age_range 동의항목) -> 판정. 반환값: {"kakao_id": str, "is_adult": bool}.
    설정 누락/HTTP 오류/동의 거부는 전부 KakaoVerificationError로 통일해서
    던진다.

    현재는 회원가입 흐름에서 안 쓰임(age_range 동의항목이 카카오
    "비즈니스 앱" 전환 + 사업자등록번호를 요구해서 막혀, 자기신고
    생년월일 검증으로 대체됨 — apps/users/serializers/user.py 참고).
    나중에 사업자등록을 하게 되면 다시 연결할 수 있도록 지우지 않고
    남겨둔다.
    """
    if not settings.KAKAO_CLIENT_ID:
        raise KakaoVerificationError("카카오 로그인이 아직 설정되지 않았습니다.")

    access_token = _exchange_code_for_token(code, redirect_uri)
    kakao_account = _fetch_kakao_account(access_token)

    if kakao_account.get("kakao_id") is None:
        raise KakaoVerificationError("카카오 인증에 실패했습니다. 다시 시도해주세요.")

    if kakao_account.get("age_range_needs_agreement", True):
        raise KakaoVerificationError("나이 정보 제공에 동의해야 성인인증을 진행할 수 있습니다.")

    age_range = kakao_account.get("age_range")
    is_adult = age_range in _ADULT_AGE_RANGES

    return {"kakao_id": kakao_account["kakao_id"], "is_adult": is_adult}


def fetch_kakao_profile(code: str, redirect_uri: str) -> dict:
    """소셜 로그인/가입용 — age_range는 아예 안 건드리고 카카오 식별자·
    기본 프로필만 가져온다(닉네임/이메일은 카카오 동의항목 상태에 따라
    없을 수 있어 항상 None 가능성을 감안해야 함 — 호출부가 직접 입력
    폴백을 제공).

    반환값: {"kakao_id": str, "nickname": str | None, "email": str | None}
    """
    if not settings.KAKAO_CLIENT_ID:
        raise KakaoVerificationError("카카오 로그인이 아직 설정되지 않았습니다.")

    access_token = _exchange_code_for_token(code, redirect_uri)
    kakao_account = _fetch_kakao_account(access_token)

    if kakao_account.get("kakao_id") is None:
        raise KakaoVerificationError("카카오 인증에 실패했습니다. 다시 시도해주세요.")

    return {
        "kakao_id": kakao_account["kakao_id"],
        "nickname": kakao_account.get("nickname"),
        "email": kakao_account.get("email"),
    }


def _exchange_code_for_token(code: str, redirect_uri: str) -> str:
    payload = {
        "grant_type": "authorization_code",
        "client_id": settings.KAKAO_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "code": code,
    }
    # client_secret은 카카오 콘솔에서 켰을 때만 보낸다 — 빈 문자열을 그냥
    # payload에 넣으면 값 자체가 없다는 뜻이 아니라 "빈 문자열로 검증하라"는
    # 뜻이 돼버려서, 켜져 있지 않은 앱에서는 오히려 실패한다.
    if settings.KAKAO_CLIENT_SECRET:
        payload["client_secret"] = settings.KAKAO_CLIENT_SECRET

    try:
        response = requests.post(KAKAO_TOKEN_URL, data=payload, timeout=_REQUEST_TIMEOUT)
    except requests.RequestException:
        logger.warning("카카오 토큰 교환 요청 실패(네트워크)", exc_info=True)
        raise KakaoVerificationError("카카오 인증에 실패했습니다. 다시 시도해주세요.")

    if response.status_code != 200:
        logger.warning(
            "카카오 토큰 교환 실패: status=%s body=%s", response.status_code, response.text
        )
        raise KakaoVerificationError("카카오 인증에 실패했습니다. 다시 시도해주세요.")

    access_token = response.json().get("access_token")
    if not access_token:
        raise KakaoVerificationError("카카오 인증에 실패했습니다. 다시 시도해주세요.")
    return access_token


def _fetch_kakao_account(access_token: str) -> dict:
    try:
        response = requests.get(
            KAKAO_USER_ME_URL,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=_REQUEST_TIMEOUT,
        )
    except requests.RequestException:
        logger.warning("카카오 사용자 정보 조회 실패(네트워크)", exc_info=True)
        raise KakaoVerificationError("카카오 인증에 실패했습니다. 다시 시도해주세요.")

    if response.status_code != 200:
        logger.warning(
            "카카오 사용자 정보 조회 실패: status=%s body=%s",
            response.status_code,
            response.text,
        )
        raise KakaoVerificationError("카카오 인증에 실패했습니다. 다시 시도해주세요.")

    data = response.json()
    kakao_account = data.get("kakao_account", {})
    properties = data.get("properties", {})

    # 이메일은 email_needs_agreement가 True(동의 안 함)면 값이 있어도
    # 신뢰하면 안 되는 상태라 None으로 취급 — 호출부(fetch_kakao_profile)가
    # "카카오가 안 줬다"와 같은 방식으로 처리해서 수동 입력으로 폴백한다.
    email = None
    if not kakao_account.get("email_needs_agreement", True):
        email = kakao_account.get("email")

    return {
        "kakao_id": str(data["id"]) if "id" in data else None,
        "age_range_needs_agreement": kakao_account.get("age_range_needs_agreement", True),
        "age_range": kakao_account.get("age_range"),
        "nickname": properties.get("nickname"),
        "email": email,
    }
