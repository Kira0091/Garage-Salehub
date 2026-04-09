// src/main.jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

const rootEl = document.getElementById("root");
const root = createRoot(rootEl);

const renderFatal = (message) => {
  root.render(
    <div className="page">
      <div className="container" style={{ paddingTop: 20 }}>
        <div className="card" style={{ padding: 20 }}>
          <h2 style={{ marginBottom: 8 }}>App failed to load</h2>
          <p style={{ color: "var(--gray-600)" }}>{message}</p>
        </div>
      </div>
    </div>
  );
};

import("./App")
  .then(({ default: App }) => {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  })
  .catch((err) => {
    console.error("Bootstrap error:", err);
    renderFatal("A startup error occurred. Please refresh the page.");
  });
