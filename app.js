const NOTES_URL = "NANOTECHNOLOGY_EXAM_NOTES.md";
const STORAGE_KEY = "study-nano-v1";

const questions = [
  { topic: "introduction-to-nanotechnology-and-mesoscopic-structures", prompt: "A quantum wire is confined in how many dimensions?", options: ["Zero; it behaves as a 3D bulk material", "One; carriers move freely in two dimensions", "Two; carriers move freely along one dimension", "Three; all motion is quantized"], answer: 2, explanation: "A wire confines two directions and leaves one direction of free motion." },
  { topic: "quantum-mechanics-essentials", prompt: "For a particle in a 1D infinite well, how does the ground-state energy change when the well length is halved?", options: ["It halves", "It doubles", "It becomes four times larger", "It stays unchanged"], answer: 2, explanation: "The energy varies as 1/L², so replacing L by L/2 multiplies it by four." },
  { topic: "quantum-mechanics-essentials", prompt: "What does the density of states tell you?", options: ["How many states are available per energy interval", "The probability that every state is occupied", "The carrier velocity at the Fermi level", "The band gap of the material"], answer: 0, explanation: "DOS counts available states. Occupation is found by combining DOS with the Fermi–Dirac function." },
  { topic: "band-theory-of-solids", prompt: "In the 1D Kronig–Penney delta-barrier model, when is an energy allowed?", options: ["Whenever the right-hand side is greater than 1", "When the right-hand side lies between −1 and +1", "Only when the right-hand side is zero", "For every energy because the potential is periodic"], answer: 1, explanation: "The right side must equal cos(ka), whose real values lie in [−1,+1]. Outside that range there is no real Bloch wavevector." },
  { topic: "band-theory-of-solids", prompt: "What is the first Brillouin zone for a 1D lattice with period a?", options: ["0 to 2πa", "−π/a to +π/a", "−a/2 to +a/2", "−2π/a to +2π/a"], answer: 1, explanation: "The first zone is the Wigner–Seitz cell around k = 0 in reciprocal space." },
  { topic: "shrink-down-approaches-and-cmos-scaling", prompt: "Under ideal constant-field scaling by a factor κ, how does voltage scale?", options: ["It stays constant", "It scales by 1/κ", "It scales by κ", "It scales by 1/κ²"], answer: 1, explanation: "Linear dimensions and voltage both scale by 1/κ, keeping the electric field constant." },
  { topic: "the-nanoscale-mosfet", prompt: "Why does a FinFET generally control a short channel better than a planar MOSFET?", options: ["Its gate controls the channel from multiple sides", "It removes the source and drain", "It eliminates all leakage current", "It uses a thicker gate dielectric"], answer: 0, explanation: "The gate wraps around multiple fin surfaces, improving electrostatic control. It does not eliminate leakage or scaling limits." },
  { topic: "resonant-tunneling-diode-rtd", prompt: "What produces the negative differential resistance region in an RTD?", options: ["A temperature-driven phase change", "Loss of alignment between emitter states and a quantum-well resonance", "The gate voltage crossing threshold", "Coulomb repulsion in a metallic island"], answer: 1, explanation: "As bias shifts the energy levels out of resonance, tunneling current falls even as voltage rises." },
  { topic: "coulomb-dots-charging-energy-and-quantum-blockade", prompt: "Coulomb blockade is most observable when the charging energy is:", options: ["Much smaller than thermal energy", "Comparable to zero", "Large compared with thermal energy and measurement broadening", "Independent of capacitance"], answer: 2, explanation: "The charging energy must be large enough relative to kBT and broadening to resolve discrete charge transitions." },
  { topic: "single-electron-transistor-set", prompt: "What is the essential island structure in a single-electron transistor?", options: ["One tunnel junction and a direct gate contact", "A small island between two tunnel junctions, with a capacitive gate", "A p–n junction in series with a FinFET", "A quantum well between two ohmic gates"], answer: 1, explanation: "The source and drain connect through two tunnel junctions; a gate capacitively shifts the island's electrochemical potential." },
  { topic: "graphene-and-2d-semiconductor-devices", prompt: "Which statement best distinguishes graphene from many semiconducting 2D materials such as MoS₂?", options: ["Graphene has a strong intrinsic band gap", "Graphene is gapless in its ideal form, while many transition-metal dichalcogenides have a band gap", "Graphene is a 3D bulk semiconductor", "Graphene cannot conduct electricity"], answer: 1, explanation: "Ideal graphene has touching bands at the Dirac points; many 2D transition-metal dichalcogenides are semiconductors with a finite gap." },
  { topic: "atomistic-simulation", prompt: "What does NEGF–Poisson self-consistency combine?", options: ["Quantum transport with electrostatic potential", "Classical elasticity with optical microscopy", "A density-of-states plot with a band diagram only", "Molecular dynamics with a fixed charge model"], answer: 0, explanation: "NEGF models open-boundary quantum transport, while Poisson relates charge density to electrostatic potential; the two are iterated self-consistently." }
];

