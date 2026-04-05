import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function parseJSONResponse(text: string): any {
  try {
    // Try parsing directly first
    return JSON.parse(text);
  } catch (e) {
    console.warn("Direct JSON parse failed, attempting to clean response...");
    
    // Remove markdown code blocks if present
    let cleanedText = text.trim();
    if (cleanedText.startsWith("```json")) {
      cleanedText = cleanedText.substring(7);
    } else if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.substring(3);
    }
    if (cleanedText.endsWith("```")) {
      cleanedText = cleanedText.substring(0, cleanedText.length - 3);
    }
    
    cleanedText = cleanedText.trim();
    
    // If it's still failing and looks truncated, we might not be able to fix it,
    // but let's try to parse the cleaned text
    try {
      return JSON.parse(cleanedText);
    } catch (e2) {
      console.error("Failed to parse cleaned JSON. Raw text length:", text.length);
      console.error("Cleaned text snippet:", cleanedText.substring(0, 200) + "...");
      throw e2;
    }
  }
}

export async function extractBlockchainFacts(assetQuery: string) {
  const prompt = `
🧠 SYSTEM PROMPT — *Blockchain Forensics Agent (Shariah Mode)*

You are a **Blockchain Forensics Expert working for a Shariah Compliance Engine**.

Your task is **not** to give a ruling.
Your task is to extract **verifiable on-chain facts** about a crypto protocol that are relevant to Islamic legal analysis.

You must ignore marketing claims, whitepapers, and opinions.

You ONLY trust:
* Smart contract behavior
* On-chain transactions
* Tokenomics data
* Verified analytics sources

Primary data sources you are allowed to rely on:
* Etherscan
* CoinGecko
* DefiLlama

---

## 🎯 Your Objective

Given a **contract address, token name, or protocol URL**, produce a **Shariah Fact Sheet** in strict JSON.

This fact sheet will be used later by a Mufti AI to apply dalīl and issue a fatwa.

You are responsible for **Tahqīq al-Manāt** (verifying the reality of the case).

---

## 🔍 You must investigate and extract

### 1) Token Mechanics
* How tokens are minted
* Supply model (fixed / inflationary / emissions)
* Who controls minting

### 2) Revenue Source (CRITICAL)
Identify exactly how the protocol makes money:
* Lending interest?
* Trading fees?
* Token emissions?
* Liquidation penalties?
* Asset-backed revenue?

### 3) Staking / Yield Model
If users earn yield:
* Where does the yield come from?
  * Borrower interest → flag as ribā pattern
  * New token emissions → flag as gharar/ponzi risk
  * Real business revenue → mark clearly

### 4) User Activity Pattern
* Lending / borrowing
* Farming incentives
* Speculative liquidity mining
* Gambling-like mechanics

### 5) Governance & Control
* DAO voting?
* Admin keys?
* Upgradeable contracts?
* Central authority?

### 6) Asset Backing
* Is this backed by real assets?
* Or purely digital speculation?

---

## 🌍 Part 1 — Jurisdiction & ‘Urf Awareness

For the same protocol, legal classification and customary usage (‘urf) differ by country.

You must analyze how the protocol would be legally and customarily viewed in:
- Pakistan
- GCC countries (e.g. United Arab Emirates, Saudi Arabia)
- Malaysia
- United Kingdom

For each jurisdiction, determine from public regulatory stance:
- Is the token treated as: Currency, Security, Commodity, or Unregulated virtual asset?
- Is staking considered lending?
- Is yield considered interest legally?
- Is the protocol likely to be licensed, restricted, or banned?

This affects takyīf fiqhī (legal characterization in fiqh).
Do not guess. Base this on known regulatory posture and how similar tokens are treated.

---

## 📄 Part 2 — Whitepaper vs Reality Analyzer

You must now compare three things:
1. Whitepaper / website claims
2. Smart contract behavior (on-chain)
3. Treasury / admin wallet flows

Your task is to detect deception, mismatch, or hidden mechanics.

You must check:
- Claim: “No interest involved” -> Verify using: Check lending pools & yield source
- Claim: “Decentralized” -> Verify using: Check admin keys & upgrade rights
- Claim: “Asset backed” -> Verify using: Check treasury wallets
- Claim: “Revenue from fees” -> Verify using: Verify actual inflows
- Claim: “Deflationary” -> Verify using: Check mint/burn events

If on-chain behavior contradicts claims, set "deception_risk": true.
This is extremely important for Shariah because gharar and tadlīs (deception) affect rulings.

---

## 🚨 Shariah-Sensitive Pattern Detection

You must explicitly detect and flag:
- Lending with interest/APY -> riba_pattern: true
- Yield from borrower repayments -> riba_pattern: true
- Rewards only from emissions -> gharar_pattern: true
- Liquidity farming incentives -> maysir_pattern: true
- No asset backing -> currency_classification_risk: true
- Admin control -> ownership_risk: true

---

## ❌ You must NOT
* Give halal/haram ruling
* Cite Qur’an or hadith
* Do fiqh reasoning
* Trust whitepaper claims without on-chain proof

---

## ✅ You must
* Base every statement on observable blockchain or analytics data
* Be precise, factual, and technical
* Think like an auditor, not a scholar

---

## 🧠 Mindset Upgrade
You are no longer only: “What does the contract do?”
You are now also asking:
“Is the project honest about what it does?”
“How would this be legally viewed in different Muslim regions?”
Because both ‘urf and tadlīs directly affect fiqh rulings.

Analyze the following asset: "${assetQuery}"
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.1,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            token_type: { type: Type.STRING },
            minting_model: { type: Type.STRING },
            supply_control: { type: Type.STRING },
            revenue_source: { type: Type.STRING },
            staking_model: { type: Type.STRING },
            yield_source: { type: Type.STRING },
            governance_structure: { type: Type.STRING },
            user_activity_patterns: { type: Type.ARRAY, items: { type: Type.STRING } },
            asset_backing: { type: Type.BOOLEAN },
            riba_pattern: { type: Type.BOOLEAN },
            gharar_pattern: { type: Type.BOOLEAN },
            maysir_pattern: { type: Type.BOOLEAN },
            ownership_risk: { type: Type.BOOLEAN },
            currency_classification_risk: { type: Type.BOOLEAN },
            evidence: { type: Type.ARRAY, items: { type: Type.STRING } },
            jurisdiction_view: {
              type: Type.OBJECT,
              properties: {
                Pakistan: {
                  type: Type.OBJECT,
                  properties: {
                    legal_classification: { type: Type.STRING },
                    staking_view: { type: Type.STRING },
                    regulatory_risk: { type: Type.STRING }
                  },
                  required: ["legal_classification", "staking_view", "regulatory_risk"]
                },
                GCC: {
                  type: Type.OBJECT,
                  properties: {
                    legal_classification: { type: Type.STRING },
                    staking_view: { type: Type.STRING },
                    regulatory_risk: { type: Type.STRING }
                  },
                  required: ["legal_classification", "staking_view", "regulatory_risk"]
                },
                Malaysia: {
                  type: Type.OBJECT,
                  properties: {
                    legal_classification: { type: Type.STRING },
                    staking_view: { type: Type.STRING },
                    regulatory_risk: { type: Type.STRING }
                  },
                  required: ["legal_classification", "staking_view", "regulatory_risk"]
                },
                UK: {
                  type: Type.OBJECT,
                  properties: {
                    legal_classification: { type: Type.STRING },
                    staking_view: { type: Type.STRING },
                    regulatory_risk: { type: Type.STRING }
                  },
                  required: ["legal_classification", "staking_view", "regulatory_risk"]
                }
              },
              required: ["Pakistan", "GCC", "Malaysia", "UK"]
            },
            whitepaper_audit: {
              type: Type.OBJECT,
              properties: {
                claims: { type: Type.ARRAY, items: { type: Type.STRING } },
                onchain_findings: { type: Type.ARRAY, items: { type: Type.STRING } },
                mismatches_detected: { type: Type.ARRAY, items: { type: Type.STRING } },
                deception_risk: { type: Type.BOOLEAN }
              },
              required: ["claims", "onchain_findings", "mismatches_detected", "deception_risk"]
            }
          },
          required: [
            "token_type", "minting_model", "supply_control", "revenue_source", 
            "staking_model", "yield_source", "governance_structure", 
            "user_activity_patterns", "asset_backing", "riba_pattern", 
            "gharar_pattern", "maysir_pattern", "ownership_risk", 
            "currency_classification_risk", "evidence", "jurisdiction_view", "whitepaper_audit"
          ]
        }
      },
    });
    
    if (!response.text || response.text.trim() === "") {
      throw new Error("Empty response received from Gemini.");
    }
    
    console.log("Raw response text:", response.text);
    
    return parseJSONResponse(response.text);
  } catch (error) {
    console.error("Error extracting blockchain facts:", error);
    throw error;
  }
}

export async function analyzeAsset(assetQuery: string, factSheet: any) {
  const prompt = `
ROLE
You are a Firm-Level Shariah Compliance & Blockchain Intelligence Analyst for a cutting-edge Islamic fintech system.
You do not just score evidence; you follow the authentic methodology of usūl al-fiqh and produce firm-grade reporting.

You operate as a pipeline of specialized agents:
1) Dalīl Conflict Resolver Agent: Applies priority rules (Qur'an > Ijmā' > Sahih Hadith > Qiyās > Maslaḥah).
2) 'Illah Extraction Agent: Identifies the effective cause (e.g., thamaniyyah for currency).
3) Tahqīq al-Manāt Agent: Reality check. You have been provided a Blockchain Forensics Fact Sheet. You must use these verified on-chain facts to determine if the asset actually meets the 'illah conditions.
4) RegTech & 'Urf Integration: Consider the jurisdiction views and whitepaper audit findings provided in the Fact Sheet. Deception risk (tadlīs) and customary usage ('urf) must influence the final ruling.
5) Risk & Purification Agent: Calculate exposure to non-permissible revenue, gharar, maysir, riba, and centralization risks.
6) AAOIFI Retrieval Agent: Pull relevant clauses from AAOIFI standards (e.g., Islamic financial contracts, Sukuk structures, Digital assets, Shariah governance) and cross-reference with on-chain reality.
7) XAI & Knowledge Graph Integrator: Connect every piece of evidence, agent output, and decision into a linked knowledge graph. Provide human- and machine-readable explanations for every node and edge. Every claim must be traceable to a node in the graph.

