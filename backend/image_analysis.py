import base64
import requests

def analyze_image(image_path: str) -> str:
    # Read and encode image file in base64
    with open(image_path, "rb") as image_file:
        b64_data = base64.b64encode(image_file.read()).decode("utf-8")
        
    payload = {
        "model": "minicpm-v",
        "prompt": "Extract all readable text from this image. Also, provide a highly detailed description of all visual elements, charts, and diagrams present in this image for semantic document indexing.",
        "images": [b64_data],
        "stream": False
    }
    
    response = requests.post(
        "http://localhost:11434/api/generate",
        json=payload,
        timeout=60
    )
    response.raise_for_status()
    res_data = response.json()
    return res_data.get("response", "")