const courseGroups = [
  { title: "Foundations", description: "The language of nanoscale physics", range: [0, 3] },
  { title: "Devices & scaling", description: "From CMOS limits to single electrons", range: [3, 9] },
  { title: "Materials & exam review", description: "Carbon, 2D materials, models and revision", range: [9, Infinity] }
];

const $ = (selector, parent = document) => parent.querySelector(selector);
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[char]);
const slugify = value => value.toLowerCase().replace(/[–—]/g, "-").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

let topics = [];
let introHtml = "";
let appState = readState();
let currentView = "home";
let currentTopic = null;
let activeQuiz = null;
let toastTimer = 0;

function readState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      completed: saved.completed && typeof saved.completed === "object" ? saved.completed : {},
      saved: Array.isArray(saved.saved) ? saved.saved : [],
      current: typeof saved.current === "string" ? saved.current : "",
      readingSize: Number.isFinite(saved.readingSize) ? Math.min(20, Math.max(15, saved.readingSize)) : 16
    };
  } catch {
    return { completed: {}, saved: [], current: "", readingSize: 16 };
  }
}

function persistState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  updateProgress();
}

function safeLink(href) {
  const value = String(href || "").trim();
  if (/^(https?:|mailto:|#|\/)/i.test(value)) return value;
  if (/^(?:\.\/)?[\w.-]+(?:\/[\w.-]+)*$/.test(value) && !value.split("/").some(part => part === "..")) return value;
  return "#";
}

function inlineMarkdown(text) {
  const math = [];
  let value = text.replace(/\\\(([\s\S]*?)\\\)/g, (_, expression) => `@@MATH${math.push(`\\(${expression}\\)`) - 1}@@`);
  value = escapeHtml(value);
  value = value.replace(/`([^`]+)`/g, "<code>$1</code>");
  value = value.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  value = value.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  value = value.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (_, alt, src, title = "") =>
    `<img src="${escapeHtml(safeLink(src))}" alt="${escapeHtml(alt)}"${title ? ` title="${escapeHtml(title)}"` : ""} loading="lazy">`);
  value = value.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (_, label, href, title = "") => {
    const url = safeLink(href);
    const external = /^https?:/i.test(url) ? ' target="_blank" rel="noreferrer"' : "";
    return `<a href="${escapeHtml(url)}"${title ? ` title="${escapeHtml(title)}"` : ""}${external}>${label}</a>`;
  });
  return value.replace(/@@MATH(\d+)@@/g, (_, index) => math[Number(index)] || "");
}

const isTableLine = line => /^\s*\|.*\|\s*$/.test(line);
const splitTableRow = line => line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(cell => cell.trim());

function renderMarkdown(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let index = 0;
  let listType = "";
  const closeList = () => {
    if (listType) html.push(`</${listType}>`);
    listType = "";
  };
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) { closeList(); index++; continue; }
    if (line.trim() === "\\[" || line.trim() === "$$") {
      closeList();
      const open = line.trim();
      const close = open === "\\[" ? "\\]" : "$$";
      const expression = [];
      index++;
      while (index < lines.length && lines[index].trim() !== close) expression.push(lines[index++]);
      if (index < lines.length) index++;
      html.push(`<div class="math-block">${open}${expression.join("\n")}${close}</div>`);
      continue;
    }
    if (/^\s*```/.test(line)) {
      closeList(); index++;
      const code = [];
      while (index < lines.length && !/^\s*```/.test(lines[index])) code.push(lines[index++]);
      if (index < lines.length) index++;
      html.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
      continue;
    }
    if (isTableLine(line) && index + 1 < lines.length && /^\s*\|?\s*:?-{3,}/.test(lines[index + 1])) {
      closeList();
      const headers = splitTableRow(line);
      index += 2;
      const rows = [];
      while (index < lines.length && isTableLine(lines[index])) rows.push(splitTableRow(lines[index++]));
      const numericColumns = headers.map((_, cellIndex) => rows.length > 0 && rows.every(row =>
        /^[-+]?\d+(?:\.\d+)?(?:\s*(?:%|[a-zA-ZµμΩ]+))?$/.test((row[cellIndex] || "").trim())
      ));
      const head = headers.map((cell, cellIndex) => `<th${numericColumns[cellIndex] ? ' class="numeric-cell"' : ""}>${inlineMarkdown(cell)}</th>`).join("");
      const body = rows.map(row => `<tr>${headers.map((_, cellIndex) => `<td${numericColumns[cellIndex] ? ' class="numeric-cell"' : ""}>${inlineMarkdown(row[cellIndex] || "")}</td>`).join("")}</tr>`).join("");
      html.push(`<div class="table-scroll"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`);
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      closeList();
      const level = Math.min(4, Math.max(2, heading[1].length - 1));
      html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      index++;
      continue;
    }
    if (/^\s*>\s?/.test(line)) {
      closeList();
      const quote = [];
      while (index < lines.length && /^\s*>\s?/.test(lines[index])) quote.push(lines[index++].replace(/^\s*>\s?/, ""));
      html.push(`<blockquote><p>${inlineMarkdown(quote.join(" "))}</p></blockquote>`);
      continue;
    }
    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const type = /^\s*\d+\.\s+/.test(line) ? "ol" : "ul";
      if (listType !== type) { closeList(); listType = type; html.push(`<${type}>`); }
      html.push(`<li>${inlineMarkdown(line.replace(/^\s*(?:[-*]|\d+\.)\s+/, ""))}</li>`);
      index++;
      continue;
    }
    if (/^\s*([-*_])\s*\1\s*\1[\s*_]*$/.test(line)) { closeList(); html.push("<hr>"); index++; continue; }
    closeList();
    const paragraph = [line.trim()];
    index++;
    while (index < lines.length && lines[index].trim() &&
      !/^#{1,6}\s+/.test(lines[index]) && !/^\s*(?:[-*]\s+|\d+\.\s+|>\s?|```)/.test(lines[index]) &&
      !isTableLine(lines[index]) && lines[index].trim() !== "\\[" && lines[index].trim() !== "$$") {
      paragraph.push(lines[index++].trim());
    }
    html.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
  }
  closeList();
  return html.join("\n");
}

