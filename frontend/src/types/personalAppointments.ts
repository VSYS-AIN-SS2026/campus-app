export interface PersonalAppointment {
  id: string
  title: string
  description: string | null
  starts_at: string
  ends_at: string
  created_at: string
}

export interface NewPersonalAppointmentInput {
  title: string
  description: string | null
  startsAt: string
  endsAt: string
}
