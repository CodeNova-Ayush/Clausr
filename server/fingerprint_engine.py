import re
from typing import List, Dict, Optional
from models import FingerprintResult, FingerprintDelta

class ContractDNAEngine:
    def __init__(self):
        self.history: Dict[str, FingerprintResult] = {}
        
        self.weights = {
            "numeric": 0.20,
            "temporal": 0.20,
            "party_obligation": 0.25,
            "termination": 0.20,
            "conditional": 0.15
        }
        
    def get_schema(self):
        return {
            "dimensions": [
                {"name": "Numeric Risk", "weight": self.weights["numeric"], "description": "Measures density of quantities, percentages, and amounts."},
                {"name": "Temporal Risk", "weight": self.weights["temporal"], "description": "Measures density of time-related constraints like deadlines and notice periods."},
                {"name": "Party-Obligation Risk", "weight": self.weights["party_obligation"], "description": "Measures strictness of duties and assignments using modal verbs."},
                {"name": "Termination Risk", "weight": self.weights["termination"], "description": "Measures conflict potential in renewal and expiry clauses."},
                {"name": "Conditional Risk", "weight": self.weights["conditional"], "description": "Measures complexity of conditionality using terms like 'notwithstanding' and 'provided that'."}
            ]
        }
        
    def calculate_fingerprint(self, clause_texts: List[str], episode_id: Optional[str] = None) -> FingerprintResult:
        full_text = " ".join(clause_texts).lower()
        
        # 1. Numeric Risk
        num_matches = len(re.findall(r'\d+', full_text))
        num_keywords = sum(full_text.count(w) for w in ["days", "months", "percent", "%", "amount", "fee", "$", "dollar"])
        numeric_score = min(1.0, (num_matches * 0.05) + (num_keywords * 0.05))
        
        # 2. Temporal Risk
        temp_keywords = ["days", "weeks", "months", "years", "notice", "deadline", "effective date", "renewal", "expiry", "termination"]
        temp_matches = sum(full_text.count(w) for w in temp_keywords)
        temporal_score = min(1.0, temp_matches * 0.08)
        
        # 3. Party-Obligation Risk
        obl_keywords = ["shall", "must", "responsible for", "obligated to", "agrees to", "will"]
        obl_matches = sum(full_text.count(w) for w in obl_keywords)
        party_score = min(1.0, obl_matches * 0.06)
        
        # 4. Termination Risk
        term_keywords = ["termination", "renewal", "expiry", "auto-renew", "notice period", "terminate", "survive"]
        term_matches = sum(full_text.count(w) for w in term_keywords)
        term_score = min(1.0, term_matches * 0.10)
        
        # 5. Conditional Risk
        cond_keywords = ["if", "unless", "except", "notwithstanding", "provided that", "in the event that", "subject to"]
        cond_matches = sum(full_text.count(w) for w in cond_keywords)
        cond_score = min(1.0, cond_matches * 0.08)
        
        overall = (
            numeric_score * self.weights["numeric"] +
            temporal_score * self.weights["temporal"] +
            party_score * self.weights["party_obligation"] +
            term_score * self.weights["termination"] +
            cond_score * self.weights["conditional"]
        )
        
        if overall >= 0.75:
            label = "CRITICAL"
        elif overall >= 0.50:
            label = "HIGH"
        elif overall >= 0.25:
            label = "MEDIUM"
        else:
            label = "LOW"
            
        scores_dict = {
            "Numeric Risk": numeric_score,
            "Temporal Risk": temporal_score,
            "Party-Obligation Risk": party_score,
            "Termination Risk": term_score,
            "Conditional Risk": cond_score
        }
        dominant = max(scores_dict.items(), key=lambda x: x[1])[0]
        
        result = FingerprintResult(
            episode_id=episode_id,
            numeric_risk=round(numeric_score, 3),
            temporal_risk=round(temporal_score, 3),
            party_obligation_risk=round(party_score, 3),
            termination_risk=round(term_score, 3),
            conditional_risk=round(cond_score, 3),
            overall_risk=round(overall, 3),
            risk_label=label,
            dominant_risk_type=dominant
        )
        
        if episode_id:
            if episode_id in self.history:
                prev = self.history[episode_id]
                deltas = {
                    "Numeric Risk": result.numeric_risk - prev.numeric_risk,
                    "Temporal Risk": result.temporal_risk - prev.temporal_risk,
                    "Party-Obligation Risk": result.party_obligation_risk - prev.party_obligation_risk,
                    "Termination Risk": result.termination_risk - prev.termination_risk,
                    "Conditional Risk": result.conditional_risk - prev.conditional_risk
                }
                
                max_dim = max(deltas.items(), key=lambda x: x[1])
                magnitude = max_dim[1]
                attack_detected = any(d > 0.30 for d in deltas.values())
                
                result.delta = FingerprintDelta(
                    changed_most_dimension=max_dim[0],
                    magnitude=round(magnitude, 3),
                    attack_detected=attack_detected
                )
            
            # Update history
            self.history[episode_id] = result
            
        return result

dna_engine = ContractDNAEngine()
