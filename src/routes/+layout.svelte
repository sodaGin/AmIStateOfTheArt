<script>
  let { children } = $props();

  import questionModel from '$lib/data/question-model.json';
  import { defaultLocale, resolveLocalizedValue, translations } from '$lib/i18n/index.js';

  const standardOptions = questionModel.standardSelection?.options ?? [];
  const hasMultipleStandards = standardOptions.length > 1;

  /** @type {'en' | 'de'} */
  let locale = $state(defaultLocale);
  const ui = $derived(translations[locale]);

  let selectedStandardId = $state(
    standardOptions.length === 1 ? standardOptions[0].value : ''
  );
  let currentQuestionIndex = $state(0);
  /** @type {Record<string, string>} */
  let answers = $state({});
  let isCompleted = $state(false);

  /**
   * @param {any} question
   * @param {Record<string, string>} answerMap
   */
  function isQuestionRelevant(question, answerMap) {
    const relevance = question.relevance;

    if (!relevance || relevance.always === true) return true;

    const answer = answerMap[relevance.questionId];
    if (relevance.operator === '==') {
      return answer === relevance.value;
    }
    if (relevance.operator === '!=') {
      return answer !== relevance.value;
    }

    return true;
  }

  let allQuestions = $derived(
    (questionModel.questions ?? []).filter((question) => isQuestionRelevant(question, answers))
  );

  let currentQuestion = $derived(allQuestions[currentQuestionIndex] ?? null);

  /** @param {string} id */
  function selectStandard(id) {
    selectedStandardId = id;
    currentQuestionIndex = 0;
    answers = {};
    isCompleted = false;
  }

  /** @param {string} optionValue */
  function handleAnswer(optionValue) {
    if (!currentQuestion) return;

    const selectedOption = currentQuestion.options.find((option) => option.value === optionValue);
    if (!selectedOption) return;

    answers[currentQuestion.id] = optionValue;

    if (currentQuestionIndex < allQuestions.length - 1) {
      currentQuestionIndex += 1;
    } else {
      isCompleted = true;
    }
  }

  function getWeightedQuestions() {
    return allQuestions.filter((question) => Number(question.weight ?? 0) > 0);
  }

  function calculateComplianceScore() {
    const weightedQuestions = getWeightedQuestions();
    const totalWeight = weightedQuestions.reduce(
      (sum, question) => sum + Number(question.weight ?? 0),
      0
    );

    if (totalWeight === 0) return 0;

    const weightedCompliance = weightedQuestions.reduce((sum, question) => {
      const selectedAnswer = answers[question.id];
      if (selectedAnswer === undefined) return sum;

      const chosenOption = question.options.find((option) => option.value === selectedAnswer);
      const questionScore = Number(chosenOption?.score ?? 0);
      const questionWeight = Number(question.weight ?? 0);

      return sum + (questionScore / 100) * questionWeight;
    }, 0);

    return Math.round((weightedCompliance / totalWeight) * 100);
  }

  function calculateUncertaintyScore() {
    const weightedQuestions = getWeightedQuestions();
    const totalWeight = weightedQuestions.reduce(
      (sum, question) => sum + Number(question.weight ?? 0),
      0
    );

    if (totalWeight === 0) return 0;

    const unknownWeight = weightedQuestions.reduce((sum, question) => {
      const selectedAnswer = answers[question.id];
      if (selectedAnswer === 'unknown') {
        return sum + Number(question.weight ?? 0);
      }
      return sum;
    }, 0);

    return Math.round((unknownWeight / totalWeight) * 100);
  }

  function reset() {
    selectedStandardId = hasMultipleStandards ? '' : (standardOptions[0]?.value ?? '');
    currentQuestionIndex = 0;
    answers = {};
    isCompleted = false;
  }

  /** @type {string} */
  let selectedStandardLabel = $derived(
    resolveLocalizedValue(
      standardOptions.find((option) => option.value === selectedStandardId)?.label ?? 'Standard',
      locale
    )
  );
</script>

{@render children()}

