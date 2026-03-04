import express from "express";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// WebSocket Server
const wss = new WebSocketServer({ server: httpServer });

// State management for matches
let allMatches = [
  {
    id: 1,
    homeTeam: "Manchester City",
    awayTeam: "Arsenal",
    homeLogo: "https://logo.clearbit.com/mancity.com",
    awayLogo: "https://logo.clearbit.com/arsenal.com",
    league: "Premier League",
    time: "LIVE 72'",
    score: "2 - 1",
    probability: { home: 65, draw: 20, away: 15 },
    odds: { home: 1.45, draw: 4.20, away: 8.50 },
    status: "live",
    stats: {
      possession: { home: 55, away: 45 },
      shots: { home: 14, away: 9 },
      corners: { home: 6, away: 4 }
    },
    h2h: {
      homeWins: 12,
      awayWins: 8,
      draws: 5,
      lastMatches: [
        { date: "2025-09-15", score: "3 - 1", winner: "Manchester City" },
        { date: "2025-03-22", score: "0 - 0", winner: "Draw" },
        { date: "2024-10-10", score: "1 - 2", winner: "Arsenal" }
      ]
    },
    pastPerformance: {
      home: ['W', 'W', 'D', 'W', 'L'],
      away: ['W', 'D', 'W', 'L', 'W']
    }
  },
  {
    id: 2,
    homeTeam: "Real Madrid",
    awayTeam: "Barcelona",
    homeLogo: "https://logo.clearbit.com/realmadrid.com",
    awayLogo: "https://logo.clearbit.com/fcbarcelona.com",
    league: "La Liga",
    time: "21:00",
    score: "0 - 0",
    probability: { home: 45, draw: 25, away: 30 },
    odds: { home: 2.10, draw: 3.40, away: 3.20 },
    status: "upcoming",
    h2h: {
      homeWins: 15,
      awayWins: 14,
      draws: 10,
      lastMatches: [
        { date: "2025-10-26", score: "2 - 1", winner: "Real Madrid" },
        { date: "2025-04-21", score: "3 - 2", winner: "Real Madrid" },
        { date: "2024-12-01", score: "0 - 4", winner: "Barcelona" }
      ]
    },
    pastPerformance: {
      home: ['W', 'W', 'W', 'D', 'W'],
      away: ['L', 'W', 'W', 'W', 'D']
    }
  },
  {
    id: 3,
    homeTeam: "Bayern Munich",
    awayTeam: "Dortmund",
    homeLogo: "https://logo.clearbit.com/fcbayern.com",
    awayLogo: "https://logo.clearbit.com/bvb.de",
    league: "Bundesliga",
    time: "LIVE 15'",
    score: "1 - 0",
    probability: { home: 70, draw: 15, away: 15 },
    odds: { home: 1.25, draw: 6.00, away: 12.00 },
    status: "live",
    stats: {
      possession: { home: 62, away: 38 },
      shots: { home: 5, away: 2 },
      corners: { home: 3, away: 1 }
    }
  },
  {
    id: 4,
    homeTeam: "Liverpool",
    awayTeam: "Chelsea",
    homeLogo: "https://logo.clearbit.com/liverpoolfc.com",
    awayLogo: "https://logo.clearbit.com/chelseafc.com",
    league: "Premier League",
    time: "18:30",
    score: "0 - 0",
    probability: { home: 55, draw: 25, away: 20 },
    odds: { home: 1.80, draw: 3.60, away: 4.50 },
    status: "upcoming"
  },
  {
    id: 5,
    homeTeam: "Inter Milan",
    awayTeam: "AC Milan",
    homeLogo: "https://logo.clearbit.com/inter.it",
    awayLogo: "https://logo.clearbit.com/acmilan.com",
    league: "Serie A",
    time: "20:45",
    score: "0 - 0",
    probability: { home: 40, draw: 30, away: 30 },
    odds: { home: 2.40, draw: 3.20, away: 3.10 },
    status: "upcoming"
  },
  {
    id: 6,
    homeTeam: "Man Utd",
    awayTeam: "Tottenham",
    homeLogo: "https://logo.clearbit.com/manutd.com",
    awayLogo: "https://logo.clearbit.com/tottenhamhotspur.com",
    league: "Premier League",
    time: "20:00",
    score: "0 - 0",
    probability: { home: 35, draw: 30, away: 35 },
    odds: { home: 2.60, draw: 3.30, away: 2.60 },
    status: "upcoming"
  },
  {
    id: 7,
    homeTeam: "Juventus",
    awayTeam: "Napoli",
    homeLogo: "https://logo.clearbit.com/juventus.com",
    awayLogo: "https://logo.clearbit.com/sscnapoli.it",
    league: "Serie A",
    time: "18:00",
    score: "0 - 0",
    probability: { home: 45, draw: 30, away: 25 },
    odds: { home: 2.05, draw: 3.20, away: 3.80 },
    status: "upcoming"
  },
  {
    id: 8,
    homeTeam: "PSG",
    awayTeam: "Marseille",
    homeLogo: "https://logo.clearbit.com/psg.fr",
    awayLogo: "https://logo.clearbit.com/om.fr",
    league: "Ligue 1",
    time: "21:00",
    score: "0 - 0",
    probability: { home: 60, draw: 25, away: 15 },
    odds: { home: 1.55, draw: 4.00, away: 6.50 },
    status: "upcoming"
  }
];

