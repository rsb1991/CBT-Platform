import React, { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import QuestionRenderer from "./QuestionRenderer";

// 
// SUPABASE CONFIG  replace with your project URL & anon key
// 
const SUPABASE_URL = "https://wsfbzwgdfxxhedccodua.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzZmJ6d2dkZnh4aGVkY2NvZHVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MTM0NzksImV4cCI6MjA5NTM4OTQ3OX0.I6RVwV8PXB-3NFWAQxK-KuvBbSnlI7ilKKVRpciJkt0";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 
// CONSTANTS
// 
const SUBJECTS = ["Physics", "Chemistry", "Botany", "Zoology"];
// Derive the actual subject list from loaded questions, preserving NEET order when present
function subjectsFrom(qs) {
  const present = [];
  (qs || []).forEach(q => { if (q && q.subject && !present.includes(q.subject)) present.push(q.subject); });
  if (!present.length) return SUBJECTS.slice();
  const ordered = SUBJECTS.filter(s => present.includes(s));
  const extras  = present.filter(s => !SUBJECTS.includes(s));
  return ordered.concat(extras);
}
const TOTAL_TIME = 3 * 60 * 60;
const MARKS_CORRECT = 4;
const MARKS_WRONG = -1;
// Max marks for a saved result row: questions answered * marks per correct (fallback 720)
function maxMarksOf(r) {
  const t = r && (r.total != null ? r.total : null);
  return (t != null && t > 0) ? t * MARKS_CORRECT : 720;
}
const QUESTIONS_PER_SUBJECT = 45;
const SESSION_KEY = "neet_exam_session"; // localStorage key for exam persistence
const SCREEN = { LANDING: "landing", AUTH: "auth", ADMIN_AUTH: "admin_auth", ADMIN: "admin", DASHBOARD: "dashboard", INSTRUCTIONS: "instructions", EXAM: "exam", RESULT: "result" };
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || "admin@neet2025.in";
const ADMIN_PASS  = import.meta.env.VITE_ADMIN_PASS  || "Neet@Admin#2025";

// Theme context - shared across all components
const ThemeCtx = { dark: true }; // mutable object, avoids full React context overhead
const getTheme = () => ThemeCtx.dark;


// 
// UTILS
// 
const fmt = (s) => {
  const h = Math.floor(s / 3600).toString().padStart(2, "0");
  const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${h}:${m}:${sec}`;
};

const statusColor = (st) => ({
  answered: "#22c55e", marked: "#a855f7", "marked-answered": "#a855f7",
  "not-visited": "#374151", "not-answered": "#ef4444"
}[st] || "#374151");

// 
// SUPABASE HELPERS
// 
// 
// SUPABASE HELPERS  with full error handling & diagnosis
// 

const isSupabaseConfigured = () =>
  SUPABASE_URL && SUPABASE_ANON_KEY &&
  !SUPABASE_URL.includes("your-project") &&
  !SUPABASE_ANON_KEY.includes("your-anon") &&
  SUPABASE_URL.startsWith("https://");

// Translates raw Supabase/network errors into plain English
function friendlyError(error, context = "") {
  if (!error) return null;
  const msg = (error.message || error.toString()).toLowerCase();

  if (msg.includes("invalid api key") || msg.includes("invalid token") || msg.includes("jwt"))
    return "Your Supabase API key is invalid. Copy the anon key from Project Settings  API.";
  if (msg.includes("relation") && msg.includes("does not exist"))
    return `The "${context}" table does not exist. Run the SQL setup in Supabase SQL Editor.`;
  if (msg.includes("row-level security") || msg.includes("rls") || msg.includes("new row violates") || msg.includes("permission denied"))
    return `Permission denied on "${context}" table. Add a Row Level Security policy in Supabase  Authentication  Policies.`;
  if (msg.includes("invalid login") || msg.includes("invalid credentials") || msg.includes("email not confirmed"))
    return error.message; // pass these through as-is, they're already user-friendly
  if (msg.includes("network") || msg.includes("fetch") || msg.includes("failed to fetch") || msg.includes("networkerror"))
    return "Network error  check your internet connection and that your Supabase URL is correct.";
  if (msg.includes("not found") || msg.includes("404"))
    return "Supabase project not found. Check your Project URL in App.jsx line 8.";
  if (msg.includes("email already registered") || msg.includes("already registered"))
    return "This email is already registered. Try signing in instead.";
  if (msg.includes("password") && msg.includes("short"))
    return "Password must be at least 6 characters.";
  if (msg.includes("signup") && msg.includes("disabled"))
    return "Sign-ups are disabled in your Supabase project. Enable Email provider in Authentication  Providers.";

  return error.message || "Unknown error. Check the browser console (F12) for details.";
}

// Diagnose config issues before even calling Supabase
function diagnoseConfig() {
  if (!SUPABASE_URL || SUPABASE_URL.includes("your-project"))
    return "SUPABASE_URL is not set. Open App.jsx and replace the placeholder on line 8.";
  if (!SUPABASE_URL.startsWith("https://"))
    return "SUPABASE_URL must start with https://";
  if (SUPABASE_URL.endsWith("/"))
    return "SUPABASE_URL must NOT have a trailing slash. Remove the / at the end.";
  if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes("your-anon"))
    return "SUPABASE_ANON_KEY is not set. Open App.jsx and replace the placeholder on line 9.";
  if (!SUPABASE_ANON_KEY.startsWith("eyJ"))
    return "SUPABASE_ANON_KEY looks wrong  it should start with eyJ. Copy the anon key from Project Settings  API.";
  return null;
}

async function sbSignUp(email, password, name) {
  const configErr = diagnoseConfig();
  if (configErr) return { data: null, error: { message: configErr } };
  try {
    const { data, error } = await supabase.auth.signUp({
      email, password, options: { data: { full_name: name } }
    });
    return { data, error: error ? { message: friendlyError(error, "auth") } : null };
  } catch (e) {
    return { data: null, error: { message: friendlyError(e, "auth") } };
  }
}

async function sbSignIn(email, password) {
  const configErr = diagnoseConfig();
  if (configErr) return { data: null, error: { message: configErr } };
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error: error ? { message: friendlyError(error, "auth") } : null };
  } catch (e) {
    return { data: null, error: { message: friendlyError(e, "auth") } };
  }
}

async function sbSignOut() {
  try { await supabase.auth.signOut(); } catch (_) {}
}

// Returns { questions, error, source }
async function sbFetchQuestions(paperId = "PAPER_01") {
  const configErr = diagnoseConfig();
  if (configErr) return { questions: null, error: configErr, source: null };

  try {
    const { data, error } = await supabase
      .from("questions")
      .select("id, number, subject, type, question_text, equation, diagram_url, option_a, option_b, option_c, option_d, option_a_image, option_b_image, option_c_image, option_d_image, correct, solution_text, solution_eq, paper_id")
      .eq("paper_id", paperId)
      .order("number", { ascending: true });

    if (error) return { questions: null, error: friendlyError(error, "questions"), source: null };
    if (!data || data.length === 0) {
      return {
        questions: null,
        error: `No questions found with paper_id = "${paperId}". Add questions in Supabase  Table Editor  questions, or run the SQL insert script.`,
        source: null
      };
    }

    // Map DB columns  app format (supports text/equation/diagram types)
    const questions = data.map(q => ({
      id:            String(q.id),
      number:        q.number,
      subject:       q.subject,
      type:          q.type || "text",
      question_text: q.question_text || q.text || "",
      equation:      q.equation || "",
      diagram_url:   q.diagram_url || "",
      diagram_data:  "",  // loaded on-demand per question
      options:       [q.option_a, q.option_b, q.option_c, q.option_d],
      option_images: [q.option_a_image||"", q.option_b_image||"", q.option_c_image||"", q.option_d_image||""],
      correct:       q.correct,
      solution_text:         q.solution_text || q.solution || "",
      solution_eq:           q.solution_eq || "",
      solution_diagram_data: "",  // loaded on-demand
    }));

    return { questions, error: null, source: "supabase" };
  } catch (e) {
    return { questions: null, error: friendlyError(e, "questions"), source: null };
  }
}

// Returns { error } or null
async function sbSaveResult(userId, payload) {
  if (!isSupabaseConfigured()) return { error: "Supabase not configured" };
  try {
    const { error } = await supabase
      .from("test_results")
      .insert([{ user_id: userId, ...payload, created_at: new Date().toISOString() }]);
    if (error) {
      console.warn("Could not save result:", error);
      return { error: error.message };
    }
    return { error: null };
  } catch (e) {
    console.warn("Could not save result:", e.message);
    return { error: e.message };
  }
}

// Returns array of history rows (never throws)
async function sbGetHistory(userId) {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await supabase
      .from("test_results")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) { console.warn("History fetch error:", friendlyError(error, "test_results")); return []; }
    return data || [];
  } catch (e) {
    console.warn("History fetch error:", e.message);
    return [];
  }
}

// 
// STYLES HELPERS
// 
const btn = (variant = "primary", extra = {}) => {
  const base = {
    border: "none", borderRadius: 10, padding: "11px 24px", fontWeight: 600,
    cursor: "pointer", fontSize: "0.9rem", fontFamily: "inherit", transition: "all 0.15s", ...extra
  };
  if (variant === "primary") return { ...base, background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "#fff" };
  if (variant === "success") return { ...base, background: "linear-gradient(135deg,#16a34a,#22c55e)", color: "#fff" };
  if (variant === "danger")  return { ...base, background: "linear-gradient(135deg,#b91c1c,#ef4444)", color: "#fff" };
  if (variant === "blue")    return { ...base, background: "linear-gradient(135deg,#1d4ed8,#2563eb)", color: "#fff" };
  if (variant === "ghost")   return { ...base, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", color: "#cbd5e1" };
  if (variant === "mark")    return { ...base, background: "rgba(168,85,247,0.2)", border: "1px solid rgba(168,85,247,0.5)", color: "#c084fc" };
  if (variant === "clear")   return { ...base, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" };
  return base;
};

const card = (extra = {}) => ({
  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: 16, ...extra
});

const input = { width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 10, padding: "11px 14px", color: "#e2e8f0", fontSize: "0.95rem",
  fontFamily: "inherit", outline: "none", boxSizing: "border-box" };

// 
// BRANDING HELPER  used by all screens
// Returns a style object with background based on admin branding settings
function brandingBg(branding = {}) {
  const bgType = branding.bg_type || "gradient";
  if (bgType === "solid" && branding.bg_solid_color)
    return { background: branding.bg_solid_color };
  if (bgType === "image" && branding.bg_image_data)
    return { backgroundImage: "url(" + branding.bg_image_data + ")", backgroundSize: "cover", backgroundPosition: "center" };
  return { background: "linear-gradient(135deg," + (branding.bg_gradient_from || "#0f0c29") + " 0%," + (branding.bg_gradient_to || "#302b63") + " 50%," + (branding.bg_gradient_from || "#24243e") + " 100%)" };
}

// 
// LANDING SCREEN
function LandingScreen({ onStudent, onAdmin, branding = {} }) {
  // Hide the pre-landing overlay (rendered in index.html for instant display)
  React.useEffect(() => {
    if (window.__hidePrelanding) window.__hidePrelanding();
  }, []);

  const bgType = branding.bg_type || "gradient";
  const bgStyle = bgType === "solid"
    ? { background: branding.bg_solid_color || "#0f172a" }
    : bgType === "image" && branding.bg_image_data
    ? { backgroundImage: "url(" + branding.bg_image_data + ")", backgroundSize: "cover", backgroundPosition: "center" }
    : { background: "linear-gradient(135deg," + (branding.bg_gradient_from || "#0f0c29") + " 0%," + (branding.bg_gradient_to || "#302b63") + " 50%," + (branding.bg_gradient_from || "#24243e") + " 100%)" };

  // Also apply to body so there's no white gap on any screen size
  React.useEffect(() => {
    const bg = bgStyle.background || bgStyle.backgroundImage || "";
    if (bg) document.body.style.background = bg;
    return () => { document.body.style.background = ""; };
  }, [branding]);

  return (
    <div style={{ minHeight: "100vh", width: "100%", ...bgStyle, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Crimson Pro', Georgia, serif", padding: "1.5rem" }}>
      <div style={{ width: "100%", maxWidth: 460, textAlign: "center" }}>
        {/* Logo */}
        {(branding.logo_data || branding.logo_url) && (
          <img src={branding.logo_data || branding.logo_url} alt="logo"
            style={{ maxHeight: 90, maxWidth: 260, objectFit: "contain", display: "block", margin: "0 auto 20px", borderRadius: 8 }} />
        )}
        {/* Badge */}
        {branding.show_badge !== "false" && (
          <div style={{ display: "inline-block", background: "rgba(168,85,247,0.2)", border: "1px solid rgba(168,85,247,0.5)", borderRadius: 99, padding: "6px 20px", fontSize: 12, color: "#c084fc", letterSpacing: 2, textTransform: "uppercase", marginBottom: 24, fontFamily: "monospace" }}>
            {branding.badge_text || "NEET CBT"}
          </div>
        )}
        <h1 style={{ color: "#fff", fontSize: "2.2rem", fontWeight: 700, margin: "0 0 10px" }}>
          {branding.platform_name || "Mock Test Platform"}
        </h1>
        <p style={{ color: "#64748b", margin: "0 0 48px", fontSize: 15 }}>
          {branding.platform_tagline || "Select your role to continue"}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="mob-grid1">
          <button onClick={onStudent} style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.35)", borderRadius: 16, padding: "32px 20px", cursor: "pointer", fontFamily: "inherit", textAlign: "center" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(99,102,241,0.25)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(99,102,241,0.12)"}>
            <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>&#127891;</div>
            <div style={{ color: "#a5b4fc", fontWeight: 700, fontSize: "1.1rem", marginBottom: 8 }}>Student</div>
            <div style={{ color: "#64748b", fontSize: 13 }}>Login to take the mock exam</div>
          </button>
          <button onClick={onAdmin} style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.3)", borderRadius: 16, padding: "32px 20px", cursor: "pointer", fontFamily: "inherit", textAlign: "center" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(168,85,247,0.22)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(168,85,247,0.1)"}>
            <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>&#128736;</div>
            <div style={{ color: "#c084fc", fontWeight: 700, fontSize: "1.1rem", marginBottom: 8 }}>Admin</div>
            <div style={{ color: "#64748b", fontSize: 13 }}>Manage questions and results</div>
          </button>
        </div>
      </div>
    </div>
  );
}


// ADMIN AUTH SCREEN
function AdminAuthScreen({ onSuccess, onBack, branding = {} }) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [err,      setErr]      = useState("");
  const [loading,  setLoading]  = useState(false);

  const handleLogin = () => {
    setErr(""); setLoading(true);
    setTimeout(() => {
      if (email.trim() === ADMIN_EMAIL && password === ADMIN_PASS) {
        onSuccess();
      } else {
        setErr("Invalid admin credentials.");
      }
      setLoading(false);
    }, 400);
  };

  return (
    <div style={{ minHeight: "100vh", ...brandingBg(branding), display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Crimson Pro', Georgia, serif", padding: "1.5rem" }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 14, marginBottom: 24, fontFamily: "inherit" }}>
          &larr; Back
        </button>
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(168,85,247,0.25)", borderRadius: 20, padding: 28 }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>&#128736;</div>
            <h2 style={{ color: "#c084fc", margin: "0 0 6px", fontSize: "1.3rem", fontWeight: 700 }}>Admin Login</h2>
            <p style={{ color: "#64748b", margin: 0, fontSize: 13 }}>Restricted access</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ color: "#94a3b8", fontSize: 12, display: "block", marginBottom: 6 }}>Admin Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@example.com"
                style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "11px 14px", color: "#e2e8f0", fontSize: "0.95rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ color: "#94a3b8", fontSize: 12, display: "block", marginBottom: 6 }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password"
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "11px 14px", color: "#e2e8f0", fontSize: "0.95rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
            </div>
            {err && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 14px", color: "#f87171", fontSize: 13 }}>{err}</div>}
            <button onClick={handleLogin} disabled={loading}
              style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "#fff", border: "none", borderRadius: 10, padding: "13px", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", fontSize: "0.95rem", fontFamily: "inherit", opacity: loading ? 0.7 : 1 }}>
              {loading ? "Verifying..." : "Enter Admin Panel"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ADMIN PORTAL - image compression helper
const MAX_W_IMG = 800;
const QUALITY_IMG = 0.78;
function compressToBase64(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = img.width > MAX_W_IMG ? MAX_W_IMG / img.width : 1;
      const cv = document.createElement("canvas");
      cv.width  = Math.round(img.width  * scale);
      cv.height = Math.round(img.height * scale);
      cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
      const b64 = cv.toDataURL("image/jpeg", QUALITY_IMG);
      resolve({ b64, kb: Math.round((b64.length * 3) / 4 / 1024), w: cv.width, h: cv.height });
    };
    img.onerror = () => reject(new Error("Could not read image."));
    img.src = url;
  });
}
const abtn = (v) => {
  const b = { border: "none", borderRadius: 9, padding: "9px 18px", fontWeight: 600, cursor: "pointer", fontSize: "0.88rem", fontFamily: "inherit" };
  if (v === "primary") return { ...b, background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "#fff" };
  if (v === "success") return { ...b, background: "linear-gradient(135deg,#16a34a,#22c55e)", color: "#fff" };
  if (v === "danger")  return { ...b, background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" };
  if (v === "ghost")   return { ...b, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#cbd5e1" };
  if (v === "sm")      return { ...b, padding: "5px 12px", fontSize: "0.78rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8" };
  return b;
};
const ainput = { width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "10px 14px", color: "#e2e8f0", fontSize: "0.92rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box" };
const alabel = { color: "#94a3b8", fontSize: 11, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 };
const acard  = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 16 };
const aempty = () => ({ number: "", subject: "Physics", question_text: "", equation: "", diagram_data: "", option_a: "", option_b: "", option_c: "", option_d: "", option_a_image: "", option_b_image: "", option_c_image: "", option_d_image: "", correct: "0", solution_text: "", solution_eq: "", solution_diagram_data: "", paper_id: "PAPER_01", chapter: "", difficulty: "medium" });
const SUBJ_COLORS_A = { Physics: "#6366f1", Chemistry: "#f59e0b", Botany: "#22c55e", Zoology: "#f43f5e" };

// Helper mini-components for admin
function DeleteResultPanel({ supabase, onDone, abtn, ainput }) {
  const [rid, setRid] = React.useState("");
  const [msg, setMsg] = React.useState(null);
  const del = async () => {
    if (!rid.trim()) { setMsg("Enter a result ID."); return; }
    const { error } = await supabase.from("test_results").delete().eq("id", rid.trim());
    if (error) setMsg("Error: " + error.message);
    else { setMsg("Deleted successfully."); setRid(""); if(onDone) onDone(); }
  };
  return (
    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
      <input value={rid} onChange={e=>setRid(e.target.value)} placeholder="Result UUID..." style={{ ...ainput, flex:1, fontSize:12 }} />
      <button onClick={del} style={{ ...abtn("danger"), padding:"9px 16px", fontSize:12, whiteSpace:"nowrap" }}>Delete</button>
      {msg && <span style={{ color:msg.includes("Error")?"#f87171":"#4ade80", fontSize:12 }}>{msg}</span>}
    </div>
  );
}

function RemoveFromBatchesPanel({ supabase, abtn, ainput }) {
  const [email, setEmail] = React.useState("");
  const [msg,   setMsg]   = React.useState(null);
  const remove = async () => {
    if (!email.includes("@")) { setMsg("Enter a valid email."); return; }
    const { error, count } = await supabase.from("batch_members").delete().eq("email", email.trim().toLowerCase());
    if (error) setMsg("Error: " + error.message);
    else setMsg("Removed from all batches.");
  };
  return (
    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
      <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="student@example.com" style={{ ...ainput, flex:1, fontSize:12 }} />
      <button onClick={remove} style={{ ...abtn("danger"), padding:"9px 16px", fontSize:12, whiteSpace:"nowrap" }}>Remove</button>
      {msg && <span style={{ color:msg.includes("Error")?"#f87171":"#4ade80", fontSize:12 }}>{msg}</span>}
    </div>
  );
}

// ADMIN SCREEN - full page with CSV upload and Settings panel
function AdminScreen({ onSignOut }) {
  const [tab,       setTab]       = useState("add");
  const [form,      setForm]      = useState(aempty());
  const [questions, setQuestions] = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [imgInfo,   setImgInfo]   = useState(null);
  const [msg,       setMsg]       = useState(null);
  const [search,    setSearch]    = useState("");
  const [paperFilter, setPaperFilter] = useState("PAPER_01");
  const [subFilter, setSubFilter] = useState("All");
  const [editId,    setEditId]    = useState(null);
  const [csvMsg,    setCsvMsg]    = useState(null);
  const [csvPreview,setCsvPreview]= useState([]);
  const [csvLoading,setCsvLoading]= useState(false);
  const [scanMsg,      setScanMsg]      = useState(null);
  const [scanLoading,  setScanLoading]  = useState(false);
  const [scanPreview,  setScanPreview]  = useState([]);
  const [scanProgress, setScanProgress] = useState("");
  const [scanImages,   setScanImages]   = useState([]); // {name, b64, type}
  const [imgBulkMsg,     setImgBulkMsg]     = useState(null);
  const [imgBulkFiles,   setImgBulkFiles]   = useState([]);
  const [imgBulkLoading, setImgBulkLoading] = useState(false);
  const [imgBulkProgress,setImgBulkProgress]= useState("");
  const [settings,  setSettings]  = useState({});
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg,    setSettingsMsg]    = useState(null);
  const [students,  setStudents]  = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [brandingForm,  setBrandingForm]  = useState({});
  const [brandingMsg,   setBrandingMsg]   = useState(null);
  const [brandingLoading,setBrandingLoading]=useState(false);
  const [studentTab,      setStudentTab]      = useState("results"); // results | add
  const [analyticsData,   setAnalyticsData]   = useState(null);
  const [analyticsLoading,setAnalyticsLoading]= useState(false);
  const [batches,         setBatches]         = useState([]);
  const [batchLoading,    setBatchLoading]     = useState(false);
  const [batchMsg,        setBatchMsg]         = useState(null);
  const [selectedBatch,   setSelectedBatch]    = useState(null); // batch object being edited
  const [batchForm,       setBatchForm]        = useState({ name:"", description:"" });
  const [batchSettings,   setBatchSettings]    = useState({});
  const [batchMembers,    setBatchMembers]     = useState([]);
  const [batchMemberInput,setBatchMemberInput] = useState(""); // paste emails
  const [batchMemberCsv,  setBatchMemberCsv]  = useState(null);
  const [batchView,       setBatchView]        = useState("list"); // list | edit | tests
  const [batchTests,      setBatchTests]       = useState([]);
  const [selectedTest,    setSelectedTest]     = useState(null);
  const [testForm,        setTestForm]         = useState({ name:"", description:"", paper_id:"PAPER_01", exam_window_start:"", exam_window_end:"", attempt_limit:"1", access_code:"", access_code_enabled:"false", resume_code:"", status:"scheduled", manual_release:"false" });
  const [batchTestView,   setBatchTestView]    = useState("list"); // list | create | edit | report
  const [testMsg,         setTestMsg]          = useState(null);
  const [testLoading,     setTestLoading]      = useState(false);
  const [testReports,     setTestReports]      = useState([]);
  const [testReportLoading,setTestReportLoading] = useState(false);
  const [addStudentRows,  setAddStudentRows]   = useState([{ email:"", password:"", name:"" }]);
  const [addStudentMsg,   setAddStudentMsg]    = useState(null);
  const [addStudentLoading,setAddStudentLoading] = useState(false);
  const [stuCsvMsg,       setStuCsvMsg]       = useState(null);
  const [stuCsvRows,      setStuCsvRows]      = useState(null);
  const [stuCsvPreview,   setStuCsvPreview]   = useState([]);
  const [stuCsvLoading,   setStuCsvLoading]   = useState(false);
  const [stuCsvProgress,  setStuCsvProgress]  = useState("");
  const afileRef   = useRef(null);
  const csvFileRef = useRef(null);

  useEffect(() => {
    if (tab === "list")     loadAll(paperFilter);
    if (tab === "settings") loadSettings();
    if (tab === "students") loadStudents();
    if (tab === "branding") (async () => {
      const defaults = {
        logo_data:"", logo_url:"", platform_name:"Mock Test Platform",
        platform_tagline:"Select your role to continue", bg_type:"gradient",
        bg_gradient_from:"#0f0c29", bg_gradient_to:"#302b63",
        bg_solid_color:"#0f172a", bg_image_data:"", accent_color:"#7c3aed",
        show_badge:"true", badge_text:"NEET CBT"
      };
      setBrandingForm(defaults); // show defaults immediately so UI is never blank
      try {
        const { data } = await supabase.from("branding").select("key,value");
        if (data && data.length > 0) {
          const b = { ...defaults };
          data.forEach(r => { b[r.key] = r.value; });
          setBrandingForm(b);
        }
      } catch (_) {}
    })();
  }, [tab]);

  const ff = (k, v) => setForm(p => ({ ...p, [k]: v }));

  //  Load all questions 
  const loadAll = async (pid) => {
    setLoading(true);
    const usePaper = pid || paperFilter || "PAPER_01";
    const { data, error } = await supabase.from("questions")
      .select("id,number,subject,type,question_text,equation,diagram_data,option_a,option_b,option_c,option_d,option_a_image,option_b_image,option_c_image,option_d_image,correct,solution_text,solution_eq,solution_diagram_data,paper_id")
      .eq("paper_id", usePaper).order("subject").order("number");
    if (!error) setQuestions(data || []);
    else setMsg({ type: "error", text: error.message });
    setLoading(false);
  };


  //  Load platform settings 
  const loadSettings = async () => {
    const { data } = await supabase.from("platform_settings").select("key,value");
    if (data) {
      const s = {};
      data.forEach(r => { s[r.key] = r.value; });
      setSettings(s);
    }
  };

  //  Save a single setting 
  const saveSetting = async (key, value) => {
    setSettings(p => ({ ...p, [key]: value }));
    await supabase.from("platform_settings")
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  };

  //  Save all settings at once 
  const saveAllSettings = async () => {
    setSavingSettings(true);
    const rows = Object.entries(settings).map(([key, value]) => ({
      key, value, updated_at: new Date().toISOString()
    }));
    const { error } = await supabase.from("platform_settings")
      .upsert(rows, { onConflict: "key" });
    setSavingSettings(false);
    if (error) setSettingsMsg({ type: "error", text: error.message });
    else {
      setSettingsMsg({ type: "success", text: "Settings saved successfully!" });
      setTimeout(() => setSettingsMsg(null), 3000);
    }
  };

  //  Load students 
  const [reportFilter,    setReportFilter]    = useState({ search:"", minScore:"", maxScore:"", dateFrom:"", dateTo:"", sortBy:"date", paperId:"", nameSearch:"" });
  const [studentReportEmail, setStudentReportEmail] = useState("");
  const [studentReportData,  setStudentReportData]  = useState([]);
  const [studentReportLoading, setStudentReportLoading] = useState(false);
  const [reportExpanded,  setReportExpanded]  = useState(null); // expanded row user_id+created_at

  const loadStudents = async () => {
    setLoadingStudents(true);
    const { data } = await supabase.from("test_results")
      .select("id, user_id, student_name, student_email, score, correct, wrong, unattempted, total, created_at, percentile, subject_times, paper_id")
      .order("created_at", { ascending: false })
      .limit(500);
    if (data) setStudents(data);
    setLoadingStudents(false);
  };

  // Download all reports as CSV
  const downloadReportsCSV = (rows) => {
    const header = "S.No,Name,Email,Paper ID,Date,Score,Percentage,Correct,Wrong,Unattempted,Percentile,Physics Time(s),Chemistry Time(s),Botany Time(s),Zoology Time(s)";
    const lines = rows.map((r, i) => {
      const d    = new Date(r.created_at).toLocaleDateString("en-IN");
      const pct  = Math.round((r.score / maxMarksOf(r)) * 100);
      const st   = r.subject_times || {};
      return [
        i+1, r.user_id.slice(0,12), d, r.score, pct+"%",
        r.correct, r.wrong, r.unattempted,
        r.percentile != null ? r.percentile+"%" : "N/A",
        st.Physics || 0, st.Chemistry || 0, st.Botany || 0, st.Zoology || 0
      ].join(",");
    });
    const csv  = header + "\n" + lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "exam_reports_" + new Date().toISOString().slice(0,10) + ".csv"; a.click();
    URL.revokeObjectURL(url);
  };

  //  Image compression 
  const handleImg = async (file) => {
    if (!file) return;
    if (!file.type.match(/image\/(jpe?g|png|webp)/i)) { setMsg({ type: "error", text: "Only JPG/PNG/WebP allowed." }); return; }
    setMsg({ type: "info", text: "Compressing..." });
    try {
      const { b64, kb, w, h } = await compressToBase64(file);
      ff("diagram_data", b64); setImgInfo({ kb, w, h });
      setMsg({ type: "success", text: "Image ready - " + w + "x" + h + "px, " + kb + "KB" });
    } catch (e) { setMsg({ type: "error", text: e.message }); }
  };

  //  Save single question 
  const handleSave = async () => {
    if (!form.number || isNaN(+form.number)) return setMsg({ type: "error", text: "Question number required." });
    if (!form.question_text.trim() && !form.equation.trim()) return setMsg({ type: "error", text: "Question text or equation required." });
    if (!form.option_a || !form.option_b || !form.option_c || !form.option_d) return setMsg({ type: "error", text: "All 4 options required." });
    setLoading(true);
    const payload = {
      number: +form.number, subject: form.subject,
      type: form.diagram_data && form.equation ? "equation+diagram" : form.diagram_data ? "diagram" : form.equation ? "equation" : "text",
      question_text: form.question_text, equation: form.equation,
      diagram_data: form.diagram_data, diagram_url: "",
      option_a: form.option_a, option_b: form.option_b, option_c: form.option_c, option_d: form.option_d,
      correct: +form.correct, solution_text: form.solution_text, solution_eq: form.solution_eq,
      solution_diagram_data: form.solution_diagram_data || "",
      option_a_image: form.option_a_image || "", option_b_image: form.option_b_image || "",
      option_c_image: form.option_c_image || "", option_d_image: form.option_d_image || "",
      paper_id: form.paper_id || "PAPER_01", chapter: form.chapter || "", difficulty: form.difficulty || "medium",
    };
    const { error } = editId
      ? await supabase.from("questions").update(payload).eq("id", editId)
      : await supabase.from("questions").insert([payload]);
    setLoading(false);
    if (error) { setMsg({ type: "error", text: error.message }); }
    else {
      setMsg({ type: "success", text: editId ? "Updated!" : "Saved!" });
      setForm(aempty()); setImgInfo(null); setEditId(null);
      setTimeout(() => setMsg(null), 3000);
    }
  };

  //  Edit question 
  const handleEdit = (q) => {
    setForm({ number: String(q.number), subject: q.subject || "Physics", question_text: q.question_text || "", equation: q.equation || "", diagram_data: q.diagram_data || "", option_a: q.option_a || "", option_b: q.option_b || "", option_c: q.option_c || "", option_d: q.option_d || "", option_a_image: q.option_a_image || "", option_b_image: q.option_b_image || "", option_c_image: q.option_c_image || "", option_d_image: q.option_d_image || "", correct: String(q.correct), solution_text: q.solution_text || "", solution_eq: q.solution_eq || "", solution_diagram_data: q.solution_diagram_data || "", paper_id: q.paper_id || "PAPER_01", chapter: q.chapter || "", difficulty: q.difficulty || "medium" });
    setImgInfo(q.diagram_data ? { kb: Math.round(q.diagram_data.length * 0.75 / 1024) } : null);
    setEditId(q.id); setTab("add");
  };

  //  Delete question 
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this question?")) return;
    const { error } = await supabase.from("questions").delete().eq("id", id);
    if (error) setMsg({ type: "error", text: error.message });
    else { loadAll(); setMsg({ type: "success", text: "Deleted." }); }
  };

  //  Delete ALL questions 
  const handleDeleteAll = async () => {
    if (!window.confirm("Delete ALL questions for paper '" + paperFilter + "'? Cannot be undone.")) return;
    const { error } = await supabase.from("questions").delete().eq("paper_id", paperFilter);
    if (error) setMsg({ type: "error", text: error.message });
    else { loadAll(); setMsg({ type: "success", text: "All questions deleted." }); }
  };

  //  CSV PARSER 
  // Expected CSV columns (header row required):
  // number,subject,question_text,equation,option_a,option_b,option_c,option_d,correct,solution_text,solution_eq
  // correct = 0(A) 1(B) 2(C) 3(D)
  const parseCSV = (text) => {
    const lines  = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return { rows: [], error: "CSV must have a header row and at least one data row." };

    const header = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_"));
    const required = ["number","subject","question_text","option_a","option_b","option_c","option_d","correct"];
    const missing = required.filter(r => !header.includes(r));
    if (missing.length) return { rows: [], error: "Missing columns: " + missing.join(", ") };

    const rows = [];
    const errors = [];
    for (let i = 1; i < lines.length; i++) {
      // Handle quoted fields with commas inside
      const cols = [];
      let cur = "", inQ = false;
      for (const ch of lines[i]) {
        if (ch === '"') { inQ = !inQ; }
        else if (ch === "," && !inQ) { cols.push(cur.trim()); cur = ""; }
        else { cur += ch; }
      }
      cols.push(cur.trim());

      const row = {};
      header.forEach((h, j) => { row[h] = (cols[j] || "").replace(/^"|"$/g, "").trim(); });

      if (!row.number || isNaN(+row.number)) { errors.push("Row " + i + ": invalid number"); continue; }
      if (!row.subject) { errors.push("Row " + i + ": missing subject"); continue; }
      if (!row.question_text && !row.equation) { errors.push("Row " + i + ": missing question_text"); continue; }
      if (!row.option_a || !row.option_b || !row.option_c || !row.option_d) { errors.push("Row " + i + ": missing options"); continue; }
      if (row.correct === "" || isNaN(+row.correct)) { errors.push("Row " + i + ": correct must be 0-3"); continue; }

      rows.push({
        number:        +row.number,
        subject:       row.subject,
        type:          row.equation ? "equation" : "text",
        question_text: row.question_text || "",
        equation:      row.equation || "",
        diagram_data:  "",
        diagram_url:   "",
        option_a:      row.option_a,
        option_b:      row.option_b,
        option_c:      row.option_c,
        option_d:      row.option_d,
        correct:       +row.correct,
        solution_text: row.solution_text || "",
        solution_eq:   row.solution_eq   || "",
        chapter:       row.chapter       || "",
        difficulty:    row.difficulty    || "medium",
        paper_id:      row.paper_id || "PAPER_01",
      });
    }
    return { rows, errors, error: null };
  };

  const handleCSVFile = (file) => {
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      setCsvMsg({ type: "error", text: "Please upload a .csv file." });
      return;
    }
    setCsvLoading(true);
    setCsvMsg({ type: "info", text: "Reading CSV..." });
    const reader = new FileReader();
    reader.onload = (e) => {
      const { rows, errors, error } = parseCSV(e.target.result);
      setCsvLoading(false);
      if (error) { setCsvMsg({ type: "error", text: error }); return; }
      setCsvPreview(rows.slice(0, 5));
      const errText = errors.length ? "\nWarnings: " + errors.slice(0, 3).join("; ") : "";
      setCsvMsg({ type: rows.length > 0 ? "success" : "error", text: rows.length + " questions ready to upload." + errText });
      // Store all parsed rows for upload
      csvFileRef._parsed = rows;
    };
    reader.readAsText(file);
  };

  const handleCSVUpload = async (replaceAll) => {
    const rows = csvFileRef._parsed;
    if (!rows || rows.length === 0) { setCsvMsg({ type: "error", text: "No valid rows to upload." }); return; }
    setCsvLoading(true);
    setCsvMsg({ type: "info", text: "Uploading..." });

    if (replaceAll) {
      await supabase.from("questions").delete().eq("paper_id", "PAPER_01");
    }

    // Upload in batches of 50
    let uploaded = 0, failed = 0;
    for (let i = 0; i < rows.length; i += 50) {
      const chunk = rows.slice(i, i + 50);
      const { error } = await supabase.from("questions").insert(chunk);
      if (error) failed += chunk.length;
      else uploaded += chunk.length;
      setCsvMsg({ type: "info", text: "Uploading... " + (uploaded + failed) + "/" + rows.length });
    }

    setCsvLoading(false);
    setCsvPreview([]);
    csvFileRef._parsed = null;
    if (failed > 0) setCsvMsg({ type: "error", text: uploaded + " uploaded, " + failed + " failed. Check for duplicate question numbers." });
    else setCsvMsg({ type: "success", text: uploaded + " questions uploaded successfully!" });
  };

  // Bulk image upload: compress all picked JPGs and match to questions by filename number
  const handleBulkImgFiles = async (files) => {
    setImgBulkMsg({ type: "info", text: "Reading " + files.length + " image files..." });
    const results = [];
    for (const file of Array.from(files)) {
      try {
        const b64 = await new Promise((res, rej) => {
          const img = new Image(), url = URL.createObjectURL(file);
          img.onload = () => {
            URL.revokeObjectURL(url);
            const scale = img.width > 800 ? 800/img.width : 1;
            const cv = document.createElement("canvas");
            cv.width  = Math.round(img.width  * scale);
            cv.height = Math.round(img.height * scale);
            cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
            res(cv.toDataURL("image/jpeg", 0.78));
          };
          img.onerror = () => rej(new Error("Cannot read " + file.name));
          img.src = url;
        });
        results.push({ name: file.name, b64 });
      } catch (e) {
        results.push({ name: file.name, b64: null, err: e.message });
      }
    }
    setImgBulkFiles(results);
    const ok  = results.filter(r => r.b64).length;
    const bad = results.filter(r => !r.b64).length;
    setImgBulkMsg({ type: ok > 0 ? "success" : "error", text: ok + " images ready" + (bad > 0 ? ", " + bad + " failed" : "") + ". Click Upload to save." });
  };

  const handleBulkImgUpload = async () => {
    const ready = imgBulkFiles.filter(r => r.b64);
    if (!ready.length) { setImgBulkMsg({ type: "error", text: "No images loaded. Select files first." }); return; }
    setImgBulkLoading(true);
    let done = 0, fail = 0;
    for (const img of ready) {
      const numMatch = img.name.match(/(\d+)/);
      if (!numMatch) { fail++; continue; }
      const qNum = parseInt(numMatch[1]);
      const { error } = await supabase
        .from("questions")
        .update({ diagram_data: img.b64, type: "diagram" })
        .eq("paper_id", "PAPER_01")
        .eq("number", qNum);
      if (error) fail++; else done++;
      setImgBulkProgress(done + fail + "/" + ready.length);
    }
    setImgBulkLoading(false);
    setImgBulkProgress("");
    setImgBulkFiles([]);
    setImgBulkMsg({ type: done > 0 ? "success" : "error", text: done + " images uploaded." + (fail > 0 ? " " + fail + " failed (no matching Q number found)." : "") });
  };

  // Create student accounts and add to batch in one step
  const createStudentsInBatch = async () => {
    const valid = addStudentRows.filter(r => r.email.includes("@") && r.password.length >= 6);
    if (!valid.length) { setAddStudentMsg({ type:"error", text:"Add at least one student with valid email and password (min 6 chars)." }); return; }
    setAddStudentLoading(true);
    setAddStudentMsg({ type:"info", text:"Creating accounts..." });
    let done = 0, fail = 0, failMsgs = [];
    for (const s of valid) {
      try {
        // Create Supabase auth account
        const { data, error } = await supabase.auth.signUp({
          email: s.email.trim().toLowerCase(),
          password: s.password,
          options: { data: { full_name: s.name.trim() } }
        });
        if (error) { fail++; failMsgs.push(s.email + ": " + error.message); continue; }
        // Add to batch members
        await supabase.from("batch_members").upsert([{ batch_id: selectedBatch.id, email: s.email.trim().toLowerCase() }], { onConflict: "batch_id,email" });
        done++;
      } catch (e) { fail++; failMsgs.push(s.email + ": " + e.message); }
    }
    setAddStudentLoading(false);
    let msg = done + " student(s) created and added to batch.";
    if (fail > 0) msg += " " + fail + " failed: " + failMsgs.slice(0,3).join("; ");
    setAddStudentMsg({ type: done > 0 ? "ok" : "error", text: msg });
    if (done > 0) {
      // Show downloadable credentials summary
      const created = valid.slice(0, done);
      const creds = "email,password,full_name\n" + created.map(s => s.email+","+s.password+","+(s.name||"")).join("\n");
      const blob = new Blob([creds], { type:"text/csv" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = (selectedBatch?.name||"batch").replace(/\s+/g,"_")+"_credentials.csv"; a.click();
      URL.revokeObjectURL(url);
      setAddStudentRows([{ email:"", password:"", name:"" }]);
      loadBatchDetail(selectedBatch);
    }
  };

  // Load tests for selected batch
  const loadBatchTests = async (batchId) => {
    setTestLoading(true);
    const { data } = await supabase.from("batch_tests")
      .select("*")
      .eq("batch_id", batchId)
      .order("created_at", { ascending: false });
    setBatchTests(data || []);
    setTestLoading(false);
  };

  // Create test for batch
  const createBatchTest = async () => {
    if (!testForm.name.trim()) { setTestMsg({ type:"error", text:"Test name required." }); return; }
    if (!selectedBatch) return;
    const { error } = await supabase.from("batch_tests").insert([{
      batch_id: selectedBatch.id, name: testForm.name.trim(),
      description: testForm.description.trim(), paper_id: testForm.paper_id || "PAPER_01",
      exam_window_start: testForm.exam_window_start, exam_window_end: testForm.exam_window_end,
      attempt_limit: +testForm.attempt_limit || 1,
      access_code: testForm.access_code, access_code_enabled: testForm.access_code_enabled,
      resume_code: testForm.resume_code, status: testForm.status || "scheduled",
      manual_release: testForm.manual_release || "false"
    }]);
    if (error) { setTestMsg({ type:"error", text: error.message }); return; }
    setTestMsg({ type:"ok", text:"Test created!" });
    setTestForm({ name:"", description:"", paper_id:"PAPER_01", exam_window_start:"", exam_window_end:"", attempt_limit:"1", access_code:"", access_code_enabled:"false", resume_code:"", status:"scheduled" });
    loadBatchTests(selectedBatch.id);
  };

  // Update test
  const saveTest = async () => {
    if (!selectedTest) return;
    const { error } = await supabase.from("batch_tests").update({
      name: testForm.name, description: testForm.description,
      paper_id: testForm.paper_id, exam_window_start: testForm.exam_window_start,
      exam_window_end: testForm.exam_window_end, attempt_limit: +testForm.attempt_limit || 1,
      access_code: testForm.access_code, access_code_enabled: testForm.access_code_enabled,
      resume_code: testForm.resume_code, status: testForm.status,
      manual_release: testForm.manual_release || "false"
    }).eq("id", selectedTest.id);
    if (error) setTestMsg({ type:"error", text: error.message });
    else { setTestMsg({ type:"ok", text:"Test updated!" }); loadBatchTests(selectedBatch.id); }
  };

  // Delete test
  const deleteTest = async (id) => {
    if (!window.confirm("Delete this test? All attempts linked to it will be unlinked.")) return;
    await supabase.from("batch_tests").delete().eq("id", id);
    loadBatchTests(selectedBatch.id);
  };

  // Load test reports (all student attempts for a specific test)
  const loadTestReports = async (testId) => {
    setTestReportLoading(true);
    const { data } = await supabase.from("test_results")
      .select("id, user_id, student_name, student_email, score, correct, wrong, unattempted, total, created_at, percentile, subject_times")
      .eq("batch_test_id", testId)
      .order("score", { ascending: false });
    setTestReports(data || []);
    setTestReportLoading(false);
  };

  // Download test report as CSV
  const downloadTestReport = (testName, rows) => {
    const header = "Rank,Name,Email,Score,Percentage,Correct,Wrong,Unattempted,Percentile,Date";
    const lines = rows.map((r, i) => {
      const pct = Math.round((r.score / maxMarksOf(r))*100);
      const d   = new Date(r.created_at).toLocaleDateString("en-IN");
      const st  = r.subject_times || {};
      return [i+1, (r.student_name||"").replace(/,/g," "), (r.student_email||""), r.score, pct+"%", r.correct, r.wrong, r.unattempted, r.percentile!=null?r.percentile+"%":"N/A", d].join(",");
    });
    const csv  = header + "\n" + lines.join("\n");
    const blob = new Blob([csv], { type:"text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = testName.replace(/\s+/g,"_") + "_report.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const loadBatches = async () => {
    setBatchLoading(true);
    const { data } = await supabase.from("batches").select("*").order("created_at");
    if (data) setBatches(data);
    setBatchLoading(false);
  };

  // Load batch details (settings + members)
  const loadBatchDetail = async (batch) => {
    setSelectedBatch(batch);
    setBatchView("edit");
    setBatchMsg(null);
    // Load settings
    const { data: s } = await supabase.from("batch_settings").select("*").eq("batch_id", batch.id).single();
    setBatchSettings(s || {
      exam_enabled: "true", access_code: "", access_code_enabled: "false",
      resume_code: "", exam_window_start: "", exam_window_end: "",
      attempt_limit: "0", paper_id: "PAPER_01"
    });
    // Load members
    const { data: m } = await supabase.from("batch_members").select("email").eq("batch_id", batch.id).order("email");
    setBatchMembers(m || []);
  };

  // Create batch
  const createBatch = async () => {
    if (!batchForm.name.trim()) { setBatchMsg({ type:"error", text:"Batch name required." }); return; }
    const { data, error } = await supabase.from("batches").insert([{ name: batchForm.name.trim(), description: batchForm.description.trim() }]).select().single();
    if (error) { setBatchMsg({ type:"error", text: error.message }); return; }
    // Create default settings for new batch
    await supabase.from("batch_settings").insert([{ batch_id: data.id }]);
    setBatchForm({ name:"", description:"" });
    setBatchMsg({ type:"ok", text:"Batch created!" });
    loadBatches();
  };

  // Delete batch
  const deleteBatch = async (id) => {
    if (!window.confirm("Delete this batch? Members will be removed but student accounts remain.")) return;
    await supabase.from("batches").delete().eq("id", id);
    if (selectedBatch?.id === id) { setSelectedBatch(null); setBatchView("list"); }
    loadBatches();
  };

  // Save batch settings
  const saveBatchSettings = async () => {
    if (!selectedBatch) return;
    const { error } = await supabase.from("batch_settings").upsert({ batch_id: selectedBatch.id, ...batchSettings, updated_at: new Date().toISOString() }, { onConflict: "batch_id" });
    if (error) setBatchMsg({ type:"error", text: error.message });
    else setBatchMsg({ type:"ok", text:"Settings saved!" });
  };

  // Add members from textarea (paste emails)
  const addBatchMembers = async () => {
    const emails = batchMemberInput.split(/[,\n\s]+/).map(e => e.trim().toLowerCase()).filter(e => e.includes("@"));
    if (!emails.length) { setBatchMsg({ type:"error", text:"Enter at least one valid email." }); return; }
    const rows = emails.map(email => ({ batch_id: selectedBatch.id, email }));
    const { error } = await supabase.from("batch_members").upsert(rows, { onConflict: "batch_id,email" });
    if (error) setBatchMsg({ type:"error", text: error.message });
    else {
      setBatchMsg({ type:"ok", text: emails.length + " member(s) added." });
      setBatchMemberInput("");
      loadBatchDetail(selectedBatch);
    }
  };

  // Remove member from batch
  const removeBatchMember = async (email) => {
    await supabase.from("batch_members").delete().eq("batch_id", selectedBatch.id).eq("email", email);
    loadBatchDetail(selectedBatch);
  };

  // Add members from CSV file
  const handleBatchMemberCsv = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const emails = e.target.result.split(/[,\n\r\s]+/).map(x => x.trim().replace(/^"|"$/g,"").toLowerCase()).filter(x => x.includes("@"));
      setBatchMemberInput(emails.join("\n"));
      setBatchMsg({ type:"ok", text: emails.length + " emails loaded from CSV. Click Add Members." });
    };
    reader.readAsText(file);
  };

  useEffect(() => { if (tab === "batches") loadBatches(); }, [tab]);

  // Load question analytics
  const [analyticsSubTab,    setAnalyticsSubTab]    = useState("students"); // students | questions
  const [selectedStudent,    setSelectedStudent]    = useState(null); // student object for detail view
  const [availablePapers,    setAvailablePapers]    = useState([]); // all distinct paper IDs in test_results
  const [showPaperDrop,      setShowPaperDrop]      = useState(false); // dropdown visibility

  const loadAnalytics = async () => {
    setAnalyticsLoading(true);
    setAnalyticsData(null);
    const pid = paperFilter || "PAPER_01";

    // Fetch results ONLY for the exact paper ID entered  no fallback
    const { data: results } = await supabase
      .from("test_results")
      .select("id, answers, score, correct, wrong, unattempted, total, subject_times, paper_id, student_name, student_email, test_name, created_at, percentile")
      .eq("paper_id", pid)
      .order("score", { ascending: false })
      .limit(500);

    if (!results || !results.length) {
      setAnalyticsData({ byQ: [], byStudent: [], total: 0, noResults: true, pid });
      setAnalyticsLoading(false);
      return;
    }

    // Per-student summary: group by email, compute avg/max/min/total
    const studentMap = {};
    results.forEach(r => {
      const key = r.student_email || r.id;
      if (!studentMap[key]) {
        studentMap[key] = {
          name:        r.student_name || r.student_email?.split("@")[0] || "Student",
          email:       r.student_email || "",
          scores:      [],
          correct:     [],
          wrong:       [],
          unattempted: [],
          attempts:    0,
          rawResults:  [], // store full result rows for detailed view
        };
      }
      studentMap[key].scores.push(r.score || 0);
      studentMap[key].correct.push(r.correct || 0);
      studentMap[key].wrong.push(r.wrong || 0);
      studentMap[key].unattempted.push(r.unattempted || 0);
      studentMap[key].rawResults.push(r);
      studentMap[key].attempts++;
    });

    const totalMarks = (results[0]?.total || (questions.length || 180)) * MARKS_CORRECT;
    const byStudent = Object.values(studentMap).map(s => {
      const avg   = Math.round(s.scores.reduce((a,b)=>a+b,0) / s.scores.length);
      const max   = Math.max(...s.scores);
      const min   = Math.min(...s.scores);
      return { ...s, avg, max, min, totalMarks, latestScore: s.scores[0] };
    });
    byStudent.sort((a,b) => b.avg - a.avg);

    // Overall class stats
    const allScores   = results.map(r => r.score || 0);
    const classAvg    = Math.round(allScores.reduce((a,b)=>a+b,0) / allScores.length);
    const classMax    = Math.max(...allScores);
    const classMin    = Math.min(...allScores);

    // Per-question stats
    const { data: fullQs } = await supabase
      .from("questions")
      .select("id, number, subject, question_text, correct, paper_id")
      .eq("paper_id", pid)
      .order("number", { ascending: true });

    let byQ = [], resultsWithAnswers = 0;
    if (fullQs && fullQs.length) {
      const stats = {};
      fullQs.forEach(q => { stats[q.id] = { q, attempts:0, correct:0, wrong:0, skip:0 }; });
      results.forEach(r => {
        let ans = r.answers;
        if (typeof ans === "string") { try { ans = JSON.parse(ans); } catch (_) { ans = {}; } }
        if (!ans || typeof ans !== "object") return;
        if (Object.keys(ans).length > 0) resultsWithAnswers++;
        fullQs.forEach(q => {
          if (!stats[q.id]) return;
          const ua = ans[q.id];
          if (ua === undefined || ua === null) stats[q.id].skip++;
          else if (ua === q.correct) stats[q.id].correct++;
          else stats[q.id].wrong++;
          stats[q.id].attempts++;
        });
      });
      byQ = Object.values(stats);
      byQ.sort((a,b) => {
        const accA = a.attempts > 0 ? a.correct/a.attempts : 1;
        const accB = b.attempts > 0 ? b.correct/b.attempts : 1;
        return accA - accB;
      });
    }

    setAnalyticsData({ byQ, byStudent, total: results.length, resultsWithAnswers, classAvg, classMax, classMin, totalMarks });
    setAnalyticsLoading(false);
  };

  // Download student analytics as CSV
  const downloadAnalyticsCSV = () => {
    if (!analyticsData?.byStudent?.length) return;
    const { byStudent, totalMarks, classAvg, classMax, classMin } = analyticsData;
    const lines = [
      "Rank,Name,Attempts,Latest Score,Avg Score,Max Score,Min Score,Total Marks,Avg%",
      ...byStudent.map((s,i) => [
        i+1, (s.name||"").replace(/,/g," "),
        s.attempts, s.latestScore, s.avg, s.max, s.min, totalMarks,
        Math.round(s.avg/totalMarks*100)+"%"
      ].join(",")),
      "",
      "CLASS SUMMARY",
      "Total Students," + byStudent.length,
      "Total Attempts," + analyticsData.total,
      "Class Average," + classAvg + "/" + totalMarks,
      "Highest Score," + classMax + "/" + totalMarks,
      "Lowest Score," + classMin + "/" + totalMarks,
    ];
    const blob = new Blob([lines.join("\n")], { type:"text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = (paperFilter||"PAPER_01") + "_student_analytics.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  // Download student analytics as PDF
  const downloadAnalyticsPDF = () => {
    if (!analyticsData?.byStudent?.length) return;
    const { byStudent, totalMarks, classAvg, classMax, classMin } = analyticsData;
    const pid = paperFilter || "PAPER_01";
    const win = window.open("", "_blank");
    if (!win) { alert("Please allow popups for this site to download PDF reports."); return; }
    const rows = byStudent.map((s,i) => {
      const pct = Math.round(s.avg/totalMarks*100);
      const col = pct>=50?"#16a34a":"#dc2626";
      return "<tr style='border-bottom:1px solid #e5e7eb'>" +
        "<td style='padding:7px 10px;font-weight:700;color:#6b7280'>" + (i+1) + "</td>" +
        "<td style='padding:7px 10px'><div style='font-weight:600'>" + (s.name||"") + "</div><div style='font-size:11px;color:#9ca3af'>" + s.email + "</div></td>" +
        "<td style='padding:7px 10px;text-align:center'>" + s.attempts + "</td>" +
        "<td style='padding:7px 10px;text-align:center;font-weight:700;color:" + col + "'>" + s.latestScore + "<span style='color:#9ca3af;font-weight:400;font-size:10px'>/" + totalMarks + "</span></td>" +
        "<td style='padding:7px 10px;text-align:center;font-weight:700;color:" + col + "'>" + s.avg + "<span style='color:#9ca3af;font-weight:400;font-size:10px'>/" + totalMarks + "</span></td>" +
        "<td style='padding:7px 10px;text-align:center;color:#16a34a;font-weight:600'>" + s.max + "</td>" +
        "<td style='padding:7px 10px;text-align:center;color:#dc2626;font-weight:600'>" + s.min + "</td>" +
        "<td style='padding:7px 10px;text-align:center'><span style='background:" + (pct>=50?"#dcfce7":"#fee2e2") + ";color:" + col + ";padding:2px 8px;border-radius:99px;font-size:12px;font-weight:700'>" + pct + "%</span></td>" +

        "</tr>";
    }).join("");
    win.document.write("<!DOCTYPE html><html><head><title>" + pid + " - Student Analytics</title>" +
      "<style>body{font-family:Arial,sans-serif;padding:24px;color:#111;max-width:1100px;margin:0 auto}" +
      "h1{color:#1e1b4b;border-bottom:3px solid #6366f1;padding-bottom:8px}" +
      "table{width:100%;border-collapse:collapse;font-size:13px}" +
      "th{background:#312e81;color:#fff;padding:9px 10px;text-align:left;font-size:12px}" +
      ".stat{display:inline-block;margin:6px 10px 6px 0;padding:10px 18px;background:#f3f4f6;border-radius:8px;text-align:center}" +
      ".big{font-size:1.5em;font-weight:bold;color:#312e81}" +
      ".lbl{font-size:11px;color:#6b7280;margin-top:2px}" +
      "@media print{.noprint{display:none}}</style></head><body>" +
      "<h1>Student Analytics Report - " + pid + "</h1>" +
      "<p style='color:#6b7280;font-size:13px'>Generated " + new Date().toLocaleString("en-IN") + " &nbsp;|&nbsp; " + analyticsData.total + " attempt(s) &nbsp;|&nbsp; " + byStudent.length + " student(s)</p>" +
      "<div class='noprint' style='margin:8px 0 20px'><button onclick='window.print()' style='background:#312e81;color:#fff;border:none;padding:12px 32px;border-radius:8px;font-size:15px;cursor:pointer'>Print / Save as PDF</button></div>" +
      "<div style='margin:16px 0 24px'>" +
      "<div class='stat'><div class='big'>" + byStudent.length + "</div><div class='lbl'>Students</div></div>" +
      "<div class='stat'><div class='big'>" + analyticsData.total + "</div><div class='lbl'>Total Attempts</div></div>" +
      "<div class='stat'><div class='big'>" + totalMarks + "</div><div class='lbl'>Max Marks</div></div>" +
      "<div class='stat'><div class='big' style='color:#16a34a'>" + classMax + "</div><div class='lbl'>Highest Score</div></div>" +
      "<div class='stat'><div class='big' style='color:#6366f1'>" + classAvg + "</div><div class='lbl'>Class Average</div></div>" +
      "<div class='stat'><div class='big' style='color:#dc2626'>" + classMin + "</div><div class='lbl'>Lowest Score</div></div>" +
      "</div>" +
      "<table><thead><tr><th>#</th><th>Student</th><th>Attempts</th><th>Latest</th><th>Average</th><th>Best</th><th>Lowest</th><th>Avg%</th></tr></thead>" +
      "<tbody>" + rows + "</tbody></table>" +
      "</body></html>");
    win.document.close();
  };

  // Generate per-student PDF report (same format as student sees after exam)
  const downloadStudentPDF = (student, questions, existingWin = null, classData = null) => {
    if (!student || !questions?.length) {
      if (existingWin) existingWin.document.write("<html><body><p>No questions found for this paper.</p></body></html>");
      return;
    }
    // Use most recent attempt
    const result = student.rawResults[0];
    if (!result) {
      if (existingWin) existingWin.document.write("<html><body><p>No result data found.</p></body></html>");
      return;
    }
    let answers = result.answers;
    if (typeof answers === "string") { try { answers = JSON.parse(answers); } catch (_) { answers = {}; } }
    answers = answers || {};
    const subTimes = result.subject_times || {};
    const OPTS = ["A","B","C","D"];
    const SUBJECTS = subjectsFrom(questions);
    const correct    = result.correct || 0;
    const wrong      = result.wrong || 0;
    const unattempted= result.unattempted || 0;
    const score      = result.score || 0;
    const totalMarks = (result.total || questions.length) * MARKS_CORRECT;
    const pct        = Math.round(score / totalMarks * 100);

    const predictRankLocal = (sc) => {
      if (sc >= 700) return "Under 100";
      if (sc >= 650) return "100 - 1,000";
      if (sc >= 600) return "1,000 - 10,000";
      if (sc >= 540) return "10,000 - 50,000";
      if (sc >= 500) return "50,000 - 1,00,000";
      if (sc >= 450) return "1,00,000 - 2,50,000";
      if (sc >= 400) return "2,50,000 - 5,00,000";
      if (sc >= 360) return "5,00,000 - 8,00,000";
      return "Above 8,00,000";
    };

    // Per-subject stats for this student
    const subjData = SUBJECTS.map(s => {
      const sq = questions.filter(q => q.subject === s);
      const c  = sq.filter(q => answers[q.id] === q.correct).length;
      const w  = sq.filter(q => answers[q.id] !== undefined && answers[q.id] !== q.correct).length;
      const u  = sq.filter(q => answers[q.id] === undefined).length;
      const sc = c * 4 + w * (-1);
      const t  = subTimes[s] || 0;
      return { s, c, w, u, sc, t };
    });

    // Class averages per subject (from classData passed in)
    // classData.byStudent has rawResults per student
    const classSubjAvg = {};
    const classSubjMax = {};
    if (classData?.byStudent?.length > 1) {
      SUBJECTS.forEach(sub => {
        const subScores = classData.byStudent
          .filter(st => st.email !== student.email) // exclude this student
          .map(st => {
            const r0 = st.rawResults[0];
            if (!r0) return null;
            let a = r0.answers;
            if (typeof a === "string") { try { a = JSON.parse(a); } catch(_){ a={}; } }
            a = a || {};
            const sq = questions.filter(q => q.subject === sub);
            const c  = sq.filter(q => a[q.id] === q.correct).length;
            const w  = sq.filter(q => a[q.id] !== undefined && a[q.id] !== q.correct).length;
            return c * 4 + w * (-1);
          }).filter(v => v !== null);
        if (subScores.length) {
          classSubjAvg[sub] = Math.round(subScores.reduce((a,b)=>a+b,0) / subScores.length);
          classSubjMax[sub] = Math.max(...subScores);
        }
      });
    }

    // Class total avg/max excluding this student
    const classAllScores = classData?.byStudent
      ?.filter(st => st.email !== student.email)
      ?.map(st => st.avg) || [];
    const classAvgTotal = classAllScores.length ? Math.round(classAllScores.reduce((a,b)=>a+b,0)/classAllScores.length) : null;
    const classMaxTotal = classAllScores.length ? Math.max(...classAllScores) : null;
    const classCount    = classAllScores.length;

    const subjSummary = subjData.map(({ s, c, w, u, sc, t }) => {
      const avg = classSubjAvg[s] != null ? classSubjAvg[s] : "-";
      const max = classSubjMax[s] != null ? classSubjMax[s] : "-";
      return "<tr>" +
        "<td><b>" + s + "</b></td>" +
        "<td style='color:green'>" + c + "</td>" +
        "<td style='color:red'>" + w + "</td>" +
        "<td style='color:gray'>" + u + "</td>" +
        "<td><b>" + sc + "</b></td>" +
        "<td>" + Math.floor(t/60) + "m " + (t%60) + "s</td>" +
        "<td style='color:#6366f1;font-weight:600'>" + avg + "</td>" +
        "<td style='color:#0891b2;font-weight:600'>" + max + "</td>" +
        "</tr>";
    }).join("");

    const qRows = questions.map(q => {
      const ua    = answers[q.id];
      const isC   = ua === q.correct;
      const isW   = ua !== undefined && !isC;
      const status = isC ? "CORRECT" : isW ? "WRONG" : "UNATTEMPTED";
      const marks  = isC ? "+4" : isW ? "-1" : "0";
      const color  = isC ? "#16a34a" : isW ? "#dc2626" : "#6b7280";
      const optRows = ["a","b","c","d"].map((lt, i) => {
        const optText = q["option_" + lt] || "";
        const optImg  = q["option_" + lt + "_image"] || "";
        const isAns   = ua === i;
        const isRight = q.correct === i;
        let bg = "transparent";
        if (isRight) bg = "#dcfce7";
        if (isAns && !isRight) bg = "#fee2e2";
        const imgTag = optImg ? "<br/><img src='" + optImg + "' style='max-height:80px;max-width:200px;object-fit:contain;margin-top:4px;display:block;border-radius:4px;'/>" : "";
        return "<div style='padding:6px 10px;margin:3px 0;background:" + bg + ";border-radius:4px;font-size:12px'>" +
          "<b>" + OPTS[i] + ") </b>" + optText + imgTag +
          (isRight ? " <span style='color:green'>(correct)</span>" : "") +
          (isAns && !isRight ? " <span style='color:red'>(your answer)</span>" : "") +
          "</div>";
      }).join("");
      return "<div style='margin-bottom:18px;padding:14px;border:1px solid #e5e7eb;border-left:4px solid " + color + ";border-radius:6px;page-break-inside:avoid'>" +
        "<div style='display:flex;justify-content:space-between;margin-bottom:8px'>" +
        "<span style='font-weight:700;color:#374151'>Q" + q.number + " &nbsp;<span style='background:#f3f4f6;padding:2px 8px;border-radius:4px;font-size:11px'>" + q.subject + "</span></span>" +
        "<span style='background:" + (isC?"#dcfce7":isW?"#fee2e2":"#f9fafb") + ";color:" + color + ";padding:3px 10px;border-radius:99px;font-size:12px;font-weight:700'>" + status + " " + marks + "</span>" +
        "</div>" +
        "<p style='margin:0 0 10px;font-size:13px;color:#1f2937'>" + (q.question_text || q.equation || "") + "</p>" +
        optRows +
        (q.solution_text ? "<div style='margin-top:10px;padding:8px 12px;background:#eff6ff;border-radius:4px;font-size:12px;color:#1e40af'><b>Solution: </b>" + q.solution_text + "</div>" : "") +
        "</div>";
    }).join("");

    const win = existingWin || window.open("", "_blank");
    if (!win) { alert("Please allow popups for this site to view PDF reports."); return; }
    win.document.write("<!DOCTYPE html><html><head><title>" + student.name + " - Report</title><style>" +
      "body{font-family:Arial,sans-serif;padding:24px;color:#111;max-width:900px;margin:0 auto}" +
      "h1{color:#1e1b4b;border-bottom:3px solid #6366f1;padding-bottom:8px}" +
      "h2{color:#312e81;margin-top:28px}" +
      ".stat{display:inline-block;margin:8px;padding:12px 20px;background:#f3f4f6;border-radius:10px;text-align:center;min-width:100px}" +
      ".big{font-size:1.8em;font-weight:bold;color:#312e81}" +
      ".lbl{font-size:11px;color:#6b7280;margin-top:2px}" +
      "table{width:100%;border-collapse:collapse;margin-top:10px}" +
      "th{background:#312e81;color:#fff;padding:8px 10px;font-size:12px;text-align:left}" +
      "td{padding:7px 10px;font-size:12px;border-bottom:1px solid #f3f4f6}" +
      "@media print{.noprint{display:none}}" +
      "</style></head><body>" +
      "<h1>" + student.name + " - Exam Report</h1>" +
      "<p style='color:#6b7280;font-size:13px'>Paper: " + (result.paper_id||paperFilter||"") + " &nbsp;|&nbsp; Test: " + (result.test_name||"Mock Test") + " &nbsp;|&nbsp; Date: " + new Date(result.created_at).toLocaleDateString("en-IN") + " &nbsp;|&nbsp; Generated: " + new Date().toLocaleString("en-IN") + "</p>" +
      "<div class='noprint' style='margin:8px 0 20px'><button onclick='window.print()' style='background:#312e81;color:#fff;border:none;padding:12px 32px;border-radius:8px;font-size:15px;cursor:pointer'>Print / Save as PDF</button></div>" +
      "<div style='margin:16px 0'>" +
      "<div class='stat'><div class='big'>" + score + "</div><div class='lbl'>Score / " + totalMarks + "</div></div>" +
      "<div class='stat'><div class='big'>" + pct + "%</div><div class='lbl'>Percentage</div></div>" +
      "<div class='stat'><div class='big'>" + correct + "</div><div class='lbl'>Correct</div></div>" +
      "<div class='stat'><div class='big'>" + wrong + "</div><div class='lbl'>Wrong</div></div>" +
      "<div class='stat'><div class='big'>" + unattempted + "</div><div class='lbl'>Unattempted</div></div>" +
      (result.percentile != null ? "<div class='stat'><div class='big'>" + result.percentile + "%</div><div class='lbl'>Percentile</div></div>" : "") +
      "<div class='stat'><div class='big' style='font-size:1.1em'>" + predictRankLocal(score) + "</div><div class='lbl'>Predicted Rank</div></div>" +
      "</div>" +
      "<h2>Subject-wise Performance</h2>" +
      "<table><tr><th>Subject</th><th>Correct</th><th>Wrong</th><th>Unattempted</th><th>Score</th><th>Time</th><th style='background:#4338ca'>Class Avg</th><th style='background:#0e7490'>Class Max</th></tr>" + subjSummary + "</table>" +
      (classCount > 0 ?
      "<h2>Class Comparison</h2>" +
      "<div style='display:flex;gap:12px;flex-wrap:wrap;margin:12px 0'>" +
      "<div style='padding:12px 20px;background:#f3f4f6;border-radius:8px;text-align:center;min-width:110px'><div style='font-size:1.5em;font-weight:bold;color:#312e81'>" + score + "<span style=\'font-size:0.55em;color:#9ca3af\'>/" + totalMarks + "</span></div><div style=\'font-size:11px;color:#6b7280\'>This Student</div></div>" +
      "<div style='padding:12px 20px;background:#eff6ff;border-radius:8px;text-align:center;min-width:110px;border:1px solid #bfdbfe'><div style='font-size:1.5em;font-weight:bold;color:#1d4ed8'>" + (classAvgTotal != null ? classAvgTotal : "-") + "<span style=\'font-size:0.55em;color:#9ca3af\'>/" + totalMarks + "</span></div><div style=\'font-size:11px;color:#6b7280\'>Class Avg (" + classCount + " students)</div></div>" +
      "<div style='padding:12px 20px;background:#ecfdf5;border-radius:8px;text-align:center;min-width:110px;border:1px solid #a7f3d0'><div style='font-size:1.5em;font-weight:bold;color:#059669'>" + (classMaxTotal != null ? classMaxTotal : "-") + "<span style=\'font-size:0.55em;color:#9ca3af\'>/" + totalMarks + "</span></div><div style=\'font-size:11px;color:#6b7280\'>Class Highest</div></div>" +
      "</div>"
      : "") +
      "<h2>All Questions with Solutions</h2>" +
      "<p style='font-size:12px;color:#6b7280;margin-bottom:16px'>Green = correct &nbsp;|&nbsp; Red = wrong &nbsp;|&nbsp; Gray = unattempted</p>" +
      qRows +
      "</body></html>");
    win.document.close();
  };

  useEffect(() => {
    if (tab === "analytics") {
      loadAnalytics();
      // Load all distinct paper IDs for the dropdown
      supabase.from("test_results")
        .select("paper_id")
        .then(({ data }) => {
          if (data) {
            const ids = [...new Set(data.map(r => r.paper_id).filter(Boolean))].sort();
            setAvailablePapers(ids);
          }
        });
    }
  }, [tab]);

  // Parse student CSV: email, password, full_name
  // Parse student CSV: email, password, full_name
  const parseStudentCSV = (text) => {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return { rows: [], err: "Need header row + data rows." };
    const header = lines[0].split(",").map(h => h.trim().toLowerCase());
    if (!header.includes("email")) return { rows: [], err: "CSV must have an 'email' column." };
    if (!header.includes("password")) return { rows: [], err: "CSV must have a 'password' column." };
    const rows = [], errs = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map(c => c.trim().replace(/^"|"$/g, ""));
      const row  = {};
      header.forEach((h, j) => { row[h] = cols[j] || ""; });
      if (!row.email || !row.email.includes("@")) { errs.push("Row " + i + ": invalid email"); continue; }
      if (!row.password || row.password.length < 6) { errs.push("Row " + i + ": password must be 6+ chars"); continue; }
      rows.push({ email: row.email.toLowerCase(), password: row.password, full_name: row.full_name || row.name || "" });
    }
    return { rows, errs, err: null };
  };

  const handleStudentCSVFile = (file) => {
    if (!file || !file.name.endsWith(".csv")) { setStuCsvMsg({ type: "error", text: "Upload a .csv file." }); return; }
    setStuCsvLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const { rows, errs, err } = parseStudentCSV(e.target.result);
      setStuCsvLoading(false);
      if (err) { setStuCsvMsg({ type: "error", text: err }); return; }
      setStuCsvRows(rows);
      setStuCsvPreview(rows.slice(0, 5));
      setStuCsvMsg({ type: rows.length > 0 ? "success" : "error", text: rows.length + " students ready to create." + (errs?.length ? " Warnings: " + errs.slice(0, 3).join("; ") : "") });
    };
    reader.readAsText(file);
  };

  const handleStudentCSVUpload = async () => {
    if (!stuCsvRows || !stuCsvRows.length) return;
    setStuCsvLoading(true);
    let done = 0, fail = 0, failDetails = [];
    for (const student of stuCsvRows) {
      setStuCsvProgress(done + fail + "/" + stuCsvRows.length);
      try {
        // Use Supabase admin signUp - creates account directly
        const { data, error } = await supabase.auth.signUp({
          email: student.email,
          password: student.password,
          options: { data: { full_name: student.full_name } }
        });
        if (error) { fail++; failDetails.push(student.email + ": " + error.message); }
        else done++;
      } catch (e) { fail++; failDetails.push(student.email + ": " + e.message); }
    }
    setStuCsvLoading(false);
    setStuCsvProgress("");
    setStuCsvRows(null);
    setStuCsvPreview([]);
    let txt = done + " students created successfully.";
    if (fail > 0) txt += " " + fail + " failed.";
    if (failDetails.length) txt += "\n" + failDetails.slice(0, 5).join("\n");
    setStuCsvMsg({ type: done > 0 ? "success" : "error", text: txt });
  };

  const saveBranding = async () => {
    setBrandingLoading(true);
    setBrandingMsg({ type: "info", text: "Saving..." });

    const errors = [];

    // Save each key one by one using DELETE + INSERT to avoid any upsert/conflict issues
    // This is the most reliable approach regardless of table constraints
    for (const [key, value] of Object.entries(brandingForm)) {
      // Skip saving logo_data if it is extremely large (>800KB base64 string)
      // Large logos should use logo_url instead
      if (key === "logo_data" && value && value.length > 800000) {
        setBrandingMsg({ type: "error", text: "Logo image is too large (" + Math.round(value.length/1024) + "KB). Please use a smaller image (under 600KB) or use a URL instead." });
        setBrandingLoading(false);
        return;
      }

      // Try UPDATE first
      const { data: existing } = await supabase
        .from("branding")
        .select("key")
        .eq("key", key)
        .maybeSingle();

      if (existing) {
        // Row exists  UPDATE it
        const { error } = await supabase
          .from("branding")
          .update({ value: value || "" })
          .eq("key", key);
        if (error) errors.push(key + ": " + error.message);
      } else {
        // Row does not exist  INSERT it
        const { error } = await supabase
          .from("branding")
          .insert({ key, value: value || "" });
        if (error) errors.push(key + ": " + error.message);
      }
    }

    setBrandingLoading(false);

    if (errors.length) {
      setBrandingMsg({ type: "error", text: "Save failed: " + errors.slice(0, 5).join(", ") });
      return;
    }

    // Update localStorage cache so next visit gets fresh branding instantly
    try { localStorage.setItem("neet_branding_cache", JSON.stringify(brandingForm)); } catch (_) {}

    // Notify root App (same tab) to update branding state without page reload
    try {
      window.dispatchEvent(new StorageEvent("storage", {
        key: "neet_branding_cache",
        newValue: JSON.stringify(brandingForm),
        storageArea: localStorage,
      }));
    } catch (_) {}

    setBrandingMsg({ type: "success", text: "Branding saved! Changes are live on the landing page." });
  };

  //  Styles 
  const mstyle = (m) => !m ? {} : {
    borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 14, whiteSpace: "pre-line",
    background: m.type === "error" ? "rgba(239,68,68,0.1)" : (m.type === "success" || m.type === "ok") ? "rgba(34,197,94,0.1)" : "rgba(99,102,241,0.1)",
    border: "1px solid " + (m.type === "error" ? "rgba(239,68,68,0.3)" : (m.type === "success" || m.type === "ok") ? "rgba(34,197,94,0.3)" : "rgba(99,102,241,0.3)"),
    color: m.type === "error" ? "#f87171" : (m.type === "success" || m.type === "ok") ? "#4ade80" : "#a5b4fc",
  };

  const settingInput = { ...ainput, fontSize: 13, padding: "8px 12px" };
  const filtered = questions.filter(q => (subFilter === "All" || q.subject === subFilter) && (!search || String(q.number).includes(search) || (q.question_text || "").toLowerCase().includes(search.toLowerCase())));

  return (
    <div style={{ minHeight: "100vh", background: "#070d1a", fontFamily: "Georgia, serif", color: "#e2e8f0" }}>
      
      <div style={{ background: "#0f172a", borderBottom: "1px solid rgba(168,85,247,0.2)", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ color: "#c084fc", fontWeight: 700, fontSize: "1rem" }}>CBT Admin Panel</span>
        <button onClick={onSignOut} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171", borderRadius: 8, padding: "7px 16px", cursor: "pointer", fontSize: 13, fontFamily: "inherit", fontWeight: 600 }}>Sign Out</button>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: 20 }}>
        
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {[["add","Add Question"],["csv","CSV Upload"],["scan","Scan Paper "],["list","All Questions (" + questions.length + ")"],["settings","Exam Settings"],["batches","Batches"],["students","Student Data"],["analytics","Analytics"],["branding","Branding"]].map(([t,l]) => (
            <button key={t} onClick={() => setTab(t)} style={abtn(tab===t?"primary":"ghost")}>{l + (t==="list" ? " (" + questions.length + ")" : "")}</button>
          ))}
        </div>

        
        {tab === "add" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {msg && <div style={mstyle(msg)}>{msg.text}</div>}
            {editId && (
              <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 10, padding: "10px 14px", color: "#fbbf24", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>{"Editing Q" + form.number + " - " + form.subject}</span>
                <button onClick={() => { setForm(aempty()); setEditId(null); setImgInfo(null); }} style={abtn("sm")}>Cancel</button>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 12 }}>
              <div>
                <label style={alabel}>Q Number</label>
                <input type="number" min="1" max="180" value={form.number} onChange={e => ff("number", e.target.value)} placeholder="e.g. 5" style={ainput} />
              </div>
              <div>
                <label style={alabel}>Subject</label>
                <select value={form.subject} onChange={e => ff("subject", e.target.value)} style={{ ...ainput, cursor: "pointer" }}>
                  {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={alabel}>Question Text</label>
              <textarea rows={3} value={form.question_text} onChange={e => ff("question_text", e.target.value)} placeholder="Question here. LaTeX inline: $E = mc^2$" style={{ ...ainput, resize: "vertical", lineHeight: 1.65 }} />
            </div>
            <div>
              <label style={alabel}>Equation - LaTeX (optional)</label>
              <input value={form.equation} onChange={e => ff("equation", e.target.value)} placeholder="e.g. $$\\frac{1}{2}mv^2$$" style={{ ...ainput, fontFamily: "monospace", fontSize: 12 }} />
            </div>
            <div>
              <label style={alabel}>Diagram Image - JPG/PNG (stored in database)</label>
              <div onClick={() => afileRef.current && afileRef.current.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); handleImg(e.dataTransfer.files[0]); }}
                style={{ border: "2px dashed " + (form.diagram_data ? "rgba(34,197,94,0.4)" : "rgba(99,102,241,0.3)"), borderRadius: 12, padding: form.diagram_data ? 10 : 24, textAlign: "center", cursor: "pointer", background: form.diagram_data ? "rgba(34,197,94,0.05)" : "rgba(99,102,241,0.04)" }}>
                {form.diagram_data ? (
                  <div>
                    <img src={form.diagram_data} alt="preview" style={{ maxHeight: 200, maxWidth: "100%", objectFit: "contain", borderRadius: 8, display: "block", margin: "0 auto 8px" }} />
                    <div style={{ color: "#4ade80", fontSize: 12, marginBottom: 8 }}>{"Image loaded" + (imgInfo ? " - " + imgInfo.w + "x" + imgInfo.h + "px, " + imgInfo.kb + "KB" : "")}</div>
                    <div style={{ display:"flex", gap:8 }}>
                      <button onClick={e => { e.stopPropagation(); afileRef.current && afileRef.current.click(); }} style={{ ...abtn("primary"), padding: "5px 14px", fontSize: 12 }}>Replace Image</button>
                      <button onClick={e => { e.stopPropagation(); ff("diagram_data", ""); setImgInfo(null); }} style={{ ...abtn("danger"), padding: "5px 14px", fontSize: 12 }}>Remove</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>[ img ]</div>
                    <div style={{ color: "#94a3b8", fontSize: 14 }}>Click or drag and drop JPG/PNG</div>
                    <div style={{ color: "#475569", fontSize: 12, marginTop: 4 }}>Auto-compressed, stored in database</div>
                  </div>
                )}
              </div>
              <input ref={afileRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" style={{ display: "none" }} onChange={e => handleImg(e.target.files[0])} />
            </div>
            <div>
              <label style={alabel}>Options - click circle to mark correct answer</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {["a","b","c","d"].map((lt, i) => {
                  const ok = String(i) === form.correct;
                  const imgKey = "option_" + lt + "_image";
                  const hasImg = !!form[imgKey];
                  return (
                    <div key={lt} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      {/* Correct answer circle */}
                      <div onClick={() => ff("correct", String(i))}
                        style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0, marginTop: 8, display: "flex", alignItems: "center", justifyContent: "center", background: ok ? "#22c55e" : "rgba(255,255,255,0.07)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", border: ok ? "2px solid #4ade80" : "2px solid transparent" }}>
                        {lt.toUpperCase()}
                      </div>
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                        {/* Option text */}
                        <input value={form["option_" + lt]} onChange={e => ff("option_" + lt, e.target.value)}
                          placeholder={"Option " + lt.toUpperCase() + (ok ? " (correct)" : "") + "  text or leave blank if image only"}
                          style={{ ...ainput, borderColor: ok ? "rgba(34,197,94,0.4)" : undefined }} />
                        {/* Option image */}
                        {hasImg ? (
                          <div style={{ display: "flex", gap: 8, alignItems: "center", background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 8, padding: "6px 10px" }}>
                            <img src={form[imgKey]} alt={"opt " + lt.toUpperCase()} style={{ maxHeight: 60, maxWidth: 160, objectFit: "contain", borderRadius: 4 }} />
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              <button onClick={() => { const inp=document.createElement("input"); inp.type="file"; inp.accept="image/*"; inp.onchange=async e=>{ const f=e.target.files[0]; if(!f) return; try { const {b64}=await compressToBase64(f); ff(imgKey,b64); } catch(_){} }; inp.click(); }}
                                style={{ ...abtn("primary"), fontSize: 10, padding: "3px 10px" }}>Replace</button>
                              <button onClick={() => ff(imgKey, "")}
                                style={{ ...abtn("danger"), fontSize: 10, padding: "3px 10px" }}>Remove</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => { const inp=document.createElement("input"); inp.type="file"; inp.accept="image/*"; inp.onchange=async e=>{ const f=e.target.files[0]; if(!f) return; try { const {b64}=await compressToBase64(f); ff(imgKey,b64); } catch(_){} }; inp.click(); }}
                            style={{ ...abtn("ghost"), fontSize: 11, padding: "5px 12px", alignSelf: "flex-start" }}>
                            + Add Image to Option {lt.toUpperCase()}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ color: "#475569", fontSize: 11, marginTop: 2 }}>{"Correct: Option " + ["A","B","C","D"][+form.correct]}  click the circle to set</div>
            </div>
            <div>
              <label style={alabel}>Solution</label>
              <textarea rows={2} value={form.solution_text} onChange={e => ff("solution_text", e.target.value)} placeholder="Explain the correct answer..." style={{ ...ainput, resize: "vertical", lineHeight: 1.6 }} />
            </div>
            <div>
              <label style={alabel}>Solution Equation - LaTeX (optional)</label>
              <input value={form.solution_eq} onChange={e => ff("solution_eq", e.target.value)} placeholder="e.g. $KE = \\frac{1}{2}mv^2$" style={{ ...ainput, fontFamily: "monospace", fontSize: 12 }} />
            </div>
            <div>
              <label style={alabel}>Solution Diagram Image (optional)</label>
              <div
                onClick={() => { const inp=document.createElement("input"); inp.type="file"; inp.accept="image/jpeg,image/jpg,image/png,image/webp"; inp.onchange=async e=>{ const f=e.target.files[0]; if(!f) return; setMsg({type:"info",text:"Compressing..."}); try { const {b64,kb,w,h}=await compressToBase64(f); ff("solution_diagram_data",b64); setMsg({type:"success",text:"Solution image ready - "+w+"x"+h+"px, "+kb+"KB"}); } catch(ex){setMsg({type:"error",text:ex.message});} }; inp.click(); }}
                onDragOver={e=>e.preventDefault()}
                onDrop={async e=>{ e.preventDefault(); const f=e.dataTransfer.files[0]; if(!f) return; try { const {b64,kb,w,h}=await compressToBase64(f); ff("solution_diagram_data",b64); setMsg({type:"success",text:"Solution image ready - "+w+"x"+h+"px, "+kb+"KB"}); } catch(ex){setMsg({type:"error",text:ex.message});} }}
                style={{ border:"2px dashed "+(form.solution_diagram_data?"rgba(99,102,241,0.5)":"rgba(99,102,241,0.2)"), borderRadius:8, padding:form.solution_diagram_data?8:14, textAlign:"center", cursor:"pointer", background:"rgba(99,102,241,0.03)", marginTop:4 }}>
                {form.solution_diagram_data ? (
                  <div>
                    <img src={form.solution_diagram_data} alt="sol" style={{ maxHeight:120, maxWidth:"100%", objectFit:"contain", borderRadius:6, display:"block", margin:"0 auto 6px" }} />
                    <div style={{ fontSize:11, color:"#4ade80", marginBottom:6 }}>Solution image ready</div>
                    <div style={{ display:"flex", gap:8 }}>
                      <button onClick={e=>{ e.stopPropagation(); const inp=document.createElement("input"); inp.type="file"; inp.accept="image/jpeg,image/jpg,image/png,image/webp"; inp.onchange=async ev=>{ try { const {b64,kb,w,h}=await compressToBase64(ev.target.files[0]); ff("solution_diagram_data",b64); setMsg({type:"success",text:"Solution image replaced - "+w+"x"+h+"px, "+kb+"KB"}); } catch(ex){} }; inp.click(); }} style={{ ...abtn("primary"), padding:"4px 12px", fontSize:11 }}>Replace</button>
                      <button onClick={e=>{ e.stopPropagation(); ff("solution_diagram_data",""); }} style={{ ...abtn("danger"), padding:"4px 12px", fontSize:11 }}>Remove</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ color:"#64748b", fontSize:12 }}>Click or drag JPG/PNG for solution diagram</div>
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
              <button onClick={handleSave} disabled={loading} style={{ ...abtn("success"), flex: 1, padding: "13px", fontSize: "1rem", opacity: loading ? 0.6 : 1 }}>
                {loading ? "Saving..." : editId ? "Update Question" : "Save Question"}
              </button>
              <button onClick={() => { setForm(aempty()); setEditId(null); setImgInfo(null); setMsg(null); }} style={abtn("ghost")}>Reset</button>
            </div>
          </div>
        )}

       
        {tab === "csv" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {csvMsg && <div style={mstyle(csvMsg)}>{csvMsg.text}</div>}

            
            <div style={{ ...acard, padding: "18px 20px" }}>
              <div style={{ color: "#a5b4fc", fontWeight: 700, marginBottom: 12, fontSize: "0.95rem" }}>CSV Format Guide</div>
              <p style={{ color: "#94a3b8", fontSize: 13, margin: "0 0 10px" }}>Your CSV file must have a header row with these exact column names:</p>
              <div style={{ background: "#070d1a", borderRadius: 8, padding: "12px 14px", fontFamily: "monospace", fontSize: 12, color: "#86efac", marginBottom: 12, overflowX: "auto" }}>
                number,subject,question_text,equation,option_a,option_b,option_c,option_d,correct,solution_text,solution_eq,chapter,difficulty,paper_id
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  ["number", "1 to 180 (integer)"],
                  ["subject", "Physics / Chemistry / Botany / Zoology"],
                  ["question_text", "Main question sentence"],
                  ["equation", "LaTeX e.g. $E=mc^2$ (leave blank if none)"],
                  ["option_a to d", "Text for each option"],
                  ["correct", "0=A, 1=B, 2=C, 3=D"],
                  ["solution_text", "Explanation of answer"],
                  ["chapter", "Topic name (optional)"],
                  ["difficulty", "easy / medium / hard (optional)"],
                  ["paper_id", "Test ID e.g. PAPER_01 (optional, defaults to PAPER_01)"],
                ].map(([k,v]) => (
                  <div key={k} style={{ fontSize: 12 }}>
                    <span style={{ color: "#fbbf24", fontFamily: "monospace" }}>{k}</span>
                    <span style={{ color: "#64748b" }}> - {v}</span>
                  </div>
                ))}
              </div>

              
              <button
                onClick={() => {
                  const sample = "number,subject,question_text,equation,image,option_a,option_b,option_c,option_d,correct,solution_text,solution_eq,chapter,difficulty,paper_id\n" +
                    "1,Physics,A ball thrown at 20 m/s max height (g=10):,,q1.jpg,10 m,20 m,30 m,40 m,1,h=u2/2g=20 m.,$h=\\frac{u^2}{2g}$,Kinematics,easy,PAPER_01\n" +
                    "2,Chemistry,Hybridization of carbon in diamond:,,,sp,sp2,sp3,sp3d,2,4 sigma bonds so sp3.,,Bonding,medium,PAPER_01\n" +
                    "3,Physics,SI unit of electric field:,,,C/m,N/C,N.m,J/C2,1,E=F/q so N/C.,,Electrostatics,easy,PAPER_02\n";
                  const blob = new Blob([sample], { type: "text/csv" });
                  const url  = URL.createObjectURL(blob);
                  const a    = document.createElement("a");
                  a.href = url; a.download = "sample_questions.csv"; a.click();
                  URL.revokeObjectURL(url);
                }}
                style={{ ...abtn("ghost"), marginTop: 14, fontSize: 12 }}
              >
                Download Sample CSV
              </button>
            </div>

            
            <div
              onClick={() => { const inp = document.createElement("input"); inp.type="file"; inp.accept=".csv"; inp.onchange=e=>handleCSVFile(e.target.files[0]); inp.click(); }}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleCSVFile(e.dataTransfer.files[0]); }}
              style={{ border: "2px dashed rgba(99,102,241,0.4)", borderRadius: 14, padding: 32, textAlign: "center", cursor: "pointer", background: "rgba(99,102,241,0.04)" }}
            >
              <div style={{ fontSize: 40, marginBottom: 10 }}>[ CSV ]</div>
              <div style={{ color: "#94a3b8", fontSize: 15, marginBottom: 6 }}>Click or drag and drop your CSV file here</div>
              <div style={{ color: "#475569", fontSize: 13 }}>Max 500 questions per upload</div>
            </div>

           
            {csvPreview.length > 0 && (
              <div style={{ ...acard }}>
                <div style={{ color: "#a5b4fc", fontWeight: 700, marginBottom: 10, fontSize: "0.9rem" }}>Preview (first 5 rows)</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {csvPreview.map((q, i) => (
                    <div key={i} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "10px 12px", fontSize: 12 }}>
                      <span style={{ color: "#fbbf24", marginRight: 8 }}>Q{q.number}</span>
                      <span style={{ color: "#818cf8", marginRight: 8 }}>{q.subject}</span>
                      <span style={{ color: "#c7d2fe" }}>{(q.question_text || q.equation || "").slice(0, 80)}</span>
                      <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
                        {[q.option_a,q.option_b,q.option_c,q.option_d].map((o,j) => (
                          <span key={j} style={{ color: j===q.correct?"#4ade80":"#64748b", background: j===q.correct?"rgba(34,197,94,0.1)":"rgba(255,255,255,0.03)", borderRadius: 5, padding: "2px 7px" }}>
                            {["A","B","C","D"][j]}) {(o||"").slice(0,20)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

           
            {csvFileRef._parsed && csvFileRef._parsed.length > 0 && (
              <div style={{ display: "flex", gap: 12 }}>
                <button onClick={() => handleCSVUpload(false)} disabled={csvLoading}
                  style={{ ...abtn("success"), flex: 1, opacity: csvLoading ? 0.6 : 1 }}>
                  {csvLoading ? "Uploading..." : "Add to Existing Questions"}
                </button>
                <button onClick={() => handleCSVUpload(true)} disabled={csvLoading}
                  style={{ ...abtn("danger"), flex: 1, opacity: csvLoading ? 0.6 : 1 }}>
                  {csvLoading ? "Uploading..." : "Replace All Questions"}
                </button>
              </div>
            )}

            {/* BULK IMAGE UPLOAD */}
            <div style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12, padding: "18px 20px", marginTop: 8 }}>
              <div style={{ color: "#fbbf24", fontWeight: 700, marginBottom: 8, fontSize: "0.95rem" }}>Step 2 (optional) - Bulk Image Upload</div>
              <p style={{ color: "#94a3b8", fontSize: 13, margin: "0 0 10px", lineHeight: 1.7 }}>
                Name your image files to match question numbers:
                <span style={{ color: "#fbbf24", fontFamily: "monospace", marginLeft: 6 }}>q1.jpg, q2.jpg, q5.jpg</span><br />
                Select all images at once - auto-matched to questions by number in filename.
              </p>
              <div style={{ background: "#070d1a", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 11, color: "#64748b" }}>
                <div style={{ color: "#a5b4fc", fontWeight: 600, marginBottom: 3 }}>Naming examples:</div>
                <div>q1.jpg, q2.jpg  matches Q1, Q2</div>
                <div>5.jpg, 10.jpg   also works</div>
                <div>physics_5.jpg   matches Q5</div>
              </div>
              {imgBulkMsg && <div style={mstyle(imgBulkMsg)}>{imgBulkMsg.text}</div>}
              {imgBulkProgress && <div style={{ color: "#a5b4fc", fontSize: 13, marginBottom: 8 }}>Uploading: {imgBulkProgress}</div>}
              {imgBulkFiles.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                  {imgBulkFiles.map((img, i) => (
                    <div key={i} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, background: img.b64 ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)", color: img.b64 ? "#4ade80" : "#f87171" }}>
                      {img.name}
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => { const inp = document.createElement("input"); inp.type="file"; inp.accept="image/jpeg,image/jpg,image/png,image/webp"; inp.multiple=true; inp.onchange=e=>handleBulkImgFiles(e.target.files); inp.click(); }}
                  style={{ ...abtn("ghost"), flex: 1 }}>
                  Select Image Files
                </button>
                <button
                  onClick={handleBulkImgUpload}
                  disabled={imgBulkLoading || imgBulkFiles.filter(r=>r.b64).length === 0}
                  style={{ ...abtn("success"), flex: 1, opacity: (imgBulkLoading || imgBulkFiles.filter(r=>r.b64).length===0) ? 0.5 : 1 }}>
                  {imgBulkLoading ? "Uploading..." : "Upload Images to Database"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/*  SCAN PAPER TAB  */}
        {tab === "scan" && (
          <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
            {scanMsg && <div style={mstyle(scanMsg)}>{scanMsg.text}</div>}

            {/* Instructions */}
            <div style={{ ...acard, padding:"18px 20px" }}>
              <div style={{ color:"#a5b4fc", fontWeight:700, marginBottom:8, fontSize:"0.95rem" }}>AI Question Paper Scanner</div>
              <p style={{ color:"#94a3b8", fontSize:13, lineHeight:1.75, margin:"0 0 12px" }}>
                Upload photos or scans of your question paper. Claude will automatically extract all questions, options, correct answers and solutions.
                Supports JPG, PNG, WebP images and PDFs.
              </p>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, fontSize:12 }}>
                {[["Printed question papers","Handwritten papers (clear handwriting)"],["Multi-page papers (upload all pages)","Hindi + English mixed papers"],["Papers with diagrams/images","MCQ format questions"]].map(([a,b],i) => (
                  <div key={i}>
                    <div style={{ color:"#4ade80" }}>{"+ " + a}</div>
                    <div style={{ color:"#4ade80" }}>{"+ " + b}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Upload area */}
            <div>
              <div
                onClick={() => { const inp=document.createElement("input"); inp.type="file"; inp.accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"; inp.multiple=true; inp.onchange=async e => { const files=Array.from(e.target.files); const imgs=[]; for(const f of files){ const b64=await new Promise(res=>{ const r=new FileReader(); r.onload=ev=>res(ev.target.result.split(",")[1]); r.readAsDataURL(f); }); imgs.push({ name:f.name, b64, type:f.type }); } setScanImages(imgs); setScanMsg({ type:"success", text:imgs.length+" file(s) loaded. Click Extract Questions below." }); setScanPreview([]); }; inp.click(); }}
                onDragOver={e=>e.preventDefault()}
                onDrop={async e=>{ e.preventDefault(); const files=Array.from(e.dataTransfer.files).filter(f=>f.type.match(/image|pdf/)); const imgs=[]; for(const f of files){ const b64=await new Promise(res=>{ const r=new FileReader(); r.onload=ev=>res(ev.target.result.split(",")[1]); r.readAsDataURL(f); }); imgs.push({ name:f.name, b64, type:f.type }); } setScanImages(imgs); setScanMsg({ type:"success", text:imgs.length+" file(s) loaded. Click Extract Questions below." }); setScanPreview([]); }}
                style={{ border:"2px dashed rgba(99,102,241,0.4)", borderRadius:14, padding:32, textAlign:"center", cursor:"pointer", background:"rgba(99,102,241,0.04)", transition:"border-color 0.2s" }}>
                <div style={{ fontSize:42, marginBottom:10 }}>&#128247;</div>
                <div style={{ color:"#94a3b8", fontSize:15, marginBottom:6 }}>Click or drag question paper images/PDFs here</div>
                <div style={{ color:"#475569", fontSize:12 }}>Upload multiple pages at once &bull; JPG, PNG, WebP, PDF</div>
              </div>

              {/* Image previews */}
              {scanImages.length > 0 && (
                <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginTop:12 }}>
                  {scanImages.map((img,i) => (
                    <div key={i} style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(99,102,241,0.3)", borderRadius:8, padding:"6px 10px", fontSize:12, color:"#a5b4fc", display:"flex", alignItems:"center", gap:6 }}>
                      <span>&#128196;</span> {img.name}
                      <button onClick={()=>setScanImages(p=>p.filter((_,j)=>j!==i))} style={{ background:"none", border:"none", color:"#64748b", cursor:"pointer", fontSize:14, padding:0, marginLeft:4 }}>x</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Paper ID input */}
            <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
              <div style={{ flex:1, minWidth:180 }}>
                <label style={alabel}>Paper ID for extracted questions</label>
                <input value={paperFilter} onChange={e=>setPaperFilter(e.target.value)} placeholder="e.g. PAPER_01" style={ainput} />
              </div>
              <div style={{ flex:1, minWidth:180 }}>
                <label style={alabel}>Subject (leave blank to auto-detect)</label>
                <select value={form.subject} onChange={e=>ff("subject",e.target.value)} style={{ ...ainput, cursor:"pointer" }}>
                  <option value="">Auto-detect</option>
                  {SUBJECTS.map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Extract button */}
            <button
              disabled={scanLoading || scanImages.length===0}
              onClick={async () => {
                if (!scanImages.length) { setScanMsg({ type:"error", text:"Upload at least one image first." }); return; }
                setScanLoading(true); setScanPreview([]); setScanProgress("Sending to Claude AI...");
                setScanMsg({ type:"info", text:"Extracting questions using AI... this may take 20-40 seconds." });

                const subjectHint = form.subject ? "All questions are from the subject: " + form.subject + "." : "Auto-detect the subject (Physics/Chemistry/Botany/Zoology) for each question.";
                const pid = paperFilter || "PAPER_01";

                // Build content array with all images
                const content = [
                  ...scanImages.map(img => ({
                    type: "image",
                    source: { type:"base64", media_type: img.type === "application/pdf" ? "image/jpeg" : img.type, data: img.b64 }
                  })),
                  {
                    type: "text",
                    text: `Extract ALL multiple choice questions from this question paper image(s).
${subjectHint}

Return ONLY a valid JSON array. No markdown. No explanation. Start with [ and end with ].

Each question object:
{"number":1,"subject":"Physics","question_text":"Full question text here","equation":"LaTeX if any, else empty string","option_a":"Option A text","option_b":"Option B text","option_c":"Option C text","option_d":"Option D text","correct":0,"solution_text":"Explanation if visible, else empty","paper_id":"${pid}"}

Rules:
- correct: 0=A, 1=B, 2=C, 3=D (integer)
- Extract EVERY question visible, even if answer key is not shown (use 0 as default)
- Preserve exact text including chemical formulas, numbers, units
- Convert visible LaTeX/equations to the equation field using LaTeX syntax
- If answer key is visible at the bottom, match answers to questions
- number: sequential integer starting from 1
- paper_id: always "${pid}"
- Output ONLY the JSON array, nothing else`
                  }
                ];

                try {
                  const resp = await fetch("https://api.anthropic.com/v1/messages", {
                    method:"POST",
                    headers:{ "Content-Type":"application/json" },
                    body: JSON.stringify({
                      model: "claude-sonnet-4-20250514",
                      max_tokens: 8000,
                      messages: [{ role:"user", content }]
                    })
                  });
                  const data = await resp.json();
                  if (data.error) throw new Error(data.error.message);
                  const raw = data.content?.[0]?.text || "";

                  // Extract JSON array
                  const start = raw.indexOf("[");
                  const end   = raw.lastIndexOf("]");
                  if (start===-1||end===-1) throw new Error("No JSON array in response. Got: " + raw.slice(0,300));
                  const questions = JSON.parse(raw.slice(start, end+1));

                  if (!Array.isArray(questions) || !questions.length) throw new Error("No questions extracted. Try a clearer image.");

                  setScanPreview(questions);
                  setScanMsg({ type:"success", text: questions.length + " questions extracted! Review below and click Upload to save." });
                  setScanProgress("");
                } catch(err) {
                  setScanMsg({ type:"error", text:"Extraction failed: " + err.message });
                  setScanProgress("");
                } finally {
                  setScanLoading(false);
                }
              }}
              style={{ ...abtn(scanImages.length>0&&!scanLoading?"primary":"ghost"), padding:"13px", fontSize:"1rem", opacity:scanLoading||scanImages.length===0?0.5:1 }}>
              {scanLoading ? ("Extracting... " + scanProgress) : "Extract Questions with AI"}
            </button>

            {/* Preview extracted questions */}
            {scanPreview.length > 0 && (
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                <div style={{ color:"#a5b4fc", fontWeight:700, fontSize:"0.95rem" }}>
                  {"Preview - " + scanPreview.length + " Questions Extracted"}
                  <span style={{ color:"#64748b", fontSize:12, fontWeight:400, marginLeft:10 }}>Review before uploading</span>
                </div>

                {/* Editable question list */}
                <div style={{ display:"flex", flexDirection:"column", gap:10, maxHeight:500, overflowY:"auto" }}>
                  {scanPreview.map((q,i) => (
                    <div key={i} style={{ ...acard, padding:"14px 16px" }}>
                      <div style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:10 }}>
                        <div style={{ color:"#818cf8", fontWeight:700, fontSize:13, flexShrink:0, marginTop:2 }}>Q{q.number}</div>
                        <div style={{ flex:1 }}>
                          <div style={{ color:"#e2e8f0", fontSize:13, lineHeight:1.6, marginBottom:6 }}>{q.question_text}</div>
                          {q.equation && <div style={{ color:"#fbbf24", fontSize:12, fontFamily:"monospace", marginBottom:6 }}>{q.equation}</div>}
                          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                            {["option_a","option_b","option_c","option_d"].map((opt,oi) => (
                              <span key={opt} style={{ fontSize:11, padding:"2px 8px", borderRadius:5, background:oi===q.correct?"rgba(34,197,94,0.12)":"rgba(255,255,255,0.04)", color:oi===q.correct?"#4ade80":"#64748b", border:oi===q.correct?"1px solid rgba(34,197,94,0.3)":"1px solid rgba(255,255,255,0.06)" }}>
                                {["A","B","C","D"][oi]}) {(q[opt]||"").slice(0,30)}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div style={{ display:"flex", flexDirection:"column", gap:4, flexShrink:0 }}>
                          <span style={{ fontSize:10, color:"#94a3b8", background:"rgba(255,255,255,0.06)", borderRadius:4, padding:"2px 7px" }}>{q.subject||"?"}</span>
                          <button onClick={()=>setScanPreview(p=>p.filter((_,j)=>j!==i))} style={{ ...abtn("danger"), fontSize:10, padding:"3px 8px" }}>Remove</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Upload buttons */}
                <div style={{ display:"flex", gap:12 }}>
                  <button
                    onClick={async () => {
                      setScanLoading(true);
                      setScanMsg({ type:"info", text:"Uploading to Supabase..." });
                      let done=0, fail=0;
                      for (let i=0; i<scanPreview.length; i+=50) {
                        const chunk = scanPreview.slice(i,i+50).map(q => ({
                          number:        q.number || i+1,
                          subject:       q.subject || "Physics",
                          type:          q.equation ? "equation" : "text",
                          question_text: q.question_text || "",
                          equation:      q.equation || "",
                          diagram_data:  "",
                          diagram_url:   "",
                          option_a:      q.option_a || "",
                          option_b:      q.option_b || "",
                          option_c:      q.option_c || "",
                          option_d:      q.option_d || "",
                          option_a_image:"", option_b_image:"", option_c_image:"", option_d_image:"",
                          correct:       typeof q.correct==="number" ? q.correct : 0,
                          solution_text: q.solution_text || "",
                          solution_eq:   "",
                          solution_diagram_data:"",
                          paper_id:      q.paper_id || paperFilter || "PAPER_01",
                          chapter:       q.chapter || "",
                          difficulty:    q.difficulty || "medium",
                        }));
                        const { error } = await supabase.from("questions").insert(chunk);
                        if (error) { fail+=chunk.length; console.error(error); }
                        else done+=chunk.length;
                        setScanMsg({ type:"info", text:"Uploading... " + (done+fail) + "/" + scanPreview.length });
                      }
                      setScanLoading(false);
                      if (fail>0) setScanMsg({ type:"error", text:done+" uploaded, "+fail+" failed. Check for duplicate question numbers." });
                      else { setScanMsg({ type:"success", text:done+" questions uploaded successfully to paper: " + (paperFilter||"PAPER_01") }); setScanPreview([]); setScanImages([]); }
                    }}
                    disabled={scanLoading}
                    style={{ ...abtn("success"), flex:1, padding:"12px", fontSize:"1rem", opacity:scanLoading?0.6:1 }}>
                    {scanLoading ? "Uploading..." : "Upload " + scanPreview.length + " Questions to Supabase"}
                  </button>
                  <button onClick={()=>{ setScanPreview([]); setScanMsg(null); }} style={abtn("ghost")}>Clear</button>
                </div>
              </div>
            )}

          </div>
        )}

        
        {tab === "list" && (
          <div>
            {msg && <div style={mstyle(msg)}>{msg.text}</div>}
            <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ color: "#64748b", fontSize: 12, flexShrink: 0 }}>Paper ID:</span>
              <input value={paperFilter} onChange={e => setPaperFilter(e.target.value)} placeholder="e.g. PAPER_01" style={{ ...ainput, width: 160 }} />
              <button onClick={() => loadAll(paperFilter)} style={abtn("primary")}>Load</button>
              <span style={{ color: "#475569", fontSize: 11 }}>Tip: type paper_id and click Load to switch tests</span>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ ...ainput, flex: 1, minWidth: 160 }} />
              <select value={subFilter} onChange={e => setSubFilter(e.target.value)} style={{ ...ainput, width: 130, cursor: "pointer" }}>
                <option value="All">All Subjects</option>
                {SUBJECTS.map(s => <option key={s}>{s}</option>)}
              </select>
              <button onClick={handleDeleteAll} style={abtn("danger")}>Delete All</button>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
              {SUBJECTS.map(s => {
                const c = questions.filter(q => q.subject === s).length;
                return (
                  <div key={s} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "5px 12px", fontSize: 12 }}>
                    <span style={{ color: "#94a3b8" }}>{s + ": "}</span>
                    <span style={{ color: c >= 45 ? "#4ade80" : "#fbbf24", fontWeight: 700 }}>{c}</span>
                    <span style={{ color: "#475569" }}>/45</span>
                  </div>
                );
              })}
            </div>
            {loading ? (
              <div style={{ textAlign: "center", color: "#64748b", padding: 40 }}>Loading...</div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: "center", color: "#475569", padding: 40 }}>No questions found.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {filtered.map(q => (
                  <div key={q.id} style={{ ...acard, display: "flex", gap: 12, alignItems: "flex-start" }}>
                    {q.diagram_data ? (
                      <img src={q.diagram_data} alt="" style={{ width: 56, height: 40, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 56, height: 40, borderRadius: 6, background: "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#374151", fontSize: 12 }}>Q{q.number}</div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: SUBJ_COLORS_A[q.subject] || "#818cf8" }}>{"Q" + q.number + " - " + q.subject}</span>
                        {q.diagram_data && <span style={{ fontSize: 10, color: "#4ade80", background: "rgba(34,197,94,0.1)", padding: "1px 6px", borderRadius: 4 }}>image</span>}
                        {q.equation    && <span style={{ fontSize: 10, color: "#818cf8", background: "rgba(99,102,241,0.1)", padding: "1px 6px", borderRadius: 4 }}>eq</span>}
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "#c7d2fe", lineHeight: 1.4 }}>
                        {(q.question_text || q.equation || "(no text)").slice(0, 120)}
                      </div>
                      <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                        {[q.option_a, q.option_b, q.option_c, q.option_d].map((opt, i) => (
                          <span key={i} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 5, background: i === q.correct ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.03)", color: i === q.correct ? "#4ade80" : "#64748b" }}>
                            {["A","B","C","D"][i] + ") " + (opt || "").slice(0, 18) + ((opt || "").length > 18 ? "..." : "")}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5, flexShrink: 0 }}>
                      <button onClick={() => handleEdit(q)} style={abtn("sm")}>Edit</button>
                      <button onClick={() => handleDelete(q.id)} style={{ ...abtn("danger"), padding: "5px 12px", fontSize: "0.78rem" }}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

       
        {tab === "settings" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {settingsMsg && <div style={mstyle(settingsMsg)}>{settingsMsg.text}</div>}

            
            <div style={{ ...acard, padding: "20px 22px" }}>
              <div style={{ color: "#a5b4fc", fontWeight: 700, marginBottom: 16, fontSize: "0.95rem" }}>Exam Access</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ color: "#e2e8f0", fontSize: 14 }}>Exam Enabled</div>
                    <div style={{ color: "#64748b", fontSize: 12 }}>When off, no student can start the exam</div>
                  </div>
                  <button onClick={() => setSettings(p => ({ ...p, exam_enabled: p.exam_enabled === "false" ? "true" : "false" }))}
                    style={{ ...abtn(settings.exam_enabled !== "false" ? "success" : "ghost"), minWidth: 80 }}>
                    {settings.exam_enabled !== "false" ? "ON" : "OFF"}
                  </button>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ color: "#e2e8f0", fontSize: 14 }}>Access Code Required</div>
                    <div style={{ color: "#64748b", fontSize: 12 }}>Students must enter a code to start</div>
                  </div>
                  <button onClick={() => setSettings(p => ({ ...p, access_code_enabled: p.access_code_enabled === "true" ? "false" : "true" }))}
                    style={{ ...abtn(settings.access_code_enabled === "true" ? "success" : "ghost"), minWidth: 80 }}>
                    {settings.access_code_enabled === "true" ? "ON" : "OFF"}
                  </button>
                </div>

                {settings.access_code_enabled === "true" && (
                  <div>
                    <label style={alabel}>Exam Start Code</label>
                    <input value={settings.access_code || ""} onChange={e => setSettings(p => ({ ...p, access_code: e.target.value }))}
                      placeholder="Code required to begin the exam" style={settingInput} />
                  </div>
                )}

                {/* Resume code - always shown, separate from start code */}
                <div>
                  <div style={{ color: "#e2e8f0", fontSize: 14, marginBottom: 2 }}>Exam Resume Code</div>
                  <div style={{ color: "#64748b", fontSize: 12, marginBottom: 8 }}>Required when student switches tabs during exam</div>
                  <input value={settings.resume_code || ""} onChange={e => setSettings(p => ({ ...p, resume_code: e.target.value }))}
                    placeholder="Enter a separate code for resuming after tab switch" style={settingInput} />
                </div>
              </div>
            </div>

            
            <div style={{ ...acard, padding: "20px 22px" }}>
              <div style={{ color: "#a5b4fc", fontWeight: 700, marginBottom: 16, fontSize: "0.95rem" }}>Exam Time Window</div>
              <div style={{ color: "#64748b", fontSize: 12, marginBottom: 12 }}>Leave blank to allow access at any time</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={alabel}>Start Date & Time</label>
                  <input type="datetime-local" value={settings.exam_window_start || ""} onChange={e => setSettings(p => ({ ...p, exam_window_start: e.target.value }))} style={settingInput} />
                </div>
                <div>
                  <label style={alabel}>End Date & Time</label>
                  <input type="datetime-local" value={settings.exam_window_end || ""} onChange={e => setSettings(p => ({ ...p, exam_window_end: e.target.value }))} style={settingInput} />
                </div>
              </div>
            </div>

            
            <div style={{ ...acard, padding: "20px 22px" }}>
              <div style={{ color: "#a5b4fc", fontWeight: 700, marginBottom: 16, fontSize: "0.95rem" }}>Exam Rules</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={alabel}>Max Attempts Per Student</label>
                  <input type="number" min="0" value={settings.attempt_limit || "0"} onChange={e => setSettings(p => ({ ...p, attempt_limit: e.target.value }))} style={settingInput} placeholder="0 = unlimited" />
                  <div style={{ color: "#475569", fontSize: 11, marginTop: 4 }}>0 = unlimited attempts</div>
                </div>
                <div>
                  <label style={alabel}>NEET Exam Date (for countdown)</label>
                  <input type="date" value={settings.neet_exam_date || ""} onChange={e => setSettings(p => ({ ...p, neet_exam_date: e.target.value }))} style={settingInput} />
                </div>
              </div>
            </div>

            
            <div style={{ ...acard, padding: "20px 22px" }}>
              <div style={{ color: "#a5b4fc", fontWeight: 700, marginBottom: 16, fontSize: "0.95rem" }}>Features</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  ["webcam_enabled",      "Webcam Proctoring",    "Take random snapshots during exam"],
                  ["leaderboard_enabled", "Leaderboard",          "Show top scores tab on student dashboard"],
                  ["registration_approval","Approval Required",   "New students need admin approval to access exam"],
                ].map(([key, label, desc]) => (
                  <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ color: "#e2e8f0", fontSize: 14 }}>{label}</div>
                      <div style={{ color: "#64748b", fontSize: 12 }}>{desc}</div>
                    </div>
                    <button onClick={() => setSettings(p => ({ ...p, [key]: p[key] === "true" ? "false" : "true" }))}
                      style={{ ...abtn(settings[key] === "true" ? "success" : "ghost"), minWidth: 80 }}>
                      {settings[key] === "true" ? "ON" : "OFF"}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            
            <div style={{ ...acard, padding: "20px 22px" }}>
              <div style={{ color: "#a5b4fc", fontWeight: 700, marginBottom: 12, fontSize: "0.95rem" }}>Paper Settings</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={alabel}>Paper ID</label>
                  <input value={paperFilter || "PAPER_01"} disabled style={{ ...settingInput, opacity: 0.5, cursor: "not-allowed" }} />
                  <div style={{ color: "#475569", fontSize: 11, marginTop: 4 }}>Fixed - all questions use this ID</div>
                </div>
                <div>
                  <label style={alabel}>Default Font</label>
                  <select value={settings.hindi_font_enabled || "false"} onChange={e => setSettings(p => ({ ...p, hindi_font_enabled: e.target.value }))} style={{ ...settingInput, cursor: "pointer" }}>
                    <option value="false">English (Crimson Pro)</option>
                    <option value="true">Hindi (Kruti Dev)</option>
                  </select>
                </div>
              </div>
            </div>

            <button onClick={saveAllSettings} disabled={savingSettings}
              style={{ ...abtn("success"), padding: "13px", fontSize: "1rem", opacity: savingSettings ? 0.6 : 1 }}>
              {savingSettings ? "Saving..." : "Save All Settings"}
            </button>
          </div>
        )}

        
        {/*  BATCHES TAB  */}
        {tab === "batches" && (
          <div>
            {batchMsg && <div style={mstyle(batchMsg)}>{batchMsg.text}</div>}

            {batchView === "list" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Create new batch */}
                <div style={{ ...acard, padding: "18px 20px" }}>
                  <div style={{ color: "#a5b4fc", fontWeight: 700, marginBottom: 12 }}>Create New Batch</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10, marginBottom: 10 }}>
                    <div>
                      <label style={alabel}>Batch Name</label>
                      <input value={batchForm.name} onChange={e => setBatchForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Batch A, Morning Batch" style={ainput} />
                    </div>
                    <div>
                      <label style={alabel}>Description (optional)</label>
                      <input value={batchForm.description} onChange={e => setBatchForm(p => ({ ...p, description: e.target.value }))} placeholder="e.g. 50 students, 10am slot" style={ainput} />
                    </div>
                  </div>
                  <button onClick={createBatch} style={abtn("success")}>+ Create Batch</button>
                </div>

                {/* Batch list */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ color: "#a5b4fc", fontWeight: 700 }}>{"All Batches (" + batches.length + ")"}</div>
                    <button onClick={loadBatches} style={abtn("ghost")}>Refresh</button>
                  </div>
                  {batchLoading ? <div style={{ textAlign: "center", color: "#64748b", padding: 40 }}>Loading...</div>
                  : batches.length === 0 ? <div style={{ textAlign: "center", color: "#475569", padding: 40 }}>No batches yet. Create one above.</div>
                  : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {batches.map(b => (
                        <div key={b.id} style={{ ...acard, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                          <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 18 }}>B</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ color: "#e2e8f0", fontWeight: 700, fontSize: "0.95rem" }}>{b.name}</div>
                            {b.description && <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>{b.description}</div>}
                            <div style={{ color: "#475569", fontSize: 11, marginTop: 3 }}>Created {new Date(b.created_at).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" })}</div>
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => { setSelectedBatch(b); setBatchView("tests"); loadBatchTests(b.id); setTestMsg(null); setBatchTestView("list"); }} style={abtn("success")}>Tests</button>
                            <button onClick={() => loadBatchDetail(b)} style={abtn("primary")}>Members</button>
                            <button onClick={() => deleteBatch(b.id)} style={{ ...abtn("danger"), padding: "9px 12px" }}>Del</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/*  TESTS VIEW (multiple tests per batch)  */}
            {batchView === "tests" && selectedBatch && (
              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <button onClick={() => { setBatchView("list"); setSelectedBatch(null); setSelectedTest(null); setTestMsg(null); }} style={abtn("ghost")}>Back</button>
                  <div>
                    <div style={{ color:"#e2e8f0", fontWeight:700, fontSize:"1.1rem" }}>{selectedBatch.name} - Tests</div>
                    <div style={{ color:"#64748b", fontSize:12 }}>Schedule multiple tests on different dates</div>
                  </div>
                </div>

                {testMsg && <div style={mstyle(testMsg)}>{testMsg.text}</div>}

                {/* TEST LIST */}
                {batchTestView === "list" && (
                  <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                    <button onClick={() => { setSelectedTest(null); setTestForm({ name:"", description:"", paper_id:"PAPER_01", exam_window_start:"", exam_window_end:"", attempt_limit:"1", access_code:"", access_code_enabled:"false", resume_code:"", status:"scheduled", manual_release:"false" }); setBatchTestView("create"); }} style={{ ...abtn("success"), alignSelf:"flex-start" }}>+ Schedule New Test</button>

                    {testLoading ? <div style={{ textAlign:"center", color:"#64748b", padding:30 }}>Loading...</div>
                    : batchTests.length === 0 ? <div style={{ textAlign:"center", color:"#475569", padding:30 }}>No tests scheduled. Create one above.</div>
                    : (
                      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                        {batchTests.map(t => {
                          const now = new Date();
                          const st  = t.exam_window_start ? new Date(t.exam_window_start) : null;
                          const en  = t.exam_window_end   ? new Date(t.exam_window_end)   : null;
                          let statusLabel = "Scheduled", statusColor = "#fbbf24";
                          if (t.manual_release === "true") { statusLabel = "Released (manual)"; statusColor = "#4ade80"; }
                          else if (st && en) {
                            if (now < st) { statusLabel = "Upcoming"; statusColor = "#818cf8"; }
                            else if (now >= st && now <= en) { statusLabel = "ACTIVE NOW"; statusColor = "#4ade80"; }
                            else { statusLabel = "Completed"; statusColor = "#64748b"; }
                          }
                          return (
                            <div key={t.id} style={{ ...acard, padding:"14px 18px" }}>
                              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                                <div style={{ flex:1 }}>
                                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                                    <span style={{ color:"#e2e8f0", fontWeight:700 }}>{t.name}</span>
                                    <span style={{ fontSize:10, color:statusColor, background:"rgba(255,255,255,0.06)", padding:"2px 8px", borderRadius:99, fontWeight:600 }}>{statusLabel}</span>
                                  </div>
                                  {t.description && <div style={{ color:"#64748b", fontSize:12, marginTop:2 }}>{t.description}</div>}
                                  <div style={{ color:"#475569", fontSize:11, marginTop:4, display:"flex", gap:14, flexWrap:"wrap" }}>
                                    <span>Paper: <span style={{ color:"#a5b4fc" }}>{t.paper_id}</span></span>
                                    {st && <span>Start: {st.toLocaleString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</span>}
                                    {en && <span>End: {en.toLocaleString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</span>}
                                  </div>
                                </div>
                                <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                                  <button onClick={() => { setSelectedTest(t); loadTestReports(t.id); setBatchTestView("report"); }} style={{ ...abtn("primary"), padding:"7px 12px", fontSize:12 }}>Report</button>
                                  <button onClick={() => { setSelectedTest(t); setTestForm({ name:t.name, description:t.description||"", paper_id:t.paper_id, exam_window_start:t.exam_window_start||"", exam_window_end:t.exam_window_end||"", attempt_limit:String(t.attempt_limit||"1"), access_code:t.access_code||"", access_code_enabled:t.access_code_enabled||"false", resume_code:t.resume_code||"", status:t.status||"scheduled", manual_release:t.manual_release||"false" }); setBatchTestView("edit"); }} style={{ ...abtn("ghost"), padding:"7px 12px", fontSize:12 }}>Edit</button>
                                  <button onClick={() => deleteTest(t.id)} style={{ ...abtn("danger"), padding:"7px 10px", fontSize:12 }}>Del</button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* CREATE / EDIT TEST FORM */}
                {(batchTestView === "create" || batchTestView === "edit") && (
                  <div style={{ ...acard, padding:"20px 22px", display:"flex", flexDirection:"column", gap:14 }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                      <div style={{ color:"#a5b4fc", fontWeight:700 }}>{batchTestView === "edit" ? "Edit Test" : "Schedule New Test"}</div>
                      <button onClick={() => { setBatchTestView("list"); setSelectedTest(null); }} style={{ ...abtn("ghost"), fontSize:12, padding:"5px 12px" }}>Cancel</button>
                    </div>

                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                      <div>
                        <label style={alabel}>Test Name</label>
                        <input value={testForm.name} onChange={e=>setTestForm(p=>({...p,name:e.target.value}))} placeholder="e.g. Weekly Test 1, Full Mock 3" style={ainput} />
                      </div>
                      <div>
                        <label style={alabel}>Paper ID (question set)</label>
                        <input value={testForm.paper_id} onChange={e=>setTestForm(p=>({...p,paper_id:e.target.value}))} placeholder="e.g. BATCH_A_T1" style={ainput} />
                      </div>
                    </div>

                    <div>
                      <label style={alabel}>Description (optional)</label>
                      <input value={testForm.description} onChange={e=>setTestForm(p=>({...p,description:e.target.value}))} placeholder="e.g. Covers Mechanics and Thermodynamics" style={ainput} />
                    </div>

                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                      <div>
                        <label style={alabel}>Test Date & Start Time</label>
                        <input type="datetime-local" value={testForm.exam_window_start} onChange={e=>setTestForm(p=>({...p,exam_window_start:e.target.value}))} style={ainput} />
                      </div>
                      <div>
                        <label style={alabel}>End Time</label>
                        <input type="datetime-local" value={testForm.exam_window_end} onChange={e=>setTestForm(p=>({...p,exam_window_end:e.target.value}))} style={ainput} />
                      </div>
                    </div>

                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                      <div>
                        <label style={alabel}>Max Attempts</label>
                        <input type="number" min="1" value={testForm.attempt_limit} onChange={e=>setTestForm(p=>({...p,attempt_limit:e.target.value}))} style={ainput} />
                      </div>
                      <div>
                        <label style={alabel}>Resume Code (tab-switch)</label>
                        <input value={testForm.resume_code} onChange={e=>setTestForm(p=>({...p,resume_code:e.target.value}))} placeholder="Code to resume" style={ainput} />
                      </div>
                    </div>

                    {/* Access code toggle */}
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                      <div style={{ color:"#e2e8f0", fontSize:13 }}>Require Access Code to Start</div>
                      <button onClick={()=>setTestForm(p=>({...p,access_code_enabled:p.access_code_enabled==="true"?"false":"true"}))} style={{ ...abtn(testForm.access_code_enabled==="true"?"success":"ghost"), minWidth:70 }}>{testForm.access_code_enabled==="true"?"ON":"OFF"}</button>
                    </div>
                    {testForm.access_code_enabled === "true" && (
                      <div>
                        <label style={alabel}>Start Access Code</label>
                        <input value={testForm.access_code} onChange={e=>setTestForm(p=>({...p,access_code:e.target.value}))} placeholder="Code to begin test" style={ainput} />
                      </div>
                    )}

                    {/* Manual release toggle */}
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:"rgba(34,197,94,0.06)", borderRadius:8, padding:"10px 14px" }}>
                      <div>
                        <div style={{ color:"#e2e8f0", fontSize:13 }}>Release Now (manual override)</div>
                        <div style={{ color:"#64748b", fontSize:11 }}>Force-show this test to students regardless of date</div>
                      </div>
                      <button onClick={()=>setTestForm(p=>({...p,manual_release:p.manual_release==="true"?"false":"true"}))} style={{ ...abtn(testForm.manual_release==="true"?"success":"ghost"), minWidth:70 }}>{testForm.manual_release==="true"?"ON":"OFF"}</button>
                    </div>

                    <button onClick={batchTestView === "edit" ? saveTest : createBatchTest} style={{ ...abtn("success"), padding:"12px", fontSize:"1rem" }}>
                      {batchTestView === "edit" ? "Save Changes" : "Schedule Test"}
                    </button>
                  </div>
                )}

                {/* TEST REPORT (per-test rankings) */}
                {batchTestView === "report" && selectedTest && (
                  <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
                      <div>
                        <div style={{ color:"#a5b4fc", fontWeight:700 }}>{selectedTest.name} - Report</div>
                        <div style={{ color:"#64748b", fontSize:12 }}>{testReports.length} students attempted</div>
                      </div>
                      <div style={{ display:"flex", gap:8 }}>
                        <button onClick={() => setBatchTestView("list")} style={abtn("ghost")}>Back to Tests</button>
                        {testReports.length > 0 && <button onClick={() => downloadTestReport(selectedTest.name, testReports)} style={{ ...abtn("success"), fontSize:12, padding:"8px 16px" }}>Download CSV</button>}
                      </div>
                    </div>

                    {testReportLoading ? <div style={{ textAlign:"center", color:"#64748b", padding:30 }}>Loading...</div>
                    : testReports.length === 0 ? <div style={{ textAlign:"center", color:"#475569", padding:30 }}>No attempts yet for this test.</div>
                    : (
                      <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                        <div style={{ display:"grid", gridTemplateColumns:"50px 1fr 90px 70px 70px 70px", gap:8, padding:"8px 14px", background:"rgba(99,102,241,0.15)", borderRadius:"10px 10px 0 0", fontSize:10, color:"#64748b", textTransform:"uppercase", letterSpacing:0.5 }}>
                          <div>Rank</div><div>Student</div><div>Score</div>
                          <div style={{ color:"#4ade80" }}>Correct</div>
                          <div style={{ color:"#f87171" }}>Wrong</div>
                          <div>Skip</div>
                        </div>
                        {testReports.map((r, i) => {
                          const pct = Math.round((r.score / maxMarksOf(r))*100);
                          return (
                            <div key={r.id} style={{ display:"grid", gridTemplateColumns:"50px 1fr 90px 70px 70px 70px", gap:8, padding:"10px 14px", background:i%2===0?"rgba(255,255,255,0.025)":"rgba(255,255,255,0.015)", alignItems:"center" }}>
                              <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                                <span style={{ color:i<3?"#fbbf24":"#475569", fontWeight:700, fontSize:14 }}>{i+1}</span>
                              </div>
                              <div>
                                <div style={{ color:"#e2e8f0", fontSize:13, fontWeight:600 }}>{r.student_name || r.student_email?.split("@")[0] || "Student"}</div>
                                <div style={{ color:"#475569", fontSize:10 }}>{r.student_email}</div>
                              </div>
                              <div style={{ fontWeight:700, color:pct>=50?"#4ade80":"#f87171" }}>{r.score}<span style={{ color:"#374151", fontSize:10, fontWeight:400 }}>/{maxMarksOf(r)}</span></div>
                              <div style={{ color:"#4ade80", fontWeight:600 }}>{r.correct}</div>
                              <div style={{ color:"#f87171", fontWeight:600 }}>{r.wrong}</div>
                              <div style={{ color:"#64748b" }}>{r.unattempted}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

                        {batchView === "edit" && selectedBatch && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button onClick={() => { setBatchView("list"); setSelectedBatch(null); setBatchMsg(null); }} style={abtn("ghost")}>Back</button>
                  <div>
                    <div style={{ color: "#e2e8f0", fontWeight: 700, fontSize: "1.1rem" }}>{selectedBatch.name}</div>
                    {selectedBatch.description && <div style={{ color: "#64748b", fontSize: 12 }}>{selectedBatch.description}</div>}
                  </div>
                </div>

                {/* CREATE + ADD STUDENTS */}
                <div style={{ ...acard, padding: "18px 20px" }}>
                  <div style={{ color: "#a5b4fc", fontWeight: 700, marginBottom: 4 }}>Add New Students</div>
                  <div style={{ color: "#64748b", fontSize: 12, marginBottom: 14 }}>Create accounts and add to this batch in one step.</div>

                  {addStudentMsg && <div style={mstyle(addStudentMsg)}>{addStudentMsg.text}</div>}

                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 2fr 32px", gap: 8 }}>
                      <div style={{ color: "#64748b", fontSize: 11, textTransform: "uppercase" }}>Email *</div>
                      <div style={{ color: "#64748b", fontSize: 11, textTransform: "uppercase" }}>Password * (min 6)</div>
                      <div style={{ color: "#64748b", fontSize: 11, textTransform: "uppercase" }}>Full Name</div>
                      <div />
                    </div>
                    {addStudentRows.map((row, i) => (
                      <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 2fr 2fr 32px", gap: 8, alignItems: "center" }}>
                        <input type="email" value={row.email} placeholder="email@example.com"
                          onChange={e => setAddStudentRows(p => p.map((r,j) => j===i ? { ...r, email: e.target.value } : r))}
                          style={{ ...ainput, padding: "8px 10px", fontSize: 12 }} />
                        <input type="text" value={row.password} placeholder="password"
                          onChange={e => setAddStudentRows(p => p.map((r,j) => j===i ? { ...r, password: e.target.value } : r))}
                          style={{ ...ainput, padding: "8px 10px", fontSize: 12, fontFamily: "monospace" }} />
                        <input type="text" value={row.name} placeholder="Name (optional)"
                          onChange={e => setAddStudentRows(p => p.map((r,j) => j===i ? { ...r, name: e.target.value } : r))}
                          style={{ ...ainput, padding: "8px 10px", fontSize: 12 }} />
                        <button onClick={() => setAddStudentRows(p => p.length > 1 ? p.filter((_,j) => j!==i) : [{ email:"", password:"", name:"" }])}
                          style={{ background:"none", border:"none", color:"#475569", cursor:"pointer", fontSize:18, padding:0 }}>x</button>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                    <button onClick={() => setAddStudentRows(p => [...p, { email:"", password:"", name:"" }])}
                      style={{ ...abtn("ghost"), fontSize: 12, padding: "7px 14px" }}>+ Add Row</button>
                    <button onClick={() => { const inp=document.createElement("input"); inp.type="file"; inp.accept=".csv"; inp.onchange=e=>{ const rd=new FileReader(); rd.onload=ev=>{ const text=ev.target.result; const rows=text.split("\n").slice(1).filter(l=>l.trim()).map(l=>{ const cols=(l.replace(/\r/g,"")+",,,").split(","); return { email:(cols[0]||"").trim(), password:(cols[1]||"").trim(), name:(cols[2]||"").trim() }; }).filter(r=>r.email.includes("@")); setAddStudentRows(rows.length?rows:[{email:"",password:"",name:""}]); setAddStudentMsg({type:"ok",text:rows.length+" rows loaded."}); }; rd.readAsText(e.target.files[0]); }; inp.click(); }}
                      style={{ ...abtn("ghost"), fontSize: 12, padding: "7px 14px" }}>Import CSV</button>
                    <button onClick={() => { const s="email,password,full_name\nstudent1@example.com,Pass@1234,Rahul Sharma\n"; const b=new Blob([s],{type:"text/csv"}); const u=URL.createObjectURL(b); const a=document.createElement("a"); a.href=u;a.download="template.csv";a.click();URL.revokeObjectURL(u); }}
                      style={{ ...abtn("ghost"), fontSize: 12, padding: "7px 14px" }}>Download Template</button>
                  </div>

                  <button onClick={createStudentsInBatch} disabled={addStudentLoading}
                    style={{ ...abtn("success"), padding: "11px 24px", opacity: addStudentLoading ? 0.6 : 1 }}>
                    {addStudentLoading ? "Creating..." : "Create " + addStudentRows.filter(r=>r.email.includes("@")&&r.password.length>=6).length + " Student(s) and Add to Batch"}
                  </button>
                </div>

                {/* CURRENT MEMBERS LIST */}
                <div style={{ ...acard, padding: "18px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ color: "#a5b4fc", fontWeight: 700 }}>{"Current Members (" + batchMembers.length + ")"}</div>
                    <button onClick={() => loadBatchDetail(selectedBatch)} style={{ ...abtn("ghost"), padding: "5px 10px", fontSize: 11 }}>Refresh</button>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={alabel}>Add existing accounts by email</label>
                    <textarea value={batchMemberInput} onChange={e => setBatchMemberInput(e.target.value)}
                      placeholder="existing@student.com"
                      style={{ ...ainput, minHeight: 50, resize: "vertical", lineHeight: 1.6, marginBottom: 8, fontSize: 12 }} />
                    <button onClick={addBatchMembers} style={{ ...abtn("primary"), fontSize: 12, padding: "7px 16px" }}>Add to Batch</button>
                  </div>
                  {batchMembers.length > 0 ? (
                    <div style={{ maxHeight: 260, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                      {batchMembers.map((m, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "7px 12px" }}>
                          <span style={{ color: "#c7d2fe", fontSize: 13 }}>{m.email}</span>
                          <button onClick={() => removeBatchMember(m.email)} style={{ background:"none", border:"none", color:"#64748b", cursor:"pointer", fontSize:16, padding:"0 4px" }}>x</button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", color: "#475569", padding: 16, fontSize: 13 }}>No members yet.</div>
                  )}
                </div>


                {/* Exam settings for this batch */}
                <div style={{ ...acard, padding: "18px 20px" }}>
                  <div style={{ color: "#a5b4fc", fontWeight: 700, marginBottom: 4 }}>Exam Settings for this Batch</div>
                  <div style={{ color: "#64748b", fontSize: 12, marginBottom: 16 }}>These override global settings for students in this batch.</div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {/* Exam enabled */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div><div style={{ color: "#e2e8f0", fontSize: 13 }}>Exam Enabled</div><div style={{ color: "#64748b", fontSize: 11 }}>Allow this batch to take the exam</div></div>
                      <button onClick={() => setBatchSettings(p => ({ ...p, exam_enabled: p.exam_enabled === "false" ? "true" : "false" }))} style={{ ...abtn(batchSettings.exam_enabled !== "false" ? "success" : "ghost"), minWidth: 70 }}>{batchSettings.exam_enabled !== "false" ? "ON" : "OFF"}</button>
                    </div>

                    {/* Access code */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div><div style={{ color: "#e2e8f0", fontSize: 13 }}>Access Code Required</div></div>
                      <button onClick={() => setBatchSettings(p => ({ ...p, access_code_enabled: p.access_code_enabled === "true" ? "false" : "true" }))} style={{ ...abtn(batchSettings.access_code_enabled === "true" ? "success" : "ghost"), minWidth: 70 }}>{batchSettings.access_code_enabled === "true" ? "ON" : "OFF"}</button>
                    </div>
                    {batchSettings.access_code_enabled === "true" && (
                      <div>
                        <label style={alabel}>Start Code</label>
                        <input value={batchSettings.access_code || ""} onChange={e => setBatchSettings(p => ({ ...p, access_code: e.target.value }))} placeholder="Code to start exam" style={{ ...ainput, marginBottom: 8 }} />
                      </div>
                    )}

                    {/* Resume code */}
                    <div>
                      <label style={alabel}>Resume Code (tab-switch lock)</label>
                      <input value={batchSettings.resume_code || ""} onChange={e => setBatchSettings(p => ({ ...p, resume_code: e.target.value }))} placeholder="Code to resume after tab switch" style={ainput} />
                    </div>

                    {/* Exam window */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div>
                        <label style={alabel}>Window Start</label>
                        <input type="datetime-local" value={batchSettings.exam_window_start || ""} onChange={e => setBatchSettings(p => ({ ...p, exam_window_start: e.target.value }))} style={ainput} />
                      </div>
                      <div>
                        <label style={alabel}>Window End</label>
                        <input type="datetime-local" value={batchSettings.exam_window_end || ""} onChange={e => setBatchSettings(p => ({ ...p, exam_window_end: e.target.value }))} style={ainput} />
                      </div>
                    </div>

                    {/* Attempt limit */}
                    <div>
                      <label style={alabel}>Max Attempts (0 = unlimited)</label>
                      <input type="number" min="0" value={batchSettings.attempt_limit || "0"} onChange={e => setBatchSettings(p => ({ ...p, attempt_limit: e.target.value }))} style={{ ...ainput, maxWidth: 180 }} />
                    </div>

                    {/* Paper ID */}
                    <div>
                      <label style={alabel}>Paper ID</label>
                      <input value={batchSettings.paper_id || "PAPER_01"} onChange={e => setBatchSettings(p => ({ ...p, paper_id: e.target.value }))} placeholder="e.g. PAPER_01, PAPER_02" style={{ ...ainput, maxWidth: 220 }} />
                      <div style={{ color: "#475569", fontSize: 11, marginTop: 4 }}>Questions with this paper_id will be shown to this batch</div>
                    </div>
                  </div>

                  <button onClick={saveBatchSettings} style={{ ...abtn("success"), marginTop: 16, padding: "12px 28px" }}>Save Batch Settings</button>
                </div>
              </div>
            )}
          </div>
        )}

                {tab === "students" && (
          <div>
            {/* Sub-tabs */}
            <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap:"wrap" }}>
              <button onClick={() => setStudentTab("results")}     style={abtn(studentTab === "results"     ? "primary" : "ghost")}>Exam Results</button>
              <button onClick={() => setStudentTab("studentcard")} style={abtn(studentTab === "studentcard" ? "primary" : "ghost")}>Student Report Card</button>
              <button onClick={() => setStudentTab("manage")}      style={abtn(studentTab === "manage"      ? "primary" : "ghost")}>Manage Students</button>
              <button onClick={() => setStudentTab("add")}         style={abtn(studentTab === "add"         ? "primary" : "ghost")}>Add Students via CSV</button>
            </div>

            {/* RESULTS SUB-TAB */}
            {studentTab === "results" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Header row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                  <div style={{ color: "#a5b4fc", fontWeight: 700, fontSize: "1rem" }}>{"Exam Reports (" + students.length + " attempts)"}</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={loadStudents} style={abtn("ghost")}>Refresh</button>
                    <button
                      onClick={() => {
                        // Apply current filters before downloading
                        let rows = [...students];
                        if (reportFilter.search)     rows = rows.filter(r => r.user_id.toLowerCase().includes(reportFilter.search.toLowerCase()));
                        if (reportFilter.nameSearch) rows = rows.filter(r => (r.student_name||"").toLowerCase().includes(reportFilter.nameSearch.toLowerCase()) || (r.student_email||"").toLowerCase().includes(reportFilter.nameSearch.toLowerCase()));
                        if (reportFilter.paperId)    rows = rows.filter(r => (r.paper_id||"").toLowerCase().includes(reportFilter.paperId.toLowerCase()));
                        if (reportFilter.minScore)   rows = rows.filter(r => r.score >= +reportFilter.minScore);
                        if (reportFilter.maxScore)   rows = rows.filter(r => r.score <= +reportFilter.maxScore);
                        if (reportFilter.dateFrom)   rows = rows.filter(r => new Date(r.created_at) >= new Date(reportFilter.dateFrom));
                        if (reportFilter.dateTo)     rows = rows.filter(r => new Date(r.created_at) <= new Date(reportFilter.dateTo + "T23:59:59"));
                        downloadReportsCSV(rows);
                      }}
                      style={{ ...abtn("success"), fontSize: 12, padding: "8px 16px" }}>
                      Download CSV
                    </button>
                  </div>
                </div>

                {/* Summary stats */}
                {students.length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                    {[
                      ["Total Attempts",    students.length,                                                                                              "#a5b4fc"],
                      ["Avg Score",         Math.round(students.reduce((a,r) => a+r.score, 0)/students.length) + "/" + (students[0] ? maxMarksOf(students[0]) : 720),                                 "#4ade80"],
                      ["Highest Score",     Math.max(...students.map(r => r.score)) + "/" + (students[0] ? maxMarksOf(students[0]) : 720),                                                            "#fbbf24"],
                      ["Pass Rate",         Math.round(students.filter(r => r.score>=360).length/students.length*100) + "%",                             "#f472b6"],
                    ].map(([l,v,c]) => (
                      <div key={l} style={{ ...acard, padding: "12px 14px", textAlign: "center" }}>
                        <div style={{ color: c, fontWeight: 700, fontSize: "1.15rem" }}>{v}</div>
                        <div style={{ color: "#64748b", fontSize: 11, marginTop: 3 }}>{l}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Filters */}
                <div style={{ ...acard, padding: "14px 16px" }}>
                  <div style={{ color: "#94a3b8", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Filter & Sort</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                    <div>
                      <label style={alabel}>Search User ID</label>
                      <input value={reportFilter.search} onChange={e => setReportFilter(p=>({...p,search:e.target.value}))} placeholder="Paste user ID..." style={{ ...ainput, fontSize: 12 }} />
                    </div>
                    <div>
                      <label style={alabel}>Min Score</label>
                      <input type="number" value={reportFilter.minScore} onChange={e => setReportFilter(p=>({...p,minScore:e.target.value}))} placeholder="0" style={{ ...ainput, fontSize: 12 }} />
                    </div>
                    <div>
                      <label style={alabel}>Max Score</label>
                      <input type="number" value={reportFilter.maxScore} onChange={e => setReportFilter(p=>({...p,maxScore:e.target.value}))} placeholder="720" style={{ ...ainput, fontSize: 12 }} />
                    </div>
                    <div>
                      <label style={alabel}>Date From</label>
                      <input type="date" value={reportFilter.dateFrom} onChange={e => setReportFilter(p=>({...p,dateFrom:e.target.value}))} style={{ ...ainput, fontSize: 12 }} />
                    </div>
                    <div>
                      <label style={alabel}>Date To</label>
                      <input type="date" value={reportFilter.dateTo} onChange={e => setReportFilter(p=>({...p,dateTo:e.target.value}))} style={{ ...ainput, fontSize: 12 }} />
                    </div>
                    <div>
                      <label style={alabel}>Sort By</label>
                      <select value={reportFilter.sortBy} onChange={e => setReportFilter(p=>({...p,sortBy:e.target.value}))} style={{ ...ainput, fontSize: 12, cursor: "pointer" }}>
                        <option value="date">Latest First</option>
                        <option value="date_asc">Oldest First</option>
                        <option value="score_desc">Highest Score</option>
                        <option value="score_asc">Lowest Score</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ gridColumn:"1/-1", display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginTop:4 }}>
                    <div>
                      <label style={alabel}>Student Name</label>
                      <input value={reportFilter.nameSearch} onChange={e=>setReportFilter(p=>({...p,nameSearch:e.target.value}))} placeholder="Name or email..." style={{ ...ainput, fontSize:12 }} />
                    </div>
                    <div>
                      <label style={alabel}>Paper ID (Batch)</label>
                      <input value={reportFilter.paperId} onChange={e=>setReportFilter(p=>({...p,paperId:e.target.value}))} placeholder="e.g. BATCH_A" style={{ ...ainput, fontSize:12 }} />
                    </div>
                  </div>
                  <button onClick={() => setReportFilter({ search:"", minScore:"", maxScore:"", dateFrom:"", dateTo:"", sortBy:"date", paperId:"", nameSearch:"" })}
                    style={{ ...abtn("ghost"), fontSize: 11, padding: "5px 12px", marginTop: 10 }}>Clear Filters</button>
                </div>

                {/* Results table */}
                {loadingStudents ? (
                  <div style={{ textAlign: "center", color: "#64748b", padding: 40 }}>Loading...</div>
                ) : students.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#475569", padding: 40 }}>No exam attempts yet.</div>
                ) : (() => {
                  // Apply filters
                  let rows = [...students];
                  if (reportFilter.search)     rows = rows.filter(r => r.user_id.toLowerCase().includes(reportFilter.search.toLowerCase()));
                  if (reportFilter.nameSearch) rows = rows.filter(r => (r.student_name||"").toLowerCase().includes(reportFilter.nameSearch.toLowerCase()) || (r.student_email||"").toLowerCase().includes(reportFilter.nameSearch.toLowerCase()));
                  if (reportFilter.paperId)    rows = rows.filter(r => (r.paper_id||"").toLowerCase().includes(reportFilter.paperId.toLowerCase()));
                  if (reportFilter.minScore)   rows = rows.filter(r => r.score >= +reportFilter.minScore);
                  if (reportFilter.maxScore)   rows = rows.filter(r => r.score <= +reportFilter.maxScore);
                  if (reportFilter.dateFrom)   rows = rows.filter(r => new Date(r.created_at) >= new Date(reportFilter.dateFrom));
                  if (reportFilter.dateTo)     rows = rows.filter(r => new Date(r.created_at) <= new Date(reportFilter.dateTo + "T23:59:59"));
                  // Sort
                  if (reportFilter.sortBy === "date")       rows.sort((a,b) => new Date(b.created_at)-new Date(a.created_at));
                  if (reportFilter.sortBy === "date_asc")   rows.sort((a,b) => new Date(a.created_at)-new Date(b.created_at));
                  if (reportFilter.sortBy === "score_desc") rows.sort((a,b) => b.score-a.score);
                  if (reportFilter.sortBy === "score_asc")  rows.sort((a,b) => a.score-b.score);

                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      {/* Table header */}
                      <div style={{ display: "grid", gridTemplateColumns: "28px 1fr 110px 90px 80px 80px 80px 70px", gap: 8, padding: "8px 14px", background: "rgba(99,102,241,0.15)", borderRadius: "10px 10px 0 0", fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>
                        <div>#</div>
                        <div>User</div>
                        <div>Date & Time</div>
                        <div>Score</div>
                        <div style={{ color: "#4ade80" }}>Correct</div>
                        <div style={{ color: "#f87171" }}>Wrong</div>
                        <div>Skip</div>
                        <div>Pctile</div>
                      </div>

                      {rows.length === 0 ? (
                        <div style={{ textAlign: "center", color: "#475569", padding: 20, fontSize: 13 }}>No results match filters.</div>
                      ) : rows.map((r, i) => {
                        const pct      = Math.round((r.score / maxMarksOf(r)) * 100);
                        const date     = new Date(r.created_at).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" });
                        const time     = new Date(r.created_at).toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" });
                        const isOpen   = reportExpanded === r.id;
                        const st       = r.subject_times || {};
                        const subjList = ["Physics","Chemistry","Botany","Zoology"];

                        return (
                          <div key={r.id || i}>
                            {/* Main row */}
                            <div
                              onClick={() => setReportExpanded(isOpen ? null : r.id)}
                              style={{ display: "grid", gridTemplateColumns: "28px 1fr 110px 90px 80px 80px 80px 70px", gap: 8, padding: "10px 14px", background: isOpen ? "rgba(99,102,241,0.1)" : (i%2===0 ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.015)"), cursor: "pointer", borderRadius: isOpen ? "0" : "0", alignItems: "center", transition: "background 0.15s" }}
                              onMouseEnter={e => e.currentTarget.style.background="rgba(99,102,241,0.08)"}
                              onMouseLeave={e => e.currentTarget.style.background=isOpen?"rgba(99,102,241,0.1)":(i%2===0?"rgba(255,255,255,0.025)":"rgba(255,255,255,0.015)")}>
                              <div style={{ color: "#475569", fontSize: 11 }}>{i+1}</div>
                              <div>
                                <div style={{ fontSize: 12, color: "#e2e8f0", fontWeight: 600 }}>{r.student_name || r.student_email?.split("@")[0] || r.user_id.slice(0,10)+"..."}</div>
                              <div style={{ fontSize: 10, color: "#475569" }}>{r.student_email || r.user_id.slice(0,12)+"..."}</div>
                                <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                                  <div style={{ height: 4, width: 60, background: "rgba(0,0,0,0.2)", borderRadius: 99 }}>
                                    <div style={{ height: "100%", borderRadius: 99, background: pct>=50?"#22c55e":"#ef4444", width: pct+"%" }} />
                                  </div>
                                  <span style={{ fontSize: 10, color: "#64748b" }}>{pct}%</span>
                                </div>
                              </div>
                              <div style={{ fontSize: 11, color: "#94a3b8" }}>{date}<br/><span style={{ color: "#475569" }}>{time}</span></div>
                              <div style={{ fontWeight: 700, color: pct>=50?"#4ade80":"#f87171", fontSize: "0.9rem" }}>{r.score}<span style={{ color: "#374151", fontWeight: 400, fontSize: 10 }}>/{maxMarksOf(r)}</span></div>
                              <div style={{ color: "#4ade80", fontWeight: 600, fontSize: 13 }}>{r.correct}</div>
                              <div style={{ color: "#f87171", fontWeight: 600, fontSize: 13 }}>{r.wrong}</div>
                              <div style={{ color: "#64748b", fontSize: 13 }}>{r.unattempted}</div>
                              <div style={{ color: "#fbbf24", fontSize: 12 }}>{r.percentile != null ? r.percentile+"%" : ""}</div>
                            </div>

                            {/* Expanded detail row */}
                            {isOpen && (
                              <div style={{ background: "rgba(99,102,241,0.06)", borderTop: "1px solid rgba(99,102,241,0.15)", padding: "14px 18px", display: "flex", gap: 16, flexWrap: "wrap" }}>
                                {/* Subject time breakdown */}
                                <div style={{ flex: 1, minWidth: 200 }}>
                                  <div style={{ color: "#a5b4fc", fontSize: 11, fontWeight: 600, marginBottom: 8, textTransform: "uppercase" }}>Time per Subject</div>
                                  {subjList.map(s => {
                                    const t = st[s] || 0;
                                    const tot = subjList.reduce((a,b) => a+(st[b]||0), 0) || 1;
                                    return (
                                      <div key={s} style={{ marginBottom: 6 }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 2 }}>
                                          <span style={{ color: "#94a3b8" }}>{s}</span>
                                          <span style={{ color: "#64748b" }}>{Math.floor(t/60)}m {t%60}s</span>
                                        </div>
                                        <div style={{ height: 4, background: "rgba(0,0,0,0.2)", borderRadius: 99 }}>
                                          <div style={{ height: "100%", borderRadius: 99, background: "#6366f1", width: Math.round(t/tot*100)+"%" }} />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                                {/* Score breakdown */}
                                <div style={{ flex: 1, minWidth: 160 }}>
                                  <div style={{ color: "#a5b4fc", fontSize: 11, fontWeight: 600, marginBottom: 8, textTransform: "uppercase" }}>Score Breakdown</div>
                                  {[
                                    ["Correct",     r.correct,     "+"+r.correct*4+" marks",    "#4ade80"],
                                    ["Wrong",       r.wrong,       "-"+r.wrong+" marks",          "#f87171"],
                                    ["Unattempted", r.unattempted, "0 marks",                    "#64748b"],
                                    ["Total Score", r.score+"/"+maxMarksOf(r),"",                           "#a5b4fc"],
                                  ].map(([l,v,extra,c]) => (
                                    <div key={l} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                                      <span style={{ color: "#94a3b8" }}>{l}</span>
                                      <span style={{ color: c, fontWeight: 600 }}>{v} <span style={{ color: "#475569", fontWeight: 400, fontSize: 10 }}>{extra}</span></span>
                                    </div>
                                  ))}
                                </div>
                                {/* Download individual report */}
                                <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 6 }}>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); downloadReportsCSV([r]); }}
                                    style={{ ...abtn("ghost"), fontSize: 11, padding: "6px 12px" }}>
                                    Download Row
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setStudentReportEmail(r.student_email || r.user_id); setStudentTab("studentcard"); }}
                                    style={{ ...abtn("primary"), fontSize: 11, padding: "6px 12px" }}>
                                    All Tests
                                  </button>
                                  <div style={{ fontSize: 10, color: "#374151", textAlign: "center" }}>{r.student_name || r.user_id.slice(0,8)}</div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Footer */}
                      {rows.length > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(99,102,241,0.08)", borderRadius: "0 0 10px 10px", fontSize: 12 }}>
                          <span style={{ color: "#64748b" }}>{"Showing " + rows.length + " of " + students.length + " attempts"}</span>
                          <button
                            onClick={() => downloadReportsCSV(rows)}
                            style={{ ...abtn("success"), fontSize: 11, padding: "6px 14px" }}>
                            Download Filtered CSV
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

        {/* BRANDING TAB */}

            {/* STUDENT REPORT CARD SUB-TAB */}
            {studentTab === "studentcard" && (
              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ color:"#a5b4fc", fontWeight:700, fontSize:"1rem" }}>Student Report Card</div>
                  <div style={{ color:"#64748b", fontSize:12 }}>All tests by one student</div>
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <input value={studentReportEmail} onChange={e=>setStudentReportEmail(e.target.value)}
                    placeholder="Enter student email or name, then press Enter"
                    style={{ ...ainput, flex:1 }}
                    onKeyDown={async e => { if (e.key !== "Enter") return; setStudentReportLoading(true); const q=studentReportEmail.trim(); const { data } = await supabase.from("test_results").select("id,student_name,student_email,test_name,paper_id,score,correct,wrong,unattempted,subject_times,created_at,batch_test_id,percentile").or("student_email.ilike.%"+q+"%,student_name.ilike.%"+q+"%").order("created_at",{ascending:true}); setStudentReportData(data||[]); setStudentReportLoading(false); }} />
                  <button onClick={async()=>{ setStudentReportLoading(true); const q=studentReportEmail.trim(); const {data}=await supabase.from("test_results").select("id,student_name,student_email,test_name,paper_id,score,correct,wrong,unattempted,subject_times,created_at,batch_test_id,percentile").or("student_email.ilike.%"+q+"%,student_name.ilike.%"+q+"%").order("created_at",{ascending:true}); setStudentReportData(data||[]); setStudentReportLoading(false); }} style={abtn("primary")}>Search</button>
                  {studentReportData.length > 0 && <button onClick={()=>downloadReportsCSV(studentReportData)} style={{ ...abtn("success"), fontSize:12 }}>CSV</button>}
                </div>

                {studentReportLoading ? <div style={{ textAlign:"center", color:"#64748b", padding:30 }}>Loading...</div>
                : studentReportData.length === 0 ? <div style={{ color:"#475569", fontSize:13, textAlign:"center", padding:20 }}>Search by email or name and press Enter or click Search.</div>
                : (() => {
                  const name  = studentReportData[0]?.student_name || studentReportData[0]?.student_email || "Student";
                  const avgSc = Math.round(studentReportData.reduce((a,r)=>a+r.score,0)/studentReportData.length);
                  const best  = Math.max(...studentReportData.map(r=>r.score));
                  const trend = studentReportData.length > 1
                    ? (studentReportData[studentReportData.length-1].score > studentReportData[0].score ? "Improving" : "Declining") : "Single test";
                  const trendCol = trend==="Improving"?"#4ade80":trend==="Declining"?"#f87171":"#64748b";
                  return (
                    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                      <div style={{ ...acard, padding:"14px 18px" }}>
                        <div style={{ color:"#e2e8f0", fontWeight:700, marginBottom:10 }}>{name}</div>
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
                          {[["Tests",studentReportData.length,"#a5b4fc"],["Best",best+"/"+(studentReportData[0]?maxMarksOf(studentReportData[0]):720),"#4ade80"],["Avg",avgSc+"/"+(studentReportData[0]?maxMarksOf(studentReportData[0]):720),"#fbbf24"],["Trend",trend,trendCol]].map(([l,v,c])=>(
                            <div key={l} style={{ background:"rgba(255,255,255,0.03)", borderRadius:8, padding:"8px 10px", textAlign:"center" }}>
                              <div style={{ color:c, fontWeight:700 }}>{v}</div>
                              <div style={{ color:"#64748b", fontSize:10, marginTop:2 }}>{l}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                      {studentReportData.length > 1 && (
                        <div style={{ ...acard, padding:"14px 18px" }}>
                          <div style={{ color:"#a5b4fc", fontSize:11, fontWeight:600, marginBottom:8, textTransform:"uppercase" }}>Score Trend</div>
                          <div style={{ display:"flex", alignItems:"flex-end", gap:4, height:70 }}>
                            {studentReportData.map((r,i)=>{ const h=Math.max(4,Math.round((r.score / maxMarksOf(r))*100)); return (
                              <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
                                <div style={{ fontSize:8, color:"#64748b" }}>{r.score}</div>
                                <div style={{ width:"100%", background:h>=50?"#6366f1":"#ef4444", borderRadius:"2px 2px 0 0", height:h*0.65+"%" }} />
                                <div style={{ fontSize:7, color:"#475569", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:36 }}>{r.test_name||"T"+(i+1)}</div>
                              </div>
                            );})}
                          </div>
                        </div>
                      )}
                      {studentReportData.map((r,i)=>{ const pct=Math.round((r.score / maxMarksOf(r))*100); const d=new Date(r.created_at).toLocaleDateString("en-IN",{day:"numeric",month:"short"}); const st=r.subject_times||{}; return (
                        <div key={r.id} style={{ ...acard, padding:"12px 16px", display:"flex", alignItems:"center", gap:12 }}>
                          <div style={{ width:36, height:36, borderRadius:"50%", background:pct>=50?"rgba(34,197,94,0.2)":"rgba(239,68,68,0.2)", border:"2px solid "+(pct>=50?"#22c55e":"#ef4444"), display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, color:pct>=50?"#4ade80":"#f87171", fontSize:11, flexShrink:0 }}>{pct}%</div>
                          <div style={{ flex:1 }}>
                            <div style={{ color:"#e2e8f0", fontWeight:600, fontSize:13 }}>{r.test_name||"Test "+(i+1)}</div>
                            <div style={{ color:"#475569", fontSize:11 }}>{d} | {r.paper_id}</div>
                            <div style={{ display:"flex", gap:8, fontSize:10, color:"#64748b", marginTop:2 }}>
                              {["Physics","Chemistry","Botany","Zoology"].map(s=><span key={s}>{s.slice(0,3)}: {Math.floor((st[s]||0)/60)}m</span>)}
                            </div>
                          </div>
                          <div style={{ textAlign:"right", flexShrink:0 }}>
                            <div style={{ color:"#e2e8f0", fontWeight:700 }}>{r.score}<span style={{ color:"#374151", fontSize:10, fontWeight:400 }}>/{maxMarksOf(r)}</span></div>
                            <div style={{ fontSize:11 }}><span style={{ color:"#4ade80" }}>{r.correct}C</span> <span style={{ color:"#f87171" }}>{r.wrong}W</span> <span style={{ color:"#94a3b8" }}>{r.unattempted}S</span></div>
                            {r.percentile!=null && <div style={{ fontSize:10, color:"#818cf8" }}>{r.percentile}th %ile</div>}
                          </div>
                        </div>
                      );})}
                    </div>
                  );
                })()}
              </div>
            )}

                {/* ADD STUDENTS SUB-TAB */}
            {studentTab === "add" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {stuCsvMsg && <div style={mstyle(stuCsvMsg)}>{stuCsvMsg.text}</div>}

                {/* Format guide */}
                <div style={{ ...acard, padding: "18px 20px" }}>
                  <div style={{ color: "#a5b4fc", fontWeight: 700, marginBottom: 10 }}>CSV Format</div>
                  <div style={{ background: "#070d1a", borderRadius: 8, padding: "10px 14px", fontFamily: "monospace", fontSize: 12, color: "#86efac", marginBottom: 12, overflowX: "auto" }}>
                    email, password, full_name
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 14 }}>
                    {[
                      ["email",     "Student email address (required)"],
                      ["password",  "Login password, min 6 chars (required)"],
                      ["full_name", "Student full name (optional)"],
                    ].map(([k, v]) => (
                      <div key={k} style={{ fontSize: 12 }}>
                        <span style={{ color: "#fbbf24", fontFamily: "monospace" }}>{k}</span>
                        <span style={{ color: "#64748b" }}> - {v}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      const s = "email,password,full_name\nstudent1@example.com,Pass@1234,Rahul Sharma\nstudent2@example.com,Pass@5678,Priya Singh\nstudent3@example.com,Pass@9012,Amit Patel\n";
                      const b = new Blob([s], { type: "text/csv" });
                      const u = URL.createObjectURL(b);
                      const a = document.createElement("a");
                      a.href = u; a.download = "sample_students.csv"; a.click();
                      URL.revokeObjectURL(u);
                    }}
                    style={{ ...abtn("ghost"), fontSize: 12 }}>
                    Download Sample CSV
                  </button>
                </div>

                {/* Upload area */}
                <div
                  onClick={() => { const i = document.createElement("input"); i.type = "file"; i.accept = ".csv"; i.onchange = e => handleStudentCSVFile(e.target.files[0]); i.click(); }}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); handleStudentCSVFile(e.dataTransfer.files[0]); }}
                  style={{ border: "2px dashed rgba(99,102,241,0.4)", borderRadius: 12, padding: 28, textAlign: "center", cursor: "pointer", background: "rgba(99,102,241,0.04)" }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>[ CSV ]</div>
                  <div style={{ color: "#94a3b8", fontSize: 14 }}>Click or drag and drop student CSV here</div>
                  <div style={{ color: "#475569", fontSize: 12, marginTop: 4 }}>Each row creates one student account</div>
                </div>

                {/* Preview */}
                {stuCsvPreview.length > 0 && (
                  <div style={{ ...acard, padding: "14px 16px" }}>
                    <div style={{ color: "#a5b4fc", fontWeight: 700, marginBottom: 8 }}>Preview (first 5)</div>
                    {stuCsvPreview.map((s, i) => (
                      <div key={i} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "8px 12px", marginBottom: 6, fontSize: 12, display: "flex", gap: 12, alignItems: "center" }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(99,102,241,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#818cf8", fontWeight: 700, fontSize: 11, flexShrink: 0 }}>{i + 1}</div>
                        <div>
                          <div style={{ color: "#e2e8f0" }}>{s.full_name || "(no name)"}</div>
                          <div style={{ color: "#64748b" }}>{s.email}</div>
                        </div>
                        <div style={{ marginLeft: "auto", color: "#475569", fontFamily: "monospace", fontSize: 11 }}>{"*".repeat(s.password.length)}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Progress */}
                {stuCsvProgress && (
                  <div style={{ color: "#a5b4fc", fontSize: 13, textAlign: "center" }}>Creating accounts: {stuCsvProgress}</div>
                )}

                {/* Upload button */}
                {stuCsvRows && stuCsvRows.length > 0 && (
                  <button
                    onClick={handleStudentCSVUpload}
                    disabled={stuCsvLoading}
                    style={{ ...abtn("success"), padding: "13px", fontSize: "1rem", opacity: stuCsvLoading ? 0.6 : 1 }}>
                    {stuCsvLoading ? "Creating accounts..." : "Create " + stuCsvRows.length + " Student Accounts"}
                  </button>
                )}

                <div style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 10, padding: "12px 16px", fontSize: 12, color: "#94a3b8", lineHeight: 1.8 }}>
                  <span style={{ color: "#fbbf24", fontWeight: 600 }}>Note: </span>
                  Accounts are created using Supabase Auth. Students can log in immediately with the email and password you set. Share credentials with students separately.
                </div>
              </div>
            )}
          </div>
        )}
        {tab === "analytics" && (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

            {/* Header row: paper filter + load + downloads */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
              <div>
                <div style={{ color:"#a5b4fc", fontWeight:700, fontSize:"1rem" }}>Analytics</div>
                <div style={{ color:"#64748b", fontSize:12, marginTop:2 }}>Per-student results and question difficulty</div>
              </div>
              <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
                <div style={{ position:"relative" }}>
                  <input
                    value={paperFilter}
                    onChange={e => { setPaperFilter(e.target.value); setShowPaperDrop(true); }}
                    onFocus={() => setShowPaperDrop(true)}
                    onBlur={() => setTimeout(() => setShowPaperDrop(false), 150)}
                    onKeyDown={e => { if (e.key === "Enter") { setShowPaperDrop(false); loadAnalytics(); } if (e.key === "Escape") setShowPaperDrop(false); }}
                    placeholder="e.g. SUN_A"
                    style={{ ...ainput, width:180, fontSize:12 }}
                    autoComplete="off"
                  />
                  {showPaperDrop && availablePapers.filter(p => p.toLowerCase().includes(paperFilter.toLowerCase())).length > 0 && (
                    <div style={{ position:"absolute", top:"100%", left:0, right:0, zIndex:999, background:"#1e293b", border:"1px solid rgba(99,102,241,0.4)", borderRadius:8, marginTop:4, maxHeight:200, overflowY:"auto", boxShadow:"0 8px 24px rgba(0,0,0,0.4)" }}>
                      {availablePapers
                        .filter(p => p.toLowerCase().includes(paperFilter.toLowerCase()))
                        .map(p => (
                          <div
                            key={p}
                            onMouseDown={() => { setPaperFilter(p); setShowPaperDrop(false); }}
                            style={{ padding:"9px 14px", cursor:"pointer", fontSize:13, color: p === paperFilter ? "#a5b4fc" : "#e2e8f0", background: p === paperFilter ? "rgba(99,102,241,0.2)" : "transparent", borderBottom:"1px solid rgba(255,255,255,0.05)", display:"flex", justifyContent:"space-between", alignItems:"center" }}
                            onMouseEnter={e => e.currentTarget.style.background="rgba(99,102,241,0.12)"}
                            onMouseLeave={e => e.currentTarget.style.background= p === paperFilter ? "rgba(99,102,241,0.2)" : "transparent"}
                          >
                            <span>{p}</span>
                            {p === paperFilter && <span style={{ color:"#6366f1", fontSize:10 }}>selected</span>}
                          </div>
                        ))
                      }
                    </div>
                  )}
                </div>
                <button onClick={() => { setShowPaperDrop(false); loadAnalytics(); }} disabled={analyticsLoading} style={abtn("primary")}>{analyticsLoading ? "Loading..." : "Load"}</button>
                {analyticsData?.byStudent?.length > 0 && (<>
                  <button onClick={downloadAnalyticsCSV} style={{ ...abtn("success"), fontSize:12, padding:"8px 14px" }}>CSV</button>
                  <button onClick={downloadAnalyticsPDF} style={{ ...abtn("ghost"), fontSize:12, padding:"8px 14px" }}>PDF Report</button>
                </>)}
              </div>
            </div>

            {analyticsLoading ? (
              <div style={{ textAlign:"center", color:"#64748b", padding:40 }}>Loading analytics...</div>
            ) : !analyticsData ? (
              <div style={{ textAlign:"center", color:"#475569", padding:40 }}>Click Load to fetch analytics for a paper.</div>
            ) : analyticsData.noResults ? (
              <div style={{ textAlign:"center", color:"#475569", padding:40 }}>
                <div style={{ fontSize:14, marginBottom:8 }}>No test attempts found for paper <span style={{ color:"#fbbf24", fontWeight:700 }}>{analyticsData.pid || paperFilter}</span>.</div>
                <div style={{ fontSize:12, color:"#374151" }}>Make sure students submitted the exam with this exact paper ID. Check the Paper ID in your batch test settings.</div>
              </div>
            ) : (
              <>
                {/* Class summary cards */}
                {analyticsData.byStudent?.length > 0 && (
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
                    {[
                      ["Total Students",  analyticsData.byStudent.length, "#a5b4fc"],
                      ["Total Attempts",  analyticsData.total,            "#818cf8"],
                      ["Max Marks",       analyticsData.totalMarks,       "#e2e8f0"],
                      ["Class Average",   analyticsData.classAvg + "/" + analyticsData.totalMarks, "#fbbf24"],
                      ["Highest Score",   analyticsData.classMax + "/" + analyticsData.totalMarks, "#4ade80"],
                      ["Lowest Score",    analyticsData.classMin + "/" + analyticsData.totalMarks, "#f87171"],
                    ].map(([l,v,c]) => (
                      <div key={l} style={{ ...acard, padding:"12px 14px", textAlign:"center" }}>
                        <div style={{ color:c, fontWeight:700, fontSize:"1.1rem" }}>{v}</div>
                        <div style={{ color:"#64748b", fontSize:11, marginTop:3 }}>{l}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Sub-tabs */}
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={()=>setAnalyticsSubTab("students")} style={abtn(analyticsSubTab==="students"?"primary":"ghost")}>Student Results ({analyticsData.byStudent?.length||0})</button>
                  <button onClick={()=>setAnalyticsSubTab("questions")} style={abtn(analyticsSubTab==="questions"?"primary":"ghost")}>Question Difficulty ({analyticsData.byQ?.length||0})</button>
                </div>

                {/* STUDENT RESULTS TABLE */}
                {analyticsSubTab === "students" && (
                  analyticsData.byStudent?.length === 0 ? (
                    <div style={{ textAlign:"center", color:"#475569", padding:30, fontSize:13 }}>No student data available.</div>
                  ) : (
                    <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                      {/* Table header */}
                      <div style={{ display:"grid", gridTemplateColumns:"40px 1fr 80px 100px 100px 80px 80px 110px", gap:6, padding:"9px 12px", background:"rgba(99,102,241,0.2)", borderRadius:"10px 10px 0 0", fontSize:10, color:"#94a3b8", textTransform:"uppercase", letterSpacing:0.5, fontWeight:600 }}>
                        <div>#</div>
                        <div>Student</div>
                        <div>Attempts</div>
                        <div style={{ color:"#e2e8f0" }}>Latest Score</div>
                        <div style={{ color:"#fbbf24" }}>Avg Score</div>
                        <div style={{ color:"#4ade80" }}>Best</div>
                        <div style={{ color:"#f87171" }}>Lowest</div>
                        <div>Actions</div>
                      </div>

                      {analyticsData.byStudent.map((s, i) => {
                        const pct    = Math.round(s.avg / analyticsData.totalMarks * 100);
                        const pctCol = pct >= 50 ? "#4ade80" : "#f87171";
                        const isSelected = selectedStudent?.email === s.email;
                        return (
                          <React.Fragment key={s.email}>
                            <div
                              onClick={() => setSelectedStudent(isSelected ? null : s)}
                              style={{ display:"grid", gridTemplateColumns:"40px 1fr 80px 100px 100px 80px 80px 110px", gap:6, padding:"10px 12px", background:isSelected?"rgba(99,102,241,0.15)":i%2===0?"rgba(255,255,255,0.03)":"rgba(255,255,255,0.018)", alignItems:"center", cursor:"pointer", transition:"background 0.15s" }}
                              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background="rgba(99,102,241,0.08)"; }}
                              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background=i%2===0?"rgba(255,255,255,0.03)":"rgba(255,255,255,0.018)"; }}
                            >
                              <div style={{ color:i<3?"#fbbf24":"#475569", fontWeight:700, fontSize:13 }}>{i+1}</div>
                              <div>
                                <div style={{ color:"#e2e8f0", fontWeight:600, fontSize:13 }}>{s.name}</div>
                                <div style={{ marginTop:3, height:3, width:80, background:"rgba(0,0,0,0.3)", borderRadius:99 }}>
                                  <div style={{ height:"100%", borderRadius:99, background:pctCol, width:pct+"%" }} />
                                </div>
                              </div>
                              <div style={{ color:"#94a3b8", fontSize:12, textAlign:"center" }}>{s.attempts}</div>
                              <div style={{ fontWeight:700, color:pctCol, fontSize:13, textAlign:"center" }}>
                                {s.latestScore}<span style={{ color:"#374151", fontSize:10, fontWeight:400 }}>/{analyticsData.totalMarks}</span>
                              </div>
                              <div style={{ fontWeight:700, color:"#fbbf24", fontSize:13, textAlign:"center" }}>
                                {s.avg}<span style={{ color:"#374151", fontSize:10, fontWeight:400 }}>/{analyticsData.totalMarks}</span>
                                <div style={{ fontSize:9, color:"#475569" }}>{pct}%</div>
                              </div>
                              <div style={{ color:"#4ade80", fontWeight:600, fontSize:12, textAlign:"center" }}>{s.max}</div>
                              <div style={{ color:"#f87171", fontWeight:600, fontSize:12, textAlign:"center" }}>{s.min}</div>
                              <div style={{ display:"flex", gap:5, justifyContent:"center" }}>
                                <button onClick={e => { e.stopPropagation(); setSelectedStudent(isSelected ? null : s); }}
                                  style={{ ...abtn(isSelected?"primary":"ghost"), fontSize:10, padding:"4px 10px" }}>
                                  {isSelected ? "Hide" : "Details"}
                                </button>
                              </div>
                            </div>

                            {isSelected && (
                              <div style={{ background:"rgba(99,102,241,0.07)", borderTop:"1px solid rgba(99,102,241,0.2)", borderBottom:"1px solid rgba(99,102,241,0.2)", padding:"18px 20px" }}>
                                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:8 }}>
                                  <div>
                                    <div style={{ color:"#a5b4fc", fontWeight:700, fontSize:"0.95rem" }}>{s.name}</div>
                                    <div style={{ color:"#64748b", fontSize:12 }}>{s.attempts} attempt(s) &nbsp;|&nbsp; Best: {s.max}/{analyticsData.totalMarks} &nbsp;|&nbsp; Avg: {s.avg}/{analyticsData.totalMarks}</div>
                                  </div>
                                  <button
                                    onClick={async () => {
                                      const win = window.open("", "_blank");
                                      if (!win) { alert("Please allow popups for this site to view PDF reports.\n\nTo fix: click the popup blocked icon in your browser address bar and allow popups from this site."); return; }
                                      win.document.write("<html><body style='font-family:Arial,sans-serif;padding:40px;background:#f8fafc;color:#333;text-align:center;margin-top:80px'><div style='font-size:24px;margin-bottom:12px'>&#9203;</div><h2 style='color:#312e81'>Generating Report...</h2><p style='color:#6b7280'>Please wait while questions are loaded.</p></body></html>");
                                      const { data, error } = await supabase.from("questions")
                                        .select("id,number,subject,question_text,equation,option_a,option_b,option_c,option_d,option_a_image,option_b_image,option_c_image,option_d_image,correct,solution_text,solution_eq,diagram_data")
                                        .eq("paper_id", paperFilter || "PAPER_01").order("number", { ascending:true });
                                      if (error || !data?.length) {
                                        win.document.write("<html><body style='font-family:Arial;padding:40px;color:red'><h2>Error loading questions</h2><p>" + (error?.message || "No questions found for paper: " + (paperFilter||"PAPER_01")) + "</p></body></html>");
                                        return;
                                      }
                                      downloadStudentPDF(s, data, win, analyticsData);
                                    }}
                                    style={{ ...abtn("primary"), fontSize:12, padding:"7px 16px" }}>
                                    Download PDF Report (Latest Attempt)
                                  </button>
                                </div>

                                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                                  <div style={{ color:"#64748b", fontSize:11, textTransform:"uppercase", letterSpacing:0.5, marginBottom:4 }}>All Attempts</div>
                                  {s.rawResults.map((r, ri) => {
                                    const rPct = Math.round((r.score||0) / analyticsData.totalMarks * 100);
                                    const rCol = rPct >= 50 ? "#4ade80" : "#f87171";
                                    const st   = r.subject_times || {};
                                    return (
                                      <div key={r.id || ri} style={{ background:"rgba(255,255,255,0.04)", borderRadius:10, padding:"12px 14px", display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
                                        <div style={{ width:44, height:44, borderRadius:"50%", background:rPct>=50?"rgba(34,197,94,0.15)":"rgba(239,68,68,0.15)", border:"2px solid "+(rPct>=50?"#22c55e":"#ef4444"), display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontWeight:700, color:rCol, fontSize:12 }}>{rPct}%</div>
                                        <div style={{ flex:1 }}>
                                          <div style={{ color:"#e2e8f0", fontWeight:600, fontSize:13 }}>{r.test_name || "Mock Test"}</div>
                                          <div style={{ color:"#475569", fontSize:11, marginTop:2 }}>{new Date(r.created_at).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" })}{r.percentile != null && <span style={{ color:"#818cf8", marginLeft:8 }}>{r.percentile}th %ile</span>}</div>
                                          <div style={{ display:"flex", gap:10, fontSize:11, color:"#64748b", marginTop:3 }}>{["Physics","Chemistry","Botany","Zoology"].map(sub => <span key={sub}>{sub.slice(0,3)}: {Math.floor((st[sub]||0)/60)}m</span>)}</div>
                                        </div>
                                        <div style={{ textAlign:"right", flexShrink:0 }}>
                                          <div style={{ fontWeight:700, color:rCol, fontSize:"1.1rem" }}>{r.score}<span style={{ color:"#374151", fontSize:10, fontWeight:400 }}>/{analyticsData.totalMarks}</span></div>
                                          <div style={{ fontSize:11, marginTop:2 }}><span style={{ color:"#4ade80" }}>{r.correct}C </span><span style={{ color:"#f87171" }}>{r.wrong}W </span><span style={{ color:"#64748b" }}>{r.unattempted}S</span></div>
                                        </div>
                                        <button
                                          onClick={async () => {
                                            const sa = { ...s, rawResults: [r] };
                                            const win = window.open("", "_blank");
                                            if (!win) { alert("Please allow popups for this site to view PDF reports.\n\nTo fix: click the popup blocked icon in your browser address bar and allow popups from this site."); return; }
                                            win.document.write("<html><body style='font-family:Arial,sans-serif;padding:40px;background:#f8fafc;color:#333;text-align:center;margin-top:80px'><div style='font-size:24px;margin-bottom:12px'>&#9203;</div><h2 style='color:#312e81'>Generating Report...</h2><p style='color:#6b7280'>Please wait...</p></body></html>");
                                            const { data, error } = await supabase.from("questions")
                                              .select("id,number,subject,question_text,equation,option_a,option_b,option_c,option_d,option_a_image,option_b_image,option_c_image,option_d_image,correct,solution_text,solution_eq,diagram_data")
                                              .eq("paper_id", r.paper_id || paperFilter || "PAPER_01").order("number", { ascending:true });
                                            if (error || !data?.length) {
                                              win.document.write("<html><body style='font-family:Arial;padding:40px;color:red'><h2>Error</h2><p>" + (error?.message || "No questions found.") + "</p></body></html>");
                                              return;
                                            }
                                            downloadStudentPDF(sa, data, win, analyticsData);
                                          }}
                                          style={{ ...abtn("ghost"), fontSize:11, padding:"6px 12px", flexShrink:0 }}>PDF
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </React.Fragment>
                        );
                      })}

                      <div style={{ display:"grid", gridTemplateColumns:"40px 1fr 80px 100px 100px 80px 80px 110px", gap:6, padding:"10px 12px", background:"rgba(99,102,241,0.12)", borderRadius:"0 0 10px 10px", fontSize:11, fontWeight:700, color:"#a5b4fc", alignItems:"center" }}>
                        <div></div>
                        <div>CLASS AVERAGE</div>
                        <div style={{ textAlign:"center" }}>{analyticsData.total}</div>
                        <div style={{ textAlign:"center" }}>-</div>
                        <div style={{ textAlign:"center", color:"#fbbf24" }}>{analyticsData.classAvg}/{analyticsData.totalMarks}</div>
                        <div style={{ textAlign:"center", color:"#4ade80" }}>{analyticsData.classMax}</div>
                        <div style={{ textAlign:"center", color:"#f87171" }}>{analyticsData.classMin}</div>
                        <div></div>
                      </div>
                    </div>
                  )
                )}

                {/* QUESTION DIFFICULTY TABLE */}
                {analyticsSubTab === "questions" && (
                  analyticsData.byQ?.length === 0 ? (
                    <div style={{ textAlign:"center", color:"#475569", padding:30, fontSize:13 }}>
                      {analyticsData.noQuestions ? "No questions found for this paper ID." : "No answer data available for question analytics."}
                    </div>
                  ) : (
                    <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                      <div style={{ display:"grid", gridTemplateColumns:"40px 60px 1fr 70px 70px 70px 90px", gap:8, padding:"8px 12px", background:"rgba(99,102,241,0.15)", borderRadius:"10px 10px 0 0", fontSize:10, color:"#64748b", textTransform:"uppercase", letterSpacing:0.5 }}>
                        <div>Q#</div><div>Subject</div><div>Question</div>
                        <div style={{ color:"#4ade80" }}>Correct</div>
                        <div style={{ color:"#f87171" }}>Wrong</div>
                        <div>Skip</div>
                        <div style={{ color:"#fbbf24" }}>Accuracy</div>
                      </div>
                      {analyticsData.byQ.map((s, i) => {
                        const acc = s.attempts > 0 ? Math.round(s.correct/s.attempts*100) : 0;
                        const accColor = acc >= 70 ? "#4ade80" : acc >= 40 ? "#fbbf24" : "#f87171";
                        return (
                          <div key={s.q.id} style={{ display:"grid", gridTemplateColumns:"40px 60px 1fr 70px 70px 70px 90px", gap:8, padding:"9px 12px", background:i%2===0?"rgba(255,255,255,0.025)":"rgba(255,255,255,0.015)", alignItems:"center" }}>
                            <div style={{ color:"#818cf8", fontWeight:700, fontSize:12 }}>Q{s.q.number}</div>
                            <div style={{ fontSize:10, color:"#94a3b8", background:"rgba(255,255,255,0.06)", borderRadius:4, padding:"2px 5px" }}>{s.q.subject.slice(0,4)}</div>
                            <div style={{ fontSize:11, color:"#c7d2fe" }}>{(s.q.question_text||"").slice(0,55)}{(s.q.question_text||"").length>55?"...":""}</div>
                            <div style={{ color:"#4ade80", fontWeight:600, fontSize:13 }}>{s.correct}</div>
                            <div style={{ color:"#f87171", fontWeight:600, fontSize:13 }}>{s.wrong}</div>
                            <div style={{ color:"#64748b", fontSize:13 }}>{s.skip}</div>
                            <div>
                              <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                                <div style={{ flex:1, height:5, background:"rgba(0,0,0,0.3)", borderRadius:99 }}>
                                  <div style={{ height:"100%", borderRadius:99, background:accColor, width:acc+"%" }} />
                                </div>
                                <span style={{ color:accColor, fontWeight:700, fontSize:11, minWidth:32 }}>{acc}%</span>
                              </div>
                              <div style={{ fontSize:9, color:"#475569", marginTop:1 }}>{s.attempts} attempts</div>
                            </div>
                          </div>
                        );
                      })}
                      <div style={{ padding:"8px 12px", background:"rgba(99,102,241,0.08)", borderRadius:"0 0 10px 10px", fontSize:11, color:"#64748b" }}>
                        Based on {analyticsData.total} attempt(s)  {analyticsData.resultsWithAnswers||0} with answers. Sorted: hardest first.
                      </div>
                    </div>
                  )
                )}
              </>
            )}
          </div>
        )}

        {tab === "branding" && (
          <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
            {brandingMsg && <div style={mstyle(brandingMsg)}>{brandingMsg.text}</div>}
             {/* Live Preview */}
            <div style={{ ...acard, padding:0, overflow:"hidden" }}>
              <div style={{ padding:"10px 16px", borderBottom:"1px solid rgba(255,255,255,0.08)", color:"#a5b4fc", fontWeight:700, fontSize:12, textTransform:"uppercase" }}>Live Preview</div>
              <div style={{ height:160, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:8,
                ...( brandingForm.bg_type === "solid" ? { background: brandingForm.bg_solid_color || "#0f172a" }
                   : brandingForm.bg_type === "image" && brandingForm.bg_image_data ? { backgroundImage:"url("+brandingForm.bg_image_data+")", backgroundSize:"cover", backgroundPosition:"center" }
                   : { background:"linear-gradient(135deg,"+(brandingForm.bg_gradient_from||"#0f0c29")+" 0%,"+(brandingForm.bg_gradient_to||"#302b63")+" 100%)" }) }}>
                {(brandingForm.logo_data || brandingForm.logo_url) && <img src={brandingForm.logo_data||brandingForm.logo_url} alt="logo" style={{ maxHeight:48, maxWidth:140, objectFit:"contain", borderRadius:4 }} />}
                {brandingForm.show_badge !== "false" && <div style={{ background:"rgba(168,85,247,0.3)", borderRadius:99, padding:"3px 12px", fontSize:10, color:"#c084fc", letterSpacing:1 }}>{brandingForm.badge_text || "NEET CBT"}</div>}
                <div style={{ color:"#fff", fontWeight:700, fontSize:"1.1rem" }}>{brandingForm.platform_name || "Mock Test Platform"}</div>
                <div style={{ color:"rgba(255,255,255,0.5)", fontSize:12 }}>{brandingForm.platform_tagline || "Select your role to continue"}</div>
              </div>
            </div>
             {/* Logo */}
            <div style={{ ...acard, padding:"18px 20px" }}>
              <div style={{ color:"#a5b4fc", fontWeight:700, marginBottom:12 }}>Logo</div>
              <div style={{ display:"flex", gap:12, alignItems:"flex-start", flexWrap:"wrap" }}>
                <div onClick={() => { const inp=document.createElement("input"); inp.type="file"; inp.accept="image/*"; inp.onchange=async e=>{ const f=e.target.files[0]; if(!f) return; try { const {b64}=await compressToBase64(f); setBrandingForm(p=>({...p,logo_data:b64,logo_url:""})); setBrandingMsg({type:"ok",text:"Logo ready."}); } catch(ex){ setBrandingMsg({type:"error",text:ex.message}); } }; inp.click(); }}
                  style={{ border:"2px dashed "+(brandingForm.logo_data||brandingForm.logo_url?"rgba(99,102,241,0.5)":"rgba(99,102,241,0.25)"), borderRadius:10, padding:brandingForm.logo_data?6:20, cursor:"pointer", textAlign:"center", minWidth:120 }}>
                  {(brandingForm.logo_data||brandingForm.logo_url) ? (<img src={brandingForm.logo_data||brandingForm.logo_url} alt="logo" style={{ maxHeight:60, maxWidth:160, objectFit:"contain", display:"block", margin:"0 auto 6px" }} />) : (<div style={{ color:"#64748b", fontSize:12 }}>Click to upload logo</div>)}
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:8, flex:1 }}>
                  {(brandingForm.logo_data||brandingForm.logo_url) && <button onClick={()=>setBrandingForm(p=>({...p,logo_data:"",logo_url:""}))} style={{ ...abtn("danger"), fontSize:12, padding:"6px 14px" }}>Remove Logo</button>}
                  <div><label style={alabel}>Or paste image URL</label><input value={brandingForm.logo_url||""} onChange={e=>setBrandingForm(p=>({...p,logo_url:e.target.value,logo_data:""}))} placeholder="https://example.com/logo.png" style={{ ...ainput, fontSize:12 }} /></div>
                </div>
              </div>
            </div>
             {/* Text */}
            <div style={{ ...acard, padding:"18px 20px" }}>
              <div style={{ color:"#a5b4fc", fontWeight:700, marginBottom:12 }}>Text</div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                <div><label style={alabel}>Platform Name</label><input value={brandingForm.platform_name||""} onChange={e=>setBrandingForm(p=>({...p,platform_name:e.target.value}))} placeholder="Mock Test Platform" style={ainput} /></div>
                <div><label style={alabel}>Tagline</label><input value={brandingForm.platform_tagline||""} onChange={e=>setBrandingForm(p=>({...p,platform_tagline:e.target.value}))} placeholder="Select your role to continue" style={ainput} /></div>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div style={{ color:"#e2e8f0", fontSize:13 }}>Show Badge</div>
                  <button onClick={()=>setBrandingForm(p=>({...p,show_badge:p.show_badge==="false"?"true":"false"}))} style={{ ...abtn(brandingForm.show_badge!=="false"?"success":"ghost"), minWidth:60 }}>{brandingForm.show_badge!=="false"?"ON":"OFF"}</button>
                </div>
                {brandingForm.show_badge !== "false" && <div><label style={alabel}>Badge Text</label><input value={brandingForm.badge_text||""} onChange={e=>setBrandingForm(p=>({...p,badge_text:e.target.value}))} placeholder="NEET CBT" style={ainput} /></div>}
              </div>
            </div>
             {/* Background */}
            <div style={{ ...acard, padding:"18px 20px" }}>
              <div style={{ color:"#a5b4fc", fontWeight:700, marginBottom:12 }}>Background</div>
              <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
                {["gradient","solid","image"].map(t => (
                  <button key={t} onClick={()=>setBrandingForm(p=>({...p,bg_type:t}))} style={{ ...abtn(brandingForm.bg_type===t?"primary":"ghost"), fontSize:12, padding:"7px 16px", textTransform:"capitalize" }}>{t}</button>
                ))}
              </div>
              {(!brandingForm.bg_type || brandingForm.bg_type==="gradient") && (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  {[["bg_gradient_from","Gradient From","#0f0c29"],["bg_gradient_to","Gradient To","#302b63"]].map(([k,l,d]) => (
                    <div key={k}><label style={alabel}>{l}</label>
                      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                        <input type="color" value={brandingForm[k]||d} onChange={e=>setBrandingForm(p=>({...p,[k]:e.target.value}))} style={{ width:44, height:36, borderRadius:8, border:"none", cursor:"pointer" }} />
                        <input value={brandingForm[k]||d} onChange={e=>setBrandingForm(p=>({...p,[k]:e.target.value}))} style={{ ...ainput, flex:1, fontFamily:"monospace", fontSize:12 }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {brandingForm.bg_type === "solid" && (
                <div><label style={alabel}>Background Color</label>
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <input type="color" value={brandingForm.bg_solid_color||"#0f172a"} onChange={e=>setBrandingForm(p=>({...p,bg_solid_color:e.target.value}))} style={{ width:44, height:36, borderRadius:8, border:"none", cursor:"pointer" }} />
                    <input value={brandingForm.bg_solid_color||"#0f172a"} onChange={e=>setBrandingForm(p=>({...p,bg_solid_color:e.target.value}))} style={{ ...ainput, flex:1, fontFamily:"monospace", fontSize:12 }} />
                  </div>
                </div>
              )}
              {brandingForm.bg_type === "image" && (
                <div>
                  <div onClick={()=>{ const inp=document.createElement("input"); inp.type="file"; inp.accept="image/*"; inp.onchange=e=>{ const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=ev=>{ setBrandingForm(p=>({...p,bg_image_data:ev.target.result})); setBrandingMsg({type:"ok",text:"Image ready."}); }; r.readAsDataURL(f); }; inp.click(); }}
                    style={{ border:"2px dashed rgba(99,102,241,0.3)", borderRadius:10, padding:16, cursor:"pointer", textAlign:"center", marginBottom:8 }}>
                    {brandingForm.bg_image_data ? <div style={{ color:"#4ade80", fontSize:12 }}>Image loaded. Click to replace.</div> : <div style={{ color:"#64748b", fontSize:12 }}>Click to upload background image</div>}
                  </div>
                  {brandingForm.bg_image_data && <button onClick={()=>setBrandingForm(p=>({...p,bg_image_data:""}))} style={{ ...abtn("danger"), fontSize:11, padding:"5px 12px" }}>Remove Image</button>}
                </div>
              )}
            </div>
             <button onClick={saveBranding} disabled={brandingLoading} style={{ ...abtn("success"), padding:"13px", fontSize:"1rem", opacity:brandingLoading?0.6:1 }}>
              {brandingLoading ? "Saving..." : "Save Branding"}
            </button>
            <div style={{ fontSize:12, color:"#475569", textAlign:"center" }}>Changes apply on next page load. Students see updated branding when they visit the site.</div>
          </div>
        )}
             {/*  ANALYTICS TAB  */}

      </div>
    </div>
  );
}


// AUTH SCREEN
// 
function AuthScreen({ onAuth, branding = {} }) {
  const [mode, setMode] = useState("login"); // login | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const configured = isSupabaseConfigured();

  const handleSubmit = async () => {
    setErr(""); setLoading(true);
    if (!configured) {
      // Demo mode  bypass auth
      onAuth({ id: "demo-user", email: email || "demo@neet.in", user_metadata: { full_name: name || "Demo Student" } });
      setLoading(false); return;
    }
    const { data, error } = mode === "login"
      ? await sbSignIn(email, password)
      : await sbSignUp(email, password, name);
    setLoading(false);
    if (error) { setErr(error.message); return; }
    if (data?.user) onAuth(data.user);
    else setErr("Please check your email to confirm your account.");
  };

  return (
    <div style={{
      minHeight: "100vh", ...brandingBg(branding),
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Crimson Pro', Georgia, serif", padding: "1.5rem"
    }}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-block", background: "rgba(168,85,247,0.2)", border: "1px solid rgba(168,85,247,0.5)", borderRadius: 99, padding: "6px 20px", fontSize: 12, color: "#c084fc", letterSpacing: 2, textTransform: "uppercase", marginBottom: 16, fontFamily: "monospace" }}>
            NEET CBT
          </div>
          <h1 style={{ color: "#fff", fontSize: "2rem", fontWeight: 700, margin: "0 0 6px", textShadow: "0 0 40px rgba(168,85,247,0.4)" }}>
            Mock Test Platform
          </h1>
          <p style={{ color: "#64748b", margin: 0, fontSize: 14 }}>Sign in to access tests & track your progress</p>
        </div>

        {!configured && (
          <div style={{ borderRadius: 10, marginBottom: 20, overflow: "hidden" }}>
            <div style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.4)", padding: "10px 14px", fontSize: 13, color: "#fbbf24" }}>
               <strong>Demo Mode</strong>  Supabase credentials not set. Enter any email to continue.
            </div>
            
            {(() => {
              const diag = diagnoseConfig();
              return diag ? (
                <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderTop: "none", padding: "10px 14px", fontSize: 12, color: "#fca5a5", lineHeight: 1.7 }}>
                   <strong>Fix:</strong> {diag}
                </div>
              ) : null;
            })()}
          </div>
        )}

        <div style={{ ...card(), padding: 28 }}>
         
          <div style={{ display: "flex", background: "rgba(0,0,0,0.3)", borderRadius: 10, padding: 4, marginBottom: 24 }}>
            {["login","signup"].map(m => (
              <button key={m} onClick={() => { setMode(m); setErr(""); }} style={{
                flex: 1, padding: "9px", borderRadius: 7, border: "none", cursor: "pointer",
                background: mode === m ? "rgba(99,102,241,0.4)" : "transparent",
                color: mode === m ? "#a5b4fc" : "#64748b", fontWeight: 600, fontSize: 14,
                fontFamily: "inherit", transition: "all 0.15s", textTransform: "capitalize"
              }}>{m === "login" ? "Sign In" : "Create Account"}</button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {mode === "signup" && (
              <div>
                <label style={{ color: "#94a3b8", fontSize: 13, display: "block", marginBottom: 6 }}>Full Name</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" style={input} />
              </div>
            )}
            <div>
              <label style={{ color: "#94a3b8", fontSize: 13, display: "block", marginBottom: 6 }}>Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={input} />
            </div>
            <div>
              <label style={{ color: "#94a3b8", fontSize: 13, display: "block", marginBottom: 6 }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="" style={input}
                onKeyDown={e => e.key === "Enter" && handleSubmit()} />
            </div>
            {err && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 14px", color: "#f87171", fontSize: 13 }}>{err}</div>}
            <button onClick={handleSubmit} disabled={loading} style={{ ...btn("primary"), padding: "13px", marginTop: 4, opacity: loading ? 0.6 : 1 }}>
              {loading ? "Please wait" : mode === "login" ? "Sign In " : "Create Account "}
            </button>
          </div>
        </div>

        
        {!configured && (
          <div style={{ marginTop: 20, ...card(), padding: "16px 18px", fontSize: 12, color: "#64748b", lineHeight: 1.7 }}>
            <strong style={{ color: "#818cf8" }}>To enable full backend:</strong>
            <ol style={{ margin: "8px 0 0 16px", padding: 0 }}>
              <li>Create a Supabase project at supabase.com</li>
              <li>Run the SQL schema (see README)</li>
              <li>Replace SUPABASE_URL & SUPABASE_ANON_KEY at top of file</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}

// 
// DASHBOARD
// 
function Dashboard({ user, onStart, onSignOut, settings, branding = {} }) {
  const [history,        setHistory]        = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [batchConfig, setBatchConfig] = useState(null);
  const [nextTest,    setNextTest]    = useState(null); // the next scheduled batch test
  const [tab,            setTab]            = useState("start"); // start | history | leaderboard
  const [accessCode,     setAccessCode]     = useState("");
  const [accessErr,      setAccessErr]      = useState("");
  const [leaderboard,    setLeaderboard]    = useState([]);
  const [loadingLB,      setLoadingLB]      = useState(false);

  // Countdown to NEET exam date
  // Effective settings: next-test settings override batch settings override global
  const eff = nextTest
    ? { ...settings, ...batchConfig, ...nextTest, paper_id: nextTest.paper_id, attempt_limit: String(nextTest.attempt_limit||"1") }
    : batchConfig ? { ...settings, ...batchConfig } : settings;

  const neetDate   = eff?.neet_exam_date ? new Date(eff.neet_exam_date) : new Date("2026-05-04");
  const daysLeft   = Math.max(0, Math.ceil((neetDate - new Date()) / (1000*60*60*24)));
  const attemptLimit = parseInt(eff?.attempt_limit || "0");
  // Count attempts for current test only (if in a batch test context), else count all
  const attemptsUsed = nextTest
    ? history.filter(r => r.batch_test_id === nextTest.id).length
    : history.length;
  const limitReached = attemptLimit > 0 && attemptsUsed >= attemptLimit;

  // Check if exam window is active (only block if window is configured)
  const isWindowBlocked = (() => {
    const start = eff?.exam_window_start ? new Date(eff.exam_window_start) : null;
    const end   = eff?.exam_window_end   ? new Date(eff.exam_window_end)   : null;
    if (!start || !end || isNaN(start) || isNaN(end)) return false; // no window set = always open
    const now = new Date();
    return now < start || now > end; // blocked if outside window
  })();

  const canStart = !limitReached && !isWindowBlocked;

  // Live exam window countdown - ticks every second
  const [windowTick, setWindowTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setWindowTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Compute exam window status
  const getWindowStatus = () => {
    // Use effective settings (batch test overrides global)
    const start = eff?.exam_window_start ? new Date(eff.exam_window_start) : null;
    const end   = eff?.exam_window_end   ? new Date(eff.exam_window_end)   : null;
    const now   = new Date();
    if (!start || !end || isNaN(start) || isNaN(end)) return null;
    if (now < start) return { phase: "upcoming", diff: start - now, label: "Exam opens in", end };
    if (now >= start && now <= end) return { phase: "open", diff: end - now, label: "Exam closes in", end };
    return { phase: "ended", diff: 0, label: "Exam ended", end };
  };

  const fmtCountdown = (ms) => {
    if (ms <= 0) return "00:00:00";
    const totalSec = Math.floor(ms / 1000);
    const d = Math.floor(totalSec / 86400);
    const h = Math.floor((totalSec % 86400) / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (d > 0) return d + "d " + String(h).padStart(2,"0") + "h " + String(m).padStart(2,"0") + "m";
    return String(h).padStart(2,"0") + ":" + String(m).padStart(2,"0") + ":" + String(s).padStart(2,"0");
  };

  const winStatus = getWindowStatus();

  useEffect(() => {
    (async () => {
      let local = [];
      try { local = JSON.parse(localStorage.getItem("neet_history_" + user.id) || "[]"); } catch (_) {}
      let remote = [];
      if (isSupabaseConfigured()) { remote = await sbGetHistory(user.id); }
      const merged = remote.length > 0 ? remote : local;
      setHistory(merged);
      setLoadingHistory(false);

      // Check if student is in a batch - apply batch settings
      if (user.email && isSupabaseConfigured()) {
        try {
          const { data: membership } = await supabase
            .from("batch_members")
            .select("batch_id, batches(name)")
            .eq("email", user.email.toLowerCase())
            .limit(1)
            .maybeSingle();
          if (membership?.batch_id) {
            const { data: bs } = await supabase
              .from("batch_settings")
              .select("*")
              .eq("batch_id", membership.batch_id)
              .maybeSingle();
            if (bs) setBatchConfig({ ...bs, batch_name: membership.batches?.name || "Unknown" });

            // Load scheduled tests for this batch and find the next visible one
            const { data: tests } = await supabase
              .from("batch_tests")
              .select("*")
              .eq("batch_id", membership.batch_id)
              .order("exam_window_start", { ascending: true });
            if (tests && tests.length) {
              const now = new Date();
              // A test is visible if: manually released, OR currently in window, OR upcoming within 7 days
              const visible = tests.filter(t => {
                if (t.manual_release === "true") return true;
                const st = t.exam_window_start ? new Date(t.exam_window_start) : null;
                const en = t.exam_window_end   ? new Date(t.exam_window_end)   : null;
                if (!st) return false;
                if (en && now > en) return false; // completed - hide
                const daysUntil = (st - now) / (1000*60*60*24);
                return daysUntil <= 7; // show if within a week or active
              });
              // Pick the soonest one (active first, then upcoming)
              visible.sort((a,b) => new Date(a.exam_window_start||0) - new Date(b.exam_window_start||0));
              if (visible.length) setNextTest({ ...visible[0], batch_id: membership.batch_id, batch_name: membership.batches?.name });
            }
          }
        } catch (_) {}
      }
    })();
  }, [user.id]);

  useEffect(() => {
    if (tab !== "leaderboard") return;
    if (settings?.leaderboard_enabled === "false") return;
    setLoadingLB(true);
    (async () => {
      let query = supabase.from("test_results")
        .select("user_id, student_name, student_email, score, test_name, created_at")
        .order("score", { ascending: false })
        .limit(50);
      // Filter to current test if in batch test context
      if (nextTest?.id) query = query.eq("batch_test_id", nextTest.id);
      const { data } = await query;
      if (data) setLeaderboard(data);
      setLoadingLB(false);
    })();
  }, [tab]);

  const handleStart = () => {
    // Check access code using effective (batch-aware) settings
    if (eff?.access_code_enabled === "true" && eff?.access_code) {
      const entered = accessCode.replace(/\s/g, "");
      const stored  = (eff.access_code || "").replace(/\s/g, "");
      if (!entered) { setAccessErr("Please enter the access code."); return; }
      if (entered !== stored) { setAccessErr("Invalid access code. Please try again."); return; }
    }
    if (eff?.exam_window_start && eff?.exam_window_end) {
      const now = new Date(), start = new Date(eff.exam_window_start), end = new Date(eff.exam_window_end);
      if (now < start || now > end) { setAccessErr("Exam not available now. Window: " + start.toLocaleString() + " to " + end.toLocaleString()); return; }
    }
    if (eff?.exam_enabled === "false") { setAccessErr("Exam access is currently disabled."); return; }
    setAccessErr("");
    onStart(eff?.paper_id || "PAPER_01", nextTest ? {
      batch_test_id:     nextTest.id,
      batch_id:          nextTest.batch_id,
      test_name:         nextTest.name,
      paper_id:          nextTest.paper_id || eff?.paper_id || "PAPER_01",
      exam_window_start: nextTest.exam_window_start || null,
      exam_window_end:   nextTest.exam_window_end   || null,
      disable_submit:    nextTest.disable_submit === "true",
    } : null);
  };

  const displayName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Student";
  const bestScore = history.length ? Math.max(...history.map(r => r.score)) : null;
  const avgScore  = history.length ? Math.round(history.reduce((s, r) => s + r.score, 0) / history.length) : null;

  return (
    <div style={{ minHeight: "100vh", ...brandingBg(branding), fontFamily: "'Crimson Pro', Georgia, serif", color: "#e2e8f0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&display=swap');
        @font-face { font-family: 'Kruti Dev 010'; src: local('Kruti Dev 010'); }
      `}</style>
     
      <div style={{ background: "#0f172a", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div>
          <span style={{ color: "#818cf8", fontWeight: 700, fontSize: "1.1rem" }}>NEET UG</span>
          <span style={{ color: "#475569", fontSize: 13, marginLeft: 10 }}>Mock Test Platform</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
         
          {daysLeft > 0 && (
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "5px 12px", fontSize: 12, color: "#f87171" }}>
              {daysLeft} days to NEET
            </div>
          )}
          

          

          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600 }}>{displayName}</div>
            <div style={{ color: "#475569", fontSize: 11 }}>{user.email}</div>
          </div>
          <button onClick={onSignOut} style={btn("ghost", { padding: "7px 14px", fontSize: 12 })}>Sign Out</button>
        </div>
      </div>

      {/* Exam window countdown banner */}
      {winStatus && (
        <div style={{
          background: winStatus.phase === "open"     ? "rgba(34,197,94,0.12)"
                    : winStatus.phase === "upcoming" ? "rgba(99,102,241,0.12)"
                    : "rgba(100,116,139,0.12)",
          borderBottom: "1px solid " + (winStatus.phase === "open" ? "rgba(34,197,94,0.25)" : winStatus.phase === "upcoming" ? "rgba(99,102,241,0.25)" : "rgba(100,116,139,0.2)"),
          padding: "12px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Pulsing dot */}
            <div style={{
              width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
              background: winStatus.phase === "open" ? "#22c55e" : winStatus.phase === "upcoming" ? "#818cf8" : "#64748b",
              boxShadow: winStatus.phase === "open" ? "0 0 0 3px rgba(34,197,94,0.3)" : "none",
              animation: winStatus.phase === "open" ? "pulse 1.5s infinite" : "none",
            }} />
            <div>
              <div style={{ color: winStatus.phase === "open" ? "#4ade80" : winStatus.phase === "upcoming" ? "#a5b4fc" : "#94a3b8", fontWeight: 700, fontSize: 13 }}>
                {winStatus.phase === "open" ? "Exam is OPEN now" : winStatus.phase === "upcoming" ? "Exam opens soon" : "Exam window has ended"}
              </div>
              <div style={{ color: "#64748b", fontSize: 12, marginTop: 1 }}>
                {winStatus.phase === "ended"
                  ? "The exam window has closed."
                  : winStatus.label + ": " + fmtCountdown(winStatus.diff)}
              </div>
            </div>
          </div>
          {/* Big countdown clock */}
          {winStatus.phase !== "ended" && (
            <div style={{
              background: winStatus.phase === "open" ? "rgba(34,197,94,0.15)" : "rgba(99,102,241,0.15)",
              border: "1px solid " + (winStatus.phase === "open" ? "rgba(34,197,94,0.3)" : "rgba(99,102,241,0.3)"),
              borderRadius: 10, padding: "8px 20px", textAlign: "center",
            }}>
              <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "1.4rem", color: winStatus.phase === "open" ? "#4ade80" : "#a5b4fc", letterSpacing: 2 }}>
                {fmtCountdown(winStatus.diff)}
              </div>
              <div style={{ color: "#64748b", fontSize: 10, marginTop: 2, textTransform: "uppercase", letterSpacing: 1 }}>
                {winStatus.phase === "open" ? "remaining" : "until open"}
              </div>
            </div>
          )}
          {/* Window times */}
          <div style={{ fontSize: 11, color: "#475569", textAlign: "right" }}>
            <div>Opens: {eff?.exam_window_start ? new Date(eff.exam_window_start).toLocaleString("en-IN", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" }) : ""}</div>
            <div>Closes: {eff?.exam_window_end ? new Date(eff.exam_window_end).toLocaleString("en-IN", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" }) : ""}</div>
          </div>
        </div>
      )}

      <style>{`@keyframes pulse { 0%,100%{box-shadow:0 0 0 3px rgba(34,197,94,0.3)} 50%{box-shadow:0 0 0 6px rgba(34,197,94,0.1)} }`}</style>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px" }}>

        {batchConfig && (
          <div style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: 10, padding: "8px 16px", marginBottom: nextTest ? 8 : 16, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#818cf8", flexShrink: 0 }} />
            <span style={{ color: "#a5b4fc", fontSize: 13, fontWeight: 600 }}>Batch: {batchConfig.batch_name}</span>
            <span style={{ color: "#475569", fontSize: 12, marginLeft: 4 }}>
              {nextTest ? nextTest.name : "Custom exam settings active"}
            </span>
          </div>
        )}

        {/* NEXT TEST CARD - shown when student is in a batch with a scheduled test */}
        {nextTest && (() => {
          const now = new Date();
          const st  = nextTest.exam_window_start ? new Date(nextTest.exam_window_start) : null;
          const en  = nextTest.exam_window_end   ? new Date(nextTest.exam_window_end)   : null;
          const isActive = nextTest.manual_release === "true" || (st && en && now >= st && now <= en);
          const isUpcoming = st && now < st;
          const msLeft = st ? st - now : 0;
          const daysLeft = Math.floor(msLeft / (1000*60*60*24));
          const hrsLeft  = Math.floor((msLeft % (1000*60*60*24)) / (1000*60*60));
          const minLeft  = Math.floor((msLeft % (1000*60*60)) / (1000*60));
          return (
            <div style={{ background: isActive ? "rgba(34,197,94,0.06)" : "rgba(99,102,241,0.06)", border: "1px solid " + (isActive ? "rgba(34,197,94,0.25)" : "rgba(99,102,241,0.2)"), borderRadius: 14, padding: "16px 20px", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: isActive ? "#22c55e" : "#818cf8", animation: isActive ? "pulse 2s infinite" : "none" }} />
                    <span style={{ color: isActive ? "#4ade80" : "#a5b4fc", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      {isActive ? "Test Active Now" : "Next Scheduled Test"}
                    </span>
                  </div>
                  <div style={{ color: "#e2e8f0", fontWeight: 700, fontSize: "1.05rem", marginBottom: 4 }}>{nextTest.name}</div>
                  {nextTest.description && <div style={{ color: "#64748b", fontSize: 12, marginBottom: 6 }}>{nextTest.description}</div>}
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12 }}>
                    {st && <span style={{ color: "#94a3b8" }}>Starts: {st.toLocaleString("en-IN", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })}</span>}
                    {en && <span style={{ color: "#94a3b8" }}>Ends: {en.toLocaleString("en-IN", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })}</span>}
                    <span style={{ color: "#64748b" }}>Paper: {nextTest.paper_id}</span>
                  </div>
                  {isUpcoming && msLeft > 0 && (
                    <div style={{ marginTop: 8, color: "#818cf8", fontSize: 12 }}>
                      Starts in: <span style={{ fontWeight: 700 }}>{daysLeft > 0 ? daysLeft+"d " : ""}{hrsLeft}h {minLeft}m</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }} className="mob-grid1">
          {[
            { label: "Tests Taken", value: history.length, color: "#818cf8" },
            { label: "Best Score", value: bestScore !== null ? `${bestScore}/${history[0]?maxMarksOf(history[0]):720}` : "", color: "#4ade80" },
            { label: "Avg Score", value: avgScore !== null ? `${avgScore}/${history[0]?maxMarksOf(history[0]):720}` : "", color: "#fbbf24" },
          ].map(s => (
            <div key={s.label} style={{ ...card(), padding: "20px 24px", textAlign: "center" }}>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        
        <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
          <button onClick={() => setTab("start")}       style={btn(tab==="start"?"primary":"ghost",{padding:"8px 18px",fontSize:13})}>Start Test</button>
          <button onClick={() => setTab("history")}     style={btn(tab==="history"?"primary":"ghost",{padding:"8px 18px",fontSize:13})}>Score History</button>
          {settings?.leaderboard_enabled !== "false" && (
            <button onClick={() => setTab("leaderboard")} style={btn(tab==="leaderboard"?"primary":"ghost",{padding:"8px 18px",fontSize:13})}>Leaderboard</button>
          )}
        </div>

       
        {tab === "start" && (
          <div style={{ ...card(), padding: 28 }}>
            <h2 style={{ color: "#e2e8f0", margin: "0 0 6px", fontSize: "1.2rem", fontWeight: 700 }}>{nextTest ? nextTest.name : "NEET CBT - Mock Test"}</h2>
            <p style={{ color: "#64748b", margin: "0 0 20px", fontSize: 14 }}>{nextTest ? (nextTest.description || "Full-length mock examination") : "Full-length mock examination"}</p>

            
            {limitReached && (
              <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "12px 16px", marginBottom: 16, color: "#f87171", fontSize: 14 }}>
                You have used all {attemptLimit} allowed attempts for this exam.
              </div>
            )}
            {attemptLimit > 0 && !limitReached && (
              <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#fbbf24", fontSize: 13 }}>
                Attempts used: {attemptsUsed} / {attemptLimit}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 20 }}>
              {[["Questions", String(settings?.total_questions || "As per paper")],["Duration", settings?.exam_duration || "3 Hours"],["Max Marks", String(settings?.max_marks || (settings?.total_questions ? settings.total_questions * MARKS_CORRECT : "As per paper"))],["Correct","+" + MARKS_CORRECT + " marks"],["Wrong", MARKS_WRONG + " mark"],["Unattempted","0 marks"]].map(([l,v]) => (
                <div key={l} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "10px 14px" }}>
                  <div style={{ color: "#64748b", fontSize: 10, textTransform: "uppercase" }}>{l}</div>
                  <div style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 14, marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>

            
            {settings?.access_code_enabled === "true" && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ color: "#94a3b8", fontSize: 12, display: "block", marginBottom: 6 }}>Exam Access Code</label>
                <input value={accessCode} onChange={e => setAccessCode(e.target.value)}
                  placeholder="Enter the code provided by your instructor"
                  style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "10px 14px", color: "#e2e8f0", fontSize: "0.92rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
              </div>
            )}

            {accessErr && (
              <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 14px", color: "#f87171", fontSize: 13, marginBottom: 16 }}>{accessErr}</div>
            )}

            <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 20, fontSize: 13, color: "#fbbf24" }}>
              Do not refresh or close the browser during the test.
            </div>

            <button onClick={handleStart} disabled={!canStart}
              style={{ ...btn(canStart ? "success" : "ghost", { padding: "13px 0", fontSize: "1rem", width: "100%", borderRadius: 12 }), opacity: canStart ? 1 : 0.4, cursor: canStart ? "pointer" : "not-allowed" }}>
              {limitReached ? "Attempt Limit Reached"
                : isWindowBlocked
                  ? (winStatus?.phase === "upcoming" ? "Exam Not Started Yet" : "Exam Window Closed")
                  : "Begin Mock Test"}
            </button>
          </div>
        )}

        
        {tab === "history" && (
          <div>
            {loadingHistory ? (
              <div style={{ textAlign: "center", color: "#64748b", padding: 40 }}>Loading history...</div>
            ) : history.length === 0 ? (
              <div style={{ ...card(), padding: 40, textAlign: "center", color: "#475569" }}>No tests taken yet. Start your first mock test!</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {history.map((r, i) => {
                  const pct2 = Math.round((r.score / maxMarksOf(r)) * 100);
                  const date = new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
                  return (
                    <div key={i} style={{ ...card(), padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ width: 48, height: 48, borderRadius: "50%", background: pct2>=50?"rgba(34,197,94,0.2)":"rgba(239,68,68,0.2)", border: "2px solid "+(pct2>=50?"#22c55e":"#ef4444"), display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: pct2>=50?"#4ade80":"#f87171", fontSize: 13, flexShrink: 0 }}>{pct2}%</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: "#c7d2fe", fontSize: "0.9rem" }}>{r.test_name || "Mock Test"}</div>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{date}{r.paper_id ? <span style={{ marginLeft: 8, color: "#475569" }}>{r.paper_id}</span> : ""}</div>
                        <div style={{ marginTop: 5, background: "rgba(0,0,0,0.3)", borderRadius: 99, height: 4, maxWidth: 200 }}>
                          <div style={{ height: "100%", borderRadius: 99, background: pct2>=50?"#22c55e":"#ef4444", width: Math.max(0,pct2)+"%" }} />
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#e2e8f0" }}>{r.score}</div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>/ {maxMarksOf(r)}</div>
                      </div>
                      <div style={{ textAlign: "right", fontSize: 11, color: "#64748b", flexShrink: 0 }}>
                        <div style={{ color: "#4ade80" }}>Correct: {r.correct}</div>
                        <div style={{ color: "#f87171" }}>Wrong: {r.wrong}</div>
                        {r.percentile != null && <div style={{ color: "#818cf8" }}>{r.percentile}th %ile</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

       
        {tab === "leaderboard" && (
          <div>
            <h3 style={{ color: "#a5b4fc", marginBottom: 14, fontSize: "1rem" }}>{nextTest ? ("Top Scores - " + nextTest.name) : "Top Scores - All Time"}</h3>
            {loadingLB ? (
              <div style={{ textAlign: "center", color: "#64748b", padding: 40 }}>Loading leaderboard...</div>
            ) : leaderboard.length === 0 ? (
              <div style={{ ...card(), padding: 40, textAlign: "center", color: "#475569" }}>No results yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {leaderboard.map((r, i) => {
                  const pct3 = Math.round((r.score / maxMarksOf(r)) * 100);
                  const isMe = r.user_id === user.id;
                  return (
                    <div key={i} style={{ ...card(), padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, border: isMe ? "1px solid rgba(99,102,241,0.4)" : undefined, background: isMe ? "rgba(99,102,241,0.08)" : undefined }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: i===0?"rgba(251,191,36,0.2)":i===1?"rgba(148,163,184,0.2)":i===2?"rgba(180,83,9,0.2)":"rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: i===0?"#fbbf24":i===1?"#94a3b8":i===2?"#b45309":"#64748b", fontSize: 14, flexShrink: 0 }}>{i+1}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "0.9rem", color: isMe ? "#a5b4fc" : "#c7d2fe", fontWeight: isMe ? 700 : 400 }}>
                          {isMe ? "You" : (r.student_name || r.student_email?.split("@")[0] || "Student " + (i+1))}
                        </div>
                        <div style={{ marginTop: 4, background: "rgba(0,0,0,0.3)", borderRadius: 99, height: 4, maxWidth: 200 }}>
                          <div style={{ height: "100%", borderRadius: 99, background: i===0?"#fbbf24":"#6366f1", width: pct3+"%" }} />
                        </div>
                      </div>
                      <div style={{ fontWeight: 700, color: "#e2e8f0", fontSize: "1.1rem" }}>{r.score}</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>/ {maxMarksOf(r)}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// 
// INSTRUCTIONS
// 
function InstructionsScreen({ onBegin, onBack, branding = {} }) {
  const [agreed, setAgreed] = useState(false);
  return (
    <div style={{ minHeight: "100vh", ...brandingBg(branding), fontFamily: "'Crimson Pro', Georgia, serif", padding: "2rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ maxWidth: 780, width: "100%" }}>
        <div style={{ ...card(), overflow: "hidden" }}>
          <div style={{ background: "linear-gradient(135deg,#1e1b4b,#312e81)", padding: "22px 30px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
            <h2 style={{ color: "#e2e8f0", margin: 0, fontSize: "1.4rem", fontWeight: 700 }}>General Instructions</h2>
            <p style={{ color: "#818cf8", margin: "4px 0 0", fontSize: 14 }}>Read carefully before starting.</p>
          </div>
          <div style={{ padding: "26px 30px", color: "#cbd5e1", lineHeight: 1.8 }}>
            {[
              ["Exam Structure", ["Number of questions and subjects are as per the assigned paper.", "Each correct answer: +" + MARKS_CORRECT + " marks. Each wrong answer: " + MARKS_WRONG + " mark. Unattempted: 0."]],
              ["Marking Scheme", ["Correct answer: +4 marks.", "Incorrect answer: 1 mark (negative marking).", "Unattempted: 0 marks."]],
              ["Navigation", ["Use the right-side palette to jump to any question.", "Mark questions for review  return before submitting.", "'Save & Next' saves your answer and moves forward."]],
              ["Important", ["Do not refresh or close the tab during the exam.", "Timer auto-submits the test on expiry.", "Once submitted, the test cannot be resumed."]],
            ].map(([h, pts]) => (
              <div key={h} style={{ marginBottom: 20 }}>
                <h3 style={{ color: "#a5b4fc", fontSize: "0.95rem", fontWeight: 600, marginBottom: 6 }}>{h}</h3>
                <ul style={{ margin: 0, paddingLeft: 18 }}>{pts.map((p,i) => <li key={i} style={{ marginBottom: 4, fontSize: "0.92rem" }}>{p}</li>)}</ul>
              </div>
            ))}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 24 }}>
              {[["#374151","Not Visited"],["#ef4444","Not Answered"],["#22c55e","Answered"],["#a855f7","Marked for Review"]].map(([c,l]) => (
                <div key={l} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 6, background: c }} />
                  <span style={{ fontSize: 13 }}>{l}</span>
                </div>
              ))}
            </div>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 12, padding: 16 }}>
              <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ marginTop: 3, width: 16, height: 16, accentColor: "#6366f1", flexShrink: 0 }} />
              <span style={{ fontSize: "0.9rem", color: "#c7d2fe" }}>I have read all instructions and agree to follow examination rules.</span>
            </label>
          </div>
          <div style={{ padding: "18px 30px", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", justifyContent: "space-between" }}>
            <button onClick={onBack} style={btn("ghost")}> Back</button>
            <button onClick={onBegin} disabled={!agreed} style={{ ...btn("success"), opacity: agreed ? 1 : 0.4, cursor: agreed ? "pointer" : "not-allowed" }}>Start Exam </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 
// PALETTE
// 
const SUBJ_PAL_COLOR = { Physics:"#6366f1", Chemistry:"#f59e0b", Botany:"#22c55e", Zoology:"#f43f5e" };

function Palette({ questions, answers, currentIdx, onJump, marked, visited }) {
  const vis = visited || new Set([currentIdx]);
  const getStatus = (q) => {
    const i   = questions.indexOf(q);
    const ans = answers[q.id] !== undefined;
    const mk  = marked.has(q.id);
    if (mk && ans) return "marked-answered";
    if (mk)        return "marked";
    if (ans)       return "answered";
    if (vis.has(i) && !ans) return "not-answered"; // visited but unanswered = red
    return "not-visited"; // never visited = dark gray
  };

  const counts = {
    a: questions.filter(q => answers[q.id] !== undefined && !marked.has(q.id)).length,
    m: questions.filter(q => marked.has(q.id)).length,
    n: questions.filter((q,i) => vis.has(i) && answers[q.id] === undefined).length,
    v: questions.filter((q,i) => !vis.has(i)).length,
  };

  return (
    <div style={{ width: 230, background: "#0a1124", borderLeft: "1px solid rgba(255,255,255,0.07)", display: "flex", flexDirection: "column", flexShrink: 0, overflow: "hidden" }} className="mob-palette">

      {/* Stats row */}
      <div style={{ padding: "10px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
        {[["#22c55e",counts.a,"Ans"],["#a855f7",counts.m,"Mkd"],["#ef4444",counts.n,"NA"],["#374151",counts.v,"NV"]].map(([c,n,l]) => (
          <div key={l} style={{ display:"flex", alignItems:"center", gap:5, background:"rgba(255,255,255,0.03)", borderRadius:7, padding:"5px 7px" }}>
            <div style={{ width:8, height:8, borderRadius:2, background:c, flexShrink:0 }} />
            <span style={{ color:"#e2e8f0", fontSize:12, fontWeight:700 }}>{n}</span>
            <span style={{ color:"#475569", fontSize:10 }}>{l}</span>
          </div>
        ))}
      </div>

      {/* Subject colour legend */}
      <div style={{ padding:"6px 8px", borderBottom:"1px solid rgba(255,255,255,0.07)", display:"flex", flexWrap:"wrap", gap:4 }}>
        {SUBJECTS.map(s => (
          <span key={s} style={{ fontSize:9, color:SUBJ_PAL_COLOR[s], background:"rgba(255,255,255,0.04)", border:"1px solid "+SUBJ_PAL_COLOR[s]+"44", borderRadius:4, padding:"2px 6px", fontWeight:700 }}>
            {s.slice(0,3)} {questions.filter(q=>q.subject===s&&answers[q.id]!==undefined).length}/{questions.filter(q=>q.subject===s).length}
          </span>
        ))}
      </div>

      {/* Single scrollable grid  all subjects together */}
      <div style={{ flex:1, overflowY:"auto", padding:"8px" }}>
        {SUBJECTS.map(s => {
          const sqs = questions.filter(q => q.subject === s);
          if (!sqs.length) return null;
          return (
            <div key={s} style={{ marginBottom:10 }}>
              <div style={{ fontSize:9, color:SUBJ_PAL_COLOR[s], fontWeight:700, marginBottom:4, textTransform:"uppercase", letterSpacing:0.5 }}>{s}</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:4 }}>
                {sqs.map(q => {
                  const gi    = questions.indexOf(q);
                  const isCur = gi === currentIdx;
                  return (
                    <button key={q.id} onClick={() => onJump(gi)} title={s + " Q" + q.number}
                      className="pal-btn"
                      style={{ width:"100%", aspectRatio:"1", borderRadius:5,
                        border: isCur ? "2px solid "+SUBJ_PAL_COLOR[s] : "1.5px solid transparent",
                        background: statusColor(getStatus(q)), color:"#fff", fontSize:9, fontWeight:700,
                        cursor:"pointer", transition:"all 0.1s",
                        boxShadow: isCur ? "0 0 0 2px "+SUBJ_PAL_COLOR[s]+"55" : "none",
                      }}>
                      {q.number}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 
// EXAM SCREEN
// 
function ExamScreen({ questions, onFinish, settings, examWindowEnd, examWindowStart, disableSubmit, branding = {} }) {
  const restoreSession = () => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (s.questionIds && JSON.stringify(s.questionIds) !== JSON.stringify(questions.map(q => q.id))) return null;
      return s;
    } catch { return null; }
  };

  const saved = restoreSession();

  const [idx,           setIdx]          = useState(saved?.idx ?? 0);
  const [answers,       setAnswers]      = useState(saved?.answers ?? {});
  const [marked,        setMarked]       = useState(new Set(saved?.marked ?? []));
  const [visited,       setVisited]      = useState(new Set(saved?.visited ?? [0])); // track actually visited question indices
  const [bookmarks,     setBookmarks]    = useState(new Set(saved?.bookmarks ?? []));
  const [sel,           setSel]          = useState(null);
  // Calculate time remaining based on admin-set window (start  end)
  // Timer is synchronized to wall-clock time, so all students see the same countdown
  const calcInitialTime = () => {
    // If resuming a session, use saved time (already wall-clock-corrected)
    if (saved?.timeLeft != null) {
      // But re-validate against current wall time in case a long time has passed
      const wEnd = examWindowEnd ? new Date(examWindowEnd) : null;
      if (wEnd) {
        const remaining = Math.round((wEnd - Date.now()) / 1000);
        if (remaining <= 0) return 0;
        // Use whichever is smaller: saved time or actual remaining
        return Math.min(saved.timeLeft, remaining);
      }
      return saved.timeLeft;
    }
    // Primary: use admin-set exam window (batch test settings)
    const wEnd   = examWindowEnd   ? new Date(examWindowEnd)   : null;
    const wStart = examWindowStart ? new Date(examWindowStart) : null;
    if (wEnd && wStart) {
      const now = Date.now();
      const remaining = Math.round((wEnd.getTime() - now) / 1000);
      if (remaining <= 0) return 0; // window already ended
      if (remaining > TOTAL_TIME) return TOTAL_TIME; // cap at 3h
      return remaining; // exact seconds left in the window right now
    }
    // Fallback: full 3-hour exam with no window set
    return TOTAL_TIME;
  };
  const [timeLeft,      setTimeLeft]     = useState(calcInitialTime);
  const [showModal,     setShowModal]    = useState(false);
  const [restored,      setRestored]     = useState(!!saved);
  const [tabWarning,    setTabWarning]   = useState(false);
  const [tabSwitchCount,setTabSwitchCount] = useState(0);
  const [lockInput,     setLockInput]     = useState("");
  const [lockErr,       setLockErr]       = useState("");
  const [paused,        setPaused]       = useState(false);
  const [pauseCode,     setPauseCode]    = useState("");
  const [pauseErr,      setPauseErr]     = useState("");
  const [showPause,     setShowPause]    = useState(false);
  const [webcamStream,  setWebcamStream] = useState(null);
  const [webcamSnaps,   setWebcamSnaps]  = useState([]);
  // Time tracking per question
  const timePerQ    = useRef(saved?.timePerQ    || {});
  const subjectTimes= useRef(saved?.subjectTimes|| { Physics:0, Chemistry:0, Botany:0, Zoology:0 });
  const qStartTime  = useRef(Date.now());
  const timerRef    = useRef(null);
  const webcamRef   = useRef(null);
  const q = questions[idx];

  // Mark first question as visited on mount
  useEffect(() => { setVisited(p => { const n = new Set(p); n.add(0); return n; }); }, []);

  // Lazy-load diagram images for current question on demand
  useEffect(() => {
    if (!q?.id) return;
    if (q.diagram_data || q.solution_diagram_data) return; // already have it
    supabase.from("questions")
      .select("id, diagram_data, solution_diagram_data")
      .eq("id", q.id)
      .single()
      .then(({ data }) => {
        if (data?.diagram_data)          q.diagram_data          = data.diagram_data;
        if (data?.solution_diagram_data) q.solution_diagram_data = data.solution_diagram_data;
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q?.id]);

  // Webcam setup if enabled
  useEffect(() => {
    if (settings?.webcam_enabled === "true") {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          setWebcamStream(stream);
          if (webcamRef.current) webcamRef.current.srcObject = stream;
          // Take random snapshots every 2-5 minutes
          const snap = () => {
            if (webcamRef.current) {
              const cv = document.createElement("canvas");
              cv.width = 160; cv.height = 120;
              cv.getContext("2d").drawImage(webcamRef.current, 0, 0, 160, 120);
              setWebcamSnaps(p => [...p.slice(-10), { t: Date.now(), img: cv.toDataURL("image/jpeg", 0.5) }]);
            }
            setTimeout(snap, 120000 + Math.random() * 180000);
          };
          setTimeout(snap, 30000);
        })
        .catch(() => {});
    }
    return () => { if (webcamStream) webcamStream.getTracks().forEach(t => t.stop()); };
  }, []);

  // Session persistence
  useEffect(() => {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        questionIds: questions.map(q => q.id),
        idx, answers, marked: [...marked], bookmarks: [...bookmarks], visited: [...visited],
        timeLeft, timePerQ: timePerQ.current,
        subjectTimes: subjectTimes.current, savedAt: Date.now(),
      }));
    } catch (_) {}
  }, [idx, answers, marked, bookmarks, timeLeft]);

  // Track time per question on navigation
  const recordTime = (fromIdx) => {
    const elapsed = Math.round((Date.now() - qStartTime.current) / 1000);
    const fq = questions[fromIdx];
    if (fq) {
      timePerQ.current[fq.id] = (timePerQ.current[fq.id] || 0) + elapsed;
      subjectTimes.current[fq.subject] = (subjectTimes.current[fq.subject] || 0) + elapsed;
    }
    qStartTime.current = Date.now();
  };

  useEffect(() => { setSel(answers[q.id] ?? null); }, [idx]);

  const doFinish = useCallback(() => {
    clearInterval(timerRef.current);
    recordTime(idx);
    try { localStorage.removeItem(SESSION_KEY); } catch (_) {}
    if (webcamStream) webcamStream.getTracks().forEach(t => t.stop());
    onFinish(answers, marked, {
      timePerQ:     timePerQ.current,
      subjectTimes: subjectTimes.current,
      bookmarks:    [...bookmarks],
      webcamSnaps,
    });
  }, [answers, marked, bookmarks, webcamSnaps]);

  const [timerAlert, setTimerAlert] = useState(null); // "30min"|"15min"|"5min"

  // Timer - auto-submits when window closes or time runs out
  useEffect(() => {
    if (paused) { clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => {
      // Auto-submit when exam window explicitly ends (uses prop, not global settings)
      if (examWindowEnd) {
        const wEnd = new Date(examWindowEnd);
        const now  = new Date();
        // Safety: only trigger if window end is in the past AND exam started > 60s ago
        if (now > wEnd && (TOTAL_TIME - timeLeft) > 60) {
          clearInterval(timerRef.current);
          doFinish();
          return;
        }
      }
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); doFinish(); return 0; }
        // Re-sync with wall clock every 60 ticks to prevent drift
        if (examWindowEnd && t % 60 === 0) {
          const wallRemaining = Math.round((new Date(examWindowEnd) - Date.now()) / 1000);
          if (wallRemaining <= 0) { clearInterval(timerRef.current); doFinish(); return 0; }
          if (Math.abs(wallRemaining - t) > 5) return wallRemaining; // correct drift >5s
        }
        if (t === 1800) setTimerAlert("30min");
        if (t === 900)  setTimerAlert("15min");
        if (t === 300)  setTimerAlert("5min");
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [doFinish, paused, settings]);

  // Right-click + tab switch blocker
  useEffect(() => {
    const block = (e) => e.preventDefault();
    const blockKeys = (e) => {
      if ((e.ctrlKey && ["c","u","s","p"].includes(e.key.toLowerCase())) ||
          (e.ctrlKey && e.shiftKey && ["i","j","c"].includes(e.key.toLowerCase())) ||
          e.key === "F12" || (e.altKey && e.key === "Tab")) e.preventDefault();
    };
    const handleVis = () => {
      if (document.hidden) {
        setTabWarning(true);
        setTabSwitchCount(c => c+1);
        setLockInput("");
        setLockErr("");
      }
    };
    // blur only triggers if tab actually switches, not just clicking within the page
    let blurTimer = null;
    const handleBlur = () => {
      blurTimer = setTimeout(() => {
        if (document.hidden) {
          setTabWarning(true);
          setTabSwitchCount(c => c+1);
          setLockInput("");
          setLockErr("");
        }
      }, 300);
    };
    const handleFocus = () => { if (blurTimer) clearTimeout(blurTimer); };
    document.addEventListener("contextmenu", block);
    document.addEventListener("keydown", blockKeys);
    document.addEventListener("visibilitychange", handleVis);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    document.body.style.userSelect = "none";
    document.body.style.webkitUserSelect = "none";
    return () => {
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("keydown", blockKeys);
      document.removeEventListener("visibilitychange", handleVis);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      if (blurTimer) clearTimeout(blurTimer);
      document.body.style.userSelect = "";
      document.body.style.webkitUserSelect = "";
    };
  }, []);

  const saveAndGo = (delta = 1) => {
    recordTime(idx);
    if (sel !== null) setAnswers(p => ({ ...p, [q.id]: sel }));
    const ni = idx + delta;
    if (ni >= 0 && ni < questions.length) {
      setVisited(p => { const n = new Set(p); n.add(ni); return n; });
      setIdx(ni);
    }
  };

  const toggleBookmark = () => {
    setBookmarks(p => { const n = new Set(p); n.has(q.id) ? n.delete(q.id) : n.add(q.id); return n; });
  };

  const clearResp = () => {
    setSel(null);
    setAnswers(p => { const n = { ...p }; delete n[q.id]; return n; });
  };

  const toggleMark = () => {
    if (sel !== null) setAnswers(p => ({ ...p, [q.id]: sel }));
    setMarked(p => { const n = new Set(p); n.has(q.id) ? n.delete(q.id) : n.add(q.id); return n; });
    if (idx < questions.length - 1) setIdx(i => i + 1);
  };

  //  Disable right-click, text selection, and common copy shortcuts 
  useEffect(() => {
    const block = (e) => e.preventDefault();
    const blockKeys = (e) => {
      // Block Ctrl+C, Ctrl+U (view source), Ctrl+S, Ctrl+Shift+I (devtools), F12
      if (
        (e.ctrlKey && ["c","u","s","p"].includes(e.key.toLowerCase())) ||
        (e.ctrlKey && e.shiftKey && ["i","j","c"].includes(e.key.toLowerCase())) ||
        e.key === "F12"
      ) e.preventDefault();
    };
    document.addEventListener("contextmenu", block);
    document.addEventListener("keydown", blockKeys);
    // Disable text selection via CSS
    document.body.style.userSelect = "none";
    document.body.style.webkitUserSelect = "none";
    return () => {
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("keydown", blockKeys);
      document.body.style.userSelect = "";
      document.body.style.webkitUserSelect = "";
    };
  }, []);

  const timerClr = timeLeft < 600 ? "#ef4444" : timeLeft < 1800 ? "#f59e0b" : "#22c55e";
  const attempted = Object.keys(answers).length;
  const subjectIdx = SUBJECTS.indexOf(q.subject);
  const subjectColors = ["#6366f1","#f59e0b","#22c55e","#f43f5e"];

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", ...brandingBg(branding), fontFamily: "'Crimson Pro', Georgia, serif", color: "#e2e8f0" }}>
      
      <div style={{ background: "#0f172a", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, gap: 12 }}>
        <div>
          <span style={{ color: "#818cf8", fontWeight: 700, fontSize: "1rem" }}>NEET UG Mock Test</span>
          <span style={{ color: "#475569", fontSize: 12, marginLeft: 10 }}>Mock Examination</span>
        </div>
       
        <div style={{ display: "flex", gap: 6 }}>
          {SUBJECTS.map((s, i) => {
            const sqCount = questions.filter(x => x.subject === s && answers[x.id] !== undefined).length;
            const sqTotal = questions.filter(x => x.subject === s).length;
            const isActive = q.subject === s;
            return (
              <button key={s} onClick={() => setIdx(questions.findIndex(x => x.subject === s))} style={{
                padding: "5px 12px", borderRadius: 8, border: isActive ? `1.5px solid ${subjectColors[i]}` : "1.5px solid rgba(255,255,255,0.08)",
                background: isActive ? `rgba(${[99,102,241,245,158,11,34,197,94,244,63,94][i*3]},${[99,102,241,245,158,11,34,197,94,244,63,94][i*3+1]},${[99,102,241,245,158,11,34,197,94,244,63,94][i*3+2]},0.15)` : "transparent",
                color: isActive ? subjectColors[i] : "#64748b", fontSize: 12, fontWeight: 600, cursor: "pointer",
                fontFamily: "inherit", transition: "all 0.15s"
              }}>
                {s.slice(0,3)} {sqCount}/{sqTotal}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ background: "rgba(0,0,0,0.4)", border: `1px solid ${timerClr}`, borderRadius: 9, padding: "6px 14px", display: "flex", gap: 7, alignItems: "center" }}>
            <span style={{ color: timerClr, fontSize: 18 }}></span>
            <span style={{ color: timerClr, fontFamily: "monospace", fontSize: "1.1rem", fontWeight: 700 }}>{fmt(timeLeft)}</span>
          </div>
          <button onClick={() => setShowModal(true)} style={btn("danger", { padding: "8px 16px", fontSize: 12 })}>Submit</button>
        </div>
      </div>

      
      {restored && (
        <div style={{
          background: "rgba(34,197,94,0.12)", borderBottom: "1px solid rgba(34,197,94,0.25)",
          padding: "8px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
          fontSize: 13, color: "#4ade80", flexShrink: 0,
        }}>
          <span>Session restored - your answers and timer have been saved from your last visit.</span>
          <button onClick={() => setRestored(false)} style={{ background: "none", border: "none", color: "#4ade80", cursor: "pointer", fontSize: 16, padding: "0 4px" }}>x</button>
        </div>
      )}

      {/* TIMER WARNING BANNER */}
      {timerAlert && (
        <div style={{ background: timerAlert==="5min"?"rgba(239,68,68,0.15)":"rgba(245,158,11,0.12)", borderBottom:"1px solid "+(timerAlert==="5min"?"rgba(239,68,68,0.3)":"rgba(245,158,11,0.25)"), padding:"8px 18px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ fontSize:18 }}>{timerAlert==="5min"?"!":"!"}</div>
            <span style={{ color:timerAlert==="5min"?"#f87171":"#fbbf24", fontWeight:700, fontSize:14 }}>
              {timerAlert==="5min" ? "Only 5 minutes remaining!" : timerAlert==="15min" ? "15 minutes remaining" : "30 minutes remaining"}
            </span>
          </div>
          <button onClick={()=>setTimerAlert(null)} style={{ background:"none", border:"none", color:"#64748b", cursor:"pointer", fontSize:18 }}>x</button>
        </div>
      )}

      {/* TAB SWITCH LOCK SCREEN - covers entire exam, timer paused */}
      {tabWarning && (
        <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", fontFamily: "Georgia, serif" }}>
          <div style={{ background: "#0f172a", border: "2px solid rgba(239,68,68,0.5)", borderRadius: 20, padding: "40px 36px", maxWidth: 440, width: "90%", textAlign: "center" }}>
            {/* Warning icon */}
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(239,68,68,0.15)", border: "2px solid rgba(239,68,68,0.4)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 28 }}>!</div>
            <h2 style={{ color: "#f87171", margin: "0 0 8px", fontSize: "1.4rem", fontWeight: 700 }}>Exam Paused</h2>
            <p style={{ color: "#94a3b8", fontSize: 14, margin: "0 0 6px", lineHeight: 1.7 }}>
              You switched tabs or left the exam window.
            </p>
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "8px 16px", marginBottom: 24, display: "inline-block" }}>
              <span style={{ color: "#f87171", fontSize: 13, fontWeight: 700 }}>Violations: {tabSwitchCount}</span>
              <span style={{ color: "#f59e0b", fontSize: 12, marginLeft: 8 }}>| Timer still running</span>
            </div>
            <p style={{ color: "#64748b", fontSize: 13, margin: "0 0 20px" }}>
              Enter the <span style={{ color: "#fbbf24" }}>exam resume code</span> to continue.
            </p>
            <input
              type="password"
              value={lockInput}
              onChange={e => { setLockInput(e.target.value); setLockErr(""); }}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  const entered = lockInput.replace(/\s/g, "");
                  const stored  = (settings?.resume_code || settings?.access_code || "").replace(/\s/g, "");
                  if (entered === stored) {
                    setTabWarning(false); setLockInput(""); setLockErr("");
                  } else {
                    setLockErr("Incorrect code. Contact your invigilator.");
                  }
                }
              }}
              placeholder="Enter resume code"
              style={{ width: "100%", background: "rgba(255,255,255,0.07)", border: "1px solid " + (lockErr ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.15)"), borderRadius: 10, padding: "12px 16px", color: "#e2e8f0", fontSize: "1rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginBottom: 8, textAlign: "center", letterSpacing: 4 }}
              autoFocus
            />
            {lockErr && <div style={{ color: "#f87171", fontSize: 13, marginBottom: 10 }}>{lockErr}</div>}
            <button
              onClick={() => {
                const entered = lockInput.replace(/\s/g, "");
                const stored  = (settings?.resume_code || settings?.access_code || "").replace(/\s/g, "");
                if (entered === stored) {
                  setTabWarning(false); setLockInput(""); setLockErr("");
                } else {
                  setLockErr("Incorrect code. Contact your invigilator.");
                }
              }}
              style={{ ...btn("primary"), width: "100%", padding: "13px", fontSize: "1rem", marginTop: 4 }}>
              Resume Exam
            </button>
            <p style={{ color: "#374151", fontSize: 11, marginTop: 16, lineHeight: 1.6 }}>
              This violation has been recorded. Repeated violations may result in disqualification.
            </p>
          </div>
        </div>
      )}

     
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
         
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
            <span style={{ background: `rgba(${subjectColors[subjectIdx]},0.15)`, border: `1px solid ${subjectColors[subjectIdx]}44`, borderRadius: 7, padding: "3px 12px", color: subjectColors[subjectIdx], fontSize: 13, fontWeight: 600 }}>
              {q.subject}
            </span>
            <span style={{ color: "#475569", fontSize: 13 }}>Q{q.number} of {QUESTIONS_PER_SUBJECT}</span>
            <span style={{ color: "#374151", fontSize: 13 }}>({idx + 1} / {questions.length} overall)</span>
            {marked.has(q.id) && <span style={{ background: "rgba(168,85,247,0.2)", border: "1px solid rgba(168,85,247,0.4)", borderRadius: 7, padding: "3px 10px", color: "#a855f7", fontSize: 12 }}> Marked</span>}
          </div>

         
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 13, padding: "18px 20px", marginBottom: 4 }}>
            <div style={{ color: "#64748b", fontWeight: 700, marginBottom: 12, fontFamily: "monospace", fontSize: 13 }}>
              Q{q.number}.
            </div>
            <QuestionRenderer
              q={q}
              showSolution={false}
              selectedIdx={sel}
              onSelect={(i) => setSel(i)}
            />
          </div>

          
          <div style={{ display: "flex", gap: 10, marginTop: 28, flexWrap: "wrap", alignItems: "center" }}>
            <button onClick={toggleMark} style={btn("mark")}> {marked.has(q.id) ? "Unmark" : "Mark"} & Next</button>
            <button onClick={toggleBookmark} style={{
              ...btn("ghost"),
              borderColor: bookmarks.has(q.id) ? "rgba(245,158,11,0.8)" : "rgba(245,158,11,0.45)",
              color:       bookmarks.has(q.id) ? "#fbbf24" : "#f59e0b",
              background:  bookmarks.has(q.id) ? "rgba(245,158,11,0.12)" : "rgba(245,158,11,0.05)",
            }}>
              {bookmarks.has(q.id) ? "Bookmarked" : "Bookmark"}
            </button>
            <button onClick={clearResp} style={btn("clear")}>Clear</button>
            <div style={{ flex: 1 }} />
            {idx > 0 && <button onClick={() => saveAndGo(-1)} style={btn("ghost")}> Prev</button>}
            <button onClick={() => saveAndGo(1)} style={btn("blue")}>Save & Next </button>
          </div>
         
          <div style={{ display: "flex", gap: 8, marginTop: 10, padding: "6px 0", borderTop: "1px solid rgba(255,255,255,0.06)", flexWrap: "wrap" }}>
            {SUBJECTS.map(s => {
              const t = subjectTimes.current[s] || 0;
              const m = Math.floor(t/60), sec = t%60;
              const isActive = q.subject === s;
              return (
                <div key={s} style={{ fontSize: 11, color: isActive ? "#a5b4fc" : "#475569", background: isActive ? "rgba(99,102,241,0.1)" : "transparent", borderRadius: 6, padding: "3px 8px" }}>
                  {s.slice(0,3)}: {m}m {("0"+sec).slice(-2)}s
                </div>
              );
            })}
          </div>
        </div>

        <Palette questions={questions} answers={answers} currentIdx={idx}
          onJump={i => { setVisited(p => { const n=new Set(p); n.add(i); return n; }); setIdx(i); }}
          marked={marked} visited={visited} />
      </div>

     
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div style={{ ...card(), padding: 32, maxWidth: 420, width: "90%" }}>
            <h3 style={{ color: "#f1f5f9", margin: "0 0 10px", fontSize: "1.25rem" }}>Submit Examination?</h3>
            <p style={{ color: "#94a3b8", marginBottom: 18, lineHeight: 1.7, fontSize: "0.92rem" }}>
              Attempted <strong style={{ color: "#a5b4fc" }}>{attempted}</strong> of <strong>{questions.length}</strong> questions.
              {questions.length - attempted > 0 && <> <strong style={{ color: "#f87171" }}>{questions.length - attempted} unattempted.</strong></>}
            </p>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
              {SUBJECTS.map(s => {
                const total = questions.filter(x => x.subject === s).length;
                const done = questions.filter(x => x.subject === s && answers[x.id] !== undefined).length;
                return (
                  <div key={s} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "8px 12px", fontSize: 13 }}>
                    <span style={{ color: "#94a3b8" }}>{s}: </span>
                    <span style={{ color: done === total ? "#4ade80" : "#fbbf24", fontWeight: 600 }}>{done}/{total}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowModal(false)} style={{ ...btn("ghost"), flex: 1 }}>Continue</button>
              <button onClick={doFinish} style={{ ...btn("danger"), flex: 1 }}>Submit Now</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 
// RESULT SCREEN
// 
function ResultScreen({ questions, answers, user, meta, onDashboard, onSignOut, branding = {} }) {
  const [expandId,    setExpandId]    = useState(null);
  const [filterSub,   setFilterSub]   = useState("All");
  const [filterStatus,setFilterStatus]= useState("All");
  const [activeTab,   setActiveTab]   = useState("summary"); // summary | solutions | bookmarks | analytics

  let correct = 0, wrong = 0, unattempted = 0;
  questions.forEach(q => {
    if (answers[q.id] === undefined) unattempted++;
    else if (answers[q.id] === q.correct) correct++;
    else wrong++;
  });
  const score     = correct * MARKS_CORRECT + wrong * MARKS_WRONG;
  const maxQ      = questions.length * MARKS_CORRECT;
  const pct       = Math.round((score / (maxQ || 1)) * 100);
  const timePerQ  = meta?.timePerQ     || {};
  const subTimes  = meta?.subjectTimes || {};
  const bookmarked= new Set(meta?.bookmarks || []);
  const percentile= meta?.percentile   ?? null;

  // Rank prediction based on historical NEET data
  const predictRank = (sc) => {
    if (sc >= 700) return "Under 100";
    if (sc >= 680) return "100 - 500";
    if (sc >= 650) return "500 - 1,000";
    if (sc >= 620) return "1,000 - 5,000";
    if (sc >= 600) return "5,000 - 10,000";
    if (sc >= 570) return "10,000 - 25,000";
    if (sc >= 540) return "25,000 - 50,000";
    if (sc >= 500) return "50,000 - 1,00,000";
    if (sc >= 450) return "1,00,000 - 2,50,000";
    if (sc >= 400) return "2,50,000 - 5,00,000";
    if (sc >= 360) return "5,00,000 - 8,00,000";
    return "Above 8,00,000";
  };

  // Avg time per question
  const times = Object.values(timePerQ);
  const avgTime = times.length ? Math.round(times.reduce((a,b) => a+b, 0) / times.length) : null;
  const slowestQ = times.length ? questions.find(q => timePerQ[q.id] === Math.max(...times)) : null;
  const fastestQ = times.length ? questions.find(q => timePerQ[q.id] === Math.min(...times.filter(t => t > 0))) : null;

  const subjectStats = SUBJECTS.map(s => {
    const qs = questions.filter(q => q.subject === s);
    const c = qs.filter(q => answers[q.id] === q.correct).length;
    const w = qs.filter(q => answers[q.id] !== undefined && answers[q.id] !== q.correct).length;
    return { subject: s, correct: c, wrong: w, total: qs.length, score: c * 4 + w * (-1), time: subTimes[s] || 0 };
  });

  // PDF download
  const downloadPDF = () => {
    const win = window.open("", "_blank");
    if (!win) {
      alert("PDF blocked by your browser.\n\nTo fix: click the popup blocked icon in your address bar and allow popups from this site, then click Download PDF again.");
      return;
    }
    const OPTS = ["A","B","C","D"];
    // Subject-wise summary
    const subjSummary = subjectsFrom(questions).map(s => {
      const sq = questions.filter(q => q.subject === s);
      const c  = sq.filter(q => answers[q.id] === q.correct).length;
      const w  = sq.filter(q => answers[q.id] !== undefined && answers[q.id] !== q.correct).length;
      const u  = sq.filter(q => answers[q.id] === undefined).length;
      const sc = c*MARKS_CORRECT + w*MARKS_WRONG;
      return "<tr><td><b>" + s + "</b></td><td style='color:green'>" + c + "</td><td style='color:red'>" + w + "</td><td style='color:gray'>" + u + "</td><td><b>" + sc + "</b></td></tr>";
    }).join("");
    // Full question list with solutions
    const qRows = questions.map(q => {
      const ua = answers[q.id];
      const isC = ua === q.correct;
      const isW = ua !== undefined && !isC;
      const isU = ua === undefined;
      const status = isC ? "CORRECT" : isW ? "WRONG" : "UNATTEMPTED";
      const marks  = isC ? "+4" : isW ? "-1" : "0";
      const color  = isC ? "#16a34a" : isW ? "#dc2626" : "#6b7280";
      const optRows = ["a","b","c","d"].map((lt, i) => {
        // Questions use q.options[] array (from sbFetchQuestions mapping) - fall back to q.option_a etc.
        const optText = (Array.isArray(q.options) && q.options[i] != null) ? q.options[i] : (q["option_" + lt] || "");
        const optImages = Array.isArray(q.option_images) ? q.option_images : [];
        const optImg  = optImages[i] || q["option_" + lt + "_image"] || "";
        const isAns   = ua === i;
        const isRight = q.correct === i;
        let bg = "transparent";
        if (isRight) bg = "#dcfce7";
        if (isAns && !isRight) bg = "#fee2e2";
        const imgTag = optImg ? "<br/><img src='" + optImg + "' style='max-height:80px;max-width:200px;object-fit:contain;margin-top:4px;display:block;border-radius:4px;'/>" : "";
        return "<div style='padding:6px 10px;margin:3px 0;background:" + bg + ";border-radius:4px;font-size:12px'><b>" + OPTS[i] + ") </b>" + optText + imgTag + (isRight?" <span style='color:green'>(correct)</span>":"") + (isAns&&!isRight?" <span style='color:red'>(your answer)</span>":"") + "</div>";
      }).join("");
      const timeS = timePerQ[q.id] || 0;
      return "<div style='margin-bottom:18px;padding:14px;border:1px solid #e5e7eb;border-left:4px solid " + color + ";border-radius:6px;page-break-inside:avoid'>" +
        "<div style='display:flex;justify-content:space-between;margin-bottom:8px'>" +
        "<span style='font-weight:700;color:#374151'>Q" + q.number + " &nbsp; <span style='background:#f3f4f6;padding:2px 8px;border-radius:4px;font-size:11px'>" + q.subject + "</span></span>" +
        "<span style='background:" + (isC?"#dcfce7":isW?"#fee2e2":"#f9fafb") + ";color:" + color + ";padding:3px 10px;border-radius:99px;font-size:12px;font-weight:700'>" + status + " " + marks + "</span>" +
        "</div>" +
        "<p style='margin:0 0 10px;font-size:13px;color:#1f2937'>" + (q.question_text || q.equation || "") + "</p>" +
        optRows +
        (q.solution_text ? "<div style='margin-top:10px;padding:8px 12px;background:#eff6ff;border-radius:4px;font-size:12px;color:#1e40af'><b>Solution: </b>" + q.solution_text + "</div>" : "") +
        "<div style='margin-top:6px;font-size:10px;color:#9ca3af'>Time spent: " + (Math.floor(timeS/60)+"m "+timeS%60+"s") + "</div>" +
        "</div>";
    }).join("");

    const pdfTitle = meta?.testName || "Mock Test Report";
    win.document.write("<!DOCTYPE html><html><head><title>" + pdfTitle + " - Result</title><style>" +
      "body{font-family:Arial,sans-serif;padding:24px;color:#111;max-width:900px;margin:0 auto}" +
      "h1{color:#1e1b4b;border-bottom:3px solid #6366f1;padding-bottom:8px}" +
      "h2{color:#312e81;margin-top:28px}" +
      ".stat{display:inline-block;margin:8px;padding:12px 20px;background:#f3f4f6;border-radius:10px;text-align:center;min-width:100px}" +
      ".big{font-size:1.8em;font-weight:bold;color:#312e81}" +
      ".lbl{font-size:11px;color:#6b7280;margin-top:2px}" +
      "table{width:100%;border-collapse:collapse;margin-top:10px}" +
      "th{background:#312e81;color:#fff;padding:8px 10px;font-size:12px;text-align:left}" +
      "td{padding:7px 10px;font-size:12px;border-bottom:1px solid #f3f4f6}" +
      "@media print{.noprint{display:none}}" +
      "</style></head><body>" +
      "<h1>" + pdfTitle + " - Report</h1>" +
      "<p style='color:#6b7280;font-size:13px'>Generated on " + new Date().toLocaleString("en-IN") + "</p>" +
      "<div class='noprint' style='margin:8px 0 20px'><button onclick='window.print()' style='background:#312e81;color:#fff;border:none;padding:12px 32px;border-radius:8px;font-size:15px;cursor:pointer'>Print / Save as PDF</button></div>" +
      "<div style='margin:16px 0'>" +
      "<div class='stat'><div class='big'>" + score + "</div><div class='lbl'>Score / " + maxQ + "</div></div>" +
      "<div class='stat'><div class='big'>" + pct + "%</div><div class='lbl'>Percentage</div></div>" +
      "<div class='stat'><div class='big'>" + correct + "</div><div class='lbl'>Correct</div></div>" +
      "<div class='stat'><div class='big'>" + wrong + "</div><div class='lbl'>Wrong</div></div>" +
      "<div class='stat'><div class='big'>" + unattempted + "</div><div class='lbl'>Unattempted</div></div>" +
      "<div class='stat'><div class='big'>" + (meta?.percentile != null ? meta.percentile + "%" : "") + "</div><div class='lbl'>Percentile</div></div>" +
      "<div class='stat'><div class='big' style='font-size:1.1em'>" + predictRank(score) + "</div><div class='lbl'>Predicted Rank</div></div>" +
      "</div>" +
      "<h2>Subject-wise Performance</h2>" +
      "<table><tr><th>Subject</th><th>Correct</th><th>Wrong</th><th>Unattempted</th><th>Score</th></tr>" + subjSummary + "</table>" +
      "<h2>All Questions with Solutions</h2>" +
      "<p style='font-size:12px;color:#6b7280;margin-bottom:16px'>Green border = correct &nbsp;|&nbsp; Red border = wrong &nbsp;|&nbsp; Gray border = unattempted</p>" +
      qRows +
      "</body></html>");
    win.document.close();
  };

  let filtered = filterSub === "All" ? questions : questions.filter(q => q.subject === filterSub);
  if (filterStatus === "Correct")     filtered = filtered.filter(q => answers[q.id] === q.correct);
  if (filterStatus === "Wrong")       filtered = filtered.filter(q => answers[q.id] !== undefined && answers[q.id] !== q.correct);
  if (filterStatus === "Unattempted") filtered = filtered.filter(q => answers[q.id] === undefined);
  if (filterStatus === "Bookmarked")  filtered = filtered.filter(q => bookmarked.has(q.id));

  const rank_band = pct >= 65 ? { label: "Excellent", color: "#4ade80" } : pct >= 50 ? { label: "Good", color: "#fbbf24" } : pct >= 35 ? { label: "Average", color: "#f59e0b" } : { label: "Needs Work", color: "#f87171" };

  return (
    <div style={{ minHeight: "100vh", ...brandingBg(branding), fontFamily: "'Crimson Pro', Georgia, serif", color: "#e2e8f0", paddingBottom: 60 }}>
     
      <div style={{ background: "linear-gradient(135deg,#1e1b4b,#312e81)", padding: "16px 28px", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: "0 0 4px", fontSize: "1.5rem", color: "#e2e8f0" }}>{meta?.testName || "Test Completed"}</h2>
          <p style={{ color: "#818cf8", margin: 0, fontSize: 14 }}>Detailed Performance Analysis</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button onClick={downloadPDF} style={{ ...btn("ghost", { padding: "9px 18px" }), display: "flex", alignItems: "center", gap: 8 }}>
            Download PDF Report
          </button>
          <button onClick={onDashboard} style={{ ...btn("blue", { padding: "9px 18px" }), display: "flex", alignItems: "center", gap: 8 }}>
            Dashboard
          </button>
          {onSignOut && (
            <button onClick={onSignOut} style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.35)", color: "#f87171", borderRadius: 10, padding: "9px 18px", fontWeight: 600, cursor: "pointer", fontSize: "0.9rem", fontFamily: "inherit" }}>
              Sign Out
            </button>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "22px 16px" }}>
        
        {meta?.saveError && (
          <div style={{ background:"rgba(239,68,68,0.12)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:10, padding:"10px 16px", marginBottom:16, color:"#f87171", fontSize:13 }}>
            Result could not be saved to database: {meta.saveError}. Your score is shown below but will not appear in admin reports.
          </div>
        )}
        <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
          {[["summary","Summary"],["analytics","Analytics"],["solutions","Solutions"],["bookmarks","Bookmarks (" + bookmarked.size + ")"]].map(([t,l]) => (
            <button key={t} onClick={() => setActiveTab(t)} style={btn(activeTab===t?"primary":"ghost", { padding: "8px 18px", fontSize: 13 })}>{l}</button>
          ))}
        </div>

       
        {activeTab === "summary" && (
          <div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16, marginBottom: 20 }}>
              <div style={{ background: "linear-gradient(135deg,rgba(99,102,241,0.2),rgba(168,85,247,0.15))", border: "1px solid rgba(99,102,241,0.35)", borderRadius: 16, padding: "24px", textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ fontSize: "3.5rem", fontWeight: 700, color: "#a5b4fc", lineHeight: 1 }}>{score}</div>
                <div style={{ color: "#475569", fontSize: 14, marginTop: 4 }}>out of {maxQ}</div>
                <div style={{ marginTop: 12, background: "rgba(0,0,0,0.3)", borderRadius: 99, height: 7 }}>
                  <div style={{ height: "100%", borderRadius: 99, background: "linear-gradient(90deg,#6366f1,#a855f7)", width: Math.max(0,pct) + "%", transition: "width 1.5s" }} />
                </div>
                <div style={{ color: "#64748b", marginTop: 6, fontSize: 13 }}>{pct}%</div>
                <div style={{ marginTop: 8, color: rank_band.color, fontWeight: 700, fontSize: "0.9rem" }}>{rank_band.label}</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { label: "Correct",     value: correct,    extra: "+" + (correct*4) + " marks",  color: "#22c55e", bg: "rgba(34,197,94,0.1)"   },
                  { label: "Wrong",       value: wrong,      extra: "-" + wrong + " marks",         color: "#ef4444", bg: "rgba(239,68,68,0.1)"   },
                  { label: "Unattempted", value: unattempted,extra: "0 marks",                      color: "#64748b", bg: "rgba(100,116,139,0.1)" },
                  { label: "Accuracy",    value: correct+wrong>0 ? Math.round((correct/(correct+wrong))*100)+"%" : "N/A", extra: "", color: "#fbbf24", bg: "rgba(245,158,11,0.1)" },
                ].map(s => (
                  <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: "16px" }}>
                    <div style={{ fontSize: "1.8rem", fontWeight: 700, color: s.color }}>{s.value}</div>
                    <div style={{ color: "#64748b", fontSize: 12 }}>{s.label}</div>
                    {s.extra && <div style={{ color: s.color, fontSize: 11, marginTop: 3 }}>{s.extra}</div>}
                  </div>
                ))}
              </div>
            </div>

           
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
              <div style={{ ...card(), padding: "16px 18px" }}>
                <div style={{ color: "#64748b", fontSize: 12, marginBottom: 4 }}>Predicted NEET Rank</div>
                <div style={{ color: "#a5b4fc", fontWeight: 700, fontSize: "1.2rem" }}>{predictRank(score)}</div>
                <div style={{ color: "#475569", fontSize: 11, marginTop: 4 }}>Based on historical NEET cutoff data</div>
              </div>
              <div style={{ ...card(), padding: "16px 18px" }}>
                <div style={{ color: "#64748b", fontSize: 12, marginBottom: 4 }}>Your Percentile</div>
                <div style={{ color: "#4ade80", fontWeight: 700, fontSize: "1.2rem" }}>{percentile !== null ? percentile + "th percentile" : "Calculating..."}</div>
                <div style={{ color: "#475569", fontSize: 11, marginTop: 4 }}>Among all students on this platform</div>
              </div>
            </div>

            
            <h3 style={{ color: "#a5b4fc", marginBottom: 12, fontSize: "1rem" }}>Subject-wise Breakdown</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12, marginBottom: 20 }}>
              {subjectStats.map((s, i) => (
                <div key={s.subject} style={{ ...card(), padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontWeight: 600, color: "#c7d2fe", fontSize: "0.9rem" }}>{s.subject}</span>
                    <span style={{ color: subjectColors(i), fontWeight: 700, fontSize: "0.9rem" }}>{s.score}/{s.total * 4}</span>
                  </div>
                  <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 99, height: 5, marginBottom: 8 }}>
                    <div style={{ height: "100%", borderRadius: 99, background: subjectColors(i), width: (s.correct/s.total*100) + "%" }} />
                  </div>
                  <div style={{ display: "flex", gap: 12, fontSize: 12 }}>
                    <span style={{ color: "#4ade80" }}>Correct: {s.correct}</span>
                    <span style={{ color: "#f87171" }}>Wrong: {s.wrong}</span>
                    <span style={{ color: "#64748b", marginLeft: "auto" }}>{Math.round(s.time/60)}m</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        
        {activeTab === "analytics" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ ...card(), padding: "18px 20px" }}>
              <h3 style={{ color: "#a5b4fc", margin: "0 0 14px", fontSize: "1rem" }}>Time Analysis</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 16 }}>
                <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "12px", textAlign: "center" }}>
                  <div style={{ color: "#a5b4fc", fontWeight: 700, fontSize: "1.3rem" }}>{avgTime !== null ? avgTime + "s" : "N/A"}</div>
                  <div style={{ color: "#64748b", fontSize: 12 }}>Avg time per question</div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "12px", textAlign: "center" }}>
                  <div style={{ color: "#f87171", fontWeight: 700, fontSize: "1.3rem" }}>{slowestQ ? (timePerQ[slowestQ.id]||0) + "s" : "N/A"}</div>
                  <div style={{ color: "#64748b", fontSize: 12 }}>Slowest question{slowestQ ? " (Q" + slowestQ.number + ")" : ""}</div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "12px", textAlign: "center" }}>
                  <div style={{ color: "#4ade80", fontWeight: 700, fontSize: "1.3rem" }}>{fastestQ ? (timePerQ[fastestQ.id]||0) + "s" : "N/A"}</div>
                  <div style={{ color: "#64748b", fontSize: 12 }}>Fastest question{fastestQ ? " (Q" + fastestQ.number + ")" : ""}</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {SUBJECTS.map(s => {
                  const t = subTimes[s] || 0;
                  const total = Object.values(subTimes).reduce((a,b) => a+b, 0) || 1;
                  const pct2 = Math.round((t/total)*100);
                  return (
                    <div key={s}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                        <span style={{ color: "#94a3b8" }}>{s}</span>
                        <span style={{ color: "#64748b" }}>{Math.floor(t/60)}m {t%60}s ({pct2}%)</span>
                      </div>
                      <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 99, height: 6 }}>
                        <div style={{ height: "100%", borderRadius: 99, background: subjectColors(SUBJECTS.indexOf(s)), width: pct2 + "%" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            
            <div style={{ ...card(), padding: "18px 20px" }}>
              <h3 style={{ color: "#a5b4fc", margin: "0 0 12px", fontSize: "1rem" }}>Time per Question (seconds)</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {questions.map(q => {
                  const t = timePerQ[q.id] || 0;
                  const isCorrect = answers[q.id] === q.correct;
                  const isWrong   = answers[q.id] !== undefined && !isCorrect;
                  const heat = Math.min(1, t/120);
                  return (
                    <div key={q.id} title={"Q" + q.number + " " + q.subject + " " + t + "s"} style={{ width: 28, height: 28, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, background: isCorrect ? "rgba(34,197,94," + (0.2+heat*0.6) + ")" : isWrong ? "rgba(239,68,68," + (0.2+heat*0.6) + ")" : "rgba(100,116,139,0.2)", color: "#fff", cursor: "default" }}>
                      {q.number}
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 11, color: "#64748b" }}>
                <span style={{ color: "#4ade80" }}>Green = correct</span>
                <span style={{ color: "#f87171" }}>Red = wrong</span>
                <span>Darker = more time spent</span>
              </div>
            </div>
          </div>
        )}

       
{activeTab === "solutions" && (
  <div>

    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 14,
        flexWrap: "wrap",
        gap: 10
      }}
    >
      <h3
        style={{
          color: "#a5b4fc",
          margin: 0,
          fontSize: "1rem"
        }}
      >
        Solutions & Review ({filtered.length})
      </h3>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {["All","Correct","Wrong","Unattempted","Bookmarked"].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            style={btn(
              filterStatus === s ? "primary" : "ghost",
              { padding: "5px 12px", fontSize: 12 }
            )}
          >
            {s}
          </button>
        ))}
      </div>
    </div>

    <div
      style={{
        display: "flex",
        gap: 6,
        marginBottom: 16,
        flexWrap: "wrap"
      }}
    >
      {["All", ...SUBJECTS].map(s => (
        <button
          key={s}
          onClick={() => setFilterSub(s)}
          style={{
            ...btn(
              filterSub === s
                ? "primary"
                : "ghost",
              {
                padding: "5px 13px",
                fontSize: 12
              }
            )
          }}
        >
          {s}
        </button>
      ))}
    </div>

    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10
      }}
    >
      {filtered.map(q => {
        const userAns = answers[q.id];
        const isCorrect = userAns === q.correct;
        const isWrong =
          userAns !== undefined &&
          !isCorrect;

        const isOpen =
          expandId === q.id;

        return (
          <div
            key={q.id}
            style={{
              ...card(),
              border: `1px solid ${
                isCorrect
                  ? "rgba(34,197,94,0.3)"
                  : isWrong
                  ? "rgba(239,68,68,0.25)"
                  : "rgba(255,255,255,0.07)"
              }`,
              overflow: "hidden"
            }}
          >
            <div
              onClick={() =>
                setExpandId(
                  isOpen
                    ? null
                    : q.id
                )
              }
              style={{
                display: "flex",
                gap: 13,
                padding: "14px 18px",
                cursor: "pointer"
              }}
            >
              <div style={{ flex: 1 }}>
                {q.subject} Q{q.number}
              </div>
            </div>

            {isOpen && (
              <div
                style={{
                  borderTop:
                    "1px solid rgba(255,255,255,0.06)",
                  padding:
                    "14px 18px 18px 57px"
                }}
              >
                <QuestionRenderer
                  q={q}
                  showSolution={true}
                  userAnswer={userAns}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>

  </div>
)}
        
        {activeTab === "bookmarks" && (
          <div>
            {bookmarked.size === 0 ? (
              <div style={{ textAlign: "center", color: "#475569", padding: 40 }}>No bookmarks. Tap the Bookmark button during the exam to save questions for review.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {questions.filter(q => bookmarked.has(q.id)).map(q => {
                  const userAns = answers[q.id];
                  const isCorrect = userAns === q.correct;
                  return (
                    <div key={q.id} style={{ ...card(), border: "1px solid rgba(245,158,11,0.3)", overflow: "hidden" }}>
                      <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        <span style={{ fontSize: 11, color: "#fbbf24" }}>Bookmarked</span>
                        <span style={{ marginLeft: 10, fontSize: 11, color: "#64748b" }}>{q.subject} Q{q.number}</span>
                        <span style={{ marginLeft: 10, fontSize: 11, color: isCorrect ? "#4ade80" : "#f87171" }}>{isCorrect ? "Correct" : "Wrong"}</span>
                      </div>
                      <div style={{ padding: "14px 16px" }}>
                      <QuestionRenderer q={q} showSolution={true} userAnswer={userAns} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          }
            </div>        
        )}

        <div style={{ textAlign: "center", marginTop: 36, padding: "20px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14 }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>&#9989;</div>
          <div style={{ color: "#4ade80", fontWeight: 700, fontSize: "1.1rem", marginBottom: 6 }}>Test Submitted Successfully</div>
          <div style={{ color: "#64748b", fontSize: 13 }}>Your result has been saved. You may close this window.</div>
        </div>
      </div>
    </div>
  );
}

function subjectColors(i) {
  return ["#6366f1","#f59e0b","#22c55e","#f43f5e"][i % 4];
}

// 
// ROOT APP
// 
export default function App() {
  const [screen,       setScreen]       = useState(SCREEN.LANDING);
  const [user,         setUser]         = useState(null);
  const [questions,    setQuestions]    = useState([]);
  const [finalAnswers, setFinalAnswers] = useState({});
  const [finalMeta,    setFinalMeta]    = useState({});   // time_per_q, subject_times, bookmarks
  const [activeTest,   setActiveTest]   = useState(null); // {batch_test_id, batch_id, test_name}
  const [branding,     setBranding]     = useState(() => {
    try {
      const cached = localStorage.getItem("neet_branding_cache");
      return cached ? JSON.parse(cached) : {};
    } catch (_) { return {}; }
  });
  const [brandingReady,setBrandingReady]= useState(true);
  const [examWindowEnd,   setExamWindowEnd]   = useState(null); // ISO string of window end
  const [examWindowStart, setExamWindowStart] = useState(null); // ISO string of window start (for timer)
  const [disableSubmit,   setDisableSubmit]   = useState(false); // hide submit button
  const [loadingMsg,      setLoadingMsg]      = useState(null); // user-friendly error message
  const [loadingQ,     setLoadingQ]     = useState(false);
  const [loadingError, setLoadingError] = useState(null);
  const darkMode = true; // always dark
  const hindiMode = false;
  const [settings,     setSettings]     = useState({});   // platform_settings from Supabase

  // Sync theme to global context so all components can read it
  ThemeCtx.dark = darkMode;

  // Listen for branding updates from AdminScreen (same tab, dispatched via StorageEvent)
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "neet_branding_cache" && e.newValue) {
        try { setBranding(JSON.parse(e.newValue)); } catch (_) {}
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Load platform settings + branding from Supabase on mount
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from("platform_settings").select("key,value");
        if (data) { const s = {}; data.forEach(r => { s[r.key] = r.value; }); setSettings(s); }
      } catch (_) {}
      try {
        const { data } = await supabase.from("branding").select("key,value");
        if (data && data.length > 0) {
          const b = {};
          data.forEach(r => { b[r.key] = r.value; });
          setBranding(b);
          try {
            localStorage.setItem("neet_branding_cache", JSON.stringify(b));
            var bg = b.bg_type === "solid" && b.bg_solid_color ? b.bg_solid_color
              : b.bg_type === "image" && b.bg_image_data ? "url(" + b.bg_image_data + ") center/cover no-repeat"
              : b.bg_gradient_from && b.bg_gradient_to ? "linear-gradient(135deg," + b.bg_gradient_from + " 0%," + b.bg_gradient_to + " 50%," + b.bg_gradient_from + " 100%)"
              : "";
            if (bg) document.documentElement.style.setProperty("--landing-bg", bg);
          } catch (_) {}
        }
        setBrandingReady(true);
      } catch (_) { setBrandingReady(true); }
    })();
  }, []);

  // Check for existing auth session + resume exam on mount
  useEffect(() => {
    // 1. Check if there's an active exam session in localStorage
    const tryResumeExam = (loggedInUser) => {
      try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) return false;
        const s = JSON.parse(raw);
        // Reject stale sessions older than 4 hours
        if (!s.savedAt || Date.now() - s.savedAt > 4 * 60 * 60 * 1000) {
          localStorage.removeItem(SESSION_KEY);
          return false;
        }
        // Restore the cached question list
        const cachedQs = localStorage.getItem("neet_questions_cache");
        if (!cachedQs) return false;
        const qs = JSON.parse(cachedQs);
        // Validate question IDs match
        if (!s.questionIds || s.questionIds.length !== qs.length) return false;
        setQuestions(qs);
        setScreen(SCREEN.EXAM);
        return true;
      } catch { return false; }
    };

    // 1b. Check for a recently submitted result (show result on reload instead of landing)
    const tryResumeResult = async (u) => {
      try {
        const raw = localStorage.getItem("neet_last_result");
        if (!raw) return false;
        const saved = JSON.parse(raw);
        // Only restore if saved within last 2 hours
        if (!saved?.savedAt || Date.now() - saved.savedAt > 2 * 60 * 60 * 1000) return false;
        if (!saved.questionIds?.length) return false;
        // Fetch questions by IDs to restore result screen
        const { data: qs } = await supabase.from("questions")
          .select("id, number, subject, type, question_text, equation, diagram_url, option_a, option_b, option_c, option_d, correct, solution_text, solution_eq, paper_id")
          .in("id", saved.questionIds.slice(0, 180));
        if (!qs || !qs.length) return false;
        // Sort by original order
        const ordered = saved.questionIds.map(id => qs.find(q => q.id === id)).filter(Boolean);
        setQuestions(ordered);
        setFinalAnswers(saved.answers || {});
        setFinalMeta(saved.meta || {});
        setScreen(SCREEN.RESULT);
        return true;
      } catch { return false; }
    };

    // 2. Auth state
    if (isSupabaseConfigured()) {
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (session?.user) {
          setUser(session.user);
          // Check for pending result first, then exam, then dashboard
          const hasResult = await tryResumeResult(session.user);
          if (!hasResult && !tryResumeExam(session.user)) setScreen(SCREEN.DASHBOARD);
        } else {
          setScreen(SCREEN.LANDING);
        }
      });
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
        if (session?.user) { setUser(session.user); }
        else { setUser(null); setScreen(SCREEN.LANDING); }
      });
      return () => subscription.unsubscribe();
    } else {
      // Demo mode  still try to resume exam if questions are cached
      tryResumeExam(null);
    }
  }, []);

  const handleAuth = (u) => { setUser(u); setScreen(SCREEN.DASHBOARD); };

  const handleSignOut = async () => {
    try { localStorage.removeItem(SESSION_KEY); } catch (_) {}
    await sbSignOut();
    setUser(null);
    setScreen(SCREEN.LANDING);
  };

  const handleStartYear = async (paperId, testMeta) => {
    const usePaperId = paperId || "PAPER_01";
    if (testMeta) setActiveTest(testMeta);
    else setActiveTest(null);
    // Store the exam window end so ExamScreen can auto-submit at the right time
    setExamWindowEnd(testMeta?.exam_window_end || null);
    setExamWindowStart(testMeta?.exam_window_start || null);
    setDisableSubmit(testMeta?.disable_submit === true);
    setLoadingQ(true);
    setLoadingError(null);

    const { questions: remote, error } = await sbFetchQuestions(usePaperId);

    if (error) {
      // Try localStorage cache as fallback
      const cached = localStorage.getItem("neet_questions_cache_" + usePaperId);
      if (cached) {
        try {
          setQuestions(JSON.parse(cached));
          setLoadingQ(false);
          setScreen(SCREEN.INSTRUCTIONS);
          return;
        } catch (_) {}
      }
      setLoadingError(error);
      setLoadingQ(false);
      return;
    }

    // Cache for offline resilience
    try { localStorage.setItem("neet_questions_cache_" + usePaperId, JSON.stringify(remote)); } catch (_) {}

    setQuestions(remote);
    setLoadingQ(false);
    setScreen(SCREEN.INSTRUCTIONS);
  };



  const handleFinish = async (ans, marked, meta) => {
    setFinalAnswers(ans);
    setFinalMeta(meta || {});
    // Persist result so page reload shows result instead of landing
    try {
      localStorage.setItem("neet_last_result", JSON.stringify({
        answers: ans,
        meta: meta || {},
        questionIds: questions.map(q => q.id),
        paper_id: activeTest?.paper_id || questions[0]?.paper_id || "PAPER_01",
        savedAt: Date.now(),
      }));
    } catch (_) {}
    let correct = 0, wrong = 0, unattempted = 0;
    questions.forEach(q => {
      if (ans[q.id] === undefined) unattempted++;
      else if (ans[q.id] === q.correct) correct++;
      else wrong++;
    });
    const score = correct * MARKS_CORRECT + wrong * MARKS_WRONG;

    // Compute percentile from all past results
    let percentile = null;
    try {
      const { data: allResults } = await supabase.from("test_results").select("score");
      if (allResults && allResults.length > 0) {
        const below = allResults.filter(r => r.score < score).length;
        percentile = Math.round((below / allResults.length) * 100);
      }
    } catch (_) {}

    // Increment attempt count in student_profiles
    if (user) {
      try {
        await supabase.from("student_profiles")
          .upsert({ id: user.id, attempts: 1 }, { onConflict: "id", ignoreDuplicates: false });
        await supabase.rpc("increment_attempts", { uid: user.id }).catch(() => {});
      } catch (_) {}
    }

    const studentName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Student";
    if (meta) meta.testName = activeTest?.test_name || "NEET Mock Test";
    const payload = {
      score, correct, wrong, unattempted,
      total: questions.length, percentile,
      time_per_question: meta?.timePerQ || {},
      subject_times:     meta?.subjectTimes || {},
      bookmarks:         meta?.bookmarks || [],
      answers:           ans,
      student_name:      studentName,
      student_email:     user?.email || "",
      paper_id:          activeTest?.paper_id || questions[0]?.paper_id || "PAPER_01",
      ...(activeTest ? {
        batch_test_id: activeTest.batch_test_id,
        batch_id:      activeTest.batch_id,
        test_name:     activeTest.test_name,
      } : {}),
    };

    // Save to localStorage
    if (user) {
      try {
        const key = "neet_history_" + user.id;
        const existing = JSON.parse(localStorage.getItem(key) || "[]");
        existing.unshift({ ...payload, created_at: new Date().toISOString() });
        localStorage.setItem(key, JSON.stringify(existing.slice(0, 30)));
      } catch (_) {}
    }

    // Save to Supabase  strip any fields not in test_results schema
    if (isSupabaseConfigured() && user) {
      // Only send columns that exist in the test_results table
      const safePayload = {
          score:             payload.score,
        correct:           payload.correct,
        wrong:             payload.wrong,
        unattempted:       payload.unattempted,
        total:             payload.total,
        percentile:        payload.percentile,
        answers:           payload.answers,
        student_name:      payload.student_name,
        student_email:     payload.student_email,
        paper_id:          payload.paper_id,
        test_name:         payload.test_name || (activeTest?.test_name || "NEET Mock Test"),
        subject_times:     payload.subject_times,
        time_per_question: payload.time_per_question,
        bookmarks:         payload.bookmarks,
        ...(activeTest ? {
          batch_test_id: activeTest.batch_test_id,
          batch_id:      activeTest.batch_id,
        } : {}),
      };
      const { error: saveErr } = await sbSaveResult(user.id, safePayload);
      if (saveErr) {
        console.error("Result save error:", saveErr);
        // Store error in meta so ResultScreen can show a warning
        if (meta) meta.saveError = saveErr;
      }
    }

    // Email the report to the fixed admin address (configurable via platform_settings -> report_email)
    try {
      const reportEmail = (settings && settings.report_email) ? settings.report_email.trim() : "";
      if (reportEmail) {
        const subjRows = subjectsFrom(questions).map(sub => {
          const sq = questions.filter(q => q.subject === sub);
          if (!sq.length) return "";
          const c = sq.filter(q => ans[q.id] === q.correct).length;
          const w = sq.filter(q => ans[q.id] !== undefined && ans[q.id] !== q.correct).length;
          const u = sq.filter(q => ans[q.id] === undefined).length;
          return "<tr><td style='padding:6px 10px;border-bottom:1px solid #eee'>" + sub + "</td>" +
                 "<td style='padding:6px 10px;border-bottom:1px solid #eee;color:#16a34a'>" + c + "</td>" +
                 "<td style='padding:6px 10px;border-bottom:1px solid #eee;color:#dc2626'>" + w + "</td>" +
                 "<td style='padding:6px 10px;border-bottom:1px solid #eee;color:#6b7280'>" + u + "</td>" +
                 "<td style='padding:6px 10px;border-bottom:1px solid #eee'><b>" + (c*MARKS_CORRECT + w*MARKS_WRONG) + "</b></td></tr>";
        }).join("");
        const pctVal = questions.length ? Math.round((correct / questions.length) * 100) : 0;
        const html =
          "<div style='font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#111'>" +
          "<h2 style='color:#312e81'>" + (payload.test_name || "Mock Test") + " - Student Report</h2>" +
          "<p><b>Student:</b> " + (payload.student_name || "Student") + " &nbsp; | &nbsp; <b>Email:</b> " + (payload.student_email || "-") + "</p>" +
          "<p><b>Paper ID:</b> " + (payload.paper_id || "-") + " &nbsp; | &nbsp; <b>Submitted:</b> " + new Date().toLocaleString("en-IN") + "</p>" +
          "<table style='border-collapse:collapse;margin:14px 0'>" +
          "<tr><td style='padding:8px 16px;background:#f3f4f6;border-radius:8px'><b>Score:</b> " + score + " / " + (questions.length * MARKS_CORRECT) + "</td>" +
          "<td style='padding:8px 16px;background:#f3f4f6;border-radius:8px'><b>Percentage:</b> " + pctVal + "%</td></tr></table>" +
          "<p><b>Correct:</b> " + correct + " &nbsp; <b>Wrong:</b> " + wrong + " &nbsp; <b>Unattempted:</b> " + unattempted +
          (percentile != null ? " &nbsp; <b>Percentile:</b> " + percentile + "%" : "") + "</p>" +
          "<h3 style='color:#312e81;margin-top:20px'>Subject-wise Performance</h3>" +
          "<table style='width:100%;border-collapse:collapse;font-size:14px'>" +
          "<tr style='background:#312e81;color:#fff'><th style='padding:8px 10px;text-align:left'>Subject</th>" +
          "<th style='padding:8px 10px;text-align:left'>Correct</th><th style='padding:8px 10px;text-align:left'>Wrong</th>" +
          "<th style='padding:8px 10px;text-align:left'>Unatt.</th><th style='padding:8px 10px;text-align:left'>Score</th></tr>" +
          subjRows + "</table>" +
          "<p style='margin-top:18px;color:#6b7280;font-size:13px'>The full detailed report with all questions and solutions is available for the student to download from their dashboard.</p>" +
          "</div>";
        fetch("/api/send-report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: reportEmail,
            subject: "Test Report - " + (payload.student_name || "Student") + " - " + (payload.test_name || "Mock Test"),
            html,
          }),
        }).catch(() => {});
      }
    } catch (_) {}

    setScreen(SCREEN.RESULT);
  };

  if (loadingQ) {
    return (
      <div style={{ height: "100vh", background: "#070d1a", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, fontFamily: "Georgia, serif" }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", border: "3px solid rgba(99,102,241,0.3)", borderTop: "3px solid #6366f1", animation: "spin 0.8s linear infinite" }} />
        <div style={{ color: "#818cf8", fontSize: "1rem" }}>Loading question bank</div>
        <div style={{ color: "#475569", fontSize: 13 }}>Connecting to Supabase</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
      </div>
    );
  }

  // Show a clear error screen if questions failed to load
  if (loadingError) {
    // Detect what kind of error to show the right fix
    const isConfig   = loadingError.includes("not set") || loadingError.includes("placeholder") || loadingError.includes("trailing slash") || loadingError.includes("starts with");
    const isNoData   = loadingError.includes("No questions found");
    const isRLS      = loadingError.includes("Permission denied") || loadingError.includes("policy");
    const isNetwork  = loadingError.includes("Network error") || loadingError.includes("internet");
    const isTable    = loadingError.includes("does not exist");
    const isKey      = loadingError.includes("API key") || loadingError.includes("anon key");

    const steps = isConfig ? [
      "Open src/App.jsx in VS Code",
      "Go to supabase.com  your project  Settings  API",
      "Copy Project URL  paste on line 8 (replace the placeholder)",
      "Copy anon public key  paste on line 9",
      "Save the file (Ctrl+S)  page will auto-reload",
    ] : isNoData ? [
      "Go to supabase.com  your project  SQL Editor",
      "Paste the INSERT questions SQL from the earlier step",
      "Make sure paper_id matches the Paper ID you entered (e.g. PAPER_01)",
      "Click Run, then try again",
    ] : isRLS ? [
      "Go to supabase.com  your project  SQL Editor",
      "Run: create policy \"read questions\" on questions for select to authenticated using (true);",
      "Save and try again",
    ] : isTable ? [
      "Go to supabase.com  your project  SQL Editor",
      "Run the full table creation SQL from the setup step",
      "Then insert your questions and try again",
    ] : isKey ? [
      "Go to supabase.com  your project  Settings  API",
      "Copy the anon public key (starts with eyJ)",
      "Paste it on line 9 of src/App.jsx",
      "Save the file",
    ] : isNetwork ? [
      "Check your internet connection",
      "Verify SUPABASE_URL in App.jsx line 8 has no typos",
      "Make sure the URL has no trailing slash",
      "Try refreshing the page",
    ] : [
      "Open browser console (F12  Console tab)",
      "Click Begin Mock Test again",
      "Read the red error message and share it for help",
    ];

    return (
      <div style={{ height: "100vh", background: "#070d1a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", padding: 24 }}>
        <div style={{ maxWidth: 560, width: "100%", background: "#0f172a", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 20, padding: 32 }}>
          
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}></div>
            <div>
              <div style={{ color: "#f87171", fontWeight: 700, fontSize: "1.1rem" }}>Could not load questions</div>
              <div style={{ color: "#64748b", fontSize: 13, marginTop: 2 }}>Supabase returned an error</div>
            </div>
          </div>

          
          <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "12px 16px", marginBottom: 24, color: "#fca5a5", fontSize: 14, lineHeight: 1.7 }}>
            {loadingError}
          </div>

          
          <div style={{ marginBottom: 24 }}>
            <div style={{ color: "#a5b4fc", fontWeight: 700, fontSize: 14, marginBottom: 12 }}>
              {isConfig ? " How to fix  set your credentials:" :
               isNoData ? " How to fix  add questions to Supabase:" :
               isRLS    ? " How to fix  add a security policy:" :
               isTable  ? " How to fix  create the table:" :
               isKey    ? " How to fix  update your API key:" :
               isNetwork? " How to fix  connection issue:" :
                          " How to debug:"}
            </div>
            <ol style={{ margin: 0, paddingLeft: 20, color: "#cbd5e1", fontSize: 14, lineHeight: 2 }}>
              {steps.map((s, i) => <li key={i}>{s}</li>)}
            </ol>
          </div>

         
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              onClick={() => { setLoadingError(null); handleStartYear(); }}
              style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "#fff", border: "none", borderRadius: 10, padding: "11px 24px", fontWeight: 600, cursor: "pointer", fontSize: "0.9rem", fontFamily: "inherit" }}
            >
               Retry
            </button>

            <button
              onClick={() => setLoadingError(null)}
              style={{ background: "transparent", color: "#64748b", border: "none", borderRadius: 10, padding: "11px 16px", cursor: "pointer", fontSize: "0.9rem", fontFamily: "inherit" }}
            >
               Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&display=swap');
      *, *::before, *::after { box-sizing: border-box; }
      html { height: 100%; }
      body { margin: 0; min-height: 100%; -webkit-tap-highlight-color: transparent; touch-action: manipulation; background: #070d1a; }
      #root { min-height: 100vh; width: 100%; display: flex; flex-direction: column; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 3px; }
        input:-webkit-autofill { -webkit-box-shadow: 0 0 0 100px #1e293b inset !important; -webkit-text-fill-color: #e2e8f0 !important; }
        /* Prevent zoom on input focus on iOS/Android */
        input, select, textarea { font-size: 16px !important; }
        @keyframes pulse { 0%,100%{box-shadow:0 0 0 3px rgba(34,197,94,0.3)} 50%{box-shadow:0 0 0 6px rgba(34,197,94,0.1)} }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 700px) {
          /* General */
          .mob-full  { width: 100% !important; max-width: 100% !important; }
          .mob-hide  { display: none !important; }
          .mob-grid2 { grid-template-columns: 1fr 1fr !important; }
          .mob-grid1 { grid-template-columns: 1fr !important; }
          /* Exam: stack question ON TOP, palette as thin strip at bottom */
          .mob-col   { flex-direction: column !important; overflow: hidden !important; }
          /* Question area takes all available space */
          .mob-col > div:first-child { flex: 1 !important; min-height: 0 !important; overflow-y: auto !important; padding: 12px 14px !important; }
          /* Palette becomes a compact fixed-height strip at bottom */
          .mob-palette {
            width: 100% !important;
            height: 130px !important;
            min-height: 130px !important;
            max-height: 130px !important;
            border-left: none !important;
            border-top: 1px solid rgba(255,255,255,0.1) !important;
            flex-direction: row !important;
            overflow: hidden !important;
          }
          /* Stats row inside palette: horizontal compact */
          .mob-palette > div:nth-child(1) {
            display: flex !important;
            flex-direction: column !important;
            gap: 3px !important;
            padding: 6px !important;
            border-bottom: none !important;
            border-right: 1px solid rgba(255,255,255,0.07) !important;
            min-width: 60px !important;
            max-width: 60px !important;
            font-size: 10px !important;
          }
          /* Legend row: hide on mobile to save space */
          .mob-palette > div:nth-child(2) { display: none !important; }
          /* Grid scroll area: takes remaining width */
          .mob-pal-scroll {
            flex: 1 !important;
            display: flex !important;
            flex-direction: row !important;
            overflow-x: auto !important;
            gap: 6px !important;
            padding: 6px 8px !important;
            align-items: flex-start !important;
          }
          /* Each subject section in palette */
          .mob-pal-section {
            flex-shrink: 0 !important;
            min-width: 60px !important;
          }
          /* Question buttons in palette: smaller on mobile */
          .mob-pal-section .pal-btn {
            width: 22px !important;
            height: 22px !important;
            font-size: 8px !important;
          }
          /* Subject label in palette */
          .mob-pal-section > div:first-child { font-size: 7px !important; margin-bottom: 3px !important; }
          /* Palette question grid */
          .mob-pal-section > div:last-child { gap: 2px !important; }
          /* Hide subject tabs in header on mobile */
          .exam-subj-tabs { display: none !important; }
          /* Action buttons */
          .mob-action-row { gap: 5px !important; }
          .mob-action-row button { padding: 9px 8px !important; font-size: 11px !important; flex: 1 !important; min-width: 0 !important; }
          /* Time strip */
          .time-strip span { font-size: 9px !important; }
          /* Header */
          .exam-timer { font-size: 13px !important; padding: 4px 10px !important; }
        }
      `}</style>

      {screen === SCREEN.LANDING     && (
        <LandingScreen onStudent={() => setScreen(SCREEN.AUTH)} onAdmin={() => setScreen(SCREEN.ADMIN_AUTH)} branding={branding} />
      )}
      {screen === SCREEN.AUTH         && <AuthScreen onAuth={handleAuth} branding={branding} />}
      {screen === SCREEN.ADMIN_AUTH   && <AdminAuthScreen onSuccess={() => setScreen(SCREEN.ADMIN)} onBack={() => setScreen(SCREEN.LANDING)} branding={branding} />}
      {screen === SCREEN.ADMIN        && <AdminScreen onSignOut={() => setScreen(SCREEN.LANDING)} />}
      {screen === SCREEN.DASHBOARD    && user && <Dashboard user={user} onStart={handleStartYear} onSignOut={handleSignOut} settings={settings} branding={branding} />}
      {screen === SCREEN.INSTRUCTIONS && <InstructionsScreen onBegin={() => setScreen(SCREEN.EXAM)} onBack={() => { try { localStorage.removeItem(SESSION_KEY); } catch(_){} setScreen(SCREEN.DASHBOARD); }} branding={branding} />}
      {screen === SCREEN.EXAM         && <ExamScreen questions={questions} onFinish={handleFinish} settings={settings} examWindowEnd={examWindowEnd} examWindowStart={examWindowStart} disableSubmit={disableSubmit} branding={branding} />}
      {screen === SCREEN.RESULT       && (
        <ResultScreen questions={questions} answers={finalAnswers} user={user} meta={finalMeta} branding={branding}
          onDashboard={() => { try { localStorage.removeItem("neet_last_result"); } catch (_) {} setFinalAnswers({}); setFinalMeta({}); setScreen(SCREEN.DASHBOARD); }}
          onSignOut={handleSignOut} />
      )}
    </>
  );
}
