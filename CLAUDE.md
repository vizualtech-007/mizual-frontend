# CLAUDE.md - Frontend Documentation

This file provides guidance to Claude Code (claude.ai/code) when working with the Mizual frontend codebase.

**Last Updated**: August 24, 2025
**Framework**: Next.js 14 with TypeScript
**Deployment**: Vercel
**Architecture**: Single Page Application (SPA) with AI Image Editor

## Project Overview

Mizual Frontend is a modern, responsive web application built with Next.js that provides an intuitive interface for AI-powered image editing. The application allows users to upload images, describe edits in natural language, and receive professionally edited results through an integrated backend API.

### Key Features

- **AI-Powered Image Editing**: Natural language prompts for image modifications
- **Real-time Progress Tracking**: Live status updates during processing
- **Edit Chaining**: Ability to perform multiple sequential edits on the same image
- **Responsive Design**: Mobile-first approach with touch gestures
- **Image Gallery Navigation**: Keyboard and touch navigation between edit variants
- **Download Functionality**: Direct image download with format preservation
- **Mock API Mode**: Local development support with simulated responses

## Architecture Overview

### Technology Stack

- **Framework**: Next.js 14.2.4
- **Language**: TypeScript 5.1.6
- **Styling**: Tailwind CSS 3.3.3
- **UI Components**: Radix UI + Custom shadcn/ui Components
- **State Management**: React Hooks (useState, useEffect, useRef)
- **Icons**: Lucide React
- **Analytics**: Vercel Analytics & Speed Insights
- **Development**: Hot reload, ESLint disabled for builds

### Project Structure

```
mizual-frontend/
├── app/                           # Next.js App Router
│   ├── page.tsx                   # Root page - loads EditorLoader
│   ├── layout.tsx                 # Root layout with analytics
│   ├── globals.css                # Global styles and Tailwind
│   ├── editor-loader.tsx          # Dynamic import wrapper (SSR disabled)
│   ├── editor-client.tsx          # Main application component
│   ├── privacy-policy/            # Legal pages
│   ├── terms-of-condition/
│   └── terms-of-use/
├── components/
│   ├── ui/                        # shadcn/ui components (30+ components)
│   │   ├── button.tsx             # Primary button component
│   │   ├── dialog.tsx             # Modal dialogs
│   │   ├── progress.tsx           # Progress indicators
│   │   └── ...                    # Other UI primitives
│   └── theme-provider.tsx         # Theme context (unused)
├── lib/
│   ├── utils.ts                   # Utility functions (cn, clsx)
│   └── mock-api.ts                # Development mock API service
├── public/
│   ├── images/                    # Example images and use cases
│   │   ├── mizual-acne.webp       # Before/after examples
│   │   ├── mizual-acne-removal.jpeg
│   │   ├── mizual-headshot.jpg
│   │   └── ...                    # More example images
│   └── placeholder-*.{jpg,svg}    # Fallback images
├── hooks/                         # Custom React hooks
├── styles/                        # Additional stylesheets
└── config files                   # Next.js, TypeScript, Tailwind configs
```

## Core Components

### 1. EditorLoader (`app/editor-loader.tsx`)

**Purpose**: Dynamic import wrapper that disables Server-Side Rendering (SSR) for the main editor component.

```typescript
const AIImageEditor = dynamic(() => import('./editor-client'), { ssr: false });
```

**Key Features**:
- Prevents hydration mismatches
- Enables client-side only features (file upload, drag & drop)
- Improves initial page load performance

### 2. AIImageEditor (`app/editor-client.tsx`)

**Purpose**: Main application component containing all editor functionality.

#### State Management

```typescript
// View State
const [currentView, setCurrentView] = useState<ViewState>("home" | "output")

// Image State
const [uploadedImage, setUploadedImage] = useState<string | null>(null)
const [generatedVariants, setGeneratedVariants] = useState<string[]>([])
const [currentVariant, setCurrentVariant] = useState(0)

// Processing State
const [isProcessing, setIsProcessing] = useState(false)
const [editId, setEditId] = useState<string | null>(null)
const [processingStatus, setProcessingStatus] = useState<ProcessingStatus | null>(null)

// UI State
const [prompt, setPrompt] = useState("")
const [isFullscreen, setIsFullscreen] = useState(false)
const [currentEditUuid, setCurrentEditUuid] = useState<string | null>(null)
```

