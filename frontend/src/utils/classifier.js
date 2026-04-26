export const TYPE_LABELS = {
  temporal:             'Type 1 — Numeric / Temporal',
  scope:                'Type 2 — Scope Conflict',
  party_obligation:     'Type 3 — Party Obligation',
  termination_renewal:  'Type 4 — Termination / Renewal',
  definition:           'Type 5 — Definition Conflict',
  unknown:              'Unknown Type',
};

export const TYPE_COLORS = {
  temporal:             '#1D9E75',
  scope:                '#378ADD',
  party_obligation:     '#EF9F27',
  termination_renewal:  '#FF8C42',
  definition:           '#E24B4A',
  unknown:              '#9898b8',
};

export const TYPE_SHORT = {
  temporal:             'T1 Numeric',
  scope:                'T2 Scope',
  party_obligation:     'T3 Party',
  termination_renewal:  'T4 Renewal',
  definition:           'T5 Definition',
  unknown:              'Unknown',
};

export function classifyContradiction(finding, clauses) {
  if (finding.contradiction_type && finding.contradiction_type !== 'unknown') {
    return finding.contradiction_type;
  }

  const clauseA = clauses?.find(c => c.id === finding.clause_a_id);
  const clauseB = clauses?.find(c => c.id === finding.clause_b_id);
  const explanation = (finding.explanation || '').toLowerCase();
  const textA = (clauseA?.text || '').toLowerCase();
  const textB = (clauseB?.text || '').toLowerCase();
  const combined = explanation + ' ' + textA + ' ' + textB;

  if (/\b(means|shall mean|defined as|definition)\b/.test(combined) ||
      /\b(business day|working day|territory|confidential information)\b/.test(combined)) {
    return 'definition';
  }

  const numMatches = combined.match(/\d+\s*(days?|months?|years?|hours?|\$[\d,]+|%)/g) || [];
  if (numMatches.length >= 2 || /\b(net \d+|payment term|notice period|duration|term of)\b/.test(combined)) {
    return 'temporal';
  }

  if (/\b(terminat|renew|cancel|expir|auto-renew|notice|written notice)\b/.test(combined)) {
    return 'termination_renewal';
  }

  if (/\b(grant|permit|allow|prohibit|restrict|license|resale|use|purpose)\b/.test(combined)) {
    return 'scope';
  }

  if (/\b(supplier|vendor|client|buyer|shall|responsible|liable|bears|obligation)\b/.test(combined)) {
    return 'party_obligation';
  }

  return 'unknown';
}
