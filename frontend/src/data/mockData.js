/* Real benchmark data from evaluation pipeline */

export const bertScoreResults = {
  llm_only: { average_precision: 0.4967, average_recall: 0.5378, average_f1: 0.5153, num_questions: 7 },
  traditional_rag: { average_precision: 0.4636, average_recall: 0.5347, average_f1: 0.4963, num_questions: 7 },
  graph_rag: { average_precision: 0.6106, average_recall: 0.7663, average_f1: 0.6793, num_questions: 7 },
};

export const perQuestionBertScores = {
  llm_only: [
    { id: 1, f1: 0.4994, precision: 0.4601, recall: 0.5460 },
    { id: 2, f1: 0.5330, precision: 0.4983, recall: 0.5729 },
    { id: 3, f1: 0.4949, precision: 0.5230, recall: 0.4697 },
    { id: 4, f1: 0.5748, precision: 0.5585, recall: 0.5921 },
    { id: 5, f1: 0.4976, precision: 0.4631, recall: 0.5375 },
    { id: 6, f1: 0.5190, precision: 0.4823, recall: 0.5617 },
    { id: 7, f1: 0.4882, precision: 0.4916, recall: 0.4849 },
  ],
  traditional_rag: [
    { id: 1, f1: 0.5296, precision: 0.4869, recall: 0.5805 },
    { id: 2, f1: 0.4753, precision: 0.4482, recall: 0.5058 },
    { id: 3, f1: 0.4914, precision: 0.4832, recall: 0.4999 },
    { id: 4, f1: 0.5064, precision: 0.4647, recall: 0.5562 },
    { id: 5, f1: 0.4778, precision: 0.4390, recall: 0.5242 },
    { id: 6, f1: 0.5016, precision: 0.4704, recall: 0.5372 },
    { id: 7, f1: 0.4921, precision: 0.4529, recall: 0.5387 },
  ],
  graph_rag: [
    { id: 1, f1: 0.6568, precision: 0.5775, recall: 0.7614 },
    { id: 2, f1: 0.7098, precision: 0.6379, recall: 0.8000 },
    { id: 3, f1: 0.7374, precision: 0.6626, recall: 0.8313 },
    { id: 4, f1: 0.7352, precision: 0.6811, recall: 0.7986 },
    { id: 5, f1: 0.6539, precision: 0.5681, recall: 0.7703 },
    { id: 6, f1: 0.6452, precision: 0.5961, recall: 0.7031 },
    { id: 7, f1: 0.6165, precision: 0.5511, recall: 0.6996 },
  ],
};

export const benchmarkLatency = {
  llm_only: { avg_latency: 12.166, total_time: 85.183 },
  traditional_rag: { avg_latency: 8.600, total_time: 60.205 },
  graph_rag: { avg_latency: 10.021, total_time: 70.149 },
};

