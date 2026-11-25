-- =============================================================================
-- WORDWISE PRODUCTION SEED DATA SCRIPT (SUPABASE)
-- Sprint 1: Curriculum Lessons, Flashcards, Questions, Countries, Missions & Events
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. SEED LESSONS (4 Reading Modules + 2 Flashcard Decks)
-- -----------------------------------------------------------------------------
INSERT INTO public.lessons (
  id, topic_id, title, subtitle, category, difficulty, duration_minutes,
  lesson_type, content, key_takeaways, sort_order, is_published
)
VALUES
  (
    'lesson-re-01',
    'Renewable Energy & Clean Tech',
    'Clean Energy Solutions: Solar, Wind, Hydro & Biofuel',
    'Explore how renewable energy sources—including solar energy, wind energy, hydro energy, and biofuel—replace fossil fuels while improving energy efficiency.',
    'reading',
    'Beginner',
    6,
    'reading',
    '{
      "paragraphs": [
        "Transitioning away from coal, oil, and natural gas is one of the most urgent priorities of the twenty-first century. Many developed countries are investing heavily in renewable energy to supply clean electricity for growing populations and modern industries without polluting the air.",
        "For residential and commercial buildings, installing panels on your roof is a great way to generate solar energy for household use. Meanwhile, coastal areas are ideal locations for capturing wind energy through tall turbines that spin continuously in strong sea breezes. Along major river valleys, dams are built along major rivers to produce hydro energy for millions of homes, providing reliable power day and night.",
        "Clean energy transformation also extends to transportation and home appliances. Using biofuel made from plants can help significantly lower greenhouse gas emissions from vehicles such as buses, trucks, and aircraft. At the same time, modern electrical appliances are designed to improve energy efficiency and save power, ensuring that every kilowatt generated is used wisely."
      ],
      "highlightedTerms": [
        "Renewable Energy",
        "Solar Energy",
        "Wind Energy",
        "Hydro Energy",
        "Biofuel",
        "Efficiency"
      ]
    }'::jsonb,
    '["Renewable energy sources like solar, wind, and hydro generate electricity without air pollution.", "Biofuel made from plants reduces greenhouse gas emissions in transportation.", "Improving energy efficiency in modern appliances saves power and reduces waste."]'::jsonb,
    1,
    true
  ),
  (
    'lesson-re-02',
    'Climate Science & Atmosphere',
    'Understanding Climate Change & The Greenhouse Effect',
    'Understand how the greenhouse effect and rising carbon footprints accelerate global climate change, triggering sea-level rise and extreme weather events.',
    'reading',
    'Intermediate',
    7,
    'reading',
    '{
      "paragraphs": [
        "Earth''s climate system relies on a delicate balance of atmospheric gases. However, since the Industrial Revolution, burning fossil fuels has released billions of tons of carbon dioxide and methane into the air. The greenhouse effect causes global temperatures to rise by trapping heat in the Earth''s atmosphere instead of letting warmth escape into space.",
        "Scientists warn that climate change will lead to more severe weather conditions in the near future. As polar ice sheets melt and ocean waters warm and expand, coastal cities are developing new flood defenses to protect against gradual sea-level rise. Furthermore, governments need to prepare better infrastructure to cope with frequent extreme weather events, including devastating typhoons, prolonged droughts, and intense heatwaves.",
        "Individual actions also play a vital role alongside national policy. Every product we buy and every journey we make contributes to our total emissions. Taking public transportation instead of driving every day is an easy way to lower your carbon footprint and help slow down global warming."
      ],
      "highlightedTerms": [
        "Climate Change",
        "Greenhouse Effect",
        "Carbon Footprint",
        "Sea-Level Rise",
        "Extreme Weather Events"
      ]
    }'::jsonb,
    '["The greenhouse effect traps heat in the atmosphere and drives global temperature rise.", "Melting ice and warming oceans lead to sea-level rise and frequent extreme weather events.", "Taking public transit and saving energy helps individuals lower their carbon footprint."]'::jsonb,
    2,
    true
  ),
  (
    'lesson-re-03',
    'Ecology & Conservation',
    'Protecting Ecosystems & Preventing Biodiversity Loss',
    'Examine how deforestation and pollution threaten natural ecosystems and drive biodiversity loss, and why active wildlife conservation is essential.',
    'reading',
    'Intermediate',
    6,
    'reading',
    '{
      "paragraphs": [
        "Every forest, coral reef, and wetland on Earth functions as a complex biological community. A healthy ecosystem depends on the close interaction between plants, animals, microorganisms, water, and soil. However, human industrial expansion and plastic waste have placed immense pressure on nature, and pollution poses a severe threat to the balance of the ocean ecosystem.",
        "On land, clearing tropical forests for agriculture and timber has devastating consequences for both the climate and wildlife. Large-scale deforestation contributes directly to global warming by removing trees that absorb carbon dioxide. At the same time, habitat destruction is one of the main drivers of biodiversity loss around the globe, pushing thousands of endangered species toward extinction.",
        "Reversing these trends requires coordinated action from scientists, local communities, and policymakers. Around the world, the government has established several national parks to promote wildlife conservation, restore damaged forests, and safeguard natural habitats for future generations."
      ],
      "highlightedTerms": [
        "Biodiversity Loss",
        "Deforestation",
        "Ecosystem",
        "Conservation"
      ]
    }'::jsonb,
    '["Healthy ecosystems rely on balanced interactions between organisms and their environment.", "Large-scale deforestation removes carbon-absorbing trees and accelerates biodiversity loss.", "National parks and wildlife conservation initiatives safeguard habitats for future generations."]'::jsonb,
    3,
    true
  ),
  (
    'lesson-re-04',
    'Sustainable Development',
    'Sustainable Cities & Low-Carbon Infrastructure',
    'Discover how modern sustainable cities combine renewable energy, high-efficiency green buildings, and urban conservation to build climate resilience.',
    'reading',
    'Advanced',
    7,
    'reading',
    '{
      "paragraphs": [
        "Cities account for over seventy percent of global energy consumption, making urban planning central to solving climate change. Forward-thinking municipalities are redesigning their infrastructure around renewable energy—integrating rooftop solar energy on public buildings, sourcing wind energy and hydro energy from regional grids, and powering city bus fleets with clean biofuel.",
        "Reducing a city''s overall carbon footprint also requires smarter architecture and resilient engineering. Green building codes mandate superior insulation and smart lighting to maximize energy efficiency. At the same time, coastal metropolises are upgrading drainage networks and sea walls to withstand gradual sea-level rise and increasingly frequent extreme weather events.",
        "Finally, truly sustainable cities recognize that urban development must coexist with nature. By expanding urban forests, halting deforestation on city outskirts, and prioritizing wetland conservation, planners protect the local ecosystem and prevent further biodiversity loss while creating healthier living spaces for citizens."
      ],
      "highlightedTerms": [
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
        "Biodiversity Loss"
      ]
    }'::jsonb,
    '["Cities consume over 70% of global energy and are transitioning to solar, wind, hydro, and biofuel.", "Green building standards and sea walls improve energy efficiency and coastal climate resilience.", "Urban forests and wetland conservation protect local ecosystems and prevent biodiversity loss."]'::jsonb,
    4,
    true
  ),
  (
    'lesson-re-05',
    'Renewable Energy & Clean Tech',
    'Flashcard Deck 1: Clean Energy & Efficiency (8 Cards)',
    'Master 8 essential vocabulary terms covering renewable energy sources (solar, wind, hydro, biofuel), climate change, carbon footprint, and energy efficiency.',
    'vocabulary',
    'Beginner',
    5,
    'flashcard',
    '{"paragraphs": [], "highlightedTerms": []}'::jsonb,
    '[]'::jsonb,
    5,
    true
  ),
  (
    'lesson-re-06',
    'Climate Change & Conservation',
    'Flashcard Deck 2: Climate Change & Conservation (7 Cards)',
    'Practice 7 key environmental terms: greenhouse effect, sea-level rise, extreme weather events, biodiversity loss, deforestation, ecosystem, and conservation.',
    'vocabulary',
    'Intermediate',
    5,
    'flashcard',
    '{"paragraphs": [], "highlightedTerms": []}'::jsonb,
    '[]'::jsonb,
    6,
    true
  )
