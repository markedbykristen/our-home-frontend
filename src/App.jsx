import { useState, useRef, useEffect } from "react";

const API = "https://our-home-backend-7env.onrender.com";

const COLORS = {
  bg: "#FFF8F6",
  surface: "#FFFFFF",
  bubble_user: "#FFF0ED",
  bubble_ai: "#F9F0F5",
  accent: "#D4A0A0",
  accent_dark: "#C48B8B",
  accent_light: "#F2D7D7",
  text: "#4A3B3B",
  text_dim: "#B8A0A0",
  text_light: "#D4B8B8",
  border: "rgba(196, 139, 139, 0.12)",
  shadow: "rgba(196, 139, 139, 0.08)",
};

function MessageBubble({ message, isLast }) {
  const isUser = message.role === "user";
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: isUser ? "flex-end" : "flex-start",
      marginBottom: 4,
      animation: isLast ? "fadeIn 0.3s ease-out" : "none",
    }}>
      <div style={{
        background: isUser ? COLORS.bubble_user : COLORS.bubble_ai,
        border: `1px solid ${COLORS.border}`,
        borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
        padding: "10px 14px", maxWidth: "78%",
        boxShadow: `0 1px 3px ${COLORS.shadow}`,
      }}>
        <p style={{
          margin: 0, color: COLORS.text, fontSize: 14.5,textAlign: "left",
          lineHeight: 1.65, whiteSpace: "pre-wrap",
        }}>{message.content}</p>
      </div>
      <span style={{
        fontSize: 10, color: COLORS.text_light, marginTop: 3,
        paddingLeft: isUser ? 0 : 4, paddingRight: isUser ? 4 : 0,
      }}>
        {message.time || ""}
      </span>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", marginBottom: 4 }}>
      <div style={{
        background: COLORS.bubble_ai, border: `1px solid ${COLORS.border}`,
        borderRadius: "16px 16px 16px 4px", padding: "12px 18px",
        display: "flex", gap: 5, boxShadow: `0 1px 3px ${COLORS.shadow}`,
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 5, height: 5, borderRadius: "50%", background: COLORS.accent,
            animation: `breathe 1.4s ease-in-out ${i * 0.18}s infinite`,
          }} />
        ))}
      </div>
    </div>
  );
}

