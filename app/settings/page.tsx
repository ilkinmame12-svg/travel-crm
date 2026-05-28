"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { Camera, Save, Eye, EyeOff } from "lucide-react"

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>(null)
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [position, setPosition] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [passwordMessage, setPasswordMessage] = useState("")
  const [ready, setReady] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setReady(true); return }
      const { data } = await supabase.from("user_profiles").select("*").eq("id", user.id).single()
      if (data) {
        setProfile(data)
        setFullName(data.full_name ?? "")
        setPhone(data.phone ?? "")
        setPosition(data.position ?? "")
        setAvatarUrl(data.avatar_url ?? "")
      }
      setReady(true)
    }
    load()
  }, [])

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const ext = file.name.split('.').pop()
    const path = `avatars/${user.id}.${ext}`
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true })
    if (error) { setMessage("Şəkil yüklənmədi: " + error.message); return }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path)
    setAvatarUrl(publicUrl)
    setMessage("Şəkil yükləndi!")
  }

  async function handleSaveProfile() {
    setLoading(true)
    setMessage("")
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from("user_profiles").update({
      full_name: fullName,
      phone,
      position,
      avatar_url: avatarUrl,
    }).eq("id", user.id)
    if (error) setMessage("Xəta: " + error.message)
    else setMessage("✅ Profil yeniləndi!")
    setLoading(false)
  }

  async function handleChangePassword() {
    if (newPassword !== confirmPassword) { setPasswordMessage("Şifrələr uyğun gəlmir!"); return }
    if (newPassword.length < 6) { setPasswordMessage("Şifrə ən az 6 simvol olmalıdır!"); return }
    setPasswordLoading(true)
    setPasswordMessage("")
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) setPasswordMessage("Xəta: " + error.message)
    else {
      setPasswordMessage("✅ Şifrə dəyişdirildi!")
      setNewPassword("")
      setConfirmPassword("")
    }
    setPasswordLoading(false)
  }

  if (!ready) return null

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Profil Ayarları</h1>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-4">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Profil Şəkli</h2>
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-red-600 text-2xl font-bold">{fullName?.[0] ?? "?"}</span>
                )}
              </div>
              <button
  type="button"
  onClick={() => fileRef.current?.click()}
  className="absolute -bottom-1 -right-1 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600"
>
  <Camera size={13} />
</button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{fullName || "Ad yoxdur"}</p>
              <p className="text-xs text-gray-500">{profile?.email}</p>
              <p className="text-xs text-gray-400 mt-1">JPG, PNG — maks 2MB</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-4">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Şəxsi Məlumatlar</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Ad Soyad</label>
              <input value={fullName} onChange={e => setFullName(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                placeholder="Adınızı daxil edin" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Telefon</label>
              <input value={phone} onChange={e => setPhone(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                placeholder="+994 XX XXX XX XX" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Vəzifə</label>
              <input value={position} onChange={e => setPosition(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                placeholder="Məsələn: Menecer" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Email</label>
              <input value={profile?.email ?? ""} disabled
                className="w-full border border-gray-100 rounded-xl px-4 py-2.5 text-sm bg-gray-50 text-gray-400" />
            </div>
          </div>
          {message && (
            <p className={`mt-3 text-sm ${message.startsWith("✅") ? "text-green-600" : "text-red-500"}`}>{message}</p>
          )}
          <button onClick={handleSaveProfile} disabled={loading}
            className="mt-4 flex items-center gap-2 bg-red-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-red-600 disabled:opacity-50">
            <Save size={16} />
            {loading ? "Yadda saxlanır..." : "Yadda saxla"}
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Şifrəni Dəyiş</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Yeni Şifrə</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 pr-10"
                  placeholder="Yeni şifrə" />
                <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-gray-400">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Şifrəni Təsdiq Et</label>
              <input type={showPassword ? "text" : "password"} value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                placeholder="Şifrəni təkrarlayın" />
            </div>
          </div>
          {passwordMessage && (
            <p className={`mt-3 text-sm ${passwordMessage.startsWith("✅") ? "text-green-600" : "text-red-500"}`}>{passwordMessage}</p>
          )}
          <button onClick={handleChangePassword} disabled={passwordLoading || !newPassword || !confirmPassword}
            className="mt-4 flex items-center gap-2 bg-gray-800 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-900 disabled:opacity-50">
            <Save size={16} />
            {passwordLoading ? "Dəyişdirilir..." : "Şifrəni dəyiş"}
          </button>
        </div>
      </div>
    </div>
  )
}