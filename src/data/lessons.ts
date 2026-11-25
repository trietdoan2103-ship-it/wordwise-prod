import type { Lesson, Flashcard } from "@/types/curriculum";

/**
 * CHỦ ĐỀ 1: RENEWABLE ENERGY & CLIMATE CHANGE
 * Complete 15-term vocabulary bank with exact phonetics, Vietnamese meanings,
 * and example sentences used across reading highlights and flashcard decks.
 */
export const renewableEnergyGlossary: Flashcard[] = [
  {
    term: "Renewable Energy",
    phonetic: "/rɪˈnjuːəbl ˈɛnədʒi/",
    meaningVi: "năng lượng tái tạo",
    example: "Many developed countries are investing heavily in renewable energy.",
  },
  {
    term: "Climate Change",
    phonetic: "/ˈklaɪ.mət tʃeɪndʒ/",
    meaningVi: "biến đổi khí hậu",
    example:
      "Scientists warn that climate change will lead to more severe weather conditions in the near future.",
  },
  {
    term: "Solar Energy",
    phonetic: "/ˈsəʊlər ˈɛnədʒi/",
    meaningVi: "năng lượng mặt trời",
    example:
      "Installing panels on your roof is a great way to generate solar energy for household use.",
  },
  {
    term: "Wind Energy",
    phonetic: "/wɪnd ˈɛnədʒi/",
    meaningVi: "năng lượng gió",
    example: "Coastal areas are ideal locations for capturing wind energy.",
  },
  {
    term: "Hydro Energy",
    phonetic: "/ˈhaɪdrəʊ ˈɛnədʒi/",
    meaningVi: "thủy điện",
    example:
      "Dams are built along major rivers to produce hydro energy for millions of homes.",
  },
  {
    term: "Biofuel",
    phonetic: "/ˈbaɪəʊˌfjuːəl/",
    meaningVi: "nhiên liệu sinh học",
    example:
      "Using biofuel made from plants can help significantly lower greenhouse gas emissions from vehicles.",
  },
  {
    term: "Greenhouse Effect",
    phonetic: "/ˈɡriːnhaʊs ɪˈfɛkt/",
    meaningVi: "hiệu ứng nhà kính",
    example:
      "The greenhouse effect causes global temperatures to rise by trapping heat in the Earth's atmosphere.",
  },
  {
    term: "Carbon Footprint",
    phonetic: "/ˈkɑːbən ˈfʊtprɪnt/",
    meaningVi: "lượng phát thải carbon (dấu chân carbon)",
    example:
      "Taking public transportation instead of driving every day is an easy way to lower your carbon footprint.",
  },
  {
    term: "Efficiency",
    phonetic: "/ɪˈfɪʃənsi/",
    meaningVi: "hiệu suất (năng lượng)",
    example:
      "Modern electrical appliances are designed to improve energy efficiency and save power.",
  },
  {
    term: "Sea-Level Rise",
    phonetic: "/siː ˈlɛvl raɪz/",
    meaningVi: "mực nước biển dâng",
    example:
      "Coastal cities are developing new flood defenses to protect against gradual sea-level rise.",
  },
  {
    term: "Extreme Weather Events",
    phonetic: "/ɪkˈstriːm ˈwɛðər ɪˈvɛnts/",
    meaningVi: "các hiện tượng thời tiết cực đoan",
    example:
      "Governments need to prepare better infrastructure to cope with frequent extreme weather events.",
  },
  {
    term: "Biodiversity Loss",
    phonetic: "/ˌbaɪəʊdaɪˈvɜːsɪti lɒs/",
    meaningVi: "sự suy giảm đa dạng sinh học",
    example:
      "Habitat destruction is one of the main drivers of biodiversity loss around the globe.",
  },
  {
    term: "Deforestation",
    phonetic: "/diːˌfɒrɪˈsteɪʃən/",
    meaningVi: "nạn phá rừng",
    example:
      "Large-scale deforestation contributes directly to global warming by removing trees that absorb carbon dioxide.",
  },
  {
    term: "Ecosystem",
    phonetic: "/ˈiːkəʊsɪstəm/",
    meaningVi: "hệ sinh thái",
    example: "Pollution poses a severe threat to the balance of the ocean ecosystem.",
  },
  {
    term: "Conservation",
    phonetic: "/ˌkɒnsəˈveɪʃən/",
    meaningVi: "sự bảo tồn / bảo vệ môi trường",
    example:
      "The government has established several national parks to promote wildlife conservation.",
  },
];

