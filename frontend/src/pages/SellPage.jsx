// src/pages/SellPage.jsx
// Selling now happens entirely through the chat with admin.
// This page redirects sellers directly to the chat.
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function SellPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) navigate("/login");
    else navigate("/chat");
  }, [user]);

  return null;
}
