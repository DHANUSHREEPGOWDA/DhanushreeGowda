/**
 * Cinematic Scroll-Driven Frame Animation Engine & Interactivity
 * Optimized for Dhanushree P Gowda Portfolio with Ultra-Fluid Motion & High-DPI Canvas
 */

(function () {
  'use strict';

  // Constants & Config
  const TOTAL_FRAMES = 300;
  const LERP_FACTOR = 0.085; // Butter-smooth damping factor
  const CONCURRENCY_LIMIT = 12; // Parallel image loading threads

  // DOM Elements
  const canvas = document.getElementById('animation-canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const canvasScrim = document.getElementById('canvas-scrim');
  const preloader = document.getElementById('preloader');
  const loaderPercent = document.getElementById('loader-percent');
  const progressBar = document.getElementById('progress-bar');
  const loaderStatus = document.getElementById('loader-status');
  const scrollCue = document.getElementById('scroll-cue');
  const currentFrameText = document.getElementById('current-frame-text');
  const heroSection = document.getElementById('hero');
  const heroTrack = document.getElementById('hero-track');
  const heroLeft = document.getElementById('hero-left');
  const heroRight = document.getElementById('hero-right');
  const heroBgText = document.getElementById('hero-bg-text');
  const heroModelLayer = document.getElementById('hero-model-layer');

  // Animation State
  const images = new Array(TOTAL_FRAMES + 1);
  let loadedCount = 0;
  let targetFrame = 1;
  let smoothedFrame = 1;
  let lastDrawnFrame = -1;
  let dpr = 1;
  let canvasWidth = 0;
  let canvasHeight = 0;

  // Format frame image file path
  function getFramePath(index) {
    const padded = String(index).padStart(6, '0');
    return `frames/frame_${padded}.jpg`;
  }

  // Setup Canvas Dimensions with High-DPI Retina Support
  function resizeCanvas() {
    dpr = window.devicePixelRatio || 1;
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;

    canvas.width = Math.floor(canvasWidth * dpr);
    canvas.height = Math.floor(canvasHeight * dpr);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Redraw currently active frame
    if (images[lastDrawnFrame] && images[lastDrawnFrame].complete) {
      drawFrame(images[lastDrawnFrame]);
    }
  }

  // Draw image with smart 'cover' aspect ratio logic
  function drawFrame(img) {
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const renderW = canvas.width;
    const renderH = canvas.height;
    const imgW = img.naturalWidth;
    const imgH = img.naturalHeight;

    const hRatio = renderW / imgW;
    const vRatio = renderH / imgH;
    const ratio = Math.max(hRatio, vRatio);

    const destW = imgW * ratio;
    const destH = imgH * ratio;
    const destX = (renderW - destW) / 2;
    const destY = (renderH - destH) / 2;

    ctx.drawImage(img, 0, 0, imgW, imgH, destX, destY, destW, destH);
  }

  // Scroll Choreography & Hero Parallax
  function updateScrollChoreography() {
    const scrollY = window.scrollY;
    const trackHeight = heroTrack ? heroTrack.offsetHeight : window.innerHeight * 2.8;

    // 1. Frame Scrubbing Calculation (0 to 1 over hero track)
    const heroProgress = Math.min(Math.max(scrollY / trackHeight, 0), 1);
    targetFrame = 1 + heroProgress * (TOTAL_FRAMES - 1);

    // 2. Hero Content Parallax & Fade
    if (heroSection) {
      if (scrollY >= trackHeight) {
        heroSection.style.opacity = '0';
        heroSection.style.pointerEvents = 'none';
        heroSection.style.visibility = 'hidden';
      } else {
        heroSection.style.visibility = 'visible';
        
        // Start fading hero content when 30% scrolled into track
        const fadeStart = trackHeight * 0.25;
        const fadeEnd = trackHeight * 0.85;
        let fadeProgress = 0;
        if (scrollY > fadeStart) {
          fadeProgress = Math.min((scrollY - fadeStart) / (fadeEnd - fadeStart), 1);
        }

        const heroOpacity = 1 - fadeProgress;
        heroSection.style.opacity = String(heroOpacity);
        heroSection.style.pointerEvents = heroOpacity > 0.2 ? 'auto' : 'none';

        // Parallax horizontal separation
        if (heroLeft) {
          heroLeft.style.transform = `translateX(-${fadeProgress * 80}px)`;
        }
        if (heroRight) {
          heroRight.style.transform = `translateX(${fadeProgress * 80}px)`;
        }
        if (heroBgText) {
          heroBgText.style.transform = `translateX(-50%) translateY(-${fadeProgress * 60}px) scale(${1 + fadeProgress * 0.05})`;
        }
        if (heroModelLayer) {
          // Gently dissolve the frame 1 cutout as dynamic video scrubbing begins
          const modelFade = Math.min(scrollY / (trackHeight * 0.12), 1);
          heroModelLayer.style.opacity = String(1 - modelFade);
        }
      }
    }

    // 3. Background Scrim for Content Readability below Hero
    if (canvasScrim) {
      if (scrollY > trackHeight * 0.6) {
        const scrimProgress = Math.min((scrollY - trackHeight * 0.6) / (window.innerHeight * 0.6), 0.84);
        canvasScrim.style.opacity = String(scrimProgress);
      } else {
        canvasScrim.style.opacity = '0';
      }
    }

    // 4. Scroll Cue Indicator Fade
    if (scrollCue) {
      if (scrollY > 30) {
        scrollCue.classList.add('hidden');
      } else {
        scrollCue.classList.remove('hidden');
      }
    }
  }

  // Continuous Render Loop with RAF
  function renderLoop() {
    // Smooth Lerp for video scrub
    smoothedFrame += (targetFrame - smoothedFrame) * LERP_FACTOR;
    const clampedFrame = Math.min(Math.max(Math.round(smoothedFrame), 1), TOTAL_FRAMES);

    if (clampedFrame !== lastDrawnFrame) {
      const img = images[clampedFrame];
      if (img && img.complete) {
        drawFrame(img);
        lastDrawnFrame = clampedFrame;
      }
      if (currentFrameText) {
        currentFrameText.textContent = String(clampedFrame).padStart(3, '0');
      }
    }

    requestAnimationFrame(renderLoop);
  }

  // Preloader Logic
  function loadSingleImage(index) {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = getFramePath(index);

      img.onload = () => {
        images[index] = img;
        loadedCount++;
        onProgressUpdate();
        resolve(img);
      };

      img.onerror = () => {
        loadedCount++;
        onProgressUpdate();
        resolve(null);
      };
    });
  }

  function onProgressUpdate() {
    const percent = Math.floor((loadedCount / TOTAL_FRAMES) * 100);
    if (loaderPercent) loaderPercent.textContent = `${percent}%`;
    if (progressBar) progressBar.style.width = `${percent}%`;
    if (loaderStatus) loaderStatus.textContent = `Buffering frames (${loadedCount}/${TOTAL_FRAMES})...`;

    // Render frame 1 immediately as soon as ready
    if (loadedCount === 1 && images[1] && images[1].complete && lastDrawnFrame === -1) {
      drawFrame(images[1]);
      lastDrawnFrame = 1;
    }
  }

  // Concurrent Frame Preloader
  async function preloadFrames() {
    // Step 1: Render Frame 1 ASAP
    await loadSingleImage(1);
    resizeCanvas();
    if (images[1]) drawFrame(images[1]);

    // Step 2: Parallel Batch Loading for Remaining Frames
    const remainingIndices = [];
    for (let i = 2; i <= TOTAL_FRAMES; i++) {
      remainingIndices.push(i);
    }

    let currentIndex = 0;
    async function worker() {
      while (currentIndex < remainingIndices.length) {
        const frameIdx = remainingIndices[currentIndex++];
        await loadSingleImage(frameIdx);
      }
    }

    const workers = [];
    for (let i = 0; i < CONCURRENCY_LIMIT; i++) {
      workers.push(worker());
    }

    await Promise.all(workers);

    // Fade out preloader smoothly
    setTimeout(() => {
      if (preloader) {
        preloader.classList.add('fade-out');
      }
    }, 250);
  }

  // Scroll Reveal Observer
  function setupScrollReveals() {
    const revealElements = document.querySelectorAll('.reveal-on-scroll');
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -40px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
        }
      });
    }, observerOptions);

    revealElements.forEach((el) => observer.observe(el));
  }

  // Copy Email & Phone Helper
  function setupInteractiveActions() {
    const emailCard = document.getElementById('email-card');
    if (emailCard) {
      emailCard.addEventListener('click', (e) => {
        e.preventDefault();
        const email = 'dhanushreegowda30@gmail.com';
        if (navigator.clipboard) {
          navigator.clipboard.writeText(email).then(() => {
            const actionText = emailCard.querySelector('.card-action');
            if (actionText) {
              const original = actionText.textContent;
              actionText.textContent = 'Copied!';
              actionText.style.color = '#10b981';
              setTimeout(() => {
                actionText.textContent = original;
                actionText.style.color = '';
              }, 2000);
            }
          });
        }
      });
    }
  }

  // App Initialization
  function init() {
    resizeCanvas();
    updateScrollChoreography();

    window.addEventListener('resize', () => {
      resizeCanvas();
      updateScrollChoreography();
    }, { passive: true });

    window.addEventListener('scroll', updateScrollChoreography, { passive: true });

    setupScrollReveals();
    setupInteractiveActions();
    preloadFrames();
    requestAnimationFrame(renderLoop);
  }

  // Start on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