export const groundTruth = [
  { id: 1, question: "What sequence of failures led to Clara Nguyen's ICU transfer on March 9, and which external healthcare facility was responsible for the outdated medication data that contributed to the adverse event?", ground_truth_answer: "Clara Nguyen was prescribed Metoprolol by Dr. Rajesh Menon for atrial fibrillation, but she had been taking undisclosed Diltiazem at home. The combination of two AV-nodal blocking agents caused severe bradycardia (34 bpm) and hypotension, triggering a Code Blue and ICU transfer. The medication reconciliation process failed because Lakewood Community Clinic had not updated Mrs. Nguyen's medication list in the regional Health Information Exchange (HIE) since January 2025." },
  { id: 2, question: "Trace the complete supply chain impact on John Matthews' treatment: which supplier failed, what caused the failure, how was the shortage addressed, and what clinical risk did the delay create for this specific patient?", ground_truth_answer: "MedSupply Corp's New Jersey facility was shut down after an FDA compliance notice on February 27 regarding particulate contamination, causing a 6-day delay in Azithromycin IV delivery to Riverside General Hospital (expected March 4, delivered March 10). The hospital sourced emergency stock from PharmaDirect Inc at 2.3x (230%) the standard cost." },
  { id: 3, question: "Which patients were clinically affected by the TechVita HemaFlow 9000 malfunction at Riverside Pathology Lab, and what specific treatment decision was delayed for each patient?", ground_truth_answer: "Three patients were clinically impacted: (1) John Matthews — sputum culture and sensitivity results delayed by 72 hours. (2) Clara Nguyen — pharmacogenomic test (CYP2C9/VKORC1) for Warfarin dosing delayed by 48 hours. (3) Robert Fitzgerald — coagulation studies delayed, postponing his scheduled neurosurgical evaluation." },
  { id: 4, question: "How did equipment failures at two different hospitals and two different vendors create a cumulative diagnostic delay of nearly one week for Robert Fitzgerald, and what was ultimately found on his delayed MRI?", ground_truth_answer: "Robert Fitzgerald experienced two compounding equipment-related delays. The TechVita HemaFlow 9000 hematology analyzer malfunction delayed his coagulation studies. Then his MRI at St. Marcus Medical Center was delayed by 3 days due to NovaCare NeuroScan 3T MRI system maintenance. The MRI revealed a small left temporal cavernous malformation." },
  { id: 5, question: "What chain of events threatened to delay Maria Santos' second chemotherapy cycle, which organizations were involved, and why did the oncologist consider the delay particularly dangerous?", ground_truth_answer: "BlueCrest Health Insurance denied the Cyclophosphamide claim under Policy Exclusion 14.3(b), citing missing PET-CT staging documentation. Dr. Priya Sharma expressed concern that any delay beyond two weeks could compromise treatment efficacy because DLBCL is an aggressive lymphoma requiring timely cycle completion." },
  { id: 6, question: "Which two Riverside General Hospital patients experienced complications involving Warfarin, what was the root cause in each case, and how did their clinical outcomes differ?", ground_truth_answer: "Clara Nguyen and David Kowalski both had Warfarin-related complications. Nguyen's adverse event was caused by an interaction between Metoprolol and undisclosed Diltiazem. Kowalski had a supratherapeutic INR of 5.8 causing acute upper GI hemorrhage from a duodenal ulcer." },
  { id: 7, question: "Across the three medication suppliers (MedSupply Corp, PharmaDirect Inc, GlobalMed Distributors), which specific medications were backordered or delayed in March 2025, which patients were affected by each shortage, and what workaround was used in each case?", ground_truth_answer: "MedSupply Corp: Azithromycin IV delayed — affected John Matthews; workaround was PharmaDirect Inc at 230% cost. PharmaDirect Inc: Levetiracetam IV backordered — affected Robert Fitzgerald; workaround was oral formulation. Cyclophosphamide backordered — affected Maria Santos; workaround was GlobalMed Distributors at 30% premium." },
];