ON CONFLICT (id) DO UPDATE SET
  topic_id = EXCLUDED.topic_id,
  title = EXCLUDED.title,
  subtitle = EXCLUDED.subtitle,
  category = EXCLUDED.category,
  difficulty = EXCLUDED.difficulty,
  duration_minutes = EXCLUDED.duration_minutes,
  lesson_type = EXCLUDED.lesson_type,
  content = EXCLUDED.content,
  key_takeaways = EXCLUDED.key_takeaways,
  sort_order = EXCLUDED.sort_order,
  is_published = EXCLUDED.is_published;

-- -----------------------------------------------------------------------------
-- 2. SEED FLASHCARDS (15 Cards across Deck 1 and Deck 2)
-- -----------------------------------------------------------------------------
INSERT INTO public.flashcards (
  id, lesson_id, term, phonetic, part_of_speech, vietnamese_meaning,
  definition, example_sentence, synonyms, sort_order
)
VALUES
  -- Deck 1: lesson-re-05 (8 cards)
  (
    'fc-re-01',
    'lesson-re-05',
    'Renewable Energy',
    '/rɪˈnjuːəbl ˈɛnədʒi/',
    'noun phrase',
    'năng lượng tái tạo',
    'Energy from a source that is not depleted when used, such as wind or solar power.',
    'Many developed countries are investing heavily in renewable energy.',
    '["Clean Energy", "Green Power", "Sustainable Energy"]'::jsonb,
    1
  ),
  (
    'fc-re-02',
    'lesson-re-05',
    'Climate Change',
    '/ˈklaɪ.mət tʃeɪndʒ/',
    'noun phrase',
    'biến đổi khí hậu',
    'Long-term shifts in global or regional temperatures and weather patterns.',
    'Scientists warn that climate change will lead to more severe weather conditions in the near future.',
    '["Global Warming", "Climatic Shift"]'::jsonb,
    2
  ),
  (
    'fc-re-03',
    'lesson-re-05',
    'Solar Energy',
    '/ˈsəʊlər ˈɛnədʒi/',
    'noun phrase',
    'năng lượng mặt trời',
    'Radiant light and heat from the sun harnessed using photovoltaic panels.',
    'Installing panels on your roof is a great way to generate solar energy for household use.',
    '["Solar Power", "Photovoltaic Energy"]'::jsonb,
    3
  ),
  (
    'fc-re-04',
    'lesson-re-05',
    'Wind Energy',
    '/wɪnd ˈɛnədʒi/',
    'noun phrase',
    'năng lượng gió',
    'Electrical energy obtained from harnessing the wind with turbines.',
    'Coastal areas are ideal locations for capturing wind energy.',
    '["Wind Power"]'::jsonb,
    4
  ),
  (
    'fc-re-05',
    'lesson-re-05',
    'Hydro Energy',
    '/ˈhaɪdrəʊ ˈɛnədʒi/',
    'noun phrase',
    'thủy điện',
    'Electricity generated by harnessing the energy of flowing or falling water.',
    'Dams are built along major rivers to produce hydro energy for millions of homes.',
    '["Hydropower", "Hydroelectric Power"]'::jsonb,
    5
  ),
  (
    'fc-re-06',
    'lesson-re-05',
    'Biofuel',
    '/ˈbaɪəʊˌfjuːəl/',
    'noun',
    'nhiên liệu sinh học',
    'A fuel derived directly from living matter such as plants or agricultural waste.',
    'Using biofuel made from plants can help significantly lower greenhouse gas emissions from vehicles.',
    '["Biomass Fuel", "Green Fuel"]'::jsonb,
    6
  ),
  (
    'fc-re-07',
    'lesson-re-05',
    'Carbon Footprint',
    '/ˈkɑːbən ˈfʊtprɪnt/',
    'noun phrase',
    'lượng phát thải carbon (dấu chân carbon)',
    'The total amount of greenhouse gases produced by an individual, organization, or activity.',
    'Taking public transportation instead of driving every day is an easy way to lower your carbon footprint.',
    '["Carbon Emissions", "Emission Impact"]'::jsonb,
    7
  ),
  (
    'fc-re-08',
    'lesson-re-05',
    'Efficiency',
    '/ɪˈfɪʃənsi/',
    'noun',
    'hiệu suất (năng lượng)',
    'Achieving maximum productivity with minimum wasted energy or effort.',
    'Modern electrical appliances are designed to improve energy efficiency and save power.',
    '["Energy Optimization", "Conservation"]'::jsonb,
    8
  ),

  -- Deck 2: lesson-re-06 (7 cards)
  (
    'fc-re-09',
    'lesson-re-06',
    'Greenhouse Effect',
    '/ˈɡriːnhaʊs ɪˈfɛkt/',
    'noun phrase',
    'hiệu ứng nhà kính',
    'The trapping of the sun''s warmth in a planet''s lower atmosphere by greenhouse gases.',
    'The greenhouse effect causes global temperatures to rise by trapping heat in the Earth''s atmosphere.',
    '["Atmospheric Heat Trapping"]'::jsonb,
    1
  ),
  (
    'fc-re-10',
    'lesson-re-06',
    'Sea-Level Rise',
    '/siː ˈlɛvl raɪz/',
    'noun phrase',
    'mực nước biển dâng',
    'An increase in the level of the world''s oceans due to global warming and melting ice.',
    'Coastal cities are developing new flood defenses to protect against gradual sea-level rise.',
    '["Ocean Rise", "Coastal Inundation"]'::jsonb,
    2
  ),
  (
    'fc-re-11',
    'lesson-re-06',
    'Extreme Weather Events',
    '/ɪkˈstriːm ˈwɛðər ɪˈvɛnts/',
    'noun phrase',
    'các hiện tượng thời tiết cực đoan',
    'Severe or unseasonal weather conditions such as typhoons, heatwaves, floods, and droughts.',
    'Governments need to prepare better infrastructure to cope with frequent extreme weather events.',
    '["Severe Weather", "Climate Disasters"]'::jsonb,
    3
  ),
  (
    'fc-re-12',
    'lesson-re-06',
    'Biodiversity Loss',
    '/ˌbaɪəʊdaɪˈvɜːsɪti lɒs/',
    'noun phrase',
    'sự suy giảm đa dạng sinh học',
    'The decline or disappearance of biological diversity, including species and ecosystems.',
    'Habitat destruction is one of the main drivers of biodiversity loss around the globe.',
    '["Species Decline", "Ecological Loss"]'::jsonb,
    4
  ),
  (
    'fc-re-13',
    'lesson-re-06',
    'Deforestation',
    '/diːˌfɒrɪˈsteɪʃən/',
    'noun',
    'nạn phá rừng',
    'The action of clearing a wide area of trees and forests.',
    'Large-scale deforestation contributes directly to global warming by removing trees that absorb carbon dioxide.',
    '["Forest Clearing", "Logging"]'::jsonb,
    5
  ),
  (
    'fc-re-14',
    'lesson-re-06',
    'Ecosystem',
    '/ˈiːkəʊsɪstəm/',
    'noun',
    'hệ sinh thái',
    'A biological community of interacting organisms and their physical environment.',
    'Pollution poses a severe threat to the balance of the ocean ecosystem.',
    '["Habitat", "Biome", "Ecological Community"]'::jsonb,
    6
  ),
  (
    'fc-re-15',
    'lesson-re-06',
    'Conservation',
    '/ˌkɒnsəˈveɪʃən/',
    'noun',
    'sự bảo tồn / bảo vệ môi trường',
    'Preservation, protection, or restoration of the natural environment and wildlife.',
    'The government has established several national parks to promote wildlife conservation.',
    '["Preservation", "Environmental Protection"]'::jsonb,
    7
  )
