// QuestionRenderer.jsx
// Renders question_text + LaTeX equations + images as one seamless block
// No npm install needed  KaTeX loads from CDN automatically
//
// IMAGE EMBEDDING OPTIONS:
//   1. diagram_url column   image always appears as part of the question body
//   2. [img]https://...[/img] tag inside question_text  image at that exact position
//   3. Both can be used together
//
// LATEX OPTIONS:
//   $...$   inline math
//   $$...$$ centred block math
//   Or embed $...$ directly inside question_text anywhere

import { useEffect, useRef, useState } from "react";

// 
// KaTeX loader  CDN, cached after first load
// 
let _katexPromise = null;
function loadKatex() {
  if (_katexPromise) return _katexPromise;
  _katexPromise = new Promise((resolve) => {
    if (window.katex) { resolve(window.katex); return; }
    if (!document.querySelector("#katex-css")) {
      const link = document.createElement("link");
      link.id = "katex-css";
      link.rel = "stylesheet";
      link.href = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css";
      document.head.appendChild(link);
    }
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js";
    s.onload = () => resolve(window.katex);
    s.onerror = () => resolve(null);
    document.head.appendChild(s);
  });
  return _katexPromise;
}

// 
// InlineImage  single image with spinner + error state
// 
function InlineImage({ url, alt = "diagram" }) {
  const [st, setSt] = useState("loading");
  if (!url || !url.trim()) return null;
  return (
    <span style={{ display: "block", margin: "14px 0" }}>
      {st === "loading" && (
        <span style={{
          display: "flex", alignItems: "center", gap: 8,
          color: "#64748b", fontSize: 13, padding: "12px 0"
        }}>
          <span style={{
            display: "inline-block", width: 16, height: 16,
            borderRadius: "50%",
            border: "2px solid rgba(99,102,241,0.25)",
            borderTop: "2px solid #6366f1",
            animation: "qr-spin 0.8s linear infinite",
            flexShrink: 0,
          }} />
          Loading image
        </span>
      )}
      {st === "error" && (
        <span style={{
          display: "flex", flexDirection: "column", gap: 4,
          color: "#f87171", fontSize: 13, padding: "8px 0"
        }}>
          <span> Image could not load</span>
          <a href={url} target="_blank" rel="noreferrer"
            style={{ color: "#818cf8", fontSize: 11 }}>
            Open in new tab 
          </a>
        </span>
      )}
      <img
        src={url}
        alt={alt}
        onLoad={() => setSt("loaded")}
        onError={() => setSt("error")}
        style={{
          display: st === "loaded" ? "block" : "none",
          maxWidth: "100%",
          maxHeight: 380,
          width: "auto",
          height: "auto",
          objectFit: "contain",
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.1)",
          background: "#1e293b",
          padding: 6,
          // Invert image colors when in dark mode (so black diagrams on white bg become visible)
          filter: (typeof getTheme === "function" ? getTheme() : true) ? "invert(1) hue-rotate(180deg)" : "none",
          transition: "filter 0.3s",
        }}
      />
    </span>
  );
}