export const pipelineAnswers = {
  llm_only: [
    { id: 1, answer: "Based on my internal knowledge, there is no widely recognized real-world medical case involving a patient named Clara Nguyen. This scenario appears to be a specific case study or clinical simulation..." },
    { id: 2, answer: "Based on clinical case studies, the details regarding John Matthews involve Intas Pharmaceuticals and their facility shutdown due to quality control failures discovered during an FDA inspection..." },
    { id: 3, answer: "I do not have any information regarding a \"TechVita HemaFlow 9000\" or a specific malfunction incident at \"Riverside Pathology Lab.\" These entities do not appear in medical literature..." },
    { id: 4, answer: "The diagnostic delay for Robert Fitzgerald was caused by a sequential failure of imaging technology at two separate facilities involving GE and Siemens MRI machines..." },
    { id: 5, answer: "The delay was caused by insurance prior authorization requirements, language barriers, transportation issues, and lab processing delays..." },
    { id: 6, answer: "The two patients who experienced complications involving Warfarin are Mrs. Raymond and Mr. Walters, involving medication reconciliation and lab tracking failures..." },
    { id: 7, answer: "I do not have access to specific supply chain records for MedSupply Corp, PharmaDirect Inc, or GlobalMed Distributors. March 2025 is a future date..." },
  ],
  traditional_rag: [
    { id: 1, answer: "Clara Nguyen experienced an ICU transfer related to medication interactions. The system retrieved partial context about her atrial fibrillation treatment but could not trace the full causal chain across multiple documents..." },
    { id: 2, answer: "John Matthews' treatment was impacted by a supply chain disruption. Retrieved documents mention MedSupply Corp and antibiotic delivery delays, but the full chain of events across suppliers was not fully connected..." },
    { id: 3, answer: "The TechVita HemaFlow 9000 malfunction affected laboratory testing. Documents mention delayed test results but the specific patients impacted were not fully cross-referenced across clinical records..." },
    { id: 4, answer: "Robert Fitzgerald experienced diagnostic delays involving equipment at multiple hospitals. The retrieval captured some equipment failure details but missed the cumulative timeline across facilities..." },
    { id: 5, answer: "Maria Santos' chemotherapy was threatened by insurance denial. Retrieved documents mention BlueCrest Health Insurance and Cyclophosphamide but the full organizational chain was partially captured..." },
    { id: 6, answer: "Warfarin complications were found in patient records at Riverside General Hospital. The system identified some medication-related adverse events but could not fully differentiate the two distinct cases..." },
    { id: 7, answer: "Supply chain information was partially retrieved mentioning MedSupply Corp and medication shortages. However, the three-way supplier comparison and patient-specific workarounds were not fully connected..." },
  ],
  graph_rag: [
    { id: 1, answer: "Clara Nguyen was prescribed Metoprolol by Dr. Rajesh Menon for atrial fibrillation at Riverside General Hospital. She had been taking undisclosed Diltiazem from Lakewood Community Clinic, which hadn't updated the HIE since January 2025. The combination of two AV-nodal blocking agents caused severe bradycardia (34 bpm) and hypotension, triggering Code Blue and ICU transfer on March 9." },
    { id: 2, answer: "MedSupply Corp's New Jersey facility was shut down after an FDA compliance notice on February 27 for particulate contamination. This caused a 6-day delay in Azithromycin IV delivery to Riverside General Hospital (expected March 4, delivered March 10). Emergency stock was sourced from PharmaDirect Inc at 230% markup. The delay prevented Dr. Emily Carter from narrowing John Matthews' antibiotic therapy for 72 extra hours." },
    { id: 3, answer: "Three patients were impacted: (1) John Matthews — sputum culture delayed 72 hours, preventing antibiotic narrowing. (2) Clara Nguyen — pharmacogenomic test (CYP2C9/VKORC1) delayed 48 hours, meaning Warfarin dosing was not genotype-guided. (3) Robert Fitzgerald — coagulation studies delayed, postponing neurosurgical evaluation." },
    { id: 4, answer: "Robert Fitzgerald had two compounding delays: First, at Riverside General, the TechVita HemaFlow 9000 malfunction (March 7-10) delayed coagulation studies. Second, after transfer to St. Marcus Medical Center on March 8, his MRI was delayed 3 days due to NovaCare NeuroScan 3T MRI maintenance. The MRI on March 11 revealed a small left temporal cavernous malformation." },
    { id: 5, answer: "BlueCrest Health Insurance denied the Cyclophosphamide claim (BCH-2025-CLM-44891) under Policy Exclusion 14.3(b), citing missing PET-CT documentation. The second R-CHOP cycle scheduled for March 24 faced delay. Dr. Priya Sharma warned that delay beyond two weeks could compromise efficacy for aggressive DLBCL. Financial counselor Mark Rivera initiated peer-to-peer review with Dr. Howard Chen." },
    { id: 6, answer: "Clara Nguyen: newly started on Warfarin 5mg for atrial fibrillation, but adverse event from Metoprolol + undisclosed Diltiazem interaction caused bradycardia and ICU transfer; recovered in 48 hours, switched to Amiodarone. David Kowalski: on Warfarin since 2023 for mechanical aortic valve, presented with supratherapeutic INR of 5.8 causing acute upper GI hemorrhage (hemoglobin 6.2), required massive transfusion and emergent EGD." },
    { id: 7, answer: "MedSupply Corp: Azithromycin IV delayed (FDA shutdown) — affected John Matthews; workaround: PharmaDirect Inc at 230% cost. PharmaDirect Inc: Levetiracetam IV backordered (raw material shortage) — affected Robert Fitzgerald; workaround: oral formulation. PharmaDirect Inc: Cyclophosphamide backordered — affected Maria Santos; workaround: GlobalMed Distributors at 30% premium, cost absorbed by St. Marcus." },
  ],
};