ON CONFLICT (id) DO UPDATE SET
  lesson_id = EXCLUDED.lesson_id,
  term = EXCLUDED.term,
  phonetic = EXCLUDED.phonetic,
  part_of_speech = EXCLUDED.part_of_speech,
  vietnamese_meaning = EXCLUDED.vietnamese_meaning,
  definition = EXCLUDED.definition,
  example_sentence = EXCLUDED.example_sentence,
  synonyms = EXCLUDED.synonyms,
  sort_order = EXCLUDED.sort_order;

-- -----------------------------------------------------------------------------
-- 3. SEED LESSON COMPREHENSION QUESTIONS (10 Questions across 4 Reading Lessons)
-- -----------------------------------------------------------------------------
INSERT INTO public.lesson_questions (
  id, lesson_id, question, options, correct_index, explanation, sort_order
)
VALUES
  -- Lesson 1 Questions
  (
    'q-re-01-1',
    'lesson-re-01',
    'Why are coastal areas particularly suitable for generating renewable electricity?',
    '["They are ideal locations for capturing wind energy with turbines", "They prevent rivers from flowing into dams", "They increase fuel consumption in older vehicles", "They block sunlight from reaching rooftop solar panels"]'::jsonb,
    0,
    'Coastal areas experience steady, strong airflows, making them ideal locations for capturing wind energy.',
    1
  ),
  (
    'q-re-01-2',
    'lesson-re-01',
    'How does using biofuel benefit the transportation sector?',
    '["It replaces electrical appliances in homes", "It helps significantly lower greenhouse gas emissions from vehicles", "It builds concrete dams along major rivers", "It increases the heat lost by household lighting"]'::jsonb,
    1,
    'Biofuel made from plants provides a cleaner alternative to petroleum, helping lower greenhouse gas emissions from vehicles.',
    2
  ),
  (
    'q-re-01-3',
    'lesson-re-01',
    'What is the main purpose of improving energy efficiency in modern electrical appliances?',
    '["To consume more electricity during peak hours", "To save power and perform the same tasks using less energy", "To replace hydro energy with coal power", "To make appliances heavier and more complex"]'::jsonb,
    1,
    'Modern electrical appliances are engineered for high energy efficiency so households can save power and reduce waste.',
    3
  ),

  -- Lesson 2 Questions
  (
    'q-re-02-1',
    'lesson-re-02',
    'How does the greenhouse effect cause global temperatures to rise?',
    '["By cooling the ocean surface during winter storms", "By trapping heat in the Earth''s atmosphere", "By reflecting all sunlight away from the planet", "By building flood defenses in coastal cities"]'::jsonb,
    1,
    'Greenhouse gases act like an insulating blanket, trapping heat in the Earth''s atmosphere and raising global temperatures.',
    1
  ),
  (
    'q-re-02-2',
    'lesson-re-02',
    'Why are coastal cities investing in new flood defenses?',
    '["To protect communities against gradual sea-level rise", "To increase their daily carbon footprint", "To generate more greenhouse gases", "To stop public transportation from operating"]'::jsonb,
    0,
    'Melting ice and thermal expansion of ocean water cause gradual sea-level rise, threatening low-lying coastal cities.',
    2
  ),
  (
    'q-re-02-3',
    'lesson-re-02',
    'Which everyday habit is an effective way for individuals to lower their carbon footprint?',
    '["Driving a private car alone for every short trip", "Leaving air conditioners running in empty rooms", "Taking public transportation instead of driving every day", "Removing flood defenses from coastal regions"]'::jsonb,
    2,
    'Using buses, trains, or bicycles instead of driving alone every day significantly reduces personal carbon emissions.',
    3
  ),

  -- Lesson 3 Questions
  (
    'q-re-03-1',
    'lesson-re-03',
    'How does large-scale deforestation contribute directly to global warming?',
    '["By planting too many trees in national parks", "By removing trees that naturally absorb carbon dioxide from the atmosphere", "By cleaning plastic pollution from the ocean ecosystem", "By reducing the need for wildlife conservation"]'::jsonb,
    1,
    'Forests act as major carbon sinks; removing trees through deforestation stops them from absorbing atmospheric carbon dioxide.',
    1
  ),
  (
    'q-re-03-2',
    'lesson-re-03',
    'What is identified as one of the main drivers of biodiversity loss around the globe?',
    '["Establishing protected national parks", "Habitat destruction caused by human activities", "Using energy-efficient household appliances", "Expanding wildlife conservation programs"]'::jsonb,
    1,
    'When natural forests, wetlands, and reefs are destroyed, plant and animal species lose their habitats, driving biodiversity loss.',
    2
  ),

  -- Lesson 4 Questions
  (
    'q-re-04-1',
    'lesson-re-04',
    'How are sustainable cities reducing the carbon footprint of their public transit networks?',
    '["By replacing public buses with coal-powered locomotives", "By powering city bus fleets with clean biofuel and renewable electricity", "By encouraging all citizens to drive private cars every day", "By removing green building efficiency standards"]'::jsonb,
    1,
    'Transitioning public transit to biofuel and renewable electricity cuts urban transport emissions and lowers the city''s carbon footprint.',
    1
  ),
  (
    'q-re-04-2',
    'lesson-re-04',
    'Why do sustainable urban planners integrate wetland conservation and urban forests into city designs?',
    '["To protect the local ecosystem and prevent biodiversity loss", "To accelerate deforestation around metropolitan borders", "To trap more heat via the greenhouse effect", "To increase the severity of extreme weather events"]'::jsonb,
    0,
    'Preserving wetlands and urban forests supports wildlife conservation, stabilizes the local ecosystem, and prevents biodiversity loss.',
    2
  )
