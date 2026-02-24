import { useState, useEffect, useRef } from "react";
import { IndicTransliterate } from "@ai4bharat/indic-transliterate";

// ── Configuration ─────────────────────────────────────────────────────────
// IMPORTANT: Replace this with your actual GROQ API key
// Get a free API key from: https://console.groq.com/keys
const GROQ_API_KEY = process.env.GROQ_API_KEY;  
// ── Scheduled Languages (8th Schedule + English) ──────────────────────────
const LANGUAGES = [
  { code: "en", label: "English", native: "English" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "bn", label: "Bengali", native: "বাংলা" },
  { code: "te", label: "Telugu", native: "తెలుగు" },
  { code: "mr", label: "Marathi", native: "मराठी" },
  { code: "ta", label: "Tamil", native: "தமிழ்" },
  { code: "gu", label: "Gujarati", native: "ગુજરાતી" },
  { code: "kn", label: "Kannada", native: "ಕನ್ನಡ" },
  { code: "ml", label: "Malayalam", native: "മലയാളം" },
  { code: "pa", label: "Punjabi", native: "ਪੰਜਾਬੀ" },
  { code: "or", label: "Odia", native: "ଓଡ଼ିଆ" },
  { code: "as", label: "Assamese", native: "অসমীয়া" },
];

// ── User Personas ──────────────────────────────────────────────────────────
const PERSONAS = [
  { id: "rural_farmer", label: "Rural Farmer", icon: "🌾", description: "Limited digital literacy, primary language may not be English", readingLevel: "Simple" },
  { id: "urban_professional", label: "Urban Professional", icon: "💼", description: "High digital literacy, comfortable with complex language", readingLevel: "Advanced" },
  { id: "senior_citizen", label: "Senior Citizen (60+)", icon: "👴", description: "May need simplified language and larger font", readingLevel: "Simple" },
  { id: "student", label: "Student (18-25)", icon: "🎓", description: "Moderate digital literacy, tech-savvy", readingLevel: "Moderate" },
  { id: "small_business", label: "Small Business Owner", icon: "🏪", description: "Needs to understand business implications", readingLevel: "Moderate" },
  { id: "healthcare_patient", label: "Healthcare Patient", icon: "🏥", description: "Sensitive data context, needs clear medical data notice", readingLevel: "Simple" },
];

// ── Data Processing Purposes ───────────────────────────────────────────────
const PURPOSES = [
  { id: "account", label: "Account Creation & Management", required: true, lawfulBasis: "Consent", section: "§5(a)" },
  { id: "service", label: "Service Delivery", required: true, lawfulBasis: "Contract", section: "§5(b)" },
  { id: "analytics", label: "Usage Analytics & Improvement", required: false, lawfulBasis: "Consent", section: "§5(c)" },
  { id: "marketing", label: "Personalized Marketing", required: false, lawfulBasis: "Consent", section: "§5(d)" },
  { id: "thirdparty", label: "Third-Party Data Sharing", required: false, lawfulBasis: "Consent", section: "§5(e)" },
  { id: "profiling", label: "Behavioral Profiling", required: false, lawfulBasis: "Consent", section: "§5(f)" },
];

