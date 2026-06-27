import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  MessageSquare, 
  X, 
  Send, 
  Sparkles, 
  User, 
  Bot, 
  Brain, 
  CornerDownRight, 
  Loader2,
  ChevronDown,
  HelpCircle,
  TrendingUp,
  Sliders,
  LifeBuoy
} from "lucide-react";

interface Employee {
  id: string;
  name: string;
  department: string;
  jobRole: string;
  riskProbability?: number;
}

interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: Date;
}

interface RetentionChatbotProps {
  employees: Employee[];
  activeEmployeeId?: string | null;
  onSelectEmployee?: (empId: string) => void;
}

// Simple and highly robust inline markdown formatter to keep things lightweight and error-free
function formatMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  return lines.map((line, lineIdx) => {
    // 1. Headers (### or ## or #)
    if (line.startsWith("### ")) {
      return (
        <h4 key={lineIdx} className="text-sm font-black text-slate-900 mt-3 mb-1 font-display tracking-tight flex items-center gap-1.5 border-b border-slate-100 pb-1">
          {parseInlineFormatting(line.replace("### ", ""))}
        </h4>
      );
    }
    if (line.startsWith("## ") || line.startsWith("# ")) {
      const cleanLine = line.replace(/^#+\s+/, "");
      return (
        <h3 key={lineIdx} className="text-base font-black text-indigo-950 mt-4 mb-2 font-display tracking-tight">
          {parseInlineFormatting(cleanLine)}
        </h3>
      );
    }

    // 2. Bullet list items (* or -)
    if (line.trim().startsWith("* ") || line.trim().startsWith("- ")) {
      const cleanLine = line.trim().replace(/^[\*\-]\s+/, "");
      return (
        <li key={lineIdx} className="text-xs text-slate-700 ml-4 list-disc pl-1 py-0.5 leading-relaxed">
          {parseInlineFormatting(cleanLine)}
        </li>
      );
    }

    // 3. Numbered lists (1. or 2.)
    if (/^\d+\.\s+/.test(line.trim())) {
      const cleanLine = line.trim().replace(/^\d+\.\s+/, "");
      return (
        <li key={lineIdx} className="text-xs text-slate-700 ml-5 list-decimal pl-1 py-0.5 leading-relaxed">
          {parseInlineFormatting(cleanLine)}
        </li>
      );
    }

    // 4. Default paragraph (unless empty)
    if (line.trim() === "") {
      return <div key={lineIdx} className="h-2" />;
    }

    return (
      <p key={lineIdx} className="text-xs text-slate-700 leading-relaxed mb-1.5">
        {parseInlineFormatting(line)}
      </p>
    );
  });
}

// Parses **bold** and `code` inline patterns
function parseInlineFormatting(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let currentIdx = 0;

  // Combine regex for bold and code
  const tokenRegex = /(\*\*|`)(.*?)\1/g;
  let match;

  while ((match = tokenRegex.exec(text)) !== null) {
    const matchStart = match.index;
    const matchEnd = tokenRegex.lastIndex;

    // Add preceding text
    if (matchStart > currentIdx) {
      parts.push(text.slice(currentIdx, matchStart));
    }

    const type = match[1];
    const content = match[2];

    if (type === "**") {
      parts.push(<strong key={matchStart} className="font-extrabold text-slate-950">{content}</strong>);
    } else if (type === "`") {
      parts.push(
        <code key={matchStart} className="px-1 py-0.5 bg-slate-100 border border-slate-200 text-indigo-700 rounded font-mono text-[10px] font-semibold">
          {content}
        </code>
      );
    }

    currentIdx = matchEnd;
  }

  if (currentIdx < text.length) {
    parts.push(text.slice(currentIdx));
  }

  return parts.length > 0 ? <>{parts}</> : text;
}

