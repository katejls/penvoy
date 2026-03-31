"use client";
import { useState, useRef, useEffect } from "react";

function todayFormatted(hoursAgo = 0) {
  const d = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
  const date = d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${date} ${time}`;
}

const SAMPLE_EMAIL = `From: Dana Wilson <dana.wilson@acmecorp.com>
Date: ${todayFormatted(3)}
Subject: Pre-meeting updates + a few asks

Hi Team,

Hope everyone had a great weekend! Just wanted to touch base on a few things before our Wednesday meeting.

First, the Q2 budget proposal is due by Friday April 4th. Sarah, could you pull together the marketing spend numbers? And Jake, we'll need the engineering headcount projections. Please have those to me by end of day Thursday so I can compile everything.

Second, the client demo for Acme Corp got moved to next Tuesday at 2pm EST. They specifically asked to see the new dashboard features, so let's make sure the staging environment is updated. Maria, can you coordinate with DevOps on this?

Third, quick reminder that the office will be closed next Monday for the holiday. If you have any urgent deliverables, plan accordingly.

Lastly, congrats to the design team on the rebrand launch — the feedback from stakeholders has been overwhelmingly positive!

Let me know if you have any questions.

Best,
Dana`;

const SAMPLE_THREAD = `From: Dana Wilson <dana.wilson@acmecorp.com>
Date: ${todayFormatted(8)}
Subject: Pre-meeting updates + a few asks

Hi Team,

Quick items before Wednesday's meeting:

1. Q2 budget proposal due Friday April 4th — Sarah, need marketing spend numbers. Jake, need engineering headcount projections. Both by EOD Thursday please.
2. Acme Corp demo moved to next Tuesday 2pm EST — they want to see new dashboard features. Maria, can you coordinate with DevOps to update staging?
3. Office closed next Monday for the holiday — plan around any urgent deliverables.
4. Congrats to design team on the rebrand launch — stakeholder feedback has been great!

Questions? Let me know.

Best,
Dana

---

From: Sarah Chen <sarah.chen@acmecorp.com>
Date: ${todayFormatted(6)}

Hey Dana,

Got it! I'll have the marketing spend numbers pulled together by Thursday noon. Quick question — should I include the influencer campaign costs from the pilot program, or just the core channel spend?

Also, just a heads up — I'll be out of office Wednesday afternoon for a dentist appointment, but I'll dial into the meeting remotely.

Thanks,
Sarah

---

From: Maria Lopez <maria.lopez@acmecorp.com>
Date: ${todayFormatted(5)}

Hi Dana,

I pinged DevOps and they said staging can be updated by Monday. I'll run a smoke test Tuesday morning to make sure the dashboard features are working properly before the 2pm demo.

One thing — do we have the latest mockups from the design team for the new filtering feature? I want to make sure what we demo matches what was approved.

- Maria

---

From: Dana Wilson <dana.wilson@acmecorp.com>
Date: ${todayFormatted(2)}

Thanks Sarah and Maria!

Sarah — include both the core channel spend AND the influencer pilot costs. Let's show the full picture. And no worries about Wednesday, just dial in when you can.

Maria — great call on the smoke test. I'll check with the design team about the latest mockups and get back to you today.

Jake — still need those headcount projections. Can you confirm you're on track for Thursday?

Thanks all!
Dana`;

const DEFAULT_SLA_HOURS = 48;

// Client-side date parser — no AI guessing, consistent every time
function parseEmailDate(text) {
  if (!text) return null;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);

  // "Today at 11:13 AM" or "Today, 11:13 AM" or "AGS Today at 11:13 AM"
  const todayMatch = text.match(/today[\s,]+(?:at\s+)?(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (todayMatch) {
    let h = parseInt(todayMatch[1]);
    const m = parseInt(todayMatch[2]);
    const ap = todayMatch[3].toUpperCase();
    if (ap === "PM" && h < 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    return new Date(today.getFullYear(), today.getMonth(), today.getDate(), h, m);
  }

  // "Yesterday at 3:00 PM"
  const yesterdayMatch = text.match(/yesterday[\s,]+(?:at\s+)?(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (yesterdayMatch) {
    let h = parseInt(yesterdayMatch[1]);
    const m = parseInt(yesterdayMatch[2]);
    const ap = yesterdayMatch[3].toUpperCase();
    if (ap === "PM" && h < 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    return new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), h, m);
  }

  // "N hours ago" or "N minutes ago"
  const agoMatch = text.match(/(\d+)\s+(hour|minute|min)s?\s+ago/i);
  if (agoMatch) {
    const n = parseInt(agoMatch[1]);
    const unit = agoMatch[2].toLowerCase();
    const ms = unit.startsWith("min") ? n * 60000 : n * 3600000;
    return new Date(Date.now() - ms);
  }

  // "N days ago"
  const daysAgoMatch = text.match(/(\d+)\s+days?\s+ago/i);
  if (daysAgoMatch) {
    const d = new Date(today);
    d.setDate(d.getDate() - parseInt(daysAgoMatch[1]));
    d.setHours(9, 0, 0, 0);
    return d;
  }

  // "Mon 3/25/2026 9:14 AM" or "3/25/2026 9:14 AM"
  const usDateTimeMatch = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})[\s,]+(?:at\s+)?(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (usDateTimeMatch) {
    const mo = parseInt(usDateTimeMatch[1]) - 1;
    const day = parseInt(usDateTimeMatch[2]);
    let yr = parseInt(usDateTimeMatch[3]); if (yr < 100) yr += 2000;
    let h = parseInt(usDateTimeMatch[4]);
    const mi = parseInt(usDateTimeMatch[5]);
    const ap = usDateTimeMatch[6].toUpperCase();
    if (ap === "PM" && h < 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    return new Date(yr, mo, day, h, mi);
  }

  // Gmail style: "Feb 24, 2026, 1:04 AM" or "Mar 27, 2026, 11:19 AM" (comma after year)
  const gmailMatch = text.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4}),?\s+(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (gmailMatch) {
    const months = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };
    const mo = months[gmailMatch[1].toLowerCase().slice(0, 3)];
    const day = parseInt(gmailMatch[2]);
    const yr = parseInt(gmailMatch[3]);
    let h = parseInt(gmailMatch[4]);
    const mi = parseInt(gmailMatch[5]);
    const ap = gmailMatch[6].toUpperCase();
    if (ap === "PM" && h < 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    return new Date(yr, mo, day, h, mi);
  }

  // "March 27, 2026 2:30 PM" (no comma after year)
  const longDateMatch = text.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (longDateMatch) {
    const monthStr = text.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i)[0];
    const months = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };
    const mo = months[monthStr.toLowerCase().slice(0, 3)];
    const day = parseInt(longDateMatch[1]);
    const yr = parseInt(longDateMatch[2]);
    let h = parseInt(longDateMatch[3]);
    const mi = parseInt(longDateMatch[4]);
    const ap = longDateMatch[5].toUpperCase();
    if (ap === "PM" && h < 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    return new Date(yr, mo, day, h, mi);
  }

  // "Date: March 27, 2026" (no time — assume 9 AM)
  const longDateOnly = text.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})/i);
  if (longDateOnly) {
    const monthStr = text.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i)[0];
    const months = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };
    const mo = months[monthStr.toLowerCase().slice(0, 3)];
    const day = parseInt(longDateOnly[1]);
    const yr = parseInt(longDateOnly[2]);
    return new Date(yr, mo, day, 9, 0);
  }

  // "Today" with no time
  if (/\btoday\b/i.test(text)) {
    return new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0);
  }

  // "Yesterday" with no time
  if (/\byesterday\b/i.test(text)) {
    return new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 9, 0);
  }

  return null;
}

// Scan the full email text for the best date
function extractDateFromEmail(emailText) {
  const lines = emailText.split("\n");
  // First try Date: header lines
  for (const line of lines) {
    if (/^date:/i.test(line.trim())) {
      const d = parseEmailDate(line);
      if (d && !isNaN(d.getTime())) return d;
    }
  }
  // Then try any line with a recognizable date
  for (const line of lines) {
    const d = parseEmailDate(line);
    if (d && !isNaN(d.getTime())) return d;
  }
  // Check for "Today at" or "Yesterday at" anywhere
  const inlineMatch = emailText.match(/(today|yesterday)[\s,]+(?:at\s+)?\d{1,2}:\d{2}\s*(?:AM|PM)/i);
  if (inlineMatch) {
    return parseEmailDate(inlineMatch[0]);
  }
  return null;
}

// For threads, find the LAST/most recent date in the text
function extractLastDateFromThread(emailText) {
  // Strategy 1: Find ALL "X hours/minutes ago" patterns and pick the smallest (most recent)
  const agoPattern = /(\d+)\s+(hour|minute|min|day)s?\s+ago/gi;
  let match;
  let mostRecentDate = null;
  let smallestAgo = Infinity;
  
  while ((match = agoPattern.exec(emailText)) !== null) {
    const n = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    let ms;
    if (unit.startsWith("min")) ms = n * 60000;
    else if (unit.startsWith("hour")) ms = n * 3600000;
    else if (unit.startsWith("day")) ms = n * 86400000;
    else continue;
    if (ms < smallestAgo) {
      smallestAgo = ms;
      mostRecentDate = new Date(Date.now() - ms);
    }
  }
  if (mostRecentDate) return mostRecentDate;

  // Strategy 2: Scan lines bottom-up for any parseable date
  const lines = emailText.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line) continue;
    const d = parseEmailDate(line);
    if (d && !isNaN(d.getTime())) return d;
  }
  return null;
}

function getSlaStatus(sentDate, slaHours = DEFAULT_SLA_HOURS) {
  if (!sentDate) return null;
  try {
    const sent = sentDate instanceof Date ? sentDate : new Date(sentDate);
    if (isNaN(sent.getTime())) return null;
    const now = new Date();
    const diffMs = now - sent;
    const diffHrs = diffMs / (1000 * 60 * 60);
    const remaining = slaHours - diffHrs;

    if (remaining <= 0) {
      const overBy = Math.abs(remaining);
      return {
        status: "breached",
        label: `SLA breached — ${overBy < 1 ? Math.round(overBy * 60) + "m" : Math.round(overBy) + "h"} overdue`,
        color: "#ef4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.25)",
        icon: "🚨", tip: `Reply ASAP — this is past your ${slaHours}h SLA window.`,
      };
    } else if (remaining <= (slaHours * 0.125)) {
      return {
        status: "critical",
        label: `Only ${remaining < 1 ? Math.round(remaining * 60) + "m" : Math.round(remaining) + "h"} left`,
        color: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)",
        icon: "⚠️", tip: "Running low on time — prioritize this reply.",
      };
    } else if (remaining <= (slaHours * 0.5)) {
      return {
        status: "warning", label: `${Math.round(remaining)}h remaining`,
        color: "#fbbf24", bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.2)",
        icon: "⏳", tip: "You have some time, but don't let this slip.",
      };
    } else {
      return {
        status: "ok", label: `${Math.round(remaining)}h remaining`,
        color: "#22c55e", bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.2)",
        icon: "✅", tip: "Within SLA — no rush, but don't forget.",
      };
    }
  } catch { return null; }
}

function ReplyAdjuster({ draft, onUpdate, callAI: callAIProp }) {
  const [adj, setAdj] = useState("");
  const [busy, setBusy] = useState(false);

  const doRegenerate = async () => {
    if (!adj.trim() || !callAIProp) return;
    setBusy(true);
    try {
      const prompt = `Change: "${adj}"\nKeep same greeting/structure. Keep same language as the draft. End with "Thank you!" or similar, no signature. Say "please let us know" not "let you know". Rewrite ONLY the reply:\n${draft}`;
      const result = await callAIProp(prompt, 250);
      if (result.trim()) { onUpdate(result.trim()); setAdj(""); }
    } catch {
      onUpdate(draft + "\n\n[TODO: " + adj + "]");
      setAdj("");
    } finally { setBusy(false); }
  };

  return (
    <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
      <input
        type="text" value={adj} onChange={(e) => setAdj(e.target.value)}
        placeholder="Adjust reply — e.g. it falls on Genius Lab to handle this"
        onKeyDown={(e) => { if (e.key === "Enter" && adj.trim() && !busy) doRegenerate(); }}
        style={{
          flex: 1, background: "rgba(0,0,0,0.2)", border: "1px solid rgba(99,102,241,0.15)",
          borderRadius: 8, padding: "8px 12px", color: "#d1d5e4", fontSize: 12,
          outline: "none", fontFamily: "'DM Sans', system-ui, sans-serif",
        }}
      />
      <button onClick={doRegenerate} disabled={!adj.trim() || busy} style={{
        fontSize: 12, fontWeight: 600, padding: "8px 12px", borderRadius: 8,
        cursor: !adj.trim() || busy ? "not-allowed" : "pointer",
        background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.25)",
        color: "#c7d2fe", opacity: !adj.trim() ? 0.4 : 1, flexShrink: 0,
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}>
        {busy ? "..." : "🔄"}
      </button>
    </div>
  );
}

function ReplyScorer({ draft, callAI: callAIProp }) {
  const [score, setScore] = useState(null);
  const [scoring, setScoring] = useState(false);

  const doScore = async () => {
    if (!draft?.trim() || !callAIProp) return;
    setScoring(true);
    setScore(null);
    try {
      const prompt = `Score this email draft on a 1-10 scale. Return ONLY valid JSON, no markdown:
{"score":8,"clarity":8,"tone":7,"redundancy":9,"professionalism":8,"feedback":"one sentence of actionable feedback","improved":"optional: if score < 7, rewrite the email better. if score >= 7, leave empty string"}

Scoring criteria:
- clarity: Is the message clear? Does every sentence add value?
- tone: Is it appropriate for a work email? Not too stiff, not too casual?
- redundancy: Are there any repeated words, phrases, or ideas? (10 = no redundancy)
- professionalism: Would this look good if forwarded to a VP or client?
- feedback: ONE specific, actionable suggestion. Not generic praise

Draft to score:
${draft}`;
      const raw = await callAIProp(prompt, 500);
      const clean = raw.replace(/```json|```/g, "").trim();
      setScore(JSON.parse(clean));
    } catch {
      setScore({ score: 0, feedback: "Couldn't score — please try again." });
    } finally { setScoring(false); }
  };

  const scoreColor = (s) => s >= 8 ? "#22c55e" : s >= 6 ? "#fbbf24" : "#f87171";

  return (
    <div style={{ marginTop: 10 }}>
      <button onClick={doScore} disabled={scoring || !draft?.trim()} style={{
        fontSize: 11, fontWeight: 600, padding: "6px 14px", borderRadius: 8,
        cursor: scoring ? "wait" : "pointer",
        background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)",
        color: "#fbbf24", fontFamily: "'DM Sans', system-ui, sans-serif",
      }}>{scoring ? "Scoring..." : "📊 Score this reply"}</button>
      {score && score.score > 0 && (
        <div style={{
          marginTop: 10, padding: "14px 18px", background: "rgba(255,255,255,0.03)",
          border: `1px solid ${scoreColor(score.score)}33`, borderRadius: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
            <span style={{
              fontSize: 28, fontWeight: 800, color: scoreColor(score.score),
              fontFamily: "'Fraunces', Georgia, serif",
            }}>{score.score}/10</span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[
                { label: "Clarity", val: score.clarity },
                { label: "Tone", val: score.tone },
                { label: "Redundancy", val: score.redundancy },
                { label: "Professional", val: score.professionalism },
              ].map((m) => m.val ? (
                <span key={m.label} style={{
                  fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 6,
                  background: `${scoreColor(m.val)}15`, color: scoreColor(m.val),
                  border: `1px solid ${scoreColor(m.val)}30`,
                }}>{m.label}: {m.val}</span>
              ) : null)}
            </div>
          </div>
          {score.feedback && <p style={{ fontSize: 12, color: "#d1d5e4", margin: 0, lineHeight: 1.5 }}>💡 {score.feedback}</p>}
          {score.improved && <div style={{ marginTop: 10, padding: 12, background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.1)", borderRadius: 8 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#22c55e", margin: "0 0 6px" }}>Suggested rewrite:</p>
            <p style={{ fontSize: 12, color: "#d1d5e4", margin: 0, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{score.improved}</p>
          </div>}
        </div>
      )}
    </div>
  );
}

export default function EmailSummarizer() {
  const [mode, setMode] = useState("single"); // "single" or "thread"
  const [provider, setProvider] = useState("anthropic"); // "anthropic" or "openai"
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [emailText, setEmailText] = useState("");
  const [summary, setSummary] = useState(null);
  const [threadResult, setThreadResult] = useState(null);
  const [draftReply, setDraftReply] = useState(null);
  const [sla, setSla] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingTime, setLoadingTime] = useState(0);
  const loadingInterval = useRef(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(null);
  const [replyContext, setReplyContext] = useState("");
  const [tone, setTone] = useState("friendly");
  const [userName, setUserName] = useState("");
  const [cannedResponses, setCannedResponses] = useState([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showCannedDropdown, setShowCannedDropdown] = useState(false);
  const [cannedName, setCannedName] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [replyAdjustment, setReplyAdjustment] = useState("");
  const [composeTo, setComposeTo] = useState("");
  const [composeType, setComposeType] = useState("new");
  const [composeNotes, setComposeNotes] = useState("");
  const [composeResult, setComposeResult] = useState(null);
  const [licenseKey, setLicenseKey] = useState("");
  const [isLicensed, setIsLicensed] = useState(false);
  const [licenseError, setLicenseError] = useState("");
  const [showLanding, setShowLanding] = useState(true);
  const [slaHours, setSlaHours] = useState(48);
  const [styleProfile, setStyleProfile] = useState("");
  const [showStyleSetup, setShowStyleSetup] = useState(false);
  const [styleSamples, setStyleSamples] = useState(["", "", ""]);
  const [analyzingStyle, setAnalyzingStyle] = useState(false);
  const [replyLanguage, setReplyLanguage] = useState("english");
  const [showStylePreview, setShowStylePreview] = useState(false);
  const [editingStyle, setEditingStyle] = useState(false);
  const [editStyleText, setEditStyleText] = useState(""); // "english", "original", or specific language
  const recognitionRef = useRef(null);
  const resultsRef = useRef(null);
  const dropdownRef = useRef(null);

  // Load saved data on mount
  useEffect(() => {
    (async () => {
      try {
        const nameResult = { value: localStorage.getItem("penvoy_user_name") };
        if (nameResult?.value) setUserName(nameResult.value);
      } catch {}
      try {
        const result = { value: localStorage.getItem("penvoy_canned_responses") };
        if (result?.value) setCannedResponses(JSON.parse(result.value));
      } catch {}
      try {
        const prov = { value: localStorage.getItem("penvoy_ai_provider") };
        if (prov?.value) setProvider(prov.value);
      } catch {}
      try {
        const key = { value: localStorage.getItem("penvoy_ai_api_key") };
        if (key?.value) setApiKey(key.value);
      } catch {}
      try {
        const lic = { value: localStorage.getItem("penvoy_license_key") };
        if (lic?.value) { setLicenseKey(lic.value); setIsLicensed(true); setShowLanding(false); }
      } catch {}
      try {
        const sla = localStorage.getItem("penvoy_sla_hours");
        if (sla) setSlaHours(parseInt(sla) || 48);
      } catch {}
      try {
        const sp = localStorage.getItem("penvoy_style_profile");
        if (sp) setStyleProfile(sp);
      } catch {}
    })();
  }, []);

  // License validation via LemonSqueezy API
  const MASTER_KEY = "PENVOY-KATE-2026";
  const validateLicense = async () => {
    setLicenseError("");
    if (!licenseKey.trim()) { setLicenseError("Please enter your license key."); return; }
    // Master key for owner access
    if (licenseKey.trim() === MASTER_KEY) {
      setIsLicensed(true);
      setShowLanding(false);
      try { localStorage.setItem("penvoy_license_key", licenseKey.trim()); } catch {}
      return;
    }
    // Validate via server-side API route (calls LemonSqueezy)
    try {
      setLicenseError("Validating...");
      const res = await fetch("/api/validate-license", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ license_key: licenseKey.trim() }),
      });
      const data = await res.json();
      if (data.valid) {
        setIsLicensed(true);
        setShowLanding(false);
        setLicenseError("");
        try { localStorage.setItem("penvoy_license_key", licenseKey.trim()); } catch {}
      } else {
        setLicenseError(data.error || "Invalid license key. Please check and try again.");
      }
    } catch {
      setLicenseError("Could not validate. Please check your connection and try again.");
    }
  };

  const handleProviderChange = async (val) => {
    setProvider(val);
    try { localStorage.setItem("penvoy_ai_provider", val); } catch {}
  };

  const handleApiKeyChange = async (val) => {
    setApiKey(val);
    try { localStorage.setItem("penvoy_ai_api_key", val); } catch {}
  };

  const handleSlaChange = (val) => {
    const hrs = parseInt(val) || 48;
    setSlaHours(hrs);
    try { localStorage.setItem("penvoy_sla_hours", String(hrs)); } catch {}
  };

  const analyzeStyle = async () => {
    const filled = styleSamples.filter((s) => s.trim().length > 20);
    if (filled.length < 2) { setError("Please paste at least 2 sample emails (each at least a few sentences)."); return; }
    setAnalyzingStyle(true);
    setError(null);
    try {
      const prompt = `Analyze these ${filled.length} email samples written by the same person. Create a concise writing style profile (max 150 words) that captures their patterns.

Focus on:
- Greeting style (Hi/Hey/Hello, formal vs casual)
- Sign-off style (Thanks/Thank you/Best/Regards)
- Sentence length (short and punchy vs long and detailed)
- Formality level (casual, professional, formal)
- Use of bullet points or numbered lists
- Use of emoji
- Tone (warm, direct, friendly, corporate)
- Vocabulary complexity (simple vs advanced)
- Any distinctive habits or phrases they repeat

Return ONLY the style profile as a paragraph. No preamble, no "Here's the profile:", just the description.

Sample emails:
${filled.map((s, i) => `--- EMAIL ${i + 1} ---\n${s.trim()}`).join("\n\n")}`;

      const result = await callAI(prompt, 300);
      const profile = result.trim();
      setStyleProfile(profile);
      try { localStorage.setItem("penvoy_style_profile", profile); } catch {}
      setShowStyleSetup(false);
      setStyleSamples(["", "", ""]);
    } catch (err) {
      setError("Failed to analyze style: " + (err.message || "Please try again."));
    } finally {
      setAnalyzingStyle(false);
    }
  };

  const clearStyleProfile = () => {
    setStyleProfile("");
    try { localStorage.removeItem("penvoy_style_profile"); } catch {}
  };

  // Unified API call — works with both Anthropic and OpenAI
  const callAI = async (prompt, maxTokens = 1200, signal) => {
    if (!apiKey.trim()) throw new Error("Please enter your API key in the settings above.");

    if (provider === "openai") {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        signal,
        body: JSON.stringify({
          model: "gpt-4o",
          max_tokens: maxTokens,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || "OpenAI API error " + res.status);
      }
      const data = await res.json();
      return data.choices?.[0]?.message?.content || "";
    } else {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        signal,
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: maxTokens,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || "Anthropic API error " + res.status);
      }
      const data = await res.json();
      return data.content?.filter((b) => b.type === "text").map((b) => b.text).join("") || "";
    }
  };

  const handleUserNameChange = async (val) => {
    setUserName(val);
    try { localStorage.setItem("penvoy_user_name", val); } catch {}
  };

  const saveCanned = async (name, text) => {
    const entry = { id: Date.now(), name, text, created: new Date().toLocaleDateString() };
    const updated = [entry, ...cannedResponses];
    setCannedResponses(updated);
    try { localStorage.setItem("penvoy_canned_responses", JSON.stringify(updated)); } catch {}
    setShowSaveModal(false);
    setCannedName("");
    setCopied("saved");
    setTimeout(() => setCopied(null), 2000);
  };

  const deleteCanned = async (id) => {
    const updated = cannedResponses.filter((c) => c.id !== id);
    setCannedResponses(updated);
    try { localStorage.setItem("penvoy_canned_responses", JSON.stringify(updated)); } catch {}
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowCannedDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggleVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in this browser. Try Chrome or Edge.");
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;

    let finalTranscript = mode === "compose" ? composeNotes : replyContext;

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += (finalTranscript ? " " : "") + t;
        } else {
          interim = t;
        }
      }
      const text = finalTranscript + (interim ? " " + interim : "");
      if (mode === "compose") { setComposeNotes(text); } else { setReplyContext(text); }
    };

    recognition.onerror = (event) => {
      if (event.error !== "aborted") {
        setError("Mic error: " + event.error + ". Please try again.");
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
    setIsListening(true);
  };

  const handleCopy = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const regenerateReply = async (adjustment) => {
    if (!adjustment.trim()) return;
    setRegenerating(true);
    try {
      const prompt = `Change: "${adjustment}"\nKeep same greeting/structure. Keep same language as the draft. End with "Thank you!" or similar, no signature. Say "please let us know" not "let you know". Rewrite ONLY the reply:\n${draftReply}`;
      const newReply = await callAI(prompt, 300);
      setDraftReply(newReply.trim());
      setReplyAdjustment("");
    } catch (err) {
      setError("Failed to regenerate reply: " + (err.message || "Please try again."));
    } finally {
      setRegenerating(false);
    }
  };

  const clearAll = () => {
    setEmailText("");
    setReplyContext("");
    setSummary(null);
    setThreadResult(null);
    setDraftReply(null);
    setSla(null);
    setError(null);
    setComposeTo("");
    setComposeType("new");
    setComposeNotes("");
    setComposeResult(null);
  };

  const loadSample = () => {
    setEmailText(mode === "thread" ? SAMPLE_THREAD : SAMPLE_EMAIL);
    setSummary(null);
    setThreadResult(null);
    setDraftReply(null);
    setSla(null);
    setError(null);
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    clearAll();
  };

  const processEmail = async () => {
    if (!emailText.trim()) return;
    setLoading(true);
    setLoadingTime(0);
    loadingInterval.current = setInterval(() => setLoadingTime((t) => t + 1), 1000);
    setError(null);
    setSummary(null);
    setThreadResult(null);
    setDraftReply(null);
    setSla(null);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      // Smart truncation for long threads
      let processedText = emailText;
      if (mode === "thread" && emailText.length > 5000) {
        // Gmail threads use "Name\nDate\nto recipients" pattern, also catch From: and ---
        const separator = /\n(?=(?:[A-Z][a-z]+ [A-Z][a-z]+.*\n(?:(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d).*\n)))|(?:\n-{3,}\n)|(?:\n(?=From:\s))/g;
        const messages = emailText.split(separator).filter((m) => m.trim().length > 20);
        if (messages.length > 6) {
          // Keep first msg (context) + last 6 (most recent and important)
          const first = messages[0].slice(0, 600);
          const recent = messages.slice(-6).map((m) => m.slice(0, 1000));
          processedText = first + "\n\n[..." + (messages.length - 7) + " earlier msgs trimmed...]\n\n" + recent.join("\n");
        }
      }
      if (processedText.length > 10000) {
        processedText = processedText.slice(0, 3000) + "\n[...trimmed...]\n" + processedText.slice(-6000);
      }

      const now = new Date();
      const currentDateTime = now.toLocaleString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
        hour: "numeric", minute: "2-digit", hour12: true, timeZoneName: "short",
      });
      const currentISO = now.toISOString();

      const toneConfig = {
        friendly: "Warm, approachable, professional. Contractions OK.",
        formal: "Polished, professional. No contractions. Structured sentences.",
        casual: "Relaxed, conversational. Short sentences, informal.",
        empathetic: "Caring, understanding. Acknowledge feelings first, then practical points.",
        direct: "Straight to the point. No fluff beyond a brief greeting.",
      };

      const toneInstruction = toneConfig[tone] || toneConfig.friendly;

      const u = userName || "the user";

      const styleRules = `DRAFT STYLE:
- Language: ALWAYS draft replies in English. If the email is in another language (Tagalog, Spanish, French, etc.), still understand and summarize it in English, and draft the reply in English
- Greeting: "Hi [name]," or "Hey [name]," — "Hey" for familiar, "Hi" for others. Match thread formality
- Sign-off: end with "Thank you!" or natural closing that fits. NEVER add a name/signature after
- Concise, no fluff or filler. Get to the point
- Use bullet points when listing multiple items
- Emoji sparingly only if thread tone is casual/friendly
- Say "please let us know" or "please let me know" — NEVER "please let you know" or "let us know" without please
- Tone: ${toneInstruction}${styleProfile ? `\n\nUSER'S PERSONAL WRITING STYLE (match this closely):\n${styleProfile}` : ""}`;

      const prompt = mode === "thread"
        ? `Analyze thread for "${u}". ONLY valid JSON, no markdown.
Current time: ${currentDateTime}.

CRITICAL — IDENTIFY THE USER:
- The user is "${u}". In Gmail-pasted threads, the word "me" in recipient lists (e.g. "to Nikki, me, Clarice") means "${u}". So "me" = "${u}".
- Messages where "${u}" or "me" appears as the SENDER (e.g. "${u} <email>" at the top of a message, or "${u}" followed by a date) are messages ${u} WROTE.
- Messages where "me" only appears in the "to" or "cc" line mean ${u} RECEIVED that message but did NOT write it.

HOW TO DETERMINE SLA STATUS:
1. Scan the ENTIRE thread chronologically
2. Find ${u}'s LAST sent message (if any)
3. After that message, did ANYONE ask ${u} a question, @mention ${u}, or request something from ${u}?
4. If YES → sla_status = "pending"
5. If ${u} never sent a message at all → sla_status = "pending"
6. If ${u}'s last message addressed everything and nobody asked anything new after → sla_status = "replied"

HOW TO DETECT IF ${u} NEEDS TO RESPOND:
- Scan the ENTIRE thread, not just the last message
- Look for @mentions of ${u} (like "@${u}")
- Look for direct questions TO ${u} (like "${u}, can you..." or "please feel free to override @${u}")
- Look for messages sent ONLY to ${u} (private replies within the thread)
- Look for open questions that ${u} hasn't answered yet, even if asked earlier in the thread
- Even if the LAST message doesn't mention ${u}, there may be EARLIER unanswered questions
- "fyi_only" should ONLY be used if ${u} was NEVER mentioned, @tagged, or asked anything in the ENTIRE thread

{"subject_guess":"subject","participants":["name"],"message_count":0,"bullet_summary":["short phrase"],"resolved_items":["done"],"my_open_items":["${u}'s task"],"others_pending":[{"name":"Person","items":["task"]}],"verdict":"close|action_needed|fyi_only","verdict_summary":"short phrase","sla_status":"pending|replied|fyi","reply_points":[{"to":"person","context":"why","type":"direct|group","draft":"reply text"}]}
RULES:
- ALL string arrays: short phrases, NOT sentences
- verdict_summary: short phrase not a sentence
- verdict: "fyi_only" ONLY if ${u} was never mentioned/asked anything in the ENTIRE thread. "action_needed" if anyone @mentioned ${u}, asked ${u} a question, or requested ${u}'s input at ANY point and it's still unaddressed. "close" if everything directed at ${u} has been resolved
- reply_points: create for each unanswered question/request directed at ${u} throughout the ENTIRE thread. Consolidate if same topic. type: "direct"=sent only to ${u}, "group"=group email
${styleRules}${replyContext ? `\nUser note: ${replyContext}` : ""}

Thread:
${processedText}`
        : `Analyze this email for "${u}". ONLY valid JSON, no markdown.
Current time: ${currentDateTime}.
{"from":"sender","subject_guess":"subject","bullet_summary":["short phrase"],"action_items":["${u}'s action"],"key_dates":["deadline"],"sentiment":"positive|neutral|negative|mixed","urgency":"low|medium|high","draft_reply":"reply text"}
RULES:
- bullet_summary/action_items: short phrases, NOT sentences
${styleRules}${replyContext ? `\nUser note: ${replyContext}` : ""}

Email:
${processedText}`;

      const rawText = await callAI(prompt, 2000, controller.signal);
      clearTimeout(timeout);
      const clean = rawText.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);

      if (mode === "thread") {
        const { reply_points, sla_status, ...rest } = parsed;
        setThreadResult({ ...rest, reply_points: reply_points || [] });
        // Set first reply point as the editable draft for convenience
        if (reply_points?.length > 0) {
          setDraftReply(reply_points[0].draft || "");
        }

        // Client-side SLA: parse date from the actual email text
        // Cross-check: if AI says "replied" but found reply points, it's actually pending
        const effectiveSlaStatus = (sla_status === "replied" && reply_points?.length > 0) ? "pending" : sla_status;

        if (effectiveSlaStatus === "replied") {
          setSla({
            status: "cleared",
            label: "SLA met — you've replied",
            color: "#22c55e",
            bg: "rgba(34,197,94,0.08)",
            border: "rgba(34,197,94,0.2)",
            icon: "✅",
            tip: "You've already responded. No action needed for SLA.",
          });
        } else if (effectiveSlaStatus === "fyi") {
          setSla({
            status: "fyi",
            label: "FYI only — no reply needed",
            color: "#818cf8",
            bg: "rgba(129,140,248,0.08)",
            border: "rgba(129,140,248,0.2)",
            icon: "📋",
            tip: "You're CC'd for awareness. No response expected.",
          });
        } else {
          const parsedDate = extractLastDateFromThread(emailText);
          if (parsedDate) setSla(getSlaStatus(parsedDate, slaHours));
        }
      } else {
        const { draft_reply, ...summaryFields } = parsed;
        setSummary(summaryFields);
        setDraftReply(draft_reply || "");

        // Client-side SLA: parse date from the actual email text
        const parsedDate = extractDateFromEmail(emailText);
        if (parsedDate) setSla(getSlaStatus(parsedDate, slaHours));
      }
    } catch (err) {
      console.error("Email summarizer error:", err);
      if (err.name === "AbortError") {
        setError("Request timed out after 90s. The thread might be too long — try pasting just the last few messages.");
      } else if (err instanceof SyntaxError) {
        setError("Got an unexpected response format. Please try again.");
      } else {
        setError(err.message || "Something went wrong. Please try again.");
      }
    } finally {
      clearInterval(loadingInterval.current);
      setLoading(false);
    }
  };

  // Compose mode
  const composeEmail = async () => {
    if (!composeNotes.trim()) return;
    setLoading(true);
    setLoadingTime(0);
    loadingInterval.current = setInterval(() => setLoadingTime((t) => t + 1), 1000);
    setError(null);
    setComposeResult(null);

    const toneConfig = {
      friendly: "Warm, approachable, professional. Contractions OK.",
      formal: "Polished, professional. No contractions.",
      casual: "Relaxed, conversational.",
      empathetic: "Caring, understanding. Acknowledge feelings first.",
      direct: "Straight to the point. No fluff.",
    };
    const typeLabels = {
      new: "Draft a new email",
      followup: "Draft a follow-up/reminder email",
      forward: "Draft a forwarding email with context explaining why",
      decline: "Draft a polite decline/rejection email",
      coverletter: "Write a professional cover letter for a job application. The user will paste the job listing and their background/notes. Match the candidate's experience to the job requirements. Structure: opening (why this role excites them), body (2-3 paragraphs matching their skills to requirements), closing (enthusiasm + call to action). Do NOT use generic filler. Every sentence should reference specific details from the job listing or the candidate's notes. Return as {\"subject\":\"Application for [Role] - [Name]\",\"body\":\"the cover letter\"}",
    };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      const composePrompt = `${typeLabels[composeType] || "Draft an email"}.
${composeTo ? `To: ${composeTo}` : ""}
From: ${userName || "me"}
Tone: ${toneConfig[tone] || toneConfig.friendly}
Return ONLY valid JSON: {"subject":"subject line","body":"email body"}

YOUR JOB:
Read the user's notes below. Understand what they're trying to say — the intent, the ask, the context. Then write a clean, polished email from scratch that conveys the SAME message but better. This is a full redraft, not a spell-check.

EXAMPLE OF WHAT TO DO:
User notes: "tell holly and kyle, can we add the email part of the money losing asins in AIMS? i will still vet/analyze them manually but appscript is flagging me as spammer. the appscript was filtering yesterdays data by asin manager and sending each manager their list of asins to that manager. should i create a separate email dashboard or could AIMS do it"
BAD draft: "I was wondering if we can add the email functionality for Money Losing ASINs in AIMS? I'll still vet them manually but AppScript is flagging me... Filter all of yesterday's data by ASIN Manager, Send the list of ASINs per Manager to that Manager"
Problems: "email functionality" not "email sending", "vet" still there (should be "review"), "ASIN Manager" and "Manager" repeated 3 times, added bullet points unnecessarily, AppScript isn't doing the flagging — Gmail is
GOOD draft: "I was wondering if we could add the email sending part of the Money Losing ASINs process into AIMS? I'll still review them manually, but I've been running into issues with Gmail flagging me as a spammer when sending through AppScript. Here's what it was doing before: [bullets] Filter all of yesterday's data by ASIN Manager [bullet] Send each one their respective list of ASINs. Would AIMS be able to replicate that, or should I create a separate email dashboard instead? Let me know which approach would be easier on your end."
Why it's good: "email sending" preserved, "vet/analyze" consolidated to "review", Gmail identified as the flagger not AppScript, ASIN Manager said once then "each one" as pronoun, bullets only for the 2-step process list, natural flow

RULES:
1. UNDERSTAND FIRST: Read the notes carefully. Identify: who is this to, what are they asking/saying, what context did they provide, what response do they want
2. PRESERVE MEANING: Never change WHO the user is referring to (if they say "team leads" don't change it to "managers"). Never change WHAT they're asking for (if they say "email sending" don't change it to "email functionality"). The specific words they use for roles, tools, and actions are intentional. Read carefully — if the user says "X is causing Y", make sure your draft says the same thing, not "Y is caused by Z"
3. KEEP ALL KEY DETAILS: Every fact, name, process description, and question the user included must appear in the draft. Do not drop details
4. DO NOT ADD: Never add information, questions, or context the user didn't mention
5. NO REDUNDANCY: Each noun, name, tool, or concept should appear ONCE. Use pronouns (it, this, them, they, each one) for subsequent references. If two words mean the same thing (vet/analyze, check/review), pick ONE. After drafting, count every noun — if any appears more than once, replace the repeat with a pronoun
6. SMART BULLET POINTS: Only use bullets when the user is describing a multi-step process or listing 2+ distinct items. Never convert a natural explanation into bullets
7. NATURAL FLOW: Write like a human, not a template. The email should read as a natural conversation
8. SENSE CHECK: Before outputting, re-read as the recipient. Does every sentence make sense? Is anything repeated? Does the cause-and-effect match what the user said? Fix anything that reads wrong

FORMATTING:
- Greeting: "Hi [name]," or "Hey [name]," — match the tone
- Sign-off: end with "Thank you!" or natural closing. NEVER add a name or signature
- Language: Default English. Only match another language if the notes are ENTIRELY in that language
- Say "please let me know" or "please let us know" — NEVER "please let you know"
- Subject line: clear, specific, professional
${styleProfile ? `\nUSER'S PERSONAL WRITING STYLE (match this closely):\n${styleProfile}` : ""}
Notes: ${composeNotes}`;
      const raw = await callAI(composePrompt, 800, controller.signal);
      clearTimeout(timeout);
      const clean = raw.replace(/```json|```/g, "").trim();
      setComposeResult({ ...JSON.parse(clean), _tone: tone });
    } catch (err) {
      setError(err.name === "AbortError" ? "Timed out — try shorter notes." : (err.message || "Something went wrong."));
    } finally {
      clearInterval(loadingInterval.current);
      setLoading(false);
    }
  };

  useEffect(() => {
    if ((summary || threadResult || composeResult) && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [summary, threadResult, composeResult]);

  const urgencyColor = { low: "#22c55e", medium: "#f59e0b", high: "#ef4444" };
  const sentimentEmoji = { positive: "😊", neutral: "😐", negative: "😟", mixed: "🤔" };

  const pillStyle = (active) => ({
    flex: 1, padding: "10px 0", textAlign: "center",
    fontSize: 13, fontWeight: 600, borderRadius: 10, cursor: "pointer",
    transition: "all 0.25s",
    background: active ? "rgba(99,102,241,0.2)" : "transparent",
    color: active ? "#c7d2fe" : "#6b6f8a",
    border: active ? "1px solid rgba(99,102,241,0.35)" : "1px solid transparent",
  });

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #0f1117 0%, #1a1d2e 40%, #12151f 100%)",
      color: "#e2e4ea",
      fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Fraunces:wght@600;700;800&display=swap" rel="stylesheet" />

      {/* ===== LANDING PAGE ===== */}
      {showLanding && !isLicensed ? (
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "60px 24px 80px", textAlign: "center" }}>
          {/* Hero */}
          <div style={{
            width: 64, height: 64, borderRadius: 20, margin: "0 auto 24px",
            background: "linear-gradient(135deg, #6366f1 0%, #a78bfa 50%, #ec4899 100%)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32,
          }}>✉</div>
          <h1 style={{
            fontFamily: "'Fraunces', Georgia, serif", fontSize: 42, fontWeight: 800,
            margin: "0 0 16px",
            background: "linear-gradient(135deg, #c7d2fe, #e0e7ff, #f0abfc)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            lineHeight: 1.2,
          }}>Penvoy</h1>
          <p style={{ fontSize: 20, color: "#a5b4fc", fontWeight: 600, margin: "0 0 8px" }}>Your AI Writing Envoy</p>
          <p style={{ fontSize: 18, color: "#8b8fa3", maxWidth: 480, margin: "0 auto 40px", lineHeight: 1.6 }}>
            Summarize emails. Analyze threads. Draft replies. Compose from scratch. All in one tool — powered by your own AI key.
          </p>

          {/* Features */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 40, textAlign: "left" }}>
            {[
              { icon: "⚡", title: "Instant Summaries", desc: "Paste any email, get bullet-point summary + action items" },
              { icon: "💬", title: "Thread Analysis", desc: "Find who needs your reply and what's still open" },
              { icon: "✍️", title: "Learns Your Voice", desc: "Paste sample emails — it matches your writing style in every draft" },
              { icon: "🌐", title: "Any Language In", desc: "Paste emails in any language — summaries and replies always in English" },
              { icon: "📊", title: "Reply Quality Scorer", desc: "Score your draft 1-10 with actionable feedback before sending" },
              { icon: "📄", title: "Cover Letters", desc: "Paste a job listing + your notes — get a tailored cover letter" },
              { icon: "📋", title: "Email Templates", desc: "Quick-load templates for common scenarios — meetings, updates, apologies" },
              { icon: "⏱️", title: "SLA Tracker", desc: "Customizable response deadlines — never miss a reply window" },
              { icon: "🎨", title: "5 Tone Presets", desc: "Friendly, Formal, Casual, Empathetic, or Direct" },
              { icon: "🔑", title: "BYOK — Your Key", desc: "Works with Claude or GPT-4o. Your key, your data, your browser" },
            ].map((f, i) => (
              <div key={i} style={{
                padding: "16px 18px", background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14,
              }}>
                <span style={{ fontSize: 20 }}>{f.icon}</span>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#e0e7ff", marginTop: 8 }}>{f.title}</div>
                <div style={{ fontSize: 12, color: "#6b6f8a", marginTop: 4, lineHeight: 1.4 }}>{f.desc}</div>
              </div>
            ))}
          </div>

          {/* Price */}
          <div style={{
            padding: "28px 32px", background: "rgba(99,102,241,0.06)",
            border: "1px solid rgba(99,102,241,0.15)", borderRadius: 20, marginBottom: 32,
          }}>
            <div style={{ fontSize: 14, color: "#818cf8", fontWeight: 600, marginBottom: 8 }}>ONE-TIME PAYMENT</div>
            <div style={{
              fontFamily: "'Fraunces', Georgia, serif", fontSize: 48, fontWeight: 800,
              color: "#e0e7ff", marginBottom: 8,
            }}>$49</div>
            <p style={{ fontSize: 14, color: "#8b8fa3", margin: "0 0 20px" }}>
              Lifetime access. No subscription. No hidden fees. Bring your own API key.
            </p>
            <a
              href="https://penvoy.lemonsqueezy.com/checkout/buy/2b87a55a-22c2-4a0d-9fb8-aa0ff2a0ddb0"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block", padding: "14px 40px",
                background: "linear-gradient(135deg, #6366f1, #7c3aed)",
                borderRadius: 12, color: "#fff", fontSize: 16, fontWeight: 700,
                textDecoration: "none", fontFamily: "'DM Sans', system-ui, sans-serif",
              }}
            >Get Lifetime Access</a>
          </div>

          {/* License Key Input */}
          <div style={{
            padding: "24px", background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16,
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#a5b4fc", marginBottom: 12 }}>Already purchased? Enter your license key:</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text" value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") validateLicense(); }}
                placeholder="XXXX-XXXX-XXXX-XXXX"
                style={{
                  flex: 1, background: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10,
                  padding: "12px 16px", color: "#d1d5e4", fontSize: 14,
                  outline: "none", fontFamily: "monospace", letterSpacing: "0.05em",
                }}
              />
              <button onClick={validateLicense} style={{
                padding: "12px 24px", background: "linear-gradient(135deg, #6366f1, #7c3aed)",
                border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 600,
                cursor: "pointer", fontFamily: "'DM Sans', system-ui, sans-serif", flexShrink: 0,
              }}>Activate</button>
            </div>
            {licenseError && (
              <p style={{ fontSize: 12, color: "#f87171", margin: "8px 0 0" }}>{licenseError}</p>
            )}
          </div>

          {/* Footer */}
          <p style={{ fontSize: 12, color: "#4a4e64", marginTop: 40 }}>
            Your API key and data stay in your browser. We never see or store them.
          </p>
          <p style={{ fontSize: 12, color: "#4a4e64", marginTop: 12 }}>
            Questions, issues, or feedback? Reach us at{" "}
            <a href="mailto:hello@7starelite.com" style={{ color: "#818cf8", textDecoration: "none" }}>hello@7starelite.com</a>
          </p>
          <p style={{ fontSize: 11, color: "#3a3e54", marginTop: 20 }}>
            © {new Date().getFullYear()} Penvoy by 7Star Elite. All rights reserved.
          </p>
        </div>
      ) : (<>

      {/* ===== MAIN APP (licensed) ===== */}
      {/* Header */}
      <div style={{ padding: "40px 24px 32px", textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: "linear-gradient(135deg, #6366f1 0%, #a78bfa 100%)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
          }}>✉</div>
          <h1 style={{
            fontFamily: "'Fraunces', Georgia, serif", fontSize: 28, fontWeight: 700, margin: 0,
            background: "linear-gradient(135deg, #c7d2fe, #e0e7ff, #a5b4fc)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>Penvoy</h1>
        </div>
        <p style={{ color: "#8b8fa3", fontSize: 15, margin: 0, maxWidth: 480, marginInline: "auto" }}>
          Your AI writing envoy — summarize, analyze, draft, and compose emails in seconds.
        </p>
      </div>

      {/* Main */}
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "32px 20px 60px" }}>

        {/* API Settings */}
        <div style={{
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 14, padding: "16px 20px", marginBottom: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 14 }}>🔑</span>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#a5b4fc" }}>AI Provider & API Key</label>
            {apiKey.trim() && <span style={{ fontSize: 10, color: "#22c55e", fontWeight: 600 }}>✓ Connected</span>}
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <button onClick={() => handleProviderChange("anthropic")} style={{
              flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 12, fontWeight: 600,
              cursor: "pointer", fontFamily: "'DM Sans', system-ui, sans-serif",
              background: provider === "anthropic" ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.03)",
              border: provider === "anthropic" ? "1px solid rgba(99,102,241,0.4)" : "1px solid rgba(255,255,255,0.08)",
              color: provider === "anthropic" ? "#c7d2fe" : "#6b6f8a",
            }}>Claude (Anthropic)</button>
            <button onClick={() => handleProviderChange("openai")} style={{
              flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 12, fontWeight: 600,
              cursor: "pointer", fontFamily: "'DM Sans', system-ui, sans-serif",
              background: provider === "openai" ? "rgba(16,163,127,0.2)" : "rgba(255,255,255,0.03)",
              border: provider === "openai" ? "1px solid rgba(16,163,127,0.4)" : "1px solid rgba(255,255,255,0.08)",
              color: provider === "openai" ? "#6ee7b7" : "#6b6f8a",
            }}>GPT-4o (OpenAI)</button>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => handleApiKeyChange(e.target.value)}
              placeholder={provider === "openai" ? "sk-..." : "sk-ant-..."}
              style={{
                flex: 1, background: "rgba(0,0,0,0.25)",
                border: `1px solid ${apiKey.trim() ? "rgba(34,197,94,0.2)" : "rgba(245,158,11,0.25)"}`,
                borderRadius: 8, padding: "9px 12px", color: "#d1d5e4", fontSize: 12,
                outline: "none", fontFamily: "monospace",
              }}
            />
            <button onClick={() => setShowKey(!showKey)} style={{
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8, padding: "9px 12px", cursor: "pointer", color: "#6b6f8a", fontSize: 12,
              fontFamily: "'DM Sans', system-ui, sans-serif",
            }}>{showKey ? "Hide" : "Show"}</button>
          </div>
          <p style={{ fontSize: 11, color: "#4a4e64", margin: "8px 0 0" }}>
            Your key is stored locally in your browser. We never see or store it on our servers.
          </p>
          {/* SLA Setting */}
          <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#8b8fa3" }}>⏱ SLA Window:</span>
            <div style={{ display: "flex", gap: 4 }}>
              {[4, 8, 12, 24, 48, 72].map((h) => (
                <button key={h} onClick={() => handleSlaChange(h)} style={{
                  padding: "5px 10px", borderRadius: 7, fontSize: 11, fontWeight: 600,
                  cursor: "pointer", fontFamily: "'DM Sans', system-ui, sans-serif",
                  background: slaHours === h ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.03)",
                  border: slaHours === h ? "1px solid rgba(99,102,241,0.4)" : "1px solid rgba(255,255,255,0.08)",
                  color: slaHours === h ? "#c7d2fe" : "#6b6f8a",
                }}>{h}h</button>
              ))}
            </div>
          </div>
          {/* Writing Style */}
          <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#8b8fa3" }}>✍️ Writing Style:</span>
            {styleProfile ? (
              <>
                <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 600 }}>✓ Configured</span>
                <button onClick={() => setShowStylePreview(!showStylePreview)} style={{
                  fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 7,
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                  color: "#8b8fa3", cursor: "pointer", fontFamily: "'DM Sans', system-ui, sans-serif",
                }}>{showStylePreview ? "Hide" : "View"}</button>
                <button onClick={() => { setEditStyleText(styleProfile); setEditingStyle(true); setShowStylePreview(true); }} style={{
                  fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 7,
                  background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)",
                  color: "#a5b4fc", cursor: "pointer", fontFamily: "'DM Sans', system-ui, sans-serif",
                }}>Edit</button>
                <button onClick={() => setShowStyleSetup(true)} style={{
                  fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 7,
                  background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)",
                  color: "#fbbf24", cursor: "pointer", fontFamily: "'DM Sans', system-ui, sans-serif",
                }}>Redo</button>
                <button onClick={clearStyleProfile} style={{
                  fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 7,
                  background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
                  color: "#f87171", cursor: "pointer", fontFamily: "'DM Sans', system-ui, sans-serif",
                }}>Clear</button>
              </>
            ) : (
              <button onClick={() => setShowStyleSetup(true)} style={{
                fontSize: 11, fontWeight: 600, padding: "5px 12px", borderRadius: 7,
                background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)",
                color: "#fbbf24", cursor: "pointer", fontFamily: "'DM Sans', system-ui, sans-serif",
              }}>Set up — paste your sample emails</button>
            )}
          </div>
          {showStylePreview && styleProfile && !editingStyle && (
            <div style={{ marginTop: 8, padding: "10px 14px", background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.1)", borderRadius: 10 }}>
              <p style={{ fontSize: 11, color: "#6b8f6b", lineHeight: 1.5, margin: 0 }}>{styleProfile}</p>
            </div>
          )}
          {editingStyle && (
            <div style={{ marginTop: 8 }}>
              <textarea
                value={editStyleText}
                onChange={(e) => setEditStyleText(e.target.value)}
                style={{
                  width: "100%", minHeight: 80, background: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(99,102,241,0.2)", borderRadius: 10,
                  padding: 12, color: "#d1d5e4", fontSize: 11, lineHeight: 1.5,
                  resize: "vertical", outline: "none",
                  fontFamily: "'DM Sans', system-ui, sans-serif", boxSizing: "border-box",
                }}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button onClick={() => {
                  setStyleProfile(editStyleText.trim());
                  try { localStorage.setItem("penvoy_style_profile", editStyleText.trim()); } catch {}
                  setEditingStyle(false);
                }} style={{
                  fontSize: 11, fontWeight: 600, padding: "6px 14px", borderRadius: 7,
                  background: "linear-gradient(135deg, #6366f1, #7c3aed)", border: "none",
                  color: "#fff", cursor: "pointer", fontFamily: "'DM Sans', system-ui, sans-serif",
                }}>Save</button>
                <button onClick={() => { setEditingStyle(false); }} style={{
                  fontSize: 11, fontWeight: 600, padding: "6px 14px", borderRadius: 7,
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                  color: "#6b6f8a", cursor: "pointer", fontFamily: "'DM Sans', system-ui, sans-serif",
                }}>Cancel</button>
              </div>
            </div>
          )}
        </div>

        {/* Writing Style Setup Modal */}
        {showStyleSetup && (
          <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex",
            alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20,
          }} onClick={(e) => { if (e.target === e.currentTarget) setShowStyleSetup(false); }}>
            <div style={{
              background: "#1a1d2e", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 20, padding: 28, maxWidth: 600, width: "100%", maxHeight: "90vh", overflowY: "auto",
            }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#e0e7ff", margin: "0 0 8px" }}>
                ✍️ Set Up Your Writing Style
              </h3>
              <p style={{ fontSize: 13, color: "#8b8fa3", margin: "0 0 20px", lineHeight: 1.5 }}>
                Paste 2-3 emails you've written. The AI will analyze your writing patterns and match your style in every draft.
              </p>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#6b6f8a", display: "block", marginBottom: 6 }}>
                    SAMPLE EMAIL {i + 1} {i < 2 ? "(required)" : "(optional)"}
                  </label>
                  <textarea
                    value={styleSamples[i]}
                    onChange={(e) => {
                      const updated = [...styleSamples];
                      updated[i] = e.target.value;
                      setStyleSamples(updated);
                    }}
                    placeholder={i === 0 ? "Paste a work email you've sent..." : i === 1 ? "Paste another email in a different context..." : "Paste a third email (optional but helps accuracy)..."}
                    style={{
                      width: "100%", minHeight: 100, background: "rgba(0,0,0,0.3)",
                      border: `1px solid ${styleSamples[i].trim().length > 20 ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.08)"}`,
                      borderRadius: 10, padding: 12, color: "#d1d5e4", fontSize: 12,
                      lineHeight: 1.6, resize: "vertical", outline: "none",
                      fontFamily: "'DM Sans', system-ui, sans-serif", boxSizing: "border-box",
                    }}
                  />
                </div>
              ))}
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button
                  onClick={analyzeStyle}
                  disabled={analyzingStyle || styleSamples.filter((s) => s.trim().length > 20).length < 2}
                  style={{
                    flex: 1, padding: "12px 20px",
                    background: analyzingStyle || styleSamples.filter((s) => s.trim().length > 20).length < 2
                      ? "rgba(99,102,241,0.2)" : "linear-gradient(135deg, #6366f1, #7c3aed)",
                    border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 600,
                    cursor: analyzingStyle ? "wait" : "pointer",
                    fontFamily: "'DM Sans', system-ui, sans-serif",
                  }}
                >{analyzingStyle ? "Analyzing your style..." : "Analyze My Style"}</button>
                <button onClick={() => setShowStyleSetup(false)} style={{
                  padding: "12px 20px", background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
                  color: "#6b6f8a", fontSize: 14, fontWeight: 600, cursor: "pointer",
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                }}>Cancel</button>
              </div>
            </div>
          </div>
        )}
        <div style={{
          display: "flex", gap: 6, padding: 4,
          background: "rgba(255,255,255,0.04)", borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.06)", marginBottom: 20,
        }}>
          <div style={pillStyle(mode === "single")} onClick={() => switchMode("single")}>
            ✉&nbsp; Single Email
          </div>
          <div style={pillStyle(mode === "thread")} onClick={() => switchMode("thread")}>
            💬&nbsp; Thread
          </div>
          <div style={pillStyle(mode === "compose")} onClick={() => switchMode("compose")}>
            ✍️&nbsp; Compose
          </div>
        </div>

        {/* Input Card */}
        <div style={{
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16, padding: 24, marginBottom: 20,
        }}>
          {/* Your Name - only for analyze modes */}
          {mode !== "compose" && <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#8b8fa3", display: "block", marginBottom: 8 }}>
              YOUR NAME — so the app knows which messages are yours
            </label>
            <input
              type="text" value={userName}
              onChange={(e) => handleUserNameChange(e.target.value)}
              placeholder="e.g. Jimin, Jimin Park"
              style={{
                width: "100%", background: "rgba(0,0,0,0.2)",
                border: `1px solid ${userName.trim() ? "rgba(34,197,94,0.2)" : "rgba(245,158,11,0.25)"}`,
                borderRadius: 10,
                padding: "10px 14px", color: "#d1d5e4", fontSize: 13, outline: "none",
                fontFamily: "'DM Sans', system-ui, sans-serif", boxSizing: "border-box",
              }}
            />
          </div>}

          {mode === "compose" ? (<>
            {/* Compose inputs */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: "#a5b4fc", letterSpacing: "0.02em", marginBottom: 10, display: "block" }}>
                COMPOSE NEW EMAIL
              </label>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <input type="text" value={composeTo} onChange={(e) => setComposeTo(e.target.value)}
                  placeholder={composeType === "coverletter" ? "To: e.g. Hiring Manager, HR Team, recruiter@company.com" : "To: e.g. Jungkook, Namjoon Kim, Supply Chain Team"}
                  style={{
                    flex: 1, background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 10, padding: "10px 14px", color: "#d1d5e4", fontSize: 13,
                    outline: "none", fontFamily: "'DM Sans', system-ui, sans-serif",
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
                {[
                  { id: "new", label: "📝 New Email" },
                  { id: "followup", label: "🔔 Follow-up" },
                  { id: "forward", label: "↗️ Forward" },
                  { id: "decline", label: "🚫 Decline" },
                  { id: "coverletter", label: "📄 Cover Letter" },
                ].map((t) => (
                  <button key={t.id} onClick={() => setComposeType(t.id)} style={{
                    padding: "7px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "'DM Sans', system-ui, sans-serif",
                    background: composeType === t.id ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.03)",
                    border: composeType === t.id ? "1px solid rgba(99,102,241,0.4)" : "1px solid rgba(255,255,255,0.08)",
                    color: composeType === t.id ? "#c7d2fe" : "#6b6f8a",
                  }}>{t.label}</button>
                ))}
              </div>
              {/* Quick Templates */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#6b6f8a", display: "block", marginBottom: 6 }}>
                  📋 QUICK TEMPLATES (click to pre-fill)
                </label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {[
                    { label: "Meeting request", notes: "I'd like to schedule a meeting to discuss [topic]. Are you available [time options]?" },
                    { label: "Status update", notes: "Giving an update on [project]. Here's where we are: [progress]. Next steps: [what's next]. Let me know if you have questions." },
                    { label: "Introduction", notes: "Introducing [person A] to [person B]. [Person A] works on [what they do] and [Person B] handles [what they do]. I think you two should connect because [reason]." },
                    { label: "Request approval", notes: "Requesting approval for [what]. Here's the context: [details]. The cost/impact is [amount]. I recommend we proceed because [reason]." },
                    { label: "Thank you", notes: "Thank you for [what they did]. It really helped with [impact]. I appreciate [specific thing]." },
                    { label: "Apology", notes: "Apologies for [what happened]. Here's what went wrong: [explanation]. Here's what I'm doing to fix it: [action]. It won't happen again because [prevention]." },
                    { label: "Bad news", notes: "Unfortunately, [the bad news]. Here's why: [reason]. What we can do instead: [alternative]. Let me know how you'd like to proceed." },
                    { label: "Escalation", notes: "Escalating [issue] because [reason it needs attention]. Here's the background: [context]. The impact is [what's at risk]. I need [what you're asking for] by [when]." },
                  ].map((t) => (
                    <button key={t.label} onClick={() => { setComposeNotes(t.notes); setComposeType("new"); }} style={{
                      padding: "5px 10px", borderRadius: 7, fontSize: 10, fontWeight: 600,
                      cursor: "pointer", fontFamily: "'DM Sans', system-ui, sans-serif",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "#6b6f8a",
                    }}>{t.label}</button>
                  ))}
                </div>
              </div>
              <textarea
                value={composeNotes}
                onChange={(e) => setComposeNotes(e.target.value)}
                placeholder={composeType === "coverletter"
                  ? "Paste the job listing here, then add your background...\n\ne.g. \"Job: Senior Operations Manager at Shopify. Requirements: 5+ years operations, team management, process automation.\n\nMy background: 6 years in e-commerce operations, managed team of 12 VAs, built automation tools, experienced with Amazon FBA and supply chain.\""
                  : "Just dump your thoughts here in plain language...\n\ne.g. \"tell Hoseok we can't accept deliveries right now, be vague about when we'll start again. CC Yoongi Min since he handles warehouse logistics\""}
                style={{
                  width: "100%", minHeight: 150, background: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12,
                  padding: 16, color: "#d1d5e4", fontSize: 14, lineHeight: 1.7,
                  resize: "vertical", outline: "none", fontFamily: "'DM Sans', system-ui, sans-serif",
                  boxSizing: "border-box",
                }}
              />
              <button
                onClick={toggleVoice}
                title={isListening ? "Stop listening" : "Dictate your notes"}
                style={{
                  marginTop: 8, padding: "8px 14px", borderRadius: 10, border: "none",
                  background: isListening ? "rgba(239,68,68,0.2)" : "rgba(165,180,252,0.1)",
                  color: isListening ? "#f87171" : "#a5b4fc",
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                  display: "inline-flex", alignItems: "center", gap: 6,
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                  animation: isListening ? "pulse 1.5s ease-in-out infinite" : "none",
                }}
              >
                {isListening ? "⏹ Stop" : "🎙 Dictate"}
              </button>
            </div>

            {/* Tone selector */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#8b8fa3", display: "block", marginBottom: 8 }}>TONE</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[
                  { id: "friendly", label: "😊 Friendly" },
                  { id: "formal", label: "👔 Formal" },
                  { id: "casual", label: "✌️ Casual" },
                  { id: "empathetic", label: "💛 Empathetic" },
                  { id: "direct", label: "🎯 Direct" },
                ].map((t) => (
                  <button key={t.id} onClick={() => { setTone(t.id); }} style={{
                    padding: "7px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600,
                    cursor: "pointer", fontFamily: "'DM Sans', system-ui, sans-serif",
                    background: tone === t.id ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.03)",
                    border: tone === t.id ? "1px solid rgba(99,102,241,0.4)" : "1px solid rgba(255,255,255,0.08)",
                    color: tone === t.id ? "#c7d2fe" : "#6b6f8a",
                  }}>{t.label}</button>
                ))}
              </div>
            </div>

            <button
              onClick={composeEmail}
              disabled={loading || !composeNotes.trim()}
              style={{
                width: "100%", padding: "14px 24px",
                background: loading || !composeNotes.trim()
                  ? "rgba(99,102,241,0.2)" : "linear-gradient(135deg, #6366f1, #7c3aed)",
                border: "none", borderRadius: 12,
                color: loading || !composeNotes.trim() ? "#6b6f8a" : "#fff",
                fontSize: 15, fontWeight: 600,
                cursor: loading || !composeNotes.trim() ? "not-allowed" : "pointer",
                fontFamily: "'DM Sans', system-ui, sans-serif",
              }}
            >
              {loading ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    width: 16, height: 16,
                    border: "2px solid rgba(255,255,255,0.2)", borderTopColor: "#fff",
                    borderRadius: "50%", display: "inline-block",
                    animation: "spin 0.8s linear infinite",
                  }} />
                  Drafting... {loadingTime}s
                </span>
              ) : composeResult ? "🔄 Re-draft" : composeType === "coverletter" ? "📄 Generate Cover Letter" : "✍️ Draft Email"}
            </button>
          </>) : (<>
          {/* Existing analyze inputs */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <label style={{ fontSize: 14, fontWeight: 600, color: "#a5b4fc", letterSpacing: "0.02em" }}>
              {mode === "thread" ? "PASTE THREAD" : "PASTE EMAIL"}
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {emailText.trim() && (
                <button onClick={clearAll} style={{
                  background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.22)",
                  color: "#f87171", fontSize: 12, fontWeight: 600, padding: "5px 14px",
                  borderRadius: 8, cursor: "pointer", transition: "all 0.2s",
                }}>✕ Clear</button>
              )}
              <button onClick={loadSample} style={{
                background: "rgba(165,180,252,0.1)", border: "1px solid rgba(165,180,252,0.2)",
                color: "#a5b4fc", fontSize: 12, fontWeight: 600, padding: "5px 12px",
                borderRadius: 8, cursor: "pointer",
              }}>Try sample</button>
            </div>
          </div>
          <textarea
            value={emailText}
            onChange={(e) => setEmailText(e.target.value)}
            placeholder={mode === "thread"
              ? "Paste the full email thread here (all replies, include headers if available)..."
              : "Paste the email here (include From:, Date: headers for best SLA detection)..."}
            style={{
              width: "100%", minHeight: mode === "thread" ? 260 : 200,
              background: "rgba(0,0,0,0.3)",
              border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12,
              padding: 16, color: "#d1d5e4", fontSize: 14, lineHeight: 1.7,
              resize: "vertical", outline: "none", fontFamily: "'DM Sans', system-ui, sans-serif",
              boxSizing: "border-box",
            }}
          />

          <div style={{ marginTop: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#8b8fa3", display: "block", marginBottom: 8 }}>
              {mode === "thread"
                ? "REPLY NOTES (optional) — e.g. \"I already sent Jin's numbers\" or \"ignore the mockup issue\""
                : "REPLY NOTES (optional) — e.g. \"I can't make Tuesday\" or \"delegate budget to Taehyung Kim\""}
            </label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="text" value={replyContext}
                onChange={(e) => setReplyContext(e.target.value)}
                placeholder={isListening ? "Listening..." : "Type or tap the mic to dictate..."}
                style={{
                  flex: 1, background: isListening ? "rgba(239,68,68,0.06)" : "rgba(0,0,0,0.2)",
                  border: `1px solid ${isListening ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.06)"}`,
                  borderRadius: 10,
                  padding: "10px 14px", color: "#d1d5e4", fontSize: 13, outline: "none",
                  fontFamily: "'DM Sans', system-ui, sans-serif", boxSizing: "border-box",
                  transition: "all 0.2s",
                }}
              />
              <button
                onClick={toggleVoice}
                title={isListening ? "Stop listening" : "Dictate reply notes"}
                style={{
                  width: 40, height: 40, borderRadius: 10, border: "none",
                  background: isListening
                    ? "rgba(239,68,68,0.2)"
                    : "rgba(165,180,252,0.1)",
                  color: isListening ? "#f87171" : "#a5b4fc",
                  fontSize: 18, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.2s", flexShrink: 0,
                  animation: isListening ? "pulse 1.5s ease-in-out infinite" : "none",
                }}
              >
                {isListening ? "⏹" : "🎙"}
              </button>
            </div>
          </div>

          {/* Tone selector */}
          <div style={{ marginTop: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#8b8fa3", display: "block", marginBottom: 8 }}>
              REPLY TONE
            </label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[
                { id: "friendly", label: "😊 Friendly", desc: "Warm & professional" },
                { id: "formal", label: "👔 Formal", desc: "Polished & businesslike" },
                { id: "casual", label: "✌️ Casual", desc: "Relaxed & conversational" },
                { id: "empathetic", label: "💛 Empathetic", desc: "Caring & understanding" },
                { id: "direct", label: "🎯 Direct", desc: "Straight to the point" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTone(t.id)}
                  title={t.desc}
                  style={{
                    padding: "7px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600,
                    cursor: "pointer", transition: "all 0.2s",
                    fontFamily: "'DM Sans', system-ui, sans-serif",
                    background: tone === t.id ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.03)",
                    border: tone === t.id ? "1px solid rgba(99,102,241,0.4)" : "1px solid rgba(255,255,255,0.08)",
                    color: tone === t.id ? "#c7d2fe" : "#6b6f8a",
                  }}
                >{t.label}</button>
              ))}
            </div>
          </div>

          <button
            onClick={processEmail}
            disabled={loading || !emailText.trim()}
            style={{
              marginTop: 18, width: "100%", padding: "14px 24px",
              background: loading || !emailText.trim()
                ? "rgba(99,102,241,0.2)" : "linear-gradient(135deg, #6366f1, #7c3aed)",
              border: "none", borderRadius: 12,
              color: loading || !emailText.trim() ? "#6b6f8a" : "#fff",
              fontSize: 15, fontWeight: 600,
              cursor: loading || !emailText.trim() ? "not-allowed" : "pointer",
              fontFamily: "'DM Sans', system-ui, sans-serif",
            }}
          >
            {loading ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span style={{
                  width: 16, height: 16,
                  border: "2px solid rgba(255,255,255,0.2)", borderTopColor: "#fff",
                  borderRadius: "50%", display: "inline-block",
                  animation: "spin 0.8s linear infinite",
                }} />
                Analyzing... {loadingTime}s {loadingTime > 15 ? "— processing long thread" : ""}
              </span>
            ) : (summary || threadResult) ? "🔄 Re-analyze" : mode === "thread" ? "Analyze Thread" : "Summarize & Draft Reply"}
          </button>
          </>)}
        </div>

        {error && (
          <div style={{
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)",
            borderRadius: 12, padding: "14px 18px", marginBottom: 20, color: "#fca5a5", fontSize: 14,
          }}>{error}</div>
        )}

        {/* ===== SINGLE EMAIL RESULTS ===== */}
        {mode === "single" && summary && (
          <div ref={resultsRef} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {sla && <SlaBar sla={sla} slaHours={slaHours} />}
            <div style={cardStyle}>
              <CardHeader title="Summary" dot="#6366f1">
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {summary.urgency && (
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                      background: `${urgencyColor[summary.urgency]}18`,
                      color: urgencyColor[summary.urgency],
                      border: `1px solid ${urgencyColor[summary.urgency]}33`,
                      textTransform: "uppercase", letterSpacing: "0.05em",
                    }}>{summary.urgency} urgency</span>
                  )}
                  {summary.sentiment && (
                    <span style={{ fontSize: 18 }} title={`Sentiment: ${summary.sentiment}`}>
                      {sentimentEmoji[summary.sentiment] || ""}
                    </span>
                  )}
                </div>
              </CardHeader>
              {summary.from && <MetaLine label="From" value={summary.from} />}
              {summary.subject_guess && <MetaLine label="Subject" value={summary.subject_guess} mb={16} />}
              <BulletList items={summary.bullet_summary} />
              {summary.action_items?.length > 0 && <NumberedSection title="Action Items" items={summary.action_items} />}
              {summary.key_dates?.length > 0 && <DatePills dates={summary.key_dates} />}
            </div>
            {draftReply && <DraftReplyCard
              reply={draftReply} copied={copied} onCopy={handleCopy} onChange={setDraftReply}
              cannedResponses={cannedResponses} showCannedDropdown={showCannedDropdown}
              setShowCannedDropdown={setShowCannedDropdown} dropdownRef={dropdownRef}
              onLoadCanned={(text) => setDraftReply(text)}
              onDeleteCanned={deleteCanned}
              showSaveModal={showSaveModal} setShowSaveModal={setShowSaveModal}
              cannedName={cannedName} setCannedName={setCannedName}
              onSaveCanned={saveCanned}
              replyAdjustment={replyAdjustment} setReplyAdjustment={setReplyAdjustment}
              regenerating={regenerating} onRegenerate={regenerateReply}
            />}
            {draftReply && <ReplyScorer draft={draftReply} callAI={callAI} />}
          </div>
        )}

        {/* ===== THREAD RESULTS ===== */}
        {mode === "thread" && threadResult && (
          <div ref={resultsRef} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {sla && <SlaBar sla={sla} slaHours={slaHours} />}

            {/* Verdict Banner */}
            {threadResult.verdict && (
              <div style={{
                background: threadResult.verdict === "close" ? "rgba(34,197,94,0.08)" : "rgba(245,158,11,0.08)",
                border: `1px solid ${threadResult.verdict === "close" ? "rgba(34,197,94,0.25)" : "rgba(245,158,11,0.25)"}`,
                borderRadius: 14, padding: "18px 22px",
                display: "flex", alignItems: "center", gap: 14,
                animation: "fadeUp 0.3s ease-out",
              }}>
                <span style={{ fontSize: 32, flexShrink: 0 }}>
                  {threadResult.verdict === "close" ? "✅" : "📋"}
                </span>
                <div>
                  <div style={{
                    fontSize: 15, fontWeight: 700, marginBottom: 4,
                    color: threadResult.verdict === "close" ? "#86efac" : "#fbbf24",
                  }}>
                    {threadResult.verdict === "close" ? "Good to close!" : "Action still needed"}
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: "#b0b4c8", lineHeight: 1.5 }}>
                    {threadResult.verdict_summary}
                  </p>
                </div>
              </div>
            )}

            {/* Thread Summary */}
            <div style={cardStyle}>
              <CardHeader title="Thread Summary" dot="#6366f1">
                {threadResult.message_count && (
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                    background: "rgba(99,102,241,0.15)", color: "#a5b4fc",
                    border: "1px solid rgba(99,102,241,0.25)",
                  }}>{threadResult.message_count} messages</span>
                )}
              </CardHeader>
              {threadResult.subject_guess && <MetaLine label="Subject" value={threadResult.subject_guess} />}
              {threadResult.participants?.length > 0 && (
                <MetaLine label="Participants" value={threadResult.participants.join(", ")} mb={16} />
              )}
              <BulletList items={threadResult.bullet_summary} />
            </div>

            {/* Resolved */}
            {threadResult.resolved_items?.length > 0 && (
              <div style={cardStyle}>
                <CardHeader title="Resolved" dot="#22c55e" />
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {threadResult.resolved_items.map((item, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "flex-start", gap: 10,
                      padding: "10px 14px", background: "rgba(34,197,94,0.05)",
                      borderRadius: 10, fontSize: 14, color: "#a3e4b8", lineHeight: 1.5,
                    }}>
                      <span style={{ color: "#22c55e", fontSize: 14, flexShrink: 0 }}>✓</span>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* My Action Items */}
            {threadResult.my_open_items?.length > 0 && (
              <div style={cardStyle}>
                <CardHeader title={userName ? `${userName}'s Action Items` : "Your Action Items"} dot="#f59e0b" />
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {threadResult.my_open_items.map((item, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "flex-start", gap: 10,
                      padding: "10px 14px", background: "rgba(245,158,11,0.06)",
                      borderRadius: 10, fontSize: 14, color: "#fcd480", lineHeight: 1.5,
                    }}>
                      <span style={{ color: "#f59e0b", fontSize: 14, flexShrink: 0 }}>○</span>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Others' Pending Items */}
            {threadResult.others_pending?.length > 0 && (
              <div style={cardStyle}>
                <CardHeader title="Pending from Others" dot="#818cf8" />
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {threadResult.others_pending.map((person, i) => (
                    <div key={i}>
                      <div style={{
                        fontSize: 13, fontWeight: 700, color: "#a5b4fc", marginBottom: 6,
                        display: "flex", alignItems: "center", gap: 6,
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#818cf8", flexShrink: 0 }} />
                        {person.name}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingLeft: 12 }}>
                        {(person.items || []).map((item, j) => (
                          <div key={j} style={{
                            display: "flex", alignItems: "flex-start", gap: 8,
                            padding: "8px 12px", background: "rgba(99,102,241,0.04)",
                            borderRadius: 8, fontSize: 13, color: "#b0b4c8", lineHeight: 1.5,
                          }}>
                            <span style={{ color: "#818cf8", fontSize: 12, flexShrink: 0, marginTop: 1 }}>→</span>
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reply Points */}
            {threadResult.reply_points?.length > 0 && threadResult.reply_points.map((rp, idx) => (
              <div key={idx} style={{
                background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 16, padding: 24, animation: `fadeUp ${0.5 + idx * 0.1}s ease-out`,
                borderLeft: rp.type === "direct" ? "3px solid #ef4444" : "3px solid #a78bfa",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: rp.type === "direct" ? "#ef4444" : "#a78bfa",
                    boxShadow: `0 0 12px ${rp.type === "direct" ? "rgba(239,68,68,0.5)" : "rgba(167,139,250,0.5)"}`,
                  }} />
                  <h2 style={{
                    margin: 0, fontSize: 15, fontWeight: 700, color: "#e0e7ff",
                    fontFamily: "'Fraunces', Georgia, serif",
                  }}>Reply to {rp.to || "thread"}</h2>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6,
                    textTransform: "uppercase",
                    background: rp.type === "direct" ? "rgba(239,68,68,0.1)" : "rgba(167,139,250,0.1)",
                    color: rp.type === "direct" ? "#fca5a5" : "#c4b5fd",
                    border: `1px solid ${rp.type === "direct" ? "rgba(239,68,68,0.25)" : "rgba(167,139,250,0.25)"}`,
                  }}>{rp.type === "direct" ? "Direct to you" : "Group thread"}</span>
                </div>
                {rp.context && (
                  <p style={{ fontSize: 13, color: "#8b8fa3", margin: "0 0 12px", lineHeight: 1.5 }}>{rp.context}</p>
                )}
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <button onClick={() => handleCopy(rp.draft, "rp" + idx)} style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    fontSize: 12, fontWeight: 600, padding: "6px 12px", borderRadius: 8,
                    cursor: "pointer",
                    background: copied === "rp" + idx ? "rgba(34,197,94,0.15)" : "rgba(167,139,250,0.12)",
                    border: `1px solid ${copied === "rp" + idx ? "rgba(34,197,94,0.3)" : "rgba(167,139,250,0.25)"}`,
                    color: copied === "rp" + idx ? "#86efac" : "#c4b5fd",
                    fontFamily: "'DM Sans', system-ui, sans-serif",
                  }}>{copied === "rp" + idx ? "✓ Copied!" : "📋 Copy"}</button>
                </div>
                <textarea
                  value={rp.draft}
                  onChange={(e) => {
                    const updated = [...threadResult.reply_points];
                    updated[idx] = { ...updated[idx], draft: e.target.value };
                    setThreadResult({ ...threadResult, reply_points: updated });
                  }}
                  style={{
                    width: "100%", minHeight: 120, fontSize: 14, lineHeight: 1.75, color: "#c7cbdb",
                    padding: "14px 16px", background: "rgba(0,0,0,0.25)", borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.06)", outline: "none", resize: "vertical",
                    fontFamily: "'DM Sans', system-ui, sans-serif", boxSizing: "border-box",
                  }}
                />
                {/* Adjust & Regenerate per reply point */}
                <ReplyAdjuster
                  draft={rp.draft}
                  onUpdate={(newDraft) => {
                    const updated = [...threadResult.reply_points];
                    updated[idx] = { ...updated[idx], draft: newDraft };
                    setThreadResult({ ...threadResult, reply_points: updated });
                  }}
                  callAI={callAI}
                />
                <ReplyScorer draft={rp.draft} callAI={callAI} />
              </div>
            ))}
          </div>
        )}

        {/* ===== COMPOSE RESULTS ===== */}
        {mode === "compose" && composeResult && (
          <div ref={resultsRef} style={{ display: "flex", flexDirection: "column", gap: 14, animation: "fadeUp 0.4s ease-out" }}>
            <div style={{
              background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16, padding: 24,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#a78bfa", boxShadow: "0 0 12px rgba(167,139,250,0.5)" }} />
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#e0e7ff", fontFamily: "'Fraunces', Georgia, serif" }}>Your Email</h2>
                <span style={{ fontSize: 11, color: "#6b6f8a", fontWeight: 500 }}>— edit before copying</span>
              </div>

              {/* Subject line */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#818cf8", display: "block", marginBottom: 4 }}>SUBJECT</label>
                <input
                  type="text"
                  value={composeResult.subject || ""}
                  onChange={(e) => setComposeResult({ ...composeResult, subject: e.target.value })}
                  style={{
                    width: "100%", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 8, padding: "10px 14px", color: "#e0e7ff", fontSize: 14, fontWeight: 600,
                    outline: "none", fontFamily: "'DM Sans', system-ui, sans-serif", boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Body */}
              <textarea
                value={composeResult.body || ""}
                onChange={(e) => setComposeResult({ ...composeResult, body: e.target.value })}
                style={{
                  width: "100%", minHeight: 200, fontSize: 14, lineHeight: 1.75, color: "#c7cbdb",
                  padding: "16px 18px", background: "rgba(0,0,0,0.25)", borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.06)", outline: "none", resize: "vertical",
                  fontFamily: "'DM Sans', system-ui, sans-serif", boxSizing: "border-box",
                }}
              />

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                <button onClick={() => handleCopy((composeResult.subject ? "Subject: " + composeResult.subject + "\n\n" : "") + composeResult.body, "compose")} style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  fontSize: 12, fontWeight: 600, padding: "8px 14px", borderRadius: 8,
                  cursor: "pointer",
                  background: copied === "compose" ? "rgba(34,197,94,0.15)" : "rgba(167,139,250,0.12)",
                  border: `1px solid ${copied === "compose" ? "rgba(34,197,94,0.3)" : "rgba(167,139,250,0.25)"}`,
                  color: copied === "compose" ? "#86efac" : "#c4b5fd",
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                }}>{copied === "compose" ? "✓ Copied!" : "📋 Copy All"}</button>
                <button onClick={() => handleCopy(composeResult.body, "composebody")} style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  fontSize: 12, fontWeight: 600, padding: "8px 14px", borderRadius: 8,
                  cursor: "pointer",
                  background: copied === "composebody" ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${copied === "composebody" ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.1)"}`,
                  color: copied === "composebody" ? "#86efac" : "#8b8fa3",
                  fontFamily: "'DM Sans', system-ui, sans-serif",
                }}>{copied === "composebody" ? "✓ Copied!" : "📋 Copy Body Only"}</button>
              </div>

              {/* Adjust */}
              <ReplyAdjuster draft={composeResult.body} onUpdate={(newBody) => setComposeResult({ ...composeResult, body: newBody })} callAI={callAI} />
              <ReplyScorer draft={composeResult.body} callAI={callAI} />
            </div>
          </div>
        )}
      </div>

      {/* App Footer */}
      <div style={{ padding: "24px", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: 40 }}>
        <p style={{ fontSize: 12, color: "#4a4e64" }}>
          Questions or issues? <a href="mailto:hello@7starelite.com" style={{ color: "#818cf8", textDecoration: "none" }}>hello@7starelite.com</a>
        </p>
        <p style={{ fontSize: 11, color: "#3a3e54", marginTop: 8 }}>
          © {new Date().getFullYear()} Penvoy by 7Star Elite. All rights reserved.
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.7; transform: scale(1.08); } }
        textarea::placeholder, input::placeholder { color: #4a4e64; }
        textarea:focus, input:focus { border-color: rgba(165,180,252,0.3) !important; }
      `}</style>
      </>)}
    </div>
  );
}

/* ---- Reusable sub-components ---- */

const cardStyle = {
  background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16, padding: 24, animation: "fadeUp 0.4s ease-out",
};

function SlaBar({ sla, slaHours }) {
  return (
    <div style={{
      background: sla.bg, border: `1px solid ${sla.border}`,
      borderRadius: 14, padding: "16px 20px",
      display: "flex", alignItems: "center", gap: 14,
      animation: "fadeUp 0.3s ease-out",
    }}>
      <span style={{ fontSize: 28, flexShrink: 0 }}>{sla.icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
          <span style={{
            fontSize: 13, fontWeight: 700, color: sla.color,
            textTransform: "uppercase", letterSpacing: "0.04em",
          }}>{slaHours || 48}H SLA</span>
          <span style={{
            fontSize: 12, fontWeight: 600, padding: "2px 10px", borderRadius: 20,
            background: `${sla.color}18`, color: sla.color, border: `1px solid ${sla.color}33`,
          }}>{sla.label}</span>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: "#b0b4c8", lineHeight: 1.4 }}>{sla.tip}</p>
      </div>
    </div>
  );
}

function CardHeader({ title, dot, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
      <div style={{
        width: 8, height: 8, borderRadius: "50%", background: dot,
        boxShadow: `0 0 12px ${dot}80`,
      }} />
      <h2 style={{
        margin: 0, fontSize: 16, fontWeight: 700, color: "#e0e7ff",
        fontFamily: "'Fraunces', Georgia, serif",
      }}>{title}</h2>
      <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
        {children}
      </div>
    </div>
  );
}

function MetaLine({ label, value, mb = 6 }) {
  return (
    <div style={{ fontSize: 13, color: "#8b8fa3", marginBottom: mb }}>
      <strong style={{ color: "#a5b4fc" }}>{label}:</strong> {value}
    </div>
  );
}

function BulletList({ items }) {
  if (!items?.length) return null;
  return (
    <div style={{
      padding: "14px 16px", background: "rgba(99,102,241,0.06)",
      borderRadius: 10, borderLeft: "3px solid #6366f1",
    }}>
      {items.map((bullet, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "flex-start", gap: 10,
          marginBottom: i < items.length - 1 ? 8 : 0,
          fontSize: 14, lineHeight: 1.6, color: "#d1d5e4",
        }}>
          <span style={{ color: "#818cf8", fontSize: 8, marginTop: 7, flexShrink: 0 }}>●</span>
          <span>{bullet}</span>
        </div>
      ))}
    </div>
  );
}

function NumberedSection({ title, items }) {
  return (
    <div style={{ marginTop: 20 }}>
      <h3 style={{
        fontSize: 13, fontWeight: 700, color: "#a5b4fc", margin: "0 0 10px",
        textTransform: "uppercase", letterSpacing: "0.04em",
      }}>{title}</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map((item, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            padding: "10px 14px", background: "rgba(0,0,0,0.2)",
            borderRadius: 10, fontSize: 14, color: "#c7cbdb", lineHeight: 1.5,
          }}>
            <span style={{ color: "#f59e0b", fontWeight: 700, fontSize: 13, minWidth: 20, paddingTop: 1 }}>
              {i + 1}.
            </span>
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function DatePills({ dates }) {
  return (
    <div style={{ marginTop: 18 }}>
      <h3 style={{
        fontSize: 13, fontWeight: 700, color: "#a5b4fc", margin: "0 0 10px",
        textTransform: "uppercase", letterSpacing: "0.04em",
      }}>Key Dates</h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {dates.map((d, i) => (
          <span key={i} style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "6px 12px", background: "rgba(34,197,94,0.08)",
            border: "1px solid rgba(34,197,94,0.2)", borderRadius: 20,
            fontSize: 13, color: "#86efac",
          }}>📅 {d}</span>
        ))}
      </div>
    </div>
  );
}

function DraftReplyCard({
  reply, copied, onCopy, onChange,
  cannedResponses, showCannedDropdown, setShowCannedDropdown, dropdownRef,
  onLoadCanned, onDeleteCanned,
  showSaveModal, setShowSaveModal, cannedName, setCannedName, onSaveCanned,
  replyAdjustment, setReplyAdjustment, regenerating, onRegenerate,
}) {
  const btnBase = {
    display: "inline-flex", alignItems: "center", gap: 5,
    fontSize: 12, fontWeight: 600, padding: "6px 12px", borderRadius: 8,
    cursor: "pointer", transition: "all 0.2s",
    fontFamily: "'DM Sans', system-ui, sans-serif",
  };

  return (
    <div style={{
      background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 16, padding: 24, animation: "fadeUp 0.5s ease-out",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%", background: "#a78bfa",
            boxShadow: "0 0 12px rgba(167,139,250,0.5)",
          }} />
          <h2 style={{
            margin: 0, fontSize: 16, fontWeight: 700, color: "#e0e7ff",
            fontFamily: "'Fraunces', Georgia, serif",
          }}>Draft Reply</h2>
          <span style={{ fontSize: 11, color: "#6b6f8a", fontWeight: 500 }}>— edit before copying</span>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <button onClick={() => onCopy(reply, "reply")} style={{
          ...btnBase,
          background: copied === "reply" ? "rgba(34,197,94,0.15)" : "rgba(167,139,250,0.12)",
          border: `1px solid ${copied === "reply" ? "rgba(34,197,94,0.3)" : "rgba(167,139,250,0.25)"}`,
          color: copied === "reply" ? "#86efac" : "#c4b5fd",
        }}>{copied === "reply" ? "✓ Copied!" : "📋 Copy"}</button>

        <button onClick={() => setShowSaveModal(true)} style={{
          ...btnBase,
          background: copied === "saved" ? "rgba(34,197,94,0.15)" : "rgba(245,158,11,0.1)",
          border: `1px solid ${copied === "saved" ? "rgba(34,197,94,0.3)" : "rgba(245,158,11,0.2)"}`,
          color: copied === "saved" ? "#86efac" : "#fbbf24",
        }}>{copied === "saved" ? "✓ Saved!" : "💾 Save as template"}</button>

        {/* Canned dropdown */}
        <div style={{ position: "relative" }} ref={dropdownRef}>
          <button onClick={() => setShowCannedDropdown(!showCannedDropdown)} style={{
            ...btnBase,
            background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)",
            color: "#86efac",
            opacity: cannedResponses.length === 0 ? 0.4 : 1,
            cursor: cannedResponses.length === 0 ? "default" : "pointer",
          }} disabled={cannedResponses.length === 0}>
            📂 Templates {cannedResponses.length > 0 && `(${cannedResponses.length})`}
          </button>

          {showCannedDropdown && cannedResponses.length > 0 && (
            <div style={{
              position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 50,
              minWidth: 280, maxHeight: 260, overflowY: "auto",
              background: "#1e2235", border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 12, padding: 6, boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
            }}>
              {cannedResponses.map((c) => (
                <div key={c.id} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "10px 12px",
                  borderRadius: 8, cursor: "pointer", transition: "background 0.15s",
                }} onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
                   onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                  <div style={{ flex: 1, minWidth: 0 }} onClick={() => { onLoadCanned(c.text); setShowCannedDropdown(false); }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#d1d5e4", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: "#6b6f8a", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.text.slice(0, 60)}...</div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); onDeleteCanned(c.id); }} style={{
                    background: "none", border: "none", color: "#6b6f8a", cursor: "pointer",
                    fontSize: 14, padding: "2px 6px", borderRadius: 4, flexShrink: 0,
                  }} onMouseEnter={(e) => e.target.style.color = "#f87171"}
                     onMouseLeave={(e) => e.target.style.color = "#6b6f8a"}
                     title="Delete template">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Save modal */}
      {showSaveModal && (
        <div style={{
          display: "flex", gap: 8, marginBottom: 14, padding: "12px 14px",
          background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)",
          borderRadius: 10, alignItems: "center",
        }}>
          <input type="text" value={cannedName} onChange={(e) => setCannedName(e.target.value)}
            placeholder="Template name..." autoFocus
            onKeyDown={(e) => { if (e.key === "Enter" && cannedName.trim()) onSaveCanned(cannedName.trim(), reply); }}
            style={{
              flex: 1, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8, padding: "8px 12px", color: "#d1d5e4", fontSize: 13,
              outline: "none", fontFamily: "'DM Sans', system-ui, sans-serif",
            }}
          />
          <button onClick={() => { if (cannedName.trim()) onSaveCanned(cannedName.trim(), reply); }} style={{
            ...btnBase, background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)",
            color: "#fbbf24", opacity: cannedName.trim() ? 1 : 0.4,
          }} disabled={!cannedName.trim()}>Save</button>
          <button onClick={() => { setShowSaveModal(false); setCannedName(""); }} style={{
            ...btnBase, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            color: "#8b8fa3",
          }}>Cancel</button>
        </div>
      )}

      {/* Editable reply */}
      <textarea
        value={reply}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%", minHeight: 180, fontSize: 14, lineHeight: 1.75, color: "#c7cbdb",
          padding: "16px 18px", background: "rgba(0,0,0,0.25)", borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.06)", outline: "none", resize: "vertical",
          fontFamily: "'DM Sans', system-ui, sans-serif", boxSizing: "border-box",
        }}
      />

      {/* Adjust & Regenerate */}
      <div style={{
        marginTop: 12, padding: "14px 16px",
        background: "rgba(99,102,241,0.04)", border: "1px solid rgba(99,102,241,0.12)",
        borderRadius: 12,
      }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "#818cf8", display: "block", marginBottom: 8 }}>
          ✏️ ADJUST REPLY — tell me what to change and I'll rewrite it
        </label>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="text" value={replyAdjustment}
            onChange={(e) => setReplyAdjustment(e.target.value)}
            placeholder="e.g. it falls on Genius Lab to reach out to Supply Chain"
            onKeyDown={(e) => { if (e.key === "Enter" && replyAdjustment.trim() && !regenerating) onRegenerate(replyAdjustment); }}
            style={{
              flex: 1, background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 8, padding: "10px 14px", color: "#d1d5e4", fontSize: 13,
              outline: "none", fontFamily: "'DM Sans', system-ui, sans-serif",
            }}
          />
          <button
            onClick={() => onRegenerate(replyAdjustment)}
            disabled={!replyAdjustment.trim() || regenerating}
            style={{
              ...btnBase, padding: "10px 16px",
              background: regenerating ? "rgba(99,102,241,0.1)" : "rgba(99,102,241,0.2)",
              border: "1px solid rgba(99,102,241,0.3)",
              color: regenerating ? "#6b6f8a" : "#c7d2fe",
              cursor: !replyAdjustment.trim() || regenerating ? "not-allowed" : "pointer",
              opacity: !replyAdjustment.trim() ? 0.4 : 1,
              flexShrink: 0,
            }}
          >
            {regenerating ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{
                  width: 12, height: 12,
                  border: "2px solid rgba(255,255,255,0.15)", borderTopColor: "#c7d2fe",
                  borderRadius: "50%", display: "inline-block",
                  animation: "spin 0.8s linear infinite",
                }} />
                Rewriting...
              </span>
            ) : "🔄 Regenerate"}
          </button>
        </div>
      </div>
    </div>
  );
}
