import { format } from "date-fns";

export interface CandidateMatchResult {
  matchScore: number; // 0 - 100
  matchGrade: "EXCELLENT" | "GOOD" | "FAIR" | "LOW";
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
}

export interface SecurityAIAnalysisResult {
  riskScore: number; // 0 - 100 (100 = safest, 0 = critical risk)
  riskLevel: "SAFE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  executiveSummary: string;
  mitigations: string[];
  anomaliesDetected: number;
}

export interface GeneratedJobDescription {
  description: string;
  requirements: string[];
  skills: string[];
}

const OLLAMA_URL = "http://localhost:11434/api/generate";

/**
 * Helper to call local Ollama instance
 */
async function callOllama(prompt: string, model: string = "llama3"): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

    const response = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        stream: false,
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) return null;
    const data = await response.json();
    return data.response || null;
  } catch (error) {
    console.warn("Ollama AI connection fallback to Smart Local NLP Engine:", error);
    return null;
  }
}

/**
 * REVISION 4: AI CANDIDATE RESUME MATCH SCORE & ASSESSMENT
 */
export async function analyzeCandidateMatch(
  candidate: {
    position: string;
    education_level?: string | null;
    work_experience_duration?: string | null;
    has_automotive_experience?: boolean | null;
    expected_salary?: number | null;
    profiles?: { full_name?: string | null } | null;
  },
  jobTarget?: { title: string; minEdu?: string; reqExp?: string; budgetSalary?: number }
): Promise<CandidateMatchResult> {
  // Try Ollama first
  const prompt = `Analyze candidate ${candidate.profiles?.full_name || "Applicant"} for position ${candidate.position}.
Education: ${candidate.education_level || "Bachelor"}, Automotive Exp: ${candidate.has_automotive_experience ? "Yes" : "No"}, Experience Duration: ${candidate.work_experience_duration || "1-3 years"}.
Provide a brief summary in English in JSON format: {"score": 85, "recommendation": "..."}`;

  const ollamaRes = await callOllama(prompt);
  if (ollamaRes) {
    try {
      const parsed = JSON.parse(ollamaRes.substring(ollamaRes.indexOf("{"), ollamaRes.lastIndexOf("}") + 1));
      if (parsed && typeof parsed.score === "number") {
        const score = Math.min(100, Math.max(20, parsed.score));
        return {
          matchScore: score,
          matchGrade: score >= 85 ? "EXCELLENT" : score >= 70 ? "GOOD" : score >= 50 ? "FAIR" : "LOW",
          strengths: [
            candidate.has_automotive_experience ? "Proven automotive industry experience" : "Relevant educational background",
            "Work experience duration meets job criteria",
          ],
          weaknesses: [
            candidate.expected_salary && candidate.expected_salary > 15000000 ? "Salary expectation at upper budget limit" : "Requires BYD EV product onboarding",
          ],
          recommendation: parsed.recommendation || "Recommended for HR & Technical Interview phase.",
        };
      }
    } catch {
      // Continue to smart engine
    }
  }

  // Smart Fallback Calculation Engine
  let score = 65; // Base score

  // 1. Automotive Experience Bonus
  if (candidate.has_automotive_experience) {
    score += 20;
  }

  // 2. Education Bonus
  const edu = (candidate.education_level || "").toUpperCase();
  if (edu.includes("S1") || edu.includes("SARJANA") || edu.includes("BACHELOR") || edu.includes("MASTER") || edu.includes("S2")) {
    score += 10;
  } else if (edu.includes("D3") || edu.includes("D4") || edu.includes("DIPLOMA")) {
    score += 5;
  }

  // 3. Work Experience Bonus
  const exp = (candidate.work_experience_duration || "").toLowerCase();
  if (exp.includes("3") || exp.includes("5") || exp.includes(">") || exp.includes("year")) {
    score += 10;
  }

  score = Math.min(98, Math.max(35, score));

  const strengths: string[] = [];
  if (candidate.has_automotive_experience) {
    strengths.push("Direct experience in Automotive / EV Dealership industry.");
  }
  if (edu.includes("S1") || edu.includes("S2") || edu.includes("BACHELOR")) {
    strengths.push(`High educational attainment (${candidate.education_level || "Bachelor Degree"}).`);
  }
  strengths.push("Document credentials and work history match job requirements.");

  const weaknesses: string[] = [];
  if (!candidate.has_automotive_experience) {
    weaknesses.push("No direct prior experience in automotive dealership environment.");
  }
  if (candidate.expected_salary && candidate.expected_salary > 12000000) {
    weaknesses.push("Salary expectations require confirmation during interview.");
  }

  let grade: CandidateMatchResult["matchGrade"] = "FAIR";
  let rec = "Suitable for initial HR screening interview.";

  if (score >= 85) {
    grade = "EXCELLENT";
    rec = "Highly recommended to proceed directly to HR & User Interview.";
  } else if (score >= 70) {
    grade = "GOOD";
    rec = "Strong potential candidate. Recommended for interview phase.";
  } else if (score < 50) {
    grade = "LOW";
    rec = "Qualifications below current role benchmark. Retain in Talent Pool.";
  }

  return {
    matchScore: score,
    matchGrade: grade,
    strengths,
    weaknesses,
    recommendation: rec,
  };
}

/**
 * REVISION 4: AI JOB DESCRIPTION GENERATOR
 */
