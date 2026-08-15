import type { Inquiry } from '../types'

type Props = {
  inquiries: Inquiry[]
}

export function MyInquiries({ inquiries }: Props) {
  return (
    <div className="settings-card">
      <div className="settings-card__heading">
        <h2>내 문의 내역</h2>
        <p>보낸 문의와 처리 상태예요.</p>
      </div>

      {inquiries.length === 0 ? (
        <p className="support-empty">아직 보낸 문의가 없어요.</p>
      ) : (
        <ul className="support-inquiry-list">
          {inquiries.map((inquiry) => (
            <li key={inquiry.id} className="support-inquiry-list__item">
              <div className="support-inquiry-list__row">
                <div className="support-inquiry-list__main">
                  <span className="support-badge">{inquiry.category_display}</span>
                  <span className="support-inquiry-list__title">{inquiry.title}</span>
                </div>
                <div className="support-inquiry-list__meta">
                  <span
                    className={`support-badge support-badge--${
                      inquiry.status === 'RESOLVED' ? 'resolved' : 'pending'
                    }`}
                  >
                    {inquiry.status_display}
                  </span>
                  <span className="support-inquiry-list__date">
                    {new Date(inquiry.created_at).toLocaleDateString('ko-KR')}
                  </span>
                </div>
              </div>

              {inquiry.admin_reply && (
                <div className="support-inquiry-list__reply">
                  <span className="support-inquiry-list__reply-label">관리자 답변</span>
                  <p>{inquiry.admin_reply}</p>
                  {inquiry.replied_at && (
                    <span className="support-inquiry-list__date">
                      {new Date(inquiry.replied_at).toLocaleDateString('ko-KR')}
                    </span>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
