function Sidebar({ isMobileOpen, closeMobileSidebar, onOpenSettings }) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { chats, currentChatId, selectChat, createChat, renameChat, deleteChat, toggleBookmark } = useChat();
  
  const [search, setSearch] = React.useState('');
  const [filterStarred, setFilterStarred] = React.useState(false);
  const [editingId, setEditingId] = React.useState(null);
  const [editTitle, setEditTitle] = React.useState('');

  React.useEffect(() => {
    lucide.createIcons();
  }, [chats, currentChatId, editingId, search, filterStarred]);

  const handleCreateChat = async () => {
    await createChat();
    if (isMobileOpen) closeMobileSidebar();
  };

  const handleSelectChat = (id) => {
    selectChat(id);
    if (isMobileOpen) closeMobileSidebar();
  };

  const startRename = (e, chat) => {
    e.stopPropagation();
    setEditingId(chat.id);
    setEditTitle(chat.title);
  };

  const saveRename = async (e, id) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      await renameChat(id, editTitle);
    }
    setEditingId(null);
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this conversation?")) {
      await deleteChat(id);
    }
  };

  const handleToggleBookmark = async (e, id, currentStatus) => {
    e.stopPropagation();
    await toggleBookmark(id, !currentStatus);
  };

  // Filter conversations
  const filteredChats = chats.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase());
    const matchesStar = !filterStarred || c.is_bookmarked;
    return matchesSearch && matchesStar;
  });

  // Group by timeline (Today, Yesterday, Previous Days)
  const getTimelineGroup = (dateStr) => {
    const chatDate = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    
    if (chatDate.toDateString() === today.toDateString()) return 'Today';
    if (chatDate.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return 'Older Conversations';
  };

  const groupedChats = filteredChats.reduce((groups, chat) => {
    const group = getTimelineGroup(chat.updated_at);
    if (!groups[group]) groups[group] = [];
    groups[group].push(chat);
    return groups;
  }, {});

  const timelineOrder = ['Today', 'Yesterday', 'Older Conversations'];

  return (
    <div class={`
      fixed inset-y-0 left-0 z-40 w-72 flex flex-col bg-slate-900 border-r border-slate-800 transition-transform duration-300 transform
      lg:static lg:translate-x-0
      ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
    `}>
      {/* Sidebar Header */}
      <div class="p-4 flex items-center justify-between border-b border-slate-800">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
            <i data-lucide="bot" class="w-5 h-5"></i>
          </div>
          <span class="font-display font-bold text-lg text-white">Universal AI</span>
        </div>
        
        {/* Mobile close button */}
        <button onClick={closeMobileSidebar} class="lg:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>
      </div>

      {/* Action Buttons */}
      <div class="p-4 space-y-3 shrink-0">
        <button 
          onClick={handleCreateChat}
          class="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-dashed border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 hover:bg-slate-800/50 transition duration-150"
        >
          <i data-lucide="plus" class="w-4 h-4"></i>
          <span class="text-sm font-medium">New Conversation</span>
        </button>

        {/* Search */}
        <div class="relative">
          <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
            <i data-lucide="search" class="w-4 h-4"></i>
          </span>
          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            class="w-full pl-9 pr-3 py-2 bg-slate-950/40 border border-slate-850 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
          />
        </div>

        {/* Filter Tab */}
        <div class="flex bg-slate-950/60 p-0.5 rounded-lg border border-slate-850">
          <button 
            onClick={() => setFilterStarred(false)}
            class={`flex-1 py-1.5 text-xs font-semibold rounded-md transition ${!filterStarred ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
          >
            All Chats
          </button>
          <button 
            onClick={() => setFilterStarred(true)}
            class={`flex-1 py-1.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1 transition ${filterStarred ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <i data-lucide="star" class="w-3.5 h-3.5 fill-current"></i>
            <span>Starred</span>
          </button>
        </div>
      </div>

      {/* Conversations Scroll Area */}
      <div class="flex-1 overflow-y-auto px-3 py-2 no-scrollbar">
        {filteredChats.length === 0 ? (
          <div class="text-center py-8">
            <i data-lucide="message-square-dashed" class="w-8 h-8 text-slate-600 mx-auto mb-2"></i>
            <p class="text-xs text-slate-500">No conversations found</p>
          </div>
        ) : (
          timelineOrder.map(group => {
            const list = groupedChats[group];
            if (!list || list.length === 0) return null;
            return (
              <div key={group} class="mb-4">
                <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider px-2 mb-2">{group}</h3>
                <div class="space-y-1">
                  {list.map(chat => {
                    const isActive = currentChatId === chat.id;
                    const isEditing = editingId === chat.id;
                    
                    return (
                      <div
                        key={chat.id}
                        onClick={() => !isEditing && handleSelectChat(chat.id)}
                        class={`
                          group/item flex items-center justify-between px-3 py-2.5 rounded-xl text-sm cursor-pointer transition duration-150 relative
                          ${isActive ? 'bg-slate-800/80 text-white border-l-2 border-brand-500' : 'text-slate-400 hover:bg-slate-850/50 hover:text-slate-200'}
                        `}
                      >
                        {isEditing ? (
                          <div class="flex items-center gap-1 w-full" onClick={e => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && saveRename(e, chat.id)}
                              class="w-full bg-slate-900 border border-slate-750 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none"
                              autoFocus
                            />
                            <button onClick={(e) => saveRename(e, chat.id)} class="p-0.5 text-emerald-400 hover:bg-slate-800 rounded">
                              <i data-lucide="check" class="w-3.5 h-3.5"></i>
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setEditingId(null); }} class="p-0.5 text-red-400 hover:bg-slate-800 rounded">
                              <i data-lucide="x" class="w-3.5 h-3.5"></i>
                            </button>
                          </div>
                        ) : (
                          <>
                            <span class="truncate pr-16 font-medium">{chat.title}</span>
                            
                            {/* Actions overlay */}
                            <div class="absolute right-2 flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity bg-gradient-to-l from-slate-900 pl-4 py-0.5 group-hover/item:from-slate-850 lg:group-hover/item:from-slate-850 group-hover/item:text-slate-400">
                              {/* Star bookmark toggle */}
                              <button 
                                onClick={(e) => handleToggleBookmark(e, chat.id, chat.is_bookmarked)}
                                class={`p-1 rounded hover:bg-slate-800 hover:text-yellow-400 ${chat.is_bookmarked ? 'text-yellow-500' : 'text-slate-500'}`}
                              >
                                <i data-lucide="star" class={`w-3.5 h-3.5 ${chat.is_bookmarked ? 'fill-current' : ''}`}></i>
                              </button>
                              
                              {/* Rename */}
                              <button 
                                onClick={(e) => startRename(e, chat)}
                                class="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-white"
                              >
                                <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                              </button>
                              
                              {/* Delete */}
                              <button 
                                onClick={(e) => handleDelete(e, chat.id)}
                                class="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-red-400"
                              >
                                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Sidebar Footer User Details */}
      <div class="p-4 border-t border-slate-800 bg-slate-950/40">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-9 h-9 rounded-full bg-brand-500/20 text-brand-400 font-bold border border-brand-500/30 flex items-center justify-center uppercase shrink-0">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div class="min-w-0">
              <h4 class="text-sm font-semibold text-white truncate">{user?.name}</h4>
              <p class="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Action icons */}
        <div class="flex gap-2">
          <button 
            onClick={onOpenSettings}
            title="Settings"
            class="flex-1 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850 flex justify-center items-center gap-1.5 transition"
          >
            <i data-lucide="settings" class="w-4 h-4"></i>
            <span class="text-xs">Config</span>
          </button>
          
          <button 
            onClick={toggleTheme}
            title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
            class="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850 flex justify-center items-center transition"
          >
            <i data-lucide={theme === 'dark' ? "sun" : "moon"} class="w-4 h-4"></i>
          </button>
          
          <button 
            onClick={logout}
            title="Logout"
            class="p-2 rounded-lg bg-slate-900 border border-slate-800 text-red-500 hover:text-red-400 hover:bg-red-500/10 flex justify-center items-center transition"
          >
            <i data-lucide="log-out" class="w-4 h-4"></i>
          </button>
        </div>
      </div>
    </div>
  );
}
