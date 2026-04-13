import { useMemo, useRef, useState } from "react";

const LONG_TERMS = Array.from({ length: 18 }, (_, i) =>
  `${i + 1}. GarageSaleHub Terms placeholder paragraph. By using this platform, you agree to account safety, fair selling, lawful use, and privacy handling policies.`
).join("\n\n");

export default function TermsModal({ open, onClose, onUnlocked }) {
  const boxRef = useRef(null);
  const [reachedBottom, setReachedBottom] = useState(false);
  const showAction = useMemo(() => reachedBottom, [reachedBottom]);

  if (!open) return null;

  const onScroll = () => {
    const el = boxRef.current;
    if (!el) return;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 4;
    if (atBottom) setReachedBottom(true);
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={{ margin: 0, fontSize: 18 }}>Terms & Privacy Policy</h3>
          <button type="button" onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>
        <div ref={boxRef} onScroll={onScroll} style={styles.scroller}>
          <p style={styles.bodyText}>{LONG_TERMS}</p>
        </div>
        <div style={styles.footer}>
          {!showAction ? (
            <small style={{ color: "var(--gray-500)" }}>Scroll to the bottom to continue.</small>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                onUnlocked();
                onClose();
              }}
            >
              I understand
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: 16,
  },
  modal: {
    width: "100%",
    maxWidth: 720,
    background: "white",
    borderRadius: 12,
    border: "1px solid var(--gray-200)",
    boxShadow: "var(--shadow-lg)",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 14px",
    borderBottom: "1px solid var(--gray-200)",
  },
  closeBtn: { border: "none", background: "transparent", cursor: "pointer", fontSize: 16 },
  scroller: { maxHeight: "50vh", overflow: "auto", padding: 14 },
  bodyText: { margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.55, fontSize: 13, color: "var(--gray-700)" },
  footer: {
    borderTop: "1px solid var(--gray-200)",
    padding: "10px 14px",
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
  },
};

