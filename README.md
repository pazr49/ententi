# Pocket Clone

A simple clone of Pocket (getpocket.com) for saving and reading articles in a clean, distraction-free environment.

## Features

- Save articles from RSS feeds
- Read articles in a clean, distraction-free environment
- Dark mode support
- Responsive design
- User authentication with Supabase
- User profiles

## Supabase Integration

The app uses Supabase as a backend to store saved articles and handle user authentication. This allows for persistent storage across devices and sessions.

### Supabase Setup

1. Create a Supabase account at [supabase.com](https://supabase.com)
2. Create a new project
3. Set up the database tables by running the SQL in the `supabase-setup.sql` and `supabase-auth-setup.sql` files:
   - Go to your Supabase project dashboard
   - Click on "SQL Editor" in the left sidebar
   - Create a "New Query"
   - Copy and paste the contents of `supabase-setup.sql`
   - Click "Run" to execute the SQL
   - Create another "New Query"
   - Copy and paste the contents of `supabase-auth-setup.sql`
   - Click "Run" to execute the SQL

4. **Fix user deletion issues** by running the cascade delete SQL:
   - Create another "New Query"
   - Copy and paste the contents of `supabase-cascade-delete.sql`
   - Click "Run" to execute the SQL
   - This script will:
     - Check if the required tables exist and create them if they don't
     - Add CASCADE DELETE rules to foreign key constraints
     - Create a trigger to safely handle user deletion
     - This allows you to delete users from the Supabase dashboard without errors

5. Copy your Supabase URL and anon key from the project settings:
   - Go to Project Settings > API
   - Copy the URL (should look like `https://your-project-id.supabase.co`)
   - Copy the `anon` key
   
6. Create a `.env.local` file in the root of the project with the following content:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Authentication Setup

The app includes a complete authentication system with the following features:

- User registration and login
- Password reset
- Protected routes
- User profiles

After running the `supabase-auth-setup.sql` script, you'll need to configure authentication in your Supabase project:

1. Go to Authentication > Settings in your Supabase dashboard
2. Under "Site URL", enter your app's URL (e.g., `http://localhost:3000` for development)
3. Under "Redirect URLs", add the following URLs:
   - `http://localhost:3000/auth/callback` (for development)
   - `https://your-production-domain.com/auth/callback` (for production)
4. Save the changes

By default, Supabase requires email confirmation. You can disable this for development:

1. Go to Authentication > Providers > Email
2. Toggle off "Confirm email" if you want to skip email confirmation during development
3. Save the changes

## Getting Started

First, install the dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Technologies Used

- Next.js
- React
- Tailwind CSS
- RSS Parser
- Mozilla Readability
- Supabase (Database and Authentication)

## Future Improvements

- Custom RSS feed sources
- Article categorization and tagging
- Search functionality
- Reading progress tracking
- Offline support
- Social sharing

## License

MIT

## Troubleshooting

### Database Issues

If you encounter database-related errors:

1. **"Failed to delete user: Database error deleting user"**:
   - Run the `supabase-cascade-delete.sql` script in the SQL Editor
   - This script fixes foreign key constraints and adds proper CASCADE DELETE rules
   - It also creates missing tables if they don't exist

2. **"Relation does not exist" errors**:
   - Make sure you've run all the SQL setup scripts in the correct order:
     1. `supabase-setup.sql`
     2. `supabase-auth-setup.sql`
     3. `supabase-cascade-delete.sql`

3. **Authentication issues**:
   - Check your Supabase authentication settings in the dashboard
   - Ensure the Site URL and Redirect URLs are configured correctly
   - For development, you may want to disable email confirmation