#### Key Features

**Image Upload & Validation**:
- Supports drag & drop and click-to-upload
- Configurable file type restrictions via `NEXT_PUBLIC_STRICT_FILE_TYPES`
- Base64 encoding for API transmission
- Client-side image format detection

**Processing Pipeline**:
1. Image upload and validation
2. API request with rate limiting and retry logic
3. Real-time status polling (2-second intervals)
4. Progress visualization with percentage and messages
5. Result display with download functionality

**Edit Chaining**:
- Sequential edits on the same image
- Parent-child relationship tracking
- Visual navigation between variants
- UUID-based edit identification

**Responsive Design**:
- Mobile-first approach with responsive breakpoints
- Touch gesture support (swipe navigation)
- Keyboard shortcuts (arrow keys)
- Adaptive layout for different screen sizes

## API Integration

### Environment Configuration

```typescript
// Environment Variables
NEXT_PUBLIC_API_URL: string           // Backend API URL
NEXT_PUBLIC_ENVIRONMENT: string       // Environment name
NEXT_PUBLIC_USE_MOCK_API: boolean     // Enable mock API for development
NEXT_PUBLIC_STRICT_FILE_TYPES: boolean // Strict file type validation
```

### API Endpoints Integration

#### 1. Image Upload (`POST /edit-image/`)

```typescript
const response = await fetch(`${apiUrl}/edit-image/`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    prompt,
    image: imagePayload,           // Base64 encoded image
    parent_edit_uuid: parentUuid   // For edit chaining
  }),
});
```

**Features**:
- Rate limiting handling (429 responses)
- Exponential backoff retry logic (3 attempts)
- Error handling with user-friendly messages
- Support for edit chaining via parent UUID

#### 2. Status Polling (`GET /edit/{edit_uuid}`)

```typescript
const pollResponse = await fetch(`${apiUrl}/edit/${editId}`);
const pollData = await pollResponse.json();
```

**Polling Logic**:
- 2-second polling intervals
- Progress tracking with percentage updates
- Stage-specific status messages
- Automatic cleanup on completion or error

#### 3. Real-time Progress Updates

```typescript
type ProcessingStatus = {
  status: string;           // 'processing', 'completed', 'failed'
  processing_stage: string; // 'initializing', 'analyzing', etc.
  message: string;          // User-friendly progress message
  progress_percent: number; // 0-100 completion percentage
  is_complete: boolean;     // Process completion flag
  is_error: boolean;        // Error state flag
}
```

## Mock API System

### Purpose
The mock API system enables local development without requiring a backend server, providing realistic simulation of the editing process.

### Implementation (`lib/mock-api.ts`)

#### MockAPIService Class

```typescript
class MockAPIService {
  private mockImages: string[]      // Pool of result images
  private processingJobs: Map       // Active processing jobs
  
  async mockEditImage(prompt, image, parentUuid): Promise<any>
  async mockEditStatus(editId): Promise<any>
  private startMockProcessing(editId, prompt): void
}
```

#### Key Features

**Realistic Simulation**:
- 2-5 second processing times
- Progressive status updates
- Random result image selection
- Stage-based progress reporting

**Development Integration**:
- Automatic activation via `NEXT_PUBLIC_USE_MOCK_API=true`
- Fetch API interception
- No backend dependency
- Visual indicator when active

**Processing Stages**:
1. `initializing` (0-25%)
2. `analyzing` (25-50%)
3. `processing` (50-75%)
4. `finalizing` (75-100%)

## UI Components & Design System

### Design Tokens

```css
/* Colors */
--primary: #4F46E5        /* Primary brand color (Indigo) */
--text-primary: #1C1C1E   /* Primary text */
--text-secondary: #6B7280 /* Secondary text */
--border: #D1D5DB         /* Border color */
--background: #F8F9FA     /* Page background */
--surface: #FFFFFF        /* Card/surface background */

/* Spacing */
Mobile: px-4 py-3         /* 16px horizontal, 12px vertical */
Desktop: px-6 py-4        /* 24px horizontal, 16px vertical */

/* Typography */
Hero: text-2xl to text-5xl (responsive)
Body: text-sm to text-base
Labels: text-xs to text-sm
```