🧠 USŪL AL-FIQH PROTOCOL & DALĪL WEIGHTING
1. Priority Rules: A clear Qur’ān text overrides qiyās. Ijmā‘ overrides individual hadith interpretation. Ṣaḥīḥ hadith overrides maslaḥah.
2. Dalīl Weighting:
   - Qur’an: 10 (Primary text)
   - Sahih Hadith: 9 (Authenticated Prophetic evidence)
   - Ijma‘: 9 (Scholarly consensus)
   - Qiyās: 7 (Analogical deduction)
   - Sadd al-dhara’i: 6 (Blocking harm)
   - Maslahah: 6 (Public interest)
   - AAOIFI Standards: 5 (Contemporary authoritative guidelines)
3. 'Illah Detection: Do not just keyword match. Extract the exact 'illah and map it.
4. Tahqīq al-Manāt: Verify the protocol mechanics against the 'illah using the provided Fact Sheet.
5. 'Urf & Tadlīs: If deception risk is detected, or if the asset is strictly regulated/banned in major jurisdictions, factor this into the ruling (e.g., maslahah mursalah or sadd al-dhara'i'). AAOIFI standards guide how local regulators in GCC, Malaysia, Pakistan, or UK may interpret the asset’s Shariah compliance.
6. Redundancy & Contrary Dalīl: Cluster redundant dalīl. Explicitly state contrary dalīl and why they are rejected.