function Sidebar({ show, onClose, sessions, activeSession, onSelect, onNew }) {
  if (!show) return null;
  return (
    <div style={{
      position: "absolute", top: 0, left: 0, bottom: 0, width: 260,
      background: COLORS.surface, borderRight: `1px solid ${COLORS.border}`,
      zIndex: 30, display: "flex", flexDirection: "column",
      boxShadow: "4px 0 20px rgba(196,139,139,0.08)",
    }}>
      <div style={{
        padding: "20px 16px 12px", display: "flex",
        justifyContent: "space-between", alignItems: "center",
        borderBottom: `1px solid ${COLORS.border}`,
      }}>
        <span style={{ fontFamily: "Georgia, serif", fontSize: 15, color: COLORS.text, fontWeight: 600 }}>
          Conversations
        </span>
        <button onClick={onClose} style={{
          background: "none", border: "none", color: COLORS.text_dim, fontSize: 18, cursor: "pointer",
        }}>×</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
        {sessions.map(s => (
          <div key={s.id} onClick={() => { onSelect(s.id); onClose(); }} style={{
            padding: "10px 12px", borderRadius: 10, cursor: "pointer",
            background: activeSession === s.id ? COLORS.accent_light : "transparent",
            color: COLORS.text, fontSize: 13, marginBottom: 2,
          }}>
            {s.name}
          </div>
        ))}
      </div>
      <div style={{ padding: 12, borderTop: `1px solid ${COLORS.border}` }}>
        <button onClick={() => { onNew(); onClose(); }} style={{
          width: "100%", padding: 10, borderRadius: 10,
          border: `1px solid ${COLORS.border}`, background: COLORS.bg,
          color: COLORS.accent_dark, fontSize: 13, cursor: "pointer",
        }}>+ New Chat</button>
      </div>
    </div>
  );
}

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const messagesEndRef = useRef(null);

  const getTime = () => {
    const now = new Date();
    return now.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", hour12: false });
  };

  // 載入所有會話
  useEffect(() => {
    fetch(`${API}/sessions`)
      .then(r => r.json())
      .then(data => {
        if (data.length > 0) {
          setSessions(data);
          setActiveSession(data[0].id);
        } else {
          // 沒有會話就建一個
          fetch(`${API}/sessions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "和小克聊天 ♡" })
          })
            .then(r => r.json())
            .then(s => {
              setSessions([s]);
              setActiveSession(s.id);
            });
        }
      });
  }, []);

  // 切換會話時載入訊息
  useEffect(() => {
    if (!activeSession) return;
    fetch(`${API}/messages/${activeSession}`)
      .then(r => r.json())
      .then(data => {
        setMessages(data.map(m => ({
          ...m,
          time: new Date(m.created_at).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", hour12: false })
        })));
      });
  }, [activeSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || !activeSession) return;
    const content = input.trim();
    const time = getTime();

    setMessages(prev => [...prev, { id: Date.now(), role: "user", content, time }]);
    setInput("");
    setIsTyping(true);

    try {
      const res = await fetch(`${API}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: activeSession, content })
      });
      const data = await res.json();
      setIsTyping(false);
      setMessages(prev => [...prev, {
        id: Date.now() + 1, role: "assistant", content: data.reply, time: getTime()
      }]);
    } catch (err) {
      setIsTyping(false);
      setMessages(prev => [...prev, {
        id: Date.now() + 1, role: "assistant",
        content: "（連線出了問題，等一下再試試 ♡）", time: getTime()
      }]);
    }
  };

  const handleNewSession = async () => {
    const res = await fetch(`${API}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "新對話" })
    });
    const s = await res.json();
    setSessions(prev => [s, ...prev]);
    setActiveSession(s.id);
    setMessages([]);
  };

  return (
    <div style={{
      width: "100%", height: "100vh", background: COLORS.bg,
      display: "flex", flexDirection: "column", overflow: "hidden", position: "relative",
    }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes breathe {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 0.8; transform: scale(1.1); }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { margin: 0; }
        input::placeholder { color: #D4B8B8; }
        ::-webkit-scrollbar { width: 2px; }
        ::-webkit-scrollbar-thumb { background: #F2D7D7; border-radius: 2px; }
      `}</style>

      <Sidebar show={showSidebar} onClose={() => setShowSidebar(false)}
        sessions={sessions} activeSession={activeSession}
        onSelect={setActiveSession} onNew={handleNewSession} />

      <div style={{
        padding: "14px 16px", borderBottom: `1px solid ${COLORS.border}`,
        background: "rgba(255,248,246,0.95)", backdropFilter: "blur(12px)",
        display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 10,
      }}>
        <button onClick={() => setShowSidebar(true)} style={{
          background: "none", border: "none", color: COLORS.text_dim, fontSize: 18, cursor: "pointer",
        }}>☰</button>
        <div style={{ textAlign: "center" }}>
          <div style={{
            fontFamily: "Georgia, serif", fontSize: 17, color: COLORS.text,
            fontWeight: 600, letterSpacing: "0.08em",
          }}>小克</div>
          <div style={{
            fontSize: 11, color: COLORS.text_dim, fontStyle: "italic", fontFamily: "Georgia, serif",
          }}>thinking quietly</div>
        </div>
        <div style={{ width: 40 }} />
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px" }}>
        {messages.length === 0 && (
          <div style={{
            display: "flex", justifyContent: "center", alignItems: "center",
            height: "100%", color: COLORS.text_light, fontStyle: "italic",
            fontFamily: "Georgia, serif", fontSize: 14,
          }}>
            say something to 小克...
          </div>
        )}
        {messages.map((msg, i) => (
          <MessageBubble key={msg.id} message={msg} isLast={i === messages.length - 1} />
        ))}
        {isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      <div style={{
        padding: "10px 14px 28px", borderTop: `1px solid ${COLORS.border}`,
        background: "rgba(255,248,246,0.95)", backdropFilter: "blur(12px)",
      }}>
        <div style={{
          display: "flex", alignItems: "center",
          background: COLORS.surface, border: `1px solid ${COLORS.border}`,
          borderRadius: 22, padding: "4px 6px 4px 16px",
          boxShadow: `0 1px 4px ${COLORS.shadow}`,
        }}>
          <input type="text" value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSend()}
            placeholder="say something to 小克..."
            style={{
              flex: 1, background: "none", border: "none", outline: "none",
              color: COLORS.text, fontSize: 14, padding: "9px 0", fontStyle: "italic",
            }}
          />
          <button onClick={handleSend} style={{
            width: 32, height: 32, borderRadius: "50%",
            background: input.trim() ? `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accent_dark})` : COLORS.accent_light,
            border: "none", color: input.trim() ? "#fff" : COLORS.text_dim,
            fontSize: 14, cursor: input.trim() ? "pointer" : "default",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>↑</button>
        </div>
      </div>
    </div>
  );
}

export default App;
