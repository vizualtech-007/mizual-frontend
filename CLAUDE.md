# CLAUDE.md - Frontend Documentation

This file provides guidance to Claude Code (claude.ai/code) when working with the Mizual frontend codebase.

## ⚠️ CRITICAL DEVELOPMENT REQUIREMENTS

### 🎯 Device & Browser Compatibility (MANDATORY)
When developing ANY component or feature, ensure compatibility across:

**Target Devices:**
- 📱 **Mobile**: iPhone (all sizes), Android phones (all screen sizes)
- 📱 **Tablets**: iPad (all sizes), Android tablets (all screen sizes) 
- 💻 **Laptops/Desktop**: MacBook (all sizes), Windows laptops, desktop computers

**Target Browsers:**
- 🌐 **Safari** (iOS & macOS) - Primary focus for Apple devices
- 🌐 **Google Chrome** (All platforms) - Primary desktop browser
- 🌐 **Microsoft Edge** (Windows) - Windows default browser
- 🌐 **Firefox** (All platforms) - Privacy-focused users
- 🌐 **Other Chromium browsers** (Brave, Opera, etc.)

**Responsive Design Requirements:**
- Use Tailwind CSS responsive breakpoints: `sm:`, `md:`, `lg:`, `xl:`, `2xl:`
- Test touch interactions on mobile/tablet devices
- Ensure minimum 44px tap targets for mobile accessibility
- Implement swipe gestures where appropriate
- Test keyboard navigation on desktop

### ⚡ Performance & Latency Optimization (MANDATORY)
Every piece of code MUST be optimized for performance:

**Frontend Performance:**
- **Image Handling**: Use `loading="lazy"` for all images, optimize formats (WebP, AVIF)
- **Bundle Size**: Minimize JavaScript bundle size, use dynamic imports for large components
- **React Optimization**: Use `React.memo()`, `useCallback()`, `useMemo()` for expensive operations
- **API Calls**: Implement proper loading states, error boundaries, and retry logic
- **Caching**: Leverage browser caching, avoid unnecessary re-renders

**Latency Optimization:**
- **API Integration**: Implement request batching, debouncing for user inputs
- **Real-time Updates**: Efficient polling intervals (2-second default), cleanup on unmount
- **Network Handling**: Handle offline states, slow connections gracefully
- **Progressive Loading**: Show content progressively, avoid blocking the main thread

### 📱 Mobile-First Development Approach
- Start with mobile design, then enhance for larger screens
- Use responsive typography: `text-sm sm:text-base md:text-lg`
- Implement touch-friendly navigation and interactions
- Test on actual devices, not just browser dev tools

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
- **Prompt History Navigation**: Contextual prompt display showing the modification used to create each subsequent image
- **Cross-Platform Responsive Design**: Optimized for mobile, tablet, and desktop across all browsers
- **Image Gallery Navigation**: Keyboard and touch navigation between edit variants with prompt synchronization
- **Multi-Format Support**: JPEG, PNG, WebP, GIF, AVIF image formats
- **Download Functionality**: Direct image download with format preservation
- **Performance Optimized**: Lazy loading, efficient rendering, optimized bundle size

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
const [promptHistory, setPromptHistory] = useState<string[]>([]) // Stores prompts for navigation context
const [isFullscreen, setIsFullscreen] = useState(false)
const [currentEditUuid, setCurrentEditUuid] = useState<string | null>(null)
```

#### Key Features

**Image Upload & Validation**:
- Supports drag & drop and click-to-upload across all devices and browsers
- **Supported formats**: JPEG, PNG, WebP, GIF, AVIF (configurable via `NEXT_PUBLIC_SUPPORTED_IMAGE_TYPES`)
- Base64 encoding for API transmission
- Optimized for performance with lazy loading and efficient rendering
- Cross-browser compatibility (Safari, Chrome, Edge, Firefox)

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

**Cross-Platform Responsive Design**:
- **Mobile-first approach** with Tailwind responsive breakpoints (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`)
- **Touch gesture support** (swipe navigation) for mobile and tablet devices
- **Keyboard shortcuts** (arrow keys) optimized for desktop/laptop usage
- **Adaptive layouts** for iPhone, Android, iPad, tablets, MacBook, and desktop
- **44px minimum tap targets** for mobile accessibility compliance
- **Cross-browser optimization** for Safari, Chrome, Edge, Firefox compatibility