ON CONFLICT (id) DO UPDATE SET
  lesson_id = EXCLUDED.lesson_id,
  question = EXCLUDED.question,
  options = EXCLUDED.options,
  correct_index = EXCLUDED.correct_index,
  explanation = EXCLUDED.explanation,
  sort_order = EXCLUDED.sort_order;

-- -----------------------------------------------------------------------------
-- 4. SEED COUNTRIES (USA & England)
-- -----------------------------------------------------------------------------
INSERT INTO public.countries (
  id, name, code, flag, map_x, map_y, unlocked, mission_title, sort_order
)
VALUES
  ('usa', 'USA', 'US', '🇺🇸', '23%', '28%', true, 'Renewable Energy', 1),
  ('england', 'England', 'GB', '🇬🇧', '49%', '21%', false, 'Clean Transit & Grid', 2)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  flag = EXCLUDED.flag,
  map_x = EXCLUDED.map_x,
  map_y = EXCLUDED.map_y,
  unlocked = EXCLUDED.unlocked,
  mission_title = EXCLUDED.mission_title,
  sort_order = EXCLUDED.sort_order;

-- -----------------------------------------------------------------------------
-- 5. SEED MISSIONS (USA: Renewable Energy + Vocabulary, Listening, Sentences)
-- -----------------------------------------------------------------------------
INSERT INTO public.missions (
  id, country_id, title, briefing, learning_recap, stages_data, bonus_xp
)
VALUES
  (
    'renewable-energy',
    'usa',
    'Renewable Energy',
    '{
      "location": "🇺🇸 California & Texas Clean Energy Grid Lab",
      "scenario": "You are collaborating with renewable energy engineers in the United States. Your challenge is to communicate clearly about solar photovoltaic arrays, wind turbines, and smart battery storage in English.",
      "objectives": [
        { "icon": "☀️", "text": "Master core renewable energy & grid vocabulary" },
        { "icon": "🎧", "text": "Understand clean-tech engineering briefings" },
        { "icon": "🧩", "text": "Construct technical sustainability statements" }
      ]
    }'::jsonb,
    '{
      "stages": [
        { "icon": "☀️", "label": "Vocabulary", "summary": "6 core renewable energy & smart-grid terms" },
        { "icon": "🎧", "label": "Listening", "summary": "3 real-world clean-tech lab briefings" },
        { "icon": "🧩", "label": "Communication", "summary": "You can now explain:" }
      ],
      "communicationTakeaway": "Solar panels convert sunlight directly into clean electricity."
    }'::jsonb,
    '{
      "stages": [
        { "id": "vocabulary", "type": "vocabulary", "title": "Vocabulary" },
        { "id": "listening", "type": "listening", "title": "Listening" },
        { "id": "sentence", "type": "sentence", "title": "Sentence" }
      ],
      "reward": {
        "stamp": { "name": "Clean Energy Grid Pioneer", "icon": "🇺🇸" },
        "badge": { "name": "USA Clean-Tech Pioneer", "icon": "🏅" },
        "gift": {
          "name": "Mini Solar Turbine Model",
          "icon": "☀️",
          "description": "A precision kinetic solar-and-wind turbine engineering model from the USA Clean Energy Innovation Lab."
        },
        "bonusXP": 30
      },
      "vocabularyItems": [
        {
          "id": "vocab-photovoltaic",
          "word": "photovoltaic",
          "meaning": "quang điện",
          "question": "\"photovoltaic\" có nghĩa là gì?",
          "options": ["Nhiệt điện", "Quang điện", "Thủy điện", "Hạt nhân"],
          "correctIndex": 1,
          "xp": 10
        },
        {
          "id": "vocab-turbine",
          "word": "wind turbine",
          "meaning": "tua-bin gió",
          "question": "\"wind turbine\" có nghĩa là gì?",
          "options": ["Pin mặt trời", "Lưới điện", "Tua-bin gió", "Máy biến áp"],
          "correctIndex": 2,
          "xp": 10
        },
        {
          "id": "vocab-renewable",
          "word": "renewable",
          "meaning": "tái tạo được",
          "question": "\"renewable\" có nghĩa là gì?",
          "options": ["Hóa thạch", "Tái tạo được", "Độc hại", "Tạm thời"],
          "correctIndex": 1,
          "xp": 10
        },
        {
          "id": "vocab-inverter",
          "word": "inverter",
          "meaning": "bộ biến tần",
          "question": "\"inverter\" là thiết bị dùng để làm gì?",
          "options": ["Đốt nhiên liệu", "Làm mát động cơ", "Bộ biến tần (đổi điện DC sang AC)", "Đo tốc độ gió"],
          "correctIndex": 2,
          "xp": 10
        },
        {
          "id": "vocab-grid-storage",
          "word": "grid storage",
          "meaning": "lưu trữ điện lưới",
          "question": "\"grid storage\" có nghĩa là gì?",
          "options": ["Tiêu thụ điện năng", "Rò rỉ năng lượng", "Lưu trữ điện lưới", "Khí thải carbon"],
          "correctIndex": 2,
          "xp": 10
        },
        {
          "id": "vocab-sustainable",
          "word": "sustainable",
          "meaning": "bền vững",
          "question": "\"sustainable\" được dùng để mô tả điều gì?",
          "options": ["Gây ô nhiễm cao", "Khan hiếm", "Bền vững, thân thiện môi trường", "Đắt đỏ"],
          "correctIndex": 2,
          "xp": 10
        }
      ],
      "listeningItems": [
        {
          "id": "listen-1",
          "scenario": "Solar Grid Lab",
          "sentence": "Our photovoltaic panels convert sunlight directly into clean electricity.",
          "question": "Hệ thống tấm pin quang điện thực hiện chức năng gì?",
          "options": ["Đốt than để tạo nhiệt", "Chuyển đổi ánh sáng mặt trời trực tiếp thành điện sạch", "Lưu trữ nước mưa cho nông nghiệp", "Làm mát tòa nhà bằng khí tự nhiên"],
          "correctIndex": 1,
          "xp": 10
        },
        {
          "id": "listen-2",
          "scenario": "Wind Farm Control",
          "sentence": "We store excess wind power in grid-scale lithium batteries for evening peak demand.",
          "question": "Kỹ sư lưu trữ nguồn điện gió dư thừa ở đâu?",
          "options": ["Trong máy phát chạy dầu", "Trong bình khí nén nhỏ", "Trong hệ thống pin lithium quy mô lưới điện", "Truyền thẳng ra biển"],
          "correctIndex": 2,
          "xp": 10
        },
        {
          "id": "listen-3",
          "scenario": "Sustainability Briefing",
          "sentence": "Switching to renewable energy significantly reduces our campus carbon footprint.",
          "question": "Việc chuyển sang năng lượng tái tạo mang lại lợi ích gì?",
          "options": ["Tăng chi phí vận hành gấp đôi", "Tăng lượng khí thải nhà kính", "Giảm đáng kể lượng khí thải carbon của khuôn viên trường", "Thay thế hoàn toàn mạng internet"],
          "correctIndex": 2,
          "xp": 10
        }
      ],
      "sentenceItems": [
        {
          "id": "sentence-1",
          "round": 1,
          "targetSentence": "Solar panels convert sunlight into electricity",
          "words": ["sunlight", "Solar", "electricity", "convert", "panels", "into"],
          "points": 10,
          "timeLimit": 30
        },
        {
          "id": "sentence-2",
          "round": 2,
          "targetSentence": "Wind turbines generate clean renewable power",
          "words": ["clean", "Wind", "power", "generate", "turbines", "renewable"],
          "points": 15,
          "timeLimit": 25
        },
        {
          "id": "sentence-3",
          "round": 3,
          "targetSentence": "Battery storage stabilizes the smart power grid",
          "words": ["grid", "Battery", "stabilizes", "the", "storage", "power", "smart"],
          "points": 20,
          "timeLimit": 20
        },
        {
          "id": "sentence-4",
          "round": 4,
          "targetSentence": "Renewable energy reduces our global carbon footprint",
          "words": ["carbon", "Renewable", "our", "reduces", "energy", "footprint", "global"],
          "points": 25,
          "timeLimit": 15
        },
        {
          "id": "sentence-5",
          "round": 5,
          "targetSentence": "An inverter changes direct current into alternating current",
          "words": ["current", "An", "into", "inverter", "direct", "changes", "alternating", "current"],
          "points": 25,
          "timeLimit": 15
        },
        {
          "id": "sentence-6",
          "round": 6,
          "targetSentence": "Silicon semiconductors absorb photons from solar radiation",
          "words": ["photons", "Silicon", "from", "semiconductors", "absorb", "radiation", "solar"],
          "points": 25,
          "timeLimit": 15
        },
        {
          "id": "sentence-7",
          "round": 7,
          "targetSentence": "Offshore wind farms capture strong coastal breezes efficiently",
          "words": ["strong", "Offshore", "capture", "wind", "breezes", "farms", "coastal", "efficiently"],
          "points": 30,
          "timeLimit": 10
        },
        {
          "id": "sentence-8",
          "round": 8,
          "targetSentence": "Microgrids can operate independently during severe weather outages",
          "words": ["independently", "Microgrids", "during", "can", "weather", "operate", "severe", "outages"],
          "points": 30,
          "timeLimit": 10
        },
        {
          "id": "sentence-9",
          "round": 9,
          "targetSentence": "Geothermal plants harness underground heat for continuous baseload power",
          "words": ["underground", "Geothermal", "for", "plants", "heat", "harness", "continuous", "power", "baseload"],
          "points": 30,
          "timeLimit": 10
        },
        {
          "id": "sentence-10",
          "round": 10,
          "targetSentence": "Sustainable infrastructure combines solar arrays with high capacity battery banks",
          "words": ["arrays", "Sustainable", "with", "infrastructure", "solar", "combines", "high", "battery", "capacity", "banks"],
          "points": 30,
          "timeLimit": 10
        }
      ]
    }'::jsonb,
    30
  )