export default function RetentionChatbot({ employees, activeEmployeeId, onSelectEmployee }: RetentionChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-msg",
      role: "model",
      text: "### Hello! I am your Retention.OS Senior AI Co-Pilot. 👋\nI'm ready to help you analyze employee attrition risks, inspect GBDT feature attributions, and design retainment playbooks.\n\nSelect an employee from the dropdown above to focus on their unique profile, or ask any general question!",
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [selectedEmpId, setSelectedEmpId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync state with selected active employee from the dashboard or roster
  useEffect(() => {
    if (activeEmployeeId) {
      setSelectedEmpId(activeEmployeeId);
      
      // Look up employee name to print a status update in the chat
      const empName = employees.find(e => e.id === activeEmployeeId)?.name || "selected employee";
      
      // Auto-open chatbot if a new employee is selected to make it highly collaborative
      setIsOpen(true);

      // Add a system-like notification or append to state to notify user about changed context
      setMessages(prev => {
        // Prevent duplicate spam
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && lastMsg.text.includes(`Focus calibrated to **${empName}**`)) {
          return prev;
        }
        return [
          ...prev,
          {
            id: `focus-shift-${Date.now()}`,
            role: "model",
            text: `### Calibration Update 🎯\nMy focus has been calibrated to **${empName}**. Ask me questions about their predictive factors or request a custom playook.`,
            timestamp: new Date()
          }
        ];
      });
    }
  }, [activeEmployeeId, employees]);

  // Click outside listener for dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Smooth scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const messageText = (textToSend || inputMessage).trim();
    if (!messageText || isLoading) return;

    // Clear input
    setInputMessage("");

    const newUserMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: messageText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      // Map history to server schema: list of { role: 'user' | 'model', text: string }
      const serverHistory = messages.map(msg => ({
        role: msg.role,
        text: msg.text
      }));

      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageText,
          history: serverHistory,
          employeeId: selectedEmpId || undefined
        })
      });

      const data = await res.json();
      if (data.success) {
        setMessages(prev => [
          ...prev,
          {
            id: `reply-${Date.now()}`,
            role: "model",
            text: data.reply,
            timestamp: new Date()
          }
        ]);
      } else {
        throw new Error(data.error || "Failed response");
      }
    } catch (err: any) {
      console.error("Chat connection error:", err);
      setMessages(prev => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "model",
          text: `### ⚠️ Connection Interrupted\nI am unable to reach the analytical service. Please confirm the enterprise server is online.\n\n*Error details: ${err.message || "Endpoint unreachable"}*`,
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickQuestion = (question: string) => {
    handleSendMessage(question);
  };

  const handleEmployeeSelect = (empId: string) => {
    setSelectedEmpId(empId);
    setIsDropdownOpen(false);
    if (onSelectEmployee && empId !== "") {
      onSelectEmployee(empId);
    }
  };

  const selectedEmp = employees.find(e => e.id === selectedEmpId);

  // Quick prompt suggestions based on whether an employee is selected
  const quickQuestions = selectedEmp 
    ? [
        { text: `Why is ${selectedEmp.name} at risk?`, icon: <TrendingUp className="w-3.5 h-3.5" /> },
        { text: `How can we retain ${selectedEmp.name}?`, icon: <Brain className="w-3.5 h-3.5" /> },
        { text: "What are our model parameters?", icon: <Sliders className="w-3.5 h-3.5" /> }
      ]
    : [
        { text: "Explain the GBDT classifier model", icon: <Sliders className="w-3.5 h-3.5" /> },
        { text: "What features are most important?", icon: <TrendingUp className="w-3.5 h-3.5" /> },
        { text: "How do SHAP attributions work?", icon: <HelpCircle className="w-3.5 h-3.5" /> }
      ];

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans" id="retention-copilot-container">
      <AnimatePresence>
        {!isOpen ? (
          // Floating Launcher Button
          <motion.button
            key="launcher-button"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="w-14 h-14 bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white rounded-full flex items-center justify-center shadow-xl hover:shadow-indigo-500/35 transition cursor-pointer group border border-indigo-500/30 relative"
            id="copilot-launcher-btn"
            title="Open HR Retention Co-Pilot"
          >
            {/* Pulsing glow ring */}
            <span className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping pointer-events-none" />
            
            <MessageSquare className="w-6 h-6 group-hover:scale-110 transition duration-300" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 text-[9px] text-white font-extrabold items-center justify-center">AI</span>
            </span>
          </motion.button>
        ) : (
          // Elegant Slide-Up Chat Panel
          <motion.div
            key="chat-panel"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="w-96 sm:w-[410px] h-[580px] bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-md"
            id="copilot-chat-panel"
          >
            {/* Header branding */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-indigo-500/20 border border-indigo-500/35 text-indigo-400 rounded-lg">
                  <Brain className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider font-display flex items-center gap-1.5">
                    Retention Co-Pilot
                    <span className="text-[9px] bg-emerald-500 text-slate-950 font-extrabold px-1.5 py-0.2 rounded font-mono">ONLINE</span>
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono">GBDT Interpretability Agent</p>
                </div>
              </div>

              {/* Close / Minimize */}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
                id="copilot-close-btn"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Context Dropdown Selector */}
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-2 shrink-0 relative z-20">
              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider shrink-0">
                Active Context:
              </span>

              <div className="relative flex-1" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-left text-xs text-slate-800 font-semibold flex items-center justify-between cursor-pointer hover:border-indigo-400 transition"
                  id="copilot-context-dropdown-toggle"
                >
                  <span className="truncate flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-indigo-500" />
                    {selectedEmp 
                      ? `${selectedEmp.name} (${selectedEmp.jobRole})` 
                      : "General Workspace (No Profile Selected)"}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Options */}
                <AnimatePresence>
                  {isDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="absolute left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-xl z-30 py-1"
                    >
                      <button
                        onClick={() => handleEmployeeSelect("")}
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2 ${selectedEmpId === "" ? 'bg-indigo-50/50 text-indigo-700 font-bold' : 'text-slate-600'}`}
                      >
                        <Sliders className="w-3.5 h-3.5 text-slate-400" />
                        <span>General Model & Explanations</span>
                      </button>

                      {employees.map(emp => {
                        const riskVal = emp.riskProbability ? Math.round(emp.riskProbability * 100) : null;
                        return (
                          <button
                            key={emp.id}
                            onClick={() => handleEmployeeSelect(emp.id)}
                            className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between ${selectedEmpId === emp.id ? 'bg-indigo-50/50 text-indigo-700 font-bold' : 'text-slate-600'}`}
                          >
                            <span className="truncate flex items-center gap-2">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              <span className="truncate">{emp.name} ({emp.jobRole})</span>
                            </span>
                            {riskVal !== null && (
                              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-sm shrink-0 font-extrabold ${
                                riskVal >= 70 ? 'bg-rose-50 text-rose-600' : riskVal >= 40 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                              }`}>
                                {riskVal}%
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Chat History Viewport */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/40 relative z-10">
              {messages.map((msg) => {
                const isModel = msg.role === "model";
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-2.5 max-w-[88%] ${isModel ? "mr-auto" : "ml-auto flex-row-reverse"}`}
                  >
                    {/* Avatar Icon */}
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border shadow-xs ${
                      isModel 
                        ? "bg-indigo-50 text-indigo-600 border-indigo-100" 
                        : "bg-slate-900 text-white border-slate-950"
                    }`}>
                      {isModel ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </div>

                    {/* Chat Bubble Card */}
                    <div className={`p-3 rounded-2xl text-xs shadow-xs relative ${
                      isModel 
                        ? "bg-white text-slate-800 border border-slate-200/60 rounded-tl-none" 
                        : "bg-indigo-600 text-white rounded-tr-none"
                    }`}>
                      {isModel ? (
                        <div className="space-y-1 font-sans">
                          {formatMarkdown(msg.text)}
                        </div>
                      ) : (
                        <p className="leading-relaxed break-words">{msg.text}</p>
                      )}
                      
                      <span className={`text-[9px] block mt-1.5 font-mono ${isModel ? 'text-slate-400' : 'text-indigo-200'}`}>
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Loader response state */}
              {isLoading && (
                <div className="flex gap-2.5 max-w-[80%] mr-auto">
                  <div className="w-7 h-7 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 shadow-xs">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                  <div className="p-3 bg-white border border-slate-200/60 rounded-2xl rounded-tl-none text-xs text-slate-500 shadow-xs flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Suggesters quick list */}
            <div className="px-4 py-2 bg-slate-50 border-t border-b border-slate-100 flex flex-wrap gap-1.5 shrink-0 z-10 relative">
              {quickQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickQuestion(q.text)}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-2 py-1 bg-white hover:bg-indigo-50/50 border border-slate-200 text-[10px] text-slate-600 hover:text-indigo-700 rounded-md font-semibold font-sans transition cursor-pointer disabled:opacity-50"
                >
                  {q.icon}
                  <span>{q.text}</span>
                </button>
              ))}
            </div>

            {/* Input area */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-3 bg-white border-t border-slate-100 flex items-center gap-2 shrink-0 z-10 relative"
            >
              <input
                type="text"
                placeholder={selectedEmp ? `Ask about ${selectedEmp.name}...` : "Ask about GBDT, SHAP values..."}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                disabled={isLoading}
                className="flex-1 bg-slate-50/70 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition"
                id="copilot-input-field"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isLoading}
                className="w-8 h-8 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition cursor-pointer"
                id="copilot-send-btn"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
