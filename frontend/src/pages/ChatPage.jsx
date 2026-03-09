// src/pages/ChatPage.jsx
// ALL item submission, photo/video upload, and price negotiation happens here.
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { chatAPI, productsAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";

// ─── Message type config ───────────────────────────────────────────────────
const TYPE_CONFIG = {
  chat:            { label: null },
  item_submission: { label: "📦 Item Submission", color: { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8" } },
  price_proposal:  { label: "💰 Price Proposal",  color: { bg: "#fff7ed", border: "#fed7aa", text: "#c2410c" } },
  price_counter:   { label: "🔄 Counter Offer",   color: { bg: "#faf5ff", border: "#e9d5ff", text: "#7c3aed" } },
  price_accepted:  { label: "✅ Price Accepted",   color: { bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d" } },
  price_rejected:  { label: "❌ Offer Declined",   color: { bg: "#fff1f2", border: "#fecdd3", text: "#be123c" } },
  photo_request:   { label: "📸 Photo Request",   color: { bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d" } },
};

const ITEM_TEMPLATE = `📦 ITEM DETAILS

• Item Name: 
• Condition: (Like New / Good / Fair)
• Asking Price: ₱
• Quantity: 
• Category: 
• Description: 
• Reason for Selling: 
• Included Accessories: `;

// ─── Main Component ─────────────────────────────────────────────────────────
export default function ChatPage() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);

  // Panel states
  const [showItemForm, setShowItemForm] = useState(false);
  const [showPriceProposal, setShowPriceProposal] = useState(false);
  const [showCounterOffer, setShowCounterOffer] = useState(false);
  const [proposalPrice, setProposalPrice] = useState("");
  const [counterPrice, setCounterPrice] = useState("");
  const [linkedProductId, setLinkedProductId] = useState("");
  const [categories, setCategories] = useState([]);

  // Item submission form state
  const [itemForm, setItemForm] = useState({
    title: "", condition: "Good", price: "", quantity: "1",
    category_id: "", description: "", reason: "", accessories: "",
  });
  const [itemFiles, setItemFiles] = useState([]);
  const [itemPreviews, setItemPreviews] = useState([]);

  const messagesEnd = useRef(null);
  const fileInputRef = useRef(null);
  const itemFileRef = useRef(null);
  const pollRef = useRef(null);
  const textareaRef = useRef(null);

  // ── Boot ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return navigate("/login");
    productsAPI.categories().then(setCategories).catch(() => {});
    loadConversations();

    // Sellers auto-open admin thread
    if (user.role !== "admin") openAdminThread();

    pollRef.current = setInterval(() => {
      loadConversations(false);
      if (selectedPartnerRef.current) loadMessages(selectedPartnerRef.current.id, false);
    }, 5000);
    return () => clearInterval(pollRef.current);
  }, [user]);

  const selectedPartnerRef = useRef(selectedPartner);
  useEffect(() => { selectedPartnerRef.current = selectedPartner; }, [selectedPartner]);

  useEffect(() => {
    if (selectedPartner) loadMessages(selectedPartner.id);
  }, [selectedPartner?.id]);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Data loaders ───────────────────────────────────────────────────────────
  const loadConversations = async (showLoad = true) => {
    try {
      if (showLoad) setLoading(true);
      const data = await chatAPI.conversations();
      setConversations(data);
    } finally {
      if (showLoad) setLoading(false);
    }
  };

  const openAdminThread = async () => {
    try {
      const data = await chatAPI.getAdminId();
      setSelectedPartner({ id: data.admin_id, name: data.admin_name, role: "admin" });
    } catch {}
  };

  const loadMessages = async (partnerId, showLoad = true) => {
    try {
      if (showLoad) setMsgLoading(true);
      const data = await chatAPI.messages(partnerId);
      setMessages(data);
    } finally {
      if (showLoad) setMsgLoading(false);
    }
  };

  // ── Derived state ──────────────────────────────────────────────────────────
  // Last unresponded price proposal (from the other party)
  const lastProposal = messages.slice().reverse().find(
    (m) => ["price_proposal", "price_counter"].includes(m.message_type) && m.sender_id !== user.id
  );
  const alreadyResponded = !lastProposal || messages.some(
    (m) => m.created_at > lastProposal.created_at &&
           ["price_accepted", "price_rejected", "price_counter"].includes(m.message_type) &&
           m.sender_id === user.id
  );

  // ── File attach (regular chat) ─────────────────────────────────────────────
  const handleAttachFiles = (e) => {
    const files = Array.from(e.target.files).slice(0, 5);
    setAttachedFiles(files);
    setFilePreviews(files.map((f) => ({
      url: URL.createObjectURL(f),
      name: f.name,
      isVideo: f.type.startsWith("video/"),
    })));
  };

  const removeAttached = (i) => {
    setAttachedFiles((prev) => prev.filter((_, idx) => idx !== i));
    setFilePreviews((prev) => prev.filter((_, idx) => idx !== i));
  };

  // ── Item form file attach ──────────────────────────────────────────────────
  const handleItemFiles = (e) => {
    const files = Array.from(e.target.files).slice(0, 8);
    setItemFiles(files);
    setItemPreviews(files.map((f) => ({
      url: URL.createObjectURL(f),
      name: f.name,
      isVideo: f.type.startsWith("video/"),
    })));
  };

  // ── Send regular chat message ──────────────────────────────────────────────
  const handleSend = async (overrideType, overrideContent, extraPayload = {}) => {
    const msgType = overrideType || "chat";
    const content = overrideContent !== undefined ? overrideContent : text;
    if (!content.trim() && attachedFiles.length === 0 && msgType === "chat") return;

    setSending(true);
    try {
      if (attachedFiles.length > 0 || msgType === "chat") {
        if (attachedFiles.length > 0) {
          const fd = new FormData();
          fd.append("content", content);
          fd.append("message_type", msgType);
          if (linkedProductId) fd.append("product_id", linkedProductId);
          if (user.role === "admin" && selectedPartner) fd.append("receiver_id", selectedPartner.id);
          attachedFiles.forEach((f) => fd.append("files", f));
          Object.entries(extraPayload).forEach(([k, v]) => fd.append(k, v));
          const msg = await chatAPI.sendWithFiles(fd);
          setMessages((prev) => [...prev, msg]);
        } else {
          const payload = {
            content, message_type: msgType,
            ...(linkedProductId ? { product_id: parseInt(linkedProductId) } : {}),
            ...(user.role === "admin" && selectedPartner ? { receiver_id: selectedPartner.id } : {}),
            ...extraPayload,
          };
          const msg = await chatAPI.send(payload);
          setMessages((prev) => [...prev, msg]);
        }
      }
      setText("");
      setAttachedFiles([]);
      setFilePreviews([]);
      setShowPriceProposal(false);
      setShowCounterOffer(false);
      setProposalPrice("");
      setCounterPrice("");
      loadConversations(false);
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setSending(false);
    }
  };

  // ── Send item submission via form ──────────────────────────────────────────
  const handleSubmitItem = async () => {
    if (!itemForm.title || !itemForm.price) return toast("Item name and price are required", "error");
    if (itemFiles.length === 0) return toast("Please attach at least one photo or video", "error");
    setSending(true);
    try {
      const fd = new FormData();
      const itemData = JSON.stringify({
        title: itemForm.title,
        condition: itemForm.condition,
        price: parseFloat(itemForm.price),
        quantity: parseInt(itemForm.quantity),
        category_id: itemForm.category_id || null,
        description: `${itemForm.description}\n\nReason for Selling: ${itemForm.reason}\nIncluded Accessories: ${itemForm.accessories}`.trim(),
      });
      fd.append("message_type", "item_submission");
      fd.append("item_data", itemData);
      fd.append("content", `📦 New item submitted for review: ${itemForm.title} — asking ₱${parseFloat(itemForm.price).toLocaleString("en-PH")}`);
      if (user.role === "admin" && selectedPartner) fd.append("receiver_id", selectedPartner.id);
      itemFiles.forEach((f) => fd.append("files", f));

      const msg = await chatAPI.sendWithFiles(fd);
      setMessages((prev) => [...prev, msg]);
      setShowItemForm(false);
      setItemForm({ title: "", condition: "Good", price: "", quantity: "1", category_id: "", description: "", reason: "", accessories: "" });
      setItemFiles([]);
      setItemPreviews([]);
      toast("Item submitted! Admin will review and respond here.", "success");
      loadConversations(false);
    } catch (e) {
      toast(e.message, "error");
    } finally {
      setSending(false);
    }
  };

  // ── Use template ───────────────────────────────────────────────────────────
  const insertTemplate = () => {
    setText(ITEM_TEMPLATE);
    textareaRef.current?.focus();
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="page" style={{ paddingBottom: 0 }}>
      <div className="container" style={{ height: "calc(100vh - 180px)", display: "flex", flexDirection: "column" }}>

        <div style={S.header}>
          <div>
            <h1 className="page-title" style={{ fontSize: 22 }}>
              {user.role === "admin" ? "💬 Seller Negotiations" : "💬 Chat with Admin"}
            </h1>
            <p className="page-subtitle" style={{ fontSize: 13 }}>
              {user.role === "admin"
                ? "Review submissions, request photos, and negotiate prices with sellers"
                : "Submit your item, send photos/videos, and negotiate pricing directly here"}
            </p>
          </div>
        </div>

        <div style={{ ...S.layout, gridTemplateColumns: user.role === "admin" ? "280px 1fr" : "1fr" }}>

          {/* ── Sidebar (admin only) ── */}
          {user.role === "admin" && (
            <div className="card" style={S.sidebar}>
              <div style={S.sidebarHead}>Seller Conversations</div>
              {loading ? <div className="loading-center"><div className="spinner" /></div>
                : conversations.length === 0
                  ? <div style={S.sidebarEmpty}>No conversations yet</div>
                  : conversations.map(({ partner, last_message, unread_count }) => (
                    <div
                      key={partner?.id}
                      style={{ ...S.convItem, ...(selectedPartner?.id === partner?.id ? S.convActive : {}) }}
                      onClick={() => setSelectedPartner(partner)}
                    >
                      <div style={S.convAv}>{partner?.name?.[0]?.toUpperCase()}</div>
                      <div style={{ flex: 1, overflow: "hidden" }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{partner?.name}</div>
                        <div style={S.lastMsg}>{last_message?.content || "No messages yet"}</div>
                      </div>
                      {unread_count > 0 && <span style={S.unreadBadge}>{unread_count}</span>}
                    </div>
                  ))}
            </div>
          )}

          {/* ── Chat window ── */}
          <div className="card" style={S.chatWin}>
            {!selectedPartner ? (
              <div className="empty-state">
                <div className="empty-state-icon">💬</div>
                <div className="empty-state-title">Select a conversation</div>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div style={S.chatHead}>
                  <div style={S.headAv}>{selectedPartner.name?.[0]?.toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700 }}>{selectedPartner.name}</div>
                    <div style={{ fontSize: 12, color: "var(--gray-400)" }}>
                      {selectedPartner.role === "admin" ? "🛡️ GarageSaleHub Admin" : "👤 Seller"}
                    </div>
                  </div>
                  {/* Admin: product context dropdown */}
                  {user.role === "admin" && (
                    <AdminProductPicker sellerId={selectedPartner.id} value={linkedProductId} onChange={setLinkedProductId} />
                  )}
                </div>

                {/* Messages area */}
                <div style={S.msgArea}>
                  {msgLoading
                    ? <div className="loading-center"><div className="spinner" /></div>
                    : messages.length === 0
                      ? <EmptyThread isAdmin={user.role === "admin"} onTemplate={insertTemplate} onForm={() => setShowItemForm(true)} />
                      : messages.map((msg) => (
                          <Bubble
                            key={msg.id}
                            msg={msg}
                            isMe={msg.sender_id === user.id}
                          />
                        ))
                  }
                  <div ref={messagesEnd} />
                </div>

                {/* ── Pending proposal action bar ── */}
                {lastProposal && !alreadyResponded && (
                  <div style={S.proposalBar}>
                    <div style={{ fontSize: 13 }}>
                      <span style={{ fontWeight: 700 }}>
                        {lastProposal.message_type === "price_counter" ? "Counter offer" : "Price proposal"}:
                      </span>{" "}
                      <span style={{ color: "var(--red)", fontWeight: 800, fontFamily: "Syne, sans-serif", fontSize: 16 }}>
                        ₱{lastProposal.proposed_price?.toLocaleString("en-PH")}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn btn-primary btn-sm"
                        onClick={() => handleSend("price_accepted", "✅ I accept the proposed price!", { product_id: lastProposal.product_id })}>
                        ✅ Accept
                      </button>
                      <button className="btn btn-sm" style={S.counterBtn}
                        onClick={() => { setShowCounterOffer(true); setCounterPrice(String(lastProposal.proposed_price || "")); }}>
                        🔄 Counter
                      </button>
                      <button className="btn btn-sm" style={S.rejectBtn}
                        onClick={() => handleSend("price_rejected", "❌ I'd like to negotiate further on the price.", { product_id: lastProposal.product_id })}>
                        ❌ Decline
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Counter offer input ── */}
                {showCounterOffer && (
                  <div style={S.inlinePanel}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>🔄 Your Counter Offer: ₱</span>
                    <input className="input-field" type="number" placeholder="e.g. 1300" value={counterPrice}
                      onChange={(e) => setCounterPrice(e.target.value)}
                      style={{ width: 120, padding: "6px 10px" }} />
                    <button className="btn btn-primary btn-sm" disabled={!counterPrice}
                      onClick={() => handleSend("price_counter", `🔄 Counter offer: ₱${parseFloat(counterPrice).toLocaleString("en-PH")}`, { proposed_price: parseFloat(counterPrice), product_id: lastProposal?.product_id })}>
                      Send Counter
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setShowCounterOffer(false)}>Cancel</button>
                  </div>
                )}

                {/* ── Admin: price proposal input ── */}
                {user.role === "admin" && showPriceProposal && (
                  <div style={S.inlinePanel}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>💰 Propose Price: ₱</span>
                    <input className="input-field" type="number" placeholder="e.g. 1200" value={proposalPrice}
                      onChange={(e) => setProposalPrice(e.target.value)}
                      style={{ width: 120, padding: "6px 10px" }} />
                    <button className="btn btn-primary btn-sm" disabled={!proposalPrice}
                      onClick={() => handleSend("price_proposal",
                        `💰 I'm proposing ₱${parseFloat(proposalPrice).toLocaleString("en-PH")} for this item.`,
                        { proposed_price: parseFloat(proposalPrice), product_id: linkedProductId || undefined })}>
                      Send Proposal
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setShowPriceProposal(false)}>Cancel</button>
                  </div>
                )}

                {/* ── Item submission form panel ── */}
                {showItemForm && (
                  <ItemSubmissionForm
                    categories={categories}
                    form={itemForm}
                    setForm={setItemForm}
                    previews={itemPreviews}
                    onFiles={handleItemFiles}
                    fileRef={itemFileRef}
                    onSubmit={handleSubmitItem}
                    onCancel={() => setShowItemForm(false)}
                    sending={sending}
                  />
                )}

                {/* ── File previews ── */}
                {filePreviews.length > 0 && (
                  <div style={S.previewStrip}>
                    {filePreviews.map((p, i) => (
                      <div key={i} style={S.previewThumb}>
                        {p.isVideo
                          ? <video src={p.url} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 6 }} />
                          : <img src={p.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 6 }} />}
                        <button style={S.removeThumb} onClick={() => removeAttached(i)}>✕</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Toolbar row (seller quick actions) ── */}
                {!showItemForm && (
                  <div style={S.toolbar}>
                    {user.role !== "admin" && (
                      <>
                        <button style={S.toolBtn} title="Submit Item via Form" onClick={() => setShowItemForm(true)}>
                          📦 <span style={S.toolLabel}>Submit Item</span>
                        </button>
                        <button style={S.toolBtn} title="Use text template" onClick={insertTemplate}>
                          📋 <span style={S.toolLabel}>Item Template</span>
                        </button>
                      </>
                    )}
                    {user.role === "admin" && (
                      <>
                        <button style={S.toolBtn} onClick={() => { setShowPriceProposal(!showPriceProposal); setShowCounterOffer(false); }}>
                          💰 <span style={S.toolLabel}>Propose Price</span>
                        </button>
                        <button style={S.toolBtn} onClick={() => setText("Please retake photos with:\n① Multiple angles\n② Good lighting\n③ Clear background\n④ Place a handwritten date + verification code next to the item")}>
                          📸 <span style={S.toolLabel}>Request Photos</span>
                        </button>
                        <button style={S.toolBtn} onClick={() => setText("✅ Your item has been approved and is now listed on the platform!")}>
                          ✅ <span style={S.toolLabel}>Notify Approved</span>
                        </button>
                        <button style={S.toolBtn} onClick={() => setText("❌ We cannot accept this item at this time. Reason: ")}>
                          ❌ <span style={S.toolLabel}>Notify Rejected</span>
                        </button>
                      </>
                    )}
                    {/* Attach file button (both roles) */}
                    <button style={{ ...S.toolBtn, marginLeft: "auto" }} onClick={() => fileInputRef.current?.click()}>
                      📎 <span style={S.toolLabel}>Attach Photo/Video</span>
                    </button>
                    <input ref={fileInputRef} type="file" multiple accept="image/*,video/*" style={{ display: "none" }} onChange={handleAttachFiles} />
                  </div>
                )}

                {/* ── Message input ── */}
                {!showItemForm && (
                  <div style={S.inputRow}>
                    <textarea
                      ref={textareaRef}
                      className="input-field"
                      rows={2}
                      style={{ flex: 1, resize: "none", lineHeight: 1.5 }}
                      placeholder={user.role === "admin"
                        ? "Reply to seller, give instructions, or negotiate..."
                        : "Describe your item or type a message..."}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                      }}
                    />
                    <button className="btn btn-primary" style={{ alignSelf: "flex-end", padding: "10px 20px" }}
                      onClick={() => handleSend()}
                      disabled={sending || (!text.trim() && attachedFiles.length === 0)}>
                      {sending ? "..." : "Send"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function EmptyThread({ isAdmin, onTemplate, onForm }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 24px", color: "var(--gray-500)" }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>👋</div>
      {isAdmin ? (
        <p style={{ fontSize: 14 }}>No messages yet from this seller. Wait for their submission or start the conversation.</p>
      ) : (
        <div>
          <p style={{ fontWeight: 700, fontSize: 15, color: "var(--black)", marginBottom: 8 }}>Start your submission!</p>
          <p style={{ fontSize: 13, marginBottom: 20, lineHeight: 1.7 }}>
            Submit your item using the form or send a detailed message to the admin.
            You can attach photos and videos directly in this chat.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button className="btn btn-primary" onClick={onForm}>📦 Fill Item Form</button>
            <button className="btn btn-outline" onClick={onTemplate}>📋 Use Text Template</button>
          </div>
          <div style={{ marginTop: 20, background: "var(--gray-50)", borderRadius: 10, padding: 16, fontSize: 13, textAlign: "left" }}>
            <strong>📸 Photo Guidelines:</strong>
            <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {["Multiple angles", "Good lighting", "Clear background", "Handwritten date + verification code next to item"].map((g) => (
                <span key={g} style={{ color: "var(--green)" }}>✅ {g}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Bubble({ msg, isMe }) {
  const cfg = TYPE_CONFIG[msg.message_type] || TYPE_CONFIG.chat;
  const isSpecial = msg.message_type !== "chat" && cfg.color;
  const hasAttachments = msg.attachments && msg.attachments.length > 0 && msg.attachments[0] !== "";

  const timeStr = new Date(msg.created_at).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" });

  if (isSpecial) {
    const c = cfg.color;
    return (
      <div style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start", marginBottom: 14 }}>
        {!isMe && <BubbleAvatar name={msg.sender_name} />}
        <div style={{ maxWidth: "78%", background: c.bg, border: `1.5px solid ${c.border}`, borderRadius: 14, padding: "12px 16px" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: c.text, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>
            {cfg.label}
          </div>
          {msg.proposed_price && (
            <div style={{ fontSize: 22, fontWeight: 800, color: c.text, fontFamily: "Syne, sans-serif", marginBottom: 6 }}>
              ₱{msg.proposed_price.toLocaleString("en-PH")}
            </div>
          )}
          <p style={{ margin: 0, fontSize: 14, color: "var(--black)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{msg.content}</p>
          {hasAttachments && <AttachmentGrid attachments={msg.attachments} />}
          <div style={{ fontSize: 10, color: "var(--gray-400)", marginTop: 8, textAlign: "right" }}>
            {msg.sender_name} · {timeStr}
          </div>
        </div>
      </div>
    );
  }

  // Regular chat bubble
  return (
    <div style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start", marginBottom: 10, alignItems: "flex-end", gap: 8 }}>
      {!isMe && <BubbleAvatar name={msg.sender_name} />}
      <div style={{
        maxWidth: "72%",
        background: isMe ? "var(--red)" : "var(--gray-100)",
        color: isMe ? "white" : "var(--black)",
        borderRadius: 16,
        padding: "10px 14px",
        borderBottomRightRadius: isMe ? 4 : 16,
        borderBottomLeftRadius: isMe ? 16 : 4,
      }}>
        {!isMe && <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.6, marginBottom: 3 }}>{msg.sender_name}</div>}
        {msg.content && <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{msg.content}</p>}
        {hasAttachments && <AttachmentGrid attachments={msg.attachments} light={isMe} />}
        <span style={{ display: "block", fontSize: 10, opacity: 0.55, marginTop: 4, textAlign: "right" }}>{timeStr}</span>
      </div>
    </div>
  );
}

function BubbleAvatar({ name }) {
  return (
    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--red)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
      {name?.[0]?.toUpperCase()}
    </div>
  );
}

function AttachmentGrid({ attachments, light }) {
  const isVideo = (f) => /\.(mp4|mov|avi|webm)$/i.test(f);
  return (
    <div style={{ display: "grid", gridTemplateColumns: attachments.length === 1 ? "1fr" : "repeat(2, 1fr)", gap: 6, marginTop: 8, maxWidth: 300 }}>
      {attachments.filter(Boolean).map((fname, i) => {
        const url = chatAPI.attachmentUrl(fname);
        return isVideo(fname) ? (
          <video key={i} src={url} controls style={{ width: "100%", borderRadius: 8, maxHeight: 200 }} />
        ) : (
          <a key={i} href={url} target="_blank" rel="noreferrer">
            <img src={url} alt="" style={{ width: "100%", borderRadius: 8, objectFit: "cover", maxHeight: 180, display: "block" }} />
          </a>
        );
      })}
    </div>
  );
}

function AdminProductPicker({ sellerId, value, onChange }) {
  const [products, setProducts] = useState([]);
  useEffect(() => {
    if (!sellerId) return;
    productsAPI.getAll({ status: "pending", per_page: 50 })
      .then((d) => setProducts(d.products.filter((p) => p.seller?.id === sellerId)))
      .catch(() => {});
  }, [sellerId]);
  if (products.length === 0) return null;
  return (
    <select className="input-field" style={{ width: 210, fontSize: 12, padding: "6px 10px" }}
      value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">No item linked</option>
      {products.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
    </select>
  );
}

function ItemSubmissionForm({ categories, form, setForm, previews, onFiles, fileRef, onSubmit, onCancel, sending }) {
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <div style={S.itemFormPanel}>
      <div style={S.itemFormHeader}>
        <span style={{ fontWeight: 700, fontSize: 15 }}>📦 Item Submission Form</span>
        <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--gray-500)" }} onClick={onCancel}>✕</button>
      </div>
      <div style={S.itemFormBody}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="input-group" style={{ gridColumn: "1/-1" }}>
            <label>Item Name *</label>
            <input className="input-field" placeholder="e.g. Samsung TV 40 inch" value={form.title} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div className="input-group">
            <label>Condition *</label>
            <select className="input-field" value={form.condition} onChange={(e) => set("condition", e.target.value)}>
              <option>Like New</option><option>Good</option><option>Fair</option>
            </select>
          </div>
          <div className="input-group">
            <label>Asking Price (₱) *</label>
            <input className="input-field" type="number" min="1" placeholder="e.g. 1500" value={form.price} onChange={(e) => set("price", e.target.value)} />
          </div>
          <div className="input-group">
            <label>Quantity</label>
            <input className="input-field" type="number" min="1" value={form.quantity} onChange={(e) => set("quantity", e.target.value)} />
          </div>
          <div className="input-group">
            <label>Category</label>
            <select className="input-field" value={form.category_id} onChange={(e) => set("category_id", e.target.value)}>
              <option value="">Select category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          <div className="input-group" style={{ gridColumn: "1/-1" }}>
            <label>Description</label>
            <textarea className="input-field" rows={2} placeholder="Describe the item's condition, brand, model..." value={form.description} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div className="input-group">
            <label>Reason for Selling</label>
            <input className="input-field" placeholder="e.g. Upgrading to newer model" value={form.reason} onChange={(e) => set("reason", e.target.value)} />
          </div>
          <div className="input-group">
            <label>Included Accessories</label>
            <input className="input-field" placeholder="e.g. Remote, cables, manual" value={form.accessories} onChange={(e) => set("accessories", e.target.value)} />
          </div>
        </div>

        {/* Photo/Video upload */}
        <div style={{ marginTop: 12 }}>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8 }}>
            Photos / Videos * <span style={{ color: "var(--gray-400)", fontWeight: 400 }}>(up to 8 files)</span>
          </label>
          <div style={S.uploadBox} onClick={() => fileRef.current?.click()}>
            {previews.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--gray-400)", padding: "20px 0" }}>
                <div style={{ fontSize: 32, marginBottom: 6 }}>📷🎥</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Click to attach photos or videos</div>
                <div style={{ fontSize: 11, marginTop: 4 }}>Multiple angles • Good lighting • Handwritten date visible</div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, padding: 8 }}>
                {previews.map((p, i) => p.isVideo
                  ? <video key={i} src={p.url} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 6 }} />
                  : <img key={i} src={p.url} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 6 }} />
                )}
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" multiple accept="image/*,video/*" style={{ display: "none" }} onChange={onFiles} />
        </div>

        <div style={{ background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 8, padding: 10, fontSize: 12, color: "var(--red)", marginTop: 12 }}>
          ⚠️ By submitting, you agree to transfer ownership to GarageSaleHub upon admin approval. Admin may negotiate the final price.
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={onSubmit} disabled={sending}>
            {sending ? "Submitting..." : "📨 Submit to Admin"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const S = {
  header: { marginBottom: 16 },
  layout: { display: "grid", gap: 16, flex: 1, overflow: "hidden" },
  sidebar: { overflow: "hidden", display: "flex", flexDirection: "column" },
  sidebarHead: { padding: "14px 16px 10px", fontSize: 13, fontWeight: 700, borderBottom: "1px solid var(--gray-100)", color: "var(--gray-600)" },
  sidebarEmpty: { padding: 20, fontSize: 13, color: "var(--gray-400)", textAlign: "center" },
  convItem: { display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", cursor: "pointer", transition: "background 0.15s", borderBottom: "1px solid var(--gray-50)" },
  convActive: { background: "#fff5f5", borderLeft: "3px solid var(--red)" },
  convAv: { width: 36, height: 36, borderRadius: "50%", background: "var(--red)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, flexShrink: 0, fontSize: 14 },
  lastMsg: { fontSize: 12, color: "var(--gray-400)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 170 },
  unreadBadge: { background: "var(--red)", color: "white", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 },
  chatWin: { display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 },
  chatHead: { display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", borderBottom: "1px solid var(--gray-100)", flexShrink: 0 },
  headAv: { width: 36, height: 36, borderRadius: "50%", background: "var(--red)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, flexShrink: 0 },
  msgArea: { flex: 1, overflow: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", minHeight: 0 },
  proposalBar: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 18px", background: "#fff7ed", borderTop: "1px solid #fed7aa", flexShrink: 0 },
  counterBtn: { background: "#f5f3ff", color: "#7c3aed", border: "1px solid #e9d5ff" },
  rejectBtn: { background: "#fff1f2", color: "var(--red)", border: "1px solid #fecdd3" },
  inlinePanel: { display: "flex", alignItems: "center", gap: 10, padding: "10px 18px", background: "var(--gray-50)", borderTop: "1px solid var(--gray-200)", flexShrink: 0, flexWrap: "wrap" },
  toolbar: { display: "flex", alignItems: "center", gap: 4, padding: "8px 12px", borderTop: "1px solid var(--gray-100)", background: "var(--gray-50)", flexShrink: 0, flexWrap: "wrap" },
  toolBtn: { display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", background: "white", border: "1px solid var(--gray-200)", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 500, color: "var(--gray-700)", whiteSpace: "nowrap" },
  toolLabel: { fontSize: 12 },
  previewStrip: { display: "flex", gap: 8, padding: "8px 18px", borderTop: "1px solid var(--gray-100)", background: "var(--gray-50)", flexShrink: 0, flexWrap: "wrap" },
  previewThumb: { position: "relative", width: 64, height: 64, borderRadius: 8, overflow: "hidden", border: "1px solid var(--gray-200)" },
  removeThumb: { position: "absolute", top: 2, right: 2, background: "rgba(0,0,0,0.6)", color: "white", border: "none", borderRadius: "50%", width: 18, height: 18, cursor: "pointer", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center" },
  inputRow: { display: "flex", gap: 10, padding: "12px 18px", borderTop: "1px solid var(--gray-100)", flexShrink: 0 },
  itemFormPanel: { borderTop: "2px solid var(--red)", background: "white", flexShrink: 0, maxHeight: "60vh", overflow: "auto" },
  itemFormHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px", borderBottom: "1px solid var(--gray-100)", position: "sticky", top: 0, background: "white", zIndex: 1 },
  itemFormBody: { padding: "16px 18px" },
  uploadBox: { border: "2px dashed var(--gray-300)", borderRadius: 10, cursor: "pointer", minHeight: 80, transition: "border-color 0.15s" },
};
