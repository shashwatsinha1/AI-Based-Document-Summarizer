/* DocMind  main.js
   All UI logic — talks to Flask /api/analyze and /api/upload
*/

var API_BASE = '';   // same origin when served by Flask

// ── state ──
var activeTab   = 'paste';
var uploadedFile = null;

// ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
  initTabs();
  initTextarea();
  initSlider();
  initDropzone();
  initAnalyzeButton();
  initCopyButton();
  loadSample();
});

// ─────────────────────────────────────────
// TABS
// ─────────────────────────────────────────
function initTabs() {
  document.querySelectorAll('.tab').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.tab').forEach(function (b) { b.classList.remove('active'); });
      document.querySelectorAll('.pane').forEach(function (p) { p.classList.remove('active'); });
      btn.classList.add('active');
      activeTab = btn.getAttribute('data-tab');
      var pane = document.getElementById('pane-' + activeTab);
      if (pane) pane.classList.add('active');
    });
  });
}

// ─────────────────────────────────────────
// TEXTAREA CHAR COUNT
// ─────────────────────────────────────────
function initTextarea() {
  var ta = document.getElementById('doc-text');
  var cc = document.getElementById('char-count');
  if (!ta || !cc) return;
  function update() { cc.textContent = ta.value.length.toLocaleString(); }
  ta.addEventListener('input', update);
  update();
}

// ─────────────────────────────────────────
// SLIDER
// ─────────────────────────────────────────
function initSlider() {
  var slider = document.getElementById('num-sentences');
  var val    = document.getElementById('len-val');
  if (!slider || !val) return;
  slider.addEventListener('input', function () { val.textContent = slider.value; });
}

