const SYSTEM_PROMPT = `You are a contract review specialist. Find internal contradictions in contracts — pairs of clauses that directly conflict with each other within the same document.

A contradiction IS: same obligation with different numbers (2 years vs 36 months), one clause granting a right another prohibits, same duty assigned to different parties.

NOT a contradiction:
- Different notice periods for different termination types (30 days for convenience vs 5 days for cause) — different scenarios
- A clause saying "notwithstanding clause X" — that is an intentional legal override
- Clauses covering complementary geographic territories — not a conflict

Respond ONLY with valid JSON:
{
  "findings": [
    {
      "clause_a_id": "clause_03",
      "clause_b_id": "clause_07",
      "explanation": "brief explanation",
      "confidence": 0.95,
      "contradiction_type": "temporal"
    }
  ]
}

For confidence: 0.9-1.0 = very certain, 0.7-0.9 = likely, 0.5-0.7 = possible, below 0.5 = uncertain.
For contradiction_type use one of: temporal, scope, party_obligation, termination_renewal, definition.
If no contradictions: {"findings": []}`;

export async function runAgent(observation, apiConfig) {
  const { provider, keys } = apiConfig;
  const apiKey = (keys[provider] || '').replace(/[^\x20-\x7E]/g, '').trim();
  
  if (!apiKey) throw new Error(`Missing API key for ${provider}`);

  const clauseList = observation.clauses
    .map(c => `[${c.id}] ${c.title}: ${c.text}`)
    .join('\n');

  const userMessage = `${observation.instructions}\n\n=== CONTRACT ===\n\n${observation.contract_text}\n\n=== STRUCTURED CLAUSE LIST ===\n\n${clauseList}`;

  let raw = '';

  if (provider === 'anthropic') {
    raw = await runAnthropic(apiKey, userMessage);
  } else if (provider === 'gemini') {
    raw = await runGemini(apiKey, userMessage);
  } else if (provider === 'openai') {
    raw = await runOpenAIFormat(apiKey, userMessage, 'https://api.openai.com/v1/chat/completions', 'gpt-4o');
  } else if (provider === 'mistral') {
    raw = await runOpenAIFormat(apiKey, userMessage, 'https://api.mistral.ai/v1/chat/completions', 'mistral-large-latest');
  } else if (provider === 'nvidia') {
    raw = await runOpenAIFormat(apiKey, userMessage, 'https://integrate.api.nvidia.com/v1/chat/completions', 'meta/llama-3.1-405b-instruct');
  }

  raw = raw.replace(/```json/gi, '').replace(/```/g, '').trim();

  try {
    const parsed = JSON.parse(raw);
    return parsed.findings || [];
  } catch (e) {
    console.error('Failed to parse agent response:', raw);
    return [];
  }
}

export async function runAgentWithTrace(observation, apiConfig, onTrace) {
  const { provider, keys } = apiConfig;
  const apiKey = (keys[provider] || '').replace(/[^\x20-\x7E]/g, '').trim();
  if (!apiKey) throw new Error(`Missing API key for ${provider}`);

  const clauseList = observation.clauses
    .map(c => `[${c.id}] ${c.title}: ${c.text}`)
    .join('\n');
  const userMessage = `${observation.instructions}\n\n=== CONTRACT ===\n\n${observation.contract_text}\n\n=== STRUCTURED CLAUSE LIST ===\n\n${clauseList}`;

  // Only Anthropic claude-3-7-sonnet has thinking. For others, just use generic logic block or nothing.
  // Actually, wait, let's just make runAgentWithTrace support anthropic trace:
  if (provider === 'anthropic') {
    const model = 'claude-3-7-sonnet-20250219'; // hardcode model with thinking
    const body = {
      model,
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
      thinking: { type: 'enabled', budget_tokens: 5000 }
    };

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`Anthropic Error: ${err.error?.message || response.status}`);
    }

    const data = await response.json();
    const thinkingBlocks = data.content.filter(b => b.type === 'thinking');
    const textBlocks = data.content.filter(b => b.type === 'text');

    if (thinkingBlocks.length > 0 && onTrace) {
      onTrace(thinkingBlocks[0].thinking);
    }

    let raw = textBlocks.map(b => b.text).join('').trim();
    raw = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
    try { return JSON.parse(raw).findings || []; } catch { return []; }
  } else {
    // Basic trace fallback
    if (onTrace) onTrace("Step 1: Analyzing contract with standard model...\nThen: No extended reasoning trace available for this provider.");
    return await runAgent(observation, apiConfig);
  }
}


async function runAnthropic(apiKey, userMessage) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Anthropic Error: ${err.error?.message || response.status}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

