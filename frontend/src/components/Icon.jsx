export default function Icon({ name, size = 18, color = "currentColor", strokeWidth = 2, style }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
    style: { flexShrink: 0, ...style },
  };

  switch (name) {
    case "bell":
      return <svg {...common}><path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" /><path d="M9 17a3 3 0 0 0 6 0" /></svg>;
    case "cart":
      return <svg {...common}><circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" /><path d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L21 7H7" /></svg>;
    case "trash":
      return <svg {...common}><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /></svg>;
    case "truck":
      return <svg {...common}><path d="M10 17H3V6h11v11h-2" /><path d="M14 9h4l3 3v5h-1" /><circle cx="7.5" cy="17.5" r="1.5" /><circle cx="17.5" cy="17.5" r="1.5" /></svg>;
    case "rotate":
      return <svg {...common}><path d="M3 12a9 9 0 0 1 15.5-6.4L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15.5 6.4L3 16" /><path d="M3 21v-5h5" /></svg>;
    case "lock":
      return <svg {...common}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>;
    case "check-circle":
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="m8.5 12.5 2.5 2.5 4.5-5" /></svg>;
    case "message":
      return <svg {...common}><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" /></svg>;
    case "box":
      return <svg {...common}><path d="m21 8-9-5-9 5 9 5 9-5Z" /><path d="m3 8 9 5 9-5" /><path d="M12 13v8" /></svg>;
    case "phone":
      return <svg {...common}><rect x="7" y="2.5" width="10" height="19" rx="2" /><path d="M11 18.5h2" /></svg>;
    case "sofa":
      return <svg {...common}><path d="M4 12a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v4H4z" /><path d="M4 16v3M20 16v3" /><path d="M2 19h20" /></svg>;
    case "camera":
      return <svg {...common}><path d="M4 7h4l1.5-2h5L16 7h4v12H4z" /><circle cx="12" cy="13" r="3.5" /></svg>;
    case "clock":
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
    case "dollar":
      return <svg {...common}><path d="M12 3v18" /><path d="M16 7.5a4 4 0 0 0-4-1.5 3 3 0 0 0 0 6c2 0 4 1 4 3a3 3 0 0 1-3 3 4 4 0 0 1-4-1.5" /></svg>;
    case "cash":
      return <svg {...common}><rect x="2.5" y="6" width="19" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M6 9h.01M18 15h.01" /></svg>;
    case "credit-card":
      return <svg {...common}><rect x="2.5" y="5.5" width="19" height="13" rx="2" /><path d="M2.5 10h19" /><path d="M7 14.5h3" /></svg>;
    case "bank":
      return <svg {...common}><path d="m3 9 9-5 9 5" /><path d="M5 10v7M9 10v7M15 10v7M19 10v7" /><path d="M3 17h18" /><path d="M2 20h20" /></svg>;
    case "alert":
      return <svg {...common}><path d="M12 4 3 20h18z" /><path d="M12 9v5" /><path d="M12 17h.01" /></svg>;
    case "x-circle":
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="m9 9 6 6M15 9l-6 6" /></svg>;
    case "heart":
      return <svg {...common}><path d="M12 20s-7-4.4-9.3-8A5.6 5.6 0 0 1 12 5a5.6 5.6 0 0 1 9.3 7C19 15.6 12 20 12 20Z" /></svg>;
    case "star":
      return <svg {...common}><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.8 1-6.1L3.2 9.4l6.1-.9Z" /></svg>;
    case "grid":
      return (
        <svg {...common}>
          <rect x="4" y="4" width="7" height="7" rx="1.5" />
          <rect x="13" y="4" width="7" height="7" rx="1.5" />
          <rect x="4" y="13" width="7" height="7" rx="1.5" />
          <rect x="13" y="13" width="7" height="7" rx="1.5" />
        </svg>
      );
    case "book":
      return (
        <svg {...common}>
          <path d="M4.5 19.5A2.5 2.5 0 0 1 7 17h13" />
          <path d="M7 3.5h12.5v17H7a2.5 2.5 0 0 1-2.5-2.5V6A2.5 2.5 0 0 1 7 3.5Z" />
          <path d="M9 7h7" />
          <path d="M9 10h7" />
        </svg>
      );
    case "shirt":
      return (
        <svg {...common}>
          <path d="M8 5 6 7 3.5 6 2 9l4 2v10h12V11l4-2-1.5-3L18 7l-2-2" />
          <path d="M8 5c1.2 1.4 2.5 2 4 2s2.8-.6 4-2" />
        </svg>
      );
    case "utensils":
      return (
        <svg {...common}>
          <path d="M4 3v7" />
          <path d="M6 3v7" />
          <path d="M5 10v11" />
          <path d="M10 3v8a3 3 0 0 0 3 3v7" />
          <path d="M16 3v6" />
          <path d="M19 3v6" />
          <path d="M16 9h3" />
          <path d="M17.5 9v12" />
        </svg>
      );
    case "gamepad":
      return (
        <svg {...common}>
          <path d="M7 10h10a4.5 4.5 0 0 1 4.4 5.6l-.8 3.1A3 3 0 0 1 17.7 21a2.6 2.6 0 0 1-2-1l-1.2-1.6a3 3 0 0 0-4.8 0L8.5 20a2.6 2.6 0 0 1-2 1 3 3 0 0 1-2.9-2.3l-.8-3.1A4.5 4.5 0 0 1 7 10Z" />
          <path d="M8.5 14.5h3" />
          <path d="M10 13v3" />
          <path d="M16.5 14.2h.01" />
          <path d="M18.2 15.8h.01" />
        </svg>
      );
    case "ball":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3.5 10.5c3.8.6 6.2 2.5 7.4 5.9" />
          <path d="M20.5 13.5c-3.8-.6-6.2-2.5-7.4-5.9" />
          <path d="M12 3c1.7 2.2 2.6 4.4 2.6 7S13.7 15.8 12 21" />
          <path d="M21 12H3" />
        </svg>
      );
    case "wrench":
      return (
        <svg {...common}>
          <path d="M21 7.5a5 5 0 0 1-7 4.6L7.2 18.9a2 2 0 0 1-2.8 0l-.3-.3a2 2 0 0 1 0-2.8L10.9 9A5 5 0 0 1 17.5 3l-3 3 3.5 3.5 3-3Z" />
        </svg>
      );
    default:
      return <svg {...common}><circle cx="12" cy="12" r="9" /></svg>;
  }
}
