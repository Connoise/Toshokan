# HomeBase - Household Inventory App

A modern, cross-platform household inventory management application built with React and Supabase.

## Features

- ✅ **Cross-Platform**: Works on Windows (browser) and Android (installable PWA)
- ✅ **Real-time Sync**: Changes sync instantly across all devices
- ✅ **Multi-user**: Share access with family members
- ✅ **Categories & Locations**: Organize items with nested hierarchies
- ✅ **Tags**: Flexible labeling system
- ✅ **Essential Items**: Flag important items with low-stock alerts
- ✅ **Favorites**: Quick access to frequently checked items
- ✅ **Templates**: Speed up adding common items
- ✅ **History & Undo**: Track all changes with undo capability
- ✅ **Dark Mode**: Easy on the eyes
- ✅ **CSV Export**: Export your inventory data
- ✅ **Push Notifications**: Get alerted for low stock (coming soon)

## Quick Start

### Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works)
- Your Supabase project with the schema already set up

### Setup

1. **Clone or download this project**

2. **Install dependencies**
   ```bash
   cd inventory-app
   npm install
   ```

3. **Configure environment variables**
   
   Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```
   
   Find these values in your Supabase dashboard:
   - Go to **Settings** > **API**
   - Copy the **Project URL**
   - Copy the **anon public** key

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   
   Navigate to `http://localhost:3000`

6. **Create your first account**
   
   Sign up with email and password to start using the app.

## Project Structure

```
inventory-app/
├── src/
│   ├── App.tsx           # Main application component
│   ├── main.tsx          # Entry point
│   ├── index.css         # Global styles
│   ├── hooks/            # Custom React hooks
│   │   └── index.ts      # useItems, useCategories, etc.
│   ├── lib/
│   │   └── supabase.ts   # Supabase client configuration
│   ├── services/         # API service functions
│   │   ├── items.ts
│   │   ├── categories.ts
│   │   ├── locations.ts
│   │   ├── tags.ts
│   │   ├── templates.ts
│   │   ├── history.ts
│   │   └── notifications.ts
│   ├── stores/           # Zustand state management
│   │   └── index.ts
│   ├── types/            # TypeScript type definitions
│   │   └── supabase.ts
│   └── utils/            # Utility functions
│       └── index.ts
├── database/
│   └── schema.sql        # Database schema
├── public/
│   └── manifest.json     # PWA manifest
├── .env.example          # Environment variables template
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

## Deployment

### Option 1: Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repo to [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy!

### Option 2: Netlify

1. Push your code to GitHub
2. Connect to [Netlify](https://netlify.com)
3. Add environment variables
4. Deploy!

### Option 3: Self-Hosted

1. Build the project:
   ```bash
   npm run build
   ```

2. Serve the `dist` folder with any static file server

## Adding as PWA on Android

1. Open the app URL in Chrome on your Android device
2. Tap the menu (⋮) button
3. Select "Add to Home Screen"
4. The app will now work like a native app!

## Database Management

### Adding Locations

Run this SQL in Supabase to add your home locations:

```sql
-- Add your house
INSERT INTO locations (name, location_type) 
VALUES ('My House', 'building');

-- Add rooms (get the house id first)
INSERT INTO locations (name, location_type, parent_id)
SELECT 'Kitchen', 'room', id FROM locations WHERE name = 'My House';

INSERT INTO locations (name, location_type, parent_id)
SELECT 'Bathroom', 'room', id FROM locations WHERE name = 'My House';

-- Add specific spots
INSERT INTO locations (name, location_type, parent_id)
SELECT 'Pantry', 'area', id FROM locations WHERE name = 'Kitchen';
```

### Backing Up Data

Export your data anytime:
1. Go to Supabase Dashboard
2. Navigate to Database > Backups
3. Download your backup

Or use the CSV export in the app settings.

## Troubleshooting

### "Missing Supabase environment variables"
- Make sure you created the `.env` file
- Check that the variable names start with `VITE_`
- Restart the dev server after changing `.env`

### "No items showing"
- Check the browser console for errors
- Verify your Supabase connection is working
- Make sure RLS policies are enabled

### "Can't sign up"
- Go to Supabase Dashboard > Authentication > Providers
- Make sure Email provider is enabled
- Check if email confirmation is required

## Future Enhancements

- [ ] Barcode scanning
- [ ] Image attachments
- [ ] Shopping list generation
- [ ] Consumption tracking
- [ ] Analytics dashboard
- [ ] Offline mode improvements
- [ ] Push notifications

## License

MIT
