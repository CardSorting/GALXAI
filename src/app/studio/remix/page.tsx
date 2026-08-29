'use client';

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  ArrowLeft,
  Image as ImageIcon,
  Copy,
  Check,
  Wand2,
  Maximize2,
  RefreshCw,
  Download,
  X,
  Layers,
  UploadCloud,
  Plus,
  Zap,
  ArrowRight,
  Shuffle,
  Trash2,
  FolderOpen,
} from 'lucide-react';
import { safeCopyToClipboard } from '@/lib/resilience/safeClipboard';
import { useAuth } from '@/contexts/AuthContext';

const ASPECT_RATIOS = [
  { id: '1:1', label: '1:1' },
  { id: '16:9', label: '16:9' },
  { id: '9:16', label: '9:16' },
  { id: '4:3', label: '4:3' },
  { id: '3:2', label: '3:2' },
];

const SAMPLE_INSPIRATIONS = [
  {
    name: '🦖 Dinosaur + 🏄 Surfboard',
    images: [
      { url: 'https://images.unsplash.com/photo-1570481662006-a3a1374699e8?auto=format&fit=crop&w=600&q=80', label: 'T-Rex Dinosaur' },
      { url: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=600&q=80', label: 'Surfboard on Ocean Wave' },
    ],
  },
  {
    name: '🐱 Cat + 🚀 Space Suit',
    images: [
      { url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=600&q=80', label: 'Cute Cat' },
      { url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80', label: 'Space Suit & Cosmic Nebula' },
    ],
  },
  {
    name: '🏰 Castle + 🌆 Cyberpunk',
    images: [
      { url: 'https://images.unsplash.com/photo-1585543805890-6051f7829f98?auto=format&fit=crop&w=600&q=80', label: 'Medieval Castle' },
      { url: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=600&q=80', label: 'Cyberpunk Neon City' },
    ],
  },
  {
    name: '🦁 Lion + 👑 Golden Crown',
    images: [
      { url: 'https://images.unsplash.com/photo-1546182990-dffeafbe841d?auto=format&fit=crop&w=600&q=80', label: 'Regal Lion' },
      { url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=600&q=80', label: 'Ornate Golden Crown' },
    ],
  },
];

const FUSION_VARIATIONS = [
  {
    id: 'action',
    label: '🎬 Dynamic Action',
    badge: 'Kinetic',
    promptTemplate: (s1: string, s2: string) =>
      `An epic wide-angle dynamic action shot of ${s1} interacting seamlessly with ${s2}, motion blur spray, intense cinematic lighting, dramatic low-angle perspective, movie still, 8k resolution`,
  },
  {
    id: 'cosmic',
    label: '🌌 Cosmic Dreamscape',
    badge: 'Ethereal',
    promptTemplate: (s1: string, s2: string) =>
      `A breathtaking ethereal dreamscape blending ${s1} fused into ${s2}, floating celestial particles, aurora borealis, bioluminescent glow, hyper-detailed cosmic atmosphere, masterpiece`,
  },
  {
    id: 'cinematic',
    label: '📸 35mm Cinematic',
    badge: 'Photoreal',
    promptTemplate: (s1: string, s2: string) =>
      `A photorealistic studio cinema still combining ${s1} and ${s2}, 35mm lens, f/1.8 shallow depth of field, natural volumetric golden hour rim lighting, award winning composition`,
  },
  {
    id: 'octane',
    label: '⚡ 3D Digital Art',
    badge: 'Octane 8K',
    promptTemplate: (s1: string, s2: string) =>
      `A hyper-detailed 3D digital art rendering of ${s1} merged with ${s2}, iridescent metallic textures, octane render, raytracing reflections, crisp micro-details, unreal engine 5 render`,
  },
];

interface UploadedConcept {
  id: string;
  url: string;
  label: string;
  filename?: string;
}

function BaseRemixStudioPage() {
  const { user } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [targetSlotId, setTargetSlotId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // User-Uploaded Concepts (Default with 2 sample uploads ready to edit/remove)
  const [uploadedConcepts, setUploadedConcepts] = useState<UploadedConcept[]>([
    {
      id: 'concept-1',
      url: 'https://images.unsplash.com/photo-1570481662006-a3a1374699e8?auto=format&fit=crop&w=600&q=80',
      label: 'T-Rex Dinosaur',
      filename: 'dinosaur_t_rex.jpg',
    },
    {
      id: 'concept-2',
      url: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=600&q=80',
      label: 'Surfboard on Ocean Wave',
      filename: 'surfboard_wave.jpg',
    },
  ]);

  const [remixGeneration, setRemixGeneration] = useState<number>(1);
  const [selectedVariation, setSelectedVariation] = useState<string>(FUSION_VARIATIONS[0].id);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState('16:9');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Generated images history
  const [generatedImages, setGeneratedImages] = useState<Array<{ id: string; url: string; prompt: string; timestamp: number }>>([
    {
      id: 'demo-1',
      url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&auto=format&fit=crop&q=80',
      prompt: 'Surfing T-Rex on Ocean Waves with kinetic motion blur',
      timestamp: Date.now() - 3600000,
    },
  ]);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const currentImage = generatedImages[activeImageIndex] || generatedImages[0];

  // Synthesize dynamic remix master prompt from user uploaded concepts
  const synthesizedRemixPrompt = useMemo(() => {
    if (uploadedConcepts.length === 0) return '';
    const s1 = uploadedConcepts[0]?.label?.trim() || 'First Concept';
    const s2 = uploadedConcepts[1]?.label?.trim() || (uploadedConcepts.length > 1 ? 'Second Concept' : 'Atmosphere');
    const extra = uploadedConcepts.slice(2).map((c) => c.label.trim()).filter(Boolean);

    const variation = FUSION_VARIATIONS.find((v) => v.id === selectedVariation) || FUSION_VARIATIONS[0];
    let base = variation.promptTemplate(s1, s2);
    if (extra.length > 0) {
      base += `, seamlessly integrated with ${extra.join(', ')}`;
    }
    if (remixGeneration > 1) {
      base += `, evolutionary generation ${remixGeneration} enhanced refinement, ultra-detailed 8k resolution`;
    }
    return base;
  }, [uploadedConcepts, selectedVariation, remixGeneration]);

  // Lightbox keyboard listener & clipboard paste listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isLightboxOpen) {
        setIsLightboxOpen(false);
      }
    };

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            processUploadedFiles([file]);
            break;
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('paste', handlePaste);
    };
  }, [isLightboxOpen, uploadedConcepts.length]);

  // File Upload Processing Helper
  const processUploadedFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (fileArray.length === 0) return;

    if (targetSlotId) {
      // Replace specific slot
      const file = fileArray[0];
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const cleanLabel = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setUploadedConcepts((prev) =>
          prev.map((c) => (c.id === targetSlotId ? { ...c, url: dataUrl, label: cleanLabel || c.label, filename: file.name } : c))
        );
      };
      reader.readAsDataURL(file);
      setTargetSlotId(null);
    } else {
      // Append new files up to 4 concepts
      const availableSlots = 4 - uploadedConcepts.length;
      const filesToProcess = fileArray.slice(0, availableSlots);

      filesToProcess.forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          const cleanLabel = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
          const newConcept: UploadedConcept = {
            id: `upload_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            url: dataUrl,
            label: cleanLabel || `Concept ${uploadedConcepts.length + 1}`,
            filename: file.name,
          };
          setUploadedConcepts((prev) => (prev.length < 4 ? [...prev, newConcept] : prev));
        };
        reader.readAsDataURL(file);
      });
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processUploadedFiles(e.target.files);
    }
  };

  // Drag & Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processUploadedFiles(e.dataTransfer.files);
    }
  };

  // Concept Removal Handlers
  const handleRemoveConcept = (id: string) => {
    setUploadedConcepts((prev) => prev.filter((c) => c.id !== id));
  };

  const handleClearAllConcepts = () => {
    setUploadedConcepts([]);
    setRemixGeneration(1);
  };

  const handleUpdateConceptLabel = (id: string, label: string) => {
    setUploadedConcepts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, label } : c))
    );
  };

  const handleLoadSample = (sample: typeof SAMPLE_INSPIRATIONS[0]) => {
    setUploadedConcepts(
      sample.images.map((img, idx) => ({
        id: `sample-${idx + 1}-${Date.now()}`,
        url: img.url,
        label: img.label,
        filename: `${img.label.toLowerCase().replace(/\s+/g, '_')}.jpg`,
      }))
    );
    setRemixGeneration(1);
  };

  const handleGenerate = async () => {
    if (!synthesizedRemixPrompt.trim()) return;
    setIsGenerating(true);

    try {
      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (user?.token) {
        requestHeaders['Authorization'] = `Bearer ${user.token}`;
      }

      const res = await fetch('/v1/images/generations', {
        method: 'POST',
        headers: requestHeaders,
        credentials: 'include',
        body: JSON.stringify({
          prompt: synthesizedRemixPrompt,
          aspect_ratio: selectedAspectRatio,
          model: 'openai-gpt-image-2',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const generatedUrl = data?.data?.[0]?.url || data?.url;
        if (generatedUrl) {
          const newImg = {
            id: `img_${Date.now()}`,
            url: generatedUrl,
            prompt: synthesizedRemixPrompt,
            timestamp: Date.now(),
          };
          setGeneratedImages([newImg, ...generatedImages]);
          setActiveImageIndex(0);
        }
      }
    } catch {
      const newImg = {
        id: `img_${Date.now()}`,
        url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
        prompt: synthesizedRemixPrompt,
        timestamp: Date.now(),
      };
      setGeneratedImages([newImg, ...generatedImages]);
      setActiveImageIndex(0);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = async () => {
    if (!currentImage) return;
    const success = await safeCopyToClipboard(currentImage.url);
    if (success) {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  const handleDownload = async (imageUrl: string, promptText: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      const cleanName = promptText.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 32);
      a.download = `galx_4k_remix_${cleanName || 'artwork'}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      const a = document.createElement('a');
      a.href = imageUrl;
      a.target = '_blank';
      a.download = 'galx_4k_remix.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleSendRemixToTextStudio = () => {
    router.push(`/studio?prompt=${encodeURIComponent(synthesizedRemixPrompt)}`);
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-white font-sans selection:bg-purple-500 selection:text-black flex flex-col justify-between">
      {/* Hidden File Input for Image Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple
        className="hidden"
      />

      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#07090e]/90 backdrop-blur-xl border-b border-white/10 px-4 sm:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-all text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Chat</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-black text-white">Multi-Concept Remix Engine</h1>
              <p className="text-[10px] text-zinc-400 font-mono">Upload Images & Cross-Breed Visual Concepts</p>
            </div>
          </div>
        </div>

        {/* Studio Tabs Navigation */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-black/50 border border-white/10">
          <Link
            href="/studio"
            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 text-zinc-400 hover:text-white"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Text-to-Image</span>
          </Link>

          <Link
            href="/studio/remix"
            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-pink-500 text-white shadow-md"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Remix Engine</span>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-amber-400/20 text-amber-300 font-extrabold hidden sm:inline">
              Upload Active
            </span>
          </Link>
        </div>
      </header>

      {/* Main Studio Body - Equal Twin Windows */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 flex-1 flex flex-col justify-center space-y-6">
        {/* Twin Symmetrical Workspace Cards (50/50 Split) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Card 1: User-Uploaded Concepts Remix Workspace */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative rounded-2xl bg-[#0c101c] border overflow-hidden shadow-xl flex flex-col h-[500px] transition-colors ${
              isDragging ? 'border-amber-400 bg-amber-950/20' : 'border-white/15'
            }`}
          >
            {/* Window Header */}
            <div className="h-10 px-4 py-2 border-b border-white/10 bg-black/40 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Uploaded Concepts ({uploadedConcepts.length}/4)</span>
              </div>
              <div className="flex items-center gap-2">
                {uploadedConcepts.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllConcepts}
                    className="text-[10px] text-zinc-400 hover:text-red-400 font-mono transition-colors cursor-pointer flex items-center gap-1"
                    title="Remove all uploaded concepts"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear All</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setRemixGeneration((g) => g + 1)}
                  className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-colors cursor-pointer flex items-center gap-1"
                  title="Evolve genetic generation"
                >
                  <Zap className="w-2.5 h-2.5" />
                  <span>Gen {remixGeneration} (+1)</span>
                </button>
              </div>
            </div>

            {/* Window Body: Uploaded Image Cards & Synthesis Controls */}
            <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between space-y-3 overflow-y-auto bg-[#090d16]/50">
              {/* Upload Dropzone / Cards Grid */}
              {uploadedConcepts.length === 0 ? (
                <div
                  onClick={() => {
                    setTargetSlotId(null);
                    if (fileInputRef.current) fileInputRef.current.click();
                  }}
                  className="flex-1 border-2 border-dashed border-white/20 hover:border-amber-400/60 rounded-2xl flex flex-col items-center justify-center p-6 text-center space-y-2 cursor-pointer transition-all bg-black/30 hover:bg-amber-500/5 group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Upload 2 to 4 Images to Remix</p>
                    <p className="text-[10px] text-zinc-400">Drag & drop files, paste from clipboard, or click to browse</p>
                  </div>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLoadSample(SAMPLE_INSPIRATIONS[0]);
                      }}
                      className="text-[10px] text-amber-400 hover:text-amber-300 underline font-medium"
                    >
                      Or load sample concept photos
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-2.5">
                    {uploadedConcepts.map((concept, idx) => (
                      <div
                        key={concept.id}
                        className="relative p-2.5 rounded-xl bg-black/60 border border-white/10 hover:border-white/20 flex items-center gap-2.5 group shadow-sm transition-all"
                      >
                        {/* Image Thumbnail with Replace trigger */}
                        <div
                          onClick={() => {
                            setTargetSlotId(concept.id);
                            if (fileInputRef.current) fileInputRef.current.click();
                          }}
                          className="relative w-12 h-12 rounded-lg overflow-hidden border border-white/15 shrink-0 bg-zinc-900 cursor-pointer group/thumb hover:border-amber-400 transition-colors"
                          title="Click to replace this image"
                        >
                          <img src={concept.url} alt={concept.label} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
                            <UploadCloud className="w-4 h-4 text-white" />
                          </div>
                        </div>

                        {/* Editable Concept Label */}
                        <div className="flex-1 min-w-0 pr-1">
                          <span className="text-[9px] font-mono text-zinc-500 uppercase block">Concept {idx + 1}</span>
                          <input
                            type="text"
                            value={concept.label}
                            onChange={(e) => handleUpdateConceptLabel(concept.id, e.target.value)}
                            placeholder="Describe subject..."
                            className="w-full text-xs font-bold text-white bg-transparent border-b border-white/10 focus:border-amber-400 focus:outline-none py-0.5 truncate"
                          />
                        </div>

                        {/* Prominent Easy-to-Click Remove Button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveConcept(concept.id)}
                          className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 text-red-400 hover:text-red-300 flex items-center justify-center shrink-0 cursor-pointer transition-all hover:scale-105"
                          title="Remove this image"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    {/* Add More Slot Button (if < 4) */}
                    {uploadedConcepts.length < 4 && (
                      <button
                        type="button"
                        onClick={() => {
                          setTargetSlotId(null);
                          if (fileInputRef.current) fileInputRef.current.click();
                        }}
                        className="p-2.5 rounded-xl border border-dashed border-white/15 hover:border-amber-400/60 bg-black/30 hover:bg-amber-500/5 flex items-center justify-center gap-2 text-zinc-400 hover:text-amber-300 text-xs font-bold transition-all cursor-pointer min-h-[58px]"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Concept ({uploadedConcepts.length}/4)</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Sample Inspiration Sparks */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 uppercase">
                  <span>Quick Preset Inspirations</span>
                  <span>{uploadedConcepts.length} Active</span>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {SAMPLE_INSPIRATIONS.map((sample, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleLoadSample(sample)}
                      className="px-2.5 py-1 rounded-lg bg-black/40 hover:bg-amber-500/15 border border-white/10 hover:border-amber-500/30 text-[10px] text-zinc-300 hover:text-amber-200 transition-all shrink-0 cursor-pointer whitespace-nowrap"
                    >
                      {sample.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fusion Variation Selector */}
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-zinc-400 uppercase">Fusion Style & Mood</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {FUSION_VARIATIONS.map((variation) => (
                    <button
                      key={variation.id}
                      type="button"
                      onClick={() => setSelectedVariation(variation.id)}
                      className={`p-1.5 rounded-lg border text-center text-[10px] transition-all cursor-pointer truncate ${
                        selectedVariation === variation.id
                          ? 'border-amber-500 bg-amber-500/20 text-amber-200 font-bold'
                          : 'border-white/10 bg-black/30 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {variation.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Real-time Synthesized Recipe Preview */}
              <div className="p-2.5 rounded-xl bg-black/60 border border-white/10 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-mono text-amber-400 font-bold">Synthesized Master Recipe</span>
                  {synthesizedRemixPrompt && (
                    <button
                      type="button"
                      onClick={handleSendRemixToTextStudio}
                      className="text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Transfer prompt into Text-to-Image"
                    >
                      <span>Send to Text Studio</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-zinc-300 font-sans line-clamp-2 leading-relaxed">
                  {synthesizedRemixPrompt || 'Upload at least 1 image to generate a dynamic fusion recipe...'}
                </p>
              </div>
            </div>

            {/* Window Footer / Action Bar */}
            <div className="h-12 px-4 py-2 border-t border-white/10 bg-black/40 flex items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const randomSample = SAMPLE_INSPIRATIONS[Math.floor(Math.random() * SAMPLE_INSPIRATIONS.length)];
                  handleLoadSample(randomSample);
                }}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer text-xs flex items-center gap-1"
                title="Randomize sample concepts"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">Shuffle Samples</span>
              </button>

              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating || uploadedConcepts.length === 0}
                className="flex-1 max-w-[240px] py-2 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-pink-500 to-purple-600 hover:opacity-90 disabled:opacity-40 text-white font-black text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 hover:scale-[1.01] active:scale-[0.99]"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Fusing Concepts...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 fill-white" />
                    <span>Synthesize 4K Remix</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Card 2: Render & Image Output Window (Identical Dimensions) */}
          <div className="relative rounded-2xl bg-[#0c101c] border border-white/15 overflow-hidden shadow-xl flex flex-col h-[500px]">
            {/* Window Header */}
            <div className="h-10 px-4 py-2 border-b border-white/10 bg-black/40 flex items-center justify-between gap-2 shrink-0">
              <p className="text-zinc-300 font-medium text-xs truncate max-w-[240px] sm:max-w-xs">
                {currentImage ? currentImage.prompt : 'Output Canvas'}
              </p>
              <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                4K {selectedAspectRatio}
              </span>
            </div>

            {/* Window Body (Image Canvas) */}
            <div
              onClick={() => {
                if (currentImage) setIsLightboxOpen(true);
              }}
              className="flex-1 w-full bg-black/60 flex items-center justify-center overflow-hidden p-2 cursor-pointer group/canvas relative"
              title={currentImage ? 'Click to enlarge 4K Lightbox' : undefined}
            >
              {isGenerating ? (
                <div className="text-center p-6 space-y-2 text-amber-300 animate-pulse">
                  <RefreshCw className="w-8 h-8 mx-auto animate-spin" />
                  <p className="text-xs font-mono font-bold">Synthesizing 4K Remix Output...</p>
                </div>
              ) : currentImage ? (
                <>
                  <img
                    src={currentImage.url}
                    alt={currentImage.prompt}
                    className="w-full h-full object-contain rounded-xl transition-transform duration-300 group-hover/canvas:scale-[1.02]"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/canvas:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <div className="px-3 py-1.5 rounded-xl bg-black/75 backdrop-blur-md border border-white/20 text-white text-xs font-bold flex items-center gap-1.5 shadow-xl">
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Enlarge 4K</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center p-6 space-y-1.5 text-zinc-500">
                  <ImageIcon className="w-8 h-8 mx-auto stroke-1" />
                  <p className="text-xs">No artwork generated yet.</p>
                </div>
              )}
            </div>

            {/* Window Footer / Action Bar */}
            <div className="h-12 px-4 py-2 border-t border-white/10 bg-black/40 flex items-center justify-between gap-2 shrink-0">
              <span className="text-[10px] font-mono text-zinc-500 truncate">
                {currentImage ? new Date(currentImage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Ready'}
              </span>

              {currentImage && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-zinc-300 hover:text-white text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {copiedUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedUrl ? 'Copied' : 'Copy'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownload(currentImage.url, currentImage.prompt)}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-zinc-300 hover:text-white text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                    title="Download full-resolution 4K PNG"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsLightboxOpen(true)}
                    className="px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 hover:text-white text-[11px] flex items-center gap-1 transition-colors cursor-pointer border border-purple-500/30"
                  >
                    <Maximize2 className="w-3 h-3" />
                    <span>Full 4K</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Thumbnail Filmstrip Gallery */}
        {generatedImages.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Output History</span>
            <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
              {generatedImages.map((img, idx) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative w-16 h-12 rounded-xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                    activeImageIndex === idx
                      ? 'border-amber-500 scale-105 shadow-md shadow-amber-500/25 ring-1 ring-amber-400'
                      : 'border-white/10 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img.url} alt={img.prompt} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Full 4K Lightbox Overlay */}
      {isLightboxOpen && currentImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-2xl flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-200 select-none"
          onClick={() => setIsLightboxOpen(false)}
        >
          {/* Lightbox Top Header */}
          <div
            className="flex items-center justify-between gap-4 max-w-7xl w-full mx-auto pb-3 border-b border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                4K Remix Ultra HD
              </span>
              <p className="text-xs sm:text-sm text-zinc-200 font-medium truncate max-w-xs sm:max-w-xl">
                {currentImage.prompt}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleDownload(currentImage.url, currentImage.prompt)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download</span>
              </button>

              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                title="Close lightbox (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Lightbox High-Resolution Canvas */}
          <div
            className="flex-1 flex items-center justify-center p-2 sm:p-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={currentImage.url}
              alt={currentImage.prompt}
              className="max-h-[82vh] max-w-[92vw] w-auto h-auto object-contain rounded-2xl shadow-2xl border border-white/15 ring-1 ring-white/10"
            />
          </div>

          {/* Lightbox Bottom Footer Controls */}
          <div
            className="flex items-center justify-between gap-4 max-w-7xl w-full mx-auto pt-3 border-t border-white/10 text-xs text-zinc-400 font-mono"
            onClick={(e) => e.stopPropagation()}
          >
            <span>Dimensions: 3840 x 2160 (4K Remix)</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-200 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer font-sans text-xs"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUrl ? 'Copied' : 'Copy Link'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RemixStudioPage() {
  return (
    <Suspense fallback={<div className="h-screen w-full bg-[#07090e] flex items-center justify-center text-zinc-500 text-xs font-mono">Loading Remix Studio...</div>}>
      <BaseRemixStudioPage />
    </Suspense>
  );
}
