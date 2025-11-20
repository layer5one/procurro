
import { GoogleGenAI, Type } from "@google/genai";
import { Job, Schedule, JobType } from '../types';

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
    throw new Error("API_KEY environment variable is not set");
}
const ai = new GoogleGenAI({ apiKey: API_KEY });

const responseSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        day: {
          type: Type.STRING,
          description: "Day of the week (e.g., Saturday, Sunday, Monday...)"
        },
        route: {
          type: Type.ARRAY,
          description: "An ordered list of service attempts for the day optimized for driving efficiency.",
          items: {
            type: Type.OBJECT,
            properties: {
              jobId: {
                type: Type.INTEGER,
                description: "The ID of the job to attempt."
              },
              time: {
                type: Type.STRING,
                description: "The suggested time for the attempt (e.g., '9:00 AM')."
              },
              attemptType: {
                type: Type.STRING,
                description: "The type of attempt being made (Morning, Afternoon, Evening, Weekend)."
              }
            },
            required: ["jobId", "time", "attemptType"]
          }
        }
      },
      required: ["day", "route"]
    }
};

const jobParseSchema = {
  type: Type.OBJECT,
  properties: {
    defendantName: { type: Type.STRING },
    address: { type: Type.STRING },
    type: { type: Type.STRING, enum: ["residential", "business"] },
    specialHandling: { type: Type.BOOLEAN },
    confidence: { type: Type.NUMBER, description: "Confidence score 0-1" }
  },
  required: ["defendantName", "address", "type"]
};

export async function parseJobFromText(text: string): Promise<any> {
  const prompt = `
    You are an AI assistant for a process server. 
    Analyze the following email text or work order snippet. 
    Extract the Defendant Name, Service Address, and determine if it is Residential or Business.
    If the text mentions "Rush" or "Priority", mark specialHandling as true.
    
    Input Text:
    """
    ${text}
    """
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: jobParseSchema,
      }
    });
    return JSON.parse(response.text.trim());
  } catch (e) {
    console.error("Parse error", e);
    throw new Error("Could not extract job details.");
  }
}

export async function generateWeeklySchedule(
    jobs: Job[],
    userLocation: { lat: number, lng: number } | null
): Promise<Schedule> {
  const prompt = `
    You are an expert logistics planner and process server dispatcher.
    Your goal is to solve the routing problem for a set of legal service jobs, minimizing driving time while strictly adhering to legal service windows.

    **The Work Week:** Saturday to Friday.

    **Legal Constraints & Rules:**
    1.  **Completion Criteria:** A job is done if Served OR 'Non-Service' determined (e.g. diligence met). 
    2.  **Required Attempt Types (Must have one of each to be diligent):**
        *   'Morning' (8am - 10am).
        *   'Afternoon' (10am - 6pm, Mon-Fri ONLY).
        *   'Evening' (6pm - 8pm).
        *   'Weekend' (Sat/Sun).
    3.  **Fresh Service Rules:**
        *   Residential jobs with 0 attempts: First attempt MUST be Weekend.
        *   Business jobs with 0 attempts: First attempt MUST be Monday.
    4.  **Efficiency:** Group geographically close addresses. 
        *   Start location: ${userLocation ? `${userLocation.lat}, ${userLocation.lng}` : 'Downtown Phoenix'}.
        *   Use your knowledge of local geography to cluster stops.
    5.  **Prioritization:** Jobs are due 2 weeks from 'assignedDate'. Clear older jobs first.

    **Current Active Jobs:**
    ${JSON.stringify(jobs.map(j => ({
        id: j.id,
        address: j.address,
        type: j.type,
        attemptsCount: j.attempts.length,
        lastAttempt: j.attempts[j.attempts.length -1]?.date
    })))}

    **Task:**
    Generate a 7-day JSON schedule. 
    - Logic: Analyze the address of every job. Group them by neighborhood.
    - Output: A strict JSON array matching the schema provided.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        thinkingConfig: { thinkingBudget: 4096 } 
      }
    });
    
    const textResponse = response.text.trim();
    const schedule = JSON.parse(textResponse);
    return schedule as Schedule;

  } catch (error) {
    console.error("Error generating schedule with Gemini:", error);
    throw new Error("Failed to parse schedule from Gemini response.");
  }
}