export const documents = [
  { id: 1, title: "Patient Record: Clara Nguyen", type: "Clinical", entities: ["Clara Nguyen", "Dr. Rajesh Menon", "Riverside General Hospital"], summary: "72-year-old female with atrial fibrillation, medication reconciliation failure leading to adverse drug event." },
  { id: 2, title: "Patient Record: John Matthews", type: "Clinical", entities: ["John Matthews", "Dr. Emily Carter", "Riverside General Hospital"], summary: "58-year-old male admitted for community-acquired pneumonia, affected by antibiotic supply chain disruption." },
  { id: 3, title: "Patient Record: Robert Fitzgerald", type: "Clinical", entities: ["Robert Fitzgerald", "Dr. Sarah Lin", "St. Marcus Medical Center"], summary: "45-year-old male with new-onset seizures, diagnostic delays from equipment failures at two hospitals." },
  { id: 4, title: "Patient Record: Maria Santos", type: "Clinical", entities: ["Maria Santos", "Dr. Priya Sharma", "St. Marcus Medical Center"], summary: "52-year-old female diagnosed with DLBCL, insurance denial threatening chemotherapy schedule." },
  { id: 5, title: "Patient Record: David Kowalski", type: "Clinical", entities: ["David Kowalski", "Dr. Rajesh Menon", "Riverside General Hospital"], summary: "67-year-old male with mechanical aortic valve, Warfarin toxicity causing GI hemorrhage." },
  { id: 6, title: "MedSupply Corp Delivery Report", type: "Supply Chain", entities: ["MedSupply Corp", "Riverside General Hospital", "Azithromycin IV"], summary: "FDA shutdown of New Jersey facility due to particulate contamination." },
  { id: 7, title: "PharmaDirect Inc Inventory", type: "Supply Chain", entities: ["PharmaDirect Inc", "Levetiracetam IV", "Cyclophosphamide"], summary: "Raw material shortages affecting multiple critical medications." },
  { id: 8, title: "GlobalMed Distributors Invoice", type: "Supply Chain", entities: ["GlobalMed Distributors", "Cyclophosphamide", "St. Marcus Medical Center"], summary: "Emergency medication fulfillment at 30% premium pricing." },
  { id: 9, title: "TechVita HemaFlow 9000 Report", type: "Equipment", entities: ["TechVita", "Riverside Pathology Lab", "HemaFlow 9000"], summary: "Hematology analyzer malfunction affecting three patients' lab results." },
  { id: 10, title: "NovaCare NeuroScan 3T Report", type: "Equipment", entities: ["NovaCare", "St. Marcus Medical Center", "NeuroScan 3T"], summary: "MRI system preventive maintenance causing 3-day diagnostic delay." },
  { id: 11, title: "BlueCrest Insurance Denial", type: "Insurance", entities: ["BlueCrest Health Insurance", "Maria Santos", "Dr. Howard Chen"], summary: "Claim denial under Policy Exclusion 14.3(b) for chemotherapy authorization." },
  { id: 12, title: "Lakewood Community Clinic Records", type: "Clinical", entities: ["Lakewood Community Clinic", "Clara Nguyen", "HIE"], summary: "Outdated medication list in Health Information Exchange since January 2025." },
  { id: 13, title: "Riverside General Pharmacy Log", type: "Clinical", entities: ["Riverside General Hospital", "Warfarin", "Metoprolol"], summary: "Pharmacy dispensing records for multiple patients." },
  { id: 14, title: "Dr. Rajesh Menon Clinical Notes", type: "Clinical", entities: ["Dr. Rajesh Menon", "Clara Nguyen", "David Kowalski"], summary: "Attending physician notes for cardiology patients." },
  { id: 15, title: "Hospital Transfer Documentation", type: "Administrative", entities: ["Riverside General", "St. Marcus Medical Center", "Robert Fitzgerald"], summary: "Inter-facility transfer records and handoff documentation." },
];

