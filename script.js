/* script.js - navigation, double-tap, animations, audio and replay logic */

(() => {
  // Section list in order
  const sections = [...document.querySelectorAll('main#card section')];
  let current = 0;
  const total = sections.length;

  // Utility: show a section index, hide others
  function showIndex(i, opts = {}) {
    if (i < 0) i = 0;
    if (i >= total) i = total - 1;
    sections.forEach((sec, idx) => {
      if (idx === i) sec.classList.remove('hidden');
      else sec.classList.add('hidden');
    });
    current = i;
    // if moving to last page, focus for keyboard
    sections[current].focus?.();
  }

  // Next page
  function nextPage() {
    if (current < total - 1) showIndex(current + 1);
  }
  // Back to first page (used on Replay)
  function resetAll() {
    // hide all except 0
    showIndex(0);
    // reset envelope state
    document.getElementById('envelope')?.classList.remove('open');
    // reset audio
    document.querySelectorAll('audio').forEach(a => { a.pause(); a.currentTime = 0; a.classList.remove('playing'); });
    // clear selected state on artworks and tracks
    document.querySelectorAll('.art-card.selected').forEach(n => n.classList.remove('selected'));
    document.querySelectorAll('.track.playing').forEach(t => t.classList.remove('playing'));
    // remove flipped classes
    document.querySelectorAll('.flip-card').forEach(c => c.classList.remove('flipped'));
  }

  // Double-tap detection (works for touch and click)
  const doubleTapDelay = 300;
  let lastTap = 0;
  function bindDoubleTap(el, handler) {
    el.addEventListener('touchend', (ev) => {
      const now = Date.now();
      if (now - lastTap <= doubleTapDelay) {
        handler(ev);
        lastTap = 0;
      } else {
        lastTap = now;
      }
    });

    el.addEventListener('dblclick', (ev) => handler(ev)); // desktop fallback
  }

  // Initialize: show page 1
  showIndex(0);

  /* ---------- Page 1 interactions ---------- */
  const openHeartBtn = document.getElementById('open-heart');
  openHeartBtn.addEventListener('click', () => {
    // simple fade: go to next page
    nextPage();
  });

  // Double-tap whole page to next
  bindDoubleTap(document.getElementById('page-1'), () => nextPage());

  /* ---------- Particles (simple lightweight) ---------- */
  (function particles() {
    const canvas = document.getElementById('particles');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let dpr = window.devicePixelRatio || 1;
    function resize() {
      dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.clientWidth * dpr || innerWidth * dpr;
      canvas.height = canvas.clientHeight * dpr || innerHeight * dpr;
      ctx.scale(dpr, dpr);
    }
    resize();
    window.addEventListener('resize', resize);

    const hearts = [];
    function spawn() {
      hearts.push({
        x: Math.random() * canvas.clientWidth,
        y: canvas.clientHeight + 10,
        r: 6 + Math.random()*10,
        speed: 0.6 + Math.random()*1.4,
        sway: (Math.random()-0.5)*1.5,
        alpha: 0.6 + Math.random()*0.4
      });
    }
    for(let i=0;i<10;i++) spawn();

    function drawHeart(x,y,r,alpha){
      ctx.save();
      ctx.translate(x,y);
      ctx.beginPath();
      ctx.moveTo(0, -r/2);
      ctx.bezierCurveTo(r/2, -r*1.2, r*1.6, -r*0.15, 0, r);
      ctx.bezierCurveTo(-r*1.6, -r*0.15, -r/2, -r*1.2, 0, -r/2);
      ctx.fillStyle = `rgba(217,34,135,${alpha})`;
      ctx.fill();
      ctx.restore();
    }

    function tick(){
      ctx.clearRect(0,0,canvas.width/dpr, canvas.height/dpr);
      for (let i=0;i<hearts.length;i++){
        const h = hearts[i];
        h.y -= h.speed;
        h.x += Math.sin(h.y * 0.02) * h.sway;
        drawHeart(h.x, h.y, h.r, h.alpha);
        if (h.y < -20) {
          hearts.splice(i,1);
          spawn();
        }
      }
      requestAnimationFrame(tick);
    }
    tick();
  })();

  /* ---------- Page 2: envelope open & auto redirect ---------- */
  const envelope = document.getElementById('envelope');
  const page2 = document.getElementById('page-2');

  function openEnvelope() {
    if (!envelope) return;
    envelope.classList.add('open');
    // After the letter sliding animation is expected to finish, auto go to next
    setTimeout(() => {
      // Move to next page
      nextPage();
    }, 1300); // tuned to CSS transitions
  }

  // Tap envelope to open
  envelope?.addEventListener('click', openEnvelope);
  envelope?.addEventListener('touchend', (e) => { e.preventDefault(); openEnvelope(); });

  // Double-tap to skip animation and go next
  bindDoubleTap(page2, () => nextPage());

  /* ---------- Page 3: continue button & double tap ---------- */
  document.getElementById('continue-from-letter')?.addEventListener('click', () => nextPage());
  bindDoubleTap(document.getElementById('page-3'), () => nextPage());

  /* ---------- Page 4: artwork selection ---------- */
  const artworkList = document.getElementById('artwork-list');
  let selectedArtwork = null;

  if (artworkList) {
    artworkList.addEventListener('click', (e) => {
      const card = e.target.closest('.art-card');
      if (!card) return;
      document.querySelectorAll('.art-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedArtwork = parseInt(card.dataset.track, 10);
      // optionally mark or pre-select track on next page
    });
  }

  document.getElementById('continue-to-songs')?.addEventListener('click', () => nextPage());
  bindDoubleTap(document.getElementById('page-4'), () => nextPage());

  /* ---------- Page 5: songs playback ---------- */
  const playButtons = document.querySelectorAll('.play-btn');
  let currentAudio = null;
  function stopAllAudio() {
    document.querySelectorAll('audio').forEach(a => {
      a.pause();
      a.currentTime = 0;
      a.classList.remove('playing');
    });
    document.querySelectorAll('.track').forEach(t => t.classList.remove('playing'));
  }

  playButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const trackEl = e.target.closest('.track');
      const idx = trackEl ? parseInt(trackEl.dataset.index, 10) : null;
      if (idx === null) return;
      const audio = document.getElementById('audio-' + idx);
      if (!audio) return;

      // If clicked the same playing audio -> pause
      if (!audio.paused) {
        audio.pause();
        audio.classList.remove('playing');
        trackEl.classList.remove('playing');
        e.target.textContent = 'Play';
        return;
      }

      // stop all others
      stopAllAudio();

      // play selected
      audio.play().catch(()=>{ /* autoplay block might occur on some browsers */ });
      audio.classList.add('playing');
      trackEl.classList.add('playing');

      // update button text and now playing indicator
      document.querySelectorAll('.track .play-btn').forEach(b => b.textContent = 'Play');
      e.target.textContent = 'Pause';

      // set now playing text
      const spans = trackEl.querySelectorAll('.now-playing');
      spans.forEach(s => s.textContent = 'Now Playing... ♪');

      currentAudio = audio;

      audio.onended = () => {
        trackEl.classList.remove('playing');
        e.target.textContent = 'Play';
        spans.forEach(s => s.textContent = '');
      };
    });
  });

  // Next button from player
  document.getElementById('continue-from-player')?.addEventListener('click', () => {
    // ensure audio paused
    stopAllAudio();
    nextPage();
  });
  bindDoubleTap(document.getElementById('page-5'), () => {
    // pause audio when skipping
    stopAllAudio();
    nextPage();
  });

  /* ---------- Page 6: flip cards and replay ---------- */
  document.querySelectorAll('.flip-card').forEach(card => {
    card.addEventListener('click', () => {
      // toggle flip
      card.classList.toggle('flipped');
      // allow natural repeating by removing flipped after a timeout (so it can be tapped again)
      setTimeout(() => {
        card.classList.remove('flipped');
      }, 2200);
    });
    // also allow double-tap toggling (if user double-taps inadvertently)
    bindDoubleTap(card, () => {
      card.classList.toggle('flipped');
      setTimeout(() => card.classList.remove('flipped'), 2200);
    });
  });

  // Replay button: resets everything and goes to page 1
  const replayBtn = document.getElementById('replay');
  replayBtn?.addEventListener('click', () => {
    // small heart burst effect (CSS-light)
    replayBtn.animate([
      { transform: 'scale(1)' },
      { transform: 'scale(1.14)' },
      { transform: 'scale(1)' },
    ], { duration: 360, easing: 'ease-out' });

    // Reset everything
    resetAll();
  });

  // Double tap on last page does not auto-next (spec defined), but can also replay optionally:
  // We'll interpret the spec: "Double-Tap on every page -> go next" except final special unless mentioned.
  // So on final, do nothing special for double-tap.

  /* ---------- Global double-tap: allow on all pages except last where necessary ---------- */
  sections.forEach((sec, idx) => {
    if (sec.id === 'page-6') return; // skip last as per rule
    bindDoubleTap(sec, () => {
      // Prevent envelope doubletap from immediately going next while animating
      if (sec.id === 'page-2') {
        // if envelope already opened, allow next
        if (envelope && envelope.classList.contains('open')) nextPage();
        else openEnvelope();
      } else {
        nextPage();
      }
    });
  });

  /* ---------- Accessibility & Keyboard fallback ---------- */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'Enter') nextPage();
    if (e.key === 'Escape') resetAll();
  });

  /* ---------- Ensure mobile-friendly touch targets ---------- */
  document.querySelectorAll('button, .art-card, .flip-card, .play-btn').forEach(el => {
    el.style.touchAction = 'manipulation';
  });

  /* ---------- Clean up on visibility change (pause playing audio) ---------- */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) document.querySelectorAll('audio').forEach(a => a.pause());
  });

  /* ---------- End of init ---------- */
})();
