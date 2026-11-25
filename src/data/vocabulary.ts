import type { VocabularyItem } from "@/types/game";

/**
 * Vocabulary flashcards for the USA "Renewable Energy" mission.
 * All meanings and MCQ options are in Vietnamese.
 * Each card is shown to the player, then a multiple-choice question is asked.
 */
export const vocabularyItems: VocabularyItem[] = [
  {
    id: "vocab-photovoltaic",
    word: "photovoltaic",
    meaning: "quang điện",
    question: '"photovoltaic" có nghĩa là gì?',
    options: ["Nhiệt điện", "Quang điện", "Thủy điện", "Hạt nhân"],
    correctIndex: 1,
    xp: 10,
  },
  {
    id: "vocab-turbine",
    word: "wind turbine",
    meaning: "tua-bin gió",
    question: '"wind turbine" có nghĩa là gì?',
    options: ["Pin mặt trời", "Lưới điện", "Tua-bin gió", "Máy biến áp"],
    correctIndex: 2,
    xp: 10,
  },
  {
    id: "vocab-renewable",
    word: "renewable",
    meaning: "tái tạo được",
    question: '"renewable" có nghĩa là gì?',
    options: ["Hóa thạch", "Tái tạo được", "Độc hại", "Tạm thời"],
    correctIndex: 1,
    xp: 10,
  },
  {
    id: "vocab-inverter",
    word: "inverter",
    meaning: "bộ biến tần",
    question: '"inverter" là thiết bị dùng để làm gì?',
    options: [
      "Đốt nhiên liệu",
      "Làm mát động cơ",
      "Bộ biến tần (đổi điện DC sang AC)",
      "Đo tốc độ gió",
    ],
    correctIndex: 2,
    xp: 10,
  },
  {
    id: "vocab-grid-storage",
    word: "grid storage",
    meaning: "lưu trữ điện lưới",
    question: '"grid storage" có nghĩa là gì?',
    options: [
      "Tiêu thụ điện năng",
      "Rò rỉ năng lượng",
      "Lưu trữ điện lưới",
      "Khí thải carbon",
    ],
    correctIndex: 2,
    xp: 10,
  },
  {
    id: "vocab-sustainable",
    word: "sustainable",
    meaning: "bền vững",
    question: '"sustainable" được dùng để mô tả điều gì?',
    options: [
      "Gây ô nhiễm cao",
      "Khan hiếm",
      "Bền vững, thân thiện môi trường",
      "Đắt đỏ",
    ],
    correctIndex: 2,
    xp: 10,
  },
];
