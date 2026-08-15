import { useEffect, useState } from 'react'
import { AppNav } from '../../../components/AppNav'
import { CardStackMark } from '../../../components/CardStackMark'
import { RequireAuth } from '../../auth/components/RequireAuth'
import { listMyInquiries } from '../api/supportApi'
import type { Inquiry } from '../types'
import { InquiryForm } from './InquiryForm'
import { MyInquiries } from './MyInquiries'
import '../../settings/components/SettingsScreen.css'
import './SupportScreen.css'

export function SupportScreen() {
  return (
    <RequireAuth>
      {() => <Screen />}
    </RequireAuth>
  )
}

function Screen() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([])

  async function refresh() {
    const result = await listMyInquiries()
    setInquiries(result.results)
  }

  useEffect(() => {
    refresh()
  }, [])

  return (
    <div className="settings-screen">
      <div className="settings-header">
        <div className="settings-brand">
          <CardStackMark />
          <h1>매칭</h1>
        </div>
        <AppNav />
      </div>

      <div className="settings-content">
        <InquiryForm onCreated={(inquiry) => setInquiries((current) => [inquiry, ...current])} />
        <MyInquiries inquiries={inquiries} />
      </div>
    </div>
  )
}
