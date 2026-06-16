/**
 * TaskTide Matching Engine
 * Path: server/src/utils/matchingEngine.js
 */

const { getTfidfScore } = require('./tfidf');
const cosineSimilarity = require('./cosineSimilarity');

/**
 * Calculates match scores between a job and a pool of freelancers.
 * @param {string} jobDescription 
 * @param {Array} freelancerProfiles 
 * @returns {Array} Sorted list of matches
 */
export function findMatches(jobDescription, freelancerProfiles) {
  if (!jobDescription || !freelancerProfiles.length) return [];

  // 1. Generate the vector for the job description
  const jobVector = getTfidfScore(jobDescription);

  // 2. Map profiles to their similarity score against the job
  const matches = freelancerProfiles.map(profile => {
    // Assuming profile has a 'skills' or 'bio' field to analyze
    const profileText = `${profile.title} ${profile.skills.join(' ')} ${profile.bio}`;
    const profileVector = getTfidfScore(profileText);

    return {
      profileId: profile.id,
      // 3. Compute the cosine similarity between the two sparse vectors
      score: cosineSimilarity(jobVector, profileVector)
    };
  });

  // 4. Return sorted list, highest score first
  return matches.sort((a, b) => b.score - a.score);
}