/**
 * Curriculum lessons dataset — CHỦ ĐỀ 1: RENEWABLE ENERGY & CLIMATE CHANGE.
 *
 * Strictly separated into:
 * - 4 Reading Modules (lessonType: 'reading'): Reading passages, highlighted terms, and comprehension quizzes.
 * - 2 Flashcard Decks (lessonType: 'flashcard'): Interactive 3D flip flashcards only.
 */
export const renewableEnergyLessons: Lesson[] = [
  // ── Lesson 1 (Reading): Clean Energy Solutions ────────────────────────────
  {
    id: "lesson-re-01",
    title: "Clean Energy Solutions: Solar, Wind, Hydro & Biofuel",
    topic: "Renewable Energy & Clean Tech",
    lessonType: "reading",
    category: "reading",
    readingTime: "6 mins",
    estimatedMinutes: 6,
    level: "Beginner",
    summary:
      "Explore how renewable energy sources—including solar energy, wind energy, hydro energy, and biofuel—replace fossil fuels while improving energy efficiency.",
    description:
      "Explore how renewable energy sources—including solar energy, wind energy, hydro energy, and biofuel—replace fossil fuels while improving energy efficiency.",
    readingText: {
      paragraphs: [
        "Transitioning away from coal, oil, and natural gas is one of the most urgent priorities of the twenty-first century. Many developed countries are investing heavily in renewable energy to supply clean electricity for growing populations and modern industries without polluting the air.",
        "For residential and commercial buildings, installing panels on your roof is a great way to generate solar energy for household use. Meanwhile, coastal areas are ideal locations for capturing wind energy through tall turbines that spin continuously in strong sea breezes. Along major river valleys, dams are built along major rivers to produce hydro energy for millions of homes, providing reliable power day and night.",
        "Clean energy transformation also extends to transportation and home appliances. Using biofuel made from plants can help significantly lower greenhouse gas emissions from vehicles such as buses, trucks, and aircraft. At the same time, modern electrical appliances are designed to improve energy efficiency and save power, ensuring that every kilowatt generated is used wisely.",
      ],
      highlightedTerms: [
        "Renewable Energy",
        "Solar Energy",
        "Wind Energy",
        "Hydro Energy",
        "Biofuel",
        "Efficiency",
      ],
    },
    flashcards: [],
    quiz: [
      {
        question:
          "Why are coastal areas particularly suitable for generating renewable electricity?",
        options: [
          "They are ideal locations for capturing wind energy with turbines",
          "They prevent rivers from flowing into dams",
          "They increase fuel consumption in older vehicles",
          "They block sunlight from reaching rooftop solar panels",
        ],
        correctIndex: 0,
        explanation:
          "Coastal areas experience steady, strong airflows, making them ideal locations for capturing wind energy.",
      },
      {
        question:
          "How does using biofuel benefit the transportation sector?",
        options: [
          "It replaces electrical appliances in homes",
          "It helps significantly lower greenhouse gas emissions from vehicles",
          "It builds concrete dams along major rivers",
          "It increases the heat lost by household lighting",
        ],
        correctIndex: 1,
        explanation:
          "Biofuel made from plants provides a cleaner alternative to petroleum, helping lower greenhouse gas emissions from vehicles.",
      },
      {
        question:
          "What is the main purpose of improving energy efficiency in modern electrical appliances?",
        options: [
          "To consume more electricity during peak hours",
          "To save power and perform the same tasks using less energy",
          "To replace hydro energy with coal power",
          "To make appliances heavier and more complex",
        ],
        correctIndex: 1,
        explanation:
          "Modern electrical appliances are engineered for high energy efficiency so households can save power and reduce waste.",
      },
    ],
    isCompleted: false,
  },

  // ── Lesson 2 (Reading): Climate Change & Greenhouse Effect ────────────────
  {
    id: "lesson-re-02",
    title: "Understanding Climate Change & The Greenhouse Effect",
    topic: "Climate Science & Atmosphere",
    lessonType: "reading",
    category: "reading",
    readingTime: "7 mins",
    estimatedMinutes: 7,
    level: "Intermediate",
    summary:
      "Understand how the greenhouse effect and rising carbon footprints accelerate global climate change, triggering sea-level rise and extreme weather events.",
    description:
      "Understand how the greenhouse effect and rising carbon footprints accelerate global climate change, triggering sea-level rise and extreme weather events.",
    readingText: {
      paragraphs: [
        "Earth's climate system relies on a delicate balance of atmospheric gases. However, since the Industrial Revolution, burning fossil fuels has released billions of tons of carbon dioxide and methane into the air. The greenhouse effect causes global temperatures to rise by trapping heat in the Earth's atmosphere instead of letting warmth escape into space.",
        "Scientists warn that climate change will lead to more severe weather conditions in the near future. As polar ice sheets melt and ocean waters warm and expand, coastal cities are developing new flood defenses to protect against gradual sea-level rise. Furthermore, governments need to prepare better infrastructure to cope with frequent extreme weather events, including devastating typhoons, prolonged droughts, and intense heatwaves.",
        "Individual actions also play a vital role alongside national policy. Every product we buy and every journey we make contributes to our total emissions. Taking public transportation instead of driving every day is an easy way to lower your carbon footprint and help slow down global warming.",
      ],
      highlightedTerms: [
        "Climate Change",
        "Greenhouse Effect",
        "Carbon Footprint",
        "Sea-Level Rise",
        "Extreme Weather Events",
      ],
    },
    flashcards: [],
    quiz: [
      {
        question:
          "How does the greenhouse effect cause global temperatures to rise?",
        options: [
          "By cooling the ocean surface during winter storms",
          "By trapping heat in the Earth's atmosphere",
          "By reflecting all sunlight away from the planet",
          "By building flood defenses in coastal cities",
        ],
        correctIndex: 1,
        explanation:
          "Greenhouse gases act like an insulating blanket, trapping heat in the Earth's atmosphere and raising global temperatures.",
      },
      {
        question:
          "Why are coastal cities investing in new flood defenses?",
        options: [
          "To protect communities against gradual sea-level rise",
          "To increase their daily carbon footprint",
          "To generate more greenhouse gases",
          "To stop public transportation from operating",
        ],
        correctIndex: 0,
        explanation:
          "Melting ice and thermal expansion of ocean water cause gradual sea-level rise, threatening low-lying coastal cities.",
      },
      {
        question:
          "Which everyday habit is an effective way for individuals to lower their carbon footprint?",
        options: [
          "Driving a private car alone for every short trip",
          "Leaving air conditioners running in empty rooms",
          "Taking public transportation instead of driving every day",
          "Removing flood defenses from coastal regions",
        ],
        correctIndex: 2,
        explanation:
          "Using buses, trains, or bicycles instead of driving alone every day significantly reduces personal carbon emissions.",
      },
    ],
    isCompleted: false,
  },

  // ── Lesson 3 (Reading): Protecting Ecosystems & Biodiversity ──────────────
  {
    id: "lesson-re-03",
    title: "Protecting Ecosystems & Preventing Biodiversity Loss",
    topic: "Ecology & Conservation",
    lessonType: "reading",
    category: "reading",
    readingTime: "6 mins",
    estimatedMinutes: 6,
    level: "Intermediate",
    summary:
      "Examine how deforestation and pollution threaten natural ecosystems and drive biodiversity loss, and why active wildlife conservation is essential.",
    description:
      "Examine how deforestation and pollution threaten natural ecosystems and drive biodiversity loss, and why active wildlife conservation is essential.",
    readingText: {
      paragraphs: [
        "Every forest, coral reef, and wetland on Earth functions as a complex biological community. A healthy ecosystem depends on the close interaction between plants, animals, microorganisms, water, and soil. However, human industrial expansion and plastic waste have placed immense pressure on nature, and pollution poses a severe threat to the balance of the ocean ecosystem.",
        "On land, clearing tropical forests for agriculture and timber has devastating consequences for both the climate and wildlife. Large-scale deforestation contributes directly to global warming by removing trees that absorb carbon dioxide. At the same time, habitat destruction is one of the main drivers of biodiversity loss around the globe, pushing thousands of endangered species toward extinction.",
        "Reversing these trends requires coordinated action from scientists, local communities, and policymakers. Around the world, the government has established several national parks to promote wildlife conservation, restore damaged forests, and safeguard natural habitats for future generations.",
      ],
      highlightedTerms: [
        "Biodiversity Loss",
        "Deforestation",
        "Ecosystem",
        "Conservation",
      ],
    },
    flashcards: [],
    quiz: [
      {
        question:
          "How does large-scale deforestation contribute directly to global warming?",
        options: [
          "By planting too many trees in national parks",
          "By removing trees that naturally absorb carbon dioxide from the atmosphere",
          "By cleaning plastic pollution from the ocean ecosystem",
          "By reducing the need for wildlife conservation",
        ],
        correctIndex: 1,
        explanation:
          "Forests act as major carbon sinks; removing trees through deforestation stops them from absorbing atmospheric carbon dioxide.",
      },
      {
        question:
          "What is identified as one of the main drivers of biodiversity loss around the globe?",
        options: [
          "Establishing protected national parks",
          "Habitat destruction caused by human activities",
          "Using energy-efficient household appliances",
          "Expanding wildlife conservation programs",
        ],
        correctIndex: 1,
        explanation:
          "When natural forests, wetlands, and reefs are destroyed, plant and animal species lose their habitats, driving biodiversity loss.",
      },
    ],
    isCompleted: false,
  },

  // ── Lesson 4 (Reading): Sustainable Cities & Low-Carbon Infrastructure ────
  {
    id: "lesson-re-04",
    title: "Sustainable Cities & Low-Carbon Infrastructure",
    topic: "Sustainable Development",
    lessonType: "reading",
    category: "reading",
    readingTime: "7 mins",
    estimatedMinutes: 7,
    level: "Advanced",
    summary:
      "Discover how modern sustainable cities combine renewable energy, high-efficiency green buildings, and urban conservation to build climate resilience.",
    description:
      "Discover how modern sustainable cities combine renewable energy, high-efficiency green buildings, and urban conservation to build climate resilience.",
    readingText: {
      paragraphs: [
        "Cities account for over seventy percent of global energy consumption, making urban planning central to solving climate change. Forward-thinking municipalities are redesigning their infrastructure around renewable energy—integrating rooftop solar energy on public buildings, sourcing wind energy and hydro energy from regional grids, and powering city bus fleets with clean biofuel.",
        "Reducing a city's overall carbon footprint also requires smarter architecture and resilient engineering. Green building codes mandate superior insulation and smart lighting to maximize energy efficiency. At the same time, coastal metropolises are upgrading drainage networks and sea walls to withstand gradual sea-level rise and increasingly frequent extreme weather events.",
        "Finally, truly sustainable cities recognize that urban development must coexist with nature. By expanding urban forests, halting deforestation on city outskirts, and prioritizing wetland conservation, planners protect the local ecosystem and prevent further biodiversity loss while creating healthier living spaces for citizens.",
      ],
      highlightedTerms: [
        "Renewable Energy",
        "Climate Change",
        "Solar Energy",
        "Wind Energy",
        "Hydro Energy",
        "Biofuel",
        "Carbon Footprint",
        "Efficiency",
        "Sea-Level Rise",
        "Extreme Weather Events",
        "Deforestation",
        "Conservation",
        "Ecosystem",
        "Biodiversity Loss",
      ],
    },
    flashcards: [],
    quiz: [
      {
        question:
          "How are sustainable cities reducing the carbon footprint of their public transit networks?",
        options: [
          "By replacing public buses with coal-powered locomotives",
          "By powering city bus fleets with clean biofuel and renewable electricity",
          "By encouraging all citizens to drive private cars every day",
          "By removing green building efficiency standards",
        ],
        correctIndex: 1,
        explanation:
          "Transitioning public transit to biofuel and renewable electricity cuts urban transport emissions and lowers the city's carbon footprint.",
      },
      {
        question:
          "Why do sustainable urban planners integrate wetland conservation and urban forests into city designs?",
        options: [
          "To protect the local ecosystem and prevent biodiversity loss",
          "To accelerate deforestation around metropolitan borders",
          "To trap more heat via the greenhouse effect",
          "To increase the severity of extreme weather events",
        ],
        correctIndex: 0,
        explanation:
          "Preserving wetlands and urban forests supports wildlife conservation, stabilizes the local ecosystem, and prevents biodiversity loss.",
      },
    ],
    isCompleted: false,
  },

  // ── Lesson 5 (Flashcard Deck 1): Clean Energy & Efficiency (8 Cards) ──────
  {
    id: "lesson-re-05",
    title: "Flashcard Deck 1: Clean Energy & Efficiency (8 Cards)",
    topic: "Renewable Energy & Clean Tech",
    lessonType: "flashcard",
    category: "vocabulary",
    readingTime: "8 flashcards",
    estimatedMinutes: 5,
    level: "Beginner",
    summary:
      "Master 8 essential vocabulary terms covering renewable energy sources (solar, wind, hydro, biofuel), climate change, carbon footprint, and energy efficiency.",
    description:
      "Master 8 essential vocabulary terms covering renewable energy sources (solar, wind, hydro, biofuel), climate change, carbon footprint, and energy efficiency.",
    readingText: {
      paragraphs: [],
      highlightedTerms: [],
    },
    flashcards: [
      {
        term: "Renewable Energy",
        phonetic: "/rɪˈnjuːəbl ˈɛnədʒi/",
        meaningVi: "năng lượng tái tạo",
        example:
          "Many developed countries are investing heavily in renewable energy.",
      },
      {
        term: "Climate Change",
        phonetic: "/ˈklaɪ.mət tʃeɪndʒ/",
        meaningVi: "biến đổi khí hậu",
        example:
          "Scientists warn that climate change will lead to more severe weather conditions in the near future.",
      },
      {
        term: "Solar Energy",
        phonetic: "/ˈsəʊlər ˈɛnədʒi/",
        meaningVi: "năng lượng mặt trời",
        example:
          "Installing panels on your roof is a great way to generate solar energy for household use.",
      },
      {
        term: "Wind Energy",
        phonetic: "/wɪnd ˈɛnədʒi/",
        meaningVi: "năng lượng gió",
        example: "Coastal areas are ideal locations for capturing wind energy.",
      },
      {
        term: "Hydro Energy",
        phonetic: "/ˈhaɪdrəʊ ˈɛnədʒi/",
        meaningVi: "thủy điện",
        example:
          "Dams are built along major rivers to produce hydro energy for millions of homes.",
      },
      {
        term: "Biofuel",
        phonetic: "/ˈbaɪəʊˌfjuːəl/",
        meaningVi: "nhiên liệu sinh học",
        example:
          "Using biofuel made from plants can help significantly lower greenhouse gas emissions from vehicles.",
      },
      {
        term: "Carbon Footprint",
        phonetic: "/ˈkɑːbən ˈfʊtprɪnt/",
        meaningVi: "lượng phát thải carbon (dấu chân carbon)",
        example:
          "Taking public transportation instead of driving every day is an easy way to lower your carbon footprint.",
      },
      {
        term: "Efficiency",
        phonetic: "/ɪˈfɪʃənsi/",
        meaningVi: "hiệu suất (năng lượng)",
        example:
          "Modern electrical appliances are designed to improve energy efficiency and save power.",
      },
    ],
    quiz: [],
    isCompleted: false,
  },

  // ── Lesson 6 (Flashcard Deck 2): Climate Change & Conservation (7 Cards) ──
  {
    id: "lesson-re-06",
    title: "Flashcard Deck 2: Climate Change & Conservation (7 Cards)",
    topic: "Climate Change & Conservation",
    lessonType: "flashcard",
    category: "vocabulary",
    readingTime: "7 flashcards",
    estimatedMinutes: 5,
    level: "Intermediate",
    summary:
      "Practice 7 key environmental terms: greenhouse effect, sea-level rise, extreme weather events, biodiversity loss, deforestation, ecosystem, and conservation.",
    description:
      "Practice 7 key environmental terms: greenhouse effect, sea-level rise, extreme weather events, biodiversity loss, deforestation, ecosystem, and conservation.",
    readingText: {
      paragraphs: [],
      highlightedTerms: [],
    },
    flashcards: [
      {
        term: "Greenhouse Effect",
        phonetic: "/ˈɡriːnhaʊs ɪˈfɛkt/",
        meaningVi: "hiệu ứng nhà kính",
        example:
          "The greenhouse effect causes global temperatures to rise by trapping heat in the Earth's atmosphere.",
      },
      {
        term: "Sea-Level Rise",
        phonetic: "/siː ˈlɛvl raɪz/",
        meaningVi: "mực nước biển dâng",
        example:
          "Coastal cities are developing new flood defenses to protect against gradual sea-level rise.",
      },
      {
        term: "Extreme Weather Events",
        phonetic: "/ɪkˈstriːm ˈwɛðər ɪˈvɛnts/",
        meaningVi: "các hiện tượng thời tiết cực đoan",
        example:
          "Governments need to prepare better infrastructure to cope with frequent extreme weather events.",
      },
      {
        term: "Biodiversity Loss",
        phonetic: "/ˌbaɪəʊdaɪˈvɜːsɪti lɒs/",
        meaningVi: "sự suy giảm đa dạng sinh học",
        example:
          "Habitat destruction is one of the main drivers of biodiversity loss around the globe.",
      },
      {
        term: "Deforestation",
        phonetic: "/diːˌfɒrɪˈsteɪʃən/",
        meaningVi: "nạn phá rừng",
        example:
          "Large-scale deforestation contributes directly to global warming by removing trees that absorb carbon dioxide.",
      },
      {
        term: "Ecosystem",
        phonetic: "/ˈiːkəʊsɪstəm/",
        meaningVi: "hệ sinh thái",
        example:
          "Pollution poses a severe threat to the balance of the ocean ecosystem.",
      },
      {
        term: "Conservation",
        phonetic: "/ˌkɒnsəˈveɪʃən/",
        meaningVi: "sự bảo tồn / bảo vệ môi trường",
        example:
          "The government has established several national parks to promote wildlife conservation.",
      },
    ],
    quiz: [],
    isCompleted: false,
  },
];

/** Lookup a lesson by its id */
export function getLessonById(id: string): Lesson | undefined {
  return renewableEnergyLessons.find((l) => l.id === id);
}
