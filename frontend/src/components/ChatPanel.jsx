import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

// Helper function to detect source type (for icons and labels)
const getSourceTypeIconAndLabel = (source) => {
  if (!source) return { icon: "📄", label: "Source" };
  const lower = source.toLowerCase();
  if (lower.startsWith("http://") || lower.startsWith("https://") || lower.includes("www.")) {
    return { icon: "🌐", label: "Website" };
  }
  const ext = lower.split(".").pop();
  if (ext === "pdf") {
    return { icon: "📄", label: "PDF Document" };
  }
  if (["docx", "txt"].includes(ext)) {
    return { icon: "📄", label: "Document" };
  }
  if (["mp3", "wav", "m4a", "flac", "ogg"].includes(ext)) {
    return { icon: "🎵", label: "Audio Broadcast" };
  }
  if (["mp4", "avi", "mkv", "mov", "webm"].includes(ext)) {
    return { icon: "🎥", label: "Video Broadcast" };
  }
  if (["png", "jpg", "jpeg"].includes(ext)) {
    return { icon: "🖼️", label: "Image Content" };
  }
  if (source.includes(" ") || !source.includes(".")) {
    return { icon: "🌐", label: "Webpage" };
  }
  return { icon: "📄", label: "Source" };
};

// Helper function to format timestamp nicely
const formatTime = (dateStr) => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return "";
  }
};

