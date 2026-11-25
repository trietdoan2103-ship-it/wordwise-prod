import type { ListeningItem } from "@/types/game";

/**
 * Listening scenarios for the USA "Renewable Energy" mission.
 * The `sentence` field is spoken aloud via the browser SpeechSynthesis API.
 * MCQ options describe the answer in Vietnamese or short English.
 */
export const listeningItems: ListeningItem[] = [
  {
    id: "listen-1",
    scenario: "Solar Grid Lab",
    sentence:
      "Our photovoltaic panels convert sunlight directly into clean electricity.",
    question: "Hệ thống tấm pin quang điện thực hiện chức năng gì?",
    options: [
      "Đốt than để tạo nhiệt",
      "Chuyển đổi ánh sáng mặt trời trực tiếp thành điện sạch",
      "Lưu trữ nước mưa cho nông nghiệp",
      "Làm mát tòa nhà bằng khí tự nhiên",
    ],
    correctIndex: 1,
    xp: 10,
  },
  {
    id: "listen-2",
    scenario: "Wind Farm Control",
    sentence:
      "We store excess wind power in grid-scale lithium batteries for evening peak demand.",
    question: "Kỹ sư lưu trữ nguồn điện gió dư thừa ở đâu?",
    options: [
      "Trong máy phát chạy dầu",
      "Trong bình khí nén nhỏ",
      "Trong hệ thống pin lithium quy mô lưới điện",
      "Truyền thẳng ra biển",
    ],
    correctIndex: 2,
    xp: 10,
  },
  {
    id: "listen-3",
    scenario: "Sustainability Briefing",
    sentence:
      "Switching to renewable energy significantly reduces our campus carbon footprint.",
    question: "Việc chuyển sang năng lượng tái tạo mang lại lợi ích gì?",
    options: [
      "Tăng chi phí vận hành gấp đôi",
      "Tăng lượng khí thải nhà kính",
      "Giảm đáng kể lượng khí thải carbon của khuôn viên trường",
      "Thay thế hoàn toàn mạng internet",
    ],
    correctIndex: 2,
    xp: 10,
  },
];