### Component Library

#### Core UI Components (shadcn/ui based)

- **Button**: Primary, secondary, ghost, and icon variants
- **Dialog**: Modal dialogs for legal content and contact
- **Progress**: Linear progress bars for processing status
- **Input/Textarea**: Form inputs with auto-sizing
- **Card**: Content containers with consistent styling
- **Tooltip**: Contextual help text
- **Alert**: Error and success message display

#### Custom Components

**ImageFrame**: Responsive image container with aspect ratio preservation
```typescript
// Features:
- Consistent dimensions across variants
- Zoom/fullscreen functionality
- Processing overlays
- Download button positioning
```

**NavigationButtons**: Previous/next variant navigation
```typescript
// Features:
- Conditional rendering (only with multiple variants)
- Touch-friendly sizing (44px minimum)
- Keyboard navigation support
- Ghost styling with subtle shadows
```

**ThumbnailNavigation**: Bottom thumbnail strip
```typescript
// Features:
- Visual variant selection
- Active state highlighting
- Responsive sizing (12-16px thumbnails)
- Processing state indication
```

## User Experience Features

### Navigation & Interaction

**Keyboard Shortcuts**:
- `←/→ Arrow Keys`: Navigate between image variants
- `Enter`: Submit prompt (when textarea focused)
- `Shift+Enter`: New line in prompt (textarea)

**Touch Gestures**:
- **Swipe Left/Right**: Navigate between variants
- **Tap**: Select thumbnail variant
- **Long Press**: Fullscreen mode
- **Pinch/Zoom**: Not implemented (relies on browser)

**Mouse Interaction**:
- **Click**: Image opens fullscreen
- **Hover**: Button state changes
- **Drag & Drop**: Image upload

### Error Handling & User Feedback

#### Upload Errors
```typescript
// Common error scenarios:
- Unsupported file formats (HEIC, AVIF, GIF)
- File size limitations
- Invalid image data
- Network connectivity issues
```

#### Processing Errors
```typescript
// Error display system:
- Error overlay on image
- User-friendly error messages
- Automatic retry suggestions
- 5-second auto-dismiss
```

#### Rate Limiting
```typescript
// Rate limiting feedback:
- 429 status code handling
- Retry-After header parsing
- Exponential backoff visualization
- User-friendly waiting messages
```

### Accessibility Features

**Keyboard Navigation**:
- Tab order optimization
- Focus indicators
- Skip links (not implemented)
- ARIA labels on interactive elements

**Screen Reader Support**:
- Alt text for all images
- Descriptive button labels
- Status announcements during processing
- Semantic HTML structure

**Visual Accessibility**:
- High contrast color ratios
- Scalable typography
- Touch-friendly tap targets (44px minimum)
- Clear visual hierarchy

## Development Workflow

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

### Environment Setup

