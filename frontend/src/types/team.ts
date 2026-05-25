export interface TeamOverview {
  id: string
  name: string
  short_info: string | null
}

export interface TeamMember {
  name: string
  email: string
}

export interface TeamDetail {
  name: string
  description: string | null
  members: TeamMember[]
}
