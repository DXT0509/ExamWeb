export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      attempt_answers: {
        Row: {
          answered_at: string
          attempt_id: string
          created_at: string
          id: string
          is_marked: boolean
          question_id: string
          selected_option_id: string | null
          sub_answers: Json | null
          text_answer: string | null
          updated_at: string
        }
        Insert: {
          answered_at?: string
          attempt_id: string
          created_at?: string
          id?: string
          is_marked?: boolean
          question_id: string
          selected_option_id?: string | null
          sub_answers?: Json | null
          text_answer?: string | null
          updated_at?: string
        }
        Update: {
          answered_at?: string
          attempt_id?: string
          created_at?: string
          id?: string
          is_marked?: boolean
          question_id?: string
          selected_option_id?: string | null
          sub_answers?: Json | null
          text_answer?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attempt_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "exam_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempt_answers_composite_option_fk"
            columns: ["question_id", "selected_option_id"]
            isOneToOne: false
            referencedRelation: "question_options"
            referencedColumns: ["question_id", "id"]
          },
          {
            foreignKeyName: "attempt_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempt_answers_selected_option_id_fkey"
            columns: ["selected_option_id"]
            isOneToOne: false
            referencedRelation: "question_options"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          admin_unread_count: number
          created_at: string
          id: string
          last_message_at: string
          status: Database["public"]["Enums"]["conversation_status"]
          student_id: string
          student_unread_count: number
          updated_at: string
        }
        Insert: {
          admin_unread_count?: number
          created_at?: string
          id?: string
          last_message_at?: string
          status?: Database["public"]["Enums"]["conversation_status"]
          student_id: string
          student_unread_count?: number
          updated_at?: string
        }
        Update: {
          admin_unread_count?: number
          created_at?: string
          id?: string
          last_message_at?: string
          status?: Database["public"]["Enums"]["conversation_status"]
          student_id?: string
          student_unread_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          created_by: string
          deleted_at: string | null
          description: string | null
          external_url: string | null
          file_path: string | null
          id: string
          is_public: boolean
          slug: string
          status: Database["public"]["Enums"]["document_status"]
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          deleted_at?: string | null
          description?: string | null
          external_url?: string | null
          file_path?: string | null
          id?: string
          is_public?: boolean
          slug: string
          status?: Database["public"]["Enums"]["document_status"]
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          description?: string | null
          external_url?: string | null
          file_path?: string | null
          id?: string
          is_public?: boolean
          slug?: string
          status?: Database["public"]["Enums"]["document_status"]
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_attempts: {
        Row: {
          blank_answers: number | null
          correct_answers: number | null
          created_at: string
          deadline_at: string
          exam_id: string
          finalized_at: string | null
          guest_session_hash: string | null
          id: string
          idempotency_key: string | null
          max_score: number | null
          score: number | null
          started_at: string
          status: Database["public"]["Enums"]["attempt_status"]
          student_id: string | null
          submit_reason: Database["public"]["Enums"]["submit_reason"] | null
          submitted_at: string | null
          updated_at: string
          wrong_answers: number | null
        }
        Insert: {
          blank_answers?: number | null
          correct_answers?: number | null
          created_at?: string
          deadline_at: string
          exam_id: string
          finalized_at?: string | null
          guest_session_hash?: string | null
          id?: string
          idempotency_key?: string | null
          max_score?: number | null
          score?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["attempt_status"]
          student_id?: string | null
          submit_reason?: Database["public"]["Enums"]["submit_reason"] | null
          submitted_at?: string | null
          updated_at?: string
          wrong_answers?: number | null
        }
        Update: {
          blank_answers?: number | null
          correct_answers?: number | null
          created_at?: string
          deadline_at?: string
          exam_id?: string
          finalized_at?: string | null
          guest_session_hash?: string | null
          id?: string
          idempotency_key?: string | null
          max_score?: number | null
          score?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["attempt_status"]
          student_id?: string | null
          submit_reason?: Database["public"]["Enums"]["submit_reason"] | null
          submitted_at?: string | null
          updated_at?: string
          wrong_answers?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_attempts_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_attempts_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "public_exam_catalog"
            referencedColumns: ["exam_id"]
          },
          {
            foreignKeyName: "exam_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_categories: {
        Row: {
          created_at: string
          created_by: string
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_categories_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_categories_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_events: {
        Row: {
          attempt_id: string
          client_occurred_at: string | null
          event_type: Database["public"]["Enums"]["exam_event_type"]
          id: string
          metadata: Json
          resolved_at: string | null
          server_occurred_at: string
        }
        Insert: {
          attempt_id: string
          client_occurred_at?: string | null
          event_type: Database["public"]["Enums"]["exam_event_type"]
          id?: string
          metadata?: Json
          resolved_at?: string | null
          server_occurred_at?: string
        }
        Update: {
          attempt_id?: string
          client_occurred_at?: string | null
          event_type?: Database["public"]["Enums"]["exam_event_type"]
          id?: string
          metadata?: Json
          resolved_at?: string | null
          server_occurred_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_events_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "exam_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_sections: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          exam_id: string
          id: string
          position: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          exam_id: string
          id?: string
          position: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          exam_id?: string
          id?: string
          position?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_sections_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_sections_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "public_exam_catalog"
            referencedColumns: ["exam_id"]
          },
        ]
      }
      exams: {
        Row: {
          access_type: Database["public"]["Enums"]["exam_access_type"]
          allow_guest_attempt: boolean
          archived_at: string | null
          category_id: string | null
          closed_at: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          description: string | null
          duration_minutes: number
          exam_template: string
          fullscreen_required: boolean
          id: string
          published_at: string | null
          randomize_options: boolean
          randomize_questions: boolean
          scoring_strategy: string
          show_answers_after_submit: boolean
          show_score_after_submit: boolean
          show_solutions_after_submit: boolean
          slug: string
          status: Database["public"]["Enums"]["exam_status"]
          subject_id: string
          title: string
          total_score: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          access_type?: Database["public"]["Enums"]["exam_access_type"]
          allow_guest_attempt?: boolean
          archived_at?: string | null
          category_id?: string | null
          closed_at?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          description?: string | null
          duration_minutes: number
          exam_template?: string
          fullscreen_required?: boolean
          id?: string
          published_at?: string | null
          randomize_options?: boolean
          randomize_questions?: boolean
          scoring_strategy?: string
          show_answers_after_submit?: boolean
          show_score_after_submit?: boolean
          show_solutions_after_submit?: boolean
          slug: string
          status?: Database["public"]["Enums"]["exam_status"]
          subject_id: string
          title: string
          total_score?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          access_type?: Database["public"]["Enums"]["exam_access_type"]
          allow_guest_attempt?: boolean
          archived_at?: string | null
          category_id?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          description?: string | null
          duration_minutes?: number
          exam_template?: string
          fullscreen_required?: boolean
          id?: string
          published_at?: string | null
          randomize_options?: boolean
          randomize_questions?: boolean
          scoring_strategy?: string
          show_answers_after_submit?: boolean
          show_score_after_submit?: boolean
          show_solutions_after_submit?: boolean
          slug?: string
          status?: Database["public"]["Enums"]["exam_status"]
          subject_id?: string
          title?: string
          total_score?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exams_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "exam_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          client_msg_id: string | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string
          sender_role: Database["public"]["Enums"]["profile_role"]
        }
        Insert: {
          client_msg_id?: string | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id: string
          sender_role: Database["public"]["Enums"]["profile_role"]
        }
        Update: {
          client_msg_id?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string
          sender_role?: Database["public"]["Enums"]["profile_role"]
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          role: Database["public"]["Enums"]["profile_role"]
          status: Database["public"]["Enums"]["profile_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["profile_role"]
          status?: Database["public"]["Enums"]["profile_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["profile_role"]
          status?: Database["public"]["Enums"]["profile_status"]
          updated_at?: string
        }
        Relationships: []
      }
      question_options: {
        Row: {
          content: string
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean
          is_correct: boolean
          position: number
          question_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          is_correct?: boolean
          position: number
          question_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          is_correct?: boolean
          position?: number
          question_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          content: string
          correct_answer_raw: string | null
          created_at: string
          deleted_at: string | null
          explanation: string | null
          id: string
          image_path: string | null
          is_active: boolean
          metadata: Json
          position: number
          question_type: string
          score: number
          section_id: string
          tolerance: number | null
          updated_at: string
        }
        Insert: {
          content: string
          correct_answer_raw?: string | null
          created_at?: string
          deleted_at?: string | null
          explanation?: string | null
          id?: string
          image_path?: string | null
          is_active?: boolean
          metadata?: Json
          position: number
          question_type?: string
          score?: number
          section_id: string
          tolerance?: number | null
          updated_at?: string
        }
        Update: {
          content?: string
          correct_answer_raw?: string | null
          created_at?: string
          deleted_at?: string | null
          explanation?: string | null
          id?: string
          image_path?: string | null
          is_active?: boolean
          metadata?: Json
          position?: number
          question_type?: string
          score?: number
          section_id?: string
          tolerance?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "exam_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          created_at: string
          created_by: string
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subjects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subjects_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_exam_catalog: {
        Row: {
          access_type: Database["public"]["Enums"]["exam_access_type"] | null
          allow_guest_attempt: boolean | null
          category_id: string | null
          category_name: string | null
          category_slug: string | null
          description: string | null
          duration_minutes: number | null
          exam_id: string | null
          fullscreen_required: boolean | null
          published_at: string | null
          question_count: number | null
          show_answers_after_submit: boolean | null
          show_score_after_submit: boolean | null
          show_solutions_after_submit: boolean | null
          slug: string | null
          subject_id: string | null
          subject_name: string | null
          subject_slug: string | null
          title: string | null
          total_score: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exams_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "exam_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      archive_exam: {
        Args: { exam_id: string }
        Returns: {
          archived_exam_id: string
          code: string
          success: boolean
        }[]
      }
      clone_exam: {
        Args: { new_slug: string; new_title: string; source_exam_id: string }
        Returns: {
          cloned_exam_id: string
          code: string
          success: boolean
        }[]
      }
      close_exam: {
        Args: { exam_id: string }
        Returns: {
          closed_exam_id: string
          code: string
          success: boolean
        }[]
      }
      delete_exam: {
        Args: { p_exam_id: string }
        Returns: {
          code: string
          success: boolean
        }[]
      }
      exam_for_section: {
        Args: { section_exam_id: string }
        Returns: {
          access_type: Database["public"]["Enums"]["exam_access_type"]
          allow_guest_attempt: boolean
          archived_at: string | null
          category_id: string | null
          closed_at: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          description: string | null
          duration_minutes: number
          exam_template: string
          fullscreen_required: boolean
          id: string
          published_at: string | null
          randomize_options: boolean
          randomize_questions: boolean
          scoring_strategy: string
          show_answers_after_submit: boolean
          show_score_after_submit: boolean
          show_solutions_after_submit: boolean
          slug: string
          status: Database["public"]["Enums"]["exam_status"]
          subject_id: string
          title: string
          total_score: number
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "exams"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_admin_attempt_detail: {
        Args: { p_attempt_id: string }
        Returns: Json
      }
      get_admin_attempts: {
        Args: {
          p_exam_id?: string
          p_page?: number
          p_page_size?: number
          p_search?: string
          p_status?: string
          p_subject_id?: string
          p_submit_reason?: string
        }
        Returns: {
          attempt_id: string
          exam_id: string
          exam_title: string
          is_guest: boolean
          max_score: number
          score: number
          started_at: string
          status: Database["public"]["Enums"]["attempt_status"]
          student_email: string
          student_id: string
          student_name: string
          subject_name: string
          submit_reason: Database["public"]["Enums"]["submit_reason"]
          submitted_at: string
          total_count: number
        }[]
      }
      get_admin_dashboard_events: {
        Args: { p_limit?: number }
        Returns: {
          attempt_id: string
          client_occurred_at: string
          event_id: string
          event_type: Database["public"]["Enums"]["exam_event_type"]
          exam_id: string
          exam_title: string
          is_guest: boolean
          metadata: Json
          resolved_at: string
          server_occurred_at: string
          student_email: string
          student_id: string
          student_name: string
          subject_name: string
        }[]
      }
      get_admin_dashboard_stats: { Args: never; Returns: Json }
      get_admin_students: {
        Args: {
          p_page?: number
          p_page_size?: number
          p_search?: string
          p_status?: string
        }
        Returns: {
          created_at: string
          display_name: string
          email: string
          id: string
          status: Database["public"]["Enums"]["profile_status"]
          total_count: number
        }[]
      }
      get_attempt_payload: {
        Args: { p_attempt_id: string; p_guest_session_hash?: string }
        Returns: Json
      }
      get_attempt_result: {
        Args: { p_attempt_id: string; p_guest_session_hash?: string }
        Returns: Json
      }
      get_or_create_student_conversation: {
        Args: never
        Returns: {
          admin_unread_count: number
          created_at: string
          id: string
          last_message_at: string
          status: Database["public"]["Enums"]["conversation_status"]
          student_id: string
          student_unread_count: number
          updated_at: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      mark_conversation_read: {
        Args: { p_conversation_id: string }
        Returns: boolean
      }
      math_value_equals: {
        Args: { p_raw1: string; p_raw2: string; p_tolerance?: number }
        Returns: boolean
      }
      publish_exam: {
        Args: { exam_id: string }
        Returns: {
          code: string
          published_exam_id: string
          success: boolean
        }[]
      }
      record_exam_event: {
        Args: {
          p_attempt_id: string
          p_client_occurred_at?: string
          p_event_type: Database["public"]["Enums"]["exam_event_type"]
          p_guest_session_hash?: string
          p_metadata?: Json
        }
        Returns: {
          event_id: string
          is_duplicate: boolean
          server_occurred_at: string
        }[]
      }
      reorder_exam_sections: {
        Args: { ordered_section_ids: string[]; target_exam_id: string }
        Returns: {
          code: string
          success: boolean
        }[]
      }
      reorder_question_options: {
        Args: { ordered_option_ids: string[]; target_question_id: string }
        Returns: {
          code: string
          success: boolean
        }[]
      }
      reorder_section_questions: {
        Args: { ordered_question_ids: string[]; target_section_id: string }
        Returns: {
          code: string
          success: boolean
        }[]
      }
      resolve_exam_event: {
        Args: { p_attempt_id: string; p_guest_session_hash?: string }
        Returns: {
          resolved_count: number
          success: boolean
        }[]
      }
      return_exam_to_draft: {
        Args: { exam_id: string }
        Returns: {
          code: string
          draft_exam_id: string
          success: boolean
        }[]
      }
      save_answer: {
        Args: {
          p_attempt_id: string
          p_guest_session_hash?: string
          p_is_marked?: boolean
          p_question_id: string
          p_selected_option_id?: string
          p_sub_answers?: Json
          p_text_answer?: string
        }
        Returns: {
          code: string
          success: boolean
        }[]
      }
      send_chat_message: {
        Args: {
          p_client_msg_id?: string
          p_content: string
          p_conversation_id: string
        }
        Returns: {
          client_msg_id: string
          content: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string
          sender_role: Database["public"]["Enums"]["profile_role"]
        }[]
      }
      start_attempt: {
        Args: { p_exam_id: string; p_guest_session_hash?: string }
        Returns: {
          attempt_id: string
          attempt_status: Database["public"]["Enums"]["attempt_status"]
          deadline_at: string
          is_existing: boolean
          started_at: string
        }[]
      }
      submit_attempt: {
        Args: {
          p_attempt_id: string
          p_guest_session_hash?: string
          p_idempotency_key?: string
          p_submit_reason?: Database["public"]["Enums"]["submit_reason"]
        }
        Returns: {
          attempt_status: Database["public"]["Enums"]["attempt_status"]
          blank_answers: number
          code: string
          correct_answers: number
          max_score: number
          score: number
          success: boolean
          wrong_answers: number
        }[]
      }
      toggle_student_lock: {
        Args: { p_student_id: string; p_target_status: string }
        Returns: {
          attempts_auto_submitted: number
          code: string
          status: Database["public"]["Enums"]["profile_status"]
          success: boolean
        }[]
      }
      verify_attempt_owner: {
        Args: {
          p_attempt: Database["public"]["Tables"]["exam_attempts"]["Row"]
          p_guest_session_hash: string
        }
        Returns: boolean
      }
    }
    Enums: {
      attempt_status: "in_progress" | "submitted" | "auto_submitted" | "expired"
      conversation_status: "open" | "closed" | "archived"
      document_status: "draft" | "published" | "archived"
      exam_access_type: "public" | "students_only" | "private"
      exam_event_type:
        | "attempt_started"
        | "answer_saved"
        | "fullscreen_exit"
        | "visibility_hidden"
        | "fullscreen_return"
        | "visibility_visible"
        | "fullscreen_unsupported"
        | "violation_resolved"
        | "account_locked"
        | "auto_submit_requested"
        | "submit_requested"
        | "submit_completed"
        | "network_recovered"
      exam_status: "draft" | "published" | "closed" | "archived"
      profile_role: "student" | "admin"
      profile_status: "active" | "locked"
      submit_reason:
        | "student_submit"
        | "time_expired"
        | "fullscreen_violation"
        | "account_locked"
        | "system_recovery"
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
      attempt_status: ["in_progress", "submitted", "auto_submitted", "expired"],
      conversation_status: ["open", "closed", "archived"],
      document_status: ["draft", "published", "archived"],
      exam_access_type: ["public", "students_only", "private"],
      exam_event_type: [
        "attempt_started",
        "answer_saved",
        "fullscreen_exit",
        "visibility_hidden",
        "fullscreen_return",
        "visibility_visible",
        "fullscreen_unsupported",
        "violation_resolved",
        "account_locked",
        "auto_submit_requested",
        "submit_requested",
        "submit_completed",
        "network_recovered",
      ],
      exam_status: ["draft", "published", "closed", "archived"],
      profile_role: ["student", "admin"],
      profile_status: ["active", "locked"],
      submit_reason: [
        "student_submit",
        "time_expired",
        "fullscreen_violation",
        "account_locked",
        "system_recovery",
      ],
    },
  },
} as const

