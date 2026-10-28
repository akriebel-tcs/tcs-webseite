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
  public: {
    Tables: {
      cms_admin_editable_fields: {
        Row: {
          created_at: string
          field_key: string
          id: string
          is_enabled: boolean
          locale: string
          page_key: string
          section_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          field_key: string
          id?: string
          is_enabled?: boolean
          locale: string
          page_key: string
          section_key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          field_key?: string
          id?: string
          is_enabled?: boolean
          locale?: string
          page_key?: string
          section_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      cms_asset_translations: {
        Row: {
          alt_text: string | null
          asset_id: string
          created_at: string
          id: string
          locale: string
          updated_at: string
        }
        Insert: {
          alt_text?: string | null
          asset_id: string
          created_at?: string
          id?: string
          locale: string
          updated_at?: string
        }
        Update: {
          alt_text?: string | null
          asset_id?: string
          created_at?: string
          id?: string
          locale?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cms_asset_translations_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "cms_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cms_asset_translations_locale_fkey"
            columns: ["locale"]
            isOneToOne: false
            referencedRelation: "cms_locales"
            referencedColumns: ["locale"]
          },
        ]
      }
      cms_assets: {
        Row: {
          alt_de: string | null
          alt_en: string | null
          alt_pl: string | null
          alt_text_de: string | null
          alt_text_en: string | null
          alt_text_pl: string | null
          asset_no: number
          asset_role: string
          created_at: string
          field_key: string | null
          file_name: string | null
          focal_x: number | null
          focal_y: number | null
          id: string
          is_active: boolean
          locale: string | null
          mime_type: string | null
          page_key: string
          public_url: string | null
          section_key: string
          sort_order: number
          storage_path: string
          updated_at: string
          viewport: string
        }
        Insert: {
          alt_de?: string | null
          alt_en?: string | null
          alt_pl?: string | null
          alt_text_de?: string | null
          alt_text_en?: string | null
          alt_text_pl?: string | null
          asset_no?: number
          asset_role: string
          created_at?: string
          field_key?: string | null
          file_name?: string | null
          focal_x?: number | null
          focal_y?: number | null
          id?: string
          is_active?: boolean
          locale?: string | null
          mime_type?: string | null
          page_key: string
          public_url?: string | null
          section_key: string
          sort_order?: number
          storage_path: string
          updated_at?: string
          viewport?: string
        }
        Update: {
          alt_de?: string | null
          alt_en?: string | null
          alt_pl?: string | null
          alt_text_de?: string | null
          alt_text_en?: string | null
          alt_text_pl?: string | null
          asset_no?: number
          asset_role?: string
          created_at?: string
          field_key?: string | null
          file_name?: string | null
          focal_x?: number | null
          focal_y?: number | null
          id?: string
          is_active?: boolean
          locale?: string | null
          mime_type?: string | null
          page_key?: string
          public_url?: string | null
          section_key?: string
          sort_order?: number
          storage_path?: string
          updated_at?: string
          viewport?: string
        }
        Relationships: []
      }
      cms_locale_translation_config: {
        Row: {
          locale: string
          model: string
          provider: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          locale: string
          model: string
          provider: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          locale?: string
          model?: string
          provider?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cms_locale_translation_config_locale_fkey"
            columns: ["locale"]
            isOneToOne: true
            referencedRelation: "cms_locales"
            referencedColumns: ["locale"]
          },
        ]
      }
      cms_locale_visibility_audit: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          is_public: boolean
          locale: string
          reason: string | null
          was_active: boolean | null
          was_public: boolean | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active: boolean
          is_public: boolean
          locale: string
          reason?: string | null
          was_active?: boolean | null
          was_public?: boolean | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_public?: boolean
          locale?: string
          reason?: string | null
          was_active?: boolean | null
          was_public?: boolean | null
        }
        Relationships: []
      }
      cms_locales: {
        Row: {
          created_at: string
          deepl_supported: boolean
          fallback_locale: string | null
          is_active: boolean
          is_public: boolean
          is_source: boolean
          label_de: string
          label_native: string
          locale: string
          notes: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          deepl_supported?: boolean
          fallback_locale?: string | null
          is_active?: boolean
          is_public?: boolean
          is_source?: boolean
          label_de: string
          label_native: string
          locale: string
          notes?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          deepl_supported?: boolean
          fallback_locale?: string | null
          is_active?: boolean
          is_public?: boolean
          is_source?: boolean
          label_de?: string
          label_native?: string
          locale?: string
          notes?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      cms_navigation_node_translations: {
        Row: {
          created_at: string
          description: string | null
          id: string
          label: string | null
          locale: string
          node_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          label?: string | null
          locale: string
          node_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          label?: string | null
          locale?: string
          node_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cms_navigation_node_translations_locale_fkey"
            columns: ["locale"]
            isOneToOne: false
            referencedRelation: "cms_locales"
            referencedColumns: ["locale"]
          },
          {
            foreignKeyName: "cms_navigation_node_translations_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "cms_navigation_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_navigation_nodes: {
        Row: {
          created_at: string
          description_de: string | null
          description_en: string | null
          description_pl: string | null
          external_url: string | null
          id: string
          is_active: boolean
          label: string | null
          label_de: string | null
          label_en: string | null
          label_pl: string | null
          nav_area: string
          node_key: string
          node_no: number
          node_type: string
          page_key: string | null
          parent_id: string | null
          route_path: string | null
          show_in_public_nav: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description_de?: string | null
          description_en?: string | null
          description_pl?: string | null
          external_url?: string | null
          id?: string
          is_active?: boolean
          label?: string | null
          label_de?: string | null
          label_en?: string | null
          label_pl?: string | null
          nav_area: string
          node_key: string
          node_no?: number
          node_type?: string
          page_key?: string | null
          parent_id?: string | null
          route_path?: string | null
          show_in_public_nav?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description_de?: string | null
          description_en?: string | null
          description_pl?: string | null
          external_url?: string | null
          id?: string
          is_active?: boolean
          label?: string | null
          label_de?: string | null
          label_en?: string | null
          label_pl?: string | null
          nav_area?: string
          node_key?: string
          node_no?: number
          node_type?: string
          page_key?: string | null
          parent_id?: string | null
          route_path?: string | null
          show_in_public_nav?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cms_navigation_nodes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "cms_navigation_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_page_completion: {
        Row: {
          created_at: string
          hours: number | null
          id: string
          page_key: string | null
          route_path: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          hours?: number | null
          id?: string
          page_key?: string | null
          route_path: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          hours?: number | null
          id?: string
          page_key?: string | null
          route_path?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      cms_page_translations: {
        Row: {
          created_at: string
          id: string
          locale: string
          page_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          locale: string
          page_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          locale?: string
          page_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cms_page_translations_locale_fkey"
            columns: ["locale"]
            isOneToOne: false
            referencedRelation: "cms_locales"
            referencedColumns: ["locale"]
          },
          {
            foreignKeyName: "cms_page_translations_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "cms_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_pages: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          page_key: string
          page_no: number
          page_type: string
          route_path: string | null
          status: string
          title_de: string | null
          title_en: string | null
          title_pl: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          page_key: string
          page_no?: number
          page_type: string
          route_path?: string | null
          status?: string
          title_de?: string | null
          title_en?: string | null
          title_pl?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          page_key?: string
          page_no?: number
          page_type?: string
          route_path?: string | null
          status?: string
          title_de?: string | null
          title_en?: string | null
          title_pl?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cms_provider_credential_audit: {
        Row: {
          action: string
          actor: string | null
          created_at: string
          detail: string | null
          id: string
          provider: string
          result: string | null
        }
        Insert: {
          action: string
          actor?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          provider: string
          result?: string | null
        }
        Update: {
          action?: string
          actor?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          provider?: string
          result?: string | null
        }
        Relationships: []
      }
      cms_provider_credentials: {
        Row: {
          last_test_at: string | null
          last_test_error: string | null
          last_test_ok: boolean | null
          last4: string | null
          provider: string
          updated_at: string
          updated_by: string | null
          vault_secret_name: string
        }
        Insert: {
          last_test_at?: string | null
          last_test_error?: string | null
          last_test_ok?: boolean | null
          last4?: string | null
          provider: string
          updated_at?: string
          updated_by?: string | null
          vault_secret_name: string
        }
        Update: {
          last_test_at?: string | null
          last_test_error?: string | null
          last_test_ok?: boolean | null
          last4?: string | null
          provider?: string
          updated_at?: string
          updated_by?: string | null
          vault_secret_name?: string
        }
        Relationships: []
      }
      cms_section_fields: {
        Row: {
          created_at: string
          field_key: string
          id: string
          locale: string
          page_key: string
          review_status: string
          section_key: string
          source_hash: string | null
          updated_at: string
          value: string | null
          value_json: Json | null
        }
        Insert: {
          created_at?: string
          field_key: string
          id?: string
          locale: string
          page_key: string
          review_status?: string
          section_key: string
          source_hash?: string | null
          updated_at?: string
          value?: string | null
          value_json?: Json | null
        }
        Update: {
          created_at?: string
          field_key?: string
          id?: string
          locale?: string
          page_key?: string
          review_status?: string
          section_key?: string
          source_hash?: string | null
          updated_at?: string
          value?: string | null
          value_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "cms_section_fields_section_fkey"
            columns: ["page_key", "section_key"]
            isOneToOne: false
            referencedRelation: "cms_sections"
            referencedColumns: ["page_key", "section_key"]
          },
        ]
      }
      cms_sections: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          page_key: string
          parent_section_id: string | null
          section_key: string
          section_no: number | null
          section_type: string
          section_uid: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          page_key: string
          parent_section_id?: string | null
          section_key: string
          section_no?: number | null
          section_type: string
          section_uid?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          page_key?: string
          parent_section_id?: string | null
          section_key?: string
          section_no?: number | null
          section_type?: string
          section_uid?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cms_sections_page_key_fkey"
            columns: ["page_key"]
            isOneToOne: false
            referencedRelation: "cms_pages"
            referencedColumns: ["page_key"]
          },
          {
            foreignKeyName: "cms_sections_parent_section_id_fkey"
            columns: ["parent_section_id"]
            isOneToOne: false
            referencedRelation: "cms_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_translation_autopilot: {
        Row: {
          created_at: string
          debounce_seconds: number
          is_enabled: boolean
          is_paused: boolean
          notes: string | null
          singleton: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          debounce_seconds?: number
          is_enabled?: boolean
          is_paused?: boolean
          notes?: string | null
          singleton?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          debounce_seconds?: number
          is_enabled?: boolean
          is_paused?: boolean
          notes?: string | null
          singleton?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      cms_translation_coverage_cache: {
        Row: {
          cache_key: string
          compute_ms: number
          computed_at: string
          is_stale: boolean
          payload: Json
          updated_at: string
        }
        Insert: {
          cache_key: string
          compute_ms?: number
          computed_at?: string
          is_stale?: boolean
          payload: Json
          updated_at?: string
        }
        Update: {
          cache_key?: string
          compute_ms?: number
          computed_at?: string
          is_stale?: boolean
          payload?: Json
          updated_at?: string
        }
        Relationships: []
      }
      cms_translation_coverage_locale_cache: {
        Row: {
          compute_ms: number
          computed_at: string
          is_stale: boolean
          locale: string
          payload: Json
          updated_at: string
        }
        Insert: {
          compute_ms?: number
          computed_at?: string
          is_stale?: boolean
          locale: string
          payload: Json
          updated_at?: string
        }
        Update: {
          compute_ms?: number
          computed_at?: string
          is_stale?: boolean
          locale?: string
          payload?: Json
          updated_at?: string
        }
        Relationships: []
      }
      cms_translation_jobs: {
        Row: {
          area: string
          attempts: number
          batch_id: string
          created_at: string
          field_key: string
          id: string
          last_error: string | null
          page_key: string
          ref_id: string | null
          run_id: string | null
          scheduled_at: string
          section_key: string
          source_hash: string
          source_text: string | null
          status: string
          target_locale: string
          unit_key: string | null
          updated_at: string
        }
        Insert: {
          area?: string
          attempts?: number
          batch_id: string
          created_at?: string
          field_key: string
          id?: string
          last_error?: string | null
          page_key: string
          ref_id?: string | null
          run_id?: string | null
          scheduled_at?: string
          section_key: string
          source_hash: string
          source_text?: string | null
          status?: string
          target_locale: string
          unit_key?: string | null
          updated_at?: string
        }
        Update: {
          area?: string
          attempts?: number
          batch_id?: string
          created_at?: string
          field_key?: string
          id?: string
          last_error?: string | null
          page_key?: string
          ref_id?: string | null
          run_id?: string | null
          scheduled_at?: string
          section_key?: string
          source_hash?: string
          source_text?: string | null
          status?: string
          target_locale?: string
          unit_key?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cms_translation_memory: {
        Row: {
          attempts: number
          created_at: string
          id: string
          last_error: string | null
          model: string | null
          origin: string
          provider: string | null
          source_hash: string
          source_locale: string
          source_text: string
          status: string
          target_locale: string
          target_text: string | null
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          model?: string | null
          origin?: string
          provider?: string | null
          source_hash: string
          source_locale?: string
          source_text: string
          status?: string
          target_locale: string
          target_text?: string | null
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          model?: string | null
          origin?: string
          provider?: string | null
          source_hash?: string
          source_locale?: string
          source_text?: string
          status?: string
          target_locale?: string
          target_text?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cms_translation_provider_rates: {
        Row: {
          basis_note: string | null
          cost_per_1k_source_chars: number
          created_at: string
          currency: string
          id: string
          is_default: boolean
          is_enabled: boolean
          label: string
          model: string
          provider: string
          requires_secret: string | null
          updated_at: string
        }
        Insert: {
          basis_note?: string | null
          cost_per_1k_source_chars?: number
          created_at?: string
          currency?: string
          id?: string
          is_default?: boolean
          is_enabled?: boolean
          label: string
          model: string
          provider: string
          requires_secret?: string | null
          updated_at?: string
        }
        Update: {
          basis_note?: string | null
          cost_per_1k_source_chars?: number
          created_at?: string
          currency?: string
          id?: string
          is_default?: boolean
          is_enabled?: boolean
          label?: string
          model?: string
          provider?: string
          requires_secret?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cms_translation_runs: {
        Row: {
          batches_done: number
          chars_source: number
          cost_estimate: number
          cost_limit: number | null
          created_at: string
          cursor_field_key: string | null
          cursor_page_key: string | null
          cursor_section_key: string | null
          dry_run: Json | null
          fields_done: number
          fields_failed: number
          fields_planned: number
          fields_skipped: number
          finished_at: string | null
          id: string
          last_error: string | null
          lease_owner: string | null
          lease_until: string | null
          limits: Json | null
          memory_hits: number
          model: string
          model_calls: number
          page_keys: string[]
          provider: string
          scope_kind: string
          scope_signature: string
          source_locale: string
          started_at: string | null
          status: string
          target_locale: string
          updated_at: string
          worker_armed: boolean
          worker_last_seen: string | null
        }
        Insert: {
          batches_done?: number
          chars_source?: number
          cost_estimate?: number
          cost_limit?: number | null
          created_at?: string
          cursor_field_key?: string | null
          cursor_page_key?: string | null
          cursor_section_key?: string | null
          dry_run?: Json | null
          fields_done?: number
          fields_failed?: number
          fields_planned?: number
          fields_skipped?: number
          finished_at?: string | null
          id?: string
          last_error?: string | null
          lease_owner?: string | null
          lease_until?: string | null
          limits?: Json | null
          memory_hits?: number
          model?: string
          model_calls?: number
          page_keys?: string[]
          provider?: string
          scope_kind: string
          scope_signature: string
          source_locale?: string
          started_at?: string | null
          status?: string
          target_locale: string
          updated_at?: string
          worker_armed?: boolean
          worker_last_seen?: string | null
        }
        Update: {
          batches_done?: number
          chars_source?: number
          cost_estimate?: number
          cost_limit?: number | null
          created_at?: string
          cursor_field_key?: string | null
          cursor_page_key?: string | null
          cursor_section_key?: string | null
          dry_run?: Json | null
          fields_done?: number
          fields_failed?: number
          fields_planned?: number
          fields_skipped?: number
          finished_at?: string | null
          id?: string
          last_error?: string | null
          lease_owner?: string | null
          lease_until?: string | null
          limits?: Json | null
          memory_hits?: number
          model?: string
          model_calls?: number
          page_keys?: string[]
          provider?: string
          scope_kind?: string
          scope_signature?: string
          source_locale?: string
          started_at?: string | null
          status?: string
          target_locale?: string
          updated_at?: string
          worker_armed?: boolean
          worker_last_seen?: string | null
        }
        Relationships: []
      }
      cms_translation_unit_state: {
        Row: {
          area: string
          created_at: string
          id: string
          locale: string
          ref_key: string
          review_status: string
          source_hash: string | null
          unit_key: string
          updated_at: string
        }
        Insert: {
          area: string
          created_at?: string
          id?: string
          locale: string
          ref_key: string
          review_status?: string
          source_hash?: string | null
          unit_key: string
          updated_at?: string
        }
        Update: {
          area?: string
          created_at?: string
          id?: string
          locale?: string
          ref_key?: string
          review_status?: string
          source_hash?: string | null
          unit_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      cms_ui_string_translations: {
        Row: {
          created_at: string
          id: string
          locale: string
          ui_string_id: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          locale: string
          ui_string_id: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          locale?: string
          ui_string_id?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cms_ui_string_translations_locale_fkey"
            columns: ["locale"]
            isOneToOne: false
            referencedRelation: "cms_locales"
            referencedColumns: ["locale"]
          },
          {
            foreignKeyName: "cms_ui_string_translations_ui_string_id_fkey"
            columns: ["ui_string_id"]
            isOneToOne: false
            referencedRelation: "cms_ui_strings"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_ui_strings: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          manifest_version: string | null
          namespace: string
          notes: string | null
          source_hash: string
          source_text: string
          string_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          manifest_version?: string | null
          namespace: string
          notes?: string | null
          source_hash: string
          source_text: string
          string_key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          manifest_version?: string | null
          namespace?: string
          notes?: string | null
          source_hash?: string
          source_text?: string
          string_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cms_autopilot_enqueue_unit: {
        Args: {
          p_area: string
          p_page_key: string
          p_ref_id: string
          p_section_key: string
          p_source_text: string
          p_unit_key: string
        }
        Returns: undefined
      }
      cms_autopilot_ensure_run: { Args: { p_locale: string }; Returns: string }
      cms_field_is_translatable: {
        Args: { p_field_key: string }
        Returns: boolean
      }
      cms_locale_is_known: { Args: { p_locale: string }; Returns: boolean }
      cms_page_is_public: { Args: { _page_key: string }; Returns: boolean }
      cms_renumber_sections: {
        Args: { p_page_key: string }
        Returns: undefined
      }
      cms_resequence_sections_dfs: {
        Args: { p_page_key: string }
        Returns: undefined
      }
      cms_section_renderability: {
        Args: { p_page_key: string; p_section_key: string }
        Returns: Json
      }
      cms_text_is_translatable: { Args: { p_value: string }; Returns: boolean }
      cms_translatable_source_fields: {
        Args: never
        Returns: {
          field_key: string
          page_key: string
          section_key: string
        }[]
      }
      cms_translation_hash: { Args: { p_text: string }; Returns: string }
      cms_translation_normalize: { Args: { p_text: string }; Returns: string }
      cms_translation_units: {
        Args: {
          p_areas?: string[]
          p_page_keys?: string[]
          p_target_locale: string
        }
        Returns: {
          area: string
          is_todo: boolean
          label: string
          page_key: string
          ref_id: string
          ref_key: string
          section_key: string
          sort_a: string
          sort_b: string
          sort_c: string
          source_hash: string
          source_text: string
          target_hash: string
          target_status: string
          target_value: string
          unit_key: string
          whitelisted: boolean
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      rpc_admin_archive_navigation_node: {
        Args: { p_node_id: string }
        Returns: Json
      }
      rpc_admin_archive_page: { Args: { p_page_key: string }; Returns: Json }
      rpc_admin_create_navigation_node: {
        Args: {
          p_external_url?: string
          p_label_de: string
          p_label_en: string
          p_nav_area: string
          p_node_key: string
          p_node_type?: string
          p_page_key: string
          p_parent_node_key: string
          p_route_path?: string
        }
        Returns: Json
      }
      rpc_admin_delete_asset: { Args: { p_asset_id: string }; Returns: Json }
      rpc_admin_delete_navigation_node: {
        Args: { p_node_id: string }
        Returns: Json
      }
      rpc_admin_delete_page: { Args: { p_page_key: string }; Returns: Json }
      rpc_admin_delete_section: {
        Args: { p_page_key: string; p_section_key: string }
        Returns: Json
      }
      rpc_admin_duplicate_page: {
        Args: {
          p_nav_area?: string
          p_nav_node_key?: string
          p_nav_parent_node_key?: string
          p_new_page_key: string
          p_new_route_path: string
          p_source_page_key: string
        }
        Returns: Json
      }
      rpc_admin_duplicate_section: {
        Args: {
          p_new_section_key: string
          p_page_key: string
          p_source_section_key: string
        }
        Returns: Json
      }
      rpc_admin_export_contract_drift: { Args: never; Returns: Json }
      rpc_admin_list_translation_units: {
        Args: {
          p_areas?: string[]
          p_limit?: number
          p_offset?: number
          p_page_key?: string
          p_search?: string
          p_status?: string
          p_target_locale: string
        }
        Returns: Json
      }
      rpc_admin_locale_release_readiness: {
        Args: { p_locale: string }
        Returns: Json
      }
      rpc_admin_move_navigation_node: {
        Args: {
          p_new_parent_id: string
          p_new_sort_order: number
          p_node_id: string
        }
        Returns: Json
      }
      rpc_admin_paste_section: {
        Args: {
          p_new_section_key: string
          p_source_page_key: string
          p_source_section_key: string
          p_target_page_key: string
          p_target_parent_section_key: string
          p_target_position: number
        }
        Returns: Json
      }
      rpc_admin_read_assets: { Args: { p_page_key: string }; Returns: Json }
      rpc_admin_read_assets_overview: { Args: never; Returns: Json }
      rpc_admin_read_navigation_nodes: { Args: never; Returns: Json }
      rpc_admin_read_page_sections: {
        Args: { p_page_key: string }
        Returns: Json
      }
      rpc_admin_read_pages_with_nav: { Args: never; Returns: Json }
      rpc_admin_read_pilot_pflege: {
        Args: { p_page_key?: string }
        Returns: Json
      }
      rpc_admin_rename_page_key: {
        Args: { p_new_page_key: string; p_old_page_key: string }
        Returns: Json
      }
      rpc_admin_rename_section_key: {
        Args: {
          p_new_section_key: string
          p_old_section_key: string
          p_page_key: string
        }
        Returns: Json
      }
      rpc_admin_reorder_section: {
        Args: { p_direction: string; p_page_key: string; p_section_key: string }
        Returns: Json
      }
      rpc_admin_resolve_asset_no: {
        Args: { p_asset_no: number }
        Returns: Json
      }
      rpc_admin_resolve_node_no: { Args: { p_node_no: number }; Returns: Json }
      rpc_admin_resolve_page_no: { Args: { p_page_no: number }; Returns: Json }
      rpc_admin_resolve_section_uid: {
        Args: { p_section_uid: number }
        Returns: Json
      }
      rpc_admin_restore_page: { Args: { p_page_key: string }; Returns: Json }
      rpc_admin_save_machine_translation: {
        Args: {
          p_field_key: string
          p_locale: string
          p_page_key: string
          p_section_key: string
          p_value: string
        }
        Returns: Json
      }
      rpc_admin_search_short_ids: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          field_key: string
          formatted: string
          kind: string
          label: string
          node_id: string
          num: number
          page_key: string
          score: number
          section_key: string
          sublabel: string
        }[]
      }
      rpc_admin_set_editable_field_enabled: {
        Args: {
          p_field_key: string
          p_is_enabled: boolean
          p_locale: string
          p_page_key: string
          p_section_key: string
        }
        Returns: Json
      }
      rpc_admin_set_field_review_status: {
        Args: {
          p_field_key: string
          p_locale: string
          p_page_key: string
          p_review_status: string
          p_section_key: string
        }
        Returns: Json
      }
      rpc_admin_set_locale_visibility: {
        Args: {
          p_is_active?: boolean
          p_is_public?: boolean
          p_locale: string
          p_reason?: string
        }
        Returns: {
          is_active: boolean
          is_public: boolean
          locale: string
        }[]
      }
      rpc_admin_set_navigation_node_active: {
        Args: { p_is_active: boolean; p_node_id: string }
        Returns: Json
      }
      rpc_admin_set_navigation_node_public: {
        Args: { p_node_id: string; p_show: boolean }
        Returns: Json
      }
      rpc_admin_set_page_completion: {
        Args: { p_page_key?: string; p_route_path: string; p_status: string }
        Returns: Json
      }
      rpc_admin_set_page_hours: {
        Args: { p_hours: number; p_page_key?: string; p_route_path: string }
        Returns: Json
      }
      rpc_admin_set_section_active: {
        Args: {
          p_is_active: boolean
          p_page_key: string
          p_section_key: string
        }
        Returns: Json
      }
      rpc_admin_set_section_parent: {
        Args: {
          p_new_parent_section_key: string
          p_page_key: string
          p_position: number
          p_section_key: string
        }
        Returns: Json
      }
      rpc_admin_set_section_position: {
        Args: { p_page_key: string; p_position: number; p_section_key: string }
        Returns: Json
      }
      rpc_admin_set_translation_autopilot:
        | { Args: { p_enabled: boolean }; Returns: Json }
        | { Args: { p_enabled?: boolean; p_paused?: boolean }; Returns: Json }
      rpc_admin_sync_ui_strings: { Args: { p_manifest: Json }; Returns: Json }
      rpc_admin_translation_autopilot_status: { Args: never; Returns: Json }
      rpc_admin_translation_integrity: { Args: never; Returns: Json }
      rpc_admin_translation_locale_counts: {
        Args: { p_locale: string }
        Returns: Json
      }
      rpc_admin_ui_catalog_sync_capabilities: { Args: never; Returns: Json }
      rpc_admin_update_asset_alt: {
        Args: { p_asset_id: string; p_locale: string; p_value: string }
        Returns: Json
      }
      rpc_admin_update_navigation_description: {
        Args: { p_locale: string; p_node_id: string; p_value: string }
        Returns: Json
      }
      rpc_admin_update_navigation_label: {
        Args: { p_locale: string; p_node_id: string; p_value: string }
        Returns: Json
      }
      rpc_admin_update_section_field: {
        Args: {
          p_field_key: string
          p_locale: string
          p_page_key: string
          p_section_key: string
          p_value: string
        }
        Returns: Json
      }
      rpc_admin_update_translation_unit: {
        Args: {
          p_area: string
          p_locale: string
          p_page_key: string
          p_ref_id: string
          p_section_key: string
          p_unit_key: string
          p_value: string
        }
        Returns: Json
      }
      rpc_admin_upsert_asset:
        | {
            Args: {
              p_asset_role?: string
              p_field_key: string
              p_file_name?: string
              p_mime_type?: string
              p_page_key: string
              p_public_url: string
              p_section_key: string
              p_storage_path: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_asset_role?: string
              p_field_key: string
              p_file_name?: string
              p_mime_type?: string
              p_page_key: string
              p_public_url: string
              p_section_key: string
              p_storage_path: string
              p_viewport?: string
            }
            Returns: Json
          }
      rpc_admin_upsert_locale: {
        Args: {
          p_fallback_locale?: string
          p_label_de: string
          p_label_native: string
          p_locale: string
          p_notes?: string
          p_sort_order?: number
        }
        Returns: Json
      }
      rpc_admin_upsert_page: {
        Args: { p_page_key: string; p_page_type: string; p_route_path: string }
        Returns: Json
      }
      rpc_internal_apply_machine_translation: {
        Args: {
          p_field_key: string
          p_locale: string
          p_page_key: string
          p_section_key: string
          p_source_hash: string
          p_value: string
        }
        Returns: Json
      }
      rpc_internal_apply_machine_unit: {
        Args: {
          p_area: string
          p_locale: string
          p_page_key: string
          p_ref_id: string
          p_section_key: string
          p_source_hash: string
          p_unit_key: string
          p_value: string
        }
        Returns: Json
      }
      rpc_internal_cms_schema_snapshot: { Args: never; Returns: Json }
      rpc_internal_locale_provider_set: {
        Args: {
          p_actor?: string
          p_locale: string
          p_model: string
          p_provider: string
        }
        Returns: Json
      }
      rpc_internal_prepare_translation_locale: {
        Args: { p_locale: string }
        Returns: Json
      }
      rpc_internal_provider_credentials_status: { Args: never; Returns: Json }
      rpc_internal_provider_models_replace: {
        Args: { p_models: Json; p_provider: string }
        Returns: Json
      }
      rpc_internal_provider_secret_delete: {
        Args: { p_actor?: string; p_provider: string }
        Returns: Json
      }
      rpc_internal_provider_secret_get: {
        Args: { p_provider: string }
        Returns: string
      }
      rpc_internal_provider_secret_set: {
        Args: { p_actor?: string; p_provider: string; p_secret: string }
        Returns: Json
      }
      rpc_internal_provider_test_record: {
        Args: {
          p_actor?: string
          p_error?: string
          p_ok: boolean
          p_provider: string
        }
        Returns: Json
      }
      rpc_internal_rate_limit_hit: {
        Args: {
          p_bucket: string
          p_limit: number
          p_subject: string
          p_window_seconds: number
        }
        Returns: Json
      }
      rpc_internal_storage_inventory_page: {
        Args: { p_after?: string; p_limit?: number }
        Returns: {
          etag: string
          mime_type: string
          object_path: string
          object_size: number
          updated_at: string
        }[]
      }
      rpc_internal_storage_inventory_summary: { Args: never; Returns: Json }
      rpc_internal_translation_coverage: { Args: never; Returns: Json }
      rpc_internal_translation_coverage_cached: {
        Args: { p_force?: boolean; p_max_age_seconds?: number }
        Returns: Json
      }
      rpc_internal_translation_coverage_invalidate: {
        Args: never
        Returns: undefined
      }
      rpc_internal_translation_coverage_locale: {
        Args: { p_locale: string }
        Returns: Json
      }
      rpc_internal_translation_coverage_refresh_one: {
        Args: { p_locale?: string; p_max_age_seconds?: number }
        Returns: Json
      }
      rpc_internal_translation_dry_run: {
        Args: { p_page_keys: string[]; p_target_locale: string }
        Returns: Json
      }
      rpc_internal_translation_job_finish: {
        Args: { p_error?: string; p_job_id: string; p_status: string }
        Returns: Json
      }
      rpc_internal_translation_next_batch: {
        Args: { p_limit: number; p_run_id: string }
        Returns: Json
      }
      rpc_internal_translation_open_units: {
        Args: { p_run_id: string }
        Returns: number
      }
      rpc_internal_translation_prepare_and_dry_run: {
        Args: { p_page_keys?: string[]; p_target_locale: string }
        Returns: Json
      }
      rpc_internal_translation_progress: {
        Args: {
          p_chars: number
          p_cost: number
          p_cursor_field_key: string
          p_cursor_page_key: string
          p_cursor_section_key: string
          p_done: number
          p_error: string
          p_failed: number
          p_memory_hits: number
          p_model_calls: number
          p_run_id: string
          p_skipped: number
          p_status: string
        }
        Returns: Json
      }
      rpc_internal_translation_qa: {
        Args: {
          p_limit: number
          p_page_keys: string[]
          p_target_locale: string
        }
        Returns: Json
      }
      rpc_internal_translation_run_resume: {
        Args: { p_run_id: string }
        Returns: Json
      }
      rpc_internal_translation_run_switch_provider: {
        Args: {
          p_actor?: string
          p_model: string
          p_provider: string
          p_run_id: string
        }
        Returns: Json
      }
      rpc_internal_translation_start_run: {
        Args: {
          p_cost_limit: number
          p_dry_run: Json
          p_limits: Json
          p_model: string
          p_page_keys: string[]
          p_provider: string
          p_scope_kind: string
          p_scope_signature: string
          p_target_locale: string
        }
        Returns: Json
      }
      rpc_internal_translation_worker_arm: { Args: never; Returns: Json }
      rpc_internal_translation_worker_claim: {
        Args: { p_lease_seconds?: number }
        Returns: Json
      }
      rpc_internal_translation_worker_disarm: { Args: never; Returns: Json }
      rpc_internal_translation_worker_heartbeat: {
        Args: {
          p_lease_owner: string
          p_lease_seconds?: number
          p_run_id: string
        }
        Returns: Json
      }
      rpc_internal_translation_worker_pending: { Args: never; Returns: Json }
      rpc_internal_translation_worker_release: {
        Args: { p_lease_owner: string; p_run_id: string }
        Returns: Json
      }
      rpc_public_read_navigation_overlay: {
        Args: { p_nav_area: string }
        Returns: Json
      }
      rpc_public_read_navigation_tree: {
        Args: { p_nav_area: string }
        Returns: Json
      }
      rpc_public_read_ui_strings: { Args: { p_locale: string }; Returns: Json }
      rpc_public_resolve_breadcrumb: {
        Args: { p_route_path: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "editor"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "editor"],
    },
  },
} as const
