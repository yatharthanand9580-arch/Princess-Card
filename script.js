// script.js
// Navigation + double-tap + animations + audio + replay logic
(function(){
  // --- Helpers & State ---
  const sections = Array.from(document.querySelectorAll('section.page'));
  let current = 0;
  const total = sections.length;
  const audio = document.getElementById('bgAudio');
  const state = {
    selectedArtIndex: null,
    playingTrackIndex: null
  };

  function showSection(index, transition='fade'){
    // bounds
    if(index < 0) index = 0;
    if(index >= total) index = total - 1;

    // hide all, show selected
    sections.forEach((s, i) => {
      if(i === index) {
        s.classList.remove('hidden');
        s.style.opacity = '1';
        s.style.transform = 'translateY(0)';
      } else {
        s.classList.add('hidden');
      }
    });
    current = index;
  }

  // start at page 1
  showSection(0);

  // --- Double-tap detection (global) ---
  // Works for touch and mouse. If double-tap occurs, go next.
  (function setupDoubleTap(){
    let lastTap = 0;
    const maxDelay = 300; // ms
    function handleTap(ev){
      const now = Date.now();
      const dt = now - lastTap;
      lastTap = now;
      if(dt < maxDelay){
        // double-tap detected
        goNext();
        ev.preventDefault();
      }
    }
    // touchend for mobile, dblclick for desktops
    document.addEventListener('touchend', handleTap, {passive:false});
    document.addEventListener('dblclick', handleTap);
  })();

  // --- Navigation helpers ---
  function goNext(){
    if(current < total - 1){
      showSection(current + 1);
      // handle side effects for entering certain pages
      onEnterPage(current);
    }
  }
  function goTo(index){
    showSection(index);
    onEnterPage(current);
  }
  function goToFirst(){
    resetAll();
    goTo(0);
  }

  // --- Page-specific behaviors ---
  // PAGE1
  document.getElementById('openHeartBtn').addEventListener('click', () => goNext());
  // Also allow double-tap anywhere (already global)

  // PAGE2 envelope
  const envelope = document.getElementById('envelope');
  const flap = document.getElementById('flap');
  const letter = document.getElementById('letter');
  let envelopeOpened = false;
  envelope.addEventListener('click', () => {
    if(!envelopeOpened){
      envelope.classList.add('open');
      envelopeOpened = true;
      // after animation, auto-redirect after a short delay
      setTimeout(()=> {
        goNext();
      }, 1100);
    }
  });

  // allow double-tap to skip (global double-tap will call goNext already)

  // PAGE3
  document.getElementById('continueFromLetter').addEventListener('click', ()=> goNext());

  // PAGE4 artwork selection
  const artCards = document.getElementById('artCards');
  artCards.addEventListener('click', (e) => {
    const card = e.target.closest('.art-card');
    if(!card) return;
    const idx = Number(card.dataset.track);
    selectArtwork(idx);
  });
  document.getElementById('toSongPage').addEventListener('click', ()=> goNext());
  function selectArtwork(idx){
    const cards = Array.from(document.querySelectorAll('.art-card'));
    cards.forEach((c,i)=> c.classList.toggle('selected', i === idx));
    state.selectedArtIndex = idx;
    document.getElementById('artCaption').classList.remove('hidden');
  }

  // PAGE5: tracks
  const trackElems = Array.from(document.querySelectorAll('.track'));
  trackElems.forEach((t,i) => {
    t.addEventListener('click', () => {
      const src = t.dataset.src;
      playTrack(i, src, t);
    });
  });

  function playTrack(index, src, trackElement){
    // stop previous
    if(!src) return;
    if(!audio) return;
    audio.pause();
    audio.src = src;
    audio.currentTime = 0;
    audio.play().catch(()=>{ /* autoplay may be blocked; user initiated tap triggers this normally */ });
    state.playingTrackIndex = index;
    // UI updates
    document.querySelectorAll('.track .now').forEach(n => n.textContent = 'Tap to Play');
    const now = trackElement.querySelector('.now');
    now.textContent = 'Playing…';
    document.getElementById('nowPlaying').classList.remove('hidden');
    document.getElementById('nowTitle').textContent = trackElement.querySelector('.track-title').textContent;
  }

  document.getElementById('toSpecialMsg').addEventListener('click', ()=> goNext());

  // PAGE6 flip cards
  const flipCards = Array.from(document.querySelectorAll('.flip-card'));
  flipCards.forEach((card) => {
    card.addEventListener('click', () => {
      card.classList.toggle('flipped');
      // allow natural repeat by removing flipped after a short delay if you prefer it to auto reset
      setTimeout(()=> {
        // keep it flipped — user can tap again to flip back; do nothing here
      }, 900);
    });
  });

  // REPLAY button
  const replayBtn = document.getElementById('replayBtn');
  replayBtn.addEventListener('click', (e) => {
    // heart burst effect
    burstHearts(e.clientX, e.clientY);
    setTimeout(()=> {
      goToFirst();
    }, 220);
  });

  // particles heart burst
  function burstHearts(x,y){
    const count = 12;
    for(let i=0;i<count;i++){
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.width = p.style.height = `${8 + Math.random()*16}px`;
      p.style.left = (x + (Math.random()*80-40)) + 'px';
      p.style.top = (y + (Math.random()*80-40)) + 'px';
      p.style.background = `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.9), transparent), linear-gradient(45deg, #ff9ccf, #ff63a5)`;
      p.style.animationDuration = `${800 + Math.random()*700}ms`;
      p.style.opacity = 1;
      document.getElementById('particles').appendChild(p);
      setTimeout(()=> p.remove(), 1400 + Math.random()*800);
    }
  }

  // reset everything
  function resetAll(){
    // reset envelope
    envelope.classList.remove('open');
    envelopeOpened = false;

    // reset art selection
    document.querySelectorAll('.art-card').forEach(c => c.classList.remove('selected'));
    state.selectedArtIndex = null;
    document.getElementById('artCaption').classList.add('hidden');

    // stop audio
    audio.pause();
    audio.currentTime = 0;
    audio.src = '';

    // reset tracks UI
    document.querySelectorAll('.track .now').forEach(n => n.textContent = 'Tap to Play');
    document.getElementById('nowPlaying').classList.add('hidden');

    // unflip flip-cards
    flipCards.forEach(c => c.classList.remove('flipped'));
  }

  // Called after entering some pages to trigger auto behaviors
  function onEnterPage(index){
    // page indexes based on DOM order:
    // 0 => page1; 1 => page2; 2 => page3; 3 => page4; 4 => page5; 5 => page6
    if(index === 1) {
      // envelope page: if not opened auto animate a small float; if already opened skip
      if(!envelopeOpened){
        // small hint animation pulse
        flap.animate([{transform:'translateY(0)'},{transform:'translateY(-4px)'},{transform:'translateY(0)'}], {duration:900,iterations:2});
      }
    }
    if(index === 4){
      // when entering songs page, if artwork was selected, auto-highlight the corresponding track
      if(state.selectedArtIndex !== null){
        // optional: auto-select corresponding track index
        const idx = state.selectedArtIndex;
        const tElem = trackElems[idx];
        if(tElem){
          // visually indicate (but do not autoplay to respect mobile autoplay rules)
          tElem.classList.add('selected');
          setTimeout(()=> tElem.classList.remove('selected'), 800);
        }
      }
    }
  }

  // create soft particle background for Page 1 look & feel
  (function createBackgroundParticles(){
    const container = document.getElementById('particles');
    const num = 10;
    for(let i=0;i<num;i++){
      const el = document.createElement('div');
      el.className = 'particle';
      el.style.left = Math.random()*100 + 'vw';
      el.style.top = Math.random()*60 + 'vh';
      el.style.width = el.style.height = `${6 + Math.random()*18}px`;
      el.style.background = `radial-gradient(circle at 20% 20%, rgba(255,255,255,0.95), transparent), linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,92,158,0.08))`;
      el.style.animationDuration = `${7000 + Math.random()*8000}ms`;
      el.style.opacity = 0.9;
      container.appendChild(el);
    }
  })();

  // accessibility: keyboard navigation fallback
  document.addEventListener('keyup', (e) => {
    if(e.key === 'ArrowRight' || e.key === 'Enter') goNext();
    if(e.key === 'Home') goToFirst();
  });

  // make sure double tap doesn't also trigger click navigation twice
  // (we already guard in double-tap detection using preventDefault in handler)

  // Prevent overscroll on iOS for a smoother card experience
  document.addEventListener('touchmove', function(e){ e.preventDefault(); }, {passive:false});

  // expose some debugging on window (optional)
  window.princessCard = {
    goNext, goTo, goToFirst, resetAll
  };

})();
