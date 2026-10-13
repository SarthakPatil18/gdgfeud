export type AudioAssetKey =
  | 'theme'
  | 'faceoff'
  | 'questionReveal'
  | 'correctDing'
  | 'strikeBuzzer'
  | 'countdown'
  | 'roundWin'
  | 'finalWinner';

export interface AudioAssetDefinition {
  key: AudioAssetKey;
  label: string;
  category: 'music' | 'sfx';
  description: string;
  recommendedDuration: string;
  suggestedFileName: string;
}

export interface AudioAssetMetadata {
  key: AudioAssetKey;
  fileName: string;
  fileSize: number;
  mimeType: string;
  updatedAt: number;
  isConfigured: boolean;
}

export const AUDIO_EVENT_DEFINITIONS: AudioAssetDefinition[] = [
  {
    key: 'theme',
    label: 'Original Opening Theme',
    category: 'music',
    description: 'Iconic opening theme played during team introductions and show start.',
    recommendedDuration: '30s – 60s',
    suggestedFileName: 'family_feud_main_theme.mp3',
  },
  {
    key: 'faceoff',
    label: 'Face-Off Music',
    category: 'music',
    description: 'Tense anticipation cue played as team representatives approach the buzzer podium.',
    recommendedDuration: '10s – 20s',
    suggestedFileName: 'face_off_cue.mp3',
  },
  {
    key: 'questionReveal',
    label: 'Question Reveal Cue',
    category: 'sfx',
    description: 'Musical sting or synthesizer whoosh played when a new question board is introduced.',
    recommendedDuration: '2s – 4s',
    suggestedFileName: 'question_reveal_sting.mp3',
  },
  {
    key: 'correctDing',
    label: 'Correct-Answer Ding',
    category: 'sfx',
    description: 'Recognizable game-show bell ding played when a contestant guess appears on the board.',
    recommendedDuration: '1s – 2s',
    suggestedFileName: 'correct_answer_ding.mp3',
  },
  {
    key: 'strikeBuzzer',
    label: 'Wrong-Answer Strike Buzzer',
    category: 'sfx',
    description: 'Classic harsh square-wave buzzer played when an incorrect guess receives a strike (X).',
    recommendedDuration: '1s – 2s',
    suggestedFileName: 'strike_buzzer.mp3',
  },
  {
    key: 'countdown',
    label: 'Fast Money / Countdown Music',
    category: 'music',
    description: 'Pulsing rhythmic ticking music played during the round countdown timer.',
    recommendedDuration: '20s – 35s',
    suggestedFileName: 'fast_money_countdown.mp3',
  },
  {
    key: 'roundWin',
    label: 'Round-Win Music',
    category: 'music',
    description: 'Celebratory musical cue played when round bank points are awarded to a row team.',
    recommendedDuration: '5s – 10s',
    suggestedFileName: 'round_win_theme.mp3',
  },
  {
    key: 'finalWinner',
    label: 'Final Winner Music',
    category: 'music',
    description: 'Full triumphant fanfare and tournament championship music for the podium celebration.',
    recommendedDuration: '20s – 45s',
    suggestedFileName: 'championship_victory_theme.mp3',
  },
];