ON CONFLICT (id) DO UPDATE SET
  country_id = EXCLUDED.country_id,
  title = EXCLUDED.title,
  briefing = EXCLUDED.briefing,
  learning_recap = EXCLUDED.learning_recap,
  stages_data = EXCLUDED.stages_data,
  bonus_xp = EXCLUDED.bonus_xp;

-- -----------------------------------------------------------------------------
-- 6. SEED EVENTS (3 Community Events)
-- -----------------------------------------------------------------------------
INSERT INTO public.events (
  id, title, subtitle, category, format_label, date_label, time_label,
  location, host, description, rewards, base_registered_count, sort_order
)
VALUES
  (
    'event-monthly-meetup',
    'Wordwise Monthly Community Meeting',
    'Online Hangout & Sharing with Learners Across Vietnam',
    'meetup',
    'Online Hangout & Sharing',
    'Last Sunday of Every Month',
    '20:00 – 21:00 (GMT+7)',
    'Google Meet / Wordwise Discord Lounge',
    'Wordwise Student Community Leads',
    'A friendly monthly catch-up for Wordwise learners to share study tips, practice casual English icebreakers, suggest new countries for the app, and meet fellow STEM students across Vietnam.',
    'Community Contributor Badge + 50 XP',
    42,
    1
  ),
  (
    'event-clean-tech-roundtable',
    'Weekend STEM Speaking Club: Clean Energy & Smart Grids',
    'Small-Group Speaking Practice (4–5 students/room)',
    'meetup',
    'Small-Group Speaking Practice',
    'Next Saturday',
    '19:30 – 20:30 (GMT+7)',
    'Online Breakout Rooms (4–5 students/room)',
    'Wordwise Speaking Club Moderators',
    'Relaxed, no-pressure English speaking session guided by student moderators. Practice using real-world vocabulary from the USA Renewable Energy & Smart Grid modules in technical discussion.',
    'Speaking Practice Streak + 40 XP',
    28,
    2
  ),
  (
    'event-vocab-sprint',
    '7-Day Clean Energy Vocabulary Sprint',
    'Self-Paced Mini Challenge for High-School Learners',
    'challenge',
    'Self-Paced Mini Challenge',
    'Starts Monday • 1 Week Challenge',
    'Flexible / Self-Paced',
    'Wordwise Learning Library & Flashcards',
    'Wordwise Curriculum Team',
    'Complete all 4 Renewable Energy reading lessons and master the 15 core vocabulary flashcards within 7 days. A fun, achievable goal to build your daily English study habit.',
    'Eco-Learner Digital Certificate + 100 XP',
    65,
    3
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  subtitle = EXCLUDED.subtitle,
  category = EXCLUDED.category,
  format_label = EXCLUDED.format_label,
  date_label = EXCLUDED.date_label,
  time_label = EXCLUDED.time_label,
  location = EXCLUDED.location,
  host = EXCLUDED.host,
  description = EXCLUDED.description,
  rewards = EXCLUDED.rewards,
  base_registered_count = EXCLUDED.base_registered_count,
  sort_order = EXCLUDED.sort_order;