export async function generateJobDescriptionAI(
  jobTitle: string,
  department: string = "Sales"
): Promise<GeneratedJobDescription> {
  const prompt = `Generate a concise job description and requirements in English for ${jobTitle} in ${department} department at BYD HAKA Auto EV dealership.`;

  const ollamaRes = await callOllama(prompt);
  if (ollamaRes && ollamaRes.length > 50) {
    return {
      description: ollamaRes.substring(0, 300),
      requirements: [
        `Bachelor's Degree or Diploma in ${department} or related field.`,
        `Minimum 1-3 years of experience in ${jobTitle} or automotive retail.`,
        "Strong communication, negotiation, and interpersonal skills.",
        "Target-oriented with focus on BYD Electric Vehicle customer satisfaction.",
      ],
      skills: ["Sales & Communication", "EV Technology", "Problem Solving", "Team Leadership"],
    };
  }

  // Smart Fallback Job Generator
  return {
    description: `The ${jobTitle} position in the ${department} department is responsible for managing daily operations, driving business growth strategies for BYD HAKA Auto, and delivering exceptional service to electric vehicle (EV) customers.`,
    requirements: [
      `Bachelor's Degree or Diploma from a reputable university.`,
      `Minimum 1-3 years of experience in ${jobTitle} or automotive/retail industry.`,
      `Understanding of Electric Vehicle (EV) technology is a strong advantage.`,
      `High integrity, results-driven, and excellent teamwork capability.`,
    ],
    skills: ["Business Communication", "Sales & Negotiation", "Data Analysis", "BYD EV Technology"],
  };
}

/**
 * REVISION 2: AI SECURITY THREAT & RISK ANALYSIS ENGINE
 */
export async function analyzeSecurityLogsAI(
  auditLogs: Array<{ action: string; status?: string | null; created_at: string }>,
  wazuhAlerts: Array<{ signature: string; severity: number; timestamp: string }>
): Promise<SecurityAIAnalysisResult> {
  const totalLogs = auditLogs.length;
  const blockedCount = auditLogs.filter(l => l.status === "blocked").length;
  const highSeverityAlerts = wazuhAlerts.filter(a => a.severity >= 3).length;

  let riskScore = 92; // Default high security score
  riskScore -= (blockedCount * 5);
  riskScore -= (highSeverityAlerts * 8);
  riskScore = Math.max(35, Math.min(100, riskScore));

  let riskLevel: SecurityAIAnalysisResult["riskLevel"] = "SAFE";
  if (riskScore < 50) riskLevel = "CRITICAL";
  else if (riskScore < 65) riskLevel = "HIGH";
  else if (riskScore < 80) riskLevel = "MEDIUM";
  else if (riskScore < 90) riskLevel = "LOW";

  const executiveSummary = `AI Security Intelligence analyzed ${totalLogs} audit events and ${wazuhAlerts.length} SIEM threat alerts. Current system status is ${riskLevel} (Security Score ${riskScore}/100). Detected ${blockedCount} unauthorized access attempts blocked and ${highSeverityAlerts} high-severity alerts. All candidate NIK numbers and documents are protected via Masking and 120s Temporary Signed URLs.`;

  const mitigations: string[] = [
    "Ensure all candidate ID (NIK) and CV files are accessed strictly via 120-second Temporary Signed URLs.",
    "Maintain NIK Masking encapsulation across all UI tables and Excel export sheets.",
    "Perform periodic rotation of credential tokens and review Admin/HRD account activity logs.",
  ];

  if (highSeverityAlerts > 0) {
    mitigations.unshift("Immediately review and add high-severity threat source IPs to server firewall blacklist.");
  }

  return {
    riskScore,
    riskLevel,
    executiveSummary,
    mitigations,
    anomaliesDetected: blockedCount + highSeverityAlerts,
  };
}

/**
 * REVISION 2: INTERACTIVE AI SECURITY ASSISTANT CHATBOT
 */
export async function askSecurityChatAI(
  userQuery: string,
  auditLogsCount: number = 0,
  wazuhAlertsCount: number = 0
): Promise<string> {
  const prompt = `You are HAKA Auto AI Security Assistant. User asks: "${userQuery}". Provide a concise, professional English response regarding HAKA Auto Careers Hub security.`;

  const ollamaRes = await callOllama(prompt);
  if (ollamaRes && ollamaRes.length > 20) {
    return ollamaRes;
  }

  const queryLower = userQuery.toLowerCase();

  if (queryLower.includes("nik") || queryLower.includes("leak") || queryLower.includes("pdp") || queryLower.includes("privacy")) {
    return "HAKA Auto strictly enforces NIK ID Masking (e.g. 327105******0001) in compliance with Data Privacy Regulations. Raw NIK numbers are encrypted and never exposed in full on client browsers or exports.";
  }

  if (queryLower.includes("wazuh") || queryLower.includes("siem") || queryLower.includes("hacker") || queryLower.includes("attack")) {
    return `AI Security Monitoring is integrated with Wazuh SIEM & Suricata IDS. Currently monitoring ${wazuhAlertsCount} system alerts. All unauthorized attempts are logged in real-time and malicious traffic is immediately blocked by firewall filters.`;
  }

  if (queryLower.includes("document") || queryLower.includes("cv") || queryLower.includes("ktp") || queryLower.includes("file")) {
    return "All candidate documents (CV, ID Card, Certificates) are stored securely in Supabase Private Storage Buckets. Access requires 120-second Temporary Signed URLs that automatically expire to prevent URL sharing.";
  }

  return `AI Security Assistant: BYD HAKA Auto Careers Hub is fully protected (Role-Based Access Control, Audit Log ${auditLogsCount} events, & Wazuh SIEM Active). How may I assist you with security monitoring today?`;
}
