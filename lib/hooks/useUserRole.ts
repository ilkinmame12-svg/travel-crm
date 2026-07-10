import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

export type UserRole = "it_admin" | "boss" | "direktor" | "muhasib" | "menecer" | "bilet_menecer" | "tender_menecer"

interface UserProfile {
  id: string
  email: string
  fullName: string
  role: UserRole
  avatarUrl: string | null
}

export function useUserRole() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      if (data) {
        setProfile({
          id: data.id,
          email: data.email,
          fullName: data.full_name,
          role: data.role,
          avatarUrl: data.avatar_url ?? null,
        })
      }
      setLoading(false)
    }
    fetchProfile()
  }, [])

  const isAdmin      = profile?.role === "it_admin"
  const isBoss       = profile?.role === "boss"
  const isDirektor   = profile?.role === "direktor"
  const isMuhasib    = profile?.role === "muhasib"
  const isBiletMenecer = profile?.role === "bilet_menecer"

  const canEdit      = ["it_admin", "direktor", "muhasib"].includes(profile?.role ?? "")
  const canDelete    = profile?.role === "it_admin"
  const canSeeFinances = ["it_admin", "boss", "direktor", "muhasib"].includes(profile?.role ?? "")
  const isReadOnly   = profile?.role === "boss"

  // bilet_menecer — sadəcə bilet sifarişlərini görə bilər
  const isManager    = profile?.role === "menecer"
  const isBiletOnly  = profile?.role === "bilet_menecer"

  return {
    profile, loading,
    isAdmin, isBoss, isDirektor, isMuhasib,
    isBiletMenecer, isBiletOnly, isManager,
    canEdit, canDelete, canSeeFinances, isReadOnly
  }
}