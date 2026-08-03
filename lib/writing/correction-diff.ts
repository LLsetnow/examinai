export interface SentenceDiff {
  sentence: string;
  removed: string;
  added: string;
  /** Exact, contiguous excerpts from the original sentence that were removed or replaced. */
  removedExcerpts: string[];
}

interface WordToken {
  text: string;
  start: number;
  end: number;
}

export function splitEssaySentences(text: string): string[] {
  return (text.match(/[^.!?]+(?:[.!?]+|$)/g) ?? [])
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function tokenizeSentence(sentence: string): WordToken[] {
  return Array.from(sentence.matchAll(/\S+/g)).map((match) => ({
    text: match[0],
    start: match.index ?? 0,
    end: (match.index ?? 0) + match[0].length,
  }));
}

function contiguousRemovedExcerpts(sentence: string, removedIndexes: number[]) {
  if (removedIndexes.length === 0) return [];

  const tokens = tokenizeSentence(sentence);
  const indexes = [...removedIndexes].sort((left, right) => left - right);
  const excerpts: string[] = [];
  let groupStart = indexes[0];
  let previous = indexes[0];

  for (const index of indexes.slice(1)) {
    if (index === previous + 1) {
      previous = index;
      continue;
    }

    excerpts.push(sentence.slice(tokens[groupStart].start, tokens[previous].end));
    groupStart = index;
    previous = index;
  }

  excerpts.push(sentence.slice(tokens[groupStart].start, tokens[previous].end));
  return excerpts;
}

export function computeSentenceDiffs(original: string, corrected: string): SentenceDiff[] {
  const originalSentences = splitEssaySentences(original);
  const correctedSentences = splitEssaySentences(corrected);
  const diffs: SentenceDiff[] = [];

  // Align sentences by position, then use LCS on words within each pair. This
  // keeps the fallback highlights tied to exact ranges in the student's essay.
  const sentenceCount = Math.max(originalSentences.length, correctedSentences.length);
  for (let sentenceIndex = 0; sentenceIndex < sentenceCount; sentenceIndex += 1) {
    const originalSentence = originalSentences[sentenceIndex] ?? "";
    const correctedSentence = correctedSentences[sentenceIndex] ?? "";
    if (originalSentence === correctedSentence) continue;

    const originalTokens = tokenizeSentence(originalSentence);
    const correctedTokens = tokenizeSentence(correctedSentence);
    const n = originalTokens.length;
    const m = correctedTokens.length;
    const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

    for (let originalIndex = 1; originalIndex <= n; originalIndex += 1) {
      for (let correctedIndex = 1; correctedIndex <= m; correctedIndex += 1) {
        dp[originalIndex][correctedIndex] =
          originalTokens[originalIndex - 1].text === correctedTokens[correctedIndex - 1].text
            ? dp[originalIndex - 1][correctedIndex - 1] + 1
            : Math.max(dp[originalIndex - 1][correctedIndex], dp[originalIndex][correctedIndex - 1]);
      }
    }

    const removed: string[] = [];
    const added: string[] = [];
    const removedIndexes: number[] = [];
    let originalIndex = n;
    let correctedIndex = m;

    while (originalIndex > 0 || correctedIndex > 0) {
      if (
        originalIndex > 0
        && correctedIndex > 0
        && originalTokens[originalIndex - 1].text === correctedTokens[correctedIndex - 1].text
      ) {
        originalIndex -= 1;
        correctedIndex -= 1;
      } else if (
        correctedIndex > 0
        && (originalIndex === 0 || dp[originalIndex][correctedIndex - 1] >= dp[originalIndex - 1][correctedIndex])
      ) {
        added.unshift(correctedTokens[correctedIndex - 1].text);
        correctedIndex -= 1;
      } else {
        removed.unshift(originalTokens[originalIndex - 1].text);
        removedIndexes.push(originalIndex - 1);
        originalIndex -= 1;
      }
    }

    if (removed.length > 0 || added.length > 0) {
      diffs.push({
        sentence: originalSentence || correctedSentence,
        removed: removed.join(" "),
        added: added.join(" "),
        removedExcerpts: contiguousRemovedExcerpts(originalSentence, removedIndexes),
      });
    }
  }

  return diffs;
}
