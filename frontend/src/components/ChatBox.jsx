import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

function ChatBox() {
  const [models, setModels] = useState(["auto-select", "qwen3:latest", "phi:latest", "gemma:2b", "llama3.2:1b"]);
  const [selectedModel, setSelectedModel] = useState("auto-select");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Fetch available models from backend
    axios
      .get("http://127.0.0.1:8000/models")
      .then((res) => {
        if (res.data && res.data.models) {
          setModels(res.data.models);
          // Set default selected model
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
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const askQuestion = (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    const userMsg = { sender: "user", text: question };
    setMessages((prev) => [...prev, userMsg]);
    setQuestion("");
    setLoading(true);

    axios
      .post("http://127.0.0.1:8000/chat", {
        question: userMsg.text,
        model: selectedModel,
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
  };

  return (
    <div className="chat-container glass-card">
      <div className="chat-header">
        <h3 className="chat-title">Document Q&A Terminal</h3>
        <div className="model-selector-wrapper">
          <label htmlFor="model-select">Active LLM:</label>
          <select
            id="model-select"
            className="model-select"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
          >
            {models.map((model) => (
              <option key={model} value={model}>
                {model === "auto-select" ? "🤖 Auto-Select (Best RAG + LLM)" : model}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="chat-messages-area">
        {messages.length === 0 ? (
          <div className="chat-empty-state">
            <svg className="chat-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <p>Upload a document and ask a question. Using "Auto-Select" will automatically select the best embedding model for retrieval and route generation to the highest-scoring LLM.</p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div key={index} className={`message-row ${msg.sender}`}>
              <div className="message-avatar">
                {msg.sender === "user" ? "U" : "AI"}
              </div>
              <div className="message-content-wrapper">
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
          type="text"
          className="chat-input"
          placeholder="Ask a question based on your uploaded document..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={loading}
        />
        <button type="submit" className="btn btn-primary btn-send" disabled={loading || !question.trim()}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="send-icon">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </form>
    </div>
  );
}

export default ChatBox;
