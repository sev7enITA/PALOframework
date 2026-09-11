import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle,
  ClipboardText,
  Clock,
  Database,
  FileText,
  LockKey,
  MagnifyingGlass,
  ShieldCheck,
  SignIn,
  SignOut,
  Sparkle,
  Warning,
  WarningCircle,
} from "@phosphor-icons/react";
import { CopilotClientError, createCopilotClient, MAX_QUESTION_LENGTH } from "./copilotClient.js";

const starterQuestions = [
  "Come definisce PALO la supervisione umana significativa?",
  "Quali controlli supportano la gestione del rischio AI?",
  "How does PALO define agentic governance and authority?",
  "What supports data deletion verification?",
];

const stageLabels = { search: "Search", retrieve: "Retrieve", synthesize: "Synthesize", validate: "Validate" };
const stageDescriptions = {
  search: "Find candidate records in the immutable release.",
  retrieve: "Load the canonical records behind the answer.",
  synthesize: "Compose only from retrieved evidence.",
  validate: "Check citations, sufficiency and boundaries.",
};

function Fact({ label, value, state = "neutral", detail }) {
  return <div className={`ask-fact ask-fact-${state}`}><span>{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</div>;
}

function PlainAnswer({ text }) {
  return <div className="ask-answer-copy">{text.split(/\n{2,}/).map((paragraph, index) => <p key={`${paragraph.slice(0, 20)}-${index}`}>{paragraph}</p>)}</div>;
}

function ErrorPanel({ error, onRetry, onLogin }) {
  if (!error) return null;
  return (
    <section className="ask-error" role="alert">
      <WarningCircle weight="fill" />
      <div><strong>{error.message}</strong><p>{error.recovery}</p></div>
      {error.code === "AUTH_REQUIRED" ? <button className="button button-secondary" onClick={onLogin}><SignIn />Sign in</button> : <button className="button button-secondary" onClick={onRetry}>Try manually</button>}
    </section>
  );
}

function EvidenceSpine({ response, loading }) {
  const trace = new Map(response?.evidence.toolTrace.map((item) => [item.stage, item]) ?? []);
  return (
    <aside className="ask-evidence-rail" aria-label="Evidence spine">
      <div className="ask-rail-heading"><span>Evidence spine</span><strong>{loading ? "Working" : response ? "Request trace" : "How evidence is built"}</strong></div>
      <ol className="ask-spine">
        {Object.entries(stageLabels).map(([stage, label], index) => {
          const item = trace.get(stage);
          const status = loading ? (index === 0 ? "working" : "pending") : item?.status ?? "idle";
          return <li key={stage} className={`ask-stage ask-stage-${status}`}><span className="ask-stage-node">{item?.status === "passed" ? <Check /> : index + 1}</span><div><strong>{label}</strong><p>{item?.summary ?? stageDescriptions[stage]}</p>{item && <small>{item.durationMs} ms | {item.status}</small>}</div></li>;
        })}
      </ol>
      <div className="ask-rail-boundary"><LockKey /><p><strong>Read-only boundary</strong>The browser calls the authenticated PALO BFF. It never connects to MCP or a model provider directly.</p></div>
      {response && <div className="ask-retrieval"><span>Retrieval method</span><strong>{response.evidence.retrievalMethod}</strong><small>{response.evidence.retrievedRecordCount} records retrieved from {response.evidence.matchCount} matches</small></div>}
    </aside>
  );
}

function CitationList({ citations }) {
  return (
    <section className="ask-sources" aria-labelledby="ask-sources-title">
      <div className="ask-section-heading"><div><span>Canonical sources</span><h2 id="ask-sources-title">Inspect the evidence</h2></div><strong>{citations.length} cited record{citations.length === 1 ? "" : "s"}</strong></div>
      {citations.length ? <ol>{citations.map((citation, index) => <li id={`citation-${index + 1}`} key={`${citation.recordId}-${index}`}>
        <div className="ask-source-index">{index + 1}</div>
        <div><h3>{citation.title}</h3><code>{citation.recordId}</code><p>{citation.excerpt}</p><dl><div><dt>Source path</dt><dd>{citation.sourcePath}</dd></div><div><dt>Authority boundary</dt><dd>{citation.authorityBoundary}</dd></div></dl></div>
      </li>)}</ol> : <p className="ask-no-sources">No canonical source met the evidence threshold. Treat the answer as insufficient.</p>}
    </section>
  );
}

function AnswerResult({ response, copyState, onCopy }) {
  const consequence = response.sufficiency === "adequate"
    ? "The available records support this answer, within the stated authority boundaries."
    : response.sufficiency === "partial"
      ? "Some relevant evidence was found. Verify the unresolved points before relying on this answer."
      : "The knowledge release does not contain enough evidence for a reliable answer. Do not infer approval or authority.";
  const boundaries = response.boundaries.length ? response.boundaries : ["Not legal advice", "No certification, approval or enforcement", "No action was executed"];
  const copyText = `${response.answer}\n\n${response.citations.map((item, index) => `[${index + 1}] ${item.title} - ${item.recordId} - ${item.sourcePath}`).join("\n")}`;
  return (
    <>
      <article className={`ask-result ask-result-${response.sufficiency}`} aria-labelledby="ask-answer-title">
        <header><div><span>Evidence-bounded answer</span><h2 id="ask-answer-title">Answer</h2></div><span className={`ask-sufficiency ask-sufficiency-${response.sufficiency}`}>{response.sufficiency}</span></header>
        <PlainAnswer text={response.answer} />
        {!!response.citations.length && <nav className="ask-citation-links" aria-label="Answer citations">{response.citations.map((citation, index) => <a href={`#citation-${index + 1}`} key={citation.recordId}>[{index + 1}] {citation.title}</a>)}</nav>}
        <div className="ask-consequence"><ShieldCheck /><p><strong>What this sufficiency means</strong>{consequence}</p></div>
        <button className="button button-secondary ask-copy" onClick={() => onCopy(copyText)}><ClipboardText />{copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed - try again" : "Copy answer and citations"}</button>
      </article>
      <CitationList citations={response.citations} />
      <section className="ask-boundaries" aria-labelledby="ask-boundaries-title"><Warning /><div><span>Authority boundary</span><h2 id="ask-boundaries-title">What PALO does not decide</h2><ul>{boundaries.map((item) => <li key={item}>{item}</li>)}</ul></div></section>
      <details className="ask-receipt"><summary><FileText />Request receipt and raw evidence</summary><div><div className="ask-receipt-meta"><span>Request ID<strong>{response.requestId}</strong></span><span>Duration<strong>{response.durationMs} ms</strong></span><span>Language<strong>{response.language.toUpperCase()}</strong></span><span>Qualification<strong>{response.qualificationReceipt ? "PASS-LIVE" : "Not established by this request"}</strong></span></div>{response.qualificationReceipt && <p className="ask-pass-live"><CheckCircle weight="fill" />Server-side PASS-LIVE receipt: {response.qualificationReceipt.receiptId}</p>}<pre>{JSON.stringify(response, null, 2)}</pre></div></details>
    </>
  );
}

export function AskPaloView() {
  const client = useMemo(() => createCopilotClient({ configuredUrl: import.meta.env?.VITE_PALO_COPILOT_BFF_URL }), []);
  const [session, setSession] = useState({ state: "loading", data: null, error: null });
  const [question, setQuestion] = useState("");
  const [language, setLanguage] = useState("auto");
  const [audience, setAudience] = useState("");
  const [request, setRequest] = useState({ state: "idle", response: null, error: null });
  const [copyState, setCopyState] = useState("idle");
  const textareaRef = useRef(null);

  const refreshSession = async () => {
    setSession((current) => ({ ...current, state: "loading", error: null }));
    try { setSession({ state: "ready", data: await client.session(), error: null }); }
    catch (error) { setSession({ state: "unavailable", data: null, error: error instanceof CopilotClientError ? error : new CopilotClientError("NETWORK") }); }
  };
  useEffect(() => { refreshSession(); }, []);

  const invalidateSession = (error = null) => {
    setSession((current) => ({
      state: "ready",
      data: current.data ? { ...current.data, authenticated: false, displayName: "" } : { authenticated: false, displayName: "", reader: {}, release: {} },
      error,
    }));
  };

  const authenticated = session.data?.authenticated === true;
  const serviceAvailable = session.state === "ready";
  const trimmed = question.trim();
  const oversized = question.length > MAX_QUESTION_LENGTH;
  const inFlight = request.state === "loading";
  const canSubmit = authenticated && serviceAvailable && !!trimmed && !oversized && !inFlight;
  const disabledReason = inFlight ? "Retrieving evidence..." : !serviceAvailable ? "Ask PALO is unavailable" : !authenticated ? "Sign in to ask a question" : !trimmed ? "Enter a question" : oversized ? `Reduce the question by ${question.length - MAX_QUESTION_LENGTH} characters` : "";

  const returnPath = () => `${window.location.pathname}?role=${document.documentElement.dataset.hubRole || "technical"}&view=ask`;
  const login = () => { if (serviceAvailable) window.location.assign(client.loginUrl(returnPath())); };
  const logout = async () => {
    try { await client.logout(); setQuestion(""); setRequest({ state: "idle", response: null, error: null }); await refreshSession(); }
    catch (error) {
      const safeError = error instanceof CopilotClientError ? error : new CopilotClientError("NETWORK");
      if (safeError.code === "AUTH_REQUIRED") invalidateSession(safeError);
      else setSession((current) => ({ ...current, error: safeError }));
    }
  };
  const submit = async () => {
    if (!canSubmit) return;
    setCopyState("idle");
    setRequest({ state: "loading", response: null, error: null });
    try { setRequest({ state: "success", response: await client.ask({ question: trimmed, language, audience }), error: null }); }
    catch (error) {
      const safeError = error instanceof CopilotClientError ? error : new CopilotClientError("NETWORK");
      if (safeError.code === "AUTH_REQUIRED") invalidateSession();
      setRequest({ state: "error", response: null, error: safeError });
    }
  };
  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); setCopyState("copied"); }
    catch { setCopyState("failed"); }
  };
  const chooseStarter = (value) => { setQuestion(value); textareaRef.current?.focus(); };
  const reader = session.data?.reader;
  const release = session.data?.release;

  return (
    <div className="ask-page">
      <header className="ask-page-header"><p className="eyebrow">PALO KNOWLEDGE COPILOT | READ-ONLY</p><div className="ask-title-row"><div><h1>Ask PALO, then inspect the evidence</h1><p>Get a concise answer from the immutable PALO knowledge release. Every factual claim must remain traceable to a canonical record.</p></div><div className="ask-session-actions">{authenticated ? <><span><CheckCircle weight="fill" />{session.data.displayName}</span><button className="button button-secondary" onClick={logout}><SignOut />Sign out</button></> : <button className="button button-primary" onClick={login} disabled={!serviceAvailable} title={!serviceAvailable ? "Sign-in requires an available PALO BFF" : undefined}><SignIn />{session.state === "loading" ? "Checking sign-in..." : serviceAvailable ? "Sign in with Microsoft" : "Sign-in unavailable"}</button>}</div></div></header>

      <section className="ask-trust-strip" aria-label="Independent service status facts">
        <Fact label="Session" value={session.state === "loading" ? "Checking..." : authenticated ? "Authenticated" : serviceAvailable ? "Sign-in required" : "Unavailable"} state={authenticated ? "positive" : session.state === "loading" ? "neutral" : "attention"} detail={authenticated ? session.data.displayName : "BFF-managed identity only"} />
        <Fact label="Reader integrity" value={reader?.integrity === "checked" ? `Checked | v${reader.serviceVersion || "unknown"}` : reader?.integrity === "failed" ? "Failed" : "Not checked"} state={reader?.integrity === "checked" ? "positive" : reader?.integrity === "failed" ? "negative" : "neutral"} detail="Independent of session state" />
        <Fact label="Tool catalog" value={reader ? `${reader.toolCount} of 6 tools` : "Not checked"} state={reader?.catalogState === "checked" && reader.toolCount === 6 ? "positive" : reader?.catalogState === "failed" ? "negative" : "neutral"} detail={reader?.catalogState ? `Catalog ${reader.catalogState}` : "Server-reported catalog"} />
        <Fact label="Knowledge release" value={release?.label || "Not checked"} state={release?.qualification?.toLowerCase().includes("pass") ? "positive" : "neutral"} detail={release?.qualification || "Qualification not reported"} />
      </section>

      {session.error && <ErrorPanel error={session.error} onRetry={refreshSession} onLogin={login} />}
      <div className="ask-layout">
        <div className="ask-primary">
          <section className="ask-composer" aria-labelledby="ask-composer-title">
            <div className="ask-composer-heading"><div><span>Grounded guidance</span><h2 id="ask-composer-title">Ask the immutable release</h2></div><Sparkle weight="duotone" /></div>
            <label htmlFor="palo-question">Question</label>
            <textarea ref={textareaRef} id="palo-question" value={question} maxLength={MAX_QUESTION_LENGTH + 500} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") { event.preventDefault(); submit(); } }} placeholder="Ask about PALO controls, evidence, boundaries or host qualification..." aria-describedby="question-guidance question-count" />
            <div className="ask-question-meta"><div id="question-guidance" className="ask-privacy-note"><p><LockKey />Do not paste credentials, tokens, personal identifiers or confidential data.</p><p><ShieldCheck />Minimize company-sensitive details. The external model provider configured for this deployment may process your question.</p></div><output id="question-count" className={oversized ? "negative-text" : ""}>{question.length.toLocaleString()} / {MAX_QUESTION_LENGTH.toLocaleString()}</output></div>
            <div className="ask-composer-actions">
              <label>Language<select value={language} onChange={(event) => setLanguage(event.target.value)}><option value="auto">Auto</option><option value="it">Italiano</option><option value="en">English</option></select></label>
              <label>Audience <span>(optional)</span><select value={audience} onChange={(event) => setAudience(event.target.value)}><option value="">General</option><option value="executive">Executive</option><option value="technical">Technical</option><option value="legal-risk">Legal / Risk</option></select></label>
              <div className="ask-submit-wrap"><button className="button button-primary" onClick={submit} disabled={!canSubmit} aria-describedby={!canSubmit ? "ask-disabled-reason" : undefined}>{inFlight ? <Clock /> : <ArrowRight />}{inFlight ? "Retrieving..." : "Ask PALO"}</button><small id="ask-disabled-reason">{disabledReason || "Cmd/Ctrl + Enter"}</small></div>
            </div>
          </section>

          {request.error && <ErrorPanel error={request.error} onRetry={submit} onLogin={login} />}
          {request.state === "idle" && <section className="ask-empty"><div><MagnifyingGlass weight="duotone" /><h2>Start with a governance question</h2><p>Ask for an explanation, a boundary or the evidence required by PALO. The service will not execute actions or invent authority.</p></div><div className="ask-starters"><span>Try a question</span>{starterQuestions.map((starter) => <button key={starter} onClick={() => chooseStarter(starter)}>{starter}<ArrowRight /></button>)}</div></section>}
          {request.state === "loading" && <section className="ask-loading" aria-live="polite" aria-busy="true"><span className="ask-loading-mark"><Database weight="duotone" /></span><div><h2>Retrieving canonical evidence</h2><p>Ask PALO is searching the immutable release. No answer is shown until the BFF returns a validated response.</p></div></section>}
          {request.response && <AnswerResult response={request.response} copyState={copyState} onCopy={copy} />}
        </div>
        <EvidenceSpine response={request.response} loading={inFlight} />
      </div>
      <p className="sr-only" aria-live="polite">{request.state === "success" ? `Answer ready with ${request.response.citations.length} citations and ${request.response.sufficiency} sufficiency.` : ""}</p>
      <p className="sr-only" aria-live="polite">{copyState === "copied" ? "Answer and citations copied." : copyState === "failed" ? "Copy failed. Try again." : ""}</p>
    </div>
  );
}
