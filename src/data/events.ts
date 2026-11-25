/**
 * STEM English Community Events & Study Challenges Data — Milestone P4.3.
 *
 * Practical, relatable, and student-friendly community events for Vietnamese
 * high-school learners practicing English for STEM, clean tech, and daily life.
 */

export type EventCategory = "all" | "meetup" | "challenge" | "registered";

export interface STEMEvent {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  format: string;
  badge: "MEETUP" | "SPEAKING CLUB" | "CHALLENGE";
  category: "meetup" | "challenge";
  date: string;
  dateBadge: string;
  time: string;
  location: string;
  host: string;
  attendeesCount: number;
  xpReward: number;
  perks: string;
  coverEmoji: string;
  tags: string[];
}

export const STEM_EVENTS: STEMEvent[] = [
  {
    id: "event-monthly-meetup",
    title: "Wordwise Monthly Community Meeting",
    subtitle: "Online Hangout & Sharing with Learners Across Vietnam",
    description:
      "A friendly monthly catch-up for Wordwise learners to share study tips, practice casual English icebreakers, suggest new countries for the app, and meet fellow STEM students across Vietnam.",
    format: "Online Hangout & Sharing",
    badge: "MEETUP",
    category: "meetup",
    date: "Last Sunday of Every Month",
    dateBadge: "Monthly Meetup",
    time: "20:00 – 21:00 (GMT+7)",
    location: "Google Meet / Wordwise Discord Lounge",
    host: "Wordwise Student Community Leads",
    attendeesCount: 42,
    xpReward: 50,
    perks: "Community Contributor Badge + 50 XP",
    coverEmoji: "🤝",
    tags: ["Community", "Meetup", "Icebreakers", "Student Life"],
  },
  {
    id: "event-clean-tech-roundtable",
    title: "Weekend STEM Speaking Club: Clean Energy & Smart Grids",
    subtitle: "Small-Group Speaking Practice (4–5 students/room)",
    description:
      "Relaxed, no-pressure English speaking session guided by student moderators. Practice using real-world vocabulary from the USA Renewable Energy & Smart Grid modules in technical discussion.",
    format: "Small-Group Speaking Practice",
    badge: "SPEAKING CLUB",
    category: "meetup",
    date: "Next Saturday",
    dateBadge: "This Weekend",
    time: "19:30 – 20:30 (GMT+7)",
    location: "Online Breakout Rooms (4–5 students/room)",
    host: "Wordwise Speaking Club Moderators",
    attendeesCount: 28,
    xpReward: 40,
    perks: "Speaking Practice Streak + 40 XP",
    coverEmoji: "⚡",
    tags: ["Speaking Club", "STEM Roundtable", "Clean Energy", "Smart Grid"],
  },
  {
    id: "event-vocab-sprint",
    title: "7-Day Clean Energy Vocabulary Sprint",
    subtitle: "Self-Paced Mini Challenge for High-School Learners",
    description:
      "Complete all 4 Renewable Energy reading lessons and master the 15 core vocabulary flashcards within 7 days. A fun, achievable goal to build your daily English study habit.",
    format: "Self-Paced Mini Challenge",
    badge: "CHALLENGE",
    category: "challenge",
    date: "Starts Monday • 1 Week Challenge",
    dateBadge: "Starts Monday",
    time: "Flexible / Self-Paced",
    location: "Wordwise Learning Library & Flashcards",
    host: "Wordwise Curriculum Team",
    attendeesCount: 65,
    xpReward: 100,
    perks: "Eco-Learner Digital Certificate + 100 XP",
    coverEmoji: "🌱",
    tags: ["Sprint", "Vocabulary", "Self-Paced", "Renewable Energy"],
  },
];
