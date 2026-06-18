import React from "react";

function Sidebar({ activeTab, setActiveTab }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="logo-icon">▲</div>
        <div className="logo-text">
          <span>Antigravity</span>
          <span className="subtitle">RAG Analytics</span>
        </div>
      </div>

      <nav className="sidebar-menu">
        <button
          className={`menu-item ${activeTab === "chat" ? "active" : ""}`}
          onClick={() => setActiveTab("chat")}
        >
          <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <span>Document Chat</span>
        </button>

        <button
          className={`menu-item ${activeTab === "compare" ? "active" : ""}`}
          onClick={() => setActiveTab("compare")}
        >
          <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3z"></path>
            <path d="M6 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3z"></path>
          </svg>
          <span>Model Comparison</span>
        </button>

        <button
          className={`menu-item ${activeTab === "embedding" ? "active" : ""}`}
          onClick={() => setActiveTab("embedding")}
        >
          <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
          </svg>
          <span>Embedding Benchmark</span>
        </button>

        <button
          className={`menu-item ${activeTab === "history" ? "active" : ""}`}
          onClick={() => setActiveTab("history")}
        >
          <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="20" x2="18" y2="10"></line>
            <line x1="12" y1="20" x2="12" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="14"></line>
          </svg>
          <span>Historical Analytics</span>
        </button>
      </nav>

      <div className="sidebar-footer">
        <div className="system-status">
          <span className="status-indicator online"></span>
          <span>System Online</span>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
