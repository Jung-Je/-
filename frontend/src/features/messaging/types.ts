export type Message = {
  id: number
  connection: number
  sender: number
  sender_username: string
  body: string
  created_at: string
  read_at: string | null
}
