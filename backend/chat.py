import os
import requests
from dotenv import load_dotenv

# Load key variables from backend/.env
load_dotenv()

OLLAMA_URL = "http://localhost:11434/api/generate"

def get_api_keys(env_var_name: str) -> list:
    # Try the plural form first, then singular
    val = os.getenv(env_var_name)
    if not val:
        singular = env_var_name[:-1] if env_var_name.endswith("S") else env_var_name
        val = os.getenv(singular)
    if not val:
        return []
    # Split by comma and clean keys
    return [k.strip() for k in val.split(",") if k.strip()]

def ask_model(model: str, prompt: str) -> str:
    # 1. Google Gemini API integration
    if model.startswith("gemini/"):
        model_name = model.replace("gemini/", "")
        api_keys = get_api_keys("GEMINI_KEYS")
        if not api_keys:
            raise ValueError("GEMINI_KEYS environment variable is missing from backend/.env")
        
        last_error = None
        for api_key in api_keys:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
                response = requests.post(
                    url, 
                    json={"contents": [{"parts": [{"text": prompt}]}]},
                    headers={"Content-Type": "application/json"},
                    timeout=15
                )
                response.raise_for_status()
                data = response.json()
                return data["candidates"][0]["content"]["parts"][0]["text"]
            except Exception as e:
                last_error = e
        raise last_error or ValueError("All provided Gemini API keys failed.")

    # 2. Groq Cloud API integration
    elif model.startswith("groq/"):
        model_name = model.replace("groq/", "")
        api_keys = get_api_keys("GROQ_KEYS")
        if not api_keys:
            raise ValueError("GROQ_KEYS environment variable is missing from backend/.env")
            
        url = "https://api.groq.com/openai/v1/chat/completions"
        last_error = None
        for api_key in api_keys:
            try:
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": model_name,
                    "messages": [{"role": "user", "content": prompt}]
                }
                response = requests.post(url, json=payload, headers=headers, timeout=15)
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"]
            except Exception as e:
                last_error = e
        raise last_error or ValueError("All provided Groq API keys failed.")

    # 3. DeepSeek API integration
    elif model.startswith("deepseek/"):
        model_name = model.replace("deepseek/", "")
        api_keys = get_api_keys("DEEPSEEK_KEYS")
        if not api_keys:
            raise ValueError("DEEPSEEK_KEYS environment variable is missing from backend/.env")
            
        url = "https://api.deepseek.com/chat/completions"
        last_error = None
        for api_key in api_keys:
            try:
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": model_name,
                    "messages": [{"role": "user", "content": prompt}]
                }
                response = requests.post(url, json=payload, headers=headers, timeout=15)
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"]
            except Exception as e:
                last_error = e
        raise last_error or ValueError("All provided DeepSeek API keys failed.")

    # 4. OpenRouter API integration
    elif model.startswith("openrouter/"):
        model_name = model.replace("openrouter/", "")
        api_keys = get_api_keys("OPENROUTER_KEYS")
        if not api_keys:
            raise ValueError("OPENROUTER_KEYS environment variable is missing from backend/.env")
            
        url = "https://openrouter.ai/api/v1/chat/completions"
        last_error = None
        for api_key in api_keys:
            try:
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://github.com/google-deepmind/antigravity",
                    "X-Title": "Antigravity RAG Analytics Dashboard"
                }
                payload = {
                    "model": model_name,
                    "messages": [{"role": "user", "content": prompt}]
                }
                response = requests.post(url, json=payload, headers=headers, timeout=15)
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"]
            except Exception as e:
                last_error = e
        raise last_error or ValueError("All provided OpenRouter API keys failed.")

    # 5. Local Ollama instance
    else:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": model,
                "prompt": prompt,
                "stream": False
            },
            timeout=15
        )
        response.raise_for_status()
        return response.json()["response"]