
import { GoogleGenAI, Type } from "@google/genai";
import { Job, Schedule } from '../types';

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
          description: "An ordered list of service attempts for the day.",
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

export async function generateWeeklySchedule(
    jobs: Job[],
    userLocation: { lat: number, lng: number } | null
): Promise<Schedule> {
  const prompt = `
    You are an expert dispatcher for a process serving company in Maricopa County, Arizona. Your task is to create an efficient 7-day weekly schedule for a process server. The work week starts on Saturday and ends on Friday.

    **Rules:**
    1.  **Job Completion:** A job is complete if successfully served OR it has 4 valid attempts. Do not schedule completed jobs.
    2.  **Required Attempts (4 total):**
        *   One 'Morning' attempt (8am - 10am, any day).
        *   One 'Afternoon' attempt (10am - 6pm, WEEKDAYS ONLY: Mon-Fri).
        *   One 'Evening' attempt (6pm - 8pm, any day).
        *   One 'Weekend' attempt (any time on Saturday or Sunday).
    3.  **First Attempt Rule:**
        *   For jobs with type 'residential' and no prior attempts, the first attempt must be on a weekend (Saturday or Sunday).
        *   For jobs with type 'business' and no prior attempts, the first attempt must be on a Monday during business hours.
    4.  **Due Dates:** Jobs are due 2 weeks from their 'assignedDate'. Prioritize completing jobs within the first week unless 'specialHandling' is true.
    5.  **Efficiency:** Create daily routes that minimize travel time. Group jobs that are geographically close. The server starts from ${userLocation ? `latitude: ${userLocation.lat}, longitude: ${userLocation.lng}` : 'an unknown location in central Phoenix'}. Use map data to optimize routing.
    6.  **Existing Attempts:** Review the 'attempts' list for each job. Only schedule the remaining required attempt types. Do not schedule more than 4 total attempts.

    **Current Active Jobs:**
    ${JSON.stringify(jobs)}

    **Your Task:**
    Generate a 7-day schedule (Saturday to Friday) in JSON format. For each day, provide an ordered list of jobs to attempt. For each scheduled attempt, specify the 'jobId', planned 'time', and the targeted 'attemptType'.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        thinkingConfig: { thinkingBudget: 32768 }
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
