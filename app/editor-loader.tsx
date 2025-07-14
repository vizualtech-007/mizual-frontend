"use client";

import dynamic from 'next/dynamic';

const AIImageEditor = dynamic(() => import('./editor-client'), { ssr: false });

export default function EditorLoader() {
  return <AIImageEditor />;
}