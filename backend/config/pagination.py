from rest_framework.pagination import PageNumberPagination


class DefaultPagination(PageNumberPagination):
    """프로젝트 공통 페이지네이션 — 기본 PageNumberPagination은
    page_size_query_param이 없어서 프론트가 보내는 ?page_size= 쿼리를
    그냥 무시하고 항상 PAGE_SIZE(20)만 반환했다(코드 리뷰로 발견). 댓글
    21개 이상인 글, 관심사 21개 이상 추가한 유저 등에서 목록이 조용히
    잘려 보이는 버그의 원인이었음.

    max_page_size는 프론트가 "사실상 전체 목록"을 한 번에 받으려고 쓰는
    값(현재 최대 200 — 게시판 댓글/스태프 게시판 댓글)에 여유를 두고
    맞췄다."""

    page_size_query_param = "page_size"
    max_page_size = 200