<main class="app-shell">
  <aside class="sidebar" aria-label="Sidebar navigation">
    <div class="sidebar-brand">
      <span class="brand-mark">S</span>
      <div class="brand-copy">
        <div class="brand-name">Secure Review</div>
        <div class="brand-subtitle">Architecture</div>
      </div>
    </div>

    <div class="sidebar-section">
      <div class="section-label">Standards</div>
      <div class="standards-list">
        {#each standardOptions as option}
          <button
            type="button"
            class:active={selectedStandardId === option.value}
            class="sidebar-item"
            onclick={() => selectStandard(option.value)}
          >
            <span class="sidebar-dot" aria-hidden="true"></span>
            <span>{resolveLocalizedValue(option.label, locale)}</span>
          </button>
        {/each}
      </div>
    </div>

    <div class="sidebar-footer">
      <button type="button" class="secondary-nav">About</button>
      <button type="button" class="secondary-nav">Settings</button>
      <span class="version">v1.0</span>
    </div>
  </aside>

  <div class="main-panel">
    <header class="main-header">
      <div class="main-label">Assessment</div>
      <button class="lang-switch" onclick={() => (locale = locale === 'en' ? 'de' : 'en')}>
        {locale === 'en' ? 'DE' : 'EN'}
      </button>
    </header>

    {#if !selectedStandardId && hasMultipleStandards}
      <section class="intro-shell">
        <p class="kicker">Secure Review</p>
        <h1>{ui.heading}</h1>
        <p class="intro-copy">{ui.selectStandardPrompt}</p>

        <div class="standard-list">
          {#each standardOptions as option}
            <button class="standard-row" type="button" onclick={() => selectStandard(option.value)}>
              <span class="row-label">Standard</span>
              <span class="row-title">{resolveLocalizedValue(option.label, locale)}</span>
            </button>
          {/each}
        </div>
      </section>

    {:else if !isCompleted}
      <section class="question-shell">
        <div class="context-row">
          <span>{ui.questionLabel} {Math.min(currentQuestionIndex + 1, allQuestions.length)} / {allQuestions.length}</span>
          <span>{selectedStandardLabel}</span>
        </div>

        <div class="progress-line" aria-hidden="true">
          <span style="width: {allQuestions.length ? ((currentQuestionIndex + 1) / allQuestions.length) * 100 : 0}%"></span>
        </div>

        <h2>{resolveLocalizedValue(currentQuestion?.text, locale)}</h2>

        {#if currentQuestion?.explanation}
          <div class="explanation">
            <div class="explanation-label">{locale === 'en' ? 'Why this is asked?' : 'Warum wird das gefragt?'}</div>
            <p>{resolveLocalizedValue(currentQuestion.explanation, locale)}</p>
          </div>
        {/if}

        <div class="answer-list">
          {#each currentQuestion?.options ?? [] as option}
            <button
              class:selected={answers[currentQuestion.id] === option.value}
              class="answer-option"
              type="button"
              onclick={() => handleAnswer(option.value)}
            >
              <span class="radio-mark" aria-hidden="true"></span>
              <span>{resolveLocalizedValue(option.label, locale)}</span>
            </button>
          {/each}
        </div>

        <button class="secondary-link" type="button" onclick={reset}>{ui.changeStandard}</button>
      </section>

    {:else}
      <section class="result-shell">
        <p class="kicker">Assessment complete</p>
        <h2>{ui.evaluation}</h2>

        <div class="score-row">
          <div class="score-item">
            <span>{ui.compliance}</span>
            <strong>{calculateComplianceScore()}%</strong>
          </div>
          <div class="score-item">
            <span>{ui.uncertainty}</span>
            <strong>{calculateUncertaintyScore()}%</strong>
          </div>
        </div>

        {#if calculateComplianceScore() >= 80}
          <p class="result-summary"><strong>{ui.stateOfTheArt}</strong> {ui.stateOfTheArtText}</p>
        {:else if calculateComplianceScore() >= 50}
          <p class="result-summary"><strong>{ui.goodStart}</strong> {ui.goodStartText}</p>
        {:else}
          <p class="result-summary"><strong>{ui.actionNeeded}</strong> {ui.actionNeededText}</p>
        {/if}

        <p class="privacy-note">{ui.privacy}</p>

        <button class="primary-link" type="button" onclick={reset}>{ui.restart}</button>
      </section>
    {/if}
  </div>
</main>

<style>
  :global(body) {
    margin: 0;
    min-height: 100vh;
    background: #050505;
    color: #f2f2f2;
    font-family: Inter, 'Segoe UI', sans-serif;
  }

  * {
    box-sizing: border-box;
  }

  button {
    font: inherit;
  }

  .app-shell {
    display: grid;
    grid-template-columns: 240px minmax(0, 1fr);
    min-height: 100vh;
    background: #050505;
  }

  .sidebar {
    display: flex;
    flex-direction: column;
    padding: 20px 16px 18px;
    background: #0b0b0b;
    border-right: 1px solid #1f1f1f;
  }

  .sidebar-brand {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 6px 18px;
    border-bottom: 1px solid #1d1d1d;
  }

  .brand-mark {
    width: 22px;
    height: 22px;
    border-radius: 6px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: #f2f2f2;
    color: #050505;
    font-size: 0.68rem;
    font-weight: 700;
  }

  .brand-copy {
    display: flex;
    flex-direction: column;
    gap: 2px;
    line-height: 1.1;
  }

  .brand-name {
    font-size: 0.8rem;
    letter-spacing: 0.02em;
    color: #f2f2f2;
    font-weight: 600;
  }

  .brand-subtitle {
    font-size: 0.7rem;
    color: #8a8a8a;
  }

  .sidebar-section {
    padding-top: 18px;
  }

  .section-label {
    margin: 0 8px 10px;
    font-size: 0.66rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #7a7a7a;
  }

  .standards-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .sidebar-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    background: transparent;
    border: 1px solid transparent;
    color: #d9d9d9;
    padding: 8px 10px;
    border-radius: 8px;
    text-align: left;
    cursor: pointer;
    transition: background-color 0.15s ease, border-color 0.15s ease;
    font-size: 0.82rem;
  }

  .sidebar-item:hover,
  .sidebar-item.active {
    background: #111111;
    border-color: #1f1f1f;
  }

  .sidebar-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #d8ff3e;
    opacity: 0.9;
    flex-shrink: 0;
  }

  .sidebar-footer {
    margin-top: auto;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-top: 18px;
    border-top: 1px solid #1d1d1d;
  }

  .secondary-nav {
    background: transparent;
    border: none;
    color: #8d8d8d;
    text-align: left;
    padding: 0;
    cursor: pointer;
    font-size: 0.78rem;
    letter-spacing: 0.02em;
  }

  .version {
    margin-top: 4px;
    color: #565656;
    font-size: 0.7rem;
  }

  .main-panel {
    padding: 22px 32px 40px;
  }

  .main-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding-bottom: 18px;
    border-bottom: 1px solid #1d1d1d;
  }

  .main-label {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: #8a8a8a;
  }

  .lang-switch {
    background: transparent;
    border: 1px solid #232323;
    color: #ececec;
    padding: 7px 10px;
    border-radius: 999px;
    cursor: pointer;
    font-size: 0.72rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .intro-shell,
  .question-shell,
  .result-shell {
    max-width: 760px;
    padding-top: 36px;
  }

  .kicker {
    margin: 0 0 10px;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: #7a7a7a;
  }

  h1 {
    margin: 0;
    font-size: clamp(2.8rem, 4vw, 4.2rem);
    line-height: 0.98;
    letter-spacing: -0.06em;
    font-weight: 700;
    color: #f2f2f2;
  }

  h2 {
    margin: 0;
    font-size: clamp(1.45rem, 2vw, 2rem);
    line-height: 1.18;
    letter-spacing: -0.04em;
    font-weight: 600;
    color: #f2f2f2;
  }

  .intro-copy {
    margin: 18px 0 28px;
    max-width: 620px;
    color: #b2b2b2;
    font-size: 1rem;
    line-height: 1.7;
  }

  .standard-list {
    display: flex;
    flex-direction: column;
    gap: 0;
    max-width: 720px;
  }

  .standard-row {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 16px 0;
    background: transparent;
    border: 0;
    border-top: 1px solid #1d1d1d;
    color: #f2f2f2;
    text-align: left;
    cursor: pointer;
    transition: background-color 0.15s ease;
  }

  .standard-row:last-child {
    border-bottom: 1px solid #1d1d1d;
  }

  .standard-row:hover {
    background: rgba(255, 255, 255, 0.02);
  }

  .row-label {
    font-size: 0.7rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #7d7d7d;
  }

  .row-title {
    font-size: 1rem;
    letter-spacing: -0.02em;
  }

  .context-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 8px;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #7d7d7d;
  }

  .progress-line {
    width: 100%;
    height: 1px;
    background: #1d1d1d;
    margin-bottom: 30px;
    overflow: hidden;
  }

  .progress-line span {
    display: block;
    height: 100%;
    background: #f2f2f2;
    transition: width 0.2s ease;
  }

  .question-shell h2 {
    margin-top: 0;
  }

  .explanation {
    margin-top: 22px;
    max-width: 620px;
  }

  .explanation-label {
    margin-bottom: 8px;
    font-size: 0.7rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #7d7d7d;
  }

  .explanation p {
    margin: 0;
    color: #b3b3b3;
    font-size: 0.98rem;
    line-height: 1.75;
  }

  .answer-list {
    margin-top: 32px;
    border-top: 1px solid #1d1d1d;
    display: flex;
    flex-direction: column;
  }

  .answer-option {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 16px 0;
    background: transparent;
    border: 0;
    border-bottom: 1px solid #1d1d1d;
    color: #f2f2f2;
    text-align: left;
    cursor: pointer;
    transition: background-color 0.15s ease;
    font-size: 1rem;
  }

  .answer-option:hover {
    background: rgba(255, 255, 255, 0.02);
  }

  .answer-option.selected {
    background: rgba(255, 255, 255, 0.02);
  }

  .radio-mark {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 1px solid #8a8a8a;
    background: transparent;
    display: inline-flex;
    flex-shrink: 0;
  }

  .answer-option.selected .radio-mark {
    border-color: #f2f2f2;
    background: #f2f2f2;
    box-shadow: inset 0 0 0 3px #050505;
  }

  .secondary-link,
  .primary-link {
    margin-top: 20px;
    border: none;
    background: transparent;
    color: #b1b1b1;
    padding: 0;
    cursor: pointer;
    text-align: left;
    font-size: 0.9rem;
  }

  .result-shell {
    padding-top: 34px;
  }

  .score-row {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 26px;
    margin: 26px 0 20px;
    border-top: 1px solid #1d1d1d;
    padding-top: 18px;
  }

  .score-item {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .score-item span {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: #7d7d7d;
  }

  .score-item strong {
    font-size: clamp(2.4rem, 3vw, 3.2rem);
    line-height: 1;
    letter-spacing: -0.06em;
    font-weight: 700;
    color: #f2f2f2;
  }

  .result-summary {
    margin: 0;
    padding-top: 12px;
    border-top: 1px solid #1d1d1d;
    color: #d2d2d2;
    line-height: 1.7;
  }

  .privacy-note {
    margin-top: 20px;
    color: #7d7d7d;
    line-height: 1.7;
  }

  @media (max-width: 900px) {
    .app-shell {
      grid-template-columns: 1fr;
    }

    .sidebar {
      border-right: none;
      border-bottom: 1px solid #1d1d1d;
      padding-bottom: 14px;
    }
  }

  @media (max-width: 640px) {
    .main-panel {
      padding: 18px 18px 30px;
    }

    .main-header {
      align-items: flex-start;
      flex-direction: column;
      gap: 10px;
    }

    .context-row {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
    }

    .score-row {
      grid-template-columns: 1fr;
    }

    .standard-row {
      flex-direction: column;
      align-items: flex-start;
      gap: 6px;
    }
  }
</style>