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
    <section className="absolute inset-0 flex flex-col justify-center items-center text-center bg-gradient-to-br from-green-200 to-amber-400 overflow-hidden">
      <div className="flex flex-col justify-center items-center gap-y-6 max-w-2xl px-4">
        <h1
          className={`text-[clamp(1.4rem,7vw,3.75rem)] text-gray-900 font-extrabold leading-tight ${fontClass}
                      transition-all duration-300 flex justify-center items-center
                      w-full h-[2em] overflow-hidden`}
        >
          <span className="inline-block max-w-full">{text}</span>
          {showCaret && (
            <span
              aria-hidden="true"
              className="inline-block w-[2px] bg-amber-900 ml-1 animate-pulse"
              style={{ height: "1em" }}
            />
          )}
        </h1>


        {/* Description (unchanged) */}
        <p className="text-base sm:text-lg text-gray-700 max-w-md text-center px-2">
          Turn your to-do list into an epic adventure. Complete tasks, level up, and conquer your goals — one quest at a time.
        </p>

        <button
          onClick={() => navigate('/daily')}
          className="bg-white text-amber-900 hover:bg-amber-800 hover:text-white transition-all px-5 py-3 sm:px-8 sm:py-4 rounded-full text-base sm:text-xl font-semibold shadow-lg cursor-pointer w-full sm:w-auto text-center"
        >
          Explore the world of Gamified Todos! →
        </button>

        <button
          onClick={() => navigate('/about')}
          className="bg-white text-amber-900 hover:bg-amber-800 hover:text-white transition-all px-5 py-3 sm:px-8 sm:py-4 rounded-full text-base sm:text-xl font-semibold shadow-lg cursor-pointer w-full sm:w-auto text-center"
        >
          Learn more about us! →
        </button>
      </div>
    </section>
  );
};

export default Home;
