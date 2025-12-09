import { GoogleGenAI } from "@google/genai";
import type { Student, Teacher } from "../types";

const apiKey = process.env.API_KEY || ''; // Must be set in environment
const ai = new GoogleGenAI({ apiKey });

export const generateStudentReportComment = async (student: Student, performanceContext: string): Promise<string> => {
  try {
    const prompt = `
      Write a concise, professional academic report comment for a student named ${student.first_name} ${student.last_name}.
      Details:
      - Grade/Class context: ${student.class_id ? 'Assigned to a class' : 'Unassigned'}
      - Teacher Notes/Context: ${performanceContext}
      
      Keep it under 50 words. Focus on growth and behavior.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Could not generate report.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "AI Service Unavailable.";
  }
};

export const summarizeTeacherProfile = async (teacher: Teacher): Promise<string> => {
    try {
        const prompt = `Summarize the professional profile of ${teacher.full_name}, who has qualifications: ${teacher.qualifications}. Format as a short bio for the school website.`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });
        return response.text || "";
    } catch (e) {
        return "Error generating summary.";
    }
}
