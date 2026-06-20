import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

function UploadPanel() {
  const [uploadMode, setUploadMode] = useState("document"); // "document" | "audio" | "video" | "image"
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | uploading | success | error
  const [message, setMessage] = useState("");
  const fileInputRef = useRef(null);

  // Asset CRUD States
  const [assets, setAssets] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editText, setEditText] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  const fetchAssets = () => {
    axios
      .get("http://127.0.0.1:8000/assets")
      .then((res) => {
        setAssets(res.data.assets || []);
      })
      .catch((err) => {
        console.error("Failed to fetch assets:", err);
      });
  };

  useEffect(() => {
    fetchAssets();
  }, []);

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
    } else if (uploadMode === "audio") {
      if (["mp3", "wav", "m4a", "flac", "ogg"].includes(ext)) {
        setFile(selectedFile);
        setStatus("idle");
        setMessage("");
      } else {
        setFile(null);
        setStatus("error");
        setMessage("Invalid file format. Please upload MP3, WAV, M4A, FLAC, or OGG.");
      }
    } else if (uploadMode === "video") {
      if (["mp4", "avi", "mkv", "mov", "webm"].includes(ext)) {
        setFile(selectedFile);
        setStatus("idle");
        setMessage("");
      } else {
        setFile(null);
        setStatus("error");
        setMessage("Invalid file format. Please upload MP4, AVI, MKV, MOV, or WEBM.");
      }
    } else {
      if (["png", "jpg", "jpeg"].includes(ext)) {
        setFile(selectedFile);
        setStatus("idle");
        setMessage("");
      } else {
        setFile(null);
        setStatus("error");
        setMessage("Invalid file format. Please upload PNG, JPG, or JPEG.");
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
    let loadingMessage = "";
    let endpoint = "";

    if (uploadMode === "document") {
      loadingMessage = "Uploading and processing document content...";
      endpoint = "http://127.0.0.1:8000/upload";
    } else if (uploadMode === "audio") {
      loadingMessage = "Transcribing audio and indexing context with Whisper...";
      endpoint = "http://127.0.0.1:8000/audio-upload";
    } else if (uploadMode === "video") {
      loadingMessage = "Extracting audio soundtrack and transcribing video context with Whisper...";
      endpoint = "http://127.0.0.1:8000/video-upload";
    } else {
      loadingMessage = "Running Ollama multimodal analysis to transcribe and index image context...";
      endpoint = "http://127.0.0.1:8000/image-upload";
    }

    setMessage(loadingMessage);

    const formData = new FormData();
    formData.append("file", file);

    axios
      .post(endpoint, formData)
      .then((res) => {
        if (res.data.status === "error") {
          setStatus("error");
          setMessage(res.data.message);
        } else {
          setStatus("success");
          let successMessage = "";
          if (uploadMode === "document") {
            successMessage = "Document uploaded and indexed successfully into ChromaDB.";
          } else if (uploadMode === "audio") {
            successMessage = "Audio broadcast transcribed and context indexed successfully.";
          } else if (uploadMode === "video") {
            successMessage = "Video soundtrack extracted, transcribed, and indexed successfully.";
          } else {
            successMessage = "Image content analyzed, transcribed, and indexed successfully.";
          }
          setMessage(successMessage);
          setFile(null);
          // Refresh list of assets
          fetchAssets();
        }
      })
      .catch((err) => {
        setStatus("error");
        setMessage("Connection to backend server failed. Make sure port 8000 is open.");
      });
  };

  const handleDeleteAsset = (assetId) => {
    if (!window.confirm("Are you sure you want to delete this asset? This will remove its text chunks from the RAG vector search.")) {
      return;
    }
    axios
      .delete(`http://127.0.0.1:8000/assets/${assetId}`)
      .then((res) => {
        if (res.data.status === "success") {
          fetchAssets();
        } else {
          alert(`Error deleting asset: ${res.data.message}`);
        }
      })
      .catch(() => {
        alert("Failed to connect to backend server to delete asset.");
      });
  };

  const openEditModal = (asset) => {
    setSelectedAsset(asset);
    setEditTitle(asset.filename);
    setEditText(asset.text_content);
    setIsModalOpen(true);
  };

  const handleUpdateAsset = () => {
    if (!editTitle.trim()) return;
    setModalLoading(true);

    axios
      .put(`http://127.0.0.1:8000/assets/${selectedAsset.asset_id}`, {
        filename: editTitle,
        text_content: editText
      })
      .then((res) => {
        setModalLoading(false);
        if (res.data.status === "success") {
          setIsModalOpen(false);
          fetchAssets();
        } else {
          alert(`Error updating asset: ${res.data.message}`);
        }
      })
      .catch(() => {
        setModalLoading(false);
        alert("Failed to connect to backend server to update asset.");
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
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* Upload Box */}
      <div className="upload-container glass-card" style={{ paddingBottom: "2rem" }}>
        <h3 className="card-title" style={{ marginBottom: "0.5rem" }}>
          {uploadMode === "document" && "Upload RAG Context Document"}
          {uploadMode === "audio" && "Upload Broadcast Audio File"}
          {uploadMode === "video" && "Upload Broadcast Video File"}
          {uploadMode === "image" && "Upload Broadcast Image File"}
        </h3>
        <p className="card-subtitle" style={{ marginBottom: "1.5rem" }}>
          {uploadMode === "document" && "Supported formats: PDF, DOCX, TXT (Max 10MB)"}
          {uploadMode === "audio" && "Supported formats: MP3, WAV, M4A, FLAC, OGG (Max 25MB)"}
          {uploadMode === "video" && "Supported formats: MP4, AVI, MKV, MOV, WEBM (Max 50MB)"}
          {uploadMode === "image" && "Supported formats: PNG, JPG, JPEG (Max 15MB)"}
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
          <button
            className={`btn ${uploadMode === "video" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => {
              setUploadMode("video");
              setFile(null);
              setStatus("idle");
              setMessage("");
            }}
            style={{ flex: 1, padding: "0.75rem", fontSize: "0.9rem" }}
          >
            🎥 Video Broadcasts
          </button>
          <button
            className={`btn ${uploadMode === "image" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => {
              setUploadMode("image");
              setFile(null);
              setStatus("idle");
              setMessage("");
            }}
            style={{ flex: 1, padding: "0.75rem", fontSize: "0.9rem" }}
          >
            🖼️ Images
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
            accept={
              uploadMode === "document"
                ? ".pdf,.docx,.txt"
                : uploadMode === "audio"
                ? ".mp3,.wav,.m4a,.flac,.ogg"
                : uploadMode === "video"
                ? ".mp4,.avi,.mkv,.mov,.webm"
                : ".png,.jpg,.jpeg"
            }
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
            {uploadMode === "document" && "Upload & Index Document"}
            {uploadMode === "audio" && "Upload & Transcribe Audio"}
            {uploadMode === "video" && "Upload & Process Video"}
            {uploadMode === "image" && "Upload & Process Image"}
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

      {/* Assets Manager List */}
      <div className="assets-section glass-card">
        <h3 className="card-title">Indexed Knowledge Base Assets</h3>
        <p className="card-subtitle">Manage uploaded documents, transcripts, and image OCR layouts currently stored in the RAG vector database.</p>

        {assets.length === 0 ? (
          <div className="chat-empty-state" style={{ padding: "2rem 0" }}>
            <p>No knowledge base assets uploaded yet. Upload documents or media above to start.</p>
          </div>
        ) : (
          <div className="assets-table-wrapper">
            <table className="assets-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Size</th>
                  <th>Uploaded At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => (
                  <tr key={asset.asset_id}>
                    <td
                      style={{
                        fontWeight: 600,
                        maxWidth: "250px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}
                      title={asset.filename}
                    >
                      {asset.filename}
                    </td>
                    <td>
                      <span className={`badge-type ${asset.file_type}`}>
                        {asset.file_type === "document" && "📄 DOC"}
                        {asset.file_type === "audio" && "🎵 AUD"}
                        {asset.file_type === "video" && "🎥 VID"}
                        {asset.file_type === "image" && "🖼️ IMG"}
                      </span>
                    </td>
                    <td>{formatBytes(asset.file_size)}</td>
                    <td>{new Date(asset.upload_time).toLocaleString()}</td>
                    <td>
                      <div className="asset-actions">
                        <button className="btn-edit-asset" onClick={() => openEditModal(asset)}>
                          ✏️ Edit
                        </button>
                        <button className="btn-delete-asset" onClick={() => handleDeleteAsset(asset.asset_id)}>
                          ✕ Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View & Edit Asset Modal */}
      {isModalOpen && selectedAsset && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h4 className="modal-title">View & Edit Knowledge Asset Content</h4>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div>
                <label className="modal-label">Asset Title / Filename</label>
                <input
                  type="text"
                  className="modal-input"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  disabled={modalLoading}
                />
              </div>
              <div>
                <label className="modal-label">
                  {selectedAsset.file_type === "document" ? "Extracted Document Content" : "Extracted Transcript / Context"}
                </label>
                <textarea
                  className="modal-input modal-textarea"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  disabled={modalLoading}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)} disabled={modalLoading}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleUpdateAsset}
                disabled={modalLoading || !editTitle.trim()}
              >
                {modalLoading ? "Re-Indexing Vectors..." : "Save & Re-Index"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UploadPanel;