## API Integration

### Environment Configuration

```typescript
// Environment Variables
NEXT_PUBLIC_API_URL: string                    // Backend API URL
NEXT_PUBLIC_ENVIRONMENT: string                // Environment name (development/production)
NEXT_PUBLIC_SUPPORTED_IMAGE_TYPES: string      // Supported image MIME types (comma-separated)
```

**Current Environment Setup (.env.local):**
```env
# Frontend Environment Variables
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_ENVIRONMENT=development

# Supported image formats (comma-separated MIME types)
NEXT_PUBLIC_SUPPORTED_IMAGE_TYPES=image/jpeg,image/jpg,image/png,image/webp,image/gif,image/avif
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

**ImageFrame**: Responsive image container with border wrapping
```typescript
// Features:
- Border wraps around actual image dimensions (no fixed white background)
- Hybrid approach: regular <img> for base64, Next.js Image for static files
- Responsive sizing with viewport constraints (max-w-[90vw] max-h-[70vh])
- Next.js Image requires proper width/height props (width={800} height={600})
- Processing overlays and download button positioning within image bounds
- No hardcoded aspect ratios - images maintain natural proportions
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

## Image Layout & Display Best Practices

### Critical Layout Requirements

**Next.js Image Component Requirements:**
```typescript
// ALWAYS provide width and height for Next.js Image components
<Image
  src={imageUrl}
  width={800}        // Required: prevents layout shifts
  height={600}       // Required: enables optimization
  className="w-auto h-auto max-w-[90vw] max-h-[70vh]"  // Responsive constraints
  sizes="(max-width: 768px) 100vw, 800px"              // Responsive loading
/>
```

**Border Wrapping Pattern:**
```typescript
// Border should wrap around actual image, not fixed container
<div className="flex justify-center w-full">
  <div className="relative border border-[#D1D5DB] overflow-hidden">
    <Image /> {/* Image determines container size */}
  </div>
</div>

// AVOID: Fixed aspect ratio containers with white backgrounds
// AVOID: <div style={{ aspectRatio: '4/3' }} className="bg-white">
```

**Layout Container Structure:**
```typescript
// Maintain flex layout to prevent vertical scrolling
<div className="relative flex flex-col h-full p-4">           // Main container
  <div className="relative flex-1 flex items-center justify-center min-h-0">  // Image area
    {/* Image with navigation buttons */}
  </div>
  <div className="flex-shrink-0">  // Thumbnails - always at bottom
    {/* Thumbnail navigation */}
  </div>
  <div className="flex-shrink-0">  // Prompt input - always at bottom
    {/* Prompt input area */}
  </div>
</div>
```

**Responsive Constraints:**
- Use `max-w-[90vw] max-h-[70vh]` for proper viewport fitting
- Ensure `flex-1` and `min-h-0` on image containers to prevent overflow
- Never use fixed aspect ratios that force white backgrounds
- Always test layout changes across different image aspect ratios

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

#### Recent UX Improvements (August 24, 2025)

**Auto-Focus Enhancement**:
- Prompt input automatically focuses when user uploads an image
- 100ms delay ensures component is rendered before focusing
- Enables immediate typing after image upload without manual click

**Error Display Optimization**:
- Error messages now show only as red error boxes (no full-image overlay)
- Removed duplicate black error messages behind red error boxes
- Processing overlay excludes error states to prevent visual conflicts
- Maintains image visibility while showing clear error feedback

**Session Management**:
- Independent editing sessions for new image uploads
- Complete processing state reset when uploading new images or returning home
- Prevents stuck processing states from affecting new edits
- Robust polling cleanup with `shouldPollRef` to prevent stale API updates

**Download Button Logic**:
- Download button appears only after successful image processing
- Hidden during processing state to prevent premature downloads
- Condition: `currentVariant > 0 && generatedVariants[currentVariant] !== baseImageForEdit`
- Ensures users can only download completed, successful edits

