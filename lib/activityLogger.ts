import { supabase } from "@/lib/supabase"

interface LogParams {
  userName: string
  userRole: string
  action: "create" | "update" | "delete" | "payment" | "login" | "approve" | "reject" | "kassa"
  entity: "booking" | "payment" | "draft" | "kassa" | "expense" | "debt" | "user"
  entityId?: string
  details?: Record<string, any>
}

export async function logActivity(params: LogParams) {
  try {
    await supabase.from("activity_logs").insert({
      user_name: params.userName,
      user_role: params.userRole,
      action: params.action,
      entity: params.entity,
      entity_id: params.entityId ?? null,
      details: params.details ?? null,
    })
  } catch {
    // Логирование не должно ломать основной функционал
  }
}