function parseNotes(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const headingIndexes = [];
  lines.forEach((line, index) => { if (/^##\s+/.test(line)) headingIndexes.push(index); });
  const firstHeading = headingIndexes[0] ?? lines.length;
  introHtml = renderMarkdown(lines.slice(0, firstHeading).filter(line => !/^#\s+/.test(line)).join("\n"));
  topics = headingIndexes.map((start, topicIndex) => {
    const end = headingIndexes[topicIndex + 1] ?? lines.length;
    const title = lines[start].replace(/^##\s+/, "").trim();
    const content = lines.slice(start + 1, end).join("\n");
    const firstParagraph = content.split(/\n\s*\n/).find(part => part.trim() && !/^#{1,6}\s/.test(part.trim())) || "";
    const plain = firstParagraph.replace(/!\[[^\]]*\]\([^)]+\)/g, "").replace(/[`*_>#]/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\s+/g, " ").trim();
    const headings = [...content.matchAll(/^#{3,4}\s+(.+)$/gm)].map(match => match[1].replace(/\*\*/g, ""));
    return {
      id: slugify(title.replace(/^\d+\.\s*/, "")), title, number: (title.match(/^(\d+)\./) || [])[1] || "",
      content, plain, headings, wordCount: content.split(/\s+/).filter(Boolean).length,
      imageCount: (content.match(/!\[[^\]]*\]\([^)]+\)/g) || []).length
    };
  });
}

const topicLabel = topic => topic.title.replace(/^\d+\.\s*/, "");
const chapterNumber = (topic, index) => topic.number || String(index + 1);

function updateProgress() {
  const total = topics.length || 15;
  const completed = topics.filter(topic => appState.completed[topic.id]).length;
  const percentage = Math.round((completed / total) * 100);
  $("#sidebar-progress").textContent = `${percentage}%`;
  $("#sidebar-progress-detail").textContent = `${completed} of ${total} chapters complete`;
  $("#sidebar-progress-bar").setAttribute("aria-valuenow", String(percentage));
  $(".progress-track span", $("#sidebar-progress-bar")).style.width = `${percentage}%`;
  $("#quiz-count").textContent = String(questions.length);
}

function buildSidebar() {
  $("#topic-nav").innerHTML = topics.map((topic, index) => {
    const active = currentView === "topic" && currentTopic?.id === topic.id;
    const saved = appState.saved.includes(topic.id);
    return `<button class="nav-link${active ? " is-active" : ""}${saved ? " is-saved" : ""}" type="button" data-topic="${topic.id}" title="${escapeHtml(topicLabel(topic))}"><span class="topic-index">${chapterNumber(topic, index)}</span><span>${escapeHtml(topicLabel(topic))}</span></button>`;
  }).join("");
  updateProgress();
}

function setActiveNav() {
  document.querySelectorAll(".sidebar [data-route]").forEach(link => {
    link.classList.toggle("is-active", link.dataset.route === currentView || (link.dataset.route === "home" && currentView === "saved"));
  });
  document.querySelectorAll("#topic-nav [data-topic]").forEach(link => {
    link.classList.toggle("is-active", currentView === "topic" && link.dataset.topic === currentTopic?.id);
    link.classList.toggle("is-saved", appState.saved.includes(link.dataset.topic));
  });
}

function renderHome() {
  currentView = "home"; currentTopic = null; activeQuiz = null; setActiveNav();
  const completed = topics.filter(topic => appState.completed[topic.id]).length;
  const lastTopic = topics.find(topic => topic.id === appState.current) || topics[0];
  const groups = courseGroups.map(group => {
    const items = topics.slice(group.range[0], group.range[1]);
    return `<section class="course-group"><h3>${escapeHtml(group.title)}</h3><p>${escapeHtml(group.description)}</p><div class="chapter-list">${items.map(topic => {
      const index = topics.indexOf(topic);
      return `<button type="button" class="chapter-row${appState.completed[topic.id] ? " is-complete" : ""}" data-topic="${topic.id}"><span class="chapter-number">${chapterNumber(topic, index)}</span><span class="chapter-name">${escapeHtml(topicLabel(topic))}</span><span class="chapter-arrow" aria-hidden="true">${appState.completed[topic.id] ? "Done" : "›"}</span></button>`;
    }).join("")}</div></section>`;
  }).join("");
  $("#view-root").innerHTML = `<div class="page-content">
    <div class="page-title-row"><div><div class="breadcrumb"><span>Study space</span><span class="crumb-separator">/</span><span>Course map</span></div><h1>Nanotechnology &amp; Nanoelectronics</h1><p class="page-subtitle">An exam-focused route from quantum foundations to nanoscale devices and atomistic simulation.</p></div>
    </div>
    <div class="course-introduction">${introHtml}</div>
    <div class="home-intro">
      <section class="continue-panel"><div><h2>${completed ? "Continue studying" : "Begin with " + escapeHtml(topicLabel(lastTopic))}</h2><p>${escapeHtml(lastTopic.plain || "Build the foundations before moving into devices and applications.")}</p></div>
        <button type="button" class="button button-primary" data-topic="${lastTopic.id}">${completed ? "Continue studying" : "Begin the course"}<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h12m-5-5 5 5-5 5"/></svg></button>
      </section>
      <section class="recall-panel"><h2>Recall check</h2><p>${escapeHtml(questions[0].prompt)} Try recalling the answer before opening the review set.</p>
        <button class="text-action" type="button" data-route="recall">Open ${questions.length} recall questions<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h12m-5-5 5 5-5 5"/></svg></button>
      </section>
    </div>
    <div class="course-facts" aria-label="Course contents"><div class="fact"><strong>${topics.length}</strong><span>study chapters</span></div><div class="fact"><strong>${topics.reduce((sum, topic) => sum + topic.imageCount, 0)}</strong><span>original diagrams</span></div><div class="fact"><strong>${completed} / ${topics.length}</strong><span>chapters completed</span></div></div>
    <section aria-labelledby="syllabus-title"><div class="section-heading"><h2 id="syllabus-title">Your syllabus</h2><p>${topics.length} chapters · ${questions.length} retrieval questions</p></div><div class="course-groups">${groups}</div></section>
  </div>`;
  $("#workspace").scrollTo({ top: 0, behavior: "smooth" });
  typeset($("#view-root"));
}

function renderTopic(topicId) {
  const topic = topics.find(item => item.id === topicId);
  if (!topic) return renderHome();
  currentView = "topic"; currentTopic = topic; activeQuiz = null;
  appState.current = topic.id; persistState(); setActiveNav();
  const index = topics.indexOf(topic);
  const isSaved = appState.saved.includes(topic.id);
  const isComplete = Boolean(appState.completed[topic.id]);
  let body = renderMarkdown(topic.content);
  const matchingQuestions = questions.filter(question => question.topic === topic.id).length;
  const topicOutline = topic.headings.slice(0, 3).join(" · ");
  let headingIndex = 0;
  body = body.replace(/<h([23])>/g, (_, level) => `<h${level} id="subtopic-${headingIndex++}">`);
  const sideTopics = topic.headings.length ? `<div class="aside-block"><h2>In this chapter</h2><nav class="subtopic-nav">${topic.headings.map((heading, headingIndex) => `<a href="#subtopic-${headingIndex}">${escapeHtml(heading.replace(/\*\*/g, ""))}</a>`).join("")}</nav></div>` : "";
  $("#view-root").innerHTML = `<article class="page-content">
    <div class="breadcrumb"><button type="button" data-route="home">Course map</button><span class="crumb-separator">/</span><span>${escapeHtml(topicLabel(topic))}</span></div>
    <div class="page-title-row"><div><h1>${escapeHtml(topicLabel(topic))}</h1>${topicOutline ? `<p class="page-subtitle">${escapeHtml(topicOutline)}</p>` : ""}<div class="reader-meta"><span>Chapter ${chapterNumber(topic, index)}</span><span class="meta-dot"></span><span>${topic.wordCount.toLocaleString()} words</span>${matchingQuestions ? `<span class="meta-dot"></span><span>${matchingQuestions} recall ${matchingQuestions === 1 ? "question" : "questions"}</span>` : ""}</div></div>
      <div class="title-actions"><button class="button${isSaved ? " is-saved" : ""}" type="button" id="bookmark-topic" aria-pressed="${isSaved}"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 3.5h10v13l-5-3-5 3z"/></svg>${isSaved ? "Saved" : "Save"}</button><button class="button button-primary" type="button" id="complete-topic" aria-pressed="${isComplete}">${isComplete ? "Completed" : "Mark complete"}</button></div>
    </div>
    <div class="reader-layout"><div><div class="reader-content">${body}</div><nav class="reader-footer" aria-label="Chapter navigation">
      ${index > 0 ? `<button class="button" type="button" data-topic="${topics[index - 1].id}"><span>← ${escapeHtml(topicLabel(topics[index - 1]))}</span></button>` : `<button class="button button-quiet" type="button" data-route="home"><span>← Course map</span></button>`}
      ${index < topics.length - 1 ? `<button class="button" type="button" data-topic="${topics[index + 1].id}"><span>${escapeHtml(topicLabel(topics[index + 1]))} →</span></button>` : `<button class="button button-primary" type="button" data-route="recall"><span>Start recall lab →</span></button>`}
    </nav></div>
    <aside class="reader-aside" aria-label="Chapter tools">${sideTopics}<section class="aside-block exam-note"><h2>Exam lens</h2><p>After reading, close the notes and explain the key idea, its governing equation, and one limitation from memory.</p>${matchingQuestions ? `<button class="text-action" type="button" data-quiz-topic="${topic.id}">Practice this chapter<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h12m-5-5 5 5-5 5"/></svg></button>` : ""}</section></aside></div>
  </article>`;
  $("#workspace").scrollTo({ top: 0, behavior: "smooth" });
  applyReadingSize();
  typeset($("#view-root"));
}

function renderSaved() {
  currentView = "saved"; currentTopic = null; activeQuiz = null; setActiveNav();
  const selected = topics.filter(topic => appState.saved.includes(topic.id));
  $("#view-root").innerHTML = `<div class="page-content"><div class="breadcrumb"><button type="button" data-route="home">Course map</button><span class="crumb-separator">/</span><span>Saved chapters</span></div><h1>Saved chapters</h1><p class="page-subtitle">A short list of the ideas you want to revisit.</p>
    ${selected.length ? `<div class="course-group saved-list" style="margin-top:24px"><div class="chapter-list">${selected.map(topic => `<button type="button" class="chapter-row" data-topic="${topic.id}"><span class="chapter-number">${chapterNumber(topic, topics.indexOf(topic))}</span><span class="chapter-name">${escapeHtml(topicLabel(topic))}</span><span class="chapter-arrow">›</span></button>`).join("")}</div></div>` : `<div class="saved-empty">No saved chapters yet. Use the Save button at the top of any chapter to keep it here.</div>`}
  </div>`;
  $("#workspace").scrollTo({ top: 0, behavior: "smooth" });
}

function startQuiz(topicId = "") {
  const set = questions.map((question, index) => ({ ...question, originalIndex: index })).filter(question => !topicId || question.topic === topicId);
  if (!set.length) { showToast("No recall questions are assigned to this chapter yet."); return; }
  activeQuiz = { questions: set, index: 0, answered: false, selected: -1, score: 0, complete: false };
  currentView = "recall"; currentTopic = null; setActiveNav(); renderQuiz();
}

function renderQuiz() {
  if (!activeQuiz) return;
  currentView = "recall"; setActiveNav();
  const total = activeQuiz.questions.length;
  const root = $("#view-root");
  if (activeQuiz.complete) {
    root.innerHTML = `<div class="quiz-page"><div class="breadcrumb"><button type="button" data-route="home">Course map</button><span class="crumb-separator">/</span><span>Recall lab</span></div><h1>Recall lab</h1>
      <section class="quiz-shell quiz-finish"><h2>Review complete</h2><p>Your score</p><div class="score-large">${activeQuiz.score} / ${total}</div><p>${activeQuiz.score === total ? "All correct. Keep the explanations sharp for the exam." : "Review the explanations, revisit the linked chapters, then give it another try."}</p><div class="quiz-controls"><button class="button" type="button" data-route="home">Back to course map</button><button class="button button-primary" type="button" id="restart-quiz">Try again</button></div></section></div>`;
    $("#workspace").scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  const question = activeQuiz.questions[activeQuiz.index];
  const progress = Math.round((activeQuiz.index / total) * 100);
  const choices = question.options.map((option, index) => {
    let stateClass = "";
    if (activeQuiz.answered && index === question.answer) stateClass = " is-correct";
    else if (activeQuiz.answered && index === activeQuiz.selected) stateClass = " is-wrong";
    return `<button class="quiz-option${stateClass}" type="button" data-answer="${index}" ${activeQuiz.answered ? "disabled" : ""}><span class="option-letter">${String.fromCharCode(65 + index)}</span><span>${escapeHtml(option)}</span></button>`;
  }).join("");
  root.innerHTML = `<div class="quiz-page"><div class="breadcrumb"><button type="button" data-route="home">Course map</button><span class="crumb-separator">/</span><span>Recall lab</span></div>
    <div class="page-title-row"><div><h1>Recall lab</h1><p class="page-subtitle">Retrieve the idea first; then check the reasoning.</p></div></div>
    <section class="quiz-shell"><div class="quiz-topline"><span>Question ${activeQuiz.index + 1} of ${total}</span><strong>${activeQuiz.score} correct</strong></div><div class="quiz-track"><span style="width:${progress}%"></span></div>
      <h2 class="quiz-question">${escapeHtml(question.prompt)}</h2><div class="quiz-options">${choices}</div>
      ${activeQuiz.answered ? `<div class="quiz-explanation"><strong>${activeQuiz.selected === question.answer ? "Correct" : "Not quite"}</strong>${escapeHtml(question.explanation)}</div>` : ""}
      <div class="quiz-controls"><button class="text-action" type="button" data-topic="${question.topic}">Open chapter notes</button>${activeQuiz.answered ? `<button class="button button-primary" type="button" id="next-question">${activeQuiz.index === total - 1 ? "See result" : "Next question"} →</button>` : `<p class="quiz-score">Select one answer</p>`}</div>
    </section></div>`;
  $("#workspace").scrollTo({ top: 0, behavior: "smooth" });
}

function typeset(element) {
  if (window.MathJax?.typesetPromise && element) window.MathJax.typesetPromise([element]).catch(() => {});
}
function applyReadingSize() { document.documentElement.style.setProperty("--reading-size", `${appState.readingSize}px`); }
function toggleSaved(topic) {
  const saved = new Set(appState.saved);
  const wasSaved = saved.has(topic.id);
  wasSaved ? saved.delete(topic.id) : saved.add(topic.id);
  appState.saved = [...saved]; persistState();
  if (currentView === "topic" && currentTopic?.id === topic.id) renderTopic(topic.id);
  else { buildSidebar(); showToast(wasSaved ? "Removed from saved chapters." : "Chapter saved for review."); }
}
function toggleComplete(topic) {
  appState.completed[topic.id] = !appState.completed[topic.id];
  persistState(); renderTopic(topic.id);
  showToast(appState.completed[topic.id] ? "Chapter marked complete." : "Chapter completion cleared.");
}
function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message; toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2300);
}
function openRoute(route) {
  closeMobileMenu();
  if (route === "home") renderHome();
  else if (route === "recall") startQuiz();
  else if (route === "saved") renderSaved();
}
function closeMobileMenu() {
  document.body.classList.remove("menu-open");
  $("#mobile-menu-button").setAttribute("aria-expanded", "false");
  $("#mobile-scrim").hidden = true;
}
function textForSearch(topic) {
  return `${topic.title} ${topic.content.replace(/!\[[^\]]*\]\([^)]+\)/g, " ").replace(/[#*_`|]/g, " ").replace(/\s+/g, " ")}`;
}
function findMatches(query) {
  const normalized = query.toLowerCase().trim();
  if (!normalized) return [];
  const matches = [];
  for (const topic of topics) {
    const text = textForSearch(topic);
    const position = text.toLowerCase().indexOf(normalized);
    if (position >= 0) {
      const start = Math.max(0, position - 55);
      const snippet = text.slice(start, Math.min(text.length, position + normalized.length + 105)).trim();
      matches.push({ topic, snippet: `${start ? "…" : ""}${snippet}${position + normalized.length + 105 < text.length ? "…" : ""}` });
    }
  }
  return matches.slice(0, 7);
}
function renderSearchResults(query) {
  const results = $("#search-results");
  const matches = findMatches(query);
  if (!query.trim()) { results.hidden = true; results.innerHTML = ""; return; }
  results.hidden = false;
  results.innerHTML = matches.length
    ? matches.map(({ topic, snippet }) => `<button class="search-result" type="button" role="option" data-topic="${topic.id}"><strong>${escapeHtml(topicLabel(topic))}</strong><small>${escapeHtml(snippet)}</small></button>`).join("")
    : `<div class="search-empty">No matches. Try a term such as “density of states” or “Coulomb blockade”.</div>`;
}
function setViewFontSize(direction) {
  appState.readingSize = Math.min(20, Math.max(15, appState.readingSize + direction));
  persistState(); applyReadingSize();
}

document.addEventListener("click", event => {
  const route = event.target.closest("[data-route]");
  if (route) { event.preventDefault(); openRoute(route.dataset.route); return; }
  const topicButton = event.target.closest("[data-topic]");
  if (topicButton) { renderTopic(topicButton.dataset.topic); closeMobileMenu(); return; }
  const quizTopic = event.target.closest("[data-quiz-topic]");
  if (quizTopic) { startQuiz(quizTopic.dataset.quizTopic); return; }
  if (event.target.closest("#saved-link")) { renderSaved(); return; }
  const answerButton = event.target.closest("[data-answer]");
  if (answerButton && activeQuiz && !activeQuiz.answered) {
    const question = activeQuiz.questions[activeQuiz.index];
    activeQuiz.selected = Number(answerButton.dataset.answer);
    activeQuiz.answered = true;
    if (activeQuiz.selected === question.answer) activeQuiz.score++;
    renderQuiz(); return;
  }
  if (event.target.closest("#next-question") && activeQuiz) {
    if (activeQuiz.index + 1 >= activeQuiz.questions.length) activeQuiz.complete = true;
    else { activeQuiz.index++; activeQuiz.answered = false; activeQuiz.selected = -1; }
    renderQuiz(); return;
  }
  if (event.target.closest("#restart-quiz") && activeQuiz) {
    startQuiz(activeQuiz.questions.length === questions.length ? "" : activeQuiz.questions[0].topic); return;
  }
  if (event.target.closest("#bookmark-topic") && currentTopic) { toggleSaved(currentTopic); return; }
  if (event.target.closest("#complete-topic") && currentTopic) { toggleComplete(currentTopic); return; }
  if (!event.target.closest(".search-box, .search-results")) $("#search-results").hidden = true;
});

$("#site-search").addEventListener("input", event => renderSearchResults(event.target.value));
$("#site-search").addEventListener("keydown", event => {
  if (event.key === "Escape") { event.currentTarget.value = ""; $("#search-results").hidden = true; event.currentTarget.blur(); }
  if (event.key === "Enter") { const first = $(".search-result", $("#search-results")); if (first) renderTopic(first.dataset.topic); }
  if (event.key === "ArrowDown") { const first = $(".search-result", $("#search-results")); if (first) { event.preventDefault(); first.focus(); } }
});
document.addEventListener("keydown", event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); $("#site-search").focus(); }
  if (event.key === "Escape") { $("#search-results").hidden = true; closeMobileMenu(); }
});
$("#text-smaller").addEventListener("click", () => setViewFontSize(-1));
$("#text-larger").addEventListener("click", () => setViewFontSize(1));
$("#focus-mode").addEventListener("click", event => {
  const enabled = document.body.classList.toggle("focus-mode");
  event.currentTarget.setAttribute("aria-pressed", String(enabled));
});
$("#mobile-menu-button").addEventListener("click", event => {
  const open = document.body.classList.toggle("menu-open");
  event.currentTarget.setAttribute("aria-expanded", String(open));
  $("#mobile-scrim").hidden = !open;
});
$("#mobile-scrim").addEventListener("click", closeMobileMenu);

async function boot() {
  try {
    const response = await fetch(NOTES_URL);
    if (!response.ok) throw new Error(`Could not load notes (${response.status}).`);
    parseNotes(await response.text());
    buildSidebar();
    $("#loading-state").remove();
    applyReadingSize();
    const requestedTopic = new URLSearchParams(location.search).get("topic");
    const requestedView = new URLSearchParams(location.search).get("view");
    if (requestedTopic && topics.some(topic => topic.id === requestedTopic)) {
      renderTopic(requestedTopic);
      return;
    }
    if (requestedView === "recall") {
      startQuiz();
      return;
    }
    const startingTopic = topics.find(topic => topic.id === appState.current);
    startingTopic ? renderTopic(startingTopic.id) : renderHome();
  } catch (error) {
    $("#loading-state").innerHTML = `<p class="error-message">The course notes could not be loaded. Start the site with <code>node server.js</code> from its folder, then refresh this page.</p>`;
    console.error(error);
  }
}
boot();
