import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

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
            >
              <button
                className="session-title"
                onClick={() => handleSelectSession(session.session_id)}
                title={session.title}
              >
                💬 {session.title}
              </button>
              <button
                className="session-delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteSession(session.session_id);
                }}
                title="Delete Chat"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Terminal */}
      <div className="chat-container session-chat-pane">
        <div className="chat-header">
          <h3 className="chat-title">Broadcast Q&A Terminal</h3>
          <div className="model-selector-wrapper">
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
                    <div className="message-sources">
                      <details className="sources-details">
                        <summary className="sources-summary">
                          <span>Retrieved Context Snippets ({msg.sources.length})</span>
                        </summary>
                        <div className="sources-content">
                          {msg.sources.map((src, srcIdx) => (
                            <div key={srcIdx} className="source-snippet">
                              <span className="source-index">Chunk {srcIdx + 1}</span>
                              <p className="source-text">{src}</p>
                            </div>
                          ))}
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
    </div>
  );
}

export default ChatPanel;
