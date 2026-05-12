import os
import traceback
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from nlp_engine import analyze

# ── optional PDF support ──
try:
    import fitz
    PDF_SUPPORT = True
except ImportError:
    PDF_SUPPORT = False

app = Flask(__name__, template_folder="templates", static_folder="static")
CORS(app)

MAX_TEXT_BYTES = 500_000

def extract_pdf_text(file_bytes: bytes) -> str:
    if not PDF_SUPPORT:
        raise RuntimeError("PyMuPDF not installed")
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    text = "\n\n".join(page.get_text("text") for page in doc)
    doc.close()
    return text

def safe_analyze(text: str, num_sentences: int):
    text = text.strip()
    if not text:
        return {"error": "No text provided."}
    if len(text) < 50:
        return {"error": "Text too short (min 50 chars)."}
    if len(text.encode()) > MAX_TEXT_BYTES:
        text = text[: MAX_TEXT_BYTES // 2]
    return analyze(text, num_sentences)

def format_response(result):
    return {
        "summary": result["summary"]["abstractive"],
        "extractive": result["summary"]["extractive"]["summary"],
        "keywords": result["keywords"],
        "sentiment": result["sentiment"],
        "stats": result["stats"]
    }

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/analyze", methods=["POST"])
def api_analyze():
    try:
        data = request.get_json(force=True) or {}
        text = data.get("text", "")
        num_sentences = int(data.get("num_sentences", 3))
        num_sentences = max(1, min(num_sentences, 15))
        result = safe_analyze(text, num_sentences)
        if "error" in result:
            return jsonify(result), 400
        return jsonify(format_response(result))
    except Exception:
        traceback.print_exc()
        return jsonify({"error": "Server error during analysis."}), 500

@app.route("/api/upload", methods=["POST"])
def api_upload():
    try:
        if "file" not in request.files:
            return jsonify({"error": "No file uploaded"}), 400
        f = request.files["file"]
        filename = f.filename or ""
        num_sentences = int(request.form.get("num_sentences", 3))
        num_sentences = max(1, min(num_sentences, 15))
        file_bytes = f.read()
        if filename.lower().endswith(".pdf"):
            text = extract_pdf_text(file_bytes)
        elif filename.lower().endswith(".txt"):
            try:
                text = file_bytes.decode("utf-8")
            except:
                text = file_bytes.decode("latin-1")
        else:
            return jsonify({"error": "Only .txt and .pdf supported"}), 400
        result = safe_analyze(text, num_sentences)
        if "error" in result:
            return jsonify(result), 400
        response = format_response(result)
        response["filename"] = filename
        return jsonify(response)
    except Exception:
        traceback.print_exc()
        return jsonify({"error": "Server error during upload"}), 500

@app.route("/api/health")
def health():
    return jsonify({"status": "ok", "pdf_support": PDF_SUPPORT})

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=True, port=port)