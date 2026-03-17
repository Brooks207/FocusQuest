import React from "react";
import { useNavigate } from "react-router-dom";
import { useTypewriter } from "../hooks/useTypingAnimation"; // adjust path if needed

const Home: React.FC = () => {
  const navigate = useNavigate();

  const words = ["FocusQuest", "FocusQuest", "FocusQuest"];
  const { text, showCaret, index } = useTypewriter(words, {
    typingSpeed: 100,
    deletingSpeed: 20,
    pauseAfterType: 3000,
    pauseAfterDelete: 350,
    loop: true,
    delete: true,
  });

  // Cycle fonts: pixel → modern → fantasy
  const fontCycle = ["font-pixel", "font-modern", "font-fantasy"];
  const fontClass = fontCycle[index % fontCycle.length];

  return (
    <section className="absolute inset-0 flex flex-col justify-center items-center text-center bg-gradient-to-br from-violet-600 via-purple-800 to-indigo-900 overflow-hidden">
      {/* Ambient glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-400/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative flex flex-col justify-center items-center gap-y-8 max-w-2xl px-6">
        <h1
          className={`text-6xl text-white font-extrabold leading-tight drop-shadow-lg ${fontClass}
                      transition-all duration-300 flex justify-center items-center
                      h-[1.3em] overflow-hidden`}
        >
          <span className="inline-block">{text}</span>
          {showCaret && (
            <span
              aria-hidden="true"
              className="inline-block w-[2px] bg-white ml-1 animate-pulse"
              style={{ height: "1em" }}
            />
          )}
        </h1>

        <p className="text-lg text-white/75 max-w-md">
          Turn your to-do list into an epic adventure. Complete tasks, level up, and conquer your goals — one quest at a time.
        </p>

        <button
          onClick={() => navigate('/daily')}
          className="glass-btn text-white px-8 py-4 rounded-full text-xl font-semibold shadow-xl cursor-pointer"
        >
          Explore the world of Gamified Todos! →
        </button>

        <button
          onClick={() => navigate('/about')}
          className="glass-btn text-white/80 px-8 py-4 rounded-full text-lg font-medium shadow-lg cursor-pointer"
        >
          Learn more about us! →
        </button>
      </div>
    </section>
  );
};

export default Home;
