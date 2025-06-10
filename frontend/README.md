# GPX Track Viewer Frontend

This is the frontend application for the GPX Track Viewer, built with React and Vite.

## Prerequisites

- Node.js (v16 or higher)
- npm (v7 or higher)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory and add your Mapbox access token:
```
VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_token_here
```

## Development

To start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## Building for Production

To create a production build:

```bash
npm run build
```

To preview the production build:

```bash
npm run preview
```

## Project Structure

- `src/` - Source code
  - `components/` - Reusable React components
  - `pages/` - Page components
  - `App.jsx` - Main application component
  - `main.jsx` - Application entry point 