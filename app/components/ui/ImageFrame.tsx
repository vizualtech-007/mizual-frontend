"use client"
import Image from "next/image"

type ImageFrameProps = {
  src: string
  alt?: string
  objectFitClass?: string
  aspectRatio?: string
}

export default function ImageFrame({ 
  src, 
  alt = "Image", 
  objectFitClass = "object-contain",
  aspectRatio = "4/3"
}: ImageFrameProps) {
  // Use regular img tag for base64 data URLs, Next.js Image for static files
  const isBase64 = src.startsWith("data:")
  
  if (isBase64) {
    return (
      <div className="flex justify-center w-full">
        <div className="relative inline-block border border-[#D1D5DB] overflow-hidden">
          <img
            src={src}
            alt={alt}
            className={`${objectFitClass} max-w-full max-h-[40vh] w-auto h-auto`}
            loading="lazy"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-center w-full">
      <div className="relative inline-block border border-[#D1D5DB] overflow-hidden">
        <Image
          src={src}
          alt={alt}
          width={0}
          height={0}
          className={`${objectFitClass} w-auto h-auto max-w-full max-h-[40vh]`}
          sizes="(max-width: 768px) 100vw, 400px"
          loading="lazy"
          style={{ width: 'auto', height: 'auto' }}
        />
      </div>
    </div>
  )
}