// Broadcast function
const broadcast = (data: any) => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
};

// The Odds API Integration
const updateMatchesFromAPI = async () => {
  const apiKey = process.env.THE_ODDS_API_KEY || 'aef172cdac2d4224e589c5da203ef323';
  console.log(`[${new Date().toISOString()}] Initiating Neural Data Fetch from The Odds API...`);

  try {
    // Fetch Odds
    const oddsRes = await fetch(`https://api.the-odds-api.com/v4/sports/soccer_epl/odds/?apiKey=${apiKey}&regions=uk&markets=h2h`);
    const oddsData: any = await oddsRes.json();

    if (oddsData.message) {
      if (oddsData.message.includes('Usage quota')) {
        console.warn("Neural Network Warning: API Quota reached. Switching to autonomous mock data mode.");
      } else {
        console.error("The Odds API Error (Odds):", oddsData.message);
      }
      broadcast({ type: 'MATCH_UPDATES', matches: allMatches });
      return;
    }

    // Fetch Scores
    const scoresRes = await fetch(`https://api.the-odds-api.com/v4/sports/soccer_epl/scores/?apiKey=${apiKey}&daysFrom=1`);
    const scoresData: any = await scoresRes.json();

    if (scoresData.message) {
      console.error("The Odds API Error (Scores):", scoresData.message);
      broadcast({ type: 'MATCH_UPDATES', matches: allMatches });
      return;
    }

    if (Array.isArray(oddsData) && Array.isArray(scoresData)) {
      const updatedMatches = oddsData.slice(0, 12).map((oddsMatch: any, index: number) => {
        const scoreMatch = scoresData.find((s: any) => s.id === oddsMatch.id);
        
        const homeOutcome = oddsMatch.bookmakers[0]?.markets[0]?.outcomes.find((o: any) => o.name === oddsMatch.home_team);
        const awayOutcome = oddsMatch.bookmakers[0]?.markets[0]?.outcomes.find((o: any) => o.name === oddsMatch.away_team);
        const drawOutcome = oddsMatch.bookmakers[0]?.markets[0]?.outcomes.find((o: any) => o.name === 'Draw');

        const homeScore = scoreMatch?.scores?.find((s: any) => s.name === oddsMatch.home_team)?.score || "0";
        const awayScore = scoreMatch?.scores?.find((s: any) => s.name === oddsMatch.away_team)?.score || "0";

        const hProb = homeOutcome ? 1 / homeOutcome.price : 0.4;
        const aProb = awayOutcome ? 1 / awayOutcome.price : 0.3;
        const dProb = drawOutcome ? 1 / drawOutcome.price : 0.3;
        const total = hProb + aProb + dProb;

        const cleanTeamName = (name: string) => name.toLowerCase()
          .replace(/\s+fc$/i, '')
          .replace(/^afc\s+/i, '')
          .replace(/\s+/g, '')
          .replace(/[^a-z0-9]/g, '');

        return {
          id: index + 100,
          homeTeam: oddsMatch.home_team,
          awayTeam: oddsMatch.away_team,
          homeLogo: `https://logo.clearbit.com/${cleanTeamName(oddsMatch.home_team)}.com`,
          awayLogo: `https://logo.clearbit.com/${cleanTeamName(oddsMatch.away_team)}.com`,
          league: oddsMatch.sport_title,
          time: scoreMatch?.completed ? "FT" : (scoreMatch?.last_update ? "LIVE" : new Date(oddsMatch.commence_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })),
          score: `${homeScore} - ${awayScore}`,
          probability: {
            home: Math.round((hProb / total) * 100),
            draw: Math.round((dProb / total) * 100),
            away: Math.round((aProb / total) * 100)
          },
          odds: {
            home: homeOutcome?.price || 2.0,
            draw: drawOutcome?.price || 3.0,
            away: awayOutcome?.price || 3.0
          },
          status: scoreMatch?.completed ? "completed" : (scoreMatch?.last_update ? "live" : "upcoming"),
          stats: scoreMatch?.last_update ? {
            possession: { home: 50, away: 50 },
            shots: { home: 0, away: 0 },
            corners: { home: 0, away: 0 }
          } : undefined
        };
      });

      const mockMatches = allMatches.filter(m => m.id < 100);
      allMatches = [...updatedMatches, ...mockMatches].slice(0, 18);
      broadcast({ type: 'MATCH_UPDATES', matches: allMatches });
      console.log(`[${new Date().toISOString()}] Successfully synchronized ${updatedMatches.length} matches`);
    }
  } catch (error) {
    console.error("Sync Error:", error);
  }
};

