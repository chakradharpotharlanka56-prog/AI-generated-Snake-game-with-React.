import React, { useState, useEffect, useRef, useCallback } from 'react';

const GRID_SIZE = 20;
const CELL_SIZE = 20;
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE;
const CYAN = '#00FFFF';
const MAGENTA = '#FF00FF';

const TRACKS = [
  { id: 1, title: "SECTOR_01_NOISE", artist: "UNKNOWN_ENTITY", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
  { id: 2, title: "CORRUPTED_DATA_STREAM", artist: "SYS_ADMIN", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
  { id: 3, title: "VOID_RESONANCE", artist: "NULL_POINTER", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" }
];

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // UI State
  const [uiScore, setUiScore] = useState(0);
  const [uiState, setUiState] = useState('START'); // START, PLAYING, GAMEOVER
  const [currentTrackIdx, setCurrentTrackIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Game State Refs (Mutable for loop)
  const snake = useRef([{x: 10, y: 10}, {x: 10, y: 11}, {x: 10, y: 12}]);
  const dir = useRef({x: 0, y: -1});
  const nextDir = useRef({x: 0, y: -1});
  const food = useRef({x: 5, y: 5});
  const score = useRef(0);
  const state = useRef('START');
  const particles = useRef<any[]>([]);
  const shake = useRef(0);
  const glitchFrames = useRef(0);

  // Sync UI state with refs
  const setGameState = (newState: string) => {
    state.current = newState;
    setUiState(newState);
  };

  const spawnFood = useCallback(() => {
    let newFood;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      };
      const onSnake = snake.current.some(s => s.x === newFood.x && s.y === newFood.y);
      if (!onSnake) break;
    }
    food.current = newFood;
  }, []);

  const spawnParticles = (x: number, y: number, color: string) => {
    for (let i = 0; i < 15; i++) {
      particles.current.push({
        x, y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 1.0,
        size: Math.random() * 4 + 2,
        color
      });
    }
  };

  const triggerGameOver = () => {
    setGameState('GAMEOVER');
    glitchFrames.current = 30; // 30 frames of heavy glitch
    shake.current = 500; // 500ms shake
    spawnParticles(snake.current[0].x * CELL_SIZE, snake.current[0].y * CELL_SIZE, MAGENTA);
  };

  const startGame = () => {
    snake.current = [{x: 10, y: 10}, {x: 10, y: 11}, {x: 10, y: 12}];
    dir.current = {x: 0, y: -1};
    nextDir.current = {x: 0, y: -1};
    score.current = 0;
    setUiScore(0);
    particles.current = [];
    spawnFood();
    setGameState('PLAYING');
    
    if (!isPlaying && audioRef.current) {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  // Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let lastTime = performance.now();
    let moveAccumulator = 0;
    const MOVE_INTERVAL = 80; // Faster, more aggressive

    const loop = (time: number) => {
      const dt = time - lastTime;
      lastTime = time;

      // Update Logic
      if (state.current === 'PLAYING') {
        moveAccumulator += dt;
        if (moveAccumulator >= MOVE_INTERVAL) {
          dir.current = nextDir.current;
          const head = { ...snake.current[0] };
          head.x += dir.current.x;
          head.y += dir.current.y;

          // Wall collision
          if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
            triggerGameOver();
          } 
          // Self collision
          else if (snake.current.some(s => s.x === head.x && s.y === head.y)) {
            triggerGameOver();
          } 
          else {
            snake.current.unshift(head);
            // Food collision
            if (head.x === food.current.x && head.y === food.current.y) {
              score.current += 16;
              setUiScore(score.current);
              spawnParticles(head.x * CELL_SIZE + CELL_SIZE/2, head.y * CELL_SIZE + CELL_SIZE/2, CYAN);
              shake.current = 150;
              spawnFood();
            } else {
              snake.current.pop();
            }
          }
          moveAccumulator = 0;
        }
      }

      // Update Particles
      for (let i = particles.current.length - 1; i >= 0; i--) {
        const p = particles.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= dt * 0.002;
        if (p.life <= 0) particles.current.splice(i, 1);
      }

      if (shake.current > 0) shake.current -= dt;
      if (glitchFrames.current > 0) glitchFrames.current--;

      // Draw
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      ctx.save();
      if (shake.current > 0) {
        const magnitude = (shake.current / 500) * 10;
        const dx = (Math.random() - 0.5) * magnitude;
        const dy = (Math.random() - 0.5) * magnitude;
        ctx.translate(dx, dy);
      }

      // Draw Grid (Subtle)
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 1;
      for (let i = 0; i <= CANVAS_SIZE; i += CELL_SIZE) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, CANVAS_SIZE); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(CANVAS_SIZE, i); ctx.stroke();
      }

      // Draw Food
      ctx.fillStyle = MAGENTA;
      ctx.shadowColor = MAGENTA;
      ctx.shadowBlur = 15;
      // Glitchy food size
      const fSize = CELL_SIZE - 4 + (Math.random() > 0.8 ? 2 : 0);
      ctx.fillRect(food.current.x * CELL_SIZE + (CELL_SIZE - fSize)/2, food.current.y * CELL_SIZE + (CELL_SIZE - fSize)/2, fSize, fSize);

      // Draw Snake
      ctx.shadowBlur = 10;
      snake.current.forEach((segment, i) => {
        ctx.fillStyle = i === 0 ? '#FFFFFF' : CYAN;
        ctx.shadowColor = i === 0 ? '#FFFFFF' : CYAN;
        
        // Glitchy body rendering occasionally
        let sSize = CELL_SIZE - 2;
        let offset = 1;
        if (Math.random() < 0.05) {
          ctx.fillStyle = MAGENTA;
          offset = Math.random() * 4 - 2;
        }
        
        ctx.fillRect(segment.x * CELL_SIZE + offset, segment.y * CELL_SIZE + offset, sSize, sSize);
      });

      // Draw Particles
      ctx.shadowBlur = 0;
      particles.current.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillRect(p.x, p.y, p.size, p.size);
      });
      ctx.globalAlpha = 1.0;

      // Screen Glitch Overlay
      if (glitchFrames.current > 0 || Math.random() < 0.03) {
        ctx.fillStyle = Math.random() > 0.5 ? CYAN : MAGENTA;
        ctx.globalAlpha = 0.2;
        for(let i=0; i<5; i++) {
          ctx.fillRect(Math.random() * CANVAS_SIZE, Math.random() * CANVAS_SIZE, Math.random() * CANVAS_SIZE, Math.random() * 20);
        }
        ctx.globalAlpha = 1.0;
      }

      ctx.restore();

      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationId);
  }, [spawnFood]);

  // Input Handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }

      if (state.current === 'START' || state.current === 'GAMEOVER') {
        if (e.key === 'Enter' || e.key === ' ') startGame();
        return;
      }

      const currentDir = dir.current;
      switch (e.key) {
        case 'ArrowUp': case 'w': if (currentDir.y !== 1) nextDir.current = {x: 0, y: -1}; break;
        case 'ArrowDown': case 's': if (currentDir.y !== -1) nextDir.current = {x: 0, y: 1}; break;
        case 'ArrowLeft': case 'a': if (currentDir.x !== 1) nextDir.current = {x: -1, y: 0}; break;
        case 'ArrowRight': case 'd': if (currentDir.x !== -1) nextDir.current = {x: 1, y: 0}; break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Audio Controls
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
    setIsPlaying(!isPlaying);
  };

  const changeTrack = (offset: number) => {
    setCurrentTrackIdx(prev => (prev + offset + TRACKS.length) % TRACKS.length);
    setIsPlaying(true);
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.src = TRACKS[currentTrackIdx].url;
      if (isPlaying) audioRef.current.play().catch(() => {});
    }
  }, [currentTrackIdx]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative font-mono">
      <div className="scanlines" />
      <div className="crt-flicker" />

      <header className="mb-8 text-center z-10">
        <h1 className="text-5xl md:text-6xl font-bold mb-2 glitch-text" data-text="SYS.SNAKE_PROTOCOL">
          SYS.SNAKE_PROTOCOL
        </h1>
        <p className="text-xl text-[#FF00FF] tracking-widest">AUDIO_STIMULUS_ACTIVE</p>
      </header>

      <div className="flex flex-col lg:flex-row gap-8 w-full max-w-6xl justify-center items-start z-10">
        
        {/* Game Section */}
        <div className="flex flex-col items-center w-full lg:w-auto">
          <div className="flex justify-between w-full mb-2 px-2 text-xl">
            <div className="flex flex-col">
              <span className="text-[#FF00FF]">DATA_EXTRACTED</span>
              <span className="text-3xl">0x{uiScore.toString(16).toUpperCase().padStart(4, '0')}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[#00FFFF]">STATUS</span>
              <span className="text-3xl">{uiState}</span>
            </div>
          </div>

          <div className="relative brutal-border bg-[#050505] p-1">
            <canvas 
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="w-full max-w-[500px] aspect-square block"
              style={{ imageRendering: 'pixelated' }}
            />

            {uiState !== 'PLAYING' && (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-6 text-center">
                <h2 className="text-4xl text-[#FF00FF] mb-6 glitch-text" data-text={uiState === 'START' ? 'AWAITING_INPUT' : 'FATAL_EXCEPTION'}>
                  {uiState === 'START' ? 'AWAITING_INPUT' : 'FATAL_EXCEPTION'}
                </h2>
                <button 
                  onClick={startGame}
                  className="brutal-border bg-black text-[#00FFFF] px-8 py-4 text-2xl hover:bg-[#00FFFF] hover:text-black transition-colors"
                >
                  [ EXECUTE ]
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Audio Panel */}
        <div className="w-full lg:w-[400px] brutal-border-magenta bg-[#050505] p-6 flex flex-col gap-6">
          <div className="border-b-2 border-[#FF00FF] pb-2 mb-2">
            <h3 className="text-2xl text-[#00FFFF] glitch-text" data-text="AUDIO_CONTROL_UNIT">AUDIO_CONTROL_UNIT</h3>
          </div>

          <div className="bg-[#111] p-4 brutal-border">
            <p className="text-[#FF00FF] mb-1">CURRENT_STREAM:</p>
            <p className="text-2xl truncate text-white">{TRACKS[currentTrackIdx].title}</p>
            <p className="text-sm text-[#00FFFF] mt-1">SRC: {TRACKS[currentTrackIdx].artist}</p>
            
            {/* Visualizer */}
            <div className="flex gap-1 h-12 mt-4 items-end">
              {[...Array(12)].map((_, i) => (
                <div 
                  key={i} 
                  className={`flex-1 bg-[#00FFFF] ${isPlaying ? 'v-bar-anim' : ''}`}
                  style={{
                    height: isPlaying ? '10%' : '10%',
                    animationDelay: `${Math.random()}s`,
                    animationDuration: `${0.3 + Math.random() * 0.5}s`,
                    opacity: Math.random() > 0.2 ? 1 : 0.5
                  }}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-between gap-4">
            <button onClick={() => changeTrack(-1)} className="flex-1 brutal-border bg-black text-[#FF00FF] py-3 text-xl hover:bg-[#FF00FF] hover:text-black">
              [ &lt;&lt; ]
            </button>
            <button onClick={togglePlay} className="flex-2 brutal-border bg-black text-[#00FFFF] py-3 text-xl hover:bg-[#00FFFF] hover:text-black px-8">
              {isPlaying ? '[ PAUSE ]' : '[ PLAY ]'}
            </button>
            <button onClick={() => changeTrack(1)} className="flex-1 brutal-border bg-black text-[#FF00FF] py-3 text-xl hover:bg-[#FF00FF] hover:text-black">
              [ &gt;&gt; ]
            </button>
          </div>

          <div className="mt-4 text-sm text-[#00FFFF] opacity-70">
            <p>&gt; INPUT_DETECTED: KEYBOARD</p>
            <p>&gt; VECTORS: W,A,S,D / ARROWS</p>
            <p>&gt; ACTION: SPACEBAR</p>
          </div>
        </div>

      </div>

      <audio ref={audioRef} onEnded={() => changeTrack(1)} />
    </div>
  );
}
