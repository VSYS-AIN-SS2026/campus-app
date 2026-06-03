export type Organisation = {
  id: string
  name: string
  description: string | null
  created_by: string
  created_at: string
}

export type OrganisationMember = {
  organisation_id: string
  user_id: string
  role: 'owner' | 'member'
  joined_at: string
}

export type OrganisationEvent = {
  id: string
  organisation_id: string
  title: string
  description: string | null
  location: string | null
  starts_at: string
  ends_at: string
  created_by: string
  created_at: string
}

export type OrganisationWithState = Organisation & {
  isMember: boolean
  isOwner: boolean
}

export type NewOrganisationInput = {
  name: string
  description?: string
}

export type NewOrganisationEventInput = {
  organisationId: string
  title: string
  description?: string
  location?: string
  startsAt: string
  endsAt: string
}