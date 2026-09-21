<script>
  import standardsData from '$lib/data/standards.json';

  let selectedStandardId = $state('');
  let currentQuestionIndex = $state(0);
  
  /** @type {Record<string, number>} */
  let answers = $state({});
  let isCompleted = $state(false);

  let selectedStandard = $derived(
    standardsData.standards.find(s => s.id === selectedStandardId)
  );

  let allQuestions = $derived(
    selectedStandard ? selectedStandard.categories.flatMap(c => c.questions) : []
  );

  let currentQuestion = $derived(allQuestions[currentQuestionIndex]);

/** @param {string} id */
  function selectStandard(id) {
    selectedStandardId = id;
    currentQuestionIndex = 0;
    answers = {};
    isCompleted = false;
  }

/** @param {number} score */
  function handleAnswer(score) {
    if (!currentQuestion) return;
    answers[currentQuestion.id] = score;

    if (currentQuestionIndex < allQuestions.length - 1) {
      currentQuestionIndex++;
    } else {
      isCompleted = true;
    }
  }

  function calculateScore() {
    const scores = Object.values(answers);
    if (scores.length === 0) return 0;
    const total = scores.reduce((acc, curr) => acc + curr, 0);
    return Math.round(total / scores.length);
  }

  function reset() {
    selectedStandardId = '';
    currentQuestionIndex = 0;
    answers = {};
    isCompleted = false;
  }
</script>

<main class="container">
  <h1>OT Cybersecurity Readiness Checker</h1>

  {#if !selectedStandardId}
    <section class="card">
      <h2>1. Standard / Framework auswählen</h2>
      <p>Wähle den Standard aus, gegen den du deine OT-Sicherheit prüfen möchtest:</p>

      <div class="grid">
        {#each standardsData.standards as std}
          <button class="standard-btn" onclick={() => selectStandard(std.id)}>
            <h3>{std.title}</h3>
            <p>{std.description}</p>
          </button>
        {/each}
      </div>
    </section>

  {:else if !isCompleted}
    <section class="card">
      <div class="header-row">
        <span>Standard: <strong>{selectedStandard?.title}</strong></span>
        <span>Frage {currentQuestionIndex + 1} von {allQuestions.length}</span>
      </div>

      <div class="progress-bar">
        <div
          class="progress"
          style="width: {((currentQuestionIndex + 1) / allQuestions.length) * 100}%"
        ></div>
      </div>

      <h2>{currentQuestion?.text}</h2>

      <div class="options">
        {#each currentQuestion?.options || [] as option}
          <button class="option-btn" onclick={() => handleAnswer(option.score)}>
            {option.label}
          </button>
        {/each}
      </div>

      <button class="back-link" onclick={reset}>← Standard wechseln</button>
    </section>

  {:else}
    <section class="card result">
      <h2>Auswertung: {selectedStandard?.title}</h2>
      <div class="score-badge">
        Score: {calculateScore()} / 100
      </div>

      {#if calculateScore() >= 80}
        <p class="status high"><strong>State of the Art:</strong> Deine OT-Security ist hervorragend aufgestellt!</p>
      {:else if calculateScore() >= 50}
        <p class="status medium"><strong>Guter Anfang:</strong> Es gibt noch wichtige Lücken im Bereich Patch-Management, Segmentierung oder Governance.</p>
      {:else}
        <p class="status low"><strong>Handlungsbedarf:</strong> Wesentliche Sicherheitsanforderungen sind nicht erfüllt.</p>
      {/if}

      <p class="privacy-note">🔒 Alle Eingaben wurden nur lokal in deinem Browser verarbeitet. Es werden keine Daten gespeichert.</p>

      <button class="reset-btn" onclick={reset}>Erneuten Test starten</button>
    </section>
  {/if}
</main>

<style>
  :global(body) {
    font-family: system-ui, -apple-system, sans-serif;
    background-color: #f4f6f8;
    color: #1a1a1a;
    margin: 0;
    padding: 20px;
  }

  .container {
    max-width: 700px;
    margin: 0 auto;
  }

  h1 {
    text-align: center;
    color: #0f172a;
  }

  .card {
    background: white;
    padding: 24px;
    border-radius: 12px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  .grid {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .standard-btn {
    text-align: left;
    padding: 16px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #f8fafc;
    cursor: pointer;
    transition: all 0.2s;
  }

  .standard-btn:hover {
    border-color: #0284c7;
    background: #f0f9ff;
  }

  .standard-btn h3 {
    margin: 0 0 6px 0;
    color: #0284c7;
  }

  .standard-btn p {
    margin: 0;
    font-size: 0.9rem;
    color: #64748b;
  }

  .header-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.85rem;
    color: #64748b;
    margin-bottom: 8px;
  }

  .progress-bar {
    height: 6px;
    background: #e2e8f0;
    border-radius: 3px;
    margin-bottom: 24px;
    overflow: hidden;
  }

  .progress {
    height: 100%;
    background: #0284c7;
    transition: width 0.3s ease;
  }

  .options {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin: 20px 0;
  }

  .option-btn {
    padding: 12px 16px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    background: white;
    font-size: 1rem;
    cursor: pointer;
    text-align: left;
  }

  .option-btn:hover {
    background: #0284c7;
    color: white;
    border-color: #0284c7;
  }

  .back-link {
    background: none;
    border: none;
    color: #64748b;
    cursor: pointer;
    font-size: 0.85rem;
    padding: 0;
  }

  .score-badge {
    font-size: 2.5rem;
    font-weight: bold;
    text-align: center;
    margin: 20px 0;
    color: #0f172a;
  }

  .privacy-note {
    font-size: 0.85rem;
    color: #64748b;
    text-align: center;
    margin-top: 20px;
  }

  .reset-btn {
    display: block;
    width: 100%;
    padding: 12px;
    background: #0f172a;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    cursor: pointer;
    margin-top: 16px;
  }

  .reset-btn:hover {
    background: #1e293b;
  }
</style>