import { supabase } from '../supabase'

export interface TeamOverview {
  id: number
  name: string
  short_info: string | null
}

export interface TeamMember {
  full_name: string | null
  email: string
}

export interface TeamDetails {
  name: string
  description: string | null
  members: TeamMember[]
}

export async function getTeamsOverview(): Promise<TeamOverview[]> {
  const { data, error } = await supabase!.rpc('get_teams_overview')
  if (error) throw error
  return (data ?? []) as TeamOverview[]
}

export async function getTeamDetails(teamId: number): Promise<TeamDetails | null> {
  const { data, error } = await supabase!.rpc('get_team_details', { p_team_id: teamId })
  if (error) throw error
  if (!data || (data as any[]).length === 0) return null

  const rows = data as Array<{
    team_name: string
    description: string | null
    member_full_name: string | null
    member_email: string | null
  }>

  return {
    name: rows[0].team_name,
    description: rows[0].description,
    members: rows
      .filter(r => r.member_email !== null)
      .map(r => ({ full_name: r.member_full_name, email: r.member_email! })),
  }
}
