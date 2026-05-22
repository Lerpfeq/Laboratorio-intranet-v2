'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface ImageItem {
  id: string;
  file: File;
  originalPreview: string;
  processedPreview: string | null;
  status: 'pending' | 'processing' | 'done' | 'error';
  error?: string;
}

export default function RemoveBGPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchUserData();
    }
  }, [session]);

  const fetchUserData = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const addFiles = useCallback((files: FileList | File[]) => {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/bmp'];
    const newImages: ImageItem[] = [];

    const fileArray = Array.from(files);
    const remaining = 10 - images.length;
    const toAdd = fileArray.slice(0, remaining);

    for (const file of toAdd) {
      if (!validTypes.includes(file.type)) continue;
      if (file.size > 10 * 1024 * 1024) continue;

      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const preview = URL.createObjectURL(file);

      newImages.push({
        id,
        file,
        originalPreview: preview,
        processedPreview: null,
        status: 'pending',
      });
    }

    if (newImages.length > 0) {
      setImages(prev => [...prev, ...newImages]);
    }
  }, [images.length]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }, [addFiles]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      e.target.value = '';
    }
  };

  const processImage = async (imageItem: ImageItem) => {
    setImages(prev =>
      prev.map(img =>
        img.id === imageItem.id ? { ...img, status: 'processing' as const } : img
      )
    );

    try {
      const formData = new FormData();
      formData.append('image', imageItem.file);

      const res = await fetch('/api/remove-background', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to process image');
      }

      setImages(prev =>
        prev.map(img =>
          img.id === imageItem.id
            ? { ...img, status: 'done' as const, processedPreview: data.image }
            : img
        )
      );
    } catch (err: any) {
      setImages(prev =>
        prev.map(img =>
          img.id === imageItem.id
            ? { ...img, status: 'error' as const, error: err.message }
            : img
        )
      );
    }
  };

  const processAll = async () => {
    const pending = images.filter(img => img.status === 'pending' || img.status === 'error');
    for (const img of pending) {
      await processImage(img);
    }
  };

  const removeImage = (id: string) => {
    setImages(prev => {
      const img = prev.find(i => i.id === id);
      if (img) {
        URL.revokeObjectURL(img.originalPreview);
      }
      return prev.filter(i => i.id !== id);
    });
  };

  const clearAll = () => {
    images.forEach(img => URL.revokeObjectURL(img.originalPreview));
    setImages([]);
  };

  const downloadImage = (dataUrl: string, originalName: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
    link.download = `${nameWithoutExt}_no-bg.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAll = () => {
    const done = images.filter(img => img.status === 'done' && img.processedPreview);
    done.forEach(img => {
      if (img.processedPreview) {
        downloadImage(img.processedPreview, img.file.name);
      }
    });
  };

  const pendingCount = images.filter(i => i.status === 'pending' || i.status === 'error').length;
  const processingCount = images.filter(i => i.status === 'processing').length;
  const doneCount = images.filter(i => i.status === 'done').length;

  const isAdmin = user?.category === 'Admin';
  const isPosGraduando = user?.category === 'Pos-graduando';

  if (status === 'loading' || loading) {
    return <div style={{ padding: '2rem' }}>Loading...</div>;
  }

  return (
    <div>
      <header className="header">
        <div className="header-container">
          <div className="logo-section">
            <div style={{ position: 'relative', width: '40px', height: '40px' }}>
              <Image src="/logo.png" alt="LERP Logo" fill style={{ objectFit: 'contain' }} />
            </div>
            <div className="logo-text"><h1>LERP</h1></div>
          </div>
          <nav className="nav-tabs">
            {user?.status === 'approved' && (
              <>
                <Link href="/dashboard">Dashboard</Link>
                <Link href="/reagentes">Reagent</Link>
                {(isPosGraduando || isAdmin) && <Link href="/agendamento">Calendar</Link>}
                {(isPosGraduando || isAdmin) && <Link href="/residuos">Waste</Link>}
                <Link href="/amostras">Samples Seletion</Link>
                <Link href="/removedor-bg">Image</Link>
                {isAdmin && <Link href="/admin">Admin</Link>}
              </>
            )}
          </nav>
          <div className="user-menu">
            <span>{user?.name}</span>
            <button onClick={() => router.push('/api/auth/signout')}>Sair</button>
          </div>
        </div>
      </header>

      <main className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        <h2 className="page-title">Background Remover</h2>
        <p style={{ color: '#666', marginBottom: '1.5rem' }}>
          Upload up to 10 images to automatically remove their backgrounds. Supports PNG, JPEG, WebP, and BMP (max 10MB each).
        </p>

        {/* Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${isDragging ? '#0c2340' : '#ccc'}`,
            borderRadius: '12px',
            padding: '3rem 2rem',
            textAlign: 'center',
            cursor: images.length >= 10 ? 'not-allowed' : 'pointer',
            backgroundColor: isDragging ? '#f0f5ff' : '#fafafa',
            transition: 'all 0.2s ease',
            marginBottom: '1.5rem',
            opacity: images.length >= 10 ? 0.5 : 1,
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📁</div>
          <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#333', margin: '0.5rem 0' }}>
            {images.length >= 10 ? 'Maximum 10 images reached' : 'Drag & drop images here'}
          </p>
          <p style={{ color: '#888', fontSize: '0.9rem' }}>
            {images.length >= 10 ? 'Remove some images to add more' : 'or click to browse files'}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/bmp"
            multiple
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            disabled={images.length >= 10}
          />
        </div>

        {/* Action Buttons */}
        {images.length > 0 && (
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={processAll}
              disabled={pendingCount === 0 || processingCount > 0}
              style={{
                padding: '0.6rem 1.5rem',
                backgroundColor: pendingCount === 0 || processingCount > 0 ? '#ccc' : '#0c2340',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: pendingCount === 0 || processingCount > 0 ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                fontSize: '0.95rem',
              }}
            >
              {processingCount > 0 ? `Processing... (${processingCount})` : `Remove All Backgrounds (${pendingCount})`}
            </button>

            {doneCount > 0 && (
              <button
                onClick={downloadAll}
                style={{
                  padding: '0.6rem 1.5rem',
                  backgroundColor: '#16a34a',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                }}
              >
                Download All ({doneCount})
              </button>
            )}

            <button
              onClick={clearAll}
              style={{
                padding: '0.6rem 1.5rem',
                backgroundColor: '#dc2626',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.95rem',
              }}
            >
              Clear All
            </button>

            <span style={{ alignSelf: 'center', color: '#666', fontSize: '0.9rem' }}>
              {images.length}/10 images | {doneCount} processed
            </span>
          </div>
        )}

        {/* Image Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(500px, 1fr))', gap: '1.5rem' }}>
          {images.map(img => (
            <div
              key={img.id}
              style={{
                border: '1px solid #e0e0e0',
                borderRadius: '12px',
                overflow: 'hidden',
                backgroundColor: '#fff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              }}
            >
              {/* Image Name & Actions */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem 1rem',
                borderBottom: '1px solid #f0f0f0',
                backgroundColor: '#fafafa',
              }}>
                <span style={{
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  color: '#333',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '250px',
                }}>
                  {img.file.name}
                </span>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {img.status === 'pending' && (
                    <button
                      onClick={() => processImage(img)}
                      style={{
                        padding: '0.3rem 0.75rem',
                        backgroundColor: '#0c2340',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                      }}
                    >
                      Process
                    </button>
                  )}
                  {img.status === 'processing' && (
                    <span style={{ color: '#f59e0b', fontSize: '0.85rem', fontWeight: 500 }}>
                      ⏳ Processing...
                    </span>
                  )}
                  {img.status === 'done' && img.processedPreview && (
                    <button
                      onClick={() => downloadImage(img.processedPreview!, img.file.name)}
                      style={{
                        padding: '0.3rem 0.75rem',
                        backgroundColor: '#16a34a',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                      }}
                    >
                      Download
                    </button>
                  )}
                  {img.status === 'error' && (
                    <button
                      onClick={() => processImage(img)}
                      style={{
                        padding: '0.3rem 0.75rem',
                        backgroundColor: '#f59e0b',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                      }}
                    >
                      Retry
                    </button>
                  )}
                  <button
                    onClick={() => removeImage(img.id)}
                    style={{
                      padding: '0.3rem 0.5rem',
                      backgroundColor: 'transparent',
                      color: '#999',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      lineHeight: 1,
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Side-by-side Preview */}
              <div style={{ display: 'flex', minHeight: '200px' }}>
                {/* Original */}
                <div style={{ flex: 1, padding: '0.75rem', borderRight: '1px solid #f0f0f0' }}>
                  <p style={{ fontSize: '0.75rem', color: '#999', marginBottom: '0.5rem', textAlign: 'center', fontWeight: 600 }}>
                    Original
                  </p>
                  <div style={{ position: 'relative', width: '100%', height: '180px' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.originalPreview}
                      alt="Original"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        borderRadius: '6px',
                      }}
                    />
                  </div>
                </div>

                {/* Processed */}
                <div style={{ flex: 1, padding: '0.75rem' }}>
                  <p style={{ fontSize: '0.75rem', color: '#999', marginBottom: '0.5rem', textAlign: 'center', fontWeight: 600 }}>
                    Processed
                  </p>
                  <div style={{
                    position: 'relative',
                    width: '100%',
                    height: '180px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '6px',
                    background: img.processedPreview
                      ? 'repeating-conic-gradient(#e8e8e8 0% 25%, #fff 0% 50%) 50% / 16px 16px'
                      : '#f9f9f9',
                  }}>
                    {img.status === 'processing' && (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          border: '3px solid #e0e0e0',
                          borderTopColor: '#0c2340',
                          borderRadius: '50%',
                          animation: 'spin 0.8s linear infinite',
                          margin: '0 auto 0.5rem',
                        }} />
                        <span style={{ fontSize: '0.8rem', color: '#888' }}>Removing background...</span>
                      </div>
                    )}
                    {img.status === 'pending' && (
                      <span style={{ color: '#ccc', fontSize: '0.85rem' }}>Waiting...</span>
                    )}
                    {img.status === 'error' && (
                      <span style={{ color: '#dc2626', fontSize: '0.85rem' }}>❌ {img.error || 'Error'}</span>
                    )}
                    {img.status === 'done' && img.processedPreview && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={img.processedPreview}
                        alt="Processed"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          borderRadius: '6px',
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
