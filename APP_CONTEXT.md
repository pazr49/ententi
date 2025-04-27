# Application Context: Pocket Clone

## Overview

This document provides context for an LLM assisting with development on the "Pocket Clone" application.

The application is designed for **language learners** who want to read online content (articles, etc.) in their target language at their current reading level. It allows users to save web articles/content, translate them to a specific reading age, and read or listen to them in a clean, distraction-free interface.

## Core Functionality

*   **User Authentication:** Handled via Supabase Auth (email/password, magic links, password reset). Includes user registration, login, protected routes, and user profiles.
*   **Article Acquisition:** Users can add content by:
    *   Selecting articles from pre-configured or user-added **RSS feeds**.
    *   **Pasting URLs or text content** directly into the application.
*   **Article Saving:** User saves involve associating the user with the article's metadata (URL, title, potentially original content) stored in the Supabase database.
*   **AI Translation:** Users can translate saved content into their target language, specifying a desired **reading age**. This is handled by a **Supabase Function** which calls the **Gemini API**.
*   **Article Reading:** Saved/translated articles are presented in a simplified, readable format using `@mozilla/readability` to extract the core content from the source URL if applicable.
*   **Text-to-Speech (TTS):** Users can listen to articles using TTS powered by the **OpenAI API**, with adjustable speed (including **slower playback** beneficial for language learners).
*   **User Interface:** Clean, responsive design with dark mode support. Uses Tailwind CSS for styling and Framer Motion for animations.

## Technical Architecture

*   **Framework:** Next.js 15 (using App Router: `src/app/`)
*   **Language:** TypeScript
*   **UI Library:** React 19
*   **Styling:** Tailwind CSS 4
*   **Backend & Database:** Supabase
    *   Handles user authentication.
    *   PostgreSQL database stores user data, article metadata, user-article associations, and potentially translated content.
    *   **Supabase Functions:** Used to securely call external APIs (e.g., Gemini for translation).
    *   Uses specific SQL setup scripts: `supabase-setup.sql`, `supabase-auth-setup.sql`, `supabase-cascade-delete.sql`.
*   **Article Processing:**
    *   `@mozilla/readability`: Extracts article content from HTML.
    *   `jsdom`: Provides a virtual DOM for `readability`.
    *   `rss-parser`: Fetches and parses RSS feeds.
    *   `html-react-parser`: Parses HTML content for rendering in React.
*   **APIs:**
    *   **Gemini API:** Used for AI translation (via Supabase Function).
    *   **OpenAI API:** Used for Text-to-Speech functionality.
*   **State Management:** Likely uses React Context (`src/context/`) and custom hooks (`src/hooks/`).
*   **Client-side Storage:** `localforage`.
*   **Validation:** Zod.
*   **Development:** Turbopack (via `next dev --turbopack`), ESLint.

## Project Structure Highlights

*   `src/app/`: Main application routes, layouts, pages (Next.js App Router).
*   `src/components/`: Reusable React components.
*   `src/lib/` or `src/utils/`: Utility functions, potentially API clients.
*   `src/hooks/`: Custom React hooks.
*   `src/context/`: React context for state management.
*   `supabase/`: Contains SQL scripts for database setup.
*   `public/`: Static assets.
*   `.env.local`: Stores environment variables (Supabase keys, potentially OpenAI key).
*   `package.json`: Lists dependencies and scripts.
*   `next.config.ts`: Next.js configuration (e.g., image remote patterns).
*   `tailwind.config.ts`: Tailwind CSS configuration.
*   `tsconfig.json`: TypeScript configuration.

## Setup & Configuration

*   Requires a Supabase project.
*   Environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, potentially `OPENAI_API_KEY`) must be set in `.env.local`.
*   Supabase database schema needs to be initialized using the SQL scripts in the `supabase/` directory.
*   Supabase Auth settings (Site URL, Redirect URLs) need configuration.

## Key Dependencies & Purpose

*   `next`, `react`, `react-dom`, `typescript`: Core framework.
*   `@supabase/auth-helpers-nextjs`, `@supabase/supabase-js`: Supabase integration.
*   `tailwindcss`, `@tailwindcss/typography`: Styling.
*   `@mozilla/readability`, `jsdom`: Article content extraction.
*   `openai`: Text-to-speech.
*   **Gemini API (via Supabase Function)**: AI Translation.
*   `rss-parser`: Reading RSS feeds.
*   `localforage`: Client-side caching/storage.
*   `framer-motion`: UI animations.
*   `zod`: Data validation. 