#### Development Environment Variables

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_ENVIRONMENT=development
NEXT_PUBLIC_USE_MOCK_API=true
NEXT_PUBLIC_STRICT_FILE_TYPES=false
```

#### Production Environment Variables

```env
# Vercel Production
NEXT_PUBLIC_API_URL=https://api.mizual.ai
NEXT_PUBLIC_ENVIRONMENT=production
NEXT_PUBLIC_USE_MOCK_API=false
NEXT_PUBLIC_STRICT_FILE_TYPES=true
```

### Build Configuration

#### Next.js Configuration (`next.config.mjs`)

```javascript
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },     // Speed up builds
  typescript: { ignoreBuildErrors: true },  // Flexible deployment
  images: { unoptimized: true },            // Vercel compatibility
  output: 'standalone',                     // Optimized deployment
  
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    NEXT_PUBLIC_ENVIRONMENT: process.env.NEXT_PUBLIC_ENVIRONMENT || 'development',
  }
}
```

#### Key Build Optimizations

- **Tree Shaking**: Unused code elimination
- **Bundle Splitting**: Automatic code splitting by route
- **Image Optimization**: Disabled for Vercel deployment
- **TypeScript**: Build errors ignored for flexibility
- **ESLint**: Disabled during builds for speed

## Vercel Deployment

### Deployment Configuration (`vercel.json`)

```json
{
  "installCommand": "npm install",
  "buildCommand": "npm run build",
  "framework": "nextjs"
}
```

### Deployment Pipeline

#### Automatic Deployment Triggers
1. **Main Branch**: Production deployment (`mizual.ai`)
2. **Feature Branches**: Preview deployments (`*.vercel.app`)
3. **Pull Requests**: Automatic preview deployments

#### Deployment Process
1. **Code Push**: Git push triggers Vercel webhook
2. **Build Process**: Next.js build with optimization
3. **Environment Variables**: Automatic injection from Vercel dashboard
4. **Edge Deployment**: Global CDN distribution
5. **Health Checks**: Automatic deployment verification

#### Performance Optimizations

**Vercel Optimizations**:
- Edge runtime for static assets
- Image optimization (disabled for compatibility)
- Automatic compression (gzip/brotli)
- Cache-Control headers
- CDN distribution

**Bundle Analysis**:
- Automatic bundle size reporting
- Performance metrics tracking
- Core Web Vitals monitoring
- Real user monitoring (RUM)

### Environment Management

#### Production Environment
```env
NEXT_PUBLIC_API_URL=https://api.mizual.ai
NEXT_PUBLIC_ENVIRONMENT=production
NEXT_PUBLIC_USE_MOCK_API=false
NEXT_PUBLIC_STRICT_FILE_TYPES=true
```

#### Preview Environment
```env
NEXT_PUBLIC_API_URL=https://dev-api.mizual.ai
NEXT_PUBLIC_ENVIRONMENT=preview
NEXT_PUBLIC_USE_MOCK_API=false
NEXT_PUBLIC_STRICT_FILE_TYPES=false
```

## Performance Optimization

### Core Web Vitals

#### Current Metrics
- **First Contentful Paint (FCP)**: ~1.2s
- **Largest Contentful Paint (LCP)**: ~1.8s
- **Cumulative Layout Shift (CLS)**: <0.1
- **First Input Delay (FID)**: <100ms

#### Optimization Strategies

**Bundle Size Optimization**:
- Dynamic imports for large components
- Tree shaking for unused code
- Code splitting by route
- Lazy loading for images

**Runtime Performance**:
- React.memo for stable components
- useCallback for stable functions
- Virtual scrolling (not implemented)
- Debounced user inputs

**Loading Performance**:
- SSG for static pages
- ISR for dynamic content (not used)
- Preloading for critical resources
- Service worker (not implemented)

### Image Handling

#### Client-Side Processing
```typescript
// Image conversion pipeline:
1. File input/drag & drop
2. FileReader API for base64 encoding
3. Image validation and type detection
4. Compression (not implemented)
5. API transmission
```

#### Format Support
- **Supported**: JPEG, PNG, WebP, BMP, TIFF
- **Blocked**: HEIC, AVIF, GIF (configurable)
- **Fallback**: Graceful error handling for unsupported formats

#### Memory Management
```typescript
// Memory optimization techniques:
- Automatic garbage collection for processed images
- Efficient base64 handling
- Image URL cleanup
- Canvas element reuse (not implemented)
```

## Common Development Tasks

### Adding a New UI Component

1. **Create Component**: Add to `components/ui/`
2. **Export**: Update `components/ui/index.ts` (if exists)
3. **Import**: Use in parent components
4. **Style**: Apply Tailwind classes consistently

### Modifying the Upload Flow

1. **File Validation**: Update `validate_image_type()` logic
2. **Error Handling**: Add new error messages
3. **UI Feedback**: Update processing states
4. **Testing**: Test with various file formats

### Adding New API Integration

1. **Environment Variables**: Add to config files
2. **API Client**: Create service function
3. **Error Handling**: Implement retry logic
4. **State Management**: Add required state hooks
5. **UI Updates**: Reflect API state in components

### Customizing Styling

1. **Tokens**: Update design tokens in `globals.css`
2. **Components**: Modify Tailwind classes
3. **Responsive**: Add mobile breakpoints
4. **Theme**: Implement dark mode (not currently active)

## Debugging & Troubleshooting

### Common Issues

#### 1. **Hydration Mismatches**
```typescript
// Solution: Use dynamic imports with SSR disabled
const Component = dynamic(() => import('./Component'), { ssr: false });
```

#### 2. **File Upload Issues**
```typescript
// Check file type validation
const isValid = validate_image_type(imageBytes);

