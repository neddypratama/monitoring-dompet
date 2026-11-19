import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  Download,
  CheckCircle,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  User,
  ShieldCheck,
  Smartphone
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeProvider, setActiveProvider] = useState<string>('gemini');
  const [geminiKey, setGeminiKey] = useState<string>('');
  const [geminiModel, setGeminiModel] = useState<string>('gemini-3.8-flash');
  const [groqKey, setGroqKey] = useState<string>('');
  const [groqModel, setGroqModel] = useState<string>('meta-llama/llama-4-scout-17b-16e-instruct');
  const [openrouterKey, setOpenrouterKey] = useState<string>('');
  const [openrouterModel, setOpenrouterModel] = useState<string>('google/gemini-2.5-flash');
  const [openaiKey, setOpenaiKey] = useState<string>('');
  const [openaiModel, setOpenaiModel] = useState<string>('gpt-4o-mini');

  const [availableModels, setAvailableModels] = useState<Record<string, string[]>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await apiRequest<any>('/settings');
        setActiveProvider(data.active_ai_provider || 'gemini');
        setGeminiKey(data.gemini_api_key || '');
        setGeminiModel(data.gemini_model || 'gemini-3.8-flash');
        setGroqKey(data.groq_api_key || '');
        setGroqModel(data.groq_model || 'meta-llama/llama-4-scout-17b-16e-instruct');
        setOpenrouterKey(data.openrouter_api_key || '');
        setOpenrouterModel(data.openrouter_model || 'google/gemini-2.5-flash');
        setOpenaiKey(data.openai_api_key || '');
        setOpenaiModel(data.openai_model || 'gpt-4o-mini');
        setAvailableModels(data.available_models || {});
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setIsSaving(true);

    try {
      await apiRequest('/settings', {
        method: 'POST',
        body: JSON.stringify({
          active_ai_provider: activeProvider,
          gemini_api_key: geminiKey.trim(),
          gemini_model: geminiModel,
          groq_api_key: groqKey.trim(),
          groq_model: groqModel,
          openrouter_api_key: openrouterKey.trim(),
          openrouter_model: openrouterModel,
          openai_api_key: openaiKey.trim(),
          openai_model: openaiModel,
        }),
      });
      setMessage('Pengaturan berhasil disimpan!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan pengaturan.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await apiRequest<any>('/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dompetku_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Gagal mengekspor data.');
    } finally {
      setIsExporting(false);
    }
  };

  const toggleShowKey = (providerName: string) => {
    setShowKeys((prev) => ({ ...prev, [providerName]: !prev[providerName] }));
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Pengaturan Sistem & Multi-AI
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Atur API key provider AI vision dan kelola cadangan data akun Anda
        </p>
      </div>

      {message && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="py-16 flex justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* User Profile Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">{user?.full_name}</h3>
                <p className="text-xs text-slate-400">@{user?.username} • Terdaftar {user?.created_at?.split(' ')[0]}</p>
              </div>
            </div>

            <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 flex items-center space-x-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Akun Aktif</span>
            </span>
          </div>

          {/* AI Providers Section */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex items-center space-x-2.5 pb-4 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-blue-600 text-white flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  Konfigurasi Multi-AI Vision (OCR Struk)
                </h2>
                <p className="text-xs text-slate-400">
                  Pilih provider utama dan masukkan API key masing-masing
                </p>
              </div>
            </div>

            {/* Google Gemini Card */}
            <div className={`p-4 rounded-2xl border transition-all ${activeProvider === 'gemini' ? 'border-indigo-500 bg-indigo-50/20 shadow-xs' : 'border-slate-200'}`}>
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="active_provider"
                    value="gemini"
                    checked={activeProvider === 'gemini'}
                    onChange={() => setActiveProvider('gemini')}
                    className="w-4 h-4 text-indigo-600"
                  />
                  <span className="font-extrabold text-slate-900 text-sm">Google Gemini</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Kuota Gratis Tersedia</span>
                </label>

                <select
                  value={geminiModel}
                  onChange={(e) => setGeminiModel(e.target.value)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 bg-white"
                >
                  {(availableModels['gemini'] || ['gemini-3.8-flash', 'gemini-2.5-flash']).map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <input
                  type={showKeys['gemini'] ? 'text' : 'password'}
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder="Masukkan Gemini API Key (AIzaSy...)"
                  className="w-full pl-3 pr-10 py-2 rounded-xl border border-slate-200 text-xs font-mono outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => toggleShowKey('gemini')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showKeys['gemini'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Groq Vision Card */}
            <div className={`p-4 rounded-2xl border transition-all ${activeProvider === 'groq' ? 'border-indigo-500 bg-indigo-50/20 shadow-xs' : 'border-slate-200'}`}>
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="active_provider"
                    value="groq"
                    checked={activeProvider === 'groq'}
                    onChange={() => setActiveProvider('groq')}
                    className="w-4 h-4 text-indigo-600"
                  />
                  <span className="font-extrabold text-slate-900 text-sm">Groq Vision</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">Ultra Fast</span>
                </label>

                <select
                  value={groqModel}
                  onChange={(e) => setGroqModel(e.target.value)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 bg-white"
                >
                  {(availableModels['groq'] || ['meta-llama/llama-4-scout-17b-16e-instruct']).map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <input
                  type={showKeys['groq'] ? 'text' : 'password'}
                  value={groqKey}
                  onChange={(e) => setGroqKey(e.target.value)}
                  placeholder="Masukkan Groq API Key (gsk_...)"
                  className="w-full pl-3 pr-10 py-2 rounded-xl border border-slate-200 text-xs font-mono outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => toggleShowKey('groq')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showKeys['groq'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* OpenRouter Card */}
            <div className={`p-4 rounded-2xl border transition-all ${activeProvider === 'openrouter' ? 'border-indigo-500 bg-indigo-50/20 shadow-xs' : 'border-slate-200'}`}>
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="active_provider"
                    value="openrouter"
                    checked={activeProvider === 'openrouter'}
                    onChange={() => setActiveProvider('openrouter')}
                    className="w-4 h-4 text-indigo-600"
                  />
                  <span className="font-extrabold text-slate-900 text-sm">OpenRouter</span>
                </label>

                <select
                  value={openrouterModel}
                  onChange={(e) => setOpenrouterModel(e.target.value)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 bg-white"
                >
                  {(availableModels['openrouter'] || ['google/gemini-2.5-flash', 'openrouter/free']).map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <input
                  type={showKeys['openrouter'] ? 'text' : 'password'}
                  value={openrouterKey}
                  onChange={(e) => setOpenrouterKey(e.target.value)}
                  placeholder="Masukkan OpenRouter API Key (sk-or-...)"
                  className="w-full pl-3 pr-10 py-2 rounded-xl border border-slate-200 text-xs font-mono outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => toggleShowKey('openrouter')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showKeys['openrouter'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* OpenAI Card */}
            <div className={`p-4 rounded-2xl border transition-all ${activeProvider === 'openai' ? 'border-indigo-500 bg-indigo-50/20 shadow-xs' : 'border-slate-200'}`}>
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="active_provider"
                    value="openai"
                    checked={activeProvider === 'openai'}
                    onChange={() => setActiveProvider('openai')}
                    className="w-4 h-4 text-indigo-600"
                  />
                  <span className="font-extrabold text-slate-900 text-sm">OpenAI</span>
                </label>

                <select
                  value={openaiModel}
                  onChange={(e) => setOpenaiModel(e.target.value)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 bg-white"
                >
                  {(availableModels['openai'] || ['gpt-4o-mini', 'gpt-4.1-mini']).map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <input
                  type={showKeys['openai'] ? 'text' : 'password'}
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder="Masukkan OpenAI API Key (sk-...)"
                  className="w-full pl-3 pr-10 py-2 rounded-xl border border-slate-200 text-xs font-mono outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => toggleShowKey('openai')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showKeys['openai'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-100 flex items-center space-x-2 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Simpan Pengaturan</span>}
              </button>
            </div>
          </div>

          {/* Backup & Export Section */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Cadangan Data (Backup JSON)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Unduh seluruh data dompet, transaksi, hutang, piutang, dan riwayat struk Anda ke file JSON
              </p>
            </div>

            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition-all shadow-2xs disabled:opacity-50"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 text-indigo-600" />}
              <span>Download Cadangan</span>
            </button>
          </div>

          {/* Android Mobile App Section */}
          <div className="bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/70 rounded-3xl p-6 border border-indigo-100/80 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-start space-x-3.5">
              <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-200">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Aplikasi Android (APK & PWA)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Gunakan DompetKu langsung di HP Android Anda seperti aplikasi asli dengan instalasi APK atau PWA.
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="inline-flex items-center text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    ✓ Full Screen (Tanpa Bar Browser)
                  </span>
                  <span className="inline-flex items-center text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
                    ✓ Akses Kamera Scan Struk
                  </span>
                </div>
              </div>
            </div>

            <a
              href="/DompetKu.apk"
              download="DompetKu.apk"
              className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-200 hover:scale-[1.02] shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Download APK Android</span>
            </a>
          </div>
        </form>
      )}
    </div>
  );
};
