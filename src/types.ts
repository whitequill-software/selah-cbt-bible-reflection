export interface ReflectionEntry {
  id: string;
  timestamp: string;
  originalThought: string;
  distortionName: string;
  distortionExplanation: string;
  reframe: string;
  bibleVerse: string;
  bibleVerseReference: string;
  prayerOrQuestion: string;
  peaceRatingBefore?: number; // 1 to 5 peace scale before reflection
  peaceRatingAfter?: number; // 1 to 5 peace scale after reflection
}

export interface ReflectionResult {
  distortionName: string;
  distortionExplanation: string;
  reframe: string;
  bibleVerse: string;
  bibleVerseReference: string;
  prayerOrQuestion: string;
}