// ─────────────────────────────────────────
// DROPZONE
// ─────────────────────────────────────────
function initDropzone() {
  var dz    = document.getElementById('dropzone');
  var fi    = document.getElementById('file-input');
  var status = document.getElementById('file-status');

  if (!dz || !fi) return;

  dz.addEventListener('dragover', function (e) {
    e.preventDefault();
    dz.classList.add('over');
  });
  dz.addEventListener('dragleave', function () { dz.classList.remove('over'); });
  dz.addEventListener('drop', function (e) {
    e.preventDefault();
    dz.classList.remove('over');
    var file = e.dataTransfer.files[0];
    if (file) setFile(file);
  });
  fi.addEventListener('change', function () {
    if (fi.files[0]) setFile(fi.files[0]);
  });

  function setFile(file) {
    var name = file.name.toLowerCase();
    if (!name.endsWith('.txt') && !name.endsWith('.pdf')) {
      showToast('Only .txt and .pdf files are supported.');
      return;
    }
    uploadedFile = file;
    status.textContent = '✓ ' + file.name + '  (' + formatBytes(file.size) + ')';
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ─────────────────────────────────────────
// ANALYZE BUTTON
// ─────────────────────────────────────────
function initAnalyzeButton() {
  var btn = document.getElementById('analyze-btn');
  if (btn) btn.addEventListener('click', runAnalysis);
}

function runAnalysis() {
  clearError();
  var btn  = document.getElementById('analyze-btn');
  var text = document.getElementById('doc-text').value.trim();
  var n    = parseInt(document.getElementById('num-sentences').value) || 3;

  // ── Choose path: text paste or file upload ──
  if (activeTab === 'upload') {
    if (!uploadedFile) { showError('Please upload a .txt or .pdf file.'); return; }
    setLoading(btn, true);
    uploadFile(uploadedFile, n)
      .then(function (data) { renderResults(data); })
      .catch(function (err) { showError(err.message || 'Upload failed.'); })
      .finally(function () { setLoading(btn, false); });
  } else {
    if (!text || text.length < 50) {
      showError('Please enter at least 50 characters of text.');
      return;
    }
    setLoading(btn, true);
    analyzeText(text, n)
      .then(function (data) { renderResults(data); })
      .catch(function (err) { showError(err.message || 'Analysis failed.'); })
      .finally(function () { setLoading(btn, false); });
  }
}

// ─────────────────────────────────────────
// API CALLS
// ─────────────────────────────────────────
function analyzeText(text, numSentences) {
  return fetch(API_BASE + '/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: text, num_sentences: numSentences })
  }).then(function (res) {
    return res.json().then(function (data) {
      if (!res.ok) throw new Error(data.error || 'Server error');
      return data;
    });
  });
}

function uploadFile(file, numSentences) {
  var fd = new FormData();
  fd.append('file', file);
  fd.append('num_sentences', numSentences);
  return fetch(API_BASE + '/api/upload', {
    method: 'POST',
    body: fd
  }).then(function (res) {
    return res.json().then(function (data) {
      if (!res.ok) throw new Error(data.error || 'Server error');
      return data;
    });
  });
}

// ─────────────────────────────────────────
// RENDER RESULTS
// ─────────────────────────────────────────
function renderResults(data) {
  var results = document.getElementById('results');

  // ── Stats ──
  const s = data.stats || {};
  setText('r-words',  (s.word_count || 0).toLocaleString());
  setText('r-sents',  (s.sentence_count || 0));
  setText('r-paras',  (s.paragraph_count || 0));
  setText('r-read',   ((s.read_time_min || 0) + ' min'));
  setText('r-unique', (s.unique_words || 0).toLocaleString());
  setText('r-lex',    ((s.lexical_density || 0) * 100).toFixed(1) + '%');

  // ── Sentiment ──
  var sent = data.sentiment;
  var pct  = Math.round(((sent.score || 0) + 1) * 50);

  document.getElementById('sent-fill').style.width    = pct + '%';
  document.getElementById('sent-marker').style.left   = pct + '%';

  var badge = document.getElementById('sent-badge');
  badge.textContent = sent.label;
  badge.className   = 'badge ' + sent.label.toLowerCase();

  // Signal words
  document.getElementById('pos-words').innerHTML = '';
  document.getElementById('neg-words').innerHTML = '';

  // ── Summary ──
  var sumBox  = document.getElementById('summary-box');
  var sumText = data.summary || '';
  // Highlight each sentence
  var sentences = sumText.match(/[^.!?]+[.!?]+/g) || [sumText];
  sumBox.innerHTML = sentences.map(function (s) {
    return '<span class="sent-highlight">' + s.trim() + '</span> ';
  }).join('');

  setText('summary-meta', 'AI-generated summary');
  // ── Keywords ──
  var cloud = document.getElementById('keyword-cloud');
  cloud.innerHTML = (data.keywords || []).map(function (kw) {
  return '<span class="kw-tag">' + kw + '</span>';
}).join('');

  // ── Show panel ──
  results.classList.remove('hidden');
  setTimeout(function () {
    results.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 60);
}

// ─────────────────────────────────────────
// COPY SUMMARY
// ─────────────────────────────────────────
function initCopyButton() {
  var btn = document.getElementById('copy-btn');
  if (!btn) return;
  btn.addEventListener('click', function () {
    var text = document.getElementById('summary-box').innerText.trim();
    navigator.clipboard.writeText(text)
      .then(function () { showToast('Summary copied!'); })
      .catch(function () { showToast('Copy failed — select manually.'); });
  });
}

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
function setText(id, val) {
  var el = document.getElementById(id);
  if (el) el.textContent = val;
}

function setLoading(btn, on) {
  if (!btn) return;
  if (on) {
    btn.disabled = true;
    btn.innerHTML = '<span class="loader"></span><span class="btn-text">Analyzing...</span>';
  } else {
    btn.disabled = false;
    btn.innerHTML = '<span class="btn-text">Analyze Document</span><span class="btn-icon">→</span>';
  }
}

function showError(msg) {
  var box = document.getElementById('error-box');
  if (!box) return;
  box.textContent = msg;
  box.classList.add('show');
}
function clearError() {
  var box = document.getElementById('error-box');
  if (box) { box.textContent = ''; box.classList.remove('show'); }
}

function showToast(msg) {
  var t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function () { t.classList.remove('show'); }, 2800);
}

// ─────────────────────────────────────────
// SAMPLE TEXT
// ─────────────────────────────────────────
function loadSample() {
  var ta = document.getElementById('doc-text');
  if (!ta) return;
  ta.value = 'Artificial intelligence is revolutionizing the healthcare industry at an unprecedented pace, offering transformative solutions to longstanding challenges in diagnosis, treatment, and patient care. Machine learning algorithms are now capable of analyzing medical images with remarkable accuracy, often detecting anomalies that human specialists might overlook.\n\nRecent studies have demonstrated that AI-powered diagnostic tools can identify early-stage cancers in radiology scans with 94% accuracy, significantly outperforming traditional screening methods. These breakthroughs represent a tremendous opportunity to save millions of lives annually while simultaneously reducing the enormous financial burden on healthcare systems worldwide.\n\nHowever, the adoption of AI in healthcare also raises serious ethical concerns. Questions around patient data privacy, algorithmic bias, and the risk of over-reliance on automated systems have sparked intense debate among medical professionals, regulators, and ethicists. Critics warn that without robust oversight, AI tools could exacerbate existing disparities in healthcare access and quality.\n\nLeading hospitals and research institutions are investing billions of dollars in AI infrastructure, partnering with technology companies to develop smarter clinical decision support systems. These systems help physicians by surfacing relevant patient history, flagging dangerous drug interactions, and recommending evidence-based treatment protocols in real time.\n\nLooking ahead, the future of AI in healthcare will depend on thoughtful regulation, transparent development practices, and genuine collaboration between technologists and clinicians. The goal must remain clear: to augment human expertise, not replace it, ensuring that every patient receives the safest and most effective care possible.';
  // trigger char count update
  ta.dispatchEvent(new Event('input'));
}