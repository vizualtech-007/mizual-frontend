"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import { Upload, ArrowLeft, ChevronLeft, ChevronRight, Download, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

type ViewState = "home" | "upload" | "output"


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
  const [processingStage, setProcessingStage] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Toast auto-hide functionality
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 5000); // Hide after 5 seconds
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Show toast message
  const showToast = (message: string) => {
    setToastMessage(message);
  };

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
      const reader = new FileReader()
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string)
        setCurrentView("upload")
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
      const reader = new FileReader()
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string)
        setCurrentView("upload")
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

    // Use Next.js runtime config for browser access
    let apiUrl = typeof window !== 'undefined' 
      ? window.location.hostname.includes('git-dev') 
        ? 'https://mizual-backend-dev.onrender.com'
        : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
      : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    
    // Remove trailing slash to avoid double slashes
    apiUrl = apiUrl.replace(/\/$/, '');
    let imagePayload: string;
    try {
      imagePayload = await ensureDataUrl(sourceImage);
    } catch (e) {
      setIsProcessing(false);
      return;
    }

    // Determine if this is a chain edit
    const isChainEdit = currentView === "output" && generatedVariants.length > 0;
    const parentUuid = isChainEdit ? currentEditUuid : undefined;

    let attempt = 0;
    let response: Response | null = null;
    while (attempt < 3) {
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
      setIsProcessing(false);
      isSubmittingRef.current = false;
      return;
    }

    const data = await response.json();
    setEditId(data.edit_id);
    isSubmittingRef.current = false;
  }

  useEffect(() => {
    if (editId) {
      const poll = async () => {
        // Use Next.js runtime config for browser access
        let apiUrl = typeof window !== 'undefined' 
          ? window.location.hostname.includes('git-dev') 
            ? 'https://mizual-backend-dev.onrender.com'
            : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
          : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        
        try {
          // Remove trailing slash to avoid double slashes
          apiUrl = apiUrl.replace(/\/$/, '');
          const pollResponse = await fetch(`${apiUrl}/edit/${editId}`);
          
          if (!pollResponse.ok) {
            throw new Error(`HTTP ${pollResponse.status}: ${pollResponse.statusText}`);
          }
          
          const pollData = await pollResponse.json();

        // Update processing stage for debugging
        if (pollData.processing_stage) {
          setProcessingStage(pollData.processing_stage);
        }

        if (pollData.status === 'completed') {
          const base = baseImageForEdit || uploadedImage;
          const newUrl = pollData.edited_image_url as string;
          const nextVariants = generatedVariants.length === 0
            ? [base as string, newUrl]
            : [...generatedVariants, newUrl];
          setGeneratedVariants(nextVariants);
          setCurrentVariant(nextVariants.length - 1); // Focus on the newest image
          setCurrentEditUuid(editId); // Track edit UUID for chaining
          setIsProcessing(false);
          setProcessingStage(""); // Clear stage
          setCurrentView("output");
          setEditId(null); // Clear editId to stop polling
          setUploadedImage(pollData.edited_image_url);
          showToast("Image editing completed successfully!");
        } else if (pollData.status === 'failed') {
          setIsProcessing(false);
          setProcessingStage(""); // Clear stage
          setCurrentView("upload");
          setEditId(null);
          showToast(`Image editing failed. Please try again with a different prompt or image.`);
        } else {
          setTimeout(poll, 1000);
        }
        } catch (error) {
          console.error('Polling error:', error);
          setIsProcessing(false);
          setProcessingStage(""); // Clear stage
          setEditId(null);
          showToast(`Network error while checking status: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      };
      poll();
    }
  }, [editId]);

  const nextVariant = () => {
    setCurrentVariant((prev) => (prev + 1) % generatedVariants.length)
  }

  const prevVariant = () => {
    setCurrentVariant((prev) => (prev - 1 + generatedVariants.length) % generatedVariants.length)
  }

  const handleDownload = () => {
    if (generatedVariants.length > 0) {
      const link = document.createElement("a")
      link.href = generatedVariants[currentVariant]
      link.download = "edited-image.png"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const resetEditor = () => {
    setCurrentView("home")
    setUploadedImage(null)
    setPrompt("")
    setCurrentVariant(0)
    setGeneratedVariants([]);
    setEditId(null);
  }

  // Resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = "auto"
      textarea.style.height = textarea.scrollHeight + "px"
    }
  }, [prompt])

  // Keyboard navigation for image variants
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle arrow keys when in output view and not typing in textarea
      if (currentView === "output" && document.activeElement?.tagName !== 'TEXTAREA') {
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

  const scrollRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const { clientWidth } = scrollRef.current
      scrollRef.current.scrollBy({
        left: direction === "left" ? -clientWidth * 0.9 : clientWidth * 0.9,
        behavior: "smooth",
      })
    }
  }

  return (
    <div className="h-[100dvh] overflow-hidden bg-[#F8F9FA] flex flex-col">
      {/* Header h-14 px fiexed height*/}
      <header className="w-full h-16 px-6 py-4 flex items-center justify-between border-b border-[#D1D5DB] bg-white">
        <div onClick={resetEditor} className="flex items-center gap-3 cursor-pointer">
          <div className="w-8 h-8 bg-[#4F46E5] rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-semibold text-[#1C1C1E]">Mizual</span>
        </div>
        {currentView === "output" && (
          <Button
            variant="ghost"
            onClick={resetEditor}
            className="text-[#1C1C1E] hover:bg-gray-100 rounded-lg px-4 py-2"
          >
            New Edit
          </Button>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 max-h-[calc(100vh-64px)] flex flex-col overflow-hidden">
        {currentView === "home" && (
          <div className="flex-1 flex flex-col px-2 pb-4 sm:px-4">
            <div className="h-[50%] sm:h-[55%] md:h-[55%] lg:h-[45%] w-full mx-auto pt-2 px-2 my-6">
              <div className="text-center mb-6">
                <h1 className="text-3xl sm:text-4xl sm:text-4xl lg:text-4xl font-bold text-[#1C1C1E] mb-2">
                  ✨ Instantly Edit Your Photos with AI
                </h1>
                <p className="text-sm sm:text-base text-gray-600">

                </p>
              </div>

              {/* Upload Area */}
              <div
                className="max-w-2xl mx-auto border-2 border-dashed border-[#D1D5DB] rounded-2xl p-8 text-center bg-white shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group hover:border-[#4F46E5]"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:bg-[#4F46E5]/10 transition-colors">
                    <Upload className="w-6 h-6 sm:w-8 text-[#4F46E5]" />
                  </div>
                  <div>
                    <p className="text-sm sm:text-base font-medium text-[#1C1C1E] mb-1">Choose a photo to get started</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative h-[50%] sm:h-[45%] md:h-[45%] lg:h-[55%] px-4 sm:px-6 lg:px-10 overflow-y-auto">
              <div
                ref={scrollRef}
                className="flex h-full items-center overflow-x-auto gap-4 scroll-smooth snap-x snap-mandatory scrollbar-hide"
              >
                {useCases.map((useCase, index) => (
                  <div
                    key={index}
                    className="snap-start shrink-0 bg-white rounded-2xl p-3 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col items-center text-center group border border-[#D1D5DB] min-w-[90%] sm:min-w-[45%] lg:min-w-[40%] max-h-full"
                  >
                    <h3 className="text-lg sm:text-xl font-bold text-[#1C1C1E] mb-2">{useCase.title}</h3>
                    {/* <p className="text-sm text-gray-600 mb-4 italic">"{useCase.prompt}"</p> */}
                    <div className="flex gap-2 sm:gap-3 w-full justify-center">
                      <div className="relative w-[50%] aspect-square rounded-xl overflow-hidden shadow-sm border border-[#D1D5DB] max-h-[120px] sm:max-h-[140px] md:max-h-[200px] lg:max-h-[200px]">
                        <Image
                          src={useCase.beforeImage || "/placeholder.svg"}
                          alt={`${useCase.title} before`}
                          layout="fill"
                          objectFit="cover"
                          className="group-hover:scale-105 transition-transform duration-300"
                        />
                        <span className="absolute bottom-1 left-1 text-xs font-medium text-white bg-black/60 px-1.5 py-0.5 rounded-md">
                          Before
                        </span>
                      </div>
                      <div className="relative w-[50%] aspect-square rounded-xl overflow-hidden shadow-sm border border-[#D1D5DB] max-h-[120px] sm:max-h-[140px] md:max-h-[200px] lg:max-h-[200px]">
                        <Image
                          src={useCase.afterImage || "/placeholder.svg"}
                          alt={`${useCase.title} after`}
                          layout="fill"
                          objectFit="cover"
                          className="group-hover:scale-105 transition-transform duration-300"
                        />
                        <span className="absolute bottom-1 left-1 text-xs font-medium text-white bg-black/60 px-1.5 py-0.5 rounded-md">
                          After
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Left Arrow */}
              <button
                onClick={() => scroll("left")}
                className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 bg-white shadow-md p-2 rounded-full z-10 hover:bg-gray-100"
              >
                <ChevronLeft className="w-6 h-6 text-gray-700" />
              </button>

              {/* Right Arrow */}
              <button
                onClick={() => scroll("right")}
                className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 bg-white shadow-md p-2 rounded-full z-10 hover:bg-gray-100"
              >
                <ChevronRight className="w-6 h-6 text-gray-700" />
              </button>
            </div>

            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          </div>
        )}

        {currentView === "upload" && (
          <div className="relative h-full w-full p-2">
            {/* Back Button - Top Left <div className="relative pl-16 mb-6"> */}
            <Button
              variant="ghost"
              onClick={resetEditor}
              className="absolute top-2 left-0 sm:top-4 sm:left-4 z-10 w-10 h-10 sm:w-10 sm:h-10 bg-white hover:bg-gray-100 shadow-md rounded-xl border border-[#D1D5DB] flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5 text-[#1C1C1E]" />
            </Button>

            <div className="relative w-full h-[calc(100%-4rem)] inset-0 flex items-center justify-center pointer-events-none">
              {/* Image Preview pl-14 sm:pl-0  
              <div className="bg-white w-full max-w-md mx-auto border border-[#D1D5DB] flex items-center justify-center overflow-hidden">
              className={`object-contain w-full h-auto max-h-[60vh] sm:max-h-[70vh] md:max-h-[70vh] lg:max-h-[70vh]`}
 
              */}

              <Image
                src={uploadedImage || "/placeholder.svg"}
                alt="Uploaded image"
                className={`max-h-full max-w-full object-contain`}
              />
            </div>
            {/* Prompt Input 1, We have defined a fix height for this prompt input i.e h-12 sm:h-14left-1/2 -translate-x-1/2 w-full max-w-screen-md
             */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-screen-md px-4 z-10">
              <div className="flex items-center border border-[#D1D5DB] rounded-xl bg-white shadow-sm focus-within:shadow-md focus-within:border-[#4F46E5] focus-within:ring-2 focus-within:ring-[#4F46E5]/20 transition-all duration-300">
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  placeholder="Describe your edit: 'Blur background', 'Add glasses', 'Fix lighting'"
                  rows={1}
                  className="w-full resize-none overflow-auto max-h-[45vh] min-h-12 text-base lg:text-xl px-4 pr-14 py-2 bg-transparent leading-none focus:outline-none text-[#1C1C1E]"
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

                {/* Embedded Right Arrow Button */}
                <button
                  onClick={handleSubmitPrompt}
                  disabled={!prompt.trim() || isProcessing}
                  className="absolute absolute top-1/2 right-4 -translate-y-1/2 mr-1 sm:mr-2 w-10 h-10 mr-1 sm:mr-2 bg-[#4F46E5] hover:bg-[#6366F1] text-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center focus:outline-none focus:ring-0"
                >
                  {isProcessing ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <ChevronRight className="w-6 h-6" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {currentView === "output" && (
          <div className="relative flex flex-col h-full p-2 justify-center items-center">
            {/*
            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold text-[#1C1C1E] mb-2">Your Edited Image</h2>
              <p className="text-gray-600">Choose your favorite variant or refine further</p>
            </div>
            */}

            {/* Image with Navigation  w-full h-[calc(100%-3rem)]  */}
            <div
              className="relative w-full h-[calc(100%-12rem)] flex items-center justify-center min-h-0"
              onTouchStart={(e) => {
                const touch = e.touches[0]
                e.currentTarget.dataset.startX = touch.clientX.toString()
              }}
              onTouchEnd={(e) => {
                const startX = Number.parseFloat(e.currentTarget.dataset.startX || "0")
                const endX = e.changedTouches[0].clientX
                const diff = startX - endX

                if (Math.abs(diff) > 50) {
                  // Minimum swipe distance
                  if (diff > 0) {
                    nextVariant() // Swipe left = next
                  } else {
                    prevVariant() // Swipe right = previous
                  }
                }
              }}
            >
              {/* Left Navigation Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={prevVariant}
                className="w-10 h-10 sm:w-12 sm:h-12 bg-white hover:bg-gray-50 shadow-md rounded-xl border border-[#D1D5DB] text-[#1C1C1E] absolute left-0 top-1/2 -translate-y-1/2"
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>

              {/* Image */}
              <div className="bg-white h-full border border-[#D1D5DB] flex items-center justify-center overflow-hidden">
                <Image
                  src={generatedVariants[currentVariant] || "/placeholder.svg"}
                  alt="Generated image variant"
                  className={`max-h-full max-w-full object-contain cursor-pointer`}
                  onClick={() => setIsFullscreen(true)}
                />
              </div>
              {/* Floating Download Button */}
              <Button
                onClick={handleDownload}
                size="icon"
                className="absolute bottom-4 right-4 w-12 h-12 bg-[#4F46E5] hover:bg-[#6366F1] text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 z-20"
                title="Download Image"
              >
                <Download className="w-5 h-5" />
              </Button>
              {/* Right Navigation Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={nextVariant}
                className="w-10 h-10 sm:w-12 sm:h-12 bg-white hover:bg-gray-50 shadow-md rounded-xl border border-[#D1D5DB] text-[#1C1C1E] absolute right-0 top-1/2 -translate-y-1/2"
              >
                <ChevronRight className="w-6 h-6" />
              </Button>
            </div>

            {/* Thumbnail Navigation */}
            <div className="relative z-10 w-full max-w-screen-md flex justify-center items-center py-4 mb-6">
              <div className="flex gap-2 sm:gap-3 w-full justify-center">
                {generatedVariants.map((variant, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentVariant(index)}
                    className={`relative w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-lg overflow-hidden border-2 transition-all duration-300 hover:scale-105 ${
                      index === currentVariant 
                        ? "border-[#4F46E5] shadow-lg" 
                        : "border-[#D1D5DB] hover:border-gray-400"
                    }`}
                  >
                    <Image
                      src={variant}
                      alt={`Variant ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>

              {/* Prompt Input - same placement as upload view */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-screen-md px-4 z-10">
                <div className="flex items-center border border-[#D1D5DB] rounded-xl bg-white shadow-sm focus-within:shadow-md focus-within:border-[#4F46E5] focus-within:ring-2 focus-within:ring-[#4F46E5]/20 transition-all duration-300">
                  <textarea
                    ref={textareaRef}
                    value={prompt}
                    placeholder="Describe your edit: 'Blur background', 'Add glasses', 'Fix lighting'"
                    rows={1}
                    className="w-full resize-none overflow-auto max-h-[45vh] min-h-12 text-base lg:text-xl px-4 pr-14 py-2 bg-transparent leading-none focus:outline-none text-[#1C1C1E]"
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

                  {/* Embedded Right Arrow Button */}
                  <button
                    onClick={handleSubmitPrompt}
                    disabled={!prompt.trim() || isProcessing}
                    className="absolute absolute top-1/2 right-4 -translate-y-1/2 mr-1 sm:mr-2 w-10 h-10 mr-1 sm:mr-2 bg-[#4F46E5] hover:bg-[#6366F1] text-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center focus:outline-none focus:ring-0"
                  >
                    {isProcessing ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <ChevronRight className="w-6 h-6" />
                    )}
                  </button>
                </div>
              </div>
          </div>
        )}

        {isFullscreen && (
          <div
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setIsFullscreen(false)}
          >
            <div className="relative w-full h-full flex items-center justify-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation()
                  prevVariant()
                }}
                className="w-12 h-12 bg-white/20 hover:bg-white/30 text-white rounded-xl border border-white/20 absolute left-4 top-1/2 -translate-y-1/2 z-10"
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>

              <div
                className="relative w-full h-full flex items-center justify-center touch-pan-y"
                onTouchStart={(e) => {
                  const touch = e.touches[0]
                  e.currentTarget.dataset.startX = touch.clientX.toString()
                }}
                onTouchEnd={(e) => {
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
                }}
              >
                <Image
                  src={generatedVariants[currentVariant] || "/placeholder.svg"}
                  alt="Generated image variant - Fullscreen"
                  className="max-w-[90vw] max-h-[90vh] w-auto h-auto object-contain"
                />
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation()
                  nextVariant()
                }}
                className="w-12 h-12 bg-white/20 hover:bg-white/30 text-white rounded-xl border border-white/20 absolute right-4 top-1/2 -translate-y-1/2 z-10"
              >
                <ChevronRight className="w-6 h-6" />
              </Button>

              <button
                onClick={() => setIsFullscreen(false)}
                className="absolute top-4 right-4 w-10 h-10 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center transition-colors z-10"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Processing Stage Debug Info */}
      {isProcessing && processingStage && (
        <div className="fixed bottom-4 left-4 z-40 bg-blue-100 border border-blue-200 rounded-lg shadow-lg p-3">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
            <p className="text-sm text-blue-800 font-medium">
              Stage: {processingStage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </p>
          </div>
        </div>
      )}

      {/* Toast Message */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm">
          <div className="flex items-start">
            <div className="flex-1">
              <p className="text-sm text-gray-900">{toastMessage}</p>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="ml-3 text-gray-400 hover:text-gray-600 text-lg leading-none"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