**Implementation Details**:
```typescript
// Auto-focus implementation
useEffect(() => {
  if (currentView === "output" && textareaRef.current) {
    const timer = setTimeout(() => {
      textareaRef.current?.focus()
    }, 100)
    return () => clearTimeout(timer)
  }
}, [currentView])

// Processing state reset pattern
const resetProcessingState = () => {
  setEditId(null)
  setIsProcessing(false)
  setProcessingStatus(null)
  setCurrentEditUuid(null)
  setBaseImageForEdit(null)
  isSubmittingRef.current = false
  shouldPollRef.current = false
}

// Error overlay exclusion
{generatedVariants[currentVariant] === baseImageForEdit && 
 processingStatus && 
 currentVariant === generatedVariants.length - 1 && 
 !processingStatus.is_error && 
 processingStatus.processing_stage !== 'failed' && (
  <ProcessingOverlay />
)}
```

#### Latest Improvements (August 25, 2025 - Session 3)

**Prompt History Navigation System**:
- **Contextual Prompt Display**: When navigating between edited images, the prompt input now shows the prompt that was used to create the next image in the editing sequence
- **Navigation Logic**: Original image shows first edit prompt, first edit shows second edit prompt, and so on - providing context for what modification created each subsequent image
- **Cross-Navigation Support**: Prompt synchronization works across all navigation methods (arrow keys, thumbnail clicks, and touch navigation)
- **Smart State Management**: Prompt history is stored per editing session and automatically reset when uploading new images or returning home
- **Empty State Handling**: Final image in sequence shows empty prompt (ready for new edit), maintaining clean UX flow

**Implementation Details**:
```typescript
// Prompt history storage - stores prompt at source image index
const [promptHistory, setPromptHistory] = useState<string[]>([])

// During prompt submission, store prompt at current image index
setPromptHistory(prev => {
  const updated = [...prev];
  updated[currentVariant] = currentPrompt; // Store at source image
  return updated;
});

// Navigation shows prompt from current index (creates next image)
const promptToShow = promptHistory[currentIndex] || ""
setPrompt(promptToShow)
```

**User Experience Flow**:
- Upload image → prompt history starts empty
- Submit "make grass white" → prompt stored at index 0, clears after success
- Navigate to original → shows "make grass white" (creates edit 1)
- Navigate to edit 1 → shows empty (ready for next edit)
- Submit "make grass yellow" from edit 1 → prompt stored at index 1, clears after success
- Navigate back to edit 1 → shows "make grass yellow" (creates edit 2)
- Navigate to edit 2 → shows empty (ready for next edit)

#### Latest Improvements (August 24, 2025 - Session 2)

**Fast Keyboard Navigation Optimization**:
- Fixed main image not switching during rapid left/right arrow navigation
- Added `currentVariantRef` for immediate state updates without React render delays
- Implemented 100ms throttling to prevent excessive rapid navigation
- Enhanced main image re-rendering with stable keys and priority loading
- Removed processing state blocking from keyboard navigation (allows viewing previous images during processing)

**Processing Transition Improvements**:  
- Eliminated white background flash when submitting prompts on multiple images
- Reordered state updates for seamless transitions from source image to processing overlay
- Improved visual flow without jarring placeholder transitions

**Fixed Container Dimensions**:
- First uploaded image renders naturally with original responsive behavior
- Container dimensions are captured after natural rendering (100ms delay)
- Subsequent edited images maintain fixed container size to prevent layout shifts
- Uses `getBoundingClientRect()` to capture actual displayed dimensions
- Resets dimensions when starting new editing sessions

**Download System Enhancements**:
- **Improved Download Button Logic**: Shows on all edited images (not just final), hidden only during active processing
- **Smart Download Filenames**: Format `mizual_(input_image_name)_(position).png`
  - Examples: `mizual_vacation_edit_1.png`, `mizual_face_retouching_edit_2.png`
  - Handles both user uploads and example case images
  - Stores original filename without extension for reuse across editing session
- **Download Error Handling**: User-friendly error overlay with retry message, no page redirects

**Drag & Drop Visual Feedback**:
- Real-time visual highlighting when dragging files over drop zone
- Blue border, background tint, and scale animation during drag
- Dynamic text changes: "Drop your image here!" / "Release to upload"
- Smart drag leave detection to prevent flickering
- Smooth transitions with consistent blue theme

**Example Images Loading System**:
- **Loading States**: Animated skeleton placeholders prevent broken image appearance
- **Error Handling**: "Failed to load" messages with retry buttons for network issues
- **Progressive Loading**: Images fade in smoothly once loaded, labels appear with images
- **Retry Mechanism**: Cache-busting retry system for temporary network failures
- **Network Optimization**: Graceful fallbacks for slow internet connections

