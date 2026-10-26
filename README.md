# GDG FEUD — Interactive Family Feud-Style Scoreboard
### Dual-Display Auditorium System & Authentic Audio Mapping

[![React](https://img.shields.io/badge/React-19-61dafb?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8-646cff?style=flat&logo=vite)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-4-38bdf8?style=flat&logo=tailwindcss)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

GDG FEUD is designed for college orientation events, tech community meetups, and hackathons with an authentic **Dual-Display Architecture**:
1. **Host Control Panel (`/host`)** operated on the host's laptop for live game orchestration.
2. **Projector Display (`/display`)** projected onto the auditorium stage screen with real-time flip animations.
3. **Launcher & Setup Hub (`/`)** for rapid configuration, quick navigation, and local network display setup.

---

## Table of Contents

- [Features Overview](#features-overview)
- [Architecture & Real-Time Sync](#architecture--real-time-sync)
- [Tech Stack](#tech-stack)
- [Authentic Audio Asset Mapping & Host Upload](#authentic-audio-asset-mapping--host-upload)
- [Row-Specific Strikes & Steal Mechanics](#row-specific-strikes--steal-mechanics-gdg-feud-rules)
- [Interactive Projector Display Controls](#interactive-projector-display-display-controls)
- [Question Management & Custom Rounds](#question-management--custom-rounds)
- [Keyboard Shortcuts Reference](#keyboard-shortcuts-reference)
- [Auditorium Operations Runbook](#auditorium-operations-runbook)
- [Installation & Local Setup](#installation--local-setup)
- [Troubleshooting & FAQ](#troubleshooting--faq)
- [License](#license)

---

## Features Overview

- **Auditorium Dual-Screen Flow**: Seamless synchronization between the Host Control Panel and public-facing Projector Display.
- **Low-Latency Audio Engine**: Synthesized web audio fallback combined with host-uploadable high-fidelity audio tracks stored in IndexedDB.
- **Dynamic 3D Flip Cards**: TV-authentic answer tile reveals with perspective CSS transforms and responsive grid layouts.
- **Multi-Row Audience Engagement**: Unique row-based scoring mechanism dividing attendees into 4 auditorium zones with independent strike counters.
- **Interactive Presenter Support**: Stage presenters can tap answers on touchscreens or use wireless presentation remotes directly on the display view.
- **Real-Time State Bus**: Dual broadcast pipeline using browser `BroadcastChannel` for same-device multi-monitor tabs and WebSocket for cross-network devices.
- **Party FX & Confetti**: Canvas confetti physics celebration on round wins and championship crowns.

---

## Architecture & Real-Time Sync

GDG FEUD utilizes a resilient hybrid state distribution strategy optimized for auditorium environments:

```text
  +-----------------------------------------------------------------------+
  |                        Host Operator Laptop                           |
  |  +------------------------+             +---------------------------+ |
  |  |   Host View (/host)    | <---------> | IndexedDB Audio Storage   | |
  |  +-----------+------------+             +---------------------------+ |
  +--------------|--------------------------------------------------------+
                 |
         +-------+-------+
         |               |
         v               v
  [BroadcastChannel]  [WebSocket Relay Server (ws://0.0.0.0:5174)]
   (Zero-latency       (Cross-device local Wi-Fi sync)
    same-machine)        |
         |               |
         +-------+-------+
                 |
                 v
  +-----------------------------------------------------------------------+
  |                     Projector Display (/display)                      |
  |  - Fullscreen Flip Board UI                                           |
  |  - Audience Strike FX & Winner Podium                                 |
  |  - Synchronized Audio Player                                          |
  +-----------------------------------------------------------------------+
```

### State Synchronization Layers
1. **Primary: `BroadcastChannel` API**:
   - Zero-latency, memory-efficient intra-browser channel.
   - Ideal when the host machine connects directly to the projector via HDMI or USB-C extended display.
2. **Secondary: WebSocket Relay Service**:
   - Allows host and projector to run on completely separate laptops connected over the venue Wi-Fi.
   - Automatic reconnect logic with heartbeat keep-alive.
3. **Local Persistence: IndexedDB**:
   - Audio files and question sets are stored client-side in the browser storage, surviving accidental tab refreshes or lost internet connection.

---

## Tech Stack

| Technology | Purpose |
|---|---|
| **React 19** | Concurrent UI rendering and component hierarchy |
| **TypeScript 5+** | Full type safety across game state, audio events, and WebSocket payloads |
| **Vite 8** | Next-generation fast frontend tooling and HMR |
| **Tailwind CSS 4** | Utility-first styling with modern CSS engine `@tailwindcss/vite` |
| **Lucide React** | Clean, accessible iconography for host controls |
| **Canvas Confetti** | Dynamic celebratory particle rendering on round & match wins |
| **WebSocket (`ws`)** | Real-time cross-device broadcast synchronization |
| **Oxlint & Vitest** | High-performance linting and unit test framework |

## Authentic Audio Asset Mapping & Host Upload

GDG FEUD features an explicit audio asset mapping for the 8 recognizable Family Feud soundtracks and cues.

### Audio Event Mapping

| Event Key | Label | Type | Description |
|---|---|---|---|
| `theme` | **Original Opening Theme** | Music | Iconic opening theme played during team intros and show start |
| `faceoff` | **Face-Off Music** | Music | Tense anticipation cue played as team captains approach the podium |
| `questionReveal` | **Question Reveal Cue** | SFX | Musical sting/whoosh played when a new question board appears |
| `correctDing` | **Correct-Answer Ding** | SFX | Bell chime played when a revealed answer tile flips open |
| `strikeBuzzer` | **Wrong-Answer Strike Buzzer**| SFX | Classic harsh buzzer played when an incorrect guess receives a strike |
| `countdown` | **Fast Money / Countdown Music** | Music | Rhythmic ticking music played during the round countdown timer |
| `roundWin` | **Round-Win Music** | Music | Celebratory cue played when round bank points are awarded to a team |
| `finalWinner` | **Final Winner Music** | Music | Full championship victory fanfare for the podium celebration |

---

## Legal & Compliance Design

- **No Scraping or Automatic Downloading**: The application never scrapes or downloads copyrighted music automatically.
- **Clear Status Display**: Any event without a configured local file displays `⚠️ Audio asset missing`.
- **Host File Assignment**: The host can supply legally obtained audio files (`.mp3`, `.wav`, `.ogg`, `.m4a`) directly via the **Audio Assets** modal in `/host`.
- **100% Offline Persistence**: Uploaded audio files are stored in the browser's local **IndexedDB** database (`gdg_feud_audio_assets_v1`). Once loaded, all audio works completely offline without network requests.
- **Multi-Screen Audio Sync**: Files uploaded in `/host` are instantly synchronized to `/display` via `BroadcastChannel`, allowing sound to be routed directly through the auditorium PA system.
- **Graceful Fallback**: If an authentic track has not yet been supplied, a subtle synthesized cue plays for sound effects (ding/buzzer/tick), while background music remains silent until the authentic file is configured.

## Row-Specific Strikes & Steal Mechanics (GDG Feud Rules)

In GDG Feud, attendees are organized by auditorium rows (Row 1 Red, Row 2 Blue, Row 3 Green, Row 4 Purple). Host operators can assign strikes directly to a specific row:

- **Per-Row Strike Counters**: Each row tracks 0 to 3 strikes (`X`, `X X`, `X X X`).
- **Visual Display & Auditory Cue**:
  - Giving a strike triggers the authentic **Strike Buzzer** and a fullscreen glowing strike flash on `/display` announcing `STRIKE FOR ROW 1!`.
  - On the **Leaderboard View**, red 3D `X` badges display on the row's score bar.
  - On the **Question Board**, row badges track live strikes for all 4 auditorium rows.
- **3 Strikes & Steal Alert**:
  - When a row hits 3 strikes, a prominent `🚨 3 STRIKES! STEAL OPPORTUNITY!` banner flashes on both the host console and projector display.
  - The host can then invite competing rows to attempt a steal before awarding round bank points.
- **Host Controls**:
  - **Clickable Row Action Cards**: Located directly on each team card in the left column and in the dedicated Row Strikes Control Center inside the Question Board operations section.
  - **Quick Reset**: Individual row strikes can be reset or cleared across all rows with a single click.
  - **Host Keyboard Shortcuts**:
    - `Shift + 1`: Add strike to **Row 1**
    - `Shift + 2`: Add strike to **Row 2**
    - `Shift + 3`: Add strike to **Row 3**
    - `Shift + 4`: Add strike to **Row 4**
    - `X`: Add strike to the active row / buzzer
    - `1` through `6`: Reveal/Hide Answer slots 1–6
    - `L`: Switch Projector to Leaderboard View
    - `Q`: Switch Projector to Question Board View
    - `F`: Toggle Fullscreen mode
    - `Ctrl + Z`: Undo last action

---

## Interactive Projector Display (`/display`) Controls

When operating on the projector screen or using an onstage presenter remote clicker / air mouse:
- **Click the Question Banner**: Automatically reveals the next unrevealed answer (in slot order 1–6) and plays the authentic ding cue.
- **Click Any Answer Tile**: Directly flips open that numbered tile to reveal its answer and points.
- **Presenter Remote / Keyboard Shortcuts on Projector (`/display`)**:
  - <kbd>Space</kbd> / <kbd>Enter</kbd> / <kbd>→</kbd> / <kbd>PageDown</kbd>: Reveal next unrevealed answer
  - <kbd>1</kbd> through <kbd>6</kbd>: Reveal specific answer slot 1–6
  - <kbd>X</kbd>: Strike buzzer
  - <kbd>F</kbd>: Fullscreen projector display
- **Instant State Synchronization**: Any answer revealed directly from the projector screen immediately updates the Host Control Panel (`/host`) and all connected devices via `BroadcastChannel` and WebSocket.

---

## Question Management & Custom Rounds

Hosts can customize questions on the fly or load custom game packages for special events.

### Built-in Question Manager
In the Host Control Panel (`/host`), click **Manage Questions** to open the interactive editor:
- **Add / Edit / Delete Questions**: Update question prompts, point multipliers, and round names.
- **Answer Slots**: Configure 4 to 8 ranked answers with point values (standard Family Feud total: 100 points).
- **Point Multipliers**: Support for single, double, and triple point rounds (e.g. Round 3 Double Points, Round 4 Triple Points).
- **Import / Export**: Export question sets as JSON files to share between organizers or backup before an event.

### Question Data Schema
Questions are structured using the following TypeScript interface:
```typescript
interface Answer {
  id: string;
  text: string;
  points: number;
  revealed: boolean;
}

interface Question {
  id: string;
  text: string;
  multiplier: 1 | 2 | 3;
  answers: Answer[];
}
```

---

## Keyboard Shortcuts Reference

Quick-reference table of hotkeys available across views during live gameplay:

| Key Binding | View | Action |
|---|---|---|
| <kbd>1</kbd> – <kbd>6</kbd> | Host & Display | Toggle / Reveal answer slot 1 through 6 |
| <kbd>Shift</kbd> + <kbd>1</kbd> | Host | Add strike to **Row 1** (Red) |
| <kbd>Shift</kbd> + <kbd>2</kbd> | Host | Add strike to **Row 2** (Blue) |
| <kbd>Shift</kbd> + <kbd>3</kbd> | Host | Add strike to **Row 3** (Green) |
| <kbd>Shift</kbd> + <kbd>4</kbd> | Host | Add strike to **Row 4** (Purple) |
| <kbd>X</kbd> | Host & Display | Trigger wrong-answer buzzer & strike cue |
| <kbd>Space</kbd> / <kbd>Enter</kbd> | Display | Reveal the next available unrevealed answer tile |
| <kbd>→</kbd> / <kbd>PageDown</kbd> | Display | Presenter remote advancement to next answer |
| <kbd>Q</kbd> | Host | Switch display to **Question Board** mode |
| <kbd>L</kbd> | Host | Switch display to **Leaderboard** mode |
| <kbd>F</kbd> | Host & Display | Toggle browser fullscreen mode |
| <kbd>Ctrl</kbd> + <kbd>Z</kbd> | Host | Undo last scoring or strike action |

---

## Auditorium Operations Runbook

A recommended checklist for AV technicians and event MCs running GDG Feud in an auditorium:

### 1. 30 Minutes Pre-Show (Setup & Sound Check)
- [ ] Connect host laptop to auditorium HDMI / projector or open `/display` on the presentation machine.
- [ ] Ensure the browser audio policy is satisfied (click anywhere in `/display` to permit Web Audio autoplay).
- [ ] Open the **Audio Assets** modal in `/host` and test play `theme`, `correctDing`, and `strikeBuzzer`.
- [ ] Switch projector display to Fullscreen (<kbd>F</kbd>).

### 2. Live Match Execution
- **Face-Off Phase**: Call two row representatives to the front podium. Play `faceoff` music. Reveal answer upon first correct buzz.
- **In-Play Guessing**: The row with control guesses remaining answers. On a correct guess, press the corresponding answer number (<kbd>1</kbd>–<kbd>6</kbd>).
- **Strikes**: On a wrong answer, hit <kbd>Shift</kbd> + `<row>` or click the strike card.
- **Steal Opportunity**: When a row receives 3 strikes, the steal alert triggers. Announce the other 3 rows' chance to steal. Award accumulated bank points with one click.

### 3. Tiebreaker & Victory Celebration
- In the event of a tie score between rows, load a Sudden Death tiebreaker round (single #1 answer).
- On match conclusion, hit the crown button on the winning row to trigger victory fanfare and fullscreen confetti cannon.

---

## Live Production Links (Vercel)

* **Production URL:** [https://gdg-feud.vercel.app](https://gdg-feud.vercel.app)
* **Host Control Panel:** [https://gdg-feud.vercel.app/host](https://gdg-feud.vercel.app/host)
* **Projector Display:** [https://gdg-feud.vercel.app/display](https://gdg-feud.vercel.app/display)

---

## Local Development & Auditorium Links

* **Launcher Hub:** `http://localhost:5173/`
* **Host Control Room:** `http://localhost:5173/host`
* **Projector Display:** `http://localhost:5173/display`
* **Local Network IP (Same Wi-Fi):** `http://192.168.0.101:5173`
* **Real-time Sync WebSocket:** `ws://0.0.0.0:5174`

---

## Installation & Local Setup

### Prerequisites
- **Node.js**: v18.0.0 or later (Node 20+ recommended)
- **npm** or **pnpm** / **yarn**

### 1. Clone the Repository
```bash
git clone https://github.com/SarthakPatil18/gdgfeud.git
cd gdgfeud
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Development Server
```bash
npm run dev
```
The application will launch on `http://localhost:5173`. Open `/host` on your control display and `/display` on the secondary monitor or projector.

### 4. Build for Production
To generate an optimized production bundle:
```bash
npm run build
```

To preview the built production bundle locally:
```bash
npm run preview
```

### 5. Running Linting & Tests
```bash
npm run lint
npm run test
```

---

## Troubleshooting & FAQ

#### Q: The projector display is not playing any sound.
> **A:** Modern browsers restrict audio playback until user interaction occurs on that tab. Click anywhere inside the `/display` window or press any key once after launching to activate the Web Audio Context.

#### Q: The projector display isn't updating when I reveal answers in `/host`.
> **A:** If running in different browser windows on the same machine, make sure both tabs are using the same origin (e.g., both on `localhost:5173` or both on the local network IP). `BroadcastChannel` communicates strictly across the same origin. If running on separate laptops across Wi-Fi, ensure the WebSocket relay server is running and reachable.

#### Q: How do I recover from an accidental wrong click or score award?
> **A:** Use the built-in **Undo** functionality (<kbd>Ctrl</kbd> + <kbd>Z</kbd> or the Undo button in the top toolbar of `/host`).

#### Q: Can I run this completely offline without an internet connection?
> **A:** Yes! Once the repository dependencies are installed and built, the entire application, sound synthesizer, and IndexedDB audio cache run completely offline with 0 external network dependencies.

---

## Contributing

Contributions are welcome! Please follow these steps:
1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/amazing-feature`.
3. Commit your changes: `git commit -m "feat: add amazing feature"`.
4. Run tests and linting: `npm run lint && npm run test`.
5. Push to the branch: `git push origin feature/amazing-feature`.
6. Open a Pull Request.

---

## License

This project is licensed under the [MIT License](LICENSE) — see the LICENSE file for details. Built with ❤️ for GDG community events and hackathons.
