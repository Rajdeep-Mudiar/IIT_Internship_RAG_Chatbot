import React from "react";

function ExportButton(){
    const downloadCSV = () => {
        window.open(
            "http://127.0.0.1:8000/download-csv"
        );
    };

    return (
        <button onClick={downloadCSV} className="btn btn-secondary">
            Download CSV
        </button>
    );
}

export default ExportButton;
