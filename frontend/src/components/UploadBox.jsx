import React, { useState, useRef } from "react";
import axios from "axios";

function UploadBox() {
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
    if (["pdf", "docx", "txt"].includes(ext)) {
      setFile(selectedFile);
      setStatus("idle");
      setMessage("");
    } else {
      setFile(null);
      setStatus("error");
      setMessage("Invalid file format. Please upload PDF, DOCX, or TXT.");
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
    setMessage("Uploading and processing document content...");

    const formData = new FormData();
    formData.append("file", file);

    axios
      .post("http://127.0.0.1:8000/upload", formData)
      .then((res) => {
        if (res.data.status === "error") {
          setStatus("error");
          setMessage(res.data.message);
        } else {
          setStatus("success");
          setMessage("Document uploaded and indexed successfully into ChromaDB.");
          setFile(null); // clear file list after success
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
      <h3 className="card-title">Upload RAG Context Document</h3>
      <p className="card-subtitle">Supported formats: PDF, DOCX, TXT (Max 10MB)</p>

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
          accept=".pdf,.docx,.txt"
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
          Upload & Index Document
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

export default UploadBox;
