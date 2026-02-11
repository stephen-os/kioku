import { describe, it, expect } from "vitest";

// Example utility function tests
// These demonstrate how to test pure functions

describe("Example utility tests", () => {
  describe("Array utilities", () => {
    it("should shuffle an array", () => {
      const original = [1, 2, 3, 4, 5];
      const shuffled = [...original].sort(() => Math.random() - 0.5);

      // Shuffled should have same length
      expect(shuffled).toHaveLength(original.length);

      // Shuffled should contain same elements
      expect(shuffled.sort()).toEqual(original.sort());
    });
  });

  describe("String utilities", () => {
    it("should truncate long strings", () => {
      const truncate = (str: string, maxLength: number) => {
        if (str.length <= maxLength) return str;
        return str.slice(0, maxLength - 3) + "...";
      };

      expect(truncate("Hello", 10)).toBe("Hello");
      expect(truncate("Hello World", 8)).toBe("Hello...");
      expect(truncate("Hi", 2)).toBe("Hi");
    });
  });

  describe("Date utilities", () => {
    it("should format dates correctly", () => {
      const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString();
      };

      // Just verify it doesn't throw
      expect(() => formatDate("2024-01-15")).not.toThrow();
    });
  });
});

// Example: Testing quiz grading logic (future feature)
describe("Quiz grading logic (example)", () => {
  interface QuizResult {
    correct: number;
    total: number;
    percentage: number;
  }

  const gradeQuiz = (answers: boolean[]): QuizResult => {
    const correct = answers.filter(Boolean).length;
    const total = answers.length;
    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
    return { correct, total, percentage };
  };

  it("should calculate 100% for all correct answers", () => {
    const result = gradeQuiz([true, true, true, true]);
    expect(result).toEqual({ correct: 4, total: 4, percentage: 100 });
  });

  it("should calculate 0% for all wrong answers", () => {
    const result = gradeQuiz([false, false, false]);
    expect(result).toEqual({ correct: 0, total: 3, percentage: 0 });
  });

  it("should calculate 50% for half correct", () => {
    const result = gradeQuiz([true, false, true, false]);
    expect(result).toEqual({ correct: 2, total: 4, percentage: 50 });
  });

  it("should handle empty quiz", () => {
    const result = gradeQuiz([]);
    expect(result).toEqual({ correct: 0, total: 0, percentage: 0 });
  });

  it("should round percentage correctly", () => {
    const result = gradeQuiz([true, true, false]); // 66.666...%
    expect(result.percentage).toBe(67);
  });
});
