import axios from 'axios';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { GeminiEnrichment, GeminiRecommendation } from '../models/media';
import { logger } from '../utils/logger';

/**
 * Base URL for Google Gemini API.
 */
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * Make a request to the Gemini API.
 */
async function geminiRequest(prompt: string): Promise<string> {
  if (!env.geminiApiKey) {
    throw new AppError('Gemini API key not configured', 500, 'GEMINI_NOT_CONFIGURED');
  }

  try {
    const response = await axios.post(
      `${GEMINI_BASE_URL}/models/${env.geminiModel}:generateContent`,
      {
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      },
      {
        params: { key: env.geminiApiKey },
        timeout: 15000,
      }
    );

    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('Empty response from Gemini API');
    }

    return text;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = error.response?.data?.error?.message || error.message;
      logger.error(`Gemini API error [${status}]: ${message}`);

      if (status === 429) {
        throw new AppError('Gemini rate limit exceeded', 429, 'GEMINI_RATE_LIMIT');
      }
      if (status === 403) {
        throw new AppError('Gemini API key invalid or insufficient permissions', 403, 'GEMINI_AUTH_ERROR');
      }
      throw new AppError(`Gemini API error: ${message}`, status || 500, 'GEMINI_ERROR');
    }
    throw new AppError('Failed to call Gemini API', 500, 'GEMINI_ERROR');
  }
}

/**
 * Parse Gemini response as JSON.
 * Gemini may return JSON wrapped in markdown code blocks.
 */
function parseGeminiJson(text: string): Record<string, unknown> {
  // Remove markdown code blocks if present
  const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try {
    return JSON.parse(jsonStr) as Record<string, unknown>;
  } catch {
    logger.error('Failed to parse Gemini JSON response:', text);
    throw new AppError('Failed to parse AI response', 500, 'GEMINI_PARSE_ERROR');
  }
}

/**
 * Get AI-powered enrichment for a piece of media.
 */
export async function enrichMedia(title: string, mediaType: 'movie' | 'tv', tmdbId: number): Promise<GeminiEnrichment> {
  const prompt = `You are a movie and TV show expert. For the ${mediaType} titled "${title}" (TMDB ID: ${tmdbId}), provide a JSON response with the following fields:
- "aiSummary": A 2-3 sentence engaging summary of why someone would enjoy this ${mediaType}
- "themes": An array of 3-5 key themes (e.g., ["Identity", "Redemption", "Technology"])
- "similarTitles": An array of 3-5 similar ${mediaType === 'movie' ? 'movie' : 'TV show'} titles that fans would also enjoy
- "moodTags": An array of 3-5 mood descriptors (e.g., ["Dark", "Thought-provoking", "Funny"])
- "watchReason": A single compelling sentence about when or why to watch this

Respond ONLY with valid JSON, no other text.`;

  const text = await geminiRequest(prompt);
  const parsed = parseGeminiJson(text);

  return {
    aiSummary: (parsed.aiSummary as string) || '',
    themes: (parsed.themes as string[]) || [],
    similarTitles: (parsed.similarTitles as string[]) || [],
    moodTags: (parsed.moodTags as string[]) || [],
    watchReason: (parsed.watchReason as string) || '',
  };
}

/**
 * Get AI-powered recommendations based on a list of watchlist items.
 */
export async function getRecommendations(
  items: Array<{ title: string; mediaType: 'movie' | 'tv' }>
): Promise<GeminiRecommendation[]> {
  const itemList = items.map((i) => `- ${i.title} (${i.mediaType})`).join('\n');

  const prompt = `Based on the following watchlist items, recommend 5 new movies or TV shows the user would likely enjoy.

Watchlist:
${itemList}

Provide a JSON response with a "recommendations" array, where each entry has:
- "tmdbId": 0 (we will look it up)
- "title": The title of the recommended content
- "reason": A short sentence explaining why this matches their taste
- "mediaType": Either "movie" or "tv"

Respond ONLY with valid JSON, no other text.`;

  const text = await geminiRequest(prompt);
  const parsed = parseGeminiJson(text);
  const recommendations = parsed.recommendations as Array<{ tmdbId: number; title: string; reason: string; mediaType: string }> || [];

  return recommendations.map((r) => ({
    tmdbId: r.tmdbId || 0,
    title: r.title || '',
    reason: r.reason || '',
  }));
}
