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

<main class="container">
  <div class="lang-switch-wrap">
    <button class="lang-switch" onclick={() => (locale = locale === 'en' ? 'de' : 'en')}>
      {locale === 'en' ? translations.de.switchLanguage : translations.en.switchLanguage}
    </button>
  </div>

  <h1>{ui.heading}</h1>

  {#if !selectedStandardId && hasMultipleStandards}
    <section class="card">
      <h2>{ui.selectStandardTitle}</h2>
      <p>{ui.selectStandardPrompt}</p>

      <div class="grid">
        {#each standardOptions as option}
          <button class="standard-btn" onclick={() => selectStandard(option.value)}>
            <h3>{resolveLocalizedValue(option.label, locale)}</h3>
          </button>
        {/each}
      </div>
    </section>

  {:else if !isCompleted}
    <section class="card">
      <div class="header-row">
        <span>{ui.standardLabel}: <strong>{selectedStandardLabel}</strong></span>
        <span>{ui.questionLabel} {Math.min(currentQuestionIndex + 1, allQuestions.length)} {ui.ofLabel} {allQuestions.length}</span>
      </div>

      <div class="progress-bar">
        <div
          class="progress"
          style="width: {allQuestions.length ? ((currentQuestionIndex + 1) / allQuestions.length) * 100 : 0}%"
        ></div>
      </div>

      <h2>{resolveLocalizedValue(currentQuestion?.text, locale)}</h2>

      <div class="options">
        {#each currentQuestion?.options ?? [] as option}
          <button class="option-btn" onclick={() => handleAnswer(option.value)}>
            {resolveLocalizedValue(option.label, locale)}
          </button>
        {/each}
      </div>

      <button class="back-link" onclick={reset}>{ui.changeStandard}</button>
    </section>

  {:else}
    <section class="card result">
      <h2>{ui.evaluation}: {selectedStandardLabel}</h2>

      <div class="score-grid">
        <div class="score-box">
          <span class="score-label">{ui.compliance}</span>
          <div class="score-badge">{calculateComplianceScore()}%</div>
        </div>
        <div class="score-box">
          <span class="score-label">{ui.uncertainty}</span>
          <div class="score-badge uncertainty">{calculateUncertaintyScore()}%</div>
        </div>
      </div>

      {#if calculateComplianceScore() >= 80}
        <p class="status high"><strong>{ui.stateOfTheArt}</strong> {ui.stateOfTheArtText}</p>
      {:else if calculateComplianceScore() >= 50}
        <p class="status medium"><strong>{ui.goodStart}</strong> {ui.goodStartText}</p>
      {:else}
        <p class="status low"><strong>{ui.actionNeeded}</strong> {ui.actionNeededText}</p>
      {/if}

      <p class="privacy-note">{ui.privacy}</p>

      <button class="reset-btn" onclick={reset}>{ui.restart}</button>
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

  .lang-switch-wrap {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 12px;
  }

  .lang-switch {
    border: 1px solid #cbd5e1;
    border-radius: 999px;
    background: white;
    padding: 6px 12px;
    cursor: pointer;
    color: #0f172a;
    font-weight: 600;
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

  .score-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
    margin: 24px 0;
  }

  .score-box {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 16px;
    text-align: center;
  }

  .score-label {
    display: block;
    font-size: 0.8rem;
    color: #64748b;
    margin-bottom: 8px;
  }

  .score-badge {
    font-size: 2rem;
    font-weight: bold;
    color: #0f172a;
  }

  .score-badge.uncertainty {
    color: #b45309;
  }

  .status {
    margin-top: 18px;
    padding: 12px 14px;
    border-radius: 8px;
    border-left: 4px solid;
  }

  .status.high {
    background: #ecfdf5;
    border-color: #16a34a;
    color: #166534;
  }

  .status.medium {
    background: #fff7ed;
    border-color: #f59e0b;
    color: #9a5d00;
  }

  .status.low {
    background: #fef2f2;
    border-color: #ef4444;
    color: #991b1b;
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