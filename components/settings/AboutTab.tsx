import { motion } from "motion/react";

const GITHUB_REPO_URL = "https://github.com/ayushmxxn/tabin";
const GITHUB_ISSUES_URL = "https://github.com/ayushmxxn/tabin/issues";
const GITHUB_NEW_ISSUE_URL = "https://github.com/ayushmxxn/tabin/issues/new";

export function AboutTab() {
  const version =
    typeof chrome !== "undefined" && chrome.runtime?.getManifest
      ? chrome.runtime.getManifest().version
      : "0.1.0";

  return (
    <div className="flex flex-col gap-4">
      {/* Hero Header */}
      <div className="flex items-start gap-4 pb-4 border-b border-white/[0.06]">
        <img
          src="/icon-128.png"
          alt="Tabin icon"
          className="h-12 w-12 rounded-2xl object-cover border border-white/[0.12] shadow-[0_8px_20px_-4px_rgba(0,0,0,0.5)] shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-[15px] font-semibold text-white/95 tracking-tight">
              Tabin
            </h3>
            <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-white/[0.07] text-white/60 border border-white/[0.08] leading-none">
              v{version}
            </span>
            <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-[#FA1E76]/15 text-[#FA1E76] border border-[#FA1E76]/25 leading-none">
              MIT License
            </span>
          </div>
          <p className="text-[12px] text-white/50 mt-1 leading-relaxed">
            Turn your New Tab into a visual home for your favorite websites.
          </p>
        </div>
      </div>

      {/* Quick Action Links */}
      <div className="grid grid-cols-3 gap-2.5">
        <a
          href={GITHUB_REPO_URL}
          target="_blank"
          rel="noreferrer"
          className="group flex flex-col rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 hover:border-white/[0.12] hover:bg-white/[0.05] transition-all cursor-pointer shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]"
        >
          <div className="flex items-center justify-between text-white/70 group-hover:text-white transition-colors">
            <span className="text-[12px] font-medium">GitHub</span>
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-50 group-hover:opacity-100 transition-opacity"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </div>
          <span className="text-[10.5px] text-white/40 mt-1">
            Browse source code and releases
          </span>
        </a>

        <a
          href={GITHUB_NEW_ISSUE_URL}
          target="_blank"
          rel="noreferrer"
          className="group flex flex-col rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 hover:border-white/[0.12] hover:bg-white/[0.05] transition-all cursor-pointer shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]"
        >
          <div className="flex items-center justify-between text-white/70 group-hover:text-white transition-colors">
            <span className="text-[12px] font-medium">Report a bug</span>
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-50 group-hover:opacity-100 transition-opacity"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <span className="text-[10.5px] text-white/40 mt-1">
            File issues or submit suggestions
          </span>
        </a>

        <a
          href={GITHUB_ISSUES_URL}
          target="_blank"
          rel="noreferrer"
          className="group flex flex-col rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 hover:border-white/[0.12] hover:bg-white/[0.05] transition-all cursor-pointer shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]"
        >
          <div className="flex items-center justify-between text-white/70 group-hover:text-white transition-colors">
            <span className="text-[12px] font-medium">Feedback & contact</span>
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-50 group-hover:opacity-100 transition-opacity"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <span className="text-[10.5px] text-white/40 mt-1">
            Join discussions and share ideas
          </span>
        </a>
      </div>

      {/* Details & Credits Section */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 space-y-2.5">
        <div className="flex items-center justify-between text-[11.5px]">
          <span className="text-white/45">Project type</span>
          <span className="text-white/80 font-medium">Free and open source</span>
        </div>
        <div className="h-px bg-white/[0.04]" />
        <div className="flex items-center justify-between text-[11.5px]">
          <span className="text-white/45">License</span>
          <span className="text-white/80 font-medium">MIT License</span>
        </div>
        <div className="h-px bg-white/[0.04]" />
        <div className="flex items-center justify-between text-[11.5px]">
          <span className="text-white/45">Built with</span>
          <span className="text-white/80 font-medium">React, Tailwind CSS, Motion & WXT</span>
        </div>
        <div className="h-px bg-white/[0.04]" />
        <div className="flex items-center justify-between text-[11.5px]">
          <span className="text-white/45">Author</span>
          <a
            href="https://github.com/ayushmxxn"
            target="_blank"
            rel="noreferrer"
            className="text-[#FA1E76] hover:text-[#FA1E76]/80 transition-colors font-medium"
          >
            Ayushmaan Singh (@ayushmxxn)
          </a>
        </div>
      </div>
    </div>
  );
}
