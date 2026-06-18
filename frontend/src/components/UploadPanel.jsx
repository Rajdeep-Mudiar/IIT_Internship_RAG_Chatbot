import React, { useState, useRef } from "react";
import axios from "axios";

function UploadPanel() {
  const [uploadMode, setUploadMode] = useState("document"); // "document" | "audio"
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | uploading | success | error
  const [message, setMessage] = useState("");
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      validateAndSetFile(droppedFile);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      validateAndSetFile(selectedFile);
    }
  };

  const validateAndSetFile = (selectedFile) => {
    const ext = selectedFile.name.split(".").pop().toLowerCase();
    if (uploadMode === "document") {
      if (["pdf", "docx", "txt"].includes(ext)) {
        setFile(selectedFile);
        setStatus("idle");
        setMessage("");
      } else {
        setFile(null);
        setStatus("error");
        setMessage("Invalid file format. Please upload PDF, DOCX, or TXT.");
      }
    } else {
      if (["mp3", "wav", "m4a", "flac", "ogg"].includes(ext)) {
        setFile(selectedFile);
        setStatus("idle");
        setMessage("");
      } else {
        setFile(null);
        setStatus("error");
        setMessage("Invalid file format. Please upload MP3, WAV, M4A, FLAC, or OGG.");
      }
    }
  };

  const onButtonClick = () => {
    fileInputRef.current.click();
  };

  const uploadFile = () => {
    if (!file) {
      setStatus("error");
      setMessage("Please select a file first.");
      return;
    }

    setStatus("uploading");
    setMessage(
      uploadMode === "document"
        ? "Uploading and processing document content..."
        : "Transcribing audio and indexing context with Whisper..."
    );

    const formData = new FormData();
    formData.append("file", file);

    const url =
      uploadMode === "document"
        ? "http://127.0.0.1:8000/upload"
        : "http://127.0.0.1:8000/audio-upload";

    axios
      .post(url, formData)
      .then((res) => {
        if (res.data.status === "error") {
          setStatus("error");
          setMessage(res.data.message);
        } else {
          setStatus("success");
          setMessage(
            uploadMode === "document"
              ? "Document uploaded and indexed successfully into ChromaDB."
              : "Audio transcribed and context indexed successfully."
          );
          setFile(null);
        }
      })
      .catch((err) => {
        setStatus("error");
        setMessage("Connection to backend server failed. Make sure port 8000 is open.");
      });
  };

  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  return (
    <div className="upload-container glass-card">
      <h3 className="card-title" style={{ marginBottom: "0.5rem" }}>
        {uploadMode === "document" ? "Upload RAG Context Document" : "Upload Broadcast Audio File"}
      </h3>
      <p className="card-subtitle" style={{ marginBottom: "1.5rem" }}>
        {uploadMode === "document"
          ? "Supported formats: PDF, DOCX, TXT (Max 10MB)"
          : "Supported formats: MP3, WAV, M4A, FLAC, OGG (Max 25MB)"}
      </p>

      <div className="upload-tabs" style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
        <button
          className={`btn ${uploadMode === "document" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => {
            setUploadMode("document");
            setFile(null);
            setStatus("idle");
            setMessage("");
          }}
          style={{ flex: 1, padding: "0.75rem", fontSize: "0.9rem" }}
        >
          📄 Text Documents
        </button>
        <button
          className={`btn ${uploadMode === "audio" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => {
            setUploadMode("audio");
            setFile(null);
            setStatus("idle");
            setMessage("");
          }}
          style={{ flex: 1, padding: "0.75rem", fontSize: "0.9rem" }}
        >
          🎵 Audio Broadcasts
        </button>
      </div>

      <form
        className={`drag-drop-zone ${dragActive ? "drag-active" : ""}`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onSubmit={(e) => e.preventDefault()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="file-input-hidden"
          onChange={handleChange}
          accept={uploadMode === "document" ? ".pdf,.docx,.txt" : ".mp3,.wav,.m4a,.flac,.ogg"}
        />

        <div className="upload-prompt">
          <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          {file ? (
            <div className="file-info">
              <span className="file-name">{file.name}</span>
              <span className="file-size">{formatBytes(file.size)}</span>
            </div>
          ) : (
            <p>
              Drag & drop your file here or{" "}
              <span className="browse-link" onClick={onButtonClick}>
                browse
              </span>
            </p>
          )}
        </div>
      </form>

      {file && status !== "uploading" && (
        <button className="btn btn-primary btn-upload" onClick={uploadFile}>
          {uploadMode === "document" ? "Upload & Index Document" : "Upload & Transcribe Audio"}
        </button>
      )}

      {status === "uploading" && (
        <div className="upload-loader">
          <div className="spinner"></div>
          <span className="status-text">{message}</span>
        </div>
      )}

      {status === "success" && (
        <div className="alert alert-success">
          <svg className="alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>{message}</span>
        </div>
      )}

      {status === "error" && (
        <div className="alert alert-danger">
          <svg className="alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>{message}</span>
        </div>
      )}
    </div>
  );
}

export default UploadPanel;
