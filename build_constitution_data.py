import json
import random
import os

CONTRACT_TYPES = [
    "Master Service Agreement",
    "Vendor Agreement",
    "Employment Agreement",
    "Non-Disclosure Agreement",
    "Software License Agreement"
]

CONTRADICTION_TYPES = [
    "Jurisdiction Conflict",
    "Confidentiality Scope Conflict",
    "IP Ownership Conflict",
    "Liability Cap Conflict",
    "Termination Notice Conflict"
]

CONFLICT_TEXTS = {
    "Jurisdiction Conflict": {
        "A": "All disputes arising from this agreement shall be resolved exclusively in the state and federal courts located in California.",
        "B": "Any controversy or claim arising out of or relating to this agreement shall be settled by binding arbitration in New York.",
        "C": "The parties agree that the exclusive jurisdiction and venue for any disputes shall be the courts of London, England.",
        "D": "Disputes shall be settled in the local courts of Delaware."
    },
    "Confidentiality Scope Conflict": {
        "A": "Confidential information shall include all materials disclosed by either party, whether marked confidential or not.",
        "B": "Confidential information is strictly limited to written documents explicitly stamped 'CONFIDENTIAL' prior to disclosure.",
        "C": "No information shall be deemed confidential unless explicitly identified as such in a separate written NDA addendum.",
        "D": "Only technical source code shall be considered confidential."
    },
    "IP Ownership Conflict": {
        "A": "All work product and intellectual property created under this agreement shall be the exclusive property of the Client.",
        "B": "The Vendor retains all right, title, and interest in and to any intellectual property created during the provision of services.",
        "C": "Intellectual property generated jointly shall be owned jointly by both parties, with neither having exclusive rights.",
        "D": "All intellectual property rights belong exclusively to the individual employee who authored them."
    },
    "Liability Cap Conflict": {
        "A": "Under no circumstances shall either party's liability exceed 1x the total annual fees paid under this agreement.",
        "B": "The total maximum liability of the Vendor for any claims is capped at 2x the annual fees paid.",
        "C": "Liability for direct damages shall not be limited and remains uncapped for both parties.",
        "D": "Liability is strictly capped at $10,000 USD regardless of fees paid."
    },
    "Termination Notice Conflict": {
        "A": "Either party may terminate this agreement for convenience upon providing thirty (30) days prior written notice.",
        "B": "Termination for convenience requires a minimum of ninety (90) days advance written notice by the terminating party.",
        "C": "This agreement may be terminated at any time with immediate effect upon written notification.",
        "D": "Termination is only permitted with a full six (6) months prior notice."
    }
}

GENERIC_CLAUSES = [
    "This agreement constitutes the entire understanding between the parties.",
    "No waiver of any provision of this agreement shall be effective unless in writing.",
    "The provisions of this agreement are severable, and if any provision is found to be invalid, the remainder shall continue in effect.",
    "This agreement may be executed in counterparts.",
    "Notices shall be deemed given when delivered in person or sent by registered mail.",
    "Neither party shall be liable for any delay caused by force majeure events.",
    "The parties are independent contractors and nothing herein creates a partnership or joint venture.",
    "This agreement may not be assigned without the prior written consent of the other party.",
    "Amendments to this agreement must be in writing and signed by both parties.",
    "Each party represents and warrants that it has the authority to enter into this agreement.",
    "The headings in this agreement are for convenience only and do not affect its interpretation."
]

