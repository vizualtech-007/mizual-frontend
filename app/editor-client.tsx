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

  const useCases = [
    {
      title: "Face Retouching",
      prompt: "Subtle skin smoothing and eye brightening, keeping a realistic look",
      beforeImage: "/images/mizual-acne.webp",
      afterImage: "/images/mizual-acne-removal.jpeg",
    },
    {
      title: "Remove Anything",
      prompt: "Remove the women on the left",
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
    if (!prompt.trim() || !uploadedImage) return;

    setIsProcessing(true);
    setCurrentView("upload");

    // Use Next.js runtime config for browser access
    const apiUrl = typeof window !== 'undefined' 
      ? window.location.hostname.includes('git-dev') 
        ? 'https://mizual-backend-dev.onrender.com'
        : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
      : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    console.log("API URL being used:", apiUrl); // Debug log
    const response = await fetch(`${apiUrl}/edit-image/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, image: uploadedImage }),
    });

    const data = await response.json();
    setEditId(data.edit_id);
  }

  useEffect(() => {
    if (editId) {
      const poll = async () => {
        // Use Next.js runtime config for browser access
        const apiUrl = typeof window !== 'undefined' 
          ? window.location.hostname.includes('git-dev') 
            ? 'https://mizual-backend-dev.onrender.com'
            : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
          : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        console.log("Polling API URL:", apiUrl); // Debug log
        const pollResponse = await fetch(`${apiUrl}/edit/${editId}`);
        const pollData = await pollResponse.json();

        if (pollData.status === 'completed') {
          setGeneratedVariants([uploadedImage, pollData.edited_image_url]);
          setCurrentVariant(1); // Focus on the edited image variant
          setIsProcessing(false);
          setCurrentView("output");
          setEditId(null); // Clear editId to stop polling
        } else if (pollData.status === 'failed') {
          setIsProcessing(false);
          setCurrentView("input");
          setEditId(null);
        } else {
          setTimeout(poll, 1000);
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
                  placeholder="Describe your edit: “Blur background”, “Add glasses”, “Fix lighting"
                  rows={1}
                  className="w-full resize-none overflow-auto max-h-[45vh] min-h-12 text-base lg:text-xl px-4 pr-14 py-2 bg-transparent leading-none focus:outline-none text-[#1C1C1E]"
                  onChange={(e) => setPrompt(e.target.value)}
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
              className="relative w-full h-full flex items-center justify-center min-h-0"
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

            {/* Progress Indicators and Download Button */}
            <div className="relative z-10 h-14 w-full max-w-screen-md flex justify-between items-center">
              <div className="flex gap-2 w-full pr-12 justify-center">
                {generatedVariants.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentVariant(index)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      index === currentVariant ? "bg-[#4F46E5] w-8" : "bg-[#D1D5DB] hover:bg-gray-400 w-2"
                    }`}
                  />
                ))}
              </div>

              {/* Download Button */}
              <Button
                onClick={handleDownload}
                size="icon"
                className="absolute right-0 w-10 h-10 bg-[#4F46E5] hover:bg-[#6366F1] text-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300"
                title="Download Image"
              >
                <Download className="w-4 h-4" />
              </Button>
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
    </div>
  )
}
