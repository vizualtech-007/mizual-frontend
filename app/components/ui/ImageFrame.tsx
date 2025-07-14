"use client"
import Image from "next/image"

type ImageFrameProps = {
  src: string
  alt?: string
  objectFitClass?: string
}

export default function ImageFrame({ src, alt = "Image", objectFitClass = "object-contain" }: ImageFrameProps) {
  return (
    <div className="relative bg-white w-full max-w-md mx-auto border border-[#D1D5DB] flex items-center justify-center overflow-hidden">
      <Image
        src={src}
        alt={alt}
        className={`${objectFitClass} max-h-[40vh] w-auto h-auto`}
      />
    </div>
  )
}
