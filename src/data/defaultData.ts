import type { Question, Team } from '../types';


export const INITIAL_TEAMS: Team[] = [
  {
    id: 'team-1',
    name: 'ROW 1',
    score: 450,
    color: 'red',
    initialRank: 1,
    strikes: 0,
  },
  {
    id: 'team-2',
    name: 'ROW 2',
    score: 320,
    color: 'blue',
    initialRank: 2,
    strikes: 0,
  },
  {
    id: 'team-3',
    name: 'ROW 3',
    score: 210,
    color: 'green',
    initialRank: 3,
    strikes: 0,
  },
  {
    id: 'team-4',
    name: 'ROW 4',
    score: 150,
    color: 'purple',
    initialRank: 4,
    strikes: 0,
  },
];

export const DEFAULT_QUESTIONS: Question[] = [
  {
    id: 'q-1',
    roundTitle: 'ROUND 1 • SINGLE POINTS',
    multiplier: 1,
    questionText: 'Name something students do right after waking up.',
    answers: [
      { id: 'a-1-1', text: 'Check their phone', points: 35, isRevealed: false },
      { id: 'a-1-2', text: 'Go back to sleep', points: 25, isRevealed: false },
      { id: 'a-1-3', text: 'Brush their teeth', points: 18, isRevealed: false },
      { id: 'a-1-4', text: 'Check messages', points: 12, isRevealed: false },
      { id: 'a-1-5', text: 'Get ready for college', points: 7, isRevealed: false },
      { id: 'a-1-6', text: 'Drink water', points: 3, isRevealed: false },
    ],
  },
  {
    id: 'q-2',
    roundTitle: 'ROUND 2 • SINGLE POINTS',
    multiplier: 1,
    questionText: "Name the first thing a developer blames when code doesn't run.",
    answers: [
      { id: 'a-2-1', text: 'The WiFi or Server', points: 36, isRevealed: false },
      { id: 'a-2-2', text: 'Browser cache / build cache', points: 27, isRevealed: false },
      { id: 'a-2-3', text: 'Their teammate', points: 18, isRevealed: false },
      { id: 'a-2-4', text: 'A broken dependency update', points: 11, isRevealed: false },
      { id: 'a-2-5', text: 'The AI gave wrong prompt', points: 5, isRevealed: false },
      { id: 'a-2-6', text: 'Operating system glitch', points: 3, isRevealed: false },
    ],
  },
  {
    id: 'q-3',
    roundTitle: 'ROUND 3 • DOUBLE POINTS',
    multiplier: 2,
    questionText: 'Name a tool or tab every tech student keeps open 24/7.',
    answers: [
      { id: 'a-3-1', text: 'VS Code / Code Editor', points: 40, isRevealed: false },
      { id: 'a-3-2', text: 'ChatGPT / Gemini AI', points: 26, isRevealed: false },
      { id: 'a-3-3', text: 'YouTube / Spotify', points: 16, isRevealed: false },
      { id: 'a-3-4', text: 'GitHub / GitLab', points: 10, isRevealed: false },
      { id: 'a-3-5', text: 'Discord / WhatsApp', points: 5, isRevealed: false },
      { id: 'a-3-6', text: 'Stack Overflow', points: 3, isRevealed: false },
    ],
  },
  {
    id: 'q-4',
    roundTitle: 'ROUND 4 • DOUBLE POINTS',
    multiplier: 2,
    questionText: 'Name a snack or drink powering hackathon teams at 3 AM.',
    answers: [
      { id: 'a-4-1', text: 'Coffee / Energy Drinks', points: 41, isRevealed: false },
      { id: 'a-4-2', text: 'Instant Noodles / Maggi', points: 26, isRevealed: false },
      { id: 'a-4-3', text: 'Pizza slices', points: 16, isRevealed: false },
      { id: 'a-4-4', text: 'Chips & Nachos', points: 9, isRevealed: false },
      { id: 'a-4-5', text: 'Chocolates / Candy', points: 5, isRevealed: false },
      { id: 'a-4-6', text: 'Cold Soda / Soft drinks', points: 3, isRevealed: false },
    ],
  },
  {
    id: 'q-5',
    roundTitle: 'ROUND 5 • TRIPLE POINTS',
    multiplier: 3,
    questionText: 'Name a classic excuse for submitting an assignment late.',
    answers: [
      { id: 'a-5-1', text: 'Laptop crashed / died', points: 38, isRevealed: false },
      { id: 'a-5-2', text: 'WiFi / Internet down', points: 25, isRevealed: false },
      { id: 'a-5-3', text: 'Thought deadline was midnight', points: 17, isRevealed: false },
      { id: 'a-5-4', text: 'Git merge conflict', points: 11, isRevealed: false },
      { id: 'a-5-5', text: 'File was corrupted', points: 6, isRevealed: false },
      { id: 'a-5-6', text: 'Submitted wrong PDF', points: 3, isRevealed: false },
    ],
  },
];
