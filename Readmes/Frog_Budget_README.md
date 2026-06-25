# 🐸 Frog Budget

A modern, cross-platform personal budget tracking application built with React and Supabase. Track purchases, manage category budgets, and get insights into your spending patterns.

## Features

* ✅ **Cross-Platform**: Works on Windows (browser) and Android (installable PWA)
* ✅ **Real-time Sync**: Changes sync instantly across all devices
* ✅ **Category Budgets**: Allocate income percentages to spending categories
* ✅ **Purchase Logging**: Track every purchase with name, amount, date, and category
* ✅ **Budget Analysis**: See how much you've spent vs. budgeted per category
* ✅ **Overspending Alerts**: Get warnings when approaching or exceeding budgets
* ✅ **Visual Analytics**: Charts showing spending trends and category breakdowns
* ✅ **Projections**: See projected end-of-month spending based on current pace
* ✅ **CSV Export**: Export your purchase data anytime
* ✅ **Dark Mode**: Easy on the eyes

## Quick Start

### Prerequisites

* Node.js 18+ installed
* A Supabase account (free tier works)

### Setup

1. **Clone the project**

   ```bash
   git clone https://github.com/yourusername/frog-budget.git
   cd frog-budget
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up Supabase**

   a. Create a new project at [supabase.com](https://supabase.com)
   
   b. Go to **SQL Editor** in your Supabase dashboard
   
   c. Copy the contents of `database/schema.sql` and run it
   
   d. Go to **Settings** → **API** and copy your credentials

4. **Configure environment**

   ```bash
   cp .env.example .env
   ```

   Edit `.env`:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

5. **Start development server**

   ```bash
   npm run dev
   ```

6. **Open in browser**

   Navigate to `http://localhost:5173`

## Project Structure

```
frog-budget/
├── src/
│   ├── App.tsx           # Main application component
│   ├── main.tsx          # Entry point
│   ├── index.css         # Global styles
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Supabase client
│   ├── services/         # API service functions
│   ├── stores/           # Zustand state management
│   ├── types/            # TypeScript definitions
│   └── utils/            # Utility functions
├── database/
│   └── schema.sql        # Database schema
├── public/
│   └── manifest.json     # PWA manifest
└── .env.example          # Environment template
```

## Deployment to Vercel

1. Push code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy!

## Installing as PWA

**Android:**
1. Open the app URL in Chrome
2. Tap menu (⋮) → "Add to Home Screen"

**Desktop:**
1. Open in Chrome/Edge
2. Click install icon in address bar

## Default Categories

The app initializes with these budget categories:

| Category | Percentage |
|----------|------------|
| Daily + Gifts | 51% |
| Music | 13% |
| Entertainment | 10% |
| Gillian PC | 8% |
| Mushroom | 6% |
| Video/Streaming | 5% |
| GIS | 3% |
| PC | 1% |

Customize these in the Budgets tab.

## Tech Stack

* **Frontend**: React 18 + TypeScript + Vite
* **Styling**: Tailwind CSS
* **State**: Zustand
* **Backend**: Supabase (PostgreSQL + Auth + Realtime)
* **Charts**: Recharts
* **Icons**: Lucide React

## License

MIT
