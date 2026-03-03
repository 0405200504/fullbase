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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          health_score: number | null
          id: string
          nome_empresa: string
          owner_id: string
          plano: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          health_score?: number | null
          id?: string
          nome_empresa: string
          owner_id: string
          plano?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          health_score?: number | null
          id?: string
          nome_empresa?: string
          owner_id?: string
          plano?: string | null
        }
        Relationships: []
      }
      activity_logs: {
        Row: {
          account_id: string
          action_type: string
          created_at: string
          details: Json | null
          id: string
          user_id: string | null
        }
        Insert: {
          account_id: string
          action_type: string
          created_at?: string
          details?: Json | null
          id?: string
          user_id?: string | null
        }
        Update: {
          account_id?: string
          action_type?: string
          created_at?: string
          details?: Json | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      atividades: {
        Row: {
          account_id: string
          created_at: string | null
          descricao: string
          id: string
          lead_id: string
          tipo: string
          user_id: string | null
        }
        Insert: {
          account_id: string
          created_at?: string | null
          descricao: string
          id?: string
          lead_id: string
          tipo: string
          user_id?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string | null
          descricao?: string
          id?: string
          lead_id?: string
          tipo?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "atividades_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      calls: {
        Row: {
          account_id: string
          arquivado: boolean | null
          closer_id: string
          created_at: string | null
          data_arquivamento: string | null
          data_hora_agendada: string
          dias_follow_up: number | null
          id: string
          lead_id: string
          notas: string | null
          proxima_acao: string | null
          resultado: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          account_id: string
          arquivado?: boolean | null
          closer_id: string
          created_at?: string | null
          data_arquivamento?: string | null
          data_hora_agendada: string
          dias_follow_up?: number | null
          id?: string
          lead_id: string
          notas?: string | null
          proxima_acao?: string | null
          resultado?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          arquivado?: boolean | null
          closer_id?: string
          created_at?: string | null
          data_arquivamento?: string | null
          data_hora_agendada?: string
          dias_follow_up?: number | null
          id?: string
          lead_id?: string
          notas?: string | null
          proxima_acao?: string | null
          resultado?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calls_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          account_id: string
          created_at: string
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      etapas_funil: {
        Row: {
          account_id: string
          ativo: boolean | null
          cor: string | null
          created_at: string | null
          id: string
          nome: string
          ordem: number
          prazo_alerta_dias: number | null
          tipo_etapa: string | null
        }
        Insert: {
          account_id: string
          ativo?: boolean | null
          cor?: string | null
          created_at?: string | null
          id?: string
          nome: string
          ordem: number
          prazo_alerta_dias?: number | null
          tipo_etapa?: string | null
        }
        Update: {
          account_id?: string
          ativo?: boolean | null
          cor?: string | null
          created_at?: string | null
          id?: string
          nome?: string
          ordem?: number
          prazo_alerta_dias?: number | null
          tipo_etapa?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "etapas_funil_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      form_responses: {
        Row: {
          account_id: string
          answers: Json
          created_at: string
          form_id: string
          id: string
          lead_id: string | null
          mapped_data: Json | null
          metadata: Json | null
        }
        Insert: {
          account_id: string
          answers?: Json
          created_at?: string
          form_id: string
          id?: string
          lead_id?: string | null
          mapped_data?: Json | null
          metadata?: Json | null
        }
        Update: {
          account_id?: string
          answers?: Json
          created_at?: string
          form_id?: string
          id?: string
          lead_id?: string | null
          mapped_data?: Json | null
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "form_responses_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_responses_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      forms: {
        Row: {
          account_id: string
          active: boolean
          background_image: string | null
          created_at: string
          field_mappings: Json | null
          id: string
          lead_qualification: Json | null
          logo: Json | null
          questions: Json
          slug: string
          submissions_count: number
          thank_you_screen: Json
          theme: Json
          title: string
          updated_at: string
          views_count: number
          welcome_screen: Json | null
        }
        Insert: {
          account_id: string
          active?: boolean
          background_image?: string | null
          created_at?: string
          field_mappings?: Json | null
          id?: string
          lead_qualification?: Json | null
          logo?: Json | null
          questions?: Json
          slug: string
          submissions_count?: number
          thank_you_screen?: Json
          theme?: Json
          title?: string
          updated_at?: string
          views_count?: number
          welcome_screen?: Json | null
        }
        Update: {
          account_id?: string
          active?: boolean
          background_image?: string | null
          created_at?: string
          field_mappings?: Json | null
          id?: string
          lead_qualification?: Json | null
          logo?: Json | null
          questions?: Json
          slug?: string
          submissions_count?: number
          thank_you_screen?: Json
          theme?: Json
          title?: string
          updated_at?: string
          views_count?: number
          welcome_screen?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "forms_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      impersonate_sessions: {
        Row: {
          account_id: string
          created_at: string | null
          ended_at: string | null
          id: string
          super_admin_id: string
          target_user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string | null
          ended_at?: string | null
          id?: string
          super_admin_id: string
          target_user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string | null
          ended_at?: string | null
          id?: string
          super_admin_id?: string
          target_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "impersonate_sessions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          account_id: string
          arquivado: boolean | null
          closer_id: string | null
          contador_followups: number | null
          contatado: boolean | null
          created_at: string | null
          data_agendamento_call: string | null
          data_arquivamento: string | null
          data_contato: string | null
          data_envio_proposta: string | null
          data_marcacao_mql: string | null
          dificuldades: string | null
          email: string | null
          etapa_id: string | null
          fonte_trafego: string | null
          id: string
          investimento_disponivel: number | null
          is_mql: boolean | null
          nome: string
          observacoes_sdr: string | null
          produto_id: string | null
          renda_mensal: number | null
          sdr_id: string | null
          status_call: Database["public"]["Enums"]["status_call"] | null
          telefone: string
          ultima_movimentacao: string | null
          updated_at: string | null
          valor_proposta: number | null
        }
        Insert: {
          account_id: string
          arquivado?: boolean | null
          closer_id?: string | null
          contador_followups?: number | null
          contatado?: boolean | null
          created_at?: string | null
          data_agendamento_call?: string | null
          data_arquivamento?: string | null
          data_contato?: string | null
          data_envio_proposta?: string | null
          data_marcacao_mql?: string | null
          dificuldades?: string | null
          email?: string | null
          etapa_id?: string | null
          fonte_trafego?: string | null
          id?: string
          investimento_disponivel?: number | null
          is_mql?: boolean | null
          nome: string
          observacoes_sdr?: string | null
          produto_id?: string | null
          renda_mensal?: number | null
          sdr_id?: string | null
          status_call?: Database["public"]["Enums"]["status_call"] | null
          telefone: string
          ultima_movimentacao?: string | null
          updated_at?: string | null
          valor_proposta?: number | null
        }
        Update: {
          account_id?: string
          arquivado?: boolean | null
          closer_id?: string | null
          contador_followups?: number | null
          contatado?: boolean | null
          created_at?: string | null
          data_agendamento_call?: string | null
          data_arquivamento?: string | null
          data_contato?: string | null
          data_envio_proposta?: string | null
          data_marcacao_mql?: string | null
          dificuldades?: string | null
          email?: string | null
          etapa_id?: string | null
          fonte_trafego?: string | null
          id?: string
          investimento_disponivel?: number | null
          is_mql?: boolean | null
          nome?: string
          observacoes_sdr?: string | null
          produto_id?: string | null
          renda_mensal?: number | null
          sdr_id?: string | null
          status_call?: Database["public"]["Enums"]["status_call"] | null
          telefone?: string
          ultima_movimentacao?: string | null
          updated_at?: string | null
          valor_proposta?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "etapas_funil"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      lembretes: {
        Row: {
          concluido: boolean | null
          created_at: string | null
          data_lembrete: string
          descricao: string
          id: string
          lead_id: string
          user_id: string
        }
        Insert: {
          concluido?: boolean | null
          created_at?: string | null
          data_lembrete: string
          descricao: string
          id?: string
          lead_id: string
          user_id: string
        }
        Update: {
          concluido?: boolean | null
          created_at?: string | null
          data_lembrete?: string
          descricao?: string
          id?: string
          lead_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lembretes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lembretes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      login_history: {
        Row: {
          device_info: Json | null
          email: string
          failure_reason: string | null
          id: string
          ip_address: string | null
          location_info: Json | null
          login_time: string
          success: boolean
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          device_info?: Json | null
          email: string
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          location_info?: Json | null
          login_time?: string
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          device_info?: Json | null
          email?: string
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          location_info?: Json | null
          login_time?: string
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean
          sender_id: string
          sender_role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id: string
          sender_role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id?: string
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      metas: {
        Row: {
          account_id: string
          ano: number
          ativo: boolean | null
          created_at: string | null
          dias_trabalho: number[]
          end_date: string | null
          id: string
          mes: number
          nome: string
          start_date: string | null
          updated_at: string | null
          valor_mensal: number
        }
        Insert: {
          account_id: string
          ano: number
          ativo?: boolean | null
          created_at?: string | null
          dias_trabalho?: number[]
          end_date?: string | null
          id?: string
          mes: number
          nome: string
          start_date?: string | null
          updated_at?: string | null
          valor_mensal: number
        }
        Update: {
          account_id?: string
          ano?: number
          ativo?: boolean | null
          created_at?: string | null
          dias_trabalho?: number[]
          end_date?: string | null
          id?: string
          mes?: number
          nome?: string
          start_date?: string | null
          updated_at?: string | null
          valor_mensal?: number
        }
        Relationships: [
          {
            foreignKeyName: "metas_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          display_name: string
          features: Json | null
          has_export: boolean | null
          has_priority_support: boolean | null
          history_days: number
          id: string
          is_popular: boolean | null
          max_leads: number
          max_users: number
          name: string
          price_monthly: number
          price_yearly: number
          stripe_price_id_monthly: string | null
          stripe_price_id_yearly: string | null
          stripe_product_id: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          display_name: string
          features?: Json | null
          has_export?: boolean | null
          has_priority_support?: boolean | null
          history_days?: number
          id?: string
          is_popular?: boolean | null
          max_leads?: number
          max_users?: number
          name: string
          price_monthly?: number
          price_yearly?: number
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          stripe_product_id?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          display_name?: string
          features?: Json | null
          has_export?: boolean | null
          has_priority_support?: boolean | null
          history_days?: number
          id?: string
          is_popular?: boolean | null
          max_leads?: number
          max_users?: number
          name?: string
          price_monthly?: number
          price_yearly?: number
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          stripe_product_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      produtos: {
        Row: {
          account_id: string
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          valor_padrao: number
        }
        Insert: {
          account_id: string
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          valor_padrao: number
        }
        Update: {
          account_id?: string
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          valor_padrao?: number
        }
        Relationships: [
          {
            foreignKeyName: "produtos_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_id: string
          company_name: string | null
          created_at: string | null
          email: string
          foto_url: string | null
          funcao: Database["public"]["Enums"]["app_role"]
          id: string
          main_challenge: string | null
          main_goal: string | null
          monthly_revenue: string | null
          niche: string | null
          nome: string
          team_size: string | null
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          company_name?: string | null
          created_at?: string | null
          email: string
          foto_url?: string | null
          funcao?: Database["public"]["Enums"]["app_role"]
          id: string
          main_challenge?: string | null
          main_goal?: string | null
          monthly_revenue?: string | null
          niche?: string | null
          nome: string
          team_size?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          company_name?: string | null
          created_at?: string | null
          email?: string
          foto_url?: string | null
          funcao?: Database["public"]["Enums"]["app_role"]
          id?: string
          main_challenge?: string | null
          main_goal?: string | null
          monthly_revenue?: string | null
          niche?: string | null
          nome?: string
          team_size?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_webhooks: {
        Row: {
          created_at: string | null
          error: string | null
          event_type: string
          id: string
          payload: Json
          processed: boolean | null
          processed_at: string | null
          stripe_event_id: string
        }
        Insert: {
          created_at?: string | null
          error?: string | null
          event_type: string
          id?: string
          payload: Json
          processed?: boolean | null
          processed_at?: string | null
          stripe_event_id: string
        }
        Update: {
          created_at?: string | null
          error?: string | null
          event_type?: string
          id?: string
          payload?: Json
          processed?: boolean | null
          processed_at?: string | null
          stripe_event_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          account_id: string
          billing_cycle: string
          canceled_at: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          custom_max_leads: number | null
          custom_max_users: number | null
          ended_at: string | null
          id: string
          is_lifetime: boolean | null
          plan_id: string
          status: string
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          trial_end: string | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          billing_cycle?: string
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          custom_max_leads?: number | null
          custom_max_users?: number | null
          ended_at?: string | null
          id?: string
          is_lifetime?: boolean | null
          plan_id: string
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          billing_cycle?: string
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          custom_max_leads?: number | null
          custom_max_users?: number | null
          ended_at?: string | null
          id?: string
          is_lifetime?: boolean | null
          plan_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      team_member_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          team_member_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          team_member_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_member_roles_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          account_id: string
          created_at: string | null
          id: string
          nome: string
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          created_at?: string | null
          id?: string
          nome: string
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      two_factor_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          user_id: string
          verified: boolean
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          id?: string
          user_id: string
          verified?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: []
      }
      usage_tracking: {
        Row: {
          account_id: string
          created_at: string | null
          current_leads_count: number | null
          current_users_count: number | null
          id: string
          last_reset_at: string | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          created_at?: string | null
          current_leads_count?: number | null
          current_users_count?: number | null
          id?: string
          last_reset_at?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string | null
          current_leads_count?: number | null
          current_users_count?: number | null
          id?: string
          last_reset_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_tracking_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendas: {
        Row: {
          account_id: string
          closer_id: string
          created_at: string | null
          data_fechamento: string
          data_reembolso: string | null
          id: string
          lead_id: string
          metodo_pagamento: Database["public"]["Enums"]["metodo_pagamento"]
          motivo_reembolso: string | null
          observacao: string | null
          produto_id: string
          reembolsada: boolean
          valor_final: number
        }
        Insert: {
          account_id: string
          closer_id: string
          created_at?: string | null
          data_fechamento?: string
          data_reembolso?: string | null
          id?: string
          lead_id: string
          metodo_pagamento: Database["public"]["Enums"]["metodo_pagamento"]
          motivo_reembolso?: string | null
          observacao?: string | null
          produto_id: string
          reembolsada?: boolean
          valor_final: number
        }
        Update: {
          account_id?: string
          closer_id?: string
          created_at?: string | null
          data_fechamento?: string
          data_reembolso?: string | null
          id?: string
          lead_id?: string
          metodo_pagamento?: Database["public"]["Enums"]["metodo_pagamento"]
          motivo_reembolso?: string | null
          observacao?: string | null
          produto_id?: string
          reembolsada?: boolean
          valor_final?: number
        }
        Relationships: [
          {
            foreignKeyName: "vendas_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_health_score: {
        Args: { p_account_id: string }
        Returns: number
      }
      can_add_lead: { Args: { p_account_id: string }; Returns: boolean }
      can_add_user: { Args: { p_account_id: string }; Returns: boolean }
      cleanup_expired_2fa_codes: { Args: never; Returns: undefined }
      create_lead_from_form: {
        Args: {
          p_account_id: string
          p_dificuldades?: string
          p_email?: string
          p_fonte_trafego?: string
          p_form_id: string
          p_investimento_disponivel?: number
          p_nome: string
          p_renda_mensal?: number
          p_telefone: string
        }
        Returns: string
      }
      get_account_plan: { Args: { p_account_id: string }; Returns: Json }
      get_accounts_with_stats: {
        Args: never
        Returns: {
          ativo: boolean
          created_at: string
          id: string
          nome_empresa: string
          num_leads: number
          num_users: number
          owner_email: string
          owner_name: string
          plano: string
          total_revenue: number
        }[]
      }
      get_active_users_over_time: {
        Args: { end_date: string; granularity?: string; start_date: string }
        Returns: {
          active_users: number
          period_label: string
          period_start: string
        }[]
      }
      get_active_vs_inactive_users: {
        Args: { end_date: string; start_date: string }
        Returns: Json
      }
      get_feature_adoption_stats: { Args: never; Returns: Json }
      get_growth_metrics: { Args: never; Returns: Json }
      get_niche_comparison: {
        Args: never
        Returns: {
          avg_conversion_rate: number
          avg_ticket: number
          niche: string
          num_accounts: number
          total_revenue: number
          total_sales: number
        }[]
      }
      get_platform_stats: { Args: never; Returns: Json }
      get_platform_stats_over_time: {
        Args: { end_date: string; granularity?: string; start_date: string }
        Returns: {
          new_accounts: number
          new_leads: number
          new_users: number
          period_end: string
          period_revenue: number
          period_start: string
          total_accounts: number
          total_leads: number
          total_revenue: number
          total_users: number
        }[]
      }
      get_revenue_ranking: {
        Args: { end_date?: string; start_date?: string }
        Returns: {
          account_name: string
          attended_calls: number
          conversion_rate: number
          foto_url: string
          rank_position: number
          show_rate: number
          total_calls: number
          total_leads: number
          total_revenue: number
          total_sales: number
          user_email: string
          user_id: string
          user_name: string
        }[]
      }
      get_support_conversations: {
        Args: never
        Returns: {
          account_id: string
          created_at: string
          id: string
          nome_empresa: string
          owner_email: string
          owner_nome: string
          status: string
          updated_at: string
        }[]
      }
      get_top_active_users: {
        Args: { end_date: string; limit_count?: number; start_date: string }
        Returns: {
          account_name: string
          calls_count: number
          last_activity: string
          leads_created: number
          leads_updated: number
          sales_count: number
          total_activities: number
          user_email: string
          user_id: string
          user_name: string
        }[]
      }
      get_user_account_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_form_views: { Args: { form_slug: string }; Returns: undefined }
      log_activity: {
        Args: {
          p_account_id: string
          p_action_type: string
          p_details?: Json
          p_user_id: string
        }
        Returns: string
      }
      update_all_health_scores: { Args: never; Returns: Json }
      update_user_roles: {
        Args: {
          new_roles: Database["public"]["Enums"]["app_role"][]
          target_user_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "sdr" | "closer" | "super_admin"
      metodo_pagamento: "pix" | "cartao" | "boleto" | "transferencia"
      status_call: "agendada" | "compareceu" | "no_show" | "remarcada"
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
  public: {
    Enums: {
      app_role: ["admin", "sdr", "closer", "super_admin"],
      metodo_pagamento: ["pix", "cartao", "boleto", "transferencia"],
      status_call: ["agendada", "compareceu", "no_show", "remarcada"],
    },
  },
} as const
