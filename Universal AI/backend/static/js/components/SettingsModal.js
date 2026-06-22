function SettingsModal({ isOpen, onClose }) {
  const { user, updateProfile } = useAuth();
  const { chats, deleteChat } = useChat();
  const [activeTab, setActiveTab] = React.useState('general');
  
  // State for forms
  const [name, setName] = React.useState(user?.name || '');
  const [newPassword, setNewPassword] = React.useState('');
  const [customApiKey, setCustomApiKey] = React.useState(localStorage.getItem('gemini_api_key') || '');
  const [systemInstruction, setSystemInstruction] = React.useState(localStorage.getItem('system_instruction') || '');
  const [defaultLanguage, setDefaultLanguage] = React.useState(localStorage.getItem('default_language') || 'Auto-detect');
  
  const [loading, setLoading] = React.useState(false);
  const [successMsg, setSuccessMsg] = React.useState('');
  const [errorMsg, setErrorMsg] = React.useState('');

  React.useEffect(() => {
    if (isOpen) {
      setName(user?.name || '');
      setCustomApiKey(localStorage.getItem('gemini_api_key') || '');
      setSystemInstruction(localStorage.getItem('system_instruction') || '');
      setDefaultLanguage(localStorage.getItem('default_language') || 'Auto-detect');
      setSuccessMsg('');
      setErrorMsg('');
      lucide.createIcons();
    }
  }, [isOpen, user]);

  React.useEffect(() => {
    lucide.createIcons();
  }, [activeTab]);

  if (!isOpen) return null;

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const payload = { name };
      if (newPassword.trim()) {
        payload.password = newPassword;
      }
      await updateProfile(payload);
      setNewPassword('');
      setSuccessMsg('Profile updated successfully.');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAIConfig = (e) => {
    e.preventDefault();
    localStorage.setItem('gemini_api_key', customApiKey.trim());
    localStorage.setItem('system_instruction', systemInstruction.trim());
    localStorage.setItem('default_language', defaultLanguage);
    setSuccessMsg('AI settings saved locally.');
  };

  const handleClearAllChats = async () => {
    if (confirm("Are you sure you want to permanently clear all your conversations? This action cannot be undone.")) {
      setLoading(true);
      try {
        for (const chat of chats) {
          await deleteChat(chat.id);
        }
        setSuccessMsg("All conversations deleted successfully.");
      } catch (err) {
        setErrorMsg("Failed to delete all conversations.");
      } finally {
        setLoading(false);
      }
    }
  };

  const languages = [
    'Auto-detect', 'English', 'Tamil', 'Hindi', 'Telugu', 
    'Malayalam', 'Kannada', 'French', 'German', 'Spanish', 
    'Japanese', 'Chinese', 'Arabic'
  ];

  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div class="max-w-2xl w-full bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div class="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <i data-lucide="sliders" class="w-5 h-5 text-brand-500"></i>
            <h2 class="font-display text-xl font-bold text-slate-800 dark:text-white">Settings Configuration</h2>
          </div>
          <button onClick={onClose} class="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850 transition">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>

        {/* Modal Content container */}
        <div class="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Tabs Menu Sidebar */}
          <div class="w-full md:w-48 bg-slate-50 dark:bg-slate-900/60 p-4 border-r border-slate-200 dark:border-slate-800 flex flex-row md:flex-col gap-1 overflow-x-auto shrink-0">
            <button
              onClick={() => setActiveTab('general')}
              class={`flex items-center gap-2 py-2 px-3 rounded-xl text-sm font-medium transition ${activeTab === 'general' ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
            >
              <i data-lucide="settings-2" class="w-4 h-4"></i>
              <span>General</span>
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              class={`flex items-center gap-2 py-2 px-3 rounded-xl text-sm font-medium transition ${activeTab === 'profile' ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
            >
              <i data-lucide="user" class="w-4 h-4"></i>
              <span>Profile</span>
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              class={`flex items-center gap-2 py-2 px-3 rounded-xl text-sm font-medium transition ${activeTab === 'ai' ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
            >
              <i data-lucide="cpu" class="w-4 h-4"></i>
              <span>AI Options</span>
            </button>
          </div>

          {/* Form Content body */}
          <div class="flex-1 p-6 overflow-y-auto">
            {successMsg && (
              <div class="mb-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs p-3 rounded-xl flex items-center gap-2">
                <i data-lucide="check-circle" class="w-4 h-4"></i>
                <span>{successMsg}</span>
              </div>
            )}
            
            {errorMsg && (
              <div class="mb-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl flex items-center gap-2">
                <i data-lucide="alert-circle" class="w-4 h-4"></i>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* TAB: GENERAL */}
            {activeTab === 'general' && (
              <div class="space-y-6">
                <div>
                  <h3 class="text-sm font-bold text-slate-800 dark:text-white mb-2 uppercase tracking-wide">Language Settings</h3>
                  <p class="text-xs text-slate-500 mb-3">Set your default interface and response language.</p>
                  
                  <select 
                    value={defaultLanguage}
                    onChange={(e) => setDefaultLanguage(e.target.value)}
                    class="block w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm"
                  >
                    {languages.map(lang => (
                      <option key={lang}>{lang}</option>
                    ))}
                  </select>
                </div>

                <hr class="border-slate-200 dark:border-slate-800" />

                <div>
                  <h3 class="text-sm font-bold text-red-500 mb-2 uppercase tracking-wide">Danger Zone</h3>
                  <p class="text-xs text-slate-500 mb-4">Actions here are permanent and cannot be reversed.</p>
                  
                  <button
                    onClick={handleClearAllChats}
                    disabled={loading || chats.length === 0}
                    class="flex items-center gap-2 py-2.5 px-4 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-40"
                  >
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                    <span>Delete All Chats History</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB: PROFILE */}
            {activeTab === 'profile' && (
              <form onSubmit={handleSaveProfile} class="space-y-4">
                <div>
                  <label class="block text-xs font-bold text-slate-500 uppercase mb-2">Display Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    class="block w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm"
                  />
                </div>

                <div>
                  <label class="block text-xs font-bold text-slate-500 uppercase mb-2">Account Email</label>
                  <input
                    type="email"
                    disabled
                    value={user?.email}
                    class="block w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-500 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label class="block text-xs font-bold text-slate-500 uppercase mb-2">Update Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Leave blank to keep current"
                    class="block w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm placeholder-slate-500"
                  />
                </div>

                <div class="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    class="py-2.5 px-4 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-40"
                  >
                    {loading ? 'Saving Profile...' : 'Save Profile Changes'}
                  </button>
                </div>
              </form>
            )}

            {/* TAB: AI OPTIONS */}
            {activeTab === 'ai' && (
              <form onSubmit={handleSaveAIConfig} class="space-y-4">
                <div>
                  <label class="block text-xs font-bold text-slate-500 uppercase mb-2">Custom Gemini API Key</label>
                  <p class="text-[10px] text-slate-400 mb-2">Provide your own key to override the server's default configuration.</p>
                  <input
                    type="password"
                    value={customApiKey}
                    onChange={(e) => setCustomApiKey(e.target.value)}
                    placeholder="AI_API_KEY_••••••••••••"
                    class="block w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm placeholder-slate-500 font-mono"
                  />
                </div>

                <div>
                  <label class="block text-xs font-bold text-slate-500 uppercase mb-2">Preset System Instructions</label>
                  <p class="text-[10px] text-slate-400 mb-2">Custom behavior prompts injected as system prompts for all chat context sessions.</p>
                  <textarea
                    rows="3"
                    value={systemInstruction}
                    onChange={(e) => setSystemInstruction(e.target.value)}
                    placeholder="E.g. Respond with code blocks, keep answers concise..."
                    class="block w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm placeholder-slate-500 resize-none font-sans"
                  />
                </div>

                <div class="pt-2">
                  <button
                    type="submit"
                    class="py-2.5 px-4 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-sm transition"
                  >
                    Save AI Configurations
                  </button>
                </div>
              </form>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}
