function ChatWindow({ openMobileSidebar }) {
  const { currentChat, selectChat, createChat, streaming, sendMessage, uploadFile } = useChat();
  const [inputText, setInputText] = React.useState('');
  const [attachment, setAttachment] = React.useState(null);
  const [uploading, setUploading] = React.useState(false);
  const [isListening, setIsListening] = React.useState(false);
  const [activeSpeechId, setActiveSpeechId] = React.useState(null);
  const [selectedTask, setSelectedTask] = React.useState('General');
  const [selectedModel, setSelectedModel] = React.useState('Gemini 1.5 Flash');
  const messagesEndRef = React.useRef(null);
  const fileInputRef = React.useRef(null);
  const textRef = React.useRef(null);

  // Parse markdown content inside helper
  const renderMarkdown = (text) => {
    try {
      return { __html: marked.parse(text) };
    } catch (e) {
      return { __html: text };
    }
  };

  // Re-run highlighting whenever messages update
  React.useEffect(() => {
    setTimeout(() => {
      document.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block);
      });
    }, 100);
    scrollToBottom();
  }, [currentChat?.messages]);

  React.useEffect(() => {
    lucide.createIcons();
    // Auto-grow input text area
    if (textRef.current) {
      textRef.current.style.height = 'auto';
      textRef.current.style.height = `${Math.min(textRef.current.scrollHeight, 180)}px`;
    }
  }, [inputText, attachment, currentChat, streaming, isListening]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !attachment) return;

    let chatSessionId = currentChat?.id;
    if (!chatSessionId) {
      // Automatically create a chat session if user posts on empty home state
      const newChat = await createChat(inputText.trim() ? inputText.substring(0, 30) : 'File Upload Chat');
      chatSessionId = newChat.id;
    }

    const messageToSend = inputText;
    const activeAttachment = attachment;
    
    setInputText('');
    setAttachment(null);

    // Resolve system prompt wrapper based on active task
    let systemInstruction = "";
    if (selectedTask === 'Translation') {
      systemInstruction = "You are a specialized language translator. Please translate the user text accurately to the target language requested, preserving formatting and context.";
    } else if (selectedTask === 'Essay') {
      systemInstruction = "You are a professional essay writer. Write structured, academic essays with clear introduction, body paragraphs, and conclusions, incorporating standard citations.";
    } else if (selectedTask === 'Code') {
      systemInstruction = "You are an expert software engineer. Provide detailed explanation of code fragments, compile outputs conceptually, point out bugs, and offer optimized logic blocks.";
    } else if (selectedTask === 'Resume') {
      systemInstruction = "You are an expert resume writer. Help the user construct structured, elegant resumes, cover letters, and LinkedIn summaries optimized for applicant tracking systems (ATS).";
    }

    await sendMessage(messageToSend, activeAttachment, systemInstruction);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle uploading files (image/PDF)
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const data = await uploadFile(file);
      setAttachment({
        file_name: data.file_name,
        file_type: data.file_type,
        url: data.url,
        extracted_text: data.extracted_text || null
      });
    } catch (err) {
      alert("File upload failed: " + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Handle Voice Input (Speech to Text)
  const toggleListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Web Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    // Map current user preference language to STT if possible, default to en-US
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (e) => {
      console.error(e);
      setIsListening(false);
    };
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInputText(prev => prev + (prev ? " " : "") + transcript);
    };

    recognition.start();
  };

  // Handle Voice Output (Text to Speech)
  const handleSpeak = (messageId, text) => {
    if (!('speechSynthesis' in window)) {
      alert("Text-to-speech is not supported in your browser.");
      return;
    }

    if (activeSpeechId === messageId) {
      window.speechSynthesis.cancel();
      setActiveSpeechId(null);
      return;
    }

    window.speechSynthesis.cancel(); // Stop any current speech
    
    // Clean markdown characters for pleasant pronunciation
    const cleanText = text
      .replace(/[*_`#]/g, '')
      .replace(/\[.*?\]\(.*?\)/g, '') // strip links
      .replace(/```[\s\S]*?```/g, 'Code block omitted.'); // skip reading long code snippets

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.onend = () => setActiveSpeechId(null);
    utterance.onerror = () => setActiveSpeechId(null);
    
    setActiveSpeechId(messageId);
    window.speechSynthesis.speak(utterance);
  };

  // Handle PDF Export
  const exportPDF = () => {
    if (!currentChat || !currentChat.messages.length) return;
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let yPos = 20;

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(16);
    doc.text(`Conversation Export: ${currentChat.title}`, 20, yPos);
    yPos += 12;

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Date Exported: ${new Date().toLocaleString()}`, 20, yPos);
    yPos += 15;

    currentChat.messages.forEach((msg) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10);
      doc.text(`${msg.role === 'user' ? 'YOU' : 'AI ASSISTANT'}:`, 20, yPos);
      yPos += 5;

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9.5);
      const wrappedText = doc.splitTextToSize(msg.content, 170);
      wrappedText.forEach(line => {
        if (yPos > 280) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(line, 20, yPos);
        yPos += 5.5;
      });

      yPos += 6;
    });

    doc.save(`${currentChat.title.replace(/\s+/g, '_')}_history.pdf`);
  };

  // Pre-fill quick task selections
  const handleQuickAction = (actionText) => {
    setInputText(actionText);
    if (textRef.current) textRef.current.focus();
  };

  return (
    <div class="flex-1 flex flex-col h-full bg-slate-50 dark:bg-darkbg-primary overflow-hidden">
      
      {/* Top Navbar */}
      <header class="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-darkbg-secondary/70 backdrop-blur-md shrink-0">
        <div class="flex items-center gap-3">
          <button onClick={openMobileSidebar} class="lg:hidden p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-500 transition">
            <i data-lucide="menu" class="w-5 h-5"></i>
          </button>
          
          <div class="flex flex-col">
            <h1 class="text-sm font-bold text-slate-800 dark:text-white truncate max-w-[200px] sm:max-w-xs font-display">
              {currentChat?.title || 'Universal AI Assistant'}
            </h1>
            <p class="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Active Workspace</p>
          </div>
        </div>

        {/* Configurations Header Settings */}
        <div class="flex items-center gap-2">
          {/* Export PDF Button */}
          {currentChat && currentChat.messages.length > 0 && (
            <button 
              onClick={exportPDF} 
              title="Export Conversation as PDF"
              class="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-brand-500 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-850 transition"
            >
              <i data-lucide="download" class="w-4 h-4"></i>
            </button>
          )}

          {/* Model Selector Dropdown */}
          <select 
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            class="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 focus:outline-none text-slate-700 dark:text-slate-300 font-medium"
          >
            <option>Gemini 1.5 Flash</option>
            <option>Gemini 1.5 Pro</option>
          </select>

          {/* Mode Selector */}
          <select 
            value={selectedTask}
            onChange={(e) => setSelectedTask(e.target.value)}
            class="hidden sm:block text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 focus:outline-none text-slate-700 dark:text-slate-300 font-medium"
          >
            <option value="General">General Mode</option>
            <option value="Translation">Translation</option>
            <option value="Essay">Essay Writing</option>
            <option value="Code">Code Helper</option>
            <option value="Resume">Resume Draft</option>
          </select>
        </div>
      </header>

      {/* Messages Scroll Panel */}
      <div class="flex-1 overflow-y-auto px-4 py-6 space-y-6 no-scrollbar">
        {!currentChat || currentChat.messages.length === 0 ? (
          /* Empty Welcoming State */
          <div class="max-w-2xl mx-auto text-center py-12 px-4">
            <h2 class="font-display text-3xl font-extrabold text-slate-800 dark:text-white bg-gradient-to-r from-brand-500 to-indigo-500 bg-clip-text text-transparent mb-2">
              Hello, {useAuth().user?.name || 'User'}
            </h2>
            <p class="text-sm text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto">
              Welcome to Universal AI. Choose a preset shortcut task below or send a prompt to get started.
            </p>

            {/* Quick action grid cards */}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                onClick={() => handleQuickAction("Explain Javascript promises and asynchronous event loops in simple words.")}
                class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 text-left hover:border-brand-500 dark:hover:border-brand-500/50 hover:bg-brand-50/50 dark:hover:bg-slate-850/50 cursor-pointer shadow-sm transition duration-150 group"
              >
                <div class="text-brand-500 mb-2">
                  <i data-lucide="code" class="w-6 h-6"></i>
                </div>
                <h3 class="font-semibold text-sm text-slate-800 dark:text-white mb-1">Explain Programming</h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 truncate">Promises, async loops, variables, and models</p>
              </div>

              <div 
                onClick={() => handleQuickAction("Show me the latest news updates and current global affairs summary.")}
                class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 text-left hover:border-brand-500 dark:hover:border-brand-500/50 hover:bg-brand-50/50 dark:hover:bg-slate-850/50 cursor-pointer shadow-sm transition duration-150"
              >
                <div class="text-blue-500 mb-2">
                  <i data-lucide="globe" class="w-6 h-6"></i>
                </div>
                <h3 class="font-semibold text-sm text-slate-800 dark:text-white mb-1">Real-Time News</h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 truncate">Fetches latest headlines, tech events, updates</p>
              </div>

              <div 
                onClick={() => handleQuickAction("Translate this sentence into German, Tamil, and Spanish: 'Knowledge is power, but actions create change.'")}
                class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 text-left hover:border-brand-500 dark:hover:border-brand-500/50 hover:bg-brand-50/50 dark:hover:bg-slate-850/50 cursor-pointer shadow-sm transition duration-150"
              >
                <div class="text-violet-500 mb-2">
                  <i data-lucide="languages" class="w-6 h-6"></i>
                </div>
                <h3 class="font-semibold text-sm text-slate-800 dark:text-white mb-1">Translate Multilingual</h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 truncate">English, Tamil, Hindi, French, Spanish translation</p>
              </div>

              <div 
                onClick={() => handleQuickAction("What is the current live weather report for Chennai right now?")}
                class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 text-left hover:border-brand-500 dark:hover:border-brand-500/50 hover:bg-brand-50/50 dark:hover:bg-slate-850/50 cursor-pointer shadow-sm transition duration-150"
              >
                <div class="text-amber-500 mb-2">
                  <i data-lucide="cloud-sun" class="w-6 h-6"></i>
                </div>
                <h3 class="font-semibold text-sm text-slate-800 dark:text-white mb-1">Get Weather Report</h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 truncate">Keyless fetching of temperatures and conditions</p>
              </div>
            </div>
          </div>
        ) : (
          /* Render messages lists */
          <div class="max-w-3xl mx-auto space-y-6">
            {currentChat.messages.map((msg) => {
              const isUser = msg.role === 'user';
              const isSpeaking = activeSpeechId === msg.id;

              return (
                <div key={msg.id} class={`flex gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
                  {/* Assistant Avatar */}
                  {!isUser && (
                    <div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shrink-0 mt-1 shadow-sm">
                      <i data-lucide="bot" class="w-4 h-4"></i>
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div class="max-w-[85%] flex flex-col gap-1.5">
                    <div class={`
                      px-4 py-3 rounded-2xl text-sm leading-relaxed border transition shadow-sm
                      ${isUser 
                        ? 'bg-brand-600 border-brand-700 text-white rounded-tr-none' 
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-850 dark:text-slate-100 rounded-tl-none'}
                    `}>
                      {/* Attached file tag rendering if exists */}
                      {isUser && msg.file_name && (
                        <div class="mb-2 p-2 bg-brand-700/50 rounded-lg text-xs flex items-center gap-2 border border-brand-500/20">
                          <i data-lucide={msg.file_type?.startsWith('image/') ? 'image' : 'file-text'} class="w-4 h-4 text-brand-200"></i>
                          <span class="font-semibold text-brand-100 truncate max-w-[150px]">{msg.file_name}</span>
                          <span class="text-[10px] text-brand-300 font-bold uppercase">({msg.file_type?.split('/')[1]})</span>
                        </div>
                      )}

                      {/* Content block */}
                      {isUser ? (
                        <p class="whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <div 
                          class="prose prose-slate dark:prose-invert prose-sm max-w-none prose-pre:p-0 prose-pre:bg-transparent"
                          dangerouslySetInnerHTML={renderMarkdown(msg.content || '...')} 
                        />
                      )}
                    </div>

                    {/* Metadata / Actions Bar */}
                    <div class={`flex items-center gap-3 text-[10px] text-slate-500 ${isUser ? 'justify-end' : 'justify-start'}`}>
                      <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      
                      {!isUser && msg.content && (
                        <>
                          {/* Speak Button */}
                          <button 
                            onClick={() => handleSpeak(msg.id, msg.content)}
                            class={`hover:text-brand-500 dark:hover:text-brand-400 p-0.5 rounded transition ${isSpeaking ? 'text-brand-500' : ''}`}
                            title={isSpeaking ? "Stop Reading" : "Read Aloud"}
                          >
                            <i data-lucide={isSpeaking ? "volume-x" : "volume-2"} class="w-3.5 h-3.5"></i>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* User Avatar */}
                  {isUser && (
                    <div class="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border border-slate-300 dark:border-slate-700 flex items-center justify-center uppercase shrink-0 mt-1">
                      {useAuth().user?.name?.charAt(0) || 'U'}
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* Live streaming message cursor animation */}
            {streaming && currentChat.messages[currentChat.messages.length - 1]?.role === 'user' && (
              <div class="flex gap-4 justify-start">
                <div class="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white shrink-0 mt-1">
                  <i data-lucide="bot" class="w-4 h-4"></i>
                </div>
                <div class="px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-tl-none max-w-[80%] flex items-center shadow-sm">
                  <span class="typing-cursor text-slate-500">Writing response</span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message Chat Input Area */}
      <footer class="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-darkbg-secondary shrink-0">
        <form onSubmit={handleSend} class="max-w-3xl mx-auto">
          {/* File Thumbnail Attachment Preview */}
          {attachment && (
            <div class="mb-3 p-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl flex items-center justify-between">
              <div class="flex items-center gap-2 min-w-0">
                <div class="p-1.5 rounded-lg bg-brand-50 dark:bg-slate-800 text-brand-500">
                  <i data-lucide={attachment.file_type.startsWith('image/') ? 'image' : 'file-text'} class="w-4 h-4"></i>
                </div>
                <div class="min-w-0">
                  <p class="text-xs font-semibold text-slate-800 dark:text-white truncate max-w-[200px]">{attachment.file_name}</p>
                  <p class="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">{attachment.file_type.split('/')[1]}</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setAttachment(null)}
                class="p-1 rounded-lg text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-red-500 transition"
              >
                <i data-lucide="x" class="w-4 h-4"></i>
              </button>
            </div>
          )}

          {/* Text input, voice output keys */}
          <div class="flex items-end gap-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-1.5 shadow-inner">
            
            {/* Attachment Button */}
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              class="hidden" 
              accept=".pdf,image/png,image/jpeg,image/jpg" 
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current.click()}
              class="p-2.5 rounded-xl text-slate-500 hover:text-brand-500 hover:bg-slate-200 dark:hover:bg-slate-850 transition disabled:opacity-50"
              title="Attach PDF or Image"
            >
              {uploading ? (
                <div class="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <i data-lucide="paperclip" class="w-5 h-5"></i>
              )}
            </button>

            {/* Speech to Text Microphone */}
            <button
              type="button"
              onClick={toggleListening}
              class={`p-2.5 rounded-xl text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-850 transition duration-150 ${isListening ? 'text-red-500 bg-red-500/10 hover:bg-red-500/20 animate-pulse' : 'hover:text-brand-500'}`}
              title={isListening ? "Listening... Click to cancel" : "Voice Input (Speech-to-Text)"}
            >
              <i data-lucide={isListening ? "mic-off" : "mic"} class="w-5 h-5"></i>
            </button>

            {/* Auto-growing Text Input */}
            <textarea
              ref={textRef}
              rows="1"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything (science, weather, news, code)..."
              class="flex-1 max-h-[180px] min-h-[40px] py-2 px-1 bg-transparent border-0 focus:outline-none focus:ring-0 text-sm text-slate-800 dark:text-white placeholder-slate-500 resize-none font-sans"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={(!inputText.trim() && !attachment) || streaming}
              class="p-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold transition disabled:opacity-30 disabled:hover:bg-brand-600 shadow-md shadow-brand-600/10"
              title="Send Message"
            >
              <i data-lucide="send-horizontal" class="w-5 h-5"></i>
            </button>
          </div>
        </form>
      </footer>
    </div>
  );
}
