// src/pages/ChatPage.jsx
import { useState, useEffect, useRef } from "react";
import { chatAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";

export default function ChatPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [conversations, setConversations] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEnd = useRef(null);

  useEffect(() => {
    chatAPI.conversations().then(setConversations).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedPartner) {
      chatAPI.messages(selectedPartner.id).then(setMessages);
    }
  }, [selectedPartner]);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMsg.trim()) return;
    try {
      const msg = await chatAPI.send({ receiver_id: selectedPartner.id, content: newMsg });
      setMessages((prev) => [...prev, msg]);
      setNewMsg("");
    } catch (e) {
      toast(e.message, "error");
    }
  };

  return (
    <div className="page">
      <div className="container">
        <h1 className="page-title" style={{ marginBottom: 24 }}>💬 Messages</h1>
        <div style={styles.layout}>
          {/* Conversations sidebar */}
          <div className="card" style={styles.sidebar}>
            <div style={styles.sidebarHeader}>Conversations</div>
            {loading ? (
              <div className="loading-center"><div className="spinner" /></div>
            ) : conversations.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "var(--gray-400)", fontSize: 14 }}>No conversations yet</div>
            ) : (
              conversations.map(({ partner, last_message, unread_count }) => (
                <div
                  key={partner?.id}
                  style={{ ...styles.convItem, ...(selectedPartner?.id === partner?.id ? styles.convItemActive : {}) }}
                  onClick={() => setSelectedPartner(partner)}
                >
                  <div style={styles.convAvatar}>{partner?.name?.[0]?.toUpperCase()}</div>
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{partner?.name}</div>
                    <div style={{ fontSize: 12, color: "var(--gray-400)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {last_message?.content}
                    </div>
                  </div>
                  {unread_count > 0 && (
                    <span style={styles.unreadBadge}>{unread_count}</span>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Chat window */}
          <div className="card" style={styles.chatWindow}>
            {!selectedPartner ? (
              <div className="empty-state">
                <div className="empty-state-icon">💬</div>
                <div className="empty-state-title">Select a conversation</div>
                <div className="empty-state-text">Or start chatting from a product page</div>
              </div>
            ) : (
              <>
                <div style={styles.chatHeader}>
                  <div style={styles.chatAvatar}>{selectedPartner.name[0].toUpperCase()}</div>
                  <div>
                    <div style={{ fontWeight: 700 }}>{selectedPartner.name}</div>
                    <div style={{ fontSize: 12, color: "var(--gray-400)" }}>{selectedPartner.email}</div>
                  </div>
                </div>
                <div style={styles.messagesArea}>
                  {messages.map((msg) => {
                    const isMe = msg.sender_id === user.id;
                    return (
                      <div key={msg.id} style={{ ...styles.msgWrap, justifyContent: isMe ? "flex-end" : "flex-start" }}>
                        <div style={{ ...styles.msgBubble, ...(isMe ? styles.msgBubbleMe : styles.msgBubbleOther) }}>
                          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>{msg.content}</p>
                          <span style={styles.msgTime}>{new Date(msg.created_at).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEnd} />
                </div>
                <form onSubmit={handleSend} style={styles.chatInput}>
                  <input
                    className="input-field"
                    style={{ flex: 1 }}
                    placeholder="Type a message..."
                    value={newMsg}
                    onChange={(e) => setNewMsg(e.target.value)}
                  />
                  <button type="submit" className="btn btn-primary" disabled={!newMsg.trim()}>Send</button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  layout: { display: "grid", gridTemplateColumns: "300px 1fr", gap: 20, height: "calc(100vh - 280px)" },
  sidebar: { overflow: "hidden", display: "flex", flexDirection: "column" },
  sidebarHeader: { padding: "16px 16px 12px", fontSize: 14, fontWeight: 700, borderBottom: "1px solid var(--gray-100)" },
  convItem: { display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", cursor: "pointer", transition: "background 0.15s", borderBottom: "1px solid var(--gray-50)" },
  convItemActive: { background: "#fff5f5", borderLeft: "3px solid var(--red)" },
  convAvatar: { width: 40, height: 40, borderRadius: "50%", background: "var(--red)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, flexShrink: 0 },
  unreadBadge: { background: "var(--red)", color: "white", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 },
  chatWindow: { display: "flex", flexDirection: "column", overflow: "hidden" },
  chatHeader: { display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderBottom: "1px solid var(--gray-100)" },
  chatAvatar: { width: 40, height: 40, borderRadius: "50%", background: "var(--red)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 },
  messagesArea: { flex: 1, overflow: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 12 },
  msgWrap: { display: "flex" },
  msgBubble: { maxWidth: "70%", padding: "10px 14px", borderRadius: 16 },
  msgBubbleMe: { background: "var(--red)", color: "white", borderBottomRightRadius: 4 },
  msgBubbleOther: { background: "var(--gray-100)", color: "var(--black)", borderBottomLeftRadius: 4 },
  msgTime: { display: "block", fontSize: 10, opacity: 0.7, marginTop: 4, textAlign: "right" },
  chatInput: { display: "flex", gap: 10, padding: "16px 20px", borderTop: "1px solid var(--gray-100)" },
};