// 
// RichBlock  renders a string that may contain:
//   $...$       inline LaTeX
//   $$...$$     block LaTeX
//   [img]url[/img]  inline image at that position
//   plain text
//
// All elements flow naturally in document order.
// 
function RichBlock({ text, color = "#e2e8f0", fontSize = "1.05rem" }) {
  const ref = useRef(null);
  const [imgTokens, setImgTokens] = useState([]); // {id, url} for React-rendered images

  useEffect(() => {
    if (!text || !ref.current) return;
    let cancelled = false;

    loadKatex().then((katex) => {
      if (cancelled || !ref.current) return;

      const el = ref.current;
      el.innerHTML = "";
      const collectedImgs = [];

      // Split on $$...$$, $...$, and [img]...[/img] in one pass
      const PATTERN = /(\$\$[\s\S]*?\$\$|\$[^$\n]+?\$|\[img\][\s\S]*?\[\/img\])/gi;
      const parts = text.split(PATTERN);

      parts.forEach((part, idx) => {
        if (!part) return;

        //  Block math $$...$$
        if (part.startsWith("$$") && part.endsWith("$$") && part.length > 4) {
          const math = part.slice(2, -2).trim();
          const wrap = document.createElement("div");
          wrap.style.cssText =
            "display:block;text-align:center;margin:12px 0;overflow-x:auto;padding:4px 0;";
          try {
            katex && katex.render(math, wrap, { displayMode: true, throwOnError: false });
          } catch {
            wrap.textContent = part;
            wrap.style.color = "#f87171";
          }
          el.appendChild(wrap);
          return;
        }

        //  Inline math $...$
        if (part.startsWith("$") && part.endsWith("$") && part.length > 2) {
          const math = part.slice(1, -1).trim();
          const span = document.createElement("span");
          try {
            katex && katex.render(math, span, { displayMode: false, throwOnError: false });
          } catch {
            span.textContent = part;
            span.style.color = "#f87171";
          }
          el.appendChild(span);
          return;
        }

        //  Inline image [img]url[/img]
        const imgMatch = part.match(/^\[img\]([\s\S]*?)\[\/img\]$/i);
        if (imgMatch) {
          const url = imgMatch[1].trim();
          const tokenId = `qr-img-${idx}-${Math.random().toString(36).slice(2)}`;
          // Placeholder span  React will render the image into a sibling div
          const placeholder = document.createElement("span");
          placeholder.id = tokenId;
          placeholder.setAttribute("data-img-url", url);
          placeholder.style.display = "block";
          el.appendChild(placeholder);
          collectedImgs.push({ id: tokenId, url });
          return;
        }

        //  Plain text (preserve newlines)
        part.split("\n").forEach((line, i, arr) => {
          if (line) el.appendChild(document.createTextNode(line));
          if (i < arr.length - 1) el.appendChild(document.createElement("br"));
        });
      });

      if (!cancelled) setImgTokens(collectedImgs);
    });

    return () => { cancelled = true; };
  }, [text]);

  // After DOM update, mount InlineImage components next to their placeholders
  // We use a portal-like pattern: attach React roots to placeholder parents
  useEffect(() => {
    if (!imgTokens.length || !ref.current) return;
    // Images are rendered as React children in the return below via imgTokens state
    // Placeholder spans just serve as anchors  actual images rendered below in JSX
  }, [imgTokens]);

  return (
    <span style={{ display: "block" }}>
      <span
        ref={ref}
        style={{
          display: "block",
          color,
          fontSize,
          lineHeight: 1.9,
          fontFamily: "Georgia, 'Times New Roman', serif",
          wordBreak: "break-word",
        }}
      >
        {text /* fallback before KaTeX loads */}
      </span>
      {/* Render images as React siblings so they get proper React lifecycle */}
      {imgTokens.map(({ id, url }) => (
        <InlineImage key={id} url={url} alt="question diagram" />
      ))}
    </span>
  );
}

// 
// QuestionBody  merges question_text + equation + diagram_url
// into one natural reading flow:
//
//   [question_text  may contain $...$ and [img]url[/img]]
//   [equation  appended inline or as block]
//   [diagram_url image  appears right after text/equation]
// 
function QuestionBody({ questionText, equation, diagramUrl, diagramData, fontSize = "1.05rem" }) {
  const hasText    = questionText && questionText.trim();
  const hasEq      = equation && equation.trim();
  // Prefer Base64 data stored in DB; fall back to external URL
  const imgSrc     = (diagramData && diagramData.trim()) || (diagramUrl && diagramUrl.trim()) || "";
  const hasDiagram = !!imgSrc;
  const diagramUrlFinal = imgSrc;

  // Build a single merged string so everything renders in one RichBlock pass:
  // text + equation are concatenated; diagram_url is appended as [img] tag
  let merged = "";

  if (hasText) merged += questionText.trim();

  if (hasEq) {
    const isBlockEq = equation.trim().startsWith("$$");
    // Block equation: newline before so it centres on its own line
    // Inline equation: space then equation
    merged += isBlockEq ? "\n" + equation.trim() : " " + equation.trim();
  }

  if (hasDiagram) {
    // Append image tag  it will flow right after the text/equation
    merged += "\n[img]" + diagramUrlFinal + "[/img]";
  }

  if (!merged.trim()) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      <RichBlock text={merged} fontSize={fontSize} />
    </div>
  );
}

