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
      abonnements: {
        Row: {
          id: string
          profile_id: string
          plan: string
          statut: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          essai_fin: string | null
          periode_fin: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          plan: string
          statut?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          essai_fin?: string | null
          periode_fin?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          plan?: string
          statut?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          essai_fin?: string | null
          periode_fin?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "abonnements_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      actes_mission: {
        Row: {
          id: string
          mission_id: string
          libelle: string
          ngap_code_id: string | null
          ordre: number
        }
        Insert: {
          id?: string
          mission_id: string
          libelle: string
          ngap_code_id?: string | null
          ordre?: number
        }
        Update: {
          id?: string
          mission_id?: string
          libelle?: string
          ngap_code_id?: string | null
          ordre?: number
        }
        Relationships: [
          {
            foreignKeyName: "actes_mission_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions_du_jour"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actes_mission_ngap_code_id_fkey"
            columns: ["ngap_code_id"]
            isOneToOne: false
            referencedRelation: "ngap_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      fiches_dossier_soins: {
        Row: {
          contenu: Json
          created_at: string
          id: string
          niveau_confiance: string
          ordre: number
          published: boolean
          resume: string
          section: string
          sources: Json
          titre: string
          updated_at: string
          version: number
        }
        Insert: {
          contenu?: Json
          created_at?: string
          id?: string
          niveau_confiance?: string
          ordre?: number
          published?: boolean
          resume: string
          section: string
          sources?: Json
          titre: string
          updated_at?: string
          version?: number
        }
        Update: {
          contenu?: Json
          created_at?: string
          id?: string
          niveau_confiance?: string
          ordre?: number
          published?: boolean
          resume?: string
          section?: string
          sources?: Json
          titre?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      missions_cliniques: {
        Row: {
          created_at: string
          duree_estimee_min: number
          etapes: Json
          id: string
          published: boolean
          situation_terrain_id: string | null
          titre: string
        }
        Insert: {
          created_at?: string
          duree_estimee_min?: number
          etapes?: Json
          id?: string
          published?: boolean
          situation_terrain_id?: string | null
          titre: string
        }
        Update: {
          created_at?: string
          duree_estimee_min?: number
          etapes?: Json
          id?: string
          published?: boolean
          situation_terrain_id?: string | null
          titre?: string
        }
        Relationships: [
          {
            foreignKeyName: "missions_cliniques_situation_terrain_id_fkey"
            columns: ["situation_terrain_id"]
            isOneToOne: false
            referencedRelation: "situations_terrain"
            referencedColumns: ["id"]
          },
        ]
      }
      missions_du_jour: {
        Row: {
          heure_prevue: string
          id: string
          distance_km: number | null
          distance_km_corrigee: number | null
          mission_clinique_id: string | null
          motif_absence: string | null
          patient_id: string
          photo_path: string | null
          rappel: string | null
          statut: string
          tournee_id: string
          transmission: string | null
          type_soin: string
        }
        Insert: {
          heure_prevue: string
          id?: string
          distance_km?: number | null
          distance_km_corrigee?: number | null
          mission_clinique_id?: string | null
          motif_absence?: string | null
          patient_id: string
          photo_path?: string | null
          rappel?: string | null
          statut?: string
          tournee_id: string
          transmission?: string | null
          type_soin: string
        }
        Update: {
          heure_prevue?: string
          id?: string
          distance_km?: number | null
          distance_km_corrigee?: number | null
          mission_clinique_id?: string | null
          motif_absence?: string | null
          patient_id?: string
          photo_path?: string | null
          rappel?: string | null
          statut?: string
          tournee_id?: string
          transmission?: string | null
          type_soin?: string
        }
        Relationships: [
          {
            foreignKeyName: "missions_du_jour_mission_clinique_id_fkey"
            columns: ["mission_clinique_id"]
            isOneToOne: false
            referencedRelation: "missions_cliniques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missions_du_jour_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missions_du_jour_tournee_id_fkey"
            columns: ["tournee_id"]
            isOneToOne: false
            referencedRelation: "tournees"
            referencedColumns: ["id"]
          },
        ]
      }
      ngap_codes: {
        Row: {
          code: string
          coefficient: number | null
          conditions: string | null
          cotation: number
          derogatoire_bsi: boolean
          eligible_mci: boolean
          id: string
          lettre_cle: string | null
          libelle: string
        }
        Insert: {
          code: string
          coefficient?: number | null
          conditions?: string | null
          cotation: number
          derogatoire_bsi: boolean
          eligible_mci: boolean
          id?: string
          lettre_cle?: string | null
          libelle: string
        }
        Update: {
          code?: string
          coefficient?: number | null
          conditions?: string | null
          cotation?: number
          derogatoire_bsi?: boolean
          eligible_mci?: boolean
          id?: string
          lettre_cle?: string | null
          libelle?: string
        }
        Relationships: []
      }
      ngap_lettres_cles: {
        Row: {
          lettre_cle: string
          libelle: string
          valeur_dom: number
          valeur_metropole: number
        }
        Insert: {
          lettre_cle: string
          libelle: string
          valeur_dom: number
          valeur_metropole: number
        }
        Update: {
          lettre_cle?: string
          libelle?: string
          valeur_dom?: number
          valeur_metropole?: number
        }
        Relationships: []
      }
      ordonnances: {
        Row: {
          id: string
          patient_id: string
          idel_id: string
          fichier_path: string
          date_prescription: string | null
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          idel_id: string
          fichier_path: string
          date_prescription?: string | null
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          idel_id?: string
          fichier_path?: string
          date_prescription?: string | null
          note?: string | null
          created_at?: string
        }
        Relationships: []
      }
      patients: {
        Row: {
          adresse: string
          allergies: string | null
          antecedents: string | null
          consignes: string | null
          created_at: string
          date_naissance: string | null
          forfait_bsi: string | null
          id: string
          latitude: number | null
          longitude: number | null
          idel_id: string
          medecin_nom: string | null
          medecin_telephone: string | null
          nom_complet: string
          note_soin: string | null
          numero_secu: string | null
          personne_confiance_nom: string | null
          personne_confiance_telephone: string | null
          sexe: string | null
          telephone: string
          traitements_en_cours: string | null
        }
        Insert: {
          adresse: string
          allergies?: string | null
          antecedents?: string | null
          consignes?: string | null
          created_at?: string
          date_naissance?: string | null
          forfait_bsi?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          idel_id: string
          medecin_nom?: string | null
          medecin_telephone?: string | null
          nom_complet: string
          note_soin?: string | null
          numero_secu?: string | null
          personne_confiance_nom?: string | null
          personne_confiance_telephone?: string | null
          sexe?: string | null
          telephone: string
          traitements_en_cours?: string | null
        }
        Update: {
          adresse?: string
          allergies?: string | null
          antecedents?: string | null
          consignes?: string | null
          created_at?: string
          date_naissance?: string | null
          forfait_bsi?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          idel_id?: string
          medecin_nom?: string | null
          medecin_telephone?: string | null
          nom_complet?: string
          note_soin?: string | null
          numero_secu?: string | null
          personne_confiance_nom?: string | null
          personne_confiance_telephone?: string | null
          sexe?: string | null
          telephone?: string
          traitements_en_cours?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_idel_id_fkey"
            columns: ["idel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          code_postal: string | null
          adresse_cabinet: string | null
          cabinet_latitude: number | null
          cabinet_longitude: number | null
          created_at: string
          full_name: string
          id: string
          role: string
        }
        Insert: {
          code_postal?: string | null
          adresse_cabinet?: string | null
          cabinet_latitude?: number | null
          cabinet_longitude?: number | null
          created_at?: string
          full_name: string
          id: string
          role?: string
        }
        Update: {
          code_postal?: string | null
          adresse_cabinet?: string | null
          cabinet_latitude?: number | null
          cabinet_longitude?: number | null
          created_at?: string
          full_name?: string
          id?: string
          role?: string
        }
        Relationships: []
      }
      situations_terrain: {
        Row: {
          causes_possibles: Json
          conduite_a_tenir: Json
          created_at: string
          id: string
          niveau_confiance: string
          observation: string
          published: boolean
          quand_avis_medical: string
          search_vector: unknown
          sources: Json
          specialite: string
          titre: string
          updated_at: string
          verifications: Json
          version: number
        }
        Insert: {
          causes_possibles?: Json
          conduite_a_tenir?: Json
          created_at?: string
          id?: string
          niveau_confiance?: string
          observation: string
          published?: boolean
          quand_avis_medical: string
          search_vector?: unknown
          sources?: Json
          specialite?: string
          titre: string
          updated_at?: string
          verifications?: Json
          version?: number
        }
        Update: {
          causes_possibles?: Json
          conduite_a_tenir?: Json
          created_at?: string
          id?: string
          niveau_confiance?: string
          observation?: string
          published?: boolean
          quand_avis_medical?: string
          search_vector?: unknown
          sources?: Json
          specialite?: string
          titre?: string
          updated_at?: string
          verifications?: Json
          version?: number
        }
        Relationships: []
      }
      soins_prescrits: {
        Row: {
          actif: boolean
          created_at: string
          date_debut: string
          date_fin: string | null
          frequence_type: string
          heures: string[]
          id: string
          idel_id: string
          intervalle_jours: number | null
          jours_semaine: number[] | null
          ngap_code_id: string | null
          patient_id: string
          type_soin: string
        }
        Insert: {
          actif?: boolean
          created_at?: string
          date_debut?: string
          date_fin?: string | null
          frequence_type: string
          heures: string[]
          id?: string
          idel_id: string
          intervalle_jours?: number | null
          jours_semaine?: number[] | null
          ngap_code_id?: string | null
          patient_id: string
          type_soin: string
        }
        Update: {
          actif?: boolean
          created_at?: string
          date_debut?: string
          date_fin?: string | null
          frequence_type?: string
          heures?: string[]
          id?: string
          idel_id?: string
          intervalle_jours?: number | null
          jours_semaine?: number[] | null
          ngap_code_id?: string | null
          patient_id?: string
          type_soin?: string
        }
        Relationships: [
          {
            foreignKeyName: "soins_prescrits_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "soins_prescrits_idel_id_fkey"
            columns: ["idel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "soins_prescrits_ngap_code_id_fkey"
            columns: ["ngap_code_id"]
            isOneToOne: false
            referencedRelation: "ngap_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      tournees: {
        Row: {
          date: string
          id: string
          idel_id: string
          nb_glycemies: number
          nb_injections: number
          nb_pansements: number
          nb_patients: number
          temps_estime_min: number
        }
        Insert: {
          date?: string
          id?: string
          idel_id: string
          nb_glycemies?: number
          nb_injections?: number
          nb_pansements?: number
          nb_patients?: number
          temps_estime_min?: number
        }
        Update: {
          date?: string
          id?: string
          idel_id?: string
          nb_glycemies?: number
          nb_injections?: number
          nb_pansements?: number
          nb_patients?: number
          temps_estime_min?: number
        }
        Relationships: [
          {
            foreignKeyName: "tournees_idel_id_fkey"
            columns: ["idel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      search_situations_terrain: {
        Args: { search_query: string }
        Returns: {
          causes_possibles: Json
          conduite_a_tenir: Json
          created_at: string
          id: string
          niveau_confiance: string
          observation: string
          published: boolean
          quand_avis_medical: string
          search_vector: unknown
          sources: Json
          specialite: string
          titre: string
          updated_at: string
          verifications: Json
          version: number
        }[]
        SetofOptions: {
          from: "*"
          to: "situations_terrain"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
