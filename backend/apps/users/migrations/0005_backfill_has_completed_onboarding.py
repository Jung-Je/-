# has_completed_onboarding 필드를 추가한 0004 마이그레이션은 default=False로만
# 열을 만들어서, 이 기능이 배포되기 "전"에 이미 프로필 카드를 완성해둔 기존
# 유저들은 has_completed_onboarding이 계속 False로 남았다 — 이 값은 온보딩
# 마지막 단계(check_profile_completion)를 다시 통과해야만 세팅되는데, 이미
# 완성된 유저는 그 엔드포인트를 다시 안 타므로 영구히 False. 그 결과
# OnboardingWizard가 "아직 한 번도 온보딩을 안 끝냄"으로 잘못 판단해 이미
# 카드를 완성한 유저(카카오 로그인 포함)에게도 마법사를 다시 태우는 버그가
# 났다. is_profile_complete는 이 필드 도입 이전부터 정확히 유지돼 온 "현재
# 완성 여부"이므로, 그 값을 그대로 시드값으로 백필한다.
from django.db import migrations


def backfill_has_completed_onboarding(apps, schema_editor):
    User = apps.get_model("users", "User")
    User.objects.filter(is_profile_complete=True, has_completed_onboarding=False).update(
        has_completed_onboarding=True
    )


def noop_reverse(apps, schema_editor):
    # 역방향으로 "원래 False였는지"를 복원할 방법이 없다(백필 전 상태를
    # 기록해두지 않음) — 이 필드가 원래 어떤 값이었는지는 중요하지 않고,
    # 그냥 데이터를 되돌리지 않고 넘어간다.
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0004_user_has_completed_onboarding"),
    ]

    operations = [
        migrations.RunPython(backfill_has_completed_onboarding, noop_reverse),
    ]