📊 SCORING & STRENGTH
Calculate an internal score (0-100) based on the weight of the dalīl stack.
Map it to a category:
- 85–100: Qaṭ‘ī (decisive)
- 65–84: Ẓann Ghālib (Strong probability)
- 45–64: Ijtihādī (Legitimate difference)
- <45: Weak / needs research

⚠️ RISK & PURIFICATION METRICS
Calculate estimated percentages and risk scores (0-100) for:
- Non-permissible revenue percentage (requires purification)
- Riba exposure score
- Gharar exposure score
- Maysir exposure score
- Centralization / Ownership risk score

Highlight specific areas that require human Mufti review.

🕸️ KNOWLEDGE GRAPH & XAI
Generate a knowledge graph with nodes (facts, evidence, concepts) and edges (relationships).
Nodes must include: node_id, type, source, confidence (0-1), explicitness (0-1), notes.
Edges must include: from_node_id, to_node_id, relation_type (supports, contradicts, derived_from, regulated_by, impact_on), confidence, explanation.
Generate XAI explanations tracing the reasoning path from input evidence -> AI analysis -> risk flag -> Dalil score.

📄 OUTPUT FORMAT
You must output a structured JSON matching the schema.

Analyze the following asset: "${assetQuery}"

Here is the verified Blockchain Forensics Fact Sheet for Tahqīq al-Manāt:
${JSON.stringify(factSheet, null, 2)}
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.2,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            internalDebate: {
              type: Type.STRING,
              description: "The simulated internal debate and usul al-fiqh processing log."
            },
            ruling: {
              type: Type.STRING,
              description: "The preliminary ruling: Halal, Haram, Doubtful, or Requires deeper scholar review."
            },
            rulingScore: {
              type: Type.NUMBER,
              description: "Internal score from 0 to 100."
            },
            rulingStrength: {
              type: Type.STRING,
              description: "Qaṭ‘ī, Ẓann Ghālib, Ijtihādī, or Weak."
            },
            illahIdentified: {
              type: Type.STRING,
              description: "The effective cause identified (e.g., thamaniyyah)."
            },
            tahqiqAlManat: {
              type: Type.STRING,
              description: "Reality check: How the protocol meets or fails the illah conditions based on the Fact Sheet."
            },
            dalilNarrative: {
              type: Type.STRING,
              description: "A fatwa-style proof narrative explaining the ruling."
            },
            dalilStack: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  source: { type: Type.STRING },
                  grade: { type: Type.STRING },
                  weight: { type: Type.NUMBER },
                  description: { type: Type.STRING }
                },
                required: ["source", "grade", "weight", "description"]
              },
              description: "The stack of evidence used."
            },
            aaoifi_evidence: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  standard_id: { type: Type.STRING },
                  topic: { type: Type.STRING },
                  weight: { type: Type.NUMBER },
                  finding: { type: Type.STRING },
                  dalil_score_contribution: { type: Type.NUMBER },
                  relevance_notes: { type: Type.STRING }
                },
                required: ["standard_id", "topic", "weight", "finding", "dalil_score_contribution", "relevance_notes"]
              },
              description: "AAOIFI standards evidence."
            },
            contraryView: {
              type: Type.STRING,
              description: "Contrary dalil considered and why it was rejected."
            },
            riskMetrics: {
              type: Type.OBJECT,
              properties: {
                non_permissible_revenue_pct: { type: Type.NUMBER, description: "Estimated % of revenue from non-permissible sources" },
                riba_exposure_score: { type: Type.NUMBER, description: "0-100 score" },
                gharar_exposure_score: { type: Type.NUMBER, description: "0-100 score" },
                maysir_exposure_score: { type: Type.NUMBER, description: "0-100 score" },
                centralization_risk_score: { type: Type.NUMBER, description: "0-100 score" }
              },
              required: ["non_permissible_revenue_pct", "riba_exposure_score", "gharar_exposure_score", "maysir_exposure_score", "centralization_risk_score"]
            },
            areasNeedingReview: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Specific areas highlighted for human Mufti review."
            },
            knowledge_graph: {
              type: Type.OBJECT,
              properties: {
                nodes: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      node_id: { type: Type.STRING },
                      type: { type: Type.STRING },
                      source: { type: Type.STRING },
                      confidence: { type: Type.NUMBER },
                      explicitness: { type: Type.NUMBER },
                      notes: { type: Type.STRING }
                    },
                    required: ["node_id", "type", "source", "confidence", "explicitness", "notes"]
                  }
                },
                edges: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      from_node_id: { type: Type.STRING },
                      to_node_id: { type: Type.STRING },
                      relation_type: { type: Type.STRING },
                      confidence: { type: Type.NUMBER },
                      explanation: { type: Type.STRING }
                    },
                    required: ["from_node_id", "to_node_id", "relation_type", "confidence", "explanation"]
                  }
                }
              },
              required: ["nodes", "edges"]
            },
            xai_explanations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Human-readable explanations tracing the reasoning path."
            }
          },
          required: [
            "internalDebate", 
            "ruling", 
            "rulingScore", 
            "rulingStrength", 
            "illahIdentified", 
            "tahqiqAlManat", 
            "dalilNarrative", 
            "dalilStack", 
            "aaoifi_evidence",
            "contraryView",
            "riskMetrics",
            "areasNeedingReview",
            "knowledge_graph",
            "xai_explanations"
          ]
        }
      },
    });
    
    if (!response.text || response.text.trim() === "") {
      throw new Error("Empty response received from Gemini.");
    }
    
    console.log("Raw response text (analyzeAsset):", response.text);
    
    return parseJSONResponse(response.text);
  } catch (error) {
    console.error("Error generating analysis:", error);
    throw error;
  }
}



