# 🧠 DocMind – AI Powered Document Analyzer

DocMind is a full-stack AI-powered document analysis platform capable of generating intelligent summaries, extracting keywords, analyzing sentiment, and processing PDF/TXT documents using Natural Language Processing and Transformer-based AI models.

The project combines a modern frontend UI with a Flask backend and Hugging Face NLP models to provide fast and interactive document analysis.

---

# 🚀 Features

## 📄 Document Analysis
- Analyze large text documents
- Process `.txt` and `.pdf` files
- Automatic text extraction

## 🤖 AI Summarization
### Abstractive Summarization
- Uses Transformer-based DistilBART model
- Generates human-like summaries

### Extractive Summarization
- TF-IDF based sentence ranking
- Important sentence extraction

## 🔍 NLP Features
- Keyword extraction
- Sentiment analysis
- Reading statistics
- Word analysis

## 🎨 Modern UI
- Responsive design
- Dark modern interface
- Drag & drop file upload
- Real-time analytics display

---

# 🛠️ Tech Stack

## Frontend
- HTML5
- CSS3
- JavaScript

## Backend
- Python
- Flask
- Flask-CORS

## AI / NLP
- Hugging Face Transformers
- DistilBART (`sshleifer/distilbart-cnn-6-6`)
- TF-IDF Algorithm

## PDF Processing
- PyMuPDF

---

# 📁 Project Structure

```bash
DocMind/
│
├── app.py
├── nlp_engine.py
├── requirements.txt
│
├── templates/
│   └── index.html
│
├── static/
│   ├── main.js
│   └── style.css
│
├── screenshots/
│   ├── home.png
│   └── results.png
│
└── README.md
