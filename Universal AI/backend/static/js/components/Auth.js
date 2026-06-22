function Login({ onSwitchScreen }) {
  const { login } = useAuth();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-tr from-slate-900 via-darkbg-primary to-slate-850 px-4">
      <div class="max-w-md w-full space-y-8 bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl">
        <div class="text-center">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white shadow-lg shadow-brand-500/30 mb-4">
            <i data-lucide="bot" class="w-8 h-8"></i>
          </div>
          <h2 class="font-display text-3xl font-extrabold tracking-tight text-white">
            Universal AI
          </h2>
          <p class="mt-2 text-sm text-slate-400">
            Sign in to start chatting with your AI assistant
          </p>
        </div>

        {error && (
          <div class="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-4 rounded-xl flex items-center gap-3">
            <i data-lucide="alert-circle" class="w-5 h-5 shrink-0"></i>
            <span>{error}</span>
          </div>
        )}

        <form class="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
              <div class="relative">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <i data-lucide="mail" class="w-5 h-5"></i>
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  class="block w-full pl-10 pr-4 py-3 bg-slate-950/40 border border-slate-800 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-white placeholder-slate-500 transition duration-150"
                  placeholder="name@example.com"
                />
              </div>
            </div>
            
            <div>
              <div class="flex justify-between items-center mb-2">
                <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Password</label>
                <button
                  type="button"
                  onClick={() => onSwitchScreen('forgot')}
                  class="text-xs font-medium text-brand-400 hover:text-brand-300"
                >
                  Forgot password?
                </button>
              </div>
              <div class="relative">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <i data-lucide="lock" class="w-5 h-5"></i>
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  class="block w-full pl-10 pr-4 py-3 bg-slate-950/40 border border-slate-800 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-white placeholder-slate-500 transition duration-150"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              class="group relative w-full flex justify-center py-3.5 px-4 border border-transparent font-medium rounded-xl text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 shadow-lg shadow-brand-500/25 transition duration-150 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </div>
        </form>

        <div class="text-center mt-4">
          <p class="text-sm text-slate-400">
            Don't have an account?{' '}
            <button
              onClick={() => onSwitchScreen('signup')}
              class="font-medium text-brand-400 hover:text-brand-300 transition duration-150"
            >
              Create an account
            </button>
          </p>
        </div>
      </div>
      <script>
        {setTimeout(() => lucide.createIcons(), 50)}
      </script>
    </div>
  );
}

function Signup({ onSwitchScreen }) {
  const { signup } = useAuth();
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signup(name, email, password);
    } catch (err) {
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-tr from-slate-900 via-darkbg-primary to-slate-850 px-4">
      <div class="max-w-md w-full space-y-8 bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl">
        <div class="text-center">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white shadow-lg shadow-brand-500/30 mb-4">
            <i data-lucide="user-plus" class="w-8 h-8"></i>
          </div>
          <h2 class="font-display text-3xl font-extrabold tracking-tight text-white">
            Create Account
          </h2>
          <p class="mt-2 text-sm text-slate-400">
            Get started with Universal AI assistant for free
          </p>
        </div>

        {error && (
          <div class="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-4 rounded-xl flex items-center gap-3">
            <i data-lucide="alert-circle" class="w-5 h-5 shrink-0"></i>
            <span>{error}</span>
          </div>
        )}

        <form class="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
              <div class="relative">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <i data-lucide="user" class="w-5 h-5"></i>
                </span>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  class="block w-full pl-10 pr-4 py-3 bg-slate-950/40 border border-slate-800 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-white placeholder-slate-500 transition duration-150"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
              <div class="relative">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <i data-lucide="mail" class="w-5 h-5"></i>
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  class="block w-full pl-10 pr-4 py-3 bg-slate-950/40 border border-slate-800 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-white placeholder-slate-500 transition duration-150"
                  placeholder="name@example.com"
                />
              </div>
            </div>
            
            <div>
              <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Password</label>
              <div class="relative">
                <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <i data-lucide="lock" class="w-5 h-5"></i>
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  class="block w-full pl-10 pr-4 py-3 bg-slate-950/40 border border-slate-800 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-white placeholder-slate-500 transition duration-150"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              class="group relative w-full flex justify-center py-3.5 px-4 border border-transparent font-medium rounded-xl text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 shadow-lg shadow-brand-500/25 transition duration-150 disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </div>
        </form>

        <div class="text-center mt-4">
          <p class="text-sm text-slate-400">
            Already have an account?{' '}
            <button
              onClick={() => onSwitchScreen('login')}
              class="font-medium text-brand-400 hover:text-brand-300 transition duration-150"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
      <script>
        {setTimeout(() => lucide.createIcons(), 50)}
      </script>
    </div>
  );
}

function ForgotPassword({ onSwitchScreen }) {
  const [email, setEmail] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [devLink, setDevLink] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setDevLink('');
    setLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      
      setMessage(data.message);
      if (data.dev_reset_link) {
        setDevLink(data.dev_reset_link);
      }
    } catch (err) {
      setError(err.message || 'Request failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-tr from-slate-900 via-darkbg-primary to-slate-850 px-4">
      <div class="max-w-md w-full space-y-8 bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl">
        <div class="text-center">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white shadow-lg shadow-brand-500/30 mb-4">
            <i data-lucide="key-round" class="w-8 h-8"></i>
          </div>
          <h2 class="font-display text-3xl font-bold tracking-tight text-white">
            Reset Password
          </h2>
          <p class="mt-2 text-sm text-slate-400">
            Enter your email to request password reset instructions
          </p>
        </div>

        {error && (
          <div class="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-4 rounded-xl flex items-center gap-3">
            <i data-lucide="alert-circle" class="w-5 h-5 shrink-0"></i>
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div class="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm p-4 rounded-xl space-y-2">
            <div class="flex items-center gap-3">
              <i data-lucide="check-circle" class="w-5 h-5 shrink-0"></i>
              <span>{message}</span>
            </div>
            {devLink && (
              <div class="mt-2 p-2 bg-slate-950 rounded border border-slate-800 text-xs break-all">
                <strong>Dev Reset Link:</strong><br/>
                <a href={devLink} class="text-brand-400 hover:underline">{devLink}</a>
              </div>
            )}
          </div>
        )}

        <form class="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <i data-lucide="mail" class="w-5 h-5"></i>
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                class="block w-full pl-10 pr-4 py-3 bg-slate-950/40 border border-slate-800 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-white placeholder-slate-500 transition duration-150"
                placeholder="name@example.com"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              class="group relative w-full flex justify-center py-3.5 px-4 border border-transparent font-medium rounded-xl text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 focus:outline-none shadow-lg shadow-brand-500/25 transition duration-150 disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Password Reset Link'}
            </button>
          </div>
        </form>

        <div class="text-center mt-4">
          <button
            onClick={() => onSwitchScreen('login')}
            class="font-medium text-brand-400 hover:text-brand-300 text-sm transition duration-150"
          >
            Back to Sign In
          </button>
        </div>
      </div>
      <script>
        {setTimeout(() => lucide.createIcons(), 50)}
      </script>
    </div>
  );
}
