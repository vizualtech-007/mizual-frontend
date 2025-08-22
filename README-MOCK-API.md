# Mock API System

Intercepts API calls to return sample images when `NEXT_PUBLIC_USE_MOCK_API=true` is set.

## Quick Start

1. **Create `.env.local`**:
   ```bash
   NEXT_PUBLIC_USE_MOCK_API=true
   ```

2. **Restart dev server**: `npm run dev`

3. **Mock API activates** - yellow "Mock API" badge appears in header

## How It Works

- **Intercepts**: `POST /edit-image/` and `GET /edit/{id}`
- **Returns**: Sample images from `public/images/` folder
- **Simulates**: 2-5 second processing with existing progress bars
- **UI**: Identical to production (same progress bars, no different UI)

## Sample Images

- `mizual-acne-removal.jpeg` - Face retouching
- `mizual-background-change.jpeg` - Background replacement  
- `mizual-headshot-created.jpeg` - Professional headshot
- `mizual-remove-anything.jpeg` - Object removal
- `mizual-remove.jpeg` - Object removal before

## Control

- **Enable**: `NEXT_PUBLIC_USE_MOCK_API=true`
- **Disable**: Remove the line or set to `false`
- **Production**: Never active unless explicitly enabled

## Troubleshooting

- **Not working**: Check `.env.local` and restart dev server
- **Badge missing**: Verify environment variable is set
- **Images not loading**: Check `public/images/` folder exists

## Benefits

- ✅ Explicit control (no automatic activation)
- ✅ Same UI as production
- ✅ Fast local development
- ✅ No backend dependency 