setInterval(updateMatchesFromAPI, 60000);

setInterval(() => {
  allMatches.forEach(match => {
    if (match.status === 'live' && match.id < 100) {
      if (match.stats) {
        match.stats.possession.home = Math.max(30, Math.min(70, match.stats.possession.home + (Math.random() > 0.5 ? 1 : -1)));
        match.stats.possession.away = 100 - match.stats.possession.home;
        if (Math.random() > 0.7) match.stats.shots.home += 1;
        if (Math.random() > 0.7) match.stats.shots.away += 1;
      }
      if (Math.random() > 0.98) {
        const [home, away] = match.score.split(' - ').map(Number);
        match.score = Math.random() > 0.5 ? `${home + 1} - ${away}` : `${home} - ${away + 1}`;
      }
    }
  });
  broadcast({ type: 'MATCH_UPDATES', matches: allMatches });
}, 5000);

app.get("/api/matches", (req, res) => {
  res.json(allMatches);
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/user/stats", (req, res) => {
  res.json({ balance: 1250, winRate: 68, rank: 42, predictions: 156 });
});

app.get("/api/user/predictions", (req, res) => {
  res.json([
    { id: 1, match: "Liverpool vs Chelsea", date: "2026-02-25", prediction: "Home", odds: 1.85, stake: 100, outcome: "won", profit: 85 },
    { id: 2, match: "Inter Milan vs AC Milan", date: "2026-02-24", prediction: "Draw", odds: 3.20, stake: 50, outcome: "lost", profit: -50 }
  ]);
});

app.get("/api/user/transactions", (req, res) => {
  res.json([
    { id: "TXN-982341", date: "2026-02-27 14:20", type: "prediction_stake", amount: -150, status: "completed", description: "Stake on Man Utd vs Tottenham" },
    { id: "TXN-982340", date: "2026-02-25 18:45", type: "prediction_win", amount: 185, status: "completed", description: "Win: Liverpool vs Chelsea" }
  ]);
});

httpServer.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`Backend Server running on port ${PORT}`);
});
