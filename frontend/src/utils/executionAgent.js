const EXECUTION_SYSTEM_PROMPT = `You are a Contract Execution Specialist. You simulate the execution of legal contracts by tracing realistic business scenarios through the contract's clause structure.

For each scenario you receive:
- A scenario ID, title, actor, description, and action taken
- The full contract text and structured clause list

Your job for EACH scenario:
1. Identify which clauses are triggered by the described action (in order of activation)
2. Determine if ANY two simultaneously triggered clauses make directly contradictory demands
3. If they do → mark as CRASH and identify the exact crash pair (clause_a_id and clause_b_id)
4. If they don't → mark as clean

CRITICAL RULES:
- A crash ONLY occurs when two triggered clauses make INCOMPATIBLE demands on the SAME party for the SAME obligation
- Different notice periods for different termination types are NOT crashes — different contexts
- "Notwithstanding clause X" language is an INTENTIONAL override, NOT a crash
- Clauses covering complementary scope (different tiers, different territories) are NOT crashes
- Some scenarios will look dangerous but resolve cleanly. Be precise.

Return ONLY valid JSON:
{
  "traces": [
    {
      "scenario_id": "scenario_01",
      "triggered_clauses": ["clause_03", "clause_07"],
      "crashes": true,
      "crash_pair": {"clause_a_id": "clause_03", "clause_b_id": "clause_07"},
      "explanation": "Brief explanation of the crash or clean resolution"
    }
  ]
}

If crashes is false, set crash_pair to null.`;

export async function runExecutionAgent(observation, apiConfig) {
  const { provider, keys } = apiConfig;
  const apiKey = (keys[provider] || '').replace(/[^\x20-\x7E]/g, '').trim();

  if (!apiKey) throw new Error('Missing API key for ' + provider);

  const clauseList = observation.clauses
    .map(c => '[' + c.id + '] ' + c.title + ': ' + c.text)
    .join('\n');

  const scenarioList = observation.scenarios
    .map(s => '[Scenario ' + s.scenario_id + ']\nTitle: ' + s.title + '\nActor: ' + s.actor + '\nDescription: ' + s.description + '\nAction Taken: ' + s.action_taken)
    .join('\n\n');

  const userMessage = observation.instructions +
    '\n\n=== CONTRACT TEXT ===\n\n' + observation.contract_text +
    '\n\n=== STRUCTURED CLAUSE LIST ===\n\n' + clauseList +
    '\n\n=== BUSINESS SCENARIOS TO TRACE ===\n\n' + scenarioList +
    '\n\nTrace each scenario. Exactly ' + observation.num_crashing_scenarios + ' scenarios will crash. Return your traces as JSON.';

  let raw = '';

  if (provider === 'anthropic') {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4000,
        system: EXECUTION_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error('Anthropic Error: ' + (err.error?.message || response.status));
    }

    const data = await response.json();
    raw = data.content[0].text;
  } else if (provider === 'gemini') {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: EXECUTION_SYSTEM_PROMPT }] },
          contents: [{ parts: [{ text: userMessage }] }],
          generationConfig: {
            temperature: 0,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error('Gemini Error ' + response.status + ': ' + err);
    }

    const data = await response.json();
    raw = data.candidates[0].content.parts[0].text;
  } else if (provider === 'openai') {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: EXECUTION_SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error('OpenAI Error: ' + (err.error?.message || response.status));
    }

    const data = await response.json();
    raw = data.choices[0].message.content;
  } else if (provider === 'mistral') {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: EXECUTION_SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error('Mistral Error: ' + (err.message || response.status));
    }

    const data = await response.json();
    raw = data.choices[0].message.content;
  } else if (provider === 'nvidia') {
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
      },
      body: JSON.stringify({
        model: 'meta/llama-3.1-70b-instruct',
        temperature: 0,
        messages: [
          { role: 'system', content: EXECUTION_SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error('NVIDIA Error: ' + (err.detail || err.message || response.status));
    }

    const data = await response.json();
    raw = data.choices[0].message.content;
  } else {
    throw new Error('Unsupported provider: ' + provider);
  }

  raw = raw.replace(/```json/gi, '').replace(/```/g, '').trim();

  try {
    const parsed = JSON.parse(raw);
    return parsed.traces || [];
  } catch (e) {
    console.error('Failed to parse execution agent response:', raw);
    return [];
  }
}
