// Root App Router Component
function App() {
  const { user, loading } = useAuth();
  const [authScreen, setAuthScreen] = React.useState('login');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = React.useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);

  // Check URL paths for password resetting parameters
  const getUrlParams = () => {
    const params = {};
    const search = window.location.search;
    if (search) {
      const pairs = search.substring(1).split('&');
      for (const pair of pairs) {
        const [key, value] = pair.split('=');
        params[key] = decodeURIComponent(value);
      }
    }
    return params;
  };

  const path = window.location.pathname;
  const params = getUrlParams();

  // If path is reset-password, route there
  const isResetScreen = path === '/reset-password' && params.email;

  React.useEffect(() => {
    lucide.createIcons();
  }, [user, loading, authScreen, isResetScreen]);

  if (loading) {
    return (
      <div class="min-h-screen flex items-center justify-center bg-slate-900">
        <div class="text-center space-y-4">
          <div class="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p class="text-sm font-semibold text-slate-400">Loading Universal AI...</p>
        </div>
      </div>
    );
  }

  // Route to Password Reset screen directly if link matches
  if (isResetScreen) {
    return <ResetPasswordScreen email={params.email} />;
  }

  if (!user) {
    if (authScreen === 'signup') {
      return <Signup onSwitchScreen={setAuthScreen} />;
    } else if (authScreen === 'forgot') {
      return <ForgotPassword onSwitchScreen={setAuthScreen} />;
    }
    return <Login onSwitchScreen={setAuthScreen} />;
  }

  return (
    <div class="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-darkbg-primary font-sans">
      
      {/* Sidebar Panel */}
      <Sidebar 
        isMobileOpen={isMobileSidebarOpen}
        closeMobileSidebar={() => setIsMobileSidebarOpen(false)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Chat Panel View */}
      <ChatWindow 
        openMobileSidebar={() => setIsMobileSidebarOpen(true)}
      />

      {/* User Preferences & Configurations Modal */}
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}

// Sub-component for resetting password from email links
function ResetPasswordScreen({ email }) {
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [success, setSuccess] = React.useState(false);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, new_password: newPassword })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Password reset failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-tr from-slate-900 via-darkbg-primary to-slate-850 px-4">
      <div class="max-w-md w-full space-y-8 bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl">
        <div class="text-center">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white shadow-lg shadow-brand-500/30 mb-4">
            <i data-lucide="shield-check" class="w-8 h-8"></i>
          </div>
          <h2 class="font-display text-3xl font-extrabold tracking-tight text-white">
            Set New Password
          </h2>
          <p class="mt-2 text-sm text-slate-400">
            For account: <span class="font-semibold text-brand-400">{email}</span>
          </p>
        </div>

        {error && (
          <div class="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-4 rounded-xl flex items-center gap-3">
            <i data-lucide="alert-circle" class="w-5 h-5 shrink-0"></i>
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div class="text-center space-y-4">
            <div class="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm p-4 rounded-xl flex items-center gap-3 justify-center">
              <i data-lucide="check-circle" class="w-5 h-5"></i>
              <span>Password reset completed successfully.</span>
            </div>
            <button
              onClick={() => window.location.href = '/'}
              class="w-full py-3 px-4 rounded-xl text-white bg-brand-600 hover:bg-brand-500 font-semibold shadow-md transition"
            >
              Go to Login
            </button>
          </div>
        ) : (
          <form class="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div class="space-y-4">
              <div>
                <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  class="block w-full px-4 py-3 bg-slate-950/40 border border-slate-800 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-white placeholder-slate-500 transition duration-150"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  class="block w-full px-4 py-3 bg-slate-950/40 border border-slate-800 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-white placeholder-slate-500 transition duration-150"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                class="w-full flex justify-center py-3.5 px-4 font-medium rounded-xl text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 shadow-lg shadow-brand-500/25 transition disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Update Password'}
              </button>
            </div>
          </form>
        )}
      </div>
      <script>
        {setTimeout(() => lucide.createIcons(), 50)}
      </script>
    </div>
  );
}

// Mount the components
const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);
root.render(
  <AuthProvider>
    <ThemeProvider>
      <ChatProvider>
        <App />
      </ChatProvider>
    </ThemeProvider>
  </AuthProvider>
);