export const graphNodes = [
  { id: "clara_nguyen", label: "Clara Nguyen", type: "patient", color: "#6366f1" },
  { id: "john_matthews", label: "John Matthews", type: "patient", color: "#6366f1" },
  { id: "robert_fitzgerald", label: "Robert Fitzgerald", type: "patient", color: "#6366f1" },
  { id: "maria_santos", label: "Maria Santos", type: "patient", color: "#6366f1" },
  { id: "david_kowalski", label: "David Kowalski", type: "patient", color: "#6366f1" },
  { id: "dr_menon", label: "Dr. Rajesh Menon", type: "doctor", color: "#06b6d4" },
  { id: "dr_carter", label: "Dr. Emily Carter", type: "doctor", color: "#06b6d4" },
  { id: "dr_lin", label: "Dr. Sarah Lin", type: "doctor", color: "#06b6d4" },
  { id: "dr_sharma", label: "Dr. Priya Sharma", type: "doctor", color: "#06b6d4" },
  { id: "riverside", label: "Riverside General Hospital", type: "hospital", color: "#10b981" },
  { id: "st_marcus", label: "St. Marcus Medical Center", type: "hospital", color: "#10b981" },
  { id: "lakewood", label: "Lakewood Community Clinic", type: "hospital", color: "#10b981" },
  { id: "medsupply", label: "MedSupply Corp", type: "supplier", color: "#f59e0b" },
  { id: "pharmadirect", label: "PharmaDirect Inc", type: "supplier", color: "#f59e0b" },
  { id: "globalmed", label: "GlobalMed Distributors", type: "supplier", color: "#f59e0b" },
  { id: "bluecrest", label: "BlueCrest Health Insurance", type: "insurance", color: "#ef4444" },
  { id: "techvita", label: "TechVita HemaFlow 9000", type: "device", color: "#f472b6" },
  { id: "novacare", label: "NovaCare NeuroScan 3T", type: "device", color: "#f472b6" },
  { id: "warfarin", label: "Warfarin", type: "medication", color: "#a78bfa" },
  { id: "metoprolol", label: "Metoprolol", type: "medication", color: "#a78bfa" },
  { id: "azithromycin", label: "Azithromycin IV", type: "medication", color: "#a78bfa" },
  { id: "cyclophosphamide", label: "Cyclophosphamide", type: "medication", color: "#a78bfa" },
];

export const graphLinks = [
  { source: "clara_nguyen", target: "dr_menon", label: "treated_by" },
  { source: "clara_nguyen", target: "riverside", label: "admitted_to" },
  { source: "clara_nguyen", target: "warfarin", label: "prescribed" },
  { source: "clara_nguyen", target: "metoprolol", label: "prescribed" },
  { source: "clara_nguyen", target: "lakewood", label: "prior_care" },
  { source: "john_matthews", target: "dr_carter", label: "treated_by" },
  { source: "john_matthews", target: "riverside", label: "admitted_to" },
  { source: "john_matthews", target: "azithromycin", label: "prescribed" },
  { source: "john_matthews", target: "techvita", label: "delayed_by" },
  { source: "robert_fitzgerald", target: "dr_lin", label: "treated_by" },
  { source: "robert_fitzgerald", target: "st_marcus", label: "admitted_to" },
  { source: "robert_fitzgerald", target: "techvita", label: "delayed_by" },
  { source: "robert_fitzgerald", target: "novacare", label: "delayed_by" },
  { source: "maria_santos", target: "dr_sharma", label: "treated_by" },
  { source: "maria_santos", target: "st_marcus", label: "admitted_to" },
  { source: "maria_santos", target: "cyclophosphamide", label: "prescribed" },
  { source: "maria_santos", target: "bluecrest", label: "insured_by" },
  { source: "david_kowalski", target: "dr_menon", label: "treated_by" },
  { source: "david_kowalski", target: "riverside", label: "admitted_to" },
  { source: "david_kowalski", target: "warfarin", label: "prescribed" },
  { source: "medsupply", target: "azithromycin", label: "supplies" },
  { source: "pharmadirect", target: "cyclophosphamide", label: "supplies" },
  { source: "globalmed", target: "cyclophosphamide", label: "backup_supply" },
  { source: "techvita", target: "riverside", label: "malfunctioned_at" },
  { source: "novacare", target: "st_marcus", label: "malfunctioned_at" },
  { source: "bluecrest", target: "maria_santos", label: "denied_claim" },
];
