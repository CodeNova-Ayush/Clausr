"""Generate contract data files for the Adversarial Arena environment."""

import json
from pathlib import Path


def create_adversarial_contract(filename, contract_id, task_id, title, clauses, obligation_taxonomy, forbidden_lexical_patterns=None):
    clause_list = []
    contract_text = ""
    for c in clauses:
        clause_list.append({"id": c["id"], "title": c["title"], "text": c["text"]})
        contract_text += f"{c['title']}\n{c['text']}\n\n"

    data = {
        "contract_id": contract_id,
        "task_id": task_id,
        "title": title,
        "contract_text": contract_text.strip(),
        "clauses": clause_list,
        "obligation_taxonomy": obligation_taxonomy,
        "forbidden_lexical_patterns": forbidden_lexical_patterns or [],
        "contradictions": [],
        "auditor_history": None,
    }

    out_dir = Path("data/contracts")
    out_dir.mkdir(parents=True, exist_ok=True)
    with open(out_dir / filename, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def build_adversarial_easy_001():
    clauses = [
        {"id": "clause_01", "title": "Parties", "text": "This Non-Disclosure Agreement is entered into between TechVentures Inc, a Delaware corporation (\"Disclosing Party\"), and InnovateCo Ltd, an Ontario corporation (\"Receiving Party\")."},
        {"id": "clause_02", "title": "Purpose", "text": "The parties wish to explore a potential joint venture in connection with which the Disclosing Party may share proprietary information with the Receiving Party."},
        {"id": "clause_03", "title": "Confidentiality Obligations", "text": "The Receiving Party shall protect all Confidential Information with at least the same degree of care it uses for its own proprietary information, for a period of two (2) years from disclosure."},
        {"id": "clause_04", "title": "Permitted Use", "text": "Confidential Information may only be used for the Purpose described herein and may not be used for any other commercial or non-commercial purpose."},
        {"id": "clause_05", "title": "Return of Materials", "text": "Upon termination, the Receiving Party shall return or destroy all materials containing Confidential Information within thirty (30) days."},
        {"id": "clause_06", "title": "Exclusions", "text": "Information that is publicly available, independently developed, or received from a third party without restriction shall not be considered Confidential Information."},
        {"id": "clause_07", "title": "Remedies", "text": "The Disclosing Party shall be entitled to seek injunctive relief in addition to any other remedies available at law or in equity."},
        {"id": "clause_08", "title": "Governing Law", "text": "This Agreement shall be governed by the laws of the State of Delaware without regard to conflict of laws principles."},
    ]

    taxonomy = [
        {"clause_id": "clause_03", "obligations": ["confidentiality"]},
        {"clause_id": "clause_04", "obligations": ["confidentiality", "ip_rights"]},
        {"clause_id": "clause_05", "obligations": ["delivery", "termination"]},
        {"clause_id": "clause_07", "obligations": ["liability"]},
    ]

    forbidden = ["day", "month", "year", "period", "confiden"]

    create_adversarial_contract(
        "adversarial_easy_001.json", "adversarial_easy_001", "adversarial_easy",
        "NDA between TechVentures Inc and InnovateCo Ltd",
        clauses, taxonomy, forbidden,
    )


def build_adversarial_easy_002():
    clauses = [
        {"id": "clause_01", "title": "Parties and Recitals", "text": "This Service Agreement is between CloudServe Corp, a California corporation (\"Provider\"), and DataFlow Inc, a Texas corporation (\"Client\")."},
        {"id": "clause_02", "title": "Service Description", "text": "Provider shall deliver cloud hosting, data storage, and API management services as described in Schedule A."},
        {"id": "clause_03", "title": "Service Level Agreement", "text": "Provider guarantees 99.9% uptime measured monthly, excluding scheduled maintenance communicated 48 hours in advance."},
        {"id": "clause_04", "title": "Fees", "text": "Client shall pay the monthly service fee set forth in the Order Form within thirty (30) days of invoice date."},
        {"id": "clause_05", "title": "Data Security", "text": "Provider shall encrypt all data at rest using AES-256 and in transit using TLS 1.2 or higher."},
        {"id": "clause_06", "title": "Liability Cap", "text": "Neither party's total liability shall exceed the fees paid during the twelve months preceding the claim."},
        {"id": "clause_07", "title": "Termination", "text": "Either party may terminate upon sixty (60) days written notice for any reason."},
        {"id": "clause_08", "title": "Dispute Resolution", "text": "Disputes shall be resolved through binding arbitration in San Francisco under AAA rules."},
    ]

    taxonomy = [
        {"clause_id": "clause_03", "obligations": ["delivery"]},
        {"clause_id": "clause_04", "obligations": ["payment"]},
        {"clause_id": "clause_05", "obligations": ["confidentiality"]},
        {"clause_id": "clause_06", "obligations": ["liability"]},
        {"clause_id": "clause_07", "obligations": ["termination"]},
    ]

    forbidden = ["uptime", "percent", "availab"]

    create_adversarial_contract(
        "adversarial_easy_002.json", "adversarial_easy_002", "adversarial_easy",
        "Cloud Service Agreement between CloudServe Corp and DataFlow Inc",
        clauses, taxonomy, forbidden,
    )


def build_adversarial_medium_001():
    clauses = [
        {"id": "clause_01", "title": "Preamble", "text": "This Software Licensing Agreement (\"Agreement\") is entered into between AlphaCode Systems, a Delaware corporation (\"Licensor\"), and MegaBank Financial Group, a national banking association (\"Licensee\")."},
        {"id": "clause_02", "title": "Definitions", "text": "\"Platform\" means the proprietary financial analytics suite. \"Licensed Territory\" means the United States and Canada. \"Authorized Users\" means employees and contractors designated by Licensee."},
        {"id": "clause_03", "title": "License Grant", "text": "Licensor grants Licensee a non-exclusive, non-transferable license to use the Platform within the Licensed Territory for internal financial analytics and regulatory reporting."},
        {"id": "clause_04", "title": "Implementation", "text": "Licensor shall provide implementation services including installation, configuration, data migration, and user acceptance testing within ninety (90) days of the Effective Date."},
        {"id": "clause_05", "title": "Annual License Fee", "text": "Licensee shall pay the annual license fee specified in the Order Form. All fees are non-refundable and payable within Net 30 days of invoice."},
        {"id": "clause_06", "title": "Support Services", "text": "Licensor shall provide Tier 1 through Tier 3 technical support during business hours (8 AM to 6 PM Eastern, Monday through Friday)."},
        {"id": "clause_07", "title": "Uptime Guarantee", "text": "Licensor guarantees Platform availability of 99.95% measured monthly, excluding scheduled maintenance communicated 72 hours in advance."},
        {"id": "clause_08", "title": "Data Backup", "text": "Licensor shall maintain automated daily backups with thirty (30) day retention and shall restore data from the most recent backup at no charge."},
        {"id": "clause_09", "title": "Security Standards", "text": "Licensor shall maintain SOC 2 Type II certification and comply with all applicable data protection regulations."},
        {"id": "clause_10", "title": "Intellectual Property", "text": "Licensor retains all right, title, and interest in the Platform. Licensee retains rights in Licensee Data."},
        {"id": "clause_11", "title": "Use Restrictions", "text": "The license is strictly limited to Licensee's internal operations. Sublicensing, resale, or provision of access to third parties is expressly prohibited."},
        {"id": "clause_12", "title": "Confidentiality", "text": "Each party shall maintain the confidentiality of the other party's proprietary information for five (5) years following termination."},
        {"id": "clause_13", "title": "Data Retention", "text": "Licensor shall retain all audit logs, transaction records, and system metadata for a minimum of seven (7) years to satisfy regulatory requirements."},
        {"id": "clause_14", "title": "Termination for Convenience", "text": "Either party may terminate this Agreement upon ninety (90) days written notice without cause."},
        {"id": "clause_15", "title": "Termination for Breach", "text": "Either party may terminate immediately if the other party commits a material breach that remains uncured for thirty (30) days after written notice."},
        {"id": "clause_16", "title": "Limitation of Liability", "text": "Neither party's total liability shall exceed the fees paid during the twelve (12) months preceding the claim."},
        {"id": "clause_17", "title": "Indemnification", "text": "Licensor shall indemnify Licensee against third-party IP infringement claims arising from use of the Platform."},
        {"id": "clause_18", "title": "Force Majeure", "text": "Neither party shall be liable for delays caused by events beyond reasonable control. The affected party must provide notice within 48 hours."},
        {"id": "clause_19", "title": "Compliance", "text": "Both parties shall comply with all applicable federal, state, and local laws and regulations."},
        {"id": "clause_20", "title": "Insurance", "text": "Licensor shall maintain professional liability insurance with minimum coverage of Two Million Dollars ($2,000,000)."},
        {"id": "clause_21", "title": "Audit Rights", "text": "Licensee may audit Licensor's compliance with this Agreement upon thirty (30) days written notice, once per calendar year."},
        {"id": "clause_22", "title": "Transition Services", "text": "Upon termination, Licensor shall provide transition assistance for one hundred twenty (120) days."},
        {"id": "clause_23", "title": "Governing Law", "text": "This Agreement shall be governed by the laws of the State of New York."},
        {"id": "clause_24", "title": "Dispute Resolution", "text": "Disputes shall be resolved through binding arbitration in New York City under AAA rules."},
        {"id": "clause_25", "title": "Entire Agreement", "text": "This Agreement constitutes the entire agreement and supersedes all prior negotiations and agreements."},
    ]

    taxonomy = [
        {"clause_id": "clause_03", "obligations": ["ip_rights"]},
        {"clause_id": "clause_05", "obligations": ["payment"]},
        {"clause_id": "clause_06", "obligations": ["delivery"]},
        {"clause_id": "clause_07", "obligations": ["delivery"]},
        {"clause_id": "clause_08", "obligations": ["delivery", "liability"]},
        {"clause_id": "clause_10", "obligations": ["ip_rights"]},
        {"clause_id": "clause_11", "obligations": ["ip_rights"]},
        {"clause_id": "clause_12", "obligations": ["confidentiality"]},
        {"clause_id": "clause_13", "obligations": ["confidentiality", "delivery"]},
        {"clause_id": "clause_14", "obligations": ["termination"]},
        {"clause_id": "clause_15", "obligations": ["termination"]},
        {"clause_id": "clause_16", "obligations": ["liability"]},
        {"clause_id": "clause_17", "obligations": ["liability"]},
        {"clause_id": "clause_20", "obligations": ["liability"]},
        {"clause_id": "clause_21", "obligations": ["confidentiality"]},
    ]

    forbidden = ["day", "month", "year", "net", "percent", "uptime"]

    create_adversarial_contract(
        "adversarial_medium_001.json", "adversarial_medium_001", "adversarial_medium",
        "Software Licensing Agreement between AlphaCode Systems and MegaBank Financial Group",
        clauses, taxonomy, forbidden,
    )


def build_adversarial_hard_001():
    clauses = []
    for i in range(1, 61):
        clauses.append({
            "id": f"clause_{i:02d}",
            "title": f"Enterprise Provision {i}",
            "text": f"Standard enterprise provision {i} governing the professional services relationship between the parties under applicable commercial law."
        })

    clauses[0] = {"id": "clause_01", "title": "Parties and Recitals", "text": "This Enterprise Master Services Agreement (\"MSA\") is entered into between Nexus Technologies Corp, a Delaware corporation (\"Vendor\"), and Continental Holdings Group, a multinational conglomerate headquartered in New York (\"Client\")."}
    clauses[1] = {"id": "clause_02", "title": "Definitions", "text": "\"Business Day\" means Monday through Friday, excluding federal holidays. \"Deliverables\" means all work product. \"Services\" means professional consulting, integration, and managed services. \"Confidential Information\" means all non-public information disclosed by either party."}
    clauses[2] = {"id": "clause_03", "title": "Scope of Services", "text": "Vendor shall provide enterprise technology consulting, systems integration, cloud migration, and application development services as specified in each Statement of Work."}
    clauses[3] = {"id": "clause_04", "title": "Statements of Work", "text": "Each engagement shall be governed by a separate Statement of Work referencing this MSA."}
    clauses[4] = {"id": "clause_05", "title": "Payment Terms", "text": "All invoices are payable within Net 30 days of receipt. Late payments accrue interest at 1.5% per month."}
    clauses[5] = {"id": "clause_06", "title": "Personnel", "text": "Vendor shall assign qualified personnel with relevant expertise. Client may request replacement of assigned personnel."}
    clauses[6] = {"id": "clause_07", "title": "License to Deliverables", "text": "Vendor grants Client a perpetual, worldwide, royalty-free license to use, modify, and create derivative works from all Deliverables."}
    clauses[7] = {"id": "clause_08", "title": "Recurring Services Payment", "text": "Managed services invoices follow Net 45 payment terms from invoice date."}
    clauses[8] = {"id": "clause_09", "title": "Vendor Liability Cap", "text": "Vendor's total aggregate liability shall not exceed Five Hundred Thousand Dollars ($500,000)."}
    clauses[9] = {"id": "clause_10", "title": "Service Warranty", "text": "Vendor warrants Services shall be performed in a professional manner consistent with industry standards."}
    clauses[10] = {"id": "clause_11", "title": "Vendor Indemnification", "text": "Vendor shall indemnify and defend Client against all third-party claims arising from Vendor's negligence or willful misconduct."}
    clauses[11] = {"id": "clause_12", "title": "Confidentiality", "text": "Each party shall protect Confidential Information with reasonable care for a period of three (3) years following termination."}
    clauses[12] = {"id": "clause_13", "title": "Client Audit Rights", "text": "Client may audit Vendor's systems, records, and processes at any time upon five (5) Business Days written notice."}
    clauses[13] = {"id": "clause_14", "title": "Data Processing Location", "text": "All primary data processing shall occur within facilities in the United States and Canada."}
    clauses[14] = {"id": "clause_15", "title": "Data Protection", "text": "Vendor shall comply with CCPA, GDPR, and applicable privacy laws. All personal data shall be encrypted at rest and in transit."}
    clauses[15] = {"id": "clause_16", "title": "Vendor Insurance", "text": "Vendor shall maintain general liability insurance of Two Million Dollars ($2,000,000) per occurrence and name Client as additional insured."}
    clauses[16] = {"id": "clause_17", "title": "Regulatory Compliance", "text": "Both parties shall comply with all applicable federal, state, and local laws."}
    clauses[17] = {"id": "clause_18", "title": "Deliverable Restrictions", "text": "Client may not modify, reverse engineer, decompile, or create derivative works from any Deliverables without Vendor's written approval."}
    clauses[18] = {"id": "clause_19", "title": "Non-Solicitation", "text": "During the term and for twelve (12) months after termination, neither party shall solicit the other's employees."}
    clauses[19] = {"id": "clause_20", "title": "Termination for Convenience", "text": "Either party may terminate this Agreement at any time upon thirty (30) days written notice without cause."}
    clauses[20] = {"id": "clause_21", "title": "Termination for Breach", "text": "Either party may terminate immediately upon material breach uncured for thirty (30) days after written notice."}
    clauses[21] = {"id": "clause_22", "title": "AP Processing Cycle", "text": "Client's accounts payable cycle requires sixty (60) days from invoice receipt before payment issuance."}
    clauses[22] = {"id": "clause_23", "title": "Transition Services", "text": "Upon termination, Vendor shall provide ninety (90) days of transition services."}
    clauses[23] = {"id": "clause_24", "title": "Change Management", "text": "Scope or fee changes require a signed Change Order."}
    clauses[24] = {"id": "clause_25", "title": "Termination for Cause Notice", "text": "For material breach, the non-breaching party may terminate upon fourteen (14) days written notice."}
    clauses[25] = {"id": "clause_26", "title": "Governing Law", "text": "This Agreement is governed by Delaware law."}
    clauses[26] = {"id": "clause_27", "title": "Dispute Resolution", "text": "Disputes shall be escalated to senior management, then binding arbitration under AAA rules in Wilmington, Delaware."}
    clauses[27] = {"id": "clause_28", "title": "Strategic Account Terms", "text": "Notwithstanding clause_08, strategic accounts designated by Vendor's CFO are eligible for Net 90 terms."}
    clauses[28] = {"id": "clause_29", "title": "Subcontracting", "text": "Vendor may subcontract with Client's prior written consent."}
    clauses[29] = {"id": "clause_30", "title": "Service Levels", "text": "Vendor shall meet SLA targets. Three consecutive months of SLA failures entitle Client to service credits."}
    clauses[30] = {"id": "clause_31", "title": "Aggregate Liability Cap", "text": "Total aggregate liability of either party, including indemnification, shall not exceed One Million Dollars ($1,000,000)."}
    clauses[31] = {"id": "clause_32", "title": "Export Controls", "text": "Neither party shall export data or software in violation of US export control laws."}
    clauses[32] = {"id": "clause_33", "title": "Anti-Corruption", "text": "Both parties comply with the FCPA and applicable anti-corruption laws."}
    clauses[33] = {"id": "clause_34", "title": "Records Retention", "text": "Each party shall maintain records related to this Agreement for five (5) years following termination."}
    clauses[34] = {"id": "clause_35", "title": "Mutual Indemnification Waiver", "text": "Each party shall defend itself against third-party claims. Neither party has any obligation to indemnify the other."}
    clauses[35] = {"id": "clause_36", "title": "Publicity", "text": "Neither party shall issue press releases about this Agreement without the other's written approval."}
    clauses[36] = {"id": "clause_37", "title": "Independent Contractors", "text": "The parties are independent contractors. Nothing creates a partnership, joint venture, or employment relationship."}
    clauses[37] = {"id": "clause_38", "title": "Response Time SLA", "text": "Vendor shall respond to Priority 1 incidents within four (4) Business Hours (8 AM to 8 PM Eastern, including Saturdays)."}
    clauses[38] = {"id": "clause_39", "title": "Background Checks", "text": "All Vendor personnel at Client facilities shall undergo background screening."}
    clauses[39] = {"id": "clause_40", "title": "Vendor Operational Confidentiality", "text": "Vendor's internal systems and processes are proprietary. Client has no right to inspect or audit Vendor's internal operations."}
    clauses[40] = {"id": "clause_41", "title": "Business Continuity", "text": "Vendor shall maintain and annually test a business continuity and disaster recovery plan."}
    clauses[41] = {"id": "clause_42", "title": "Accessibility", "text": "Software deliverables shall comply with WCAG 2.1 Level AA."}
    clauses[42] = {"id": "clause_43", "title": "Environmental Responsibility", "text": "Both parties commit to environmentally responsible operations."}
    clauses[43] = {"id": "clause_44", "title": "Client Insurance Responsibility", "text": "Client is solely responsible for all insurance coverage. Vendor assumes no insurance obligations."}
    clauses[44] = {"id": "clause_45", "title": "Technology Refresh", "text": "Vendor shall update infrastructure to current versions annually at no cost."}
    clauses[45] = {"id": "clause_46", "title": "Monthly Reports", "text": "Vendor shall provide monthly status reports by the fifth Business Day of each month."}
    clauses[46] = {"id": "clause_47", "title": "Escalation Matrix", "text": "Both parties shall follow the escalation matrix in Schedule C."}
    clauses[47] = {"id": "clause_48", "title": "Extended Termination Notice", "text": "For convenience termination, ninety (90) days written notice is required for orderly wind-down."}
    clauses[48] = {"id": "clause_49", "title": "Acceptance Testing", "text": "Client has fifteen (15) Business Days from delivery for acceptance testing."}
    clauses[49] = {"id": "clause_50", "title": "Code of Conduct", "text": "Vendor personnel shall adhere to Client's Code of Conduct on Client premises."}
    clauses[50] = {"id": "clause_51", "title": "Benchmarking", "text": "Client may engage an independent third party to benchmark Vendor's pricing annually."}
    clauses[51] = {"id": "clause_52", "title": "Minimum Commitment", "text": "Neither party may terminate for convenience during the initial twelve (12) month term. Thereafter, 180 days notice required."}
    clauses[52] = {"id": "clause_53", "title": "Survival", "text": "Confidentiality, Liability, Indemnification, IP, and Governing Law survive termination."}
    clauses[53] = {"id": "clause_54", "title": "Third-Party Software", "text": "Vendor ensures all third-party software in Deliverables is properly licensed."}
    clauses[54] = {"id": "clause_55", "title": "Severability", "text": "Invalid provisions do not affect the remaining provisions."}
    clauses[55] = {"id": "clause_56", "title": "Waiver", "text": "Failure to enforce a provision does not waive the right to enforce it later."}
    clauses[56] = {"id": "clause_57", "title": "Assignment", "text": "Assignment requires consent except for mergers or asset sales."}
    clauses[57] = {"id": "clause_58", "title": "DR Facilities", "text": "Backup replication and disaster recovery may use facilities outside the primary Territory, including EU and APAC data centers."}
    clauses[58] = {"id": "clause_59", "title": "Entire Agreement", "text": "This Agreement and all SOWs constitute the entire agreement."}
    clauses[59] = {"id": "clause_60", "title": "Counterparts", "text": "May be executed in counterparts."}

    taxonomy = [
        {"clause_id": "clause_05", "obligations": ["payment"]},
        {"clause_id": "clause_07", "obligations": ["ip_rights"]},
        {"clause_id": "clause_08", "obligations": ["payment"]},
        {"clause_id": "clause_09", "obligations": ["liability"]},
        {"clause_id": "clause_11", "obligations": ["liability"]},
        {"clause_id": "clause_12", "obligations": ["confidentiality"]},
        {"clause_id": "clause_13", "obligations": ["confidentiality"]},
        {"clause_id": "clause_14", "obligations": ["delivery"]},
        {"clause_id": "clause_16", "obligations": ["liability"]},
        {"clause_id": "clause_18", "obligations": ["ip_rights"]},
        {"clause_id": "clause_20", "obligations": ["termination"]},
        {"clause_id": "clause_22", "obligations": ["payment"]},
        {"clause_id": "clause_31", "obligations": ["liability"]},
        {"clause_id": "clause_35", "obligations": ["liability"]},
        {"clause_id": "clause_40", "obligations": ["confidentiality"]},
        {"clause_id": "clause_44", "obligations": ["liability"]},
        {"clause_id": "clause_48", "obligations": ["termination"]},
        {"clause_id": "clause_52", "obligations": ["termination"]},
    ]

    forbidden = ["day", "month", "year", "net", "dollar", "percent", "liabil"]

    create_adversarial_contract(
        "adversarial_hard_001.json", "adversarial_hard_001", "adversarial_hard",
        "Enterprise MSA between Nexus Technologies Corp and Continental Holdings Group",
        clauses, taxonomy, forbidden,
    )


if __name__ == "__main__":
    build_adversarial_easy_001()
    build_adversarial_easy_002()
    build_adversarial_medium_001()
    build_adversarial_hard_001()
    print("All adversarial contracts generated successfully.")