// 
// QuestionRenderer  main export
//
// Props:
//   q            question object from Supabase or local bank
//   showSolution  show answer explanation (result/review screen)
//   userAnswer    index the user picked (for result colouring)
//   onSelect      callback(i) when an option is clicked (exam screen)
//   selectedIdx   currently highlighted option (exam screen)
// 
export default function QuestionRenderer({
  q,
  showSolution = false,
  userAnswer   = null,
  onSelect     = null,
  selectedIdx  = null,
}) {
  if (!q) return null;

  const optionTexts = Array.isArray(q.options) && q.options.length === 4
    ? q.options
    : [q.option_a || "", q.option_b || "", q.option_c || "", q.option_d || ""];
  // Option images  stored as option_a_image ... option_d_image or option_images array
  const optionImages = Array.isArray(q.option_images) && q.option_images.length === 4
    ? q.option_images
    : [q.option_a_image || "", q.option_b_image || "", q.option_c_image || "", q.option_d_image || ""];

  const hasSolText = (q.solution_text || q.solution || "").trim();
  const hasSolEq   = (q.solution_eq || "").trim();

  return (
    <div style={{ fontFamily: "Georgia, serif" }}>

      {/*  Question: text + equation + image, all inline  */}
      <QuestionBody
        questionText={q.question_text || q.text || ""}
        equation={q.equation || ""}
        diagramUrl={q.diagram_url || ""}
        diagramData={q.diagram_data || ""}
        fontSize="1.05rem"
      />

      {/*  Options  */}
      {optionTexts.some(Boolean) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 6 }}>
          {optionTexts.map((opt, i) => {
            const isSelected  = selectedIdx === i;
            const isCorrect   = i === q.correct;
            const isUserWrong = showSolution && userAnswer === i && !isCorrect;

            let border     = "1.5px solid rgba(255,255,255,0.08)";
            let bg         = "rgba(255,255,255,0.02)";
            let circleBg   = "rgba(255,255,255,0.06)";
            let circleText = "#94a3b8";
            let textColor  = "#e2e8f0";

            if (showSolution) {
              if (isCorrect) {
                border = "1.5px solid rgba(34,197,94,0.45)";
                bg = "rgba(34,197,94,0.1)";
                circleBg = "#22c55e"; circleText = "#fff"; textColor = "#86efac";
              } else if (isUserWrong) {
                border = "1.5px solid rgba(239,68,68,0.4)";
                bg = "rgba(239,68,68,0.1)";
                circleBg = "#ef4444"; circleText = "#fff"; textColor = "#fca5a5";
              }
            } else if (isSelected) {
              border = "1.5px solid #6366f1";
              bg = "rgba(99,102,241,0.15)";
              circleBg = "#6366f1"; circleText = "#fff";
            }

            return (
              <div
                key={i}
                onClick={() => onSelect && onSelect(i)}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 14,
                  padding: "12px 16px", borderRadius: 11,
                  border, background: bg,
                  cursor: onSelect ? "pointer" : "default",
                  transition: "all 0.15s", userSelect: "none",
                }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  flexShrink: 0, marginTop: 3,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: circleBg, color: circleText,
                  fontWeight: 700, fontSize: 13, transition: "all 0.15s",
                }}>
                  {["A","B","C","D"][i]}
                </div>
                <div style={{ flex: 1, paddingTop: 2 }}>
                  {/* Option text  supports LaTeX */}
                  {opt && <RichBlock text={opt} color={textColor} fontSize="0.95rem" />}
                  {/* Option image */}
                  {optionImages[i] && (
                    <img
                      src={optionImages[i]}
                      alt={"Option " + ["A","B","C","D"][i]}
                      style={{
                        display: "block",
                        maxWidth: "100%",
                        maxHeight: 120,
                        objectFit: "contain",
                        borderRadius: 6,
                        marginTop: opt ? 8 : 2,
                        border: "1px solid rgba(255,255,255,0.08)",
                        background: "#1e293b",
                        padding: 4,
                      }}
                    />
                  )}
                </div>
                {showSolution && isCorrect && (
                  <span style={{ color: "#4ade80", fontSize: 12, flexShrink: 0, marginTop: 6, fontWeight: 600 }}>
                     Correct
                  </span>
                )}
                {isUserWrong && (
                  <span style={{ color: "#f87171", fontSize: 12, flexShrink: 0, marginTop: 6 }}>
                    Your answer
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* -- Solution block -- */}
      {showSolution && (hasSolText || hasSolEq || q.solution_diagram_data || q.solution_diagram_url) && (
        <div style={{
          marginTop: 18,
          background: "rgba(99,102,241,0.08)",
          border: "1px solid rgba(99,102,241,0.2)",
          borderRadius: 10, padding: "14px 18px",
        }}>
          <div style={{ color: "#818cf8", fontWeight: 700, fontSize: 13, marginBottom: 10 }}>
            Solution
          </div>
          <QuestionBody
            questionText={q.solution_text || q.solution || ""}
            equation={q.solution_eq || ""}
            diagramUrl={q.solution_diagram_url || ""}
            diagramData={q.solution_diagram_data || ""}
            fontSize="0.95rem"
          />
        </div>
      )}

      {/* Spin animation */}
      <style>{`@keyframes qr-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
