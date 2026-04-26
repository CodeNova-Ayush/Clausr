import json
import os

def generate_clauses(count):
    clauses = []
    for i in range(1, count + 1):
        clauses.append({
            "id": f"clause_{i:02d}",
            "title": f"Standard Clause {i}",
            "text": f"This is standard clause text for section {i}. It details the obligations and responsibilities under normal operating conditions."
        })
    return clauses

def generate_easy():
    data = {
        "contract_id": "execution_easy_001",
        "task_id": "easy",
        "contract_text": "Execution Easy Contract",
        "clauses": generate_clauses(8),
        "execution_scenarios": [
            {
                "scenario_id": "scenario_01",
                "title": "Clean Execution",
                "description": "Employee logs time normally.",
                "actor": "Employee",
                "action_taken": "Submitted timesheet",
                "triggers_clauses": ["clause_01"],
                "crashes": False
            },
            {
                "scenario_id": "scenario_02",
                "title": "Clean Overlap",
                "description": "Manager approves timesheet with normal override.",
                "actor": "Manager",
                "action_taken": "Approved time",
                "triggers_clauses": ["clause_01", "clause_02"],
                "crashes": False
            },
            {
                "scenario_id": "scenario_03",
                "title": "Direct Crash",
                "description": "Vendor submits invoice on day 30, but finance system is locked.",
                "actor": "Vendor",
                "action_taken": "Submitted invoice",
                "triggers_clauses": ["clause_03", "clause_07"],
                "crashes": True,
                "crash_pair": {
                    "clause_a_id": "clause_03",
                    "clause_b_id": "clause_07"
                }
            }
        ]
    }
    
    # Specific edits for crash realism
    data["clauses"][2]["text"] = "Vendor invoices are payable strictly within 30 days of receipt."
    data["clauses"][6]["text"] = "All payments require a 45-day review period before funds can be released."

    return data

def generate_medium():
    data = {
        "contract_id": "execution_medium_001",
        "task_id": "medium",
        "contract_text": "Execution Medium Contract",
        "clauses": generate_clauses(25),
        "execution_scenarios": [
            {
                "scenario_id": f"scenario_{i:02d}",
                "title": f"Clean Scenario {i}",
                "description": "A standard operational action.",
                "actor": "Staff",
                "action_taken": "Standard processing",
                "triggers_clauses": [f"clause_{i:02d}"],
                "crashes": False
            } for i in range(1, 4)
        ] + [
            {
                "scenario_id": "scenario_04",
                "title": "Termination Crash",
                "description": "Client demands immediate termination, but vendor insists on cure period.",
                "actor": "Client",
                "action_taken": "Sent termination notice",
                "triggers_clauses": ["clause_12", "clause_18"],
                "crashes": True,
                "crash_pair": {
                    "clause_a_id": "clause_12",
                    "clause_b_id": "clause_18"
                }
            },
            {
                "scenario_id": "scenario_05",
                "title": "Audit Crash",
                "description": "Regulator demands 24hr access, but contract requires 10 days notice.",
                "actor": "Compliance",
                "action_taken": "Requested immediate audit",
                "triggers_clauses": ["clause_05", "clause_21"],
                "crashes": True,
                "crash_pair": {
                    "clause_a_id": "clause_05",
                    "clause_b_id": "clause_21"
                }
            }
        ]
    }
    return data

def generate_hard():
    data = {
        "contract_id": "execution_hard_001",
        "task_id": "hard",
        "contract_text": "Execution Hard Contract",
        "clauses": generate_clauses(60),
        "execution_scenarios": [
            {
                "scenario_id": f"scenario_{i:02d}",
                "title": f"Clean Complex {i}",
                "description": "Multi-clause interaction that resolves safely.",
                "actor": "System",
                "action_taken": "Automated workflow",
                "triggers_clauses": [f"clause_{i:02d}", f"clause_{i+1:02d}", f"clause_{i+2:02d}"],
                "crashes": False
            } for i in range(1, 6)
        ] + [
            {
                "scenario_id": "scenario_06",
                "title": "Data Loss Crash",
                "description": "Server failure requires immediate restore, but data retention policy deleted backups.",
                "actor": "IT Admin",
                "action_taken": "Initiated recovery",
                "triggers_clauses": ["clause_30", "clause_45"],
                "crashes": True,
                "crash_pair": {
                    "clause_a_id": "clause_30",
                    "clause_b_id": "clause_45"
                }
            },
            {
                "scenario_id": "scenario_07",
                "title": "License Transfer Crash",
                "description": "Acquired company attempts to transfer software licenses to parent.",
                "actor": "Legal",
                "action_taken": "Notice of assignment",
                "triggers_clauses": ["clause_08", "clause_55"],
                "crashes": True,
                "crash_pair": {
                    "clause_a_id": "clause_08",
                    "clause_b_id": "clause_55"
                }
            },
            {
                "scenario_id": "scenario_08",
                "title": "Liability Cap Crash",
                "description": "Customer sues for $5M under IP indemnity, but general cap limits all claims to $1M.",
                "actor": "Customer",
                "action_taken": "Filed lawsuit",
                "triggers_clauses": ["clause_22", "clause_59"],
                "crashes": True,
                "crash_pair": {
                    "clause_a_id": "clause_22",
                    "clause_b_id": "clause_59"
                }
            }
        ]
    }
    return data

if __name__ == "__main__":
    os.makedirs("data/contracts", exist_ok=True)
    
    with open("data/contracts/execution_easy_001.json", "w") as f:
        json.dump(generate_easy(), f, indent=2)
        
    with open("data/contracts/execution_medium_001.json", "w") as f:
        json.dump(generate_medium(), f, indent=2)
        
    with open("data/contracts/execution_hard_001.json", "w") as f:
        json.dump(generate_hard(), f, indent=2)
    
    print("Execution data files generated successfully.")