// Verify base64 encoding
const base64Data = await ensureDataUrl(imageSource);
```

#### 3. **API Connection Problems**
```typescript
// Enable mock API for local development
NEXT_PUBLIC_USE_MOCK_API=true

// Check API URL configuration
console.log(process.env.NEXT_PUBLIC_API_URL);
```

#### 4. **Build/Deployment Failures**
```bash
# Local build test
npm run build

# Check for TypeScript errors
npx tsc --noEmit

# Verify environment variables
npm run dev
```

### Development Tools

#### Browser DevTools
- **Network Tab**: API request monitoring
- **Console**: Error logging and debugging
- **Performance**: Runtime performance analysis
- **Application**: Local storage and service workers

#### VS Code Extensions
- **ES7+ React/Redux/React-Native snippets**
- **Tailwind CSS IntelliSense**
- **TypeScript Hero**
- **Auto Rename Tag**

### Performance Monitoring

#### Vercel Analytics
```typescript
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'

// Automatic performance tracking
<Analytics />
<SpeedInsights />
```

#### Console Debugging
```typescript
// Processing status logging
console.log('Processing Status:', processingStatus);

// API response debugging
console.log('API Response:', response.data);

// State debugging
console.log('Current State:', { currentView, generatedVariants });
```

## Future Development Considerations

### Planned Features (Not Yet Implemented)

#### Advanced Image Editing
- **Multiple Selection**: Batch image processing
- **Image Filters**: Client-side filter application
- **Crop Tool**: Client-side image cropping
- **Zoom/Pan**: Advanced image viewing

#### User Experience Improvements
- **Undo/Redo**: Edit history management
- **Save Projects**: Local storage of edit sessions
- **Keyboard Shortcuts**: Extended shortcut system
- **Accessibility**: Enhanced screen reader support

#### Performance Enhancements
- **Service Worker**: Offline support and caching
- **Progressive Web App**: Mobile app-like experience
- **Image Compression**: Client-side image optimization
- **Virtual Scrolling**: Performance for large image sets

### Technical Debt

#### Current Limitations
- **No Unit Tests**: Testing framework not implemented
- **No E2E Tests**: End-to-end testing not configured
- **Limited Error Boundaries**: React error boundaries minimal
- **No Analytics Events**: Custom event tracking not implemented

#### Recommended Improvements
- **Testing**: Implement Jest + React Testing Library
- **Error Handling**: Add comprehensive error boundaries
- **Analytics**: Custom event tracking for user behavior
- **Accessibility**: Full WCAG 2.1 compliance audit

## Important Notes

### Mock API Removal Plan
The mock API system (`lib/mock-api.ts`) is intended for development only and should be removed before production deployment. The removal plan:

1. **Phase 1**: Disable mock API in production builds
2. **Phase 2**: Remove mock API code entirely
3. **Phase 3**: Clean up related environment variables
4. **Phase 4**: Update documentation

### Security Considerations

#### Client-Side Security
- **Input Validation**: Client-side validation for UX only (server validates)
- **XSS Prevention**: React's built-in XSS protection
- **CSRF Protection**: Not applicable for stateless API
- **Content Security Policy**: Not implemented

#### Data Handling
- **Image Data**: Base64 encoding for transmission
- **User Privacy**: No persistent user data storage
- **Analytics**: Anonymous usage tracking only
- **API Keys**: No sensitive keys in frontend code

### Browser Support

#### Target Browsers
- **Chrome**: 90+ (primary)
- **Firefox**: 88+ (secondary)
- **Safari**: 14+ (secondary)
- **Edge**: 90+ (secondary)

#### Polyfills & Fallbacks
- **FileReader API**: Native support required
- **Fetch API**: Native support required
- **ES2020 Features**: Next.js transpilation
- **CSS Grid/Flexbox**: Native support required

---

**Next Steps**: This documentation should be updated when:
- New features are added
- API integration changes
- Performance optimizations are implemented
- User experience improvements are made
- Mock API system is removed