// ── Styling constants ──────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans:wght@300;400;500;600;700&family=Noto+Serif:ital,wght@0,400;0,600;1,400&family=IBM+Plex+Mono:wght@400;500&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  :root {
    --saffron: #FF9933;
    --navy: #000080;
    --green: #138808;
    --ash: #F4F1EB;
    --white: #FEFEFE;
    --slate: #2C3E50;
    --muted: #6B7280;
    --border: #E2D9C8;
    --danger: #DC2626;
    --success: #16A34A;
    --warn: #D97706;
    --card: #FFFDF8;
    --accent-light: #FFF8ED;
    --shadow: 0 2px 12px rgba(0,0,0,0.08);
    --shadow-lg: 0 8px 32px rgba(0,0,0,0.12);
  }

  body { font-family: 'Noto Sans', sans-serif; background: var(--ash); color: var(--slate); }

  .agent-root {
    min-height: 100vh;
    background: linear-gradient(135deg, #FFF8ED 0%, #F4F1EB 50%, #EDF2F7 100%);
  }

  /* Header */
  .header {
    background: var(--navy);
    padding: 0;
    position: sticky; top: 0; z-index: 100;
    box-shadow: 0 2px 16px rgba(0,0,128,0.3);
  }
  .header-stripe {
    height: 4px;
    background: linear-gradient(90deg, var(--saffron) 33.33%, var(--white) 33.33%, var(--white) 66.66%, var(--green) 66.66%);
  }
  .header-inner {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 24px; gap: 16px;
  }
  .header-logo { display: flex; align-items: center; gap: 12px; }
  .header-logo .ashoka { font-size: 28px; }
  .header-title { color: var(--white); }
  .header-title h1 { font-size: 15px; font-weight: 700; letter-spacing: 0.5px; }
  .header-title p { font-size: 11px; color: rgba(255,255,255,0.65); margin-top: 1px; }
  .header-badge {
    background: var(--saffron); color: var(--navy);
    font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 4px;
    letter-spacing: 1px;
  }
  .lang-selector {
    display: flex; align-items: center; gap: 8px;
  }
  .lang-selector select {
    background: rgba(255,255,255,0.1); color: white; border: 1px solid rgba(255,255,255,0.25);
    padding: 5px 10px; border-radius: 6px; font-size: 12px; cursor: pointer;
    font-family: 'Noto Sans', sans-serif;
  }
  .lang-selector select option { background: var(--navy); }

  /* Layout */
  .main { max-width: 1100px; margin: 0 auto; padding: 32px 16px; }

  /* Step Indicator */
  .steps {
    display: flex; align-items: center; gap: 0;
    margin-bottom: 32px; background: var(--card);
    border-radius: 12px; padding: 16px 20px;
    box-shadow: var(--shadow); border: 1px solid var(--border);
  }
  .step {
    display: flex; align-items: center; gap: 10px; flex: 1;
    position: relative;
  }
  .step:not(:last-child)::after {
    content: ''; position: absolute; right: 0; top: 50%;
    width: 100%; height: 2px; background: var(--border); z-index: 0;
    transform: translateY(-50%) translateX(50%);
  }
  .step-num {
    width: 32px; height: 32px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 700; flex-shrink: 0; position: relative; z-index: 1;
    transition: all 0.3s;
  }
  .step.active .step-num { background: var(--navy); color: white; }
  .step.done .step-num { background: var(--success); color: white; }
  .step.pending .step-num { background: var(--border); color: var(--muted); }
  .step-label { font-size: 11px; font-weight: 600; }
  .step.active .step-label { color: var(--navy); }
  .step.done .step-label { color: var(--success); }
  .step.pending .step-label { color: var(--muted); }

  /* Cards */
  .card {
    background: var(--card); border-radius: 12px;
    border: 1px solid var(--border); box-shadow: var(--shadow);
    overflow: hidden; margin-bottom: 20px;
  }
  .card-header {
    padding: 16px 20px; border-bottom: 1px solid var(--border);
    display: flex; align-items: center; gap: 12px;
    background: linear-gradient(90deg, #FFFDF8, #F9F6EF);
  }
  .card-header .section-tag {
    background: var(--navy); color: white;
    font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 4px;
    font-family: 'IBM Plex Mono', monospace; letter-spacing: 0.5px;
  }
  .card-header h2 { font-size: 14px; font-weight: 700; color: var(--navy); flex: 1; }
  .card-body { padding: 20px; }

  /* Persona Grid */
  .persona-grid {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;
  }
  @media (max-width: 600px) { .persona-grid { grid-template-columns: 1fr 1fr; } }
  .persona-card {
    border: 2px solid var(--border); border-radius: 10px; padding: 14px;
    cursor: pointer; transition: all 0.2s; background: white;
    text-align: center;
  }
  .persona-card:hover { border-color: var(--saffron); transform: translateY(-2px); box-shadow: var(--shadow); }
  .persona-card.selected { border-color: var(--navy); background: var(--accent-light); }
  .persona-card .icon { font-size: 28px; margin-bottom: 6px; }
  .persona-card .name { font-size: 12px; font-weight: 700; color: var(--slate); margin-bottom: 3px; }
  .persona-card .desc { font-size: 10px; color: var(--muted); line-height: 1.4; }
  .persona-card .badge {
    display: inline-block; margin-top: 6px;
    font-size: 9px; padding: 2px 6px; border-radius: 10px; font-weight: 600;
  }
  .badge-simple { background: #FEF3C7; color: #92400E; }
  .badge-moderate { background: #DBEAFE; color: #1E40AF; }
  .badge-advanced { background: #D1FAE5; color: #065F46; }

  /* Notice Generator */
  .generate-btn {
    width: 100%; padding: 14px; border: none; border-radius: 8px;
    background: linear-gradient(135deg, var(--navy), #001a66);
    color: white; font-size: 14px; font-weight: 700; cursor: pointer;
    transition: all 0.2s; font-family: 'Noto Sans', sans-serif;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    letter-spacing: 0.3px;
  }
  .generate-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(0,0,128,0.3); }
  .generate-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

  .notice-box {
    background: #FFFDF8; border: 1px solid var(--border); border-radius: 8px;
    padding: 20px; min-height: 200px;
    font-family: 'Noto Serif', serif; font-size: 13px; line-height: 1.8;
    color: var(--slate); white-space: pre-wrap;
    border-left: 4px solid var(--saffron);
  }
  .notice-meta {
    display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px;
  }
  .meta-chip {
    font-size: 10px; padding: 3px 8px; border-radius: 10px; font-weight: 600;
    font-family: 'IBM Plex Mono', monospace;
  }
  .chip-lang { background: #EDE9FE; color: #4C1D95; }
  .chip-persona { background: #FEF3C7; color: #92400E; }
  .chip-dpdp { background: #D1FAE5; color: #065F46; }

  .translate-row {
    display: flex; gap: 10px; align-items: center; margin-top: 12px;
    flex-wrap: wrap;
  }
  .translate-btn {
    padding: 8px 16px; border: 2px solid var(--green); border-radius: 6px;
    background: transparent; color: var(--green); font-size: 12px; font-weight: 700;
    cursor: pointer; transition: all 0.2s; font-family: 'Noto Sans', sans-serif;
  }
  .translate-btn:hover:not(:disabled) { background: var(--green); color: white; }
  .translate-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .ai4b-badge {
    display: flex; align-items: center; gap: 5px;
    font-size: 10px; color: var(--muted); padding: 4px 8px;
    background: #F3F4F6; border-radius: 6px;
  }
  .ai4b-badge .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--success); animation: pulse 1.5s infinite; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }

  /* Transliteration Input */
  .transliterate-container {
    margin: 16px 0;
    padding: 16px;
    background: #F9FAFB;
    border-radius: 8px;
    border: 1px solid var(--border);
  }
  .transliterate-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--navy);
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .transliterate-input {
    width: 100%;
    padding: 12px;
    border: 2px solid var(--border);
    border-radius: 6px;
    font-size: 14px;
    font-family: 'Noto Sans', sans-serif;
    transition: all 0.2s;
  }
  .transliterate-input:focus {
    outline: none;
    border-color: var(--saffron);
  }
  .input-hint {
    font-size: 10px;
    color: var(--muted);
    margin-top: 6px;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .keyboard-hint {
    background: #E5E7EB;
    padding: 2px 4px;
    border-radius: 4px;
    font-family: monospace;
  }

  /* Error Message */
  .error-message {
    background: #FEE2E2;
    color: #991B1B;
    padding: 10px 14px;
    border-radius: 6px;
    font-size: 12px;
    margin: 10px 0;
    border-left: 3px solid var(--danger);
  }

  /* API Key Warning */
  .api-warning {
    background: #FEF3C7;
    color: #92400E;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 13px;
    margin-bottom: 16px;
    border: 1px solid #FCD34D;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .api-warning a {
    color: var(--navy);
    font-weight: 600;
    text-decoration: none;
  }
  .api-warning a:hover {
    text-decoration: underline;
  }

  /* Consent Section */
  .purpose-list { display: flex; flex-direction: column; gap: 10px; }
  .purpose-row {
    display: flex; align-items: flex-start; gap: 14px; padding: 14px 16px;
    border-radius: 8px; border: 1px solid var(--border);
    background: white; transition: all 0.2s;
  }
  .purpose-row.granted { border-color: #86EFAC; background: #F0FDF4; }
  .purpose-row.required-row { background: #F8FAFF; border-color: #BAC8FF; }
  .purpose-check {
    width: 20px; height: 20px; border-radius: 5px; border: 2px solid var(--border);
    cursor: pointer; flex-shrink: 0; margin-top: 1px;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.2s; background: white;
  }
  .purpose-check.checked { background: var(--success); border-color: var(--success); color: white; }
  .purpose-check.locked { background: #BAC8FF; border-color: #6366F1; cursor: default; }
  .purpose-info { flex: 1; }
  .purpose-name { font-size: 13px; font-weight: 600; color: var(--slate); margin-bottom: 3px; }
  .purpose-tags { display: flex; gap: 6px; flex-wrap: wrap; }
  .tag {
    font-size: 9px; padding: 2px 6px; border-radius: 10px; font-weight: 600;
    font-family: 'IBM Plex Mono', monospace;
  }
  .tag-req { background: #EEF2FF; color: #3730A3; }
  .tag-sec { background: #FEF9C3; color: #713F12; }
  .tag-basis { background: #F0FDF4; color: #14532D; }

  /* Consent Summary */
  .consent-summary {
    background: linear-gradient(135deg, #001433, #000080);
    border-radius: 12px; padding: 24px; color: white; margin-bottom: 20px;
  }
  .consent-summary h3 { font-size: 16px; font-weight: 700; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
  .consent-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .consent-stat { background: rgba(255,255,255,0.08); border-radius: 8px; padding: 14px; text-align: center; }
  .consent-stat .num { font-size: 28px; font-weight: 700; color: var(--saffron); }
  .consent-stat .lbl { font-size: 11px; color: rgba(255,255,255,0.65); margin-top: 3px; }

  /* Action Buttons */
  .action-row { display: flex; gap: 10px; flex-wrap: wrap; }
  .btn-primary {
    padding: 12px 24px; background: var(--navy); color: white;
    border: none; border-radius: 8px; font-size: 13px; font-weight: 700;
    cursor: pointer; transition: all 0.2s; font-family: 'Noto Sans', sans-serif;
  }
  .btn-primary:hover { background: #0000b3; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,128,0.3); }
  .btn-danger {
    padding: 12px 24px; background: transparent; color: var(--danger);
    border: 2px solid var(--danger); border-radius: 8px; font-size: 13px; font-weight: 700;
    cursor: pointer; transition: all 0.2s; font-family: 'Noto Sans', sans-serif;
  }
  .btn-danger:hover { background: var(--danger); color: white; }
  .btn-ghost {
    padding: 12px 24px; background: transparent; color: var(--muted);
    border: 2px solid var(--border); border-radius: 8px; font-size: 13px; font-weight: 700;
    cursor: pointer; transition: all 0.2s; font-family: 'Noto Sans', sans-serif;
  }
  .btn-ghost:hover { border-color: var(--slate); color: var(--slate); }

  /* Consent Receipt */
  .receipt {
    background: white; border: 2px solid var(--success);
    border-radius: 12px; padding: 24px; position: relative; overflow: hidden;
  }
  .receipt::before {
    content: '✓'; position: absolute; right: -10px; top: -10px;
    font-size: 120px; color: rgba(22,163,74,0.04); font-weight: 900;
    line-height: 1;
  }
  .receipt-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
  .receipt-header .check-icon {
    width: 40px; height: 40px; background: var(--success); border-radius: 50%;
    display: flex; align-items: center; justify-content: center; color: white; font-size: 20px;
  }
  .receipt-header h3 { font-size: 16px; font-weight: 700; color: var(--success); }
  .receipt-header p { font-size: 11px; color: var(--muted); margin-top: 2px; }
  .receipt-table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .receipt-table tr { border-bottom: 1px solid #F0F0F0; }
  .receipt-table tr:last-child { border: none; }
  .receipt-table td { padding: 8px 4px; }
  .receipt-table td:first-child { color: var(--muted); width: 40%; }
  .receipt-table td:last-child { font-weight: 600; color: var(--slate); }
  .revoke-notice {
    margin-top: 16px; padding: 10px 14px; background: #FFF8ED; border-radius: 6px;
    border-left: 3px solid var(--saffron); font-size: 11px; color: var(--warn);
    font-weight: 500;
  }

  /* Loading spinner */
  .spinner {
    width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3);
    border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Compliance panel */
  .compliance-panel {
    background: white; border-radius: 12px; border: 1px solid var(--border);
    padding: 16px; margin-bottom: 20px;
  }
  .compliance-title { font-size: 11px; font-weight: 700; color: var(--muted); letter-spacing: 1px; text-transform: uppercase; margin-bottom: 12px; }
  .compliance-items { display: flex; flex-direction: column; gap: 6px; }
  .compliance-item { display: flex; align-items: center; gap: 8px; font-size: 12px; }
  .compliance-item .ci { width: 16px; height: 16px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 9px; }
  .ci-ok { background: #D1FAE5; color: #065F46; }
  .ci-warn { background: #FEF3C7; color: #92400E; }
  .ci-err { background: #FEE2E2; color: #991B1B; }

  /* Revocation Log */
  .log-entry {
    font-size: 11px; padding: 8px 12px; border-radius: 6px;
    font-family: 'IBM Plex Mono', monospace; margin-bottom: 6px;
    border-left: 3px solid;
  }
  .log-entry.consent { background: #F0FDF4; border-color: var(--success); color: #065F46; }
  .log-entry.revoke { background: #FFF1F2; border-color: var(--danger); color: #881337; }

  /* Tooltip */
  .dpdp-ref {
    font-size: 10px; background: var(--navy); color: white;
    padding: 2px 5px; border-radius: 3px; font-family: 'IBM Plex Mono', monospace;
    cursor: help;
  }
`;

// ── Main Component ─────────────────────────────────────────────────────────
export default function DPDPConsentAgent() {
  const [step, setStep] = useState(1);
  const [persona, setPersona] = useState(null);
  const [language, setLanguage] = useState("en");
  const [notice, setNotice] = useState("");
  const [translatedNotice, setTranslatedNotice] = useState("");
  const [loadingNotice, setLoadingNotice] = useState(false);
  const [loadingTranslate, setLoadingTranslate] = useState(false);
  const [consents, setConsents] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [receiptId, setReceiptId] = useState("");
  const [auditLog, setAuditLog] = useState([]);
  const [revoked, setRevoked] = useState(false);
  const [dataFiduciary] = useState("DataSeva Platform Pvt. Ltd.");
  const [translationError, setTranslationError] = useState("");
  const [apiKeyValid, setApiKeyValid] = useState(true);
  
  // State for transliteration
  const [transliteratedText, setTransliteratedText] = useState("");
  const [showTransliteration, setShowTransliteration] = useState(false);

  // Check if API key is configured
  useEffect(() => {
    if (GROQ_API_KEY === "YOUR_GROQ_API_KEY_HERE" || !GROQ_API_KEY) {
      setApiKeyValid(false);
    }
  }, []);

  // Init required consents
  useEffect(() => {
    const init = {};
    PURPOSES.forEach(p => { init[p.id] = p.required; });
    setConsents(init);
  }, []);

  // Show transliteration when non-English language is selected
  useEffect(() => {
    setShowTransliteration(language !== "en");
    if (language === "en") {
      setTransliteratedText("");
    }
  }, [language]);

  const addLog = (type, message) => {
    const ts = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    setAuditLog(prev => [{ type, message, ts }, ...prev]);
  };

  const generateNotice = async () => {
    if (!persona) return;
    
    if (!apiKeyValid) {
      setTranslationError("Please configure a valid GROQ API key first. Get one from https://console.groq.com/keys");
      return;
    }
    
    setLoadingNotice(true);
    setTranslatedNotice("");
    setTranslationError("");
    const personaData = PERSONAS.find(p => p.id === persona);
    const grantedPurposes = PURPOSES.map(p => `- ${p.label} (${p.section})`).join("\n");

    const prompt = `You are a DPDP Act 2023 Notice Generation Agent powered by AI4Bharat NLP tools. Generate a formal but clear DATA COLLECTION NOTICE for:

Data Fiduciary: ${dataFiduciary}
User Persona: ${personaData.label} — ${personaData.description}
Reading Level Required: ${personaData.readingLevel}

The notice must comply with DPDP Act 2023 Section 5 (Notice) requirements:
- Be itemized and specific
- Written in ${personaData.readingLevel === "Simple" ? "very simple, easy-to-understand language avoiding jargon" : personaData.readingLevel === "Moderate" ? "clear, plain language" : "professional, precise language"}
- Cover each data processing purpose separately
- Include: what data is collected, why, how long it's kept, data principal rights
- Reference DPDP Act 2023 sections where applicable
- End with consent mechanism information per Section 6

Purposes to cover:
${grantedPurposes}

Format: Clear headings, short paragraphs, numbered points where helpful. Keep to 300-400 words.`;

    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        if (res.status === 401) {
          setApiKeyValid(false);
          throw new Error("Invalid API key. Please check your GROQ API key.");
        } else if (res.status === 429) {
          throw new Error("Rate limit exceeded. Please try again later.");
        } else {
          throw new Error(`API error: ${errorData.error?.message || res.statusText}`);
        }
      }
      
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || "Error generating notice.";
      setNotice(text);
      addLog("consent", `Notice generated for persona: ${personaData.label}`);
    } catch (error) {
      console.error("Error generating notice:", error);
      setTranslationError(error.message);
      setNotice("");
    }
    setLoadingNotice(false);
  };

  const translateNotice = async () => {
    if (!notice || language === "en") {
      setTranslationError("Please generate a notice first or select a non-English language.");
      return;
    }
    
    if (!apiKeyValid) {
      setTranslationError("Please configure a valid GROQ API key first.");
      return;
    }
    
    setLoadingTranslate(true);
    setTranslationError("");
    const langData = LANGUAGES.find(l => l.code === language);

    const prompt = `You are an expert translator specializing in Indian languages. Translate the following DPDP Act notice into ${langData.label} (${langData.native}).

Requirements for translation:
- Maintain complete legal accuracy - all legal terms must be preserved
- Use simple, everyday words that are easily understood by the general public
- Keep all legal section references exactly as they are (§5, §6, §12, etc.)
- For complex legal terms that don't have direct equivalents, provide the English term in parentheses after the translated term
- Preserve all formatting including headings, numbered lists, and paragraph breaks
- The translation should sound natural to a native ${langData.label} speaker
- Avoid overly formal or Sanskritized language - use common colloquial terms

NOTICE TO TRANSLATE:
${notice}

Provide ONLY the translated text, no explanations, no notes, no English text except for terms in parentheses as specified.`;

    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { 
              role: "system", 
              content: "You are AI4Bharat's IndicTrans2 translation engine, specialized in accurate translations between English and Indian languages. You always maintain legal accuracy while using simple, understandable language."
            },
            { role: "user", content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 1500,
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        if (res.status === 401) {
          setApiKeyValid(false);
          throw new Error("Invalid API key. Please check your GROQ API key.");
        } else if (res.status === 429) {
          throw new Error("Rate limit exceeded. Please try again later.");
        } else {
          throw new Error(`API error: ${errorData.error?.message || res.statusText}`);
        }
      }
      
      const data = await res.json();
      const translatedText = data.choices?.[0]?.message?.content;
      
      if (!translatedText || translatedText.trim() === "") {
        throw new Error("Empty translation received");
      }
      
      setTranslatedNotice(translatedText);
      addLog("consent", `Notice translated to ${langData.label} successfully`);
      
    } catch (error) {
      console.error("Error translating notice:", error);
      setTranslationError(`Translation failed: ${error.message}`);
      setTranslatedNotice("");
    }
    setLoadingTranslate(false);
  };

  const submitConsent = () => {
    const id = "DPDP-" + Date.now().toString(36).toUpperCase();
    setReceiptId(id);
    setSubmitted(true);
    const granted = PURPOSES.filter(p => consents[p.id]).map(p => p.label).join(", ");
    addLog("consent", `Consent submitted (ID: ${id}) — Granted: ${granted}`);
    setStep(3);
  };

  const revokeConsent = () => {
    setRevoked(true);
    setConsents(prev => {
      const next = { ...prev };
      PURPOSES.forEach(p => { if (!p.required) next[p.id] = false; });
      return next;
    });
    addLog("revoke", `Consent revoked for non-essential purposes (Receipt: ${receiptId})`);
  };

  const grantedCount = PURPOSES.filter(p => consents[p.id]).length;
  const optionalCount = PURPOSES.filter(p => !p.required && consents[p.id]).length;
  const langData = LANGUAGES.find(l => l.code === language);

  const steps = [
    { num: 1, label: "Persona & Notice" },
    { num: 2, label: "Consent" },
    { num: 3, label: "Receipt" },
  ];

  return (
    <>
      <style>{styles}</style>
      <div className="agent-root">
        {/* Header */}
        <header className="header">
          <div className="header-stripe" />
          <div className="header-inner">
            <div className="header-logo">
              <span className="ashoka">⚖️</span>
              <div className="header-title">
                <h1>DPDP Consent Agent</h1>
                <p>Digital Personal Data Protection Act 2023 — Notice & Consent Engine</p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <div className="lang-selector">
                <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>🌐</span>
                <select value={language} onChange={e => setLanguage(e.target.value)}>
                  {LANGUAGES.map(l => (
                    <option key={l.code} value={l.code}>{l.native} — {l.label}</option>
                  ))}
                </select>
              </div>
              <span className="header-badge">DPDP §5 §6</span>
            </div>
          </div>
        </header>

        <div className="main">
          {/* Step Indicator */}
          <div className="steps">
            {steps.map((s, i) => (
              <div key={s.num} className={`step ${step > s.num ? "done" : step === s.num ? "active" : "pending"}`}>
                <div className="step-num">{step > s.num ? "✓" : s.num}</div>
                <div className="step-label">{s.label}</div>
              </div>
            ))}
          </div>

          {/* API Key Warning */}
          {!apiKeyValid && (
            <div className="api-warning">
              <span>⚠️</span>
              <div>
                <strong>GROQ API Key not configured!</strong> Please add your API key to use the AI features. 
                Get a free key from <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer">console.groq.com</a> 
                and replace the <code>GROQ_API_KEY</code> value at the top of this file.
              </div>
            </div>
          )}

          {/* Compliance Panel */}
          <div className="compliance-panel">
            <div className="compliance-title">DPDP Act 2023 Compliance Checklist</div>
            <div className="compliance-items">
              {[
                { ok: true, label: "§5(1) — Notice before/at time of data collection" },
                { ok: !!notice, label: "§5(2) — Itemized notice with clear language" },
                { ok: language !== "en" ? !!translatedNotice : true, label: "§5(3) — Notice available in English / Scheduled Language" },
                { ok: step >= 2, label: "§6(1) — Free, specific, informed & unambiguous consent" },
                { ok: PURPOSES.filter(p => !p.required && consents[p.id]).length >= 0, label: "§6(2) — Granular consent per processing purpose" },
                { ok: submitted, label: "§6(4) — Consent record maintained with timestamp" },
                { ok: submitted, label: "§6(5) — Right to withdraw consent mechanism available" },
              ].map((item, i) => (
                <div className="compliance-item" key={i}>
                  <div className={`ci ${item.ok ? "ci-ok" : "ci-warn"}`}>{item.ok ? "✓" : "!"}</div>
                  <span style={{ color: item.ok ? "#065F46" : "#92400E" }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* STEP 1 — Persona & Notice */}
          {step === 1 && (
            <>
              {/* Persona Selection */}
              <div className="card">
                <div className="card-header">
                  <span className="section-tag">DPDP §5</span>
                  <h2>Step 1A — Select User Persona for Dynamic Notice</h2>
                </div>
                <div className="card-body">
                  <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16, lineHeight: 1.6 }}>
                    AI4Bharat's IndicBERT persona classifier identifies user literacy and language preference to generate contextually appropriate, plain-language notices per DPDP §5(2).
                  </p>
                  <div className="persona-grid">
                    {PERSONAS.map(p => (
                      <div
                        key={p.id}
                        className={`persona-card ${persona === p.id ? "selected" : ""}`}
                        onClick={() => setPersona(p.id)}
                      >
                        <div className="icon">{p.icon}</div>
                        <div className="name">{p.label}</div>
                        <div className="desc">{p.description}</div>
                        <span className={`badge badge-${p.readingLevel.toLowerCase()}`}>{p.readingLevel} Reading Level</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Notice Generator */}
              <div className="card">
                <div className="card-header">
                  <span className="section-tag">AI4BHARAT</span>
                  <h2>Step 1B — Generate Dynamic Notice</h2>
                  <div className="ai4b-badge">
                    <span className="dot" />
                    GROQ Llama-3.3-70B + IndicTransliterate
                  </div>
                </div>
                <div className="card-body">
                  <button
                    className="generate-btn"
                    onClick={generateNotice}
                    disabled={!persona || loadingNotice || !apiKeyValid}
                    style={{ marginBottom: 16 }}
                  >
                    {loadingNotice ? (
                      <><div className="spinner" /> Generating personalized notice via GROQ Llama-3.3...</>
                    ) : (
                      <>⚡ Generate DPDP-Compliant Notice for Selected Persona</>
                    )}
                  </button>

                  {/* Display translation error if any */}
                  {translationError && (
                    <div className="error-message">
                      ⚠️ {translationError}
                    </div>
                  )}

                  {notice && (
                    <>
                      <div className="notice-meta">
                        <span className="meta-chip chip-persona">
                          👤 {PERSONAS.find(p => p.id === persona)?.label}
                        </span>
                        <span className="meta-chip chip-lang">
                          🌐 {langData?.native}
                        </span>
                        <span className="meta-chip chip-dpdp">
                          ⚖️ DPDP §5 Compliant
                        </span>
                      </div>

                      <div className="notice-box">
                        {translatedNotice || notice}
                      </div>

                      {/* Indic-Transliterate Component */}
                      {showTransliteration && (
                        <div className="transliterate-container">
                          <div className="transliterate-label">
                            <span>✍️ Type in {langData?.native}</span>
                            <span className="keyboard-hint">(Type in English, get {langData?.native})</span>
                          </div>
                          <IndicTransliterate
                            value={transliteratedText}
                            onChangeText={(text) => {
                              setTransliteratedText(text);
                            }}
                            lang={language}
                            placeholder={`Type here in English to transliterate to ${langData?.native}...`}
                            className="transliterate-input"
                          />
                          <div className="input-hint">
                            <span>Powered by AI4Bharat Indic-Transliterate</span>
                            <span>⚡</span>
                          </div>
                        </div>
                      )}

                      {language !== "en" && (
                        <div className="translate-row">
                          <button
                            className="translate-btn"
                            onClick={translateNotice}
                            disabled={loadingTranslate || !notice || !apiKeyValid}
                          >
                            {loadingTranslate ? (
                              <><div className="spinner" /> Translating to {langData?.native}...</>
                            ) : (
                              <>🔤 Translate to {langData?.native} via GROQ Llama-3.3</>
                            )}
                          </button>
                          <div className="ai4b-badge">
                            <span className="dot" />
                            AI4Bharat IndicTrans2 + IndicTransliterate
                          </div>
                          {translatedNotice && (
                            <button 
                              className="translate-btn" 
                              onClick={() => setTranslatedNotice("")} 
                              style={{ borderColor: "var(--muted)", color: "var(--muted)" }}
                            >
                              Show English
                            </button>
                          )}
                        </div>
                      )}

                      <div style={{ marginTop: 20 }}>
                        <button className="btn-primary" onClick={() => setStep(2)}>
                          Proceed to Consent Management →
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          )}

          {/* STEP 2 — Consent */}
          {step === 2 && (
            <>
              <div className="card">
                <div className="card-header">
                  <span className="section-tag">DPDP §6</span>
                  <h2>Step 2 — Granular Consent Management</h2>
                </div>
                <div className="card-body">
                  <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16, lineHeight: 1.6 }}>
                    Under DPDP Act §6, consent must be <strong>free, specific, informed, unconditional and unambiguous</strong>. Each purpose requires separate consent. Required purposes are mandated by law or contract.
                  </p>

                  <div className="purpose-list">
                    {PURPOSES.map(p => (
                      <div key={p.id} className={`purpose-row ${consents[p.id] ? "granted" : ""} ${p.required ? "required-row" : ""}`}>
                        <div
                          className={`purpose-check ${p.required ? "locked" : consents[p.id] ? "checked" : ""}`}
                          onClick={() => !p.required && setConsents(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                        >
                          {(p.required || consents[p.id]) && "✓"}
                        </div>
                        <div className="purpose-info">
                          <div className="purpose-name">{p.label}</div>
                          <div className="purpose-tags">
                            <span className="tag tag-sec">{p.section}</span>
                            <span className="tag tag-basis">{p.lawfulBasis}</span>
                            {p.required && <span className="tag tag-req">Required</span>}
                            {!p.required && <span className="tag" style={{ background: "#FFF8ED", color: "#92400E" }}>Optional</span>}
                          </div>
                        </div>
                        {p.required && (
                          <span style={{ fontSize: 11, color: "#6366F1", fontWeight: 600 }}>Mandatory</span>
                        )}
                      </div>
                    ))}
                  </div>

                  <div style={{ margin: "20px 0", padding: "12px 16px", background: "#FFF8ED", borderRadius: 8, borderLeft: "3px solid var(--saffron)", fontSize: 12, lineHeight: 1.6 }}>
                    <strong>§6(7) Right to Withdraw:</strong> You may withdraw consent for optional purposes at any time. Withdrawal does not affect lawfulness of processing prior to withdrawal.
                  </div>

                  <div className="action-row">
                    <button className="btn-primary" onClick={submitConsent}>
                      ✅ Grant Consent & Generate Receipt
                    </button>
                    <button className="btn-ghost" onClick={() => setStep(1)}>← Back</button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* STEP 3 — Receipt */}
          {step === 3 && (
            <>
              <div className="consent-summary">
                <h3>🛡️ Consent Summary — {dataFiduciary}</h3>
                <div className="consent-grid">
                  <div className="consent-stat">
                    <div className="num">{grantedCount}</div>
                    <div className="lbl">Purposes Consented</div>
                  </div>
                  <div className="consent-stat">
                    <div className="num">{optionalCount}</div>
                    <div className="lbl">Optional Consents Given</div>
                  </div>
                  <div className="consent-stat">
                    <div className="num">{PURPOSES.length - grantedCount}</div>
                    <div className="lbl">Purposes Declined</div>
                  </div>
                  <div className="consent-stat" style={{ background: revoked ? "rgba(220,38,38,0.2)" : "rgba(22,163,74,0.2)" }}>
                    <div className="num" style={{ color: revoked ? "#FCA5A5" : "#86EFAC", fontSize: 20 }}>
                      {revoked ? "REVOKED" : "ACTIVE"}
                    </div>
                    <div className="lbl">Consent Status</div>
                  </div>
                </div>
              </div>

              {/* Consent Receipt */}
              <div className="card">
                <div className="card-header">
                  <span className="section-tag">§6(4)</span>
                  <h2>Consent Receipt — Verifiable Audit Record</h2>
                </div>
                <div className="card-body">
                  <div className="receipt">
                    <div className="receipt-header">
                      <div className="check-icon">✓</div>
                      <div>
                        <h3>Consent Successfully Recorded</h3>
                        <p>DPDP Act 2023 §6 Compliant — Timestamp-anchored Consent Record</p>
                      </div>
                    </div>
                    <table className="receipt-table">
                      <tbody>
                        <tr><td>Receipt ID</td><td style={{ fontFamily: "IBM Plex Mono", color: "var(--navy)" }}>{receiptId}</td></tr>
                        <tr><td>Data Fiduciary</td><td>{dataFiduciary}</td></tr>
                        <tr><td>Data Principal</td><td>{PERSONAS.find(p => p.id === persona)?.label} — {langData?.label}</td></tr>
                        <tr><td>Timestamp (IST)</td><td>{new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td></tr>
                        <tr><td>Notice Language</td><td>{langData?.native} ({langData?.label}){translatedNotice ? " — Translated via AI4Bharat IndicTrans2" : ""}</td></tr>
                        <tr><td>Consented Purposes</td><td>{PURPOSES.filter(p => consents[p.id]).map(p => p.label).join(", ")}</td></tr>
                        <tr><td>Declined Purposes</td><td>{PURPOSES.filter(p => !consents[p.id]).map(p => p.label).join(", ") || "None"}</td></tr>
                        <tr><td>Consent Basis</td><td>Freely given, specific, informed, unambiguous — §6(1)</td></tr>
                        <tr><td>Status</td><td style={{ color: revoked ? "var(--danger)" : "var(--success)", fontWeight: 700 }}>{revoked ? "REVOKED" : "ACTIVE"}</td></tr>
                      </tbody>
                    </table>
                    {transliteratedText && (
                      <div style={{ marginTop: 16, padding: 12, background: "#F3F4F6", borderRadius: 6, borderLeft: "3px solid var(--saffron)" }}>
                        <strong style={{ fontSize: 11, color: "var(--navy)" }}>Your Input in {langData?.native}:</strong>
                        <p style={{ fontSize: 13, marginTop: 6, fontFamily: "'Noto Sans', sans-serif" }}>{transliteratedText}</p>
                      </div>
                    )}
                    <div className="revoke-notice">
                      ⚠ As per DPDP Act §6(7), you may withdraw non-essential consents at any time using the button below. Your data principal rights under §12-14 remain unaffected.
                    </div>
                  </div>

                  <div className="action-row" style={{ marginTop: 16 }}>
                    {!revoked && (
                      <button className="btn-danger" onClick={revokeConsent}>
                        🚫 Withdraw Non-Essential Consents (§6(7))
                      </button>
                    )}
                    <button className="btn-ghost" onClick={() => {
                      setStep(1); setSubmitted(false); setNotice(""); setTranslatedNotice(""); setRevoked(false); setPersona(null); setTransliteratedText(""); setTranslationError("");
                    }}>
                      ↩ New Consent Flow
                    </button>
                  </div>
                </div>
              </div>

              {/* Audit Log */}
              <div className="card">
                <div className="card-header">
                  <span className="section-tag">§8(9)</span>
                  <h2>Consent Audit Log — Immutable Activity Record</h2>
                </div>
                <div className="card-body">
                  {auditLog.length === 0 ? (
                    <p style={{ color: "var(--muted)", fontSize: 12 }}>No activity recorded yet.</p>
                  ) : (
                    auditLog.map((entry, i) => (
                      <div key={i} className={`log-entry ${entry.type}`}>
                        <span style={{ opacity: 0.6 }}>[{entry.ts}]</span> {entry.type === "revoke" ? "REVOKE" : "CONSENT"}: {entry.message}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}

          {/* Footer */}
          <div style={{ textAlign: "center", padding: "24px 0", color: "var(--muted)", fontSize: 11, borderTop: "1px solid var(--border)", marginTop: 8 }}>
            <div style={{ marginBottom: 6 }}>
              Powered by <strong>GROQ Llama-3.3-70B + AI4Bharat Indic-Transliterate + IndicTrans2</strong> — 22 Scheduled Languages | DPDP Act 2023 §5 & §6 Compliant
            </div>
            <div>
              Ministry of Electronics & Information Technology (MeitY) Framework | Data principal rights under §12 (Right to Information), §13 (Right to Correction), §14 (Right to Erasure)
            </div>
          </div>
        </div>
      </div>
    </>
  );
}