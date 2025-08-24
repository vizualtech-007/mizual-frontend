"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import { Upload, ArrowLeft, ChevronLeft, ChevronRight, Download, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"


type ViewState = "home" | "output"

type LegalDocument = "Privacy Policy" | "Terms of Condition" | "Terms of Use"

export default function AIImageEditor() {
  const [currentView, setCurrentView] = useState<ViewState>("home")
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [currentVariant, setCurrentVariant] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [prompt, setPrompt] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [generatedVariants, setGeneratedVariants] = useState<string[]>([])
  const [editId, setEditId] = useState<string | null>(null);
  const [baseImageForEdit, setBaseImageForEdit] = useState<string | null>(null);
  const [currentEditUuid, setCurrentEditUuid] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);
  const shouldPollRef = useRef(false);
  const [processingStatus, setProcessingStatus] = useState<{
    status: string;
    processing_stage: string;
    message: string;
    progress_percent: number;
    is_complete: boolean;
    is_error: boolean;
  } | null>(null);
  const [legalDoc, setLegalDoc] = useState<LegalDocument | null>(null);
  const [isLegalDialogOpen, setIsLegalDialogOpen] = useState(false);
  const [legalContent, setLegalContent] = useState("");
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);

  
  // Supported image formats from environment or default
  const SUPPORTED_IMAGE_TYPES = process.env.NEXT_PUBLIC_SUPPORTED_IMAGE_TYPES || "image/jpeg,image/jpg,image/png,image/webp,image/gif,image/avif";


  const ensureDataUrl = async (src: string): Promise<string> => {
    if (src.startsWith("data:")) return src;
    const res = await fetch(src, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch image for conversion");
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const parseRetryAfter = (header: string | null): number => {
    if (!header) return 0;
    const seconds = Number.parseInt(header, 10);
    if (!Number.isNaN(seconds)) return seconds * 1000;
    const dateMs = Date.parse(header);
    if (!Number.isNaN(dateMs)) return Math.max(0, dateMs - Date.now());
    return 0;
  };

  const useCases = [
    {
      title: "Face Retouching",
      prompt: "Subtle skin smoothing and eye brightening, keeping a realistic look",
      beforeImage: "/images/mizual-acne.webp",
      afterImage: "/images/mizual-acne-removal.jpeg",
    },
    {
      title: "Remove Anything",
      prompt: "Remove the person playing saxophone, keeping only the person playing drums.",
      beforeImage: "/images/mizual-remove.jpeg",
      afterImage: "/images/mizual-remove-anything.jpeg",
    },
    {
      title: "Professional Headshot",
      prompt: "Turn this into a clean, professional LinkedIn headshot",
      beforeImage: "/images/mizual-headshot.jpg",
      afterImage: "/images/mizual-headshot-created.jpeg",
    },
    {
      title: "Scene Replacement",
      prompt: "Make this look like a movie poster with dramatic lighting and bold text",
      beforeImage: "/images/mizual-background.jpeg",
      afterImage: "/images/mizual-background-change.jpeg",
    },
  ]

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Reset all processing state when uploading new image
      setEditId(null)
      setIsProcessing(false)
      setProcessingStatus(null)
      setCurrentEditUuid(null)
      setBaseImageForEdit(null)
      isSubmittingRef.current = false
      
      const reader = new FileReader()
      reader.onload = (e) => {
        const imageData = e.target?.result as string
        setUploadedImage(imageData)
        setGeneratedVariants([imageData])
        setCurrentVariant(0)
        setCurrentView("output")
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith("image/")) {
      // Reset all processing state when uploading new image
      setEditId(null)
      setIsProcessing(false)
      setProcessingStatus(null)
      setCurrentEditUuid(null)
      setBaseImageForEdit(null)
      isSubmittingRef.current = false
      
      const reader = new FileReader()
      reader.onload = (e) => {
        const imageData = e.target?.result as string
        setUploadedImage(imageData)
        setGeneratedVariants([imageData])
        setCurrentVariant(0)
        setCurrentView("output")
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmitPrompt = async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    const sourceImage =
      currentView === "output" && generatedVariants.length > 0
        ? generatedVariants[currentVariant]
        : uploadedImage;

    if (!prompt.trim() || !sourceImage) return;

    
    setIsProcessing(true);
    setBaseImageForEdit(sourceImage);
    setProcessingStatus({
      status: "processing",
      processing_stage: "initializing",
      message: "Starting image processing...",
      progress_percent: 0,
      is_complete: false,
      is_error: false
    });
    // Add a blank space for the new image while preserving existing ones
    const placeholderImageUrl = sourceImage; // Use the input image as placeholder
    if (currentView === "output" && generatedVariants.length > 0) {
      // We're already in output view, add blank image
      setGeneratedVariants(prev => [...prev, placeholderImageUrl]);
      setCurrentVariant(generatedVariants.length);
    } else {
      // First time, create array with original and blank
      setGeneratedVariants([sourceImage, placeholderImageUrl]);
      setCurrentVariant(1);
      setCurrentView("output");
    }

    let apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    apiUrl = apiUrl.replace(/\/$/, '');
    
    
    let imagePayload: string;
    try {
      imagePayload = await ensureDataUrl(sourceImage);
    } catch (e) {
      setIsProcessing(false);
      isSubmittingRef.current = false;
      return;
    }

    const isChainEdit = currentView === "output" && generatedVariants.length > 0;
    const parentUuid = isChainEdit ? currentEditUuid : undefined;


    let attempt = 0;
    let response: Response | null = null;
    while (attempt < 3) {
      if (attempt > 0) {
      }
      
      response = await fetch(`${apiUrl}/edit-image/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          image: imagePayload,
          parent_edit_uuid: parentUuid
        }),
      });
      if (response.status === 429) {
        const retryAfterMs = parseRetryAfter(response.headers.get("retry-after")) || (1500 * Math.pow(2, attempt));
        await wait(retryAfterMs);
        attempt += 1;
        continue;
      }
      break;
    }

    if (!response || !response.ok) {

      // Handle upload errors (like unsupported image types)
      let errorMessage = 'Upload failed. Please try again.';
      
      if (response) {
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch (e) {
          // If we can't parse the error response, use default message
        }
      }
      
      // Show error using the same system as processing errors
      setProcessingStatus({
        status: 'failed',
        processing_stage: 'failed',
        message: errorMessage,
        progress_percent: 0,
        is_complete: false,
        is_error: true
      });
      
      // Clean up UI state on upload error
      if (currentView === "output" && generatedVariants.length > 0) {
        // Remove the placeholder image that was added
        setGeneratedVariants(prev => {
          const updated = prev.slice(0, -1);
          setCurrentVariant(Math.max(0, updated.length - 1));
          return updated;
        });
      }
      
      // Always switch back to output view on upload error
      // This ensures thumbnails and navigation disappear
      setCurrentView("output");
      
      setIsProcessing(false);
      isSubmittingRef.current = false;
      
      // Clear error message after 8 seconds (longer for upload errors)
      setTimeout(() => {
        setProcessingStatus(null);
      }, 8000);
      
      return;
    }

    const data = await response.json();
    setEditId(data.edit_id);
    
    
    isSubmittingRef.current = false;
  }

  useEffect(() => {
    if (editId) {
      shouldPollRef.current = true;
      let timeoutId: NodeJS.Timeout;
      
      const poll = async () => {
        // Check if we should still be polling
        if (!shouldPollRef.current || !editId) return;
        
        let apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

        try {
          apiUrl = apiUrl.replace(/\/$/, '');
          const pollResponse = await fetch(`${apiUrl}/edit/${editId}`);

          if (!pollResponse.ok) {
            throw new Error(`HTTP ${pollResponse.status}: ${pollResponse.statusText}`);
          }

          const pollData = await pollResponse.json();
          
          // Check again if we should still be polling before updating state
          if (!shouldPollRef.current) return;

          // Update processing status
          setProcessingStatus({
            status: pollData.status,
            processing_stage: pollData.processing_stage || "processing",
            message: pollData.message || "Processing image...",
            progress_percent: pollData.progress_percent || 0,
            is_complete: pollData.is_complete || false,
            is_error: pollData.is_error || false
          });

          if (pollData.is_complete && !pollData.is_error && pollData.edited_image_url) {
            const base = baseImageForEdit || uploadedImage;
            const newUrl = pollData.edited_image_url;
            // Replace the blank image with the actual result
            setGeneratedVariants(prev => {
              const updated = [...prev];
              updated[updated.length - 1] = newUrl;
              return updated;
            });
            setCurrentEditUuid(editId); // Track edit UUID for chaining
            setIsProcessing(false);
            setEditId(null); // Clear editId to stop polling
            setUploadedImage(pollData.edited_image_url);
            setProcessingStatus(null);
            shouldPollRef.current = false;
          } else if (pollData.is_error || pollData.status === 'failed') {
            setIsProcessing(false);
            setCurrentView("output");
            setEditId(null);
            shouldPollRef.current = false;
            // Keep error status to show error message
            setProcessingStatus({
              status: 'failed',
              processing_stage: 'failed',
              message: pollData.message || 'Image editing failed. Please try again.',
              progress_percent: 0,
              is_complete: false,
              is_error: true
            });
            // Remove the blank image on error
            setGeneratedVariants(prev => {
              const updated = prev.slice(0, -1);
              setCurrentVariant(Math.max(0, updated.length - 1)); // Go back to last valid image
              return updated;
            });
            // Clear error message after 5 seconds
            setTimeout(() => {
              setProcessingStatus(null);
            }, 5000);
          } else {
            // Only continue polling if we should still be polling
            if (shouldPollRef.current) {
              timeoutId = setTimeout(poll, 2000); // Reduced polling frequency to 2 seconds
            }
          }
        } catch (error) {
          console.error('Polling error:', error);
          setIsProcessing(false);
          setProcessingStatus(null);
          setEditId(null);
          shouldPollRef.current = false;
        }
      };
      
      poll();
      
      // Cleanup timeout when effect is cleaned up
      return () => {
        shouldPollRef.current = false;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };
    } else {
      shouldPollRef.current = false;
    }
  }, [editId]);

  const nextVariant = () => {
    setCurrentVariant((prev) => (prev + 1) % generatedVariants.length)
  }

  const prevVariant = () => {
    setCurrentVariant((prev) => (prev - 1 + generatedVariants.length) % generatedVariants.length)
  }

  const handleDownload = async () => {
    if (generatedVariants.length > 0) {
      try {
        const imageUrl = generatedVariants[currentVariant];
        
        // Convert to data URL if it's not already one
        const dataUrl = await ensureDataUrl(imageUrl);
        
        // Create download link
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = "edited-image.png";
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        document.body.removeChild(link);
      } catch (error) {
        console.error('Download failed:', error);
      }
    }
  }

  const resetEditor = () => {
    setCurrentView("home")
    setUploadedImage(null)
    setPrompt("")
    setCurrentVariant(0)
    setGeneratedVariants([]);
    setEditId(null);
    setProcessingStatus(null);
    setCurrentEditUuid(null);
    setBaseImageForEdit(null);
    setIsProcessing(false);
    isSubmittingRef.current = false;
    shouldPollRef.current = false;
  }

  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = "auto"
      textarea.style.height = textarea.scrollHeight + "px"
    }
  }, [prompt])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {

      if (currentView === "output" && document.activeElement?.tagName !== 'TEXTAREA' && generatedVariants.length > 1) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault()
          prevVariant()
        } else if (e.key === 'ArrowRight') {
          e.preventDefault()
          nextVariant()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [currentView, generatedVariants.length])

  // Auto-focus prompt input when switching to output view after image upload
  useEffect(() => {
    if (currentView === "output" && textareaRef.current) {
      // Small delay to ensure the component is rendered
      const timer = setTimeout(() => {
        textareaRef.current?.focus()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [currentView])


  return (
    <div className="h-[100dvh] overflow-hidden bg-[#F8F9FA] flex flex-col">
      {/* Header */}
      <header className="w-full h-14 sm:h-16 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between border-b border-[#D1D5DB] bg-white flex-shrink-0">
        <div onClick={resetEditor} className="flex items-center gap-2 sm:gap-3 cursor-pointer">
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-[#4F46E5] rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg sm:text-xl font-semibold text-[#1C1C1E]">Mizual</span>

          
        </div>
        {currentView === "output" && (
          <Button
            variant="ghost"
            onClick={resetEditor}
            className="text-[#1C1C1E] hover:bg-gray-100 rounded-lg px-3 sm:px-4 py-2 text-sm sm:text-base"
          >
            New Edit
          </Button>
        )}
        <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              className="text-[#1C1C1E] hover:bg-gray-100 rounded-lg px-3 sm:px-4 py-2 text-sm sm:text-base"
            >
              Contact
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Contact Us</DialogTitle>
              <DialogDescription>
                You can reach us at contact@mizual.ai
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        {currentView === "home" && (
          <div className="flex flex-col min-h-full">
            {/* Hero Section */}
            <div className="flex-grow flex flex-col justify-center px-4 sm:px-6 lg:px-8 pt-8 lg:pt-4">
              <div className="text-center mb-6 sm:mb-8">
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[#1C1C1E] mb-2 sm:mb-3">
                  Instantly Edit Your Photos with AI
                </h1>
              </div>
              <div
                className="w-full max-w-2xl mx-auto border-2 border-dashed border-[#D1D5DB] rounded-xl sm:rounded-2xl p-6 sm:p-8 lg:p-10 text-center bg-transparent transition-all duration-300 cursor-pointer group hover:border-[#4F46E5]"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex flex-col items-center gap-3 sm:gap-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:bg-[#4F46E5]/10 transition-colors">
                    <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-[#4F46E5]" />
                  </div>
                  <div>
                    <p className="text-base sm:text-lg font-medium text-[#1C1C1E] mb-1">
                      Choose a photo to get started
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500">
                      Or drag and drop your image here
                    </p>
                  </div>
                </div>
              </div>

              {/* Prompt Suggestions */}
              <div className="text-center py-4 sm:py-6">
                <p className="text-sm text-gray-500 mb-3">Or try one of these examples:</p>
                <div className="flex flex-wrap justify-center gap-2 sm:gap-3 px-4">
                  {useCases.map((useCase, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        // Reset all processing state when loading example
                        setEditId(null)
                        setIsProcessing(false)
                        setProcessingStatus(null)
                        setCurrentEditUuid(null)
                        setBaseImageForEdit(null)
                        isSubmittingRef.current = false
                        
                        setUploadedImage(useCase.beforeImage);
                        setPrompt(useCase.prompt);
                        setGeneratedVariants([useCase.beforeImage]);
                        setCurrentVariant(0);
                        setCurrentView("output");
                      }}
                      className="px-3 py-1.5 bg-white border border-gray-300 rounded-full text-xs sm:text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm"
                    >
                      {useCase.title}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Examples Section */}
            <div className="w-full bg-transparent">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  {useCases.map((useCase, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-xl p-3 sm:p-4 shadow-sm hover:shadow-md transition-all duration-300 group border border-[#D1D5DB]"
                    >
                      <h3 className="text-sm sm:text-base font-bold text-[#1C1C1E] mb-2 sm:mb-3 text-center">
                        {useCase.title}
                      </h3>
                      <div className="flex gap-2 sm:gap-3 w-full">
                        <div className="relative flex-1 aspect-square rounded-lg overflow-hidden shadow-sm border border-[#D1D5DB]">
                          <img
                            src={useCase.beforeImage || "/placeholder.svg"}
                            alt={`${useCase.title} before`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                          <span className="absolute bottom-1 left-1 text-[10px] sm:text-xs font-medium text-white bg-black/60 px-1 sm:px-1.5 py-0.5 rounded">
                            Before
                          </span>
                        </div>
                        <div className="relative flex-1 aspect-square rounded-lg overflow-hidden shadow-sm border border-[#D1D5DB]">
                          <img
                            src={useCase.afterImage || "/placeholder.svg"}
                            alt={`${useCase.title} after`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                          <span className="absolute bottom-1 left-1 text-[10px] sm:text-xs font-medium text-white bg-black/60 px-1 sm:px-1.5 py-0.5 rounded">
                            After
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <footer className="flex-shrink-0 py-4 sm:py-5 px-4 sm:px-6 bg-white border-t border-gray-200">
              <div className="max-w-7xl mx-auto">
                <div className="flex flex-col items-center gap-2">
                  <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-gray-600">
                    <a href="/privacy-policy" target="_blank" className="hover:text-[#4F46E5] transition-colors" onClick={(e) => { e.preventDefault(); setLegalDoc("Privacy Policy"); fetch('/privacy-policy').then(res => res.text()).then(text => setLegalContent(text)); setIsLegalDialogOpen(true); }}>
                      Privacy Policy
                    </a>
                    <a href="/terms-of-condition" target="_blank" className="hover:text-[#4F46E5] transition-colors" onClick={(e) => { e.preventDefault(); setLegalDoc("Terms of Condition"); fetch('/terms-of-condition').then(res => res.text()).then(text => setLegalContent(text)); setIsLegalDialogOpen(true); }}>
                      Terms of Condition
                    </a>
                    <a href="/terms-of-use" target="_blank" className="hover:text-[#4F46E5] transition-colors" onClick={(e) => { e.preventDefault(); setLegalDoc("Terms of Use"); fetch('/terms-of-use').then(res => res.text()).then(text => setLegalContent(text)); setIsLegalDialogOpen(true); }}>
                      Terms of Use
                    </a>
                  </div>
                  <div className="text-xs text-gray-500">
                    © 2025 Mizual. All rights reserved.
                  </div>
                </div>
              </div>
            </footer>

            <input ref={fileInputRef} type="file" accept={SUPPORTED_IMAGE_TYPES} onChange={handleFileUpload} className="hidden" />

            <Dialog open={isLegalDialogOpen} onOpenChange={setIsLegalDialogOpen}>
              <DialogContent className="prose lg:prose-xl p-8">
                <DialogHeader>
                  <DialogTitle>{legalDoc}</DialogTitle>
                  <DialogDescription dangerouslySetInnerHTML={{ __html: legalContent }} />
                </DialogHeader>
              </DialogContent>
            </Dialog>
          </div>
        )}


        {currentView === "output" && (
          <div className="relative flex flex-col h-full p-4">
            {/* Image with Navigation */}
            <div
              className="relative flex-1 flex items-center justify-center min-h-0"

              onTouchStart={generatedVariants.length > 1 ? (e) => {

                const touch = e.touches[0]
                e.currentTarget.dataset.startX = touch.clientX.toString()
              } : undefined}
              onTouchEnd={generatedVariants.length > 1 ? (e) => {
                const startX = Number.parseFloat(e.currentTarget.dataset.startX || "0")
                const endX = e.changedTouches[0].clientX
                const diff = startX - endX

                if (Math.abs(diff) > 50) {
                  if (diff > 0) {
                    nextVariant()
                  } else {
                    prevVariant()
                  }
                }
              } : undefined}
            >

              {/* Navigation Buttons - Only show when there are multiple variants */}
              {generatedVariants.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={prevVariant}
                  className="w-10 h-10 sm:w-12 sm:h-12 bg-white hover:bg-gray-50 shadow-md rounded-xl border border-[#D1D5DB] text-[#1C1C1E] absolute left-0 top-1/2 -translate-y-1/2 z-10"
                >
                  <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                </Button>
              )}

              {/* Image Frame - Border wraps around actual image */}
              <div className="flex justify-center w-full max-h-[70vh]">
                <div className="relative border border-[#D1D5DB] overflow-hidden">
                  <Image
                    src={generatedVariants[currentVariant] || "/placeholder.svg"}
                    alt="Current image"
                    width={800}
                    height={600}
                    className="object-contain cursor-pointer hover:scale-[1.02] transition-transform duration-200 max-w-[90vw] max-h-[70vh] w-auto h-auto"
                    onClick={() => setIsFullscreen(true)}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 800px"
                    priority={currentVariant === 0}
                  />
                  
                  {/* Processing Overlay - Only shows when processing and no error */}
                  {generatedVariants[currentVariant] === baseImageForEdit && processingStatus && currentVariant === generatedVariants.length - 1 && !processingStatus.is_error && processingStatus.processing_stage !== 'failed' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center bg-white/80">
                      <p className="text-lg font-medium text-[#1C1C1E]">{processingStatus.message}</p>
                      {processingStatus.progress_percent > 0 && (
                        <div className="w-full flex justify-center">
                          <div className="w-48 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-[#4F46E5] h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${processingStatus.progress_percent}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Error Overlay - Only shows when there's an error */}
                  {processingStatus && (processingStatus.is_error || processingStatus.processing_stage === 'failed') && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center">
                      <div className="bg-red-100 border border-red-200 rounded-lg p-4 max-w-md shadow-lg">
                        <p className="text-lg font-medium text-red-800 mb-2">Edit Failed</p>
                        <p className="text-sm text-red-600">{processingStatus.message}</p>
                      </div>
                    </div>
                  )}

                  {/* Download Button - only show on successfully processed images */}
                  {currentVariant > 0 && generatedVariants[currentVariant] !== baseImageForEdit && (
                    <Button
                      onClick={handleDownload}
                      size="icon"
                      className="absolute bottom-4 right-4 w-10 h-10 sm:w-12 sm:h-12 bg-[#4F46E5] hover:bg-[#6366F1] text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 z-20"
                      title="Download Image"
                    >
                      <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                    </Button>
                  )}
                </div>
              </div>



              {generatedVariants.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={nextVariant}
                  className="w-10 h-10 sm:w-12 sm:h-12 bg-white hover:bg-gray-50 shadow-md rounded-xl border border-[#D1D5DB] text-[#1C1C1E] absolute right-0 top-1/2 -translate-y-1/2 z-10"
                >
                  <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                </Button>
              )}
            </div>

            {/* Thumbnail Navigation */}
            <div className="flex-shrink-0 w-full flex justify-center items-center py-3 sm:py-4">
              <div className="flex gap-2 sm:gap-3">
                {generatedVariants.map((variant, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentVariant(index)}
                    className={`relative w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-lg overflow-hidden border-2 transition-all duration-300 hover:scale-105 ${
                      index === currentVariant 
                        ? "border-[#4F46E5] shadow-lg ring-2 ring-[#4F46E5]/20" 
                        : "border-[#D1D5DB] hover:border-gray-400"
                    }`}
                  >
                    <Image
                      src={variant}
                      alt={`Variant ${index + 1}`}
                      fill
                      className={`object-cover transition-opacity duration-200 ${
                        variant === baseImageForEdit && processingStatus && index === generatedVariants.length - 1 
                          ? "opacity-50" 
                          : "opacity-100"
                      }`}
                      sizes="(max-width: 640px) 60px, (max-width: 768px) 70px, 80px"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt Input */}
            <div className="flex-shrink-0 w-full max-w-screen-md mx-auto px-4 pb-4">
              <div className="relative flex items-center border border-[#D1D5DB] rounded-xl bg-white shadow-sm focus-within:shadow-md focus-within:border-[#4F46E5] focus-within:ring-2 focus-within:ring-[#4F46E5]/20 transition-all duration-300">
                <textarea
                  ref={textareaRef}
                  value={prompt}

                  placeholder="Describe your edit: 'Blur background', 'Add glasses', 'Fix lighting'"

                  rows={1}
                  className="flex-1 w-full resize-none overflow-auto max-h-[45vh] min-h-[48px] sm:min-h-[52px] text-sm sm:text-base lg:text-lg px-3 sm:px-4 py-3 bg-transparent leading-normal focus:outline-none text-[#1C1C1E]"
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      if (prompt.trim() && !isProcessing) {
                        handleSubmitPrompt()
                      }
                    }
                  }}
                />

                <button
                  onClick={handleSubmitPrompt}
                  disabled={!prompt.trim() || isProcessing}
                  className="w-9 h-9 sm:w-10 sm:h-10 mr-2 bg-[#4F46E5] hover:bg-[#6366F1] text-white rounded-lg sm:rounded-xl shadow-sm hover:shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isProcessing ? (
                    <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Fullscreen View */}
        {isFullscreen && (
          <div
            className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
            onClick={() => setIsFullscreen(false)}
          >
            <div className="relative w-full h-full flex items-center justify-center">

              {generatedVariants.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation()
                    prevVariant()
                  }}
                  className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 hover:bg-white/30 text-white rounded-xl border border-white/20 absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10"
                >
                  <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                </Button>
              )}

              <div
                className="relative w-full h-full flex items-center justify-center"
                onTouchStart={generatedVariants.length > 1 ? (e) => {

                  const touch = e.touches[0]
                  e.currentTarget.dataset.startX = touch.clientX.toString()
                } : undefined}
                onTouchEnd={generatedVariants.length > 1 ? (e) => {
                  const startX = Number.parseFloat(e.currentTarget.dataset.startX || "0")
                  const endX = e.changedTouches[0].clientX
                  const diff = startX - endX

                  if (Math.abs(diff) > 50) {
                    if (diff > 0) {
                      nextVariant()
                    } else {
                      prevVariant()
                    }
                  }
                } : undefined}
              >
                <Image
                  src={generatedVariants[currentVariant] || "/placeholder.svg"}
                  alt="Generated image variant - Fullscreen"
                  fill
                  className="object-contain"
                  sizes="100vw"
                  priority
                />
              </div>


              {generatedVariants.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation()
                    nextVariant()
                  }}
                  className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 hover:bg-white/30 text-white rounded-xl border border-white/20 absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10"
                >
                  <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                </Button>
              )}

              <button
                onClick={() => setIsFullscreen(false)}
                className="absolute top-4 right-4 w-8 h-8 sm:w-10 sm:h-10 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center transition-colors z-10 text-sm sm:text-base"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}