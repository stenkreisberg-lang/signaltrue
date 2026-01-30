(function () {
  const el = (sel) => document.querySelector(sel);
  const app = el("#app");
  el("#year").textContent = String(new Date().getFullYear());

  // Basic UTM capture
  function getUtm() {
    const p = new URLSearchParams(location.search);
    const keys = ["utm_source","utm_medium","utm_campaign","utm_content","utm_term"];
    const utm = {};
    keys.forEach(k => { if (p.get(k)) utm[k] = p.get(k); });
    utm.referrer = document.referrer || null;
    return utm;
  }

  // State
  const state = {
    step: 0,
    utm: getUtm(),
    answers: {
      company_size: null,
      work_mode: null,
      meeting_time: null,
      back_to_back: null,
      response_expectations: null,
      interruptions: null,
      manager_urgency: null,
      recovery_gaps: null
    },
    result: null,
    sessionId: null,
    unlocked: false
  };

  // Steps definition
  const steps = [
    {
      key: "company_size",
      title: "Company size",
      subtitle: "Pick the closest bracket. This helps normalize patterns by scale.",
      type: "choices",
      options: [
        { v: "1-25", t: "1–25", d: "Early-stage or small team" },
        { v: "26-80", t: "26–80", d: "Scaling coordination begins to show" },
        { v: "81-250", t: "81–250", d: "Multiple teams, more meeting pressure" },
        { v: "251-1000", t: "251–1,000", d: "Coordination drag becomes systemic" },
        { v: "1000+", t: "1,000+", d: "Complex org patterns, high baseline variance" }
      ],
      required: true
    },
    {
      key: "work_mode",
      title: "Work setup",
      subtitle: "SignalTrue works best where coordination is harder to see.",
      type: "choices",
      options: [
        { v: "on-site", t: "Mostly on-site", d: "Visibility is higher, drift still happens" },
        { v: "hybrid", t: "Hybrid", d: "Most common drift zone" },
        { v: "remote", t: "Mostly remote", d: "Coordination signals are easier to miss" }
      ],
      required: true
    },
    {
      key: "meeting_time",
      title: "Meeting load",
      subtitle: "Roughly how much of a typical week is spent in meetings for core teams?",
      type: "choices",
      options: [
        { v: "lt20", t: "< 20%", d: "Meetings support work" },
        { v: "20-40", t: "20–40%", d: "Normal for many orgs" },
        { v: "40-60", t: "40–60%", d: "Focus time starts collapsing" },
        { v: "gt60", t: "> 60%", d: "Work becomes coordination" }
      ],
      required: true
    },
    {
      key: "back_to_back",
      title: "Back-to-back meetings",
      subtitle: "How often do people have meetings with no breaks between them?",
      type: "choices",
      options: [
        { v: "rare", t: "Rarely", d: "Recovery gaps exist by default" },
        { v: "sometimes", t: "Sometimes", d: "Some days are compressed" },
        { v: "often", t: "Often", d: "Cognitive load accumulates" },
        { v: "daily", t: "Daily", d: "Overload becomes invisible and normalized" }
      ],
      required: true
    },
    {
      key: "response_expectations",
      title: "Response pressure",
      subtitle: "How fast is it culturally expected to respond during working hours?",
      type: "choices",
      options: [
        { v: "flex", t: "Flexible", d: "Responses can wait without penalty" },
        { v: "same_day", t: "Same day", d: "Normal expectation" },
        { v: "hours", t: "Within hours", d: "Interrupt-driven work rhythm" },
        { v: "minutes", t: "Within minutes", d: "High urgency culture" }
      ],
      required: true
    },
    {
      key: "interruptions",
      title: "Focus fragmentation",
      subtitle: "How often does planned work get interrupted by new requests or context switches?",
      type: "choices",
      options: [
        { v: "low", t: "Low", d: "Deep work is protected" },
        { v: "moderate", t: "Moderate", d: "Some switching" },
        { v: "high", t: "High", d: "Work becomes reactive" },
        { v: "constant", t: "Constant", d: "Execution slows even if people work more" }
      ],
      required: true
    },
    {
      key: "manager_urgency",
      title: "Manager urgency behavior",
      subtitle: "How often do priorities shift mid-week due to last-minute escalations?",
      type: "choices",
      options: [
        { v: "rare", t: "Rare", d: "Plans stay stable" },
        { v: "monthly", t: "Monthly", d: "Occasional escalations" },
        { v: "weekly", t: "Weekly", d: "Teams adapt constantly" },
        { v: "daily", t: "Daily", d: "Urgency becomes the operating system" }
      ],
      required: true
    },
    {
      key: "recovery_gaps",
      title: "Recovery gaps",
      subtitle: "How often do people get real buffers between heavy work blocks (meetings, deadlines, intense collaboration)?",
      type: "choices",
      options: [
        { v: "often", t: "Often", d: "Built-in recovery exists" },
        { v: "sometimes", t: "Sometimes", d: "Depends on the week" },
        { v: "rare", t: "Rare", d: "Load accumulates" },
        { v: "never", t: "Never", d: "Burnout risk becomes structural" }
      ],
      required: true
    }
  ];

  function score(answers) {
    // Map each answer to a 0..12.5 contribution (8 questions => 100 total).
    const map = {
      company_size: { "1-25": 4, "26-80": 6, "81-250": 7, "251-1000": 8, "1000+": 9 },
      work_mode: { "on-site": 5, "hybrid": 7, "remote": 8 },
      meeting_time: { "lt20": 3, "20-40": 6, "40-60": 9, "gt60": 12 },
      back_to_back: { "rare": 3, "sometimes": 6, "often": 9, "daily": 12 },
      response_expectations: { "flex": 3, "same_day": 6, "hours": 9, "minutes": 12 },
      interruptions: { "low": 3, "moderate": 6, "high": 9, "constant": 12 },
      manager_urgency: { "rare": 3, "monthly": 6, "weekly": 9, "daily": 12 },
      recovery_gaps: { "often": 3, "sometimes": 6, "rare": 9, "never": 12 }
    };

    const keys = Object.keys(state.answers);
    let totalRaw = 0;
    keys.forEach(k => { totalRaw += (map[k]?.[answers[k]] ?? 0); });

    // totalRaw max ~ 93. Normalize to 0..100
    const totalScore = Math.max(0, Math.min(100, Math.round((totalRaw / 96) * 100)));

    let category = "Stable";
    if (totalScore >= 75) category = "Critical Drift";
    else if (totalScore >= 50) category = "Active Drift";
    else if (totalScore >= 25) category = "Early Drift";

    // Subscores
    const subScores = {
      meeting_pressure: Math.round(((map.meeting_time[answers.meeting_time] + map.back_to_back[answers.back_to_back]) / 24) * 100),
      response_pressure: Math.round((map.response_expectations[answers.response_expectations] / 12) * 100),
      focus_fragmentation: Math.round((map.interruptions[answers.interruptions] / 12) * 100),
      recovery_deficit: Math.round((map.recovery_gaps[answers.recovery_gaps] / 12) * 100),
      urgency_culture: Math.round((map.manager_urgency[answers.manager_urgency] / 12) * 100)
    };

    const findings = [];
    if (subScores.meeting_pressure >= 70) findings.push("Meeting load is compressing recovery and focus time.");
    if (subScores.response_pressure >= 70) findings.push("Fast-response norms create constant interruption pressure.");
    if (subScores.focus_fragmentation >= 70) findings.push("Context switching is likely slowing execution even if effort stays high.");
    if (subScores.recovery_deficit >= 70) findings.push("Lack of buffers makes burnout risk structural, not personal.");
    if (subScores.urgency_culture >= 70) findings.push("Escalation-driven work rhythms create coordination drag.");

    if (findings.length === 0) findings.push("No major drift hotspots detected. Keep watching for baseline shifts during growth or change.");

    return { totalScore, category, subScores, findings };
  }

  function canNext() {
    const s = steps[state.step];
    if (!s) return true;
    if (!s.required) return true;
    return Boolean(state.answers[s.key]);
  }

  function setChoice(key, value) {
    state.answers[key] = value;
    render();
  }

  function render() {
    // End state: result
    if (state.result && !state.sessionId) {
      // Should not happen, but guard.
    }

    const isDone = state.step >= steps.length;

    if (!isDone) {
      const s = steps[state.step];
      const pct = Math.round((state.step / steps.length) * 100);

      app.innerHTML = `
        <div>
          <div class="h1">Free Behavioral Drift Diagnostic</div>
          <p class="sub">7–10 minutes. No personal data. No surveillance. This flags system-level risk patterns, not individual performance.</p>

          <div class="progressWrap" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
            <div class="progressBar"><div class="progressFill" style="width:${pct}%"></div></div>
            <div class="progressText">${state.step + 1}/${steps.length}</div>
          </div>

          <div class="badge">${s.title}</div>
          <p class="sub" style="margin-top:10px">${s.subtitle}</p>

          ${renderStep(s)}

          <div class="actions">
            <button class="btn btnGhost" id="backBtn" ${state.step === 0 ? "disabled" : ""}>Back</button>
            <button class="btn btnPrimary" id="nextBtn" ${canNext() ? "" : "disabled"}>${state.step === steps.length - 1 ? "Finish" : "Next"}</button>
          </div>

          <div class="notice">
            SignalTrue is built for prevention, not surveillance. This diagnostic collects no names, no content, and no employee-level tracking. Team-level patterns only.
          </div>
          <div class="error" id="err"></div>
        </div>
      `;

      el("#backBtn").addEventListener("click", () => { if (state.step > 0) { state.step--; render(); } });
      el("#nextBtn").addEventListener("click", async () => {
        if (!canNext()) return;
        if (state.step < steps.length - 1) {
          state.step++;
          render();
          track("drift_step_view", { step: state.step + 1 });
          return;
        }
        // finish
        const res = score(state.answers);
        state.result = res;
        track("drift_submit", { ...res, answers: state.answers });

        try {
          const r = await fetch("/api/drift/submit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ answers: state.answers, score: res, utm: state.utm })
          });
          if (!r.ok) throw new Error("Submit failed");
          const data = await r.json();
          state.sessionId = data.sessionId;
          state.step++;
          render();
        } catch (e) {
          el("#err").textContent = "Could not submit right now. Please try again.";
        }
      });

      // Choice click handling
      document.querySelectorAll("[data-choice]").forEach(btn => {
        btn.addEventListener("click", () => {
          setChoice(s.key, btn.getAttribute("data-choice"));
        });
      });

      return;
    }

    // Done state: show preview + email gate
    const r = state.result;
    app.innerHTML = `
      <div>
        <div class="h1">Your Drift Profile</div>
        <p class="sub">This is a directional risk profile based on your answers. It flags system-level coordination strain patterns that often show up before surveys and exit interviews.</p>

        <div class="kpiRow">
          <div class="kpi">
            <div class="kpiNum">${r.totalScore}</div>
            <div class="kpiLabel">Drift score (0–100)</div>
          </div>
          <div class="kpi">
            <div class="kpiNum">${escapeHtml(r.category)}</div>
            <div class="kpiLabel">Category</div>
          </div>
        </div>

        <div class="notice">
          <strong>Preview:</strong>
          <ul style="margin:8px 0 0 18px; color: var(--muted)">
            ${r.findings.slice(0,3).map(f => `<li>${escapeHtml(f)}</li>`).join("")}
          </ul>
        </div>

        <div style="margin-top:16px">
          <div class="label">Unlock the full report (work email)</div>
          <input id="email" type="email" placeholder="name@company.com" autocomplete="email" />
          <div class="field">
            <label style="display:flex; gap:10px; align-items:flex-start; color: var(--muted); font-size:12px; line-height:1.4">
              <input id="consent" type="checkbox" checked />
              <span>I agree to receive the report and follow-up guidance. Unsubscribe anytime.</span>
            </label>
          </div>

          <div class="actions">
            <a class="btn btnGhost" href="/product" style="text-decoration:none; display:inline-flex; align-items:center; justify-content:center;">Learn how SignalTrue works</a>
            <button class="btn btnPrimary" id="unlockBtn">Reveal full report</button>
          </div>

          <div class="error" id="unlockErr"></div>
          <div class="notice">
            We never read message text or content. Metadata only. Team-level patterns. Minimum group sizes in the product.
          </div>
        </div>
      </div>
    `;

    el("#unlockBtn").addEventListener("click", async () => {
      const email = (el("#email").value || "").trim();
      const consent = el("#consent").checked;

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        el("#unlockErr").textContent = "Enter a valid work email.";
        return;
      }
      if (!consent) {
        el("#unlockErr").textContent = "Consent is required to send your report.";
        return;
      }

      try {
        track("drift_unlock_submit", { sessionId: state.sessionId });
        const rr = await fetch("/api/drift/unlock", {
          method: "POST",
          headers: { "Content-Type":"application/json" },
          body: JSON.stringify({ sessionId: state.sessionId, email, consent_marketing: consent })
        });
        if (!rr.ok) throw new Error("Unlock failed");
        const data = await rr.json();
        window.location.href = data.reportUrl; // e.g. /drift-report/<sessionId>
      } catch (e) {
        el("#unlockErr").textContent = "Could not unlock right now. Please try again.";
      }
    });

    track("drift_unlock_view", { sessionId: state.sessionId, score: r.totalScore, category: r.category });
  }

  function renderStep(step) {
    const val = state.answers[step.key];
    if (step.type === "choices") {
      return `
        <div class="radioGrid">
          ${step.options.map(o => `
            <div class="choice ${val === o.v ? "selected" : ""}" role="button" tabindex="0" data-choice="${o.v}">
              <div class="choiceTitle">${escapeHtml(o.t)}</div>
              <div class="choiceDesc">${escapeHtml(o.d)}</div>
            </div>
          `).join("")}
        </div>
      `;
    }
    return "";
  }

  function escapeHtml(s){
    return String(s)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  // Simple analytics hook. Replace with GA4/PostHog/etc.
  function track(name, props) {
    try {
      window.__st_events = window.__st_events || [];
      window.__st_events.push({ name, props, ts: Date.now() });
      // Example: if you use PostHog
      // if (window.posthog) window.posthog.capture(name, props);
    } catch (_) {}
  }

  // initial
  track("drift_start", {});
  render();
})();
