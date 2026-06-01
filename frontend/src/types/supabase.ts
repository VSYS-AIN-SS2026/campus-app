export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      appointment_invitations: {
        Row: {
          appointment_id: string
          created_at: string
          id: string
          responded_at: string | null
          status: Database["public"]["Enums"]["invitation_status"]
          team_member_id: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          id?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["invitation_status"]
          team_member_id: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          id?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["invitation_status"]
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_invitations_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "team_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_invitations_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          type?: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          code: string
          coordinator: string | null
          course_type: string
          created_at: string | null
          details: Json
          ects: number
          id: string
          module_id: string
          name: string
          sws: number
          updated_at: string | null
        }
        Insert: {
          code: string
          coordinator?: string | null
          course_type: string
          created_at?: string | null
          details?: Json
          ects?: number
          id?: string
          module_id: string
          name: string
          sws?: number
          updated_at?: string | null
        }
        Update: {
          code?: string
          coordinator?: string | null
          course_type?: string
          created_at?: string | null
          details?: Json
          ects?: number
          id?: string
          module_id?: string
          name?: string
          sws?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "view_modules_table"
            referencedColumns: ["id"]
          },
        ]
      }
      faculties: {
        Row: {
          code: string
          created_at: string | null
          id: string
          name: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          name?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      lsf_events: {
        Row: {
          course_id: string | null
          created_at: string
          end_date: string
          end_time: string
          event_type: string
          id: string
          raw_payload: Json | null
          rhythm: number
          room_building: string | null
          room_number: string | null
          source_url: string | null
          start_date: string
          start_time: string
          status: string | null
          term: string
          updated_at: string
          weekday: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          end_date: string
          end_time: string
          event_type: string
          id?: string
          raw_payload?: Json | null
          rhythm?: number
          room_building?: string | null
          room_number?: string | null
          source_url?: string | null
          start_date: string
          start_time: string
          status?: string | null
          term?: string
          updated_at?: string
          weekday?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string
          end_date?: string
          end_time?: string
          event_type?: string
          id?: string
          raw_payload?: Json | null
          rhythm?: number
          room_building?: string | null
          room_number?: string | null
          source_url?: string | null
          start_date?: string
          start_time?: string
          status?: string | null
          term?: string
          updated_at?: string
          weekday?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lsf_events_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lsf_events_room_building_room_number_fkey"
            columns: ["room_building", "room_number"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["building", "room_number"]
          },
        ]
      }
      lsf_import_runs: {
        Row: {
          error_msg: string | null
          events_deactivated: number | null
          events_found: number | null
          events_inserted: number | null
          events_updated: number | null
          finished_at: string | null
          id: string
          lsf_abstgvnr: string
          started_at: string
          status: string
          study_program_code: string
        }
        Insert: {
          error_msg?: string | null
          events_deactivated?: number | null
          events_found?: number | null
          events_inserted?: number | null
          events_updated?: number | null
          finished_at?: string | null
          id?: string
          lsf_abstgvnr: string
          started_at?: string
          status: string
          study_program_code: string
        }
        Update: {
          error_msg?: string | null
          events_deactivated?: number | null
          events_found?: number | null
          events_inserted?: number | null
          events_updated?: number | null
          finished_at?: string | null
          id?: string
          lsf_abstgvnr?: string
          started_at?: string
          status?: string
          study_program_code?: string
        }
        Relationships: []
      }
      module_category_entries: {
        Row: {
          category_id: string
          created_at: string
          module_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          module_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          module_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_category_entries_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_category_entries_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_category_entries_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "view_modules_table"
            referencedColumns: ["id"]
          },
        ]
      }
      module_handbook_entries: {
        Row: {
          handbook_id: string
          module_id: string
          recommended_semester: number | null
        }
        Insert: {
          handbook_id: string
          module_id: string
          recommended_semester?: number | null
        }
        Update: {
          handbook_id?: string
          module_id?: string
          recommended_semester?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "module_handbook_entries_handbook_id_fkey"
            columns: ["handbook_id"]
            isOneToOne: false
            referencedRelation: "module_handbooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_handbook_entries_handbook_id_fkey"
            columns: ["handbook_id"]
            isOneToOne: false
            referencedRelation: "view_module_handbooks_list"
            referencedColumns: ["handbook_id"]
          },
          {
            foreignKeyName: "module_handbook_entries_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_handbook_entries_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "view_modules_table"
            referencedColumns: ["id"]
          },
        ]
      }
      module_handbooks: {
        Row: {
          code: string
          created_at: string | null
          id: string
          spo_id: string
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          spo_id: string
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          spo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_handbooks_spo_id_fkey"
            columns: ["spo_id"]
            isOneToOne: false
            referencedRelation: "spos"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          code: string
          coordinator: string
          created_at: string | null
          details: Json
          id: string
          is_mandatory: boolean
          is_specialization: boolean
          language: string
          lsf_veranstid: string | null
          name: string
          specialization_name: string | null
          start_semester: string
          study_program_id: string | null
          updated_at: string | null
          version: number
        }
        Insert: {
          code: string
          coordinator: string
          created_at?: string | null
          details?: Json
          id?: string
          is_mandatory?: boolean
          is_specialization?: boolean
          language?: string
          lsf_veranstid?: string | null
          name: string
          specialization_name?: string | null
          start_semester: string
          study_program_id?: string | null
          updated_at?: string | null
          version?: number
        }
        Update: {
          code?: string
          coordinator?: string
          created_at?: string | null
          details?: Json
          id?: string
          is_mandatory?: boolean
          is_specialization?: boolean
          language?: string
          lsf_veranstid?: string | null
          name?: string
          specialization_name?: string | null
          start_semester?: string
          study_program_id?: string | null
          updated_at?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "modules_study_program_id_fkey"
            columns: ["study_program_id"]
            isOneToOne: false
            referencedRelation: "study_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email_verified: boolean
          full_name: string | null
          id: string
          role: string
        }
        Insert: {
          created_at?: string
          email_verified?: boolean
          full_name?: string | null
          id: string
          role?: string
        }
        Update: {
          created_at?: string
          email_verified?: boolean
          full_name?: string | null
          id?: string
          role?: string
        }
        Relationships: []
      }
      rooms: {
        Row: {
          building: string
          created_at: string
          room_number: string
          room_type: string | null
        }
        Insert: {
          building: string
          created_at?: string
          room_number: string
          room_type?: string | null
        }
        Update: {
          building?: string
          created_at?: string
          room_number?: string
          room_type?: string | null
        }
        Relationships: []
      }
      spos: {
        Row: {
          created_at: string | null
          id: string
          study_program_id: string
          valid_from: string | null
          version_name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          study_program_id: string
          valid_from?: string | null
          version_name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          study_program_id?: string
          valid_from?: string | null
          version_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "spos_study_program_id_fkey"
            columns: ["study_program_id"]
            isOneToOne: false
            referencedRelation: "study_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      study_programs: {
        Row: {
          code: string
          created_at: string | null
          faculty_id: string
          id: string
          name: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          faculty_id: string
          id?: string
          name?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          faculty_id?: string
          id?: string
          name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "study_programs_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculties"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invitations: {
        Row: {
          created_at: string
          id: string
          invited_by: string
          invited_user_id: string
          responded_at: string | null
          status: Database["public"]["Enums"]["invitation_status"]
          team_id: string
          token: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by: string
          invited_user_id: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["invitation_status"]
          team_id: string
          token?: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string
          invited_user_id?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["invitation_status"]
          team_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_appointments: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          ends_at: string
          id: string
          starts_at: string
          team_id: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          ends_at: string
          id?: string
          starts_at: string
          team_id: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          ends_at?: string
          id?: string
          starts_at?: string
          team_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_appointments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_appointments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["team_role"]
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["team_role"]
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["team_role"]
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_hidden_schedule_occurrences: {
        Row: {
          occurrence_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          occurrence_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          occurrence_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_hidden_schedule_occurrences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_hidden_schedule_series: {
        Row: {
          series_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          series_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          series_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_hidden_schedule_series_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_module_statuses: {
        Row: {
          created_at: string
          module_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          module_id: string
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          module_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_module_statuses_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_module_statuses_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "view_modules_table"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_module_statuses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_modules: {
        Row: {
          id: string
          module_id: string
          status: Database["public"]["Enums"]["module_status"]
          user_id: string
        }
        Insert: {
          id?: string
          module_id: string
          status: Database["public"]["Enums"]["module_status"]
          user_id: string
        }
        Update: {
          id?: string
          module_id?: string
          status?: Database["public"]["Enums"]["module_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_modules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_modules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "view_modules_table"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_modules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_user_id: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          spo_id: string | null
          study_program_id: string | null
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          spo_id?: string | null
          study_program_id?: string | null
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          spo_id?: string | null
          study_program_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_spo_program_fkey"
            columns: ["spo_id", "study_program_id"]
            isOneToOne: false
            referencedRelation: "spos"
            referencedColumns: ["id", "study_program_id"]
          },
          {
            foreignKeyName: "users_study_program_id_fkey"
            columns: ["study_program_id"]
            isOneToOne: false
            referencedRelation: "study_programs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      view_module_handbooks_list: {
        Row: {
          fakultaet: string | null
          handbook_id: string | null
          kuerzel: string | null
          spo_version: string | null
          studiengang: string | null
        }
        Relationships: []
      }
      view_modules_table: {
        Row: {
          categories: Json | null
          id: string | null
          is_mandatory: boolean | null
          is_specialization: boolean | null
          koordinator: string | null
          kuerzel: string | null
          language: string | null
          name: string | null
          specialization_name: string | null
          start_semester: string | null
          version: number | null
        }
        Insert: {
          categories?: never
          id?: string | null
          is_mandatory?: boolean | null
          is_specialization?: boolean | null
          koordinator?: string | null
          kuerzel?: string | null
          language?: string | null
          name?: string | null
          specialization_name?: string | null
          start_semester?: string | null
          version?: number | null
        }
        Update: {
          categories?: never
          id?: string | null
          is_mandatory?: boolean | null
          is_specialization?: boolean | null
          koordinator?: string | null
          kuerzel?: string | null
          language?: string | null
          name?: string | null
          specialization_name?: string | null
          start_semester?: string | null
          version?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      create_team_appointment: {
        Args: {
          p_description: string
          p_ends_at: string
          p_invitee_member_ids?: string[]
          p_starts_at: string
          p_team_id: string
          p_title: string
        }
        Returns: {
          created_at: string
          created_by: string
          description: string | null
          ends_at: string
          id: string
          starts_at: string
          team_id: string
          title: string
        }
        SetofOptions: {
          from: "*"
          to: "team_appointments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      delete_team_appointment: {
        Args: { p_appointment_id: string }
        Returns: boolean
      }
      get_demo_user_hidden_schedule_occurrence_ids: {
        Args: never
        Returns: {
          occurrence_id: string
          updated_at: string
        }[]
      }
      get_demo_user_hidden_schedule_series_ids: {
        Args: never
        Returns: {
          series_id: string
          updated_at: string
        }[]
      }
      get_demo_user_module_statuses: {
        Args: { selected_module_ids?: string[] }
        Returns: {
          module_id: string
          status: string
          updated_at: string
        }[]
      }
      get_demo_user_profile: {
        Args: never
        Returns: {
          created_at: string
          email: string
          full_name: string
          id: string
          spo_id: string
          study_program_id: string
          updated_at: string
        }[]
      }
      get_demo_user_weekly_schedule: {
        Args: { selected_time_zone?: string; selected_week_start?: string }
        Returns: {
          day_date: string
          end_time: string
          end_time_minutes: number
          event_id: string
          is_hidden: boolean
          is_hidden_occurrence: boolean
          is_hidden_series: boolean
          module_code: string
          module_id: string
          module_name: string
          module_status: string
          occurrence_id: string
          series_id: string
          start_time: string
          start_time_minutes: number
          subtitle: string
          title: string
          weekday_index: number
        }[]
      }
      get_module_categories: {
        Args: { selected_module_ids?: string[] }
        Returns: {
          category_id: string
          color: string
          module_id: string
          name: string
          type: string
        }[]
      }
      get_my_accepted_appointments: {
        Args: { p_from?: string; p_to?: string }
        Returns: {
          appointment_id: string
          description: string
          ends_at: string
          invitation_id: string
          starts_at: string
          team_id: string
          team_name: string
          title: string
        }[]
      }
      get_my_appointment_invitations: {
        Args: { p_team_id?: string }
        Returns: {
          appointment_id: string
          description: string
          ends_at: string
          invitation_id: string
          starts_at: string
          status: Database["public"]["Enums"]["invitation_status"]
          team_id: string
          team_name: string
          title: string
        }[]
      }
      get_my_notifications: {
        Args: never
        Returns: {
          body: string
          created_at: string
          id: string
          payload: Json
          read_at: string
          title: string
          type: string
        }[]
      }
      get_team_appointment: {
        Args: { p_appointment_id: string }
        Returns: {
          created_at: string
          created_by: string
          description: string | null
          ends_at: string
          id: string
          starts_at: string
          team_id: string
          title: string
        }
        SetofOptions: {
          from: "*"
          to: "team_appointments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_team_appointments: {
        Args: { p_from?: string; p_team_id: string; p_to?: string }
        Returns: {
          created_at: string
          created_by: string
          description: string
          ends_at: string
          id: string
          invitations: Json
          starts_at: string
          team_id: string
          title: string
        }[]
      }
      get_team_details: {
        Args: { p_team_id: string }
        Returns: {
          description: string
          members: Json
          name: string
        }[]
      }
      get_team_free_slots: {
        Args: {
          p_duration_minutes: number
          p_excluded_weekdays?: number[]
          p_max_end?: string
          p_min_start?: string
          p_team_id: string
          p_time_zone?: string
          p_week_start: string
        }
        Returns: {
          duration_minutes: number
          ends_at: string
          starts_at: string
        }[]
      }
      get_teams: {
        Args: never
        Returns: {
          id: string
          name: string
          short_info: string
        }[]
      }
      hide_demo_user_schedule_occurrence: {
        Args: { selected_occurrence_id: string }
        Returns: {
          occurrence_id: string
          updated_at: string
        }[]
      }
      hide_demo_user_schedule_series: {
        Args: { selected_series_id: string }
        Returns: {
          series_id: string
          updated_at: string
        }[]
      }
      is_team_member: { Args: { p_team_id: string }; Returns: boolean }
      mark_notification_read: { Args: { p_id: string }; Returns: boolean }
      resolve_dashboard_user: {
        Args: never
        Returns: {
          auth_user_id: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          spo_id: string | null
          study_program_id: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "users"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      respond_to_appointment_invitation: {
        Args: {
          p_invitation_id: string
          p_status: Database["public"]["Enums"]["invitation_status"]
        }
        Returns: {
          appointment_id: string
          created_at: string
          id: string
          responded_at: string | null
          status: Database["public"]["Enums"]["invitation_status"]
          team_member_id: string
        }
        SetofOptions: {
          from: "*"
          to: "appointment_invitations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_demo_user_module_status: {
        Args: { selected_module_id: string; selected_status: string }
        Returns: {
          module_id: string
          status: string
          updated_at: string
        }[]
      }
      save_demo_user_profile_selection: {
        Args: { selected_spo_id: string; selected_study_program_id: string }
        Returns: {
          created_at: string
          email: string
          full_name: string
          id: string
          spo_id: string
          study_program_id: string
          updated_at: string
        }[]
      }
      save_module_categories: {
        Args: { selected_category_ids?: string[]; selected_module_id: string }
        Returns: {
          category_id: string
          color: string
          name: string
          type: string
        }[]
      }
      show_demo_user_schedule_occurrence: {
        Args: { selected_occurrence_id: string }
        Returns: {
          occurrence_id: string
          updated_at: string
        }[]
      }
      show_demo_user_schedule_series: {
        Args: { selected_series_id: string }
        Returns: {
          series_id: string
          updated_at: string
        }[]
      }
      update_team_appointment: {
        Args: {
          p_appointment_id: string
          p_description?: string
          p_ends_at?: string
          p_starts_at?: string
          p_title?: string
        }
        Returns: {
          created_at: string
          created_by: string
          description: string | null
          ends_at: string
          id: string
          starts_at: string
          team_id: string
          title: string
        }
        SetofOptions: {
          from: "*"
          to: "team_appointments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      invitation_status: "pending" | "accepted" | "declined"
      module_status: "planned" | "completed"
      team_role: "owner" | "admin" | "member"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      invitation_status: ["pending", "accepted", "declined"],
      module_status: ["planned", "completed"],
      team_role: ["owner", "admin", "member"],
    },
  },
} as const