function ChatPanel() {
  const [models, setModels] = useState(["auto-select", "qwen3:latest", "phi:latest", "gemma:2b", "llama3.2:1b"]);
  const [selectedModel, setSelectedModel] = useState("auto-select");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  
  const messagesEndRef = useRef(null);
  const imageInputRef = useRef(null);

  // Chat sessions state
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editTitleText, setEditTitleText] = useState("");

  // Automatic Summary States
  const [showSummaryPanel, setShowSummaryPanel] = useState(false);
  const [assets, setAssets] = useState([]);
  const [selectedAssetId, setSelectedAssetId] = useState("chat_session");
  const [summarizing, setSummarizing] = useState(false);
  const [summaryData, setSummaryData] = useState(null); // { short, medium, detailed }
  const [summaryTab, setSummaryTab] = useState("short"); // "short" | "medium" | "detailed"
  const [summaryError, setSummaryError] = useState("");

  const fetchAssetsForSummary = () => {
    axios
      .get("http://127.0.0.1:8000/assets")
      .then((res) => {
        setAssets(res.data.assets || []);
      })
      .catch((err) => {
        console.error("Failed to fetch assets:", err);
      });
  };

  const runSummarization = (assetId) => {
    setSummarizing(true);
    setSummaryError("");
    setSummaryData(null);
    
    let endpoint = "http://127.0.0.1:8000/summarize";
    let payload = {
      model: selectedModel,
      asset_id: assetId === "all" ? null : assetId
    };
    
    if (assetId === "chat_session") {
      endpoint = `http://127.0.0.1:8000/chat/sessions/${activeSessionId}/summarize`;
      payload = { model: selectedModel };
    }
    
    axios
      .post(endpoint, payload)
      .then((res) => {
        setSummarizing(false);
        if (res.data.status === "error") {
          setSummaryError(res.data.message);
        } else {
          setSummaryData({
            short: res.data.short,
            medium: res.data.medium,
            detailed: res.data.detailed
          });
        }
      })
      .catch((err) => {
        setSummarizing(false);
        setSummaryError("Failed to connect to backend summarizer.");
      });
  };

  const fetchSessions = (selectFirst = false) => {
    axios
      .get("http://127.0.0.1:8000/chat/sessions")
      .then((res) => {
        const sList = res.data.sessions || [];
        setSessions(sList);
        if (sList.length > 0) {
          if (selectFirst || !activeSessionId) {
            setActiveSessionId(sList[0].session_id);
            fetchMessages(sList[0].session_id);
          }
        } else {
          // If no sessions exist on the backend, create one
          handleNewChat();
        }
      })
      .catch((err) => {
        console.error("Failed to fetch sessions:", err);
      });
  };

  const fetchMessages = (sessionId) => {
    if (!sessionId) return;
    axios
      .get(`http://127.0.0.1:8000/chat/sessions/${sessionId}/messages`)
      .then((res) => {
        const msgs = (res.data.messages || []).map((m) => ({
          sender: m.sender,
          text: m.text,
          image: m.image,
          model: m.model,
          embedModel: m.embedModel,
          score: m.score,
          latency: m.latency,
          sources: m.sources,
        }));
        setMessages(msgs);
      })
      .catch((err) => {
        console.error("Failed to fetch messages for session:", sessionId, err);
      });
  };

  const handleNewChat = () => {
    axios
      .post("http://127.0.0.1:8000/chat/sessions", { title: "New Chat" })
      .then((res) => {
        const newId = res.data.session_id;
        setActiveSessionId(newId);
        setMessages([]);
        // Refresh sessions list
        axios.get("http://127.0.0.1:8000/chat/sessions").then((r) => {
          setSessions(r.data.sessions || []);
        });
      })
      .catch((err) => {
        console.error("Failed to create new session:", err);
      });
  };

  const handleDeleteSession = (sessionId) => {
    axios
      .delete(`http://127.0.0.1:8000/chat/sessions/${sessionId}`)
      .then(() => {
        const remaining = sessions.filter((s) => s.session_id !== sessionId);
        setSessions(remaining);
        
        if (activeSessionId === sessionId) {
          if (remaining.length > 0) {
            setActiveSessionId(remaining[0].session_id);
            fetchMessages(remaining[0].session_id);
          } else {
            handleNewChat();
          }
        }
      })
      .catch((err) => {
        console.error("Failed to delete session:", err);
      });
  };

  const handleRenameSession = (sessionId) => {
    if (!editTitleText.trim()) {
      setEditingSessionId(null);
      return;
    }
    axios
      .put(`http://127.0.0.1:8000/chat/sessions/${sessionId}`, { title: editTitleText })
      .then(() => {
        setEditingSessionId(null);
        setSessions((prev) =>
          prev.map((s) => (s.session_id === sessionId ? { ...s, title: editTitleText } : s))
        );
      })
      .catch((err) => {
        console.error("Failed to rename session:", err);
        setEditingSessionId(null);
      });
  };

  const handleSelectSession = (sessionId) => {
    setActiveSessionId(sessionId);
    fetchMessages(sessionId);
  };

  useEffect(() => {
    // Fetch available models from backend
    axios
      .get("http://127.0.0.1:8000/models")
      .then((res) => {
        if (res.data && res.data.models) {
          setModels(res.data.models);
          if (res.data.models.length > 0) {
            if (res.data.models.includes("auto-select")) {
              setSelectedModel("auto-select");
            } else {
              setSelectedModel(res.data.models[0]);
            }
          }
        }
      })
      .catch(() => {
        // Fallback already set in state
      });

    // Load user's chat sessions
    fetchSessions(true);
    fetchAssetsForSummary();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview("");
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  const askQuestion = (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    const userMsg = { sender: "user", text: question, image: imagePreview };
    setMessages((prev) => [...prev, userMsg]);
    setQuestion("");
    setImageFile(null);
    setImagePreview("");
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
    setLoading(true);

    if (userMsg.image) {
      // Route to multimodal /image-chat
      axios
        .post("http://127.0.0.1:8000/image-chat", {
          question: userMsg.text,
          image: userMsg.image,
          session_id: activeSessionId
        })
        .then((res) => {
          const aiMsg = {
            sender: "assistant",
            text: res.data.answer,
            sources: [],
            model: res.data.selected_model,
            embedModel: "None",
            score: 0,
            latency: res.data.latency,
          };
          setMessages((prev) => [...prev, aiMsg]);
          setLoading(false);
          // Refresh sessions in case the title changed
          axios.get("http://127.0.0.1:8000/chat/sessions").then((r) => {
            setSessions(r.data.sessions || []);
          });
        })
        .catch((err) => {
          const errMsg = {
            sender: "assistant",
            text: "Failed to connect to backend vision API. Make sure port 8000 is open and minicpm-v is active.",
            sources: [],
            model: "minicpm-v",
            embedModel: "None",
            score: 0,
          };
          setMessages((prev) => [...prev, errMsg]);
          setLoading(false);
        });
    } else {
      // Standard chat path
      axios
        .post("http://127.0.0.1:8000/chat", {
          question: userMsg.text,
          model: selectedModel,
          session_id: activeSessionId
        })
        .then((res) => {
          const aiMsg = {
            sender: "assistant",
            text: res.data.answer,
            sources: res.data.retrieved_chunks || [],
            model: res.data.selected_model,
            embedModel: res.data.selected_embed_model,
            score: res.data.score,
            latency: res.data.latency,
          };
          setMessages((prev) => [...prev, aiMsg]);
          setLoading(false);
          // Refresh sessions in case the title changed
          axios.get("http://127.0.0.1:8000/chat/sessions").then((r) => {
            setSessions(r.data.sessions || []);
          });
        })
        .catch((err) => {
          const errMsg = {
            sender: "assistant",
            text: "Failed to connect to backend server. Make sure port 8000 is open and Ollama is running.",
            sources: [],
            model: null,
            embedModel: null,
            score: 0,
          };
          setMessages((prev) => [...prev, errMsg]);
          setLoading(false);
        });
    }
  };
  const renderSummaryValue = (val) => {
    if (!val) return "";
    if (typeof val === "object") {
      if (Array.isArray(val)) {
        return val.map((item, idx) => {
          if (typeof item === "object") {
            return (
              <div key={idx} style={{ marginBottom: "0.5rem", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "0.5rem" }}>
                {Object.entries(item).map(([k, v]) => (
                  <div key={k}><strong>{k}:</strong> {typeof v === "object" ? JSON.stringify(v) : String(v)}</div>
                ))}
              </div>
            );
          }
          return <div key={idx}>- {String(item)}</div>;
        });
      }
      return (
        <div>
          {Object.entries(val).map(([k, v]) => (
            <div key={k} style={{ marginBottom: "0.5rem" }}>
              <strong>{k}:</strong> {typeof v === "object" ? JSON.stringify(v) : String(v)}
            </div>
          ))}
        </div>
      );
    }
    return String(val);
  };

  return (
    <div className="chat-session-wrapper">
      {/* Sessions Sidebar */}
      <div className="chat-sessions-sidebar">
        <button className="btn btn-primary new-chat-btn" onClick={handleNewChat}>
          ➕ New Chat
        </button>
        <div className="sessions-list">
          {sessions.map((session) => (
            <div
              key={session.session_id}
              className={`session-item ${activeSessionId === session.session_id ? "active" : ""}`}
              style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "0.25rem", position: "relative", padding: "0.75rem" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                <span style={{ fontSize: "0.72rem", color: activeSessionId === session.session_id ? "rgba(255,255,255,0.7)" : "var(--text-muted)", fontWeight: "500" }}>
                  ⏰ {formatTime(session.updated_at || session.created_at)}
                </span>
                <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                  <button
                    className="session-rename-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingSessionId(session.session_id);
                      setEditTitleText(session.title);
                    }}
                    title="Rename Chat"
                    style={{ opacity: 0.6, fontSize: "0.8rem", padding: 0, background: "none", border: "none", color: "inherit", cursor: "pointer" }}
                  >
                    ✏️
                  </button>
                  <button
                    className="session-delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSession(session.session_id);
                    }}
                    title="Delete Chat"
                    style={{ opacity: 0.6, fontSize: "0.8rem", padding: 0, background: "none", border: "none", color: "inherit", cursor: "pointer" }}
                  >
                    ✕
                  </button>
                </div>
              </div>
              {editingSessionId === session.session_id ? (
                <input
                  type="text"
                  value={editTitleText}
                  onChange={(e) => setEditTitleText(e.target.value)}
                  onBlur={() => handleRenameSession(session.session_id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleRenameSession(session.session_id);
                    } else if (e.key === "Escape") {
                      setEditingSessionId(null);
                    }
                  }}
                  autoFocus
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: "4px",
                    color: "white",
                    fontSize: "0.85rem",
                    padding: "0.2rem 0.4rem",
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <button
                  className="session-title"
                  onClick={() => handleSelectSession(session.session_id)}
                  title={session.title}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    background: "none",
                    border: "none",
                    color: activeSessionId === session.session_id ? "#ffffff" : "inherit",
                    padding: 0,
                    fontSize: "0.85rem",
                    fontWeight: "600",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap"
                  }}
                >
                  💬 {session.title}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Terminal */}
      <div className="chat-container session-chat-pane">
        <div className="chat-header">
          <h3 className="chat-title">Broadcast Q&A Terminal</h3>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <button
              type="button"
              className={`btn ${showSummaryPanel ? "btn-primary" : "btn-secondary"}`}
              onClick={() => {
                setShowSummaryPanel(!showSummaryPanel);
                if (!showSummaryPanel) {
                  fetchAssetsForSummary();
                }
              }}
              style={{
                fontSize: "0.85rem",
                padding: "0.4rem 0.8rem",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                cursor: "pointer"
              }}
            >
              📰 Auto Summary
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setSelectedAssetId("chat_session");
                setShowSummaryPanel(true);
                runSummarization("chat_session");
              }}
              disabled={messages.length === 0}
              style={{
                fontSize: "0.85rem",
                padding: "0.4rem 0.8rem",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                cursor: "pointer"
              }}
              title="Summarize the entire conversation in this chat session"
            >
              📝 Summarize Session
            </button>
            
            <div className="model-selector-wrapper" style={{ margin: 0 }}>
              <label htmlFor="model-select">Active LLM:</label>
              <select
                id="model-select"
                className="model-select"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={!!imagePreview}
              >
                {imagePreview ? (
                  <option value="minicpm-v">🤖 Multimodal: minicpm-v</option>
                ) : (
                  models.map((model) => (
                    <option key={model} value={model}>
                      {model === "auto-select" ? "🤖 Auto-Select (Best RAG + LLM)" : model}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
        </div>

        <div className="chat-messages-area">
          {messages.length === 0 ? (
            <div className="chat-empty-state">
              <svg className="chat-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              <p>
                Upload documents/audio under the Upload tab, and ask text or image-based multimodal questions.
              </p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div key={index} className={`message-row ${msg.sender}`}>
                <div className="message-avatar">
                  {msg.sender === "user" ? "U" : "AI"}
                </div>
                <div className="message-content-wrapper">
                  {msg.image && (
                    <div className="chat-message-image-preview" style={{ marginBottom: "0.5rem" }}>
                      <img
                        src={msg.image}
                        alt="User attachment"
                        style={{
                          maxWidth: "250px",
                          maxHeight: "200px",
                          borderRadius: "8px",
                          border: "1px solid rgba(255,255,255,0.15)",
                          objectFit: "cover"
                        }}
                      />
                    </div>
                  )}
                  <div className="message-bubble">
                    <p>{msg.text}</p>
                  </div>

                  {msg.sender === "assistant" && msg.model && (
                    <div className="message-model-badge">
                      <span>
                        ⚡ RAG: <strong>{msg.embedModel ? msg.embedModel.split("/").pop() : "active"}</strong>
                        {" | "}
                        LLM: <strong>{msg.model}</strong>
                      </span>
                      {msg.score !== undefined && msg.score > 0 ? (
                        <span className="badge-score">Score: {msg.score}/100</span>
                      ) : (
                        msg.latency !== undefined && msg.latency > 0 && (
                          <span className="badge-latency">Latency: {msg.latency}s</span>
                        )
                      )}
                    </div>
                  )}

                  {msg.sources && msg.sources.length > 0 && (
                    <div className="message-sources" style={{ marginTop: "0.8rem" }}>
                      <details className="sources-details" style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", background: "rgba(255,255,255,0.01)" }}>
                        <summary className="sources-summary" style={{ padding: "0.6rem 1rem", cursor: "pointer", color: "#94a3b8", fontSize: "0.85rem", fontWeight: "600", userSelect: "none" }}>
                          <span>🔍 Retrieved Context Citations ({msg.sources.length})</span>
                        </summary>
                        <div className="sources-content" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                          {msg.sources.map((src, srcIdx) => {
                            const isObj = src && typeof src === "object";
                            const text = isObj ? src.text : src;
                            const origin = isObj ? src.source : "document";
                            const page = isObj ? src.page : null;
                            const chunk = isObj ? src.chunk : (srcIdx + 1);

                            const typeInfo = getSourceTypeIconAndLabel(origin);

                            return (
                              <div key={srcIdx} className="source-snippet" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", padding: "0.75rem 1rem", borderRadius: "8px" }}>
                                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                                  <span style={{ background: "rgba(59,130,246,0.15)", color: "#93c5fd", fontSize: "0.75rem", padding: "0.15rem 0.5rem", borderRadius: "4px", fontWeight: "bold" }}>
                                    {typeInfo.icon} {typeInfo.label}
                                  </span>
                                  <span style={{ color: "#ffffff", fontSize: "0.8rem", fontWeight: "500", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={origin}>
                                    {origin}
                                  </span>
                                  {page && (
                                    <span style={{ background: "rgba(168,85,247,0.15)", color: "#d8b4fe", fontSize: "0.75rem", padding: "0.15rem 0.5rem", borderRadius: "4px" }}>
                                      Page {page}
                                    </span>
                                  )}
                                  <span style={{ background: "rgba(245,158,11,0.15)", color: "#fde047", fontSize: "0.75rem", padding: "0.15rem 0.5rem", borderRadius: "4px" }}>
                                    Chunk {chunk}
                                  </span>
                                </div>
                                <p className="source-text" style={{ fontSize: "0.85rem", color: "#cbd5e1", lineHeight: "1.4", margin: 0, whiteSpace: "pre-wrap" }}>
                                  {text}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {loading && (
            <div className="message-row assistant typing">
              <div className="message-avatar">AI</div>
              <div className="message-bubble">
                <div className="typing-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="chat-input-form" onSubmit={askQuestion}>
          <input
            type="file"
            ref={imageInputRef}
            style={{ display: "none" }}
            accept="image/*"
            onChange={handleImageChange}
          />
          
          <button
            type="button"
            className="btn-attach"
            onClick={() => imageInputRef.current?.click()}
            style={{
              padding: "0.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginRight: "0.5rem",
              borderRadius: "8px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              cursor: "pointer",
              color: "white"
            }}
            title="Attach Image for Multimodal Question"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "18px", height: "18px" }}>
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
          </button>

          <input
            type="text"
            className="chat-input"
            placeholder={imagePreview ? "Ask a question about the attached image..." : "Ask a question based on your uploaded document..."}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={loading}
          />
          
          {imagePreview && (
            <div
              className="input-image-badge"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                background: "rgba(255,255,255,0.1)",
                padding: "0.25rem 0.5rem",
                borderRadius: "6px",
                marginLeft: "0.5rem"
              }}
            >
              <img src={imagePreview} alt="Attached" style={{ width: "24px", height: "24px", objectFit: "cover", borderRadius: "4px" }} />
              <button
                type="button"
                onClick={removeImage}
                style={{
                  background: "none",
                  border: "none",
                  color: "#f87171",
                  cursor: "pointer",
                  fontSize: "1rem",
                  padding: 0,
                  lineHeight: 1
                }}
              >
                ×
              </button>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-send" disabled={loading || !question.trim()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="send-icon">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </form>
      </div>

      {/* Automatic Summarizer Sidebar Panel */}
      {showSummaryPanel && (
        <div
          className="summary-sidebar-panel"
          style={{
            width: "350px",
            background: "rgba(17, 24, 39, 0.4)",
            borderLeft: "1px solid var(--border-light)",
            display: "flex",
            flexDirection: "column",
            padding: "1.25rem 1.2rem",
            gap: "1rem",
            flexShrink: 0,
            overflowY: "auto",
            height: "100%"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              📰 Summarizer
            </h3>
            <button
              onClick={() => setShowSummaryPanel(false)}
              style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "1.1rem" }}
            >
              ✕
            </button>
          </div>

          <div>
            <label className="modal-label" style={{ fontSize: "0.8rem", color: "#94a3b8", display: "block", marginBottom: "0.4rem" }}>
              Select Source Content:
            </label>
            <select
              value={selectedAssetId}
              onChange={(e) => setSelectedAssetId(e.target.value)}
              style={{
                width: "100%",
                padding: "0.6rem",
                borderRadius: "6px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "white",
                fontSize: "0.85rem"
              }}
            >
              <option value="chat_session">💬 Active Chat Conversation</option>
              <option value="all">📚 Complete Knowledge Base (All)</option>
              {assets.map((asset) => (
                <option key={asset.asset_id} value={asset.asset_id}>
                  {asset.file_type === "document" && "📄"}
                  {asset.file_type === "audio" && "🎵"}
                  {asset.file_type === "video" && "🎥"}
                  {asset.file_type === "image" && "🖼️"}
                  {asset.file_type === "url" && "🌐"}
                  {" "}
                  {asset.filename.length > 30 ? asset.filename.substring(0, 30) + "..." : asset.filename}
                </option>
              ))}
            </select>
          </div>

          <button
            className="btn btn-primary"
            onClick={() => runSummarization(selectedAssetId)}
            disabled={summarizing}
            style={{ width: "100%", padding: "0.75rem", fontSize: "0.9rem", fontWeight: "bold", cursor: "pointer" }}
          >
            {summarizing ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                <span className="spinner-small" style={{ border: "2px solid #fff", borderTop: "2px solid transparent", borderRadius: "50%", width: "12px", height: "12px", animation: "spin 1s linear infinite" }}></span> Summarizing...
              </span>
            ) : (
              "⚡ Generate Summary"
            )}
          </button>

          {summaryError && (
            <div className="alert alert-danger" style={{ fontSize: "0.8rem", padding: "0.5rem 0.75rem", margin: 0 }}>
              {summaryError}
            </div>
          )}

          {summaryData && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", flexGrow: 1, marginTop: "0.5rem" }}>
              <div
                style={{
                  display: "flex",
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                  paddingBottom: "0.2rem"
                }}
              >
                {["short", "medium", "detailed"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setSummaryTab(t)}
                    style={{
                      flex: 1,
                      background: "none",
                      border: "none",
                      padding: "0.5rem 0",
                      fontSize: "0.8rem",
                      fontWeight: "bold",
                      cursor: "pointer",
                      textTransform: "capitalize",
                      color: summaryTab === t ? "#3b82f6" : "#64748b",
                      borderBottom: summaryTab === t ? "2px solid #3b82f6" : "2px solid transparent",
                      transition: "all 0.2s"
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div
                style={{
                  background: "rgba(255,255,255,0.01)",
                  border: "1px solid rgba(255,255,255,0.04)",
                  borderRadius: "8px",
                  padding: "1rem",
                  fontSize: "0.85rem",
                  lineHeight: "1.5",
                  color: "#cbd5e1",
                  overflowY: "auto",
                  maxHeight: "350px",
                  whiteSpace: "pre-wrap"
                }}
              >
                {summaryTab === "short" && renderSummaryValue(summaryData.short)}
                {summaryTab === "medium" && renderSummaryValue(summaryData.medium)}
                {summaryTab === "detailed" && renderSummaryValue(summaryData.detailed)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ChatPanel;
