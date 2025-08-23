// Mock API service for local development
export class MockAPIService {
  private static instance: MockAPIService;
  private mockImages = [
    '/images/mizual-acne-removal.jpeg',
    '/images/mizual-background-change.jpeg',
    '/images/mizual-headshot-created.jpeg',
    '/images/mizual-remove-anything.jpeg',
    '/images/mizual-remove.jpeg'
  ];
  private processingJobs = new Map<string, any>();

  static getInstance(): MockAPIService {
    if (!MockAPIService.instance) {
      MockAPIService.instance = new MockAPIService();
    }
    return MockAPIService.instance;
  }

  // Mock the edit-image endpoint
  async mockEditImage(prompt: string, image: string, parentEditUuid?: string): Promise<any> {
    const editId = `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Start a mock processing job
    this.startMockProcessing(editId, prompt);
    
    return {
      edit_id: editId,
      status: 'processing',
      message: 'Mock processing started'
    };
  }

  // Mock the edit status endpoint
  async mockEditStatus(editId: string): Promise<any> {
    const job = this.processingJobs.get(editId);
    
    if (!job) {
      return {
        status: 'failed',
        message: 'Mock job not found',
        is_error: true,
        is_complete: false
      };
    }

    if (job.isComplete) {
      // Job is complete, return the result
      return {
        status: 'completed',
        processing_stage: 'completed',
        message: 'Mock processing completed successfully',
        progress_percent: 100,
        is_complete: true,
        is_error: false,
        edited_image_url: job.resultImage
      };
    }

    // Job is still processing, update progress
    job.progress += Math.random() * 25; // Random progress increment
    if (job.progress >= 100) {
      job.progress = 100;
      job.isComplete = true;
    }

    return {
      status: 'processing',
      processing_stage: job.stages[Math.floor(job.progress / 25)],
      message: `Mock ${job.stages[Math.floor(job.progress / 25)]}...`,
      progress_percent: Math.min(job.progress, 100),
      is_complete: job.isComplete,
      is_error: false
    };
  }

  private startMockProcessing(editId: string, prompt: string): void {
    const stages = ['initializing', 'analyzing', 'processing', 'finalizing'];
    const randomImage = this.mockImages[Math.floor(Math.random() * this.mockImages.length)];
    
    this.processingJobs.set(editId, {
      prompt,
      progress: 0,
      isComplete: false,
      stages,
      resultImage: randomImage,
      startTime: Date.now()
    });

    // Simulate realistic processing time (2-5 seconds for faster feedback)
    const processingTime = 2000 + Math.random() * 3000;
    
    setTimeout(() => {
      const job = this.processingJobs.get(editId);
      if (job) {
        job.progress = 100;
        job.isComplete = true;
      }
    }, processingTime);
  }

  // Clean up completed jobs
  cleanupJob(editId: string): void {
    this.processingJobs.delete(editId);
  }
}

// Helper function to check if we should use mock API
export function shouldUseMockAPI(): boolean {
  if (typeof window === 'undefined') return false; // Server-side, don't mock
  
  // Only use mock API if explicitly enabled via environment variable
  return process.env.NEXT_PUBLIC_USE_MOCK_API === 'true';
}

// Mock fetch function that intercepts API calls
export function createMockFetch(): typeof fetch {
  const originalFetch = window.fetch;
  const mockService = MockAPIService.getInstance();

  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input.toString();
    
    // Only intercept our specific API endpoints
    if (shouldUseMockAPI() && (url.includes('/edit-image/') || url.includes('/edit/'))) {
      return await handleMockAPI(url, init, mockService);
    }
    
    // Fall back to original fetch for other requests
    return originalFetch(input, init);
  };
}

async function handleMockAPI(url: string, init?: RequestInit, mockService?: MockAPIService): Promise<Response> {
  if (!mockService) {
    mockService = MockAPIService.getInstance();
  }

  try {
    if (url.includes('/edit-image/') && init?.method === 'POST') {
      // Handle edit-image endpoint
      const body = init.body ? JSON.parse(init.body as string) : {};
      const result = await mockService.mockEditImage(body.prompt, body.image, body.parent_edit_uuid);
      
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (url.includes('/edit/') && url.split('/').length > 2) {
      // Handle edit status endpoint
      const editId = url.split('/').pop();
      if (editId) {
        const result = await mockService.mockEditStatus(editId);
        
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // Fallback for unmatched endpoints
    return new Response(JSON.stringify({ error: 'Mock endpoint not found' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('🔧 Mock API error:', error);
    return new Response(JSON.stringify({ error: 'Mock API error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 