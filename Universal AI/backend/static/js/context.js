const { createContext, useState, useEffect, useContext } = React;

// Create Context instances
const AuthContext = createContext();
const ThemeContext = createContext();
const ChatContext = createContext();

// Helper API caller
const apiRequest = async (url, options = {}) => {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
  }
  
  return response.json();
};

// Auth Context Provider Component
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyToken = async () => {
      if (token) {
        try {
          const data = await apiRequest('/api/auth/profile');
          setUser(data.user);
        } catch (e) {
          logout();
        }
      }
      setLoading(false);
    };
    verifyToken();
  }, [token]);

  const login = async (email, password) => {
    const data = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    localStorage.setItem('token', data.access_token);
    setToken(data.access_token);
    setUser(data.user);
    return data;
  };

  const signup = async (name, email, password) => {
    const data = await apiRequest('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    });
    localStorage.setItem('token', data.access_token);
    setToken(data.access_token);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (profileData) => {
    const data = await apiRequest('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
    setUser(data.user);
    return data;
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

// Theme Context Provider Component
function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Chat Context Provider Component
function ChatProvider({ children }) {
  const { token, user } = useContext(AuthContext);
  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [currentChat, setCurrentChat] = useState(null);
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [streaming, setStreaming] = useState(false);

  // Fetch list of chats
  const loadChats = async () => {
    if (!token) return;
    setLoadingChats(true);
    try {
      const data = await apiRequest('/api/chats');
      setChats(data.chats);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingChats(false);
    }
  };

  // Select and load history of a chat
  const selectChat = async (id) => {
    if (!token || !id) return;
    setLoadingHistory(true);
    setCurrentChatId(id);
    try {
      const data = await apiRequest(`/api/chats/${id}`);
      setCurrentChat(data.chat);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Create new chat
  const createChat = async (title = 'New Conversation') => {
    if (!token) return;
    try {
      const data = await apiRequest('/api/chats', {
        method: 'POST',
        body: JSON.stringify({ title })
      });
      setChats(prev => [data.chat, ...prev]);
      setCurrentChatId(data.chat.id);
      setCurrentChat({ ...data.chat, messages: [] });
      return data.chat;
    } catch (e) {
      console.error(e);
    }
  };

  // Rename chat title
  const renameChat = async (id, title) => {
    if (!token) return;
    try {
      await apiRequest(`/api/chats/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ title })
      });
      setChats(prev => prev.map(c => c.id === id ? { ...c, title } : c));
      if (currentChatId === id) {
        setCurrentChat(prev => ({ ...prev, title }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete chat
  const deleteChat = async (id) => {
    if (!token) return;
    try {
      await apiRequest(`/api/chats/${id}`, { method: 'DELETE' });
      setChats(prev => prev.filter(c => c.id !== id));
      if (currentChatId === id) {
        setCurrentChatId(null);
        setCurrentChat(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Toggle chat bookmark status
  const toggleBookmark = async (id, isBookmarked) => {
    if (!token) return;
    try {
      await apiRequest(`/api/chats/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_bookmarked: isBookmarked })
      });
      setChats(prev => prev.map(c => c.id === id ? { ...c, is_bookmarked: isBookmarked } : c));
      if (currentChatId === id) {
        setCurrentChat(prev => ({ ...prev, is_bookmarked: isBookmarked }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Upload file attachment (PDF or Image)
  const uploadFile = async (fileObj) => {
    if (!token) return;
    const formData = new FormData();
    formData.append('file', fileObj);
    
    const response = await fetch('/api/chats/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || "File upload failed");
    }
    
    return response.json();
  };

  // Stream send message to Gemini API
  const sendMessage = async (messageText, attachment = null, systemInstruction = '') => {
    if (!token || !currentChatId) return;

    // 1. Prepare chat input UI state
    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: messageText,
      file_name: attachment ? attachment.file_name : null,
      file_type: attachment ? attachment.file_type : null,
      created_at: new Date().toISOString()
    };

    setCurrentChat(prev => ({
      ...prev,
      messages: [...prev.messages, userMsg]
    }));
    
    setStreaming(true);

    // 2. Fetch config settings (custom API Key, custom instructions)
    const storedApiKey = localStorage.getItem('gemini_api_key') || '';
    const storedInstruction = localStorage.getItem('system_instruction') || '';
    const activeInstruction = systemInstruction || storedInstruction;

    // Create placeholder message for Assistant response
    const assistantMsgId = Date.now() + 1;
    const assistantPlaceholder = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString()
    };

    setCurrentChat(prev => ({
      ...prev,
      messages: [...prev.messages, assistantPlaceholder]
    }));

    try {
      // 3. Make fetch request to the streaming AI endpoint
      const response = await fetch(`/api/ai/chat/${currentChatId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: messageText,
          system_instruction: activeInstruction,
          custom_api_key: storedApiKey,
          file_name: attachment ? attachment.file_name : null,
          file_type: attachment ? attachment.file_type : null,
          extracted_text: attachment ? attachment.extracted_text : null
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let accumulatedText = "";

      // 4. Stream reading loop
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = decoder.decode(value, { stream: !done });
          accumulatedText += chunk;
          
          // Live update message text in state
          setCurrentChat(prev => {
            const updatedMessages = prev.messages.map(m => {
              if (m.id === assistantMsgId) {
                return { ...m, content: accumulatedText };
              }
              return m;
            });
            return { ...prev, messages: updatedMessages };
          });
        }
      }

      // Reload chats to refresh the title (e.g. if the default "New Conversation" title was updated)
      await loadChats();

    } catch (e) {
      console.error("AI Generation Error: ", e);
      setCurrentChat(prev => {
        const updatedMessages = prev.messages.map(m => {
          if (m.id === assistantMsgId) {
            return { ...m, content: `Error generating response: ${e.message}. Please verify your network connection or API Key.` };
          }
          return m;
        });
        return { ...prev, messages: updatedMessages };
      });
    } finally {
      setStreaming(false);
    }
  };

  // Load chat session list when user logs in
  useEffect(() => {
    if (token) {
      loadChats();
    } else {
      setChats([]);
      setCurrentChat(null);
      setCurrentChatId(null);
    }
  }, [token]);

  return (
    <ChatContext.Provider value={{
      chats, currentChatId, currentChat, loadingChats, loadingHistory, streaming,
      loadChats, selectChat, createChat, renameChat, deleteChat, toggleBookmark, uploadFile, sendMessage
    }}>
      {children}
    </ChatContext.Provider>
  );
}

// Custom hook exports
const useAuth = () => useContext(AuthContext);
const useTheme = () => useContext(ThemeContext);
const useChat = () => useContext(ChatContext);
