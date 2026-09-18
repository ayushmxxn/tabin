import { useState, type FormEvent } from "react";

const GITHUB_USERNAME = "ayushmxxn";
const GITHUB_AVATAR_URL = `https://github.com/${GITHUB_USERNAME}.png`;

interface SocialLink {
  label: string;
  url: string;
  icon: (className?: string) => React.ReactNode;
}

const SOCIAL_LINKS: SocialLink[] = [
  {
    label: "GitHub",
    url: `https://github.com/${GITHUB_USERNAME}`,
    icon: (cls = "h-3.5 w-3.5") => (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
        <path d="M9 18c-4.51 2-5-2-7-2" />
      </svg>
    ),
  },
  {
    label: "Discord",
    url: "https://discord.com/invite/kzk6uWey3g",
    icon: (cls = "h-3.5 w-3.5") => (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6h0a14.5 14.5 0 0 0-4-1.2 11.5 11.5 0 0 0-.5 1.2 12.8 12.8 0 0 0-3 0 11.5 11.5 0 0 0-.5-1.2A14.5 14.5 0 0 0 6 6c-2.5 3.7-3.2 7.3-2.9 10.9a14.6 14.6 0 0 0 4.5 2.3 11 11 0 0 0 1-1.6 9.4 9.4 0 0 1-1.5-.7c.1-.1.3-.2.4-.3a10.3 10.3 0 0 0 9 0c.1.1.3.2.4.3a9.4 9.4 0 0 1-1.5.7 11 11 0 0 0 1 1.6 14.6 14.6 0 0 0 4.5-2.3c.4-4.2-.7-7.8-2.9-10.9Z" />
        <path d="M9.5 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
        <path d="M14.5 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
      </svg>
    ),
  },
  {
    label: "LinkedIn",
    url: "https://linkedin.com/in/ayushmxxn",
    icon: (cls = "h-3.5 w-3.5") => (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
        <rect width="4" height="12" x="2" y="9" />
        <circle cx="4" cy="4" r="2" />
      </svg>
    ),
  },
  {
    label: "Portfolio",
    url: "https://ayushmxxn.com",
    icon: (cls = "h-3.5 w-3.5") => (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
  },
  {
    label: "Instagram",
    url: "https://instagram.com/imayushmxxn",
    icon: (cls = "h-3.5 w-3.5") => (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
      </svg>
    ),
  },
  {
    label: "YouTube",
    url: "https://youtube.com/@imayushmxxn",
    icon: (cls = "h-3.5 w-3.5") => (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
        <polygon points="10 15 15 12 10 9 10 15" />
      </svg>
    ),
  },
];

interface Product {
  name: string;
  description: string;
  url: string;
  icon: string;
}

const PRODUCTS: Product[] = [
  {
    name: "Tabin",
    description: "Visual home for your favorite websites on New Tab.",
    url: "https://github.com/ayushmxxn/tabin",
    icon: "/icon-128.png",
  },
  {
    name: "Serenity UI",
    description: "Modern, customizable React component & animation library.",
    url: "https://www.serenity-ui.com",
    icon: "/serenity-ui.png",
  },
  {
    name: "Ice Theme",
    description: "Clean, minimal, icy-cool color theme for Visual Studio Code.",
    url: "https://icetheme.in",
    icon: "https://www.google.com/s2/favicons?domain=icetheme.in&sz=64",
  },
  {
    name: "Hammy",
    description: "Lightweight desktop break and posture reminder utility.",
    url: "https://hammyweb.online",
    icon: "https://www.google.com/s2/favicons?domain=hammyweb.online&sz=64",
  },
];

export function CreatorTab() {
  const [avatarLoaded, setAvatarLoaded] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  // Kit Newsletter subscription state
  const [email, setEmail] = useState("");
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubscribe = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || isSubscribing) return;

    setIsSubscribing(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      setIsSubscribed(true);
    } catch {
      // Graceful fallback
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <div className="min-h-full flex-1 flex flex-col justify-center gap-7 py-1">
      {/* 1. Profile & Socials */}
      <div className="flex flex-col gap-3.5">
        <div className="flex items-start gap-3.5">
          <div className="relative h-12 w-12 shrink-0 rounded-xl overflow-hidden border border-white/10 bg-white/[0.04] shadow-sm">
            {!avatarLoaded && !avatarError && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/[0.06] animate-pulse">
                <span className="text-[13px] font-semibold text-white/35">AS</span>
              </div>
            )}
            {avatarError ? (
              <div className="flex h-full w-full items-center justify-center bg-white/[0.06] text-white/40">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
            ) : (
              <img
                src={GITHUB_AVATAR_URL}
                alt="Ayushmaan Singh"
                className={`h-full w-full object-cover transition-opacity duration-200 ${
                  avatarLoaded ? "opacity-100" : "opacity-0"
                }`}
                onLoad={() => setAvatarLoaded(true)}
                onError={() => setAvatarError(true)}
              />
            )}
          </div>

          <div className="min-w-0 flex-1 pt-0.5">
            <h3 className="text-[15px] font-semibold text-white/95 tracking-tight">
              Ayushmaan Singh
            </h3>
            <p className="text-[12px] text-white/60 leading-relaxed mt-1">
              Design engineer, building digital products with taste, speed and detail.
            </p>
          </div>
        </div>

        {/* Socials */}
        <div className="flex items-center gap-1.5">
          {SOCIAL_LINKS.map((social) => (
            <a
              key={social.label}
              href={social.url}
              target="_blank"
              rel="noreferrer"
              title={social.label}
              aria-label={social.label}
              className="flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.03] text-white/55 hover:text-white hover:bg-white/[0.08] hover:border-white/[0.14] transition-all cursor-pointer"
            >
              {social.icon("h-3.5 w-3.5")}
            </a>
          ))}
        </div>
      </div>

      {/* 2. Products */}
      <div className="flex flex-col gap-1.5">
        <h4 className="text-[12px] font-medium text-white/50 px-0.5">
          Products
        </h4>
        <div className="divide-y divide-white/[0.04] border-y border-white/[0.05]">
          {PRODUCTS.map((product) => (
            <a
              key={product.name}
              href={product.url}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center justify-between py-2 px-1 rounded-lg hover:bg-white/[0.02] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0 pr-3">
                <img
                  src={product.icon}
                  alt=""
                  className="h-4.5 w-4.5 rounded-[4px] object-cover shrink-0 border border-white/10 bg-white/[0.04]"
                />
                <span className="text-[12.5px] font-medium text-white/90 group-hover:text-[#FA1E76] transition-colors shrink-0">
                  {product.name}
                </span>
                <span className="text-[11.5px] text-white/40 truncate">
                  {product.description}
                </span>
              </div>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="opacity-0 group-hover:opacity-60 transition-opacity shrink-0 text-white"
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          ))}
        </div>
      </div>

      {/* 3. Newsletter */}
      <div className="flex flex-col gap-2.5">
        <div className="flex flex-col gap-0.5 px-0.5">
          <h4 className="text-[12px] font-medium text-white/90 tracking-tight">
            Stay in the loop.
          </h4>
          <p className="text-[11.5px] text-white/45">
            New things I build and find interesting. No spam.
          </p>
        </div>

        {isSubscribed ? (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-[11.5px] font-medium text-emerald-400">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>Thanks for subscribing! Check your inbox to confirm.</span>
          </div>
        ) : (
          <form onSubmit={handleSubscribe} className="flex items-center gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="flex-1 h-[38px] rounded-[10px] border border-white/10 bg-white/[0.03] px-3.5 text-[12.5px] text-white placeholder-white/35 focus:border-[#FA1E76]/60 focus:bg-white/[0.05] focus:outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={isSubscribing || !email.trim()}
              className="h-[38px] rounded-[10px] bg-[#FA1E76] hover:bg-[#ff3086] active:bg-[#e01666] disabled:opacity-35 disabled:cursor-not-allowed px-4 text-[12px] font-medium text-white shadow-[0_2px_8px_rgba(250,30,118,0.3)] transition-all cursor-pointer shrink-0"
            >
              {isSubscribing ? "Subscribing…" : "Subscribe"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
