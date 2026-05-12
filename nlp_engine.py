import re
import math
from collections import Counter

_abstractive_model = None
_tokenizer = None

def get_model():
    global _tokenizer, _model
    if _tokenizer is None or _model is None:
        try:
            from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
            model_name = "sshleifer/distilbart-cnn-6-6"
            print(f"🔄 Manual Load: {model_name}...")
            
            # Load tokenizer and model directly
            _tokenizer = AutoTokenizer.from_pretrained(model_name)
            _model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
            
            print("✅ Model & Tokenizer loaded manually!")
            return True
        except Exception as e:
            print(f"❌ Critical Manual Load Error: {e}")
            return False
    return True

STOP_WORDS = {"a","about","above","after","again","against","all","am","an","and","any","are","as","at","be","because","been","before","being","below","between","both","but","by","can","could","did","do","does","doing","down","during","each","few","for","from","further","had","has","have","having","he","her","here","hers","him","his","how","i","if","in","into","is","it","its","itself","just","me","more","most","my","myself","no","nor","not","of","off","on","once","only","or","other","our","ours","ourselves","out","over","own","same","she","should","so","some","such","than","that","the","their","theirs","them","themselves","then","there","these","they","this","those","through","to","too","under","until","up","very","was","we","were","what","when","where","which","while","who","whom","why","with","would","you","your","yours","yourself","yourselves"}

def tokenize_words(text):
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    tokens = text.split()
    return [t for t in tokens if t not in STOP_WORDS and len(t) > 2]

def tokenize_sentences(text):
    sentences = re.split(r'(?<=[.!?]) +', text.strip())
    return [s.strip() for s in sentences if s.strip()]

def compute_tfidf(sentences):
    doc_tokens = [tokenize_words(s) for s in sentences]
    N = len(sentences)
    tf_list = []
    for tokens in doc_tokens:
        freq = {}
        for t in tokens: freq[t] = freq.get(t, 0) + 1
        total = max(len(tokens), 1)
        tf_list.append({k: v / total for k, v in freq.items()})
    df = {}
    for tokens in doc_tokens:
        for t in set(tokens): df[t] = df.get(t, 0) + 1
    scores = []
    for i, tf in enumerate(tf_list):
        score = 0
        for term, val in tf.items():
            idf = math.log((N + 1) / (df.get(term, 0) + 1))
            score += val * idf
        scores.append(score)
    return scores

def extract_summary(text, num_sentences=3):
    sentences = tokenize_sentences(text)
    if len(sentences) <= num_sentences:
        return {"summary": " ".join(sentences), "selected_indices": list(range(len(sentences)))}
    scores = compute_tfidf(sentences)
    ranked = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)
    top = sorted(ranked[:num_sentences])
    return {"summary": " ".join([sentences[i] for i in top]), "selected_indices": top}

def abstractive_summary(text):
    if not get_model():
        return "⚠️ AI model not available"

    # Limit text length for speed
    extract = extract_summary(text, 5)
    input_text = extract["summary"]

    try:
        # 1. Convert text to numbers (tokens)
        inputs = _tokenizer(input_text, max_length=1024, return_tensors="pt", truncation=True)
        
        # 2. Generate summary output tokens
        summary_ids = _model.generate(
            inputs["input_ids"], 
            max_length=120, 
            min_length=40, 
            length_penalty=2.0, 
            num_beams=4, 
            early_stopping=True
        )
        
        # 3. Convert numbers back to text[cite: 2]
        return _tokenizer.decode(summary_ids[0], skip_special_tokens=True)

    except Exception as e:
        return f"Generation Error: {str(e)}"

def extract_keywords(text, top_n=10):
    tokens = tokenize_words(text)
    freq = Counter(tokens)
    scored = []
    total = len(tokens)
    for word, count in freq.items():
        score = (count / total) * math.log(total / count + 1)
        scored.append((word, score))
    scored.sort(key=lambda x: x[1], reverse=True)
    return [w for w, _ in scored[:top_n]]

def analyze_sentiment(text):
    words = tokenize_words(text)
    pos_words = [w for w in words if w in {"good","great","excellent","amazing","positive"}]
    neg_words = [w for w in words if w in {"bad","poor","negative","risk","problem"}]
    total = len(pos_words) + len(neg_words)
    score = (len(pos_words) - len(neg_words)) / total if total else 0
    label = "Positive" if score > 0.1 else "Negative" if score < -0.1 else "Neutral"
    return {"score": round(score, 2), "label": label}

def get_stats(text):
    words = text.split()
    return {
        "word_count": len(words),
        "char_count": len(text),
        "read_time_min": max(1, round(len(words) / 200))
    }

def analyze(text, num_sentences=3):
    return {
        "stats": get_stats(text),
        "summary": {
            "extractive": extract_summary(text, num_sentences),
            "abstractive": abstractive_summary(text)
        },
        "keywords": extract_keywords(text),
        "sentiment": analyze_sentiment(text)
    }