**UI/UX Polish**:
- Moved Contact button from header to footer for cleaner interface
- Maintained all dialog functionality with consistent footer styling
- Fixed Image component naming conflicts (NextImage vs native Image constructor)
- Enhanced error states across all image loading scenarios

**Code Quality Improvements**:
- Comprehensive state management for image loading, drag states, and error handling
- Robust cleanup patterns for all new state variables
- Improved component re-rendering performance with stable keys and refs
- Better separation of concerns between UI state and processing state

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
# .env.local (Development)
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_ENVIRONMENT=development
NEXT_PUBLIC_SUPPORTED_IMAGE_TYPES=image/jpeg,image/jpg,image/png,image/webp,image/gif,image/avif
```

#### Production Environment Variables

```env
# Vercel Production
NEXT_PUBLIC_API_URL=https://api.mizual.ai
NEXT_PUBLIC_ENVIRONMENT=production
NEXT_PUBLIC_SUPPORTED_IMAGE_TYPES=image/jpeg,image/jpg,image/png,image/webp,image/gif,image/avif
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


## Performance Optimization

### ⚡ MANDATORY Performance Requirements
All code MUST meet these performance standards across ALL target devices and browsers:

#### Core Web Vitals Targets
- **First Contentful Paint (FCP)**: <1.5s (current: ~1.2s)
- **Largest Contentful Paint (LCP)**: <2.5s (current: ~1.8s)
- **Cumulative Layout Shift (CLS)**: <0.1 (current: <0.1)
- **First Input Delay (FID)**: <100ms (current: <100ms)

#### Cross-Device Performance Standards
- **Mobile (3G/4G)**: App must load and be interactive within 3 seconds
- **Desktop/Laptop**: Sub-second interactions for all UI operations
- **Tablet**: Smooth 60fps animations and touch interactions
- **Low-end devices**: Graceful degradation without blocking UI

#### Optimization Strategies (MANDATORY Implementation)

**Bundle Size Optimization**:
- Dynamic imports for large components (`React.lazy()`)
- Tree shaking for unused code elimination
- Code splitting by route and feature
- **Image optimization**: `loading="lazy"`, WebP/AVIF formats, proper sizing

**Runtime Performance**:
- `React.memo()` for ALL stable components
- `useCallback()` and `useMemo()` for expensive operations
- Debounced user inputs (300ms default)
- Efficient re-rendering patterns
- Virtual scrolling for large lists

**Network & API Optimization**:
- Request batching and deduplication
- Proper caching strategies (browser + API)
- Offline fallback states
- Progressive loading patterns
- Retry logic with exponential backoff

**Cross-Browser Performance**:
- Safari-specific optimizations (iOS performance)
- Chrome V8 engine optimization
- Edge compatibility testing
- Firefox performance profiling

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
- **Currently Supported**: JPEG, PNG, WebP, GIF, AVIF
- **Cross-browser compatibility**: Optimized for Safari, Chrome, Edge, Firefox
- **Configuration**: Formats defined via `NEXT_PUBLIC_SUPPORTED_IMAGE_TYPES` environment variable
- **Performance**: Regular `<img>` tags used instead of Next.js Image for base64 support
- **Fallback**: Graceful error handling for unsupported formats across all browsers

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

#### Cross-Browser Development Tools
- **Chrome DevTools**: Primary development and performance analysis
- **Safari Web Inspector**: iOS/macOS compatibility testing
- **Firefox Developer Tools**: Cross-platform performance verification
- **Edge DevTools**: Windows compatibility validation

**Key Testing Areas:**
- **Network Tab**: API request monitoring across browsers
- **Console**: Error logging and debugging consistency
- **Performance**: Runtime analysis on each target browser
- **Responsive Design**: Device simulation and real device testing
- **Accessibility**: Screen reader and keyboard navigation testing

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

#### Target Browsers (MANDATORY Support)
- **Safari**: 14+ (iOS & macOS) - **PRIMARY** for Apple ecosystem
- **Chrome**: 90+ (All platforms) - **PRIMARY** for desktop/Android
- **Edge**: 90+ (Windows) - **REQUIRED** for Windows users
- **Firefox**: 88+ (All platforms) - **REQUIRED** for privacy-focused users
- **Other Chromium**: Brave, Opera, etc. - **SECONDARY** but should work

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
- Cross-browser compatibility testing is completed