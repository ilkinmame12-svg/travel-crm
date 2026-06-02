"use client"

import { Phone, MessageCircle, Clock, Zap, Shield, BookOpen, ChevronRight } from "lucide-react"

const faqs = [
  { q: "Yeni sifariş necə əlavə edilir?", a: "Sifarişlər səhifəsində 'Yeni sifariş' düyməsinə basın, məlumatları doldurun və 'Yarat' düyməsinə basın." },
  { q: "IATA hesabatını necə yükləmək olar?", a: "IATA səhifəsində ay seçin, period seçin və 'Excel-ə yüklə' düyməsinə basın." },
  { q: "Müştərinin borcunu necə ödəmək olar?", a: "Borclar səhifəsində müştərini tapın, 'Ödə' düyməsinə basın və məbləği daxil edin." },
  { q: "Şifrəmi unutdum, nə etməliyəm?", a: "IT adminə zəng edin: +994 55 771 01 77" },
  { q: "Sifarişi silmək mümkündürmü?", a: "Yalnız IT Admin sifarişi silə bilər. Lazım olduqda zəng edin." },
  { q: "PDF hesabatı necə göndərilir?", a: "Borclar səhifəsində müştəri adını yazın, növ seçin və 'PDF yüklə' düyməsinə basın." },
]

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Yardım Mərkəzi</h1>
          <p className="text-sm text-gray-500 mt-1">Sualınız var? Biz buradayıq 👋</p>
        </div>

        {/* Emergency call card */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-2xl p-6 mb-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-90 mb-1">🚨 Təcili texniki dəstək</p>
              <p className="text-3xl font-bold tracking-wide">+994 55 771 01 77</p>
              <p className="text-sm opacity-80 mt-2">IT Admin — Ilkin • 7/24 əlçatan</p>
            </div>
            <a href="tel:+994557710177"
              className="flex items-center gap-2 bg-white text-red-600 px-5 py-3 rounded-xl font-semibold text-sm hover:bg-red-50 transition-colors">
              <Phone size={18} />
              Zəng et
            </a>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <a href="tel:+994557710177"
            className="bg-white rounded-2xl border border-gray-100 p-4 text-center hover:border-red-200 hover:shadow-sm transition-all">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-2">
              <Phone size={18} className="text-red-500" />
            </div>
            <p className="text-sm font-semibold text-gray-900">Zəng et</p>
            <p className="text-xs text-gray-400 mt-0.5">IT dəstəyi</p>
          </a>
          <a href="https://wa.me/994557710177" target="_blank" rel="noopener noreferrer"
            className="bg-white rounded-2xl border border-gray-100 p-4 text-center hover:border-green-200 hover:shadow-sm transition-all">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center mx-auto mb-2">
              <MessageCircle size={18} className="text-green-500" />
            </div>
            <p className="text-sm font-semibold text-gray-900">WhatsApp</p>
            <p className="text-xs text-gray-400 mt-0.5">Mesaj göndər</p>
          </a>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-2">
              <Clock size={18} className="text-blue-500" />
            </div>
            <p className="text-sm font-semibold text-gray-900">İş saatları</p>
            <p className="text-xs text-gray-400 mt-0.5">09:00 — 18:00</p>
          </div>
        </div>

        {/* Tips */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={16} className="text-amber-500" />
              <p className="text-sm font-semibold text-gray-900">Sürətli ipucları</p>
            </div>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2"><ChevronRight size={14} className="text-gray-300" />Axtarış üçün Ctrl+F</li>
              <li className="flex items-center gap-2"><ChevronRight size={14} className="text-gray-300" />Excel export — IATA səhifəsindən</li>
              <li className="flex items-center gap-2"><ChevronRight size={14} className="text-gray-300" />Borc PDF — Borclar səhifəsindən</li>
              <li className="flex items-center gap-2"><ChevronRight size={14} className="text-gray-300" />Qayıdış üçün mənfi məbləğ yazın</li>
            </ul>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Shield size={16} className="text-blue-500" />
              <p className="text-sm font-semibold text-gray-900">Giriş məlumatları</p>
            </div>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2"><ChevronRight size={14} className="text-gray-300" />Şifrəni heç kimlə paylaşmayın</li>
              <li className="flex items-center gap-2"><ChevronRight size={14} className="text-gray-300" />Şifrə dəyişmək — Ayarlar səhifəsi</li>
              <li className="flex items-center gap-2"><ChevronRight size={14} className="text-gray-300" />Problrem varsa IT-yə bildirin</li>
              <li className="flex items-center gap-2"><ChevronRight size={14} className="text-gray-300" />Çıxışdan əvvəl hesabdan çıxın</li>
            </ul>
          </div>
        </div>

        {/* FAQ */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
            <BookOpen size={16} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">Tez-tez verilən suallar</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {faqs.map((f, i) => (
              <div key={i} className="px-6 py-4">
                <p className="text-sm font-semibold text-gray-900 mb-1">{f.q}</p>
                <p className="text-sm text-gray-500">{f.a}</p>
              </div>
            ))}
          </div>
        </div>

       <p className="text-center text-xs text-gray-400 mt-6">itstour CRM v1.0 • Powered by <span className="font-bold">VARK TECHNOLOGIES</span></p>
      </div>
    </div>
  )
}