async function runGemini(apiKey, userMessage) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
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
    throw new Error(`Gemini Error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

async function runOpenAIFormat(apiKey, userMessage, endpoint, model) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage }
      ]
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`API Error: ${err.error?.message || response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export async function runPortfolioAgent(observations, apiConfig) {
  const { provider, keys } = apiConfig;
  const apiKey = (keys[provider] || '').replace(/[^\x20-\x7E]/g, '').trim();
  if (!apiKey) throw new Error(`Missing API key for ${provider}`);

  let combinedClauses = '';
  let combinedTexts = '';
  
  observations.forEach(obs => {
    combinedClauses += `\n\n--- CONTRACT: ${obs.id} (${obs.name}) ---\n`;
    obs.clauses.forEach(c => {
      combinedClauses += `[${obs.id}::${c.id}] ${c.title}: ${c.text}\n`;
    });
    
    combinedTexts += `\n\n--- CONTRACT: ${obs.id} (${obs.name}) ---\n${obs.contract_text}`;
  });

  const portfolioPrompt = `You are a legal contract auditor analyzing a PORTFOLIO of contracts. Find cross-contract contradictions BETWEEN different contracts — where a commitment in one contract conflicts with a commitment in another contract.
A cross-contract contradiction exists when a commitment made in one contract is inconsistent with a commitment made in a different contract for the same subject matter, party, or obligation. Examples include uptime guarantees, payment terms, liability caps, notice periods, and IP rights.

Return your findings using the fully qualified clause IDs (e.g., CONTRACT_1::clause_07).

Respond ONLY with valid JSON:
{
  "findings": [
    {
      "clause_a_id": "CONTRACT_1::clause_03",
      "clause_b_id": "CONTRACT_2::clause_07",
      "explanation": "brief explanation",
      "confidence": 0.95,
      "contradiction_type": "temporal"
    }
  ]
}`;

  const userMessage = `=== COMBINED CONTRACT TEXTS ===\n${combinedTexts}\n\n=== STRUCTURED CLAUSE LIST ===\n${combinedClauses}`;

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
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 4000,
        system: portfolioPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`Anthropic Error: ${err.error?.message || response.status}`);
    }
    const data = await response.json();
    raw = data.content[0].text;
  } else if (provider === 'gemini') {
    raw = await runGemini(apiKey, portfolioPrompt + "\n" + userMessage);
  } else if (provider === 'openai') {
    raw = await runOpenAIFormat(apiKey, userMessage, 'https://api.openai.com/v1/chat/completions', 'gpt-4o');
  } else {
    throw new Error('Unsupported provider for portfolio agent');
  }

  raw = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    const parsed = JSON.parse(raw);
    return parsed.findings || [];
  } catch (e) {
    return [];
  }
}

export async function generateTimeline(findings, observation, apiConfig) {
  const { provider, keys } = apiConfig;
  const apiKey = (keys[provider] || '').replace(/[^\x20-\x7E]/g, '').trim();
  if (!apiKey) throw new Error(`Missing API key for ${provider}`);

  const system = `You are an expert contract risk analyst. For the given contradiction, simulate when it will become a problem in the real world contract lifecycle.
Return ONLY valid JSON with no markdown:
{
  "time_label": "When it happens (e.g., At signing, Month 6, 90 days before expiry)",
  "severity": "high/medium/low",
  "consequence": "2-3 sentences explaining what actually happens to the parties",
  "affected_party": "Which party is exposed",
  "financial_exposure": "Qualitative estimate like 'locked in', 'potential void'"
}`;

  const calls = findings.map(async f => {
    // Need clause text. Clause ID could be prefixed in portfolio mode, but timeline is primarily single mode.
    // If it's a cross-contract finding (id has ::), we pass what we have.
    let textA = "Unknown";
    let textB = "Unknown";
    if (observation.clauses) {
      const cA = observation.clauses.find(c => c.id === f.clause_a_id);
      if (cA) textA = cA.text;
      const cB = observation.clauses.find(c => c.id === f.clause_b_id);
      if (cB) textB = cB.text;
    }

    const userMessage = `CONTRADICTION:
Clause A (${f.clause_a_id}): ${textA}
Clause B (${f.clause_b_id}): ${textB}
Explanation: ${f.explanation}`;

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
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 1000,
          system: system,
          messages: [{ role: 'user', content: userMessage }],
        }),
      });
      if (response.ok) {
        const data = await response.json();
        raw = data.content[0].text;
      }
    } else {
      // Fallback dummy simulation for generic cases or unconfigured providers
      raw = JSON.stringify({
        time_label: "Mid-Term",
        severity: "medium",
        consequence: "The contradiction causes operational confusion during the execution phase.",
        affected_party: "Both",
        financial_exposure: "Moderate dispute risk"
      });
    }

    raw = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
    try {
      const parsed = JSON.parse(raw);
      return { finding: f, ...parsed };
    } catch (e) {
      return { finding: f, time_label: "Unknown", severity: "low", consequence: f.explanation, affected_party: "-", financial_exposure: "-" };
    }
  });

  const results = await Promise.all(calls);
  
  // Sort them loosely
  const order = { 'at signing': 1, 'day 1': 2, 'month 1': 3, 'month 6': 4, 'mid-term': 5, '90 days before expiry': 6, 'upon termination': 7, 'at renewal': 8 };
  return results.sort((a, b) => {
    const labelA = (a.time_label || '').toLowerCase();
    const labelB = (b.time_label || '').toLowerCase();
    const valA = order[labelA] || 5;
    const valB = order[labelB] || 5;
    return valA - valB;
  });
}