def generate_portfolio(task_id, num_contracts, num_cross, chain_lengths):
    portfolio_contracts = []
    cross_contradictions = []
    cascade_chains = []

    selected_types = random.sample(CONTRACT_TYPES, num_contracts)
    
    contracts = {}
    for i, c_type in enumerate(selected_types):
        c_id = f"contract_{i+1}"
        prefix = c_type.lower().replace(" ", "_").replace("-", "_")
        contracts[c_id] = {
            "contract_id": c_id,
            "contract_type": c_type,
            "clauses": [],
            "prefix": prefix
        }

    cross_id_counter = 1
    
    for length in chain_lengths:
        needed_contracts = length + 1
        chain_contracts = random.sample(list(contracts.keys()), needed_contracts)
        
        chain_cross_ids = []
        c_type = random.choice(list(CONFLICT_TEXTS.keys()))
        texts = list(CONFLICT_TEXTS[c_type].values())
        
        for step in range(length):
            ca_id = chain_contracts[step]
            cb_id = chain_contracts[step+1]
            
            clause_a_id = f"{contracts[ca_id]['prefix']}_clause_{len(contracts[ca_id]['clauses']) + 1:02d}"
            clause_b_id = f"{contracts[cb_id]['prefix']}_clause_{len(contracts[cb_id]['clauses']) + 1:02d}"
            
            contracts[ca_id]['clauses'].append({
                "id": clause_a_id,
                "title": f"{c_type} Provision",
                "text": texts[step]
            })
            if step == length - 1:
                contracts[cb_id]['clauses'].append({
                    "id": clause_b_id,
                    "title": f"{c_type} Provision",
                    "text": texts[step + 1]
                })

            cross_id = f"cross_{cross_id_counter}"
            cross_id_counter += 1
            
            cross_contradictions.append({
                "id": cross_id,
                "contract_a_id": ca_id,
                "clause_a_id": clause_a_id,
                "contract_b_id": cb_id,
                "clause_b_id": clause_b_id,
                "contradiction_type": c_type,
                "explanation": f"Cascade link {step+1} of {length} for {c_type}"
            })
            chain_cross_ids.append(cross_id)
            
        cascade_chains.append(chain_cross_ids)

    remaining_cross = num_cross - sum(chain_lengths)
    
    for _ in range(remaining_cross):
        ca_id, cb_id = random.sample(list(contracts.keys()), 2)
        c_type = random.choice(list(CONFLICT_TEXTS.keys()))
        texts = list(CONFLICT_TEXTS[c_type].values())
        
        clause_a_id = f"{contracts[ca_id]['prefix']}_clause_{len(contracts[ca_id]['clauses']) + 1:02d}"
        clause_b_id = f"{contracts[cb_id]['prefix']}_clause_{len(contracts[cb_id]['clauses']) + 1:02d}"
        
        contracts[ca_id]['clauses'].append({
            "id": clause_a_id,
            "title": f"{c_type} Provision",
            "text": texts[0]
        })
        contracts[cb_id]['clauses'].append({
            "id": clause_b_id,
            "title": f"{c_type} Provision",
            "text": texts[1]
        })
        
        cross_id = f"cross_{cross_id_counter}"
        cross_id_counter += 1
        
        cross_contradictions.append({
            "id": cross_id,
            "contract_a_id": ca_id,
            "clause_a_id": clause_a_id,
            "contract_b_id": cb_id,
            "clause_b_id": clause_b_id,
            "contradiction_type": c_type,
            "explanation": f"Independent cross-contract conflict for {c_type}"
        })

    for c_id, c in contracts.items():
        target_size = random.randint(8, 20)
        while len(c["clauses"]) < target_size:
            idx = len(c["clauses"]) + 1
            cl_id = f"{c['prefix']}_clause_{idx:02d}"
            c["clauses"].append({
                "id": cl_id,
                "title": "General Provision",
                "text": random.choice(GENERIC_CLAUSES)
            })
        
        random.shuffle(c["clauses"])
        portfolio_contracts.append({
            "contract_id": c["contract_id"],
            "contract_type": c["contract_type"],
            "clauses": c["clauses"]
        })

    return {
        "task_id": task_id,
        "contracts": portfolio_contracts,
        "cross_contradictions": cross_contradictions,
        "cascade_chains": cascade_chains
    }

def main():
    os.makedirs("data/contracts", exist_ok=True)
    
    for i in range(1, 3):
        data = generate_portfolio("constitution_easy", 3, 2, [])
        with open(f"data/contracts/constitution_easy_{i:03d}.json", "w") as f:
            json.dump(data, f, indent=2)

    for i in range(1, 3):
        data = generate_portfolio("constitution_medium", 4, 5, [2])
        with open(f"data/contracts/constitution_medium_{i:03d}.json", "w") as f:
            json.dump(data, f, indent=2)

    for i in range(1, 3):
        data = generate_portfolio("constitution_hard", 5, 9, [3, 2])
        with open(f"data/contracts/constitution_hard_{i:03d}.json", "w") as f:
            json.dump(data, f, indent=2)

if __name__ == "__main__":
    main()
