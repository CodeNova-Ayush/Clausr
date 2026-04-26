const LEXMIND_SYSTEM_PROMPT = 'You are a Contract Drafting Monitor — a real-time guardian watching a contract negotiation unfold clause by clause.\n\nYou receive a complete negotiation transcript showing clauses being added across one or more negotiation rounds. For each event, determine whether accepting that clause introduces a contradiction with any previously accepted clause.\n\nA contradiction is introduced when a new clause makes an incompatible demand on the same obligation, right, timeframe, payment term, or party responsibility as an existing clause.\n\nCRITICAL: Override/superseding clauses that RESOLVE previous contradictions are NOT new contradictions.\n\nReturn ONLY valid JSON:\n{\n  "steps": [\n    {"event_id": "event_01", "introduces_contradiction": false, "contradicts_clause_id": null, "explanation": "reason"},\n    {"event_id": "event_07", "introduces_contradiction": true, "contradicts_clause_id": "clause_04", "explanation": "reason"}\n  ]\n}\n\nProvide a prediction for every event.';

export async function runLexMindMonitor(observation, apiConfig) {
  const { provider, keys } = apiConfig;
  const apiKey = (keys[provider] || '').replace(/[^\x20-\x7E]/g, '').trim();
  if (!apiKey) throw new Error('Missing API key for ' + provider);

  // Build the negotiation transcript prompt
  let transcript = 'CONTRACT: ' + (observation.contract_title || 'Unknown') + '\n';
  transcript += 'TOTAL EVENTS: ' + observation.drafting_sequence.length + '\n\n';
  transcript += '=== NEGOTIATION TRANSCRIPT ===\n\n';

  const clausesSoFar = [];
  for (let i = 0; i < observation.drafting_sequence.length; i++) {
    const event = observation.drafting_sequence[i];
    transcript += '--- EVENT ' + (i + 1) + ' ---\n';
    transcript += 'Round: ' + event.round + ' (' + event.round_label + ')\n';
    transcript += 'Authored by: ' + event.authored_by + '\n';
    transcript += 'Action: ' + event.action + '\n';
    transcript += 'Clause: [' + event.clause_id + '] ' + event.clause_title + '\n';
    transcript += 'Text: ' + event.clause_text + '\n';

    clausesSoFar.push(event);
    if (clausesSoFar.length > 1) {
      transcript += '\nClauses in draft at this point (' + clausesSoFar.length + '):\n';
      for (let j = 0; j < clausesSoFar.length - 1; j++) {
        transcript += '  [' + clausesSoFar[j].clause_id + '] ' + clausesSoFar[j].clause_title + '\n';
      }
    }
    transcript += '\n';
  }

  transcript += observation.instructions || '';

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
        max_tokens: 6000,
        system: LEXMIND_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: transcript }],
      }),
    });
    if (!response.ok) {
      const err = await response.json().catch(function() { return {}; });
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
          system_instruction: { parts: [{ text: LEXMIND_SYSTEM_PROMPT }] },
          contents: [{ parts: [{ text: transcript }] }],
          generationConfig: { temperature: 0, responseMimeType: 'application/json' },
        }),
      }
    );
    if (!response.ok) throw new Error('Gemini Error: ' + response.status);
    const data = await response.json();
    raw = data.candidates[0].content.parts[0].text;
  } else if (provider === 'openai') {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: LEXMIND_SYSTEM_PROMPT },
          { role: 'user', content: transcript },
        ],
      }),
    });
    if (!response.ok) throw new Error('OpenAI Error: ' + response.status);
    const data = await response.json();
    raw = data.choices[0].message.content;
  } else if (provider === 'mistral') {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: LEXMIND_SYSTEM_PROMPT },
          { role: 'user', content: transcript },
        ],
      }),
    });
    if (!response.ok) throw new Error('Mistral Error: ' + response.status);
    const data = await response.json();
    raw = data.choices[0].message.content;
  } else if (provider === 'nvidia') {
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
      body: JSON.stringify({
        model: 'meta/llama-3.1-405b-instruct',
        temperature: 0,
        messages: [
          { role: 'system', content: LEXMIND_SYSTEM_PROMPT },
          { role: 'user', content: transcript },
        ],
      }),
    });
    if (!response.ok) throw new Error('NVIDIA Error: ' + response.status);
    const data = await response.json();
    raw = data.choices[0].message.content;
  }

  raw = raw.replace(/```json/gi, '').replace(/```/g, '').trim();

  try {
    const parsed = JSON.parse(raw);
    return parsed.steps || [];
  } catch (e) {
    console.error('Failed to parse LexMind response:', raw);
    return [];
  }
}
