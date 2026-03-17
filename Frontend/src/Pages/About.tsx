import React from "react";
import { useNavigate } from "react-router-dom";
import questPageImg from "../assets/QuestPage.png";
const About: React.FC = () => {
    const navigate = useNavigate();
    return (
        <section className="min-h-screen w-full bg-gradient-to-br from-violet-600 via-purple-800 to-indigo-900 py-16 px-4">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="container mx-auto max-w-5xl glass rounded-3xl p-8 shadow-2xl relative">

                {/* Top Section */}
                <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">

                    {/* Left Column */}
                    <div className="md:w-1/2 text-center md:text-left">
                        <span className="text-2xl font-bold text-white/80">
                            FocusQuest
                        </span>
                        <h1 className="text-4xl text-white font-extrabold leading-tight mt-2">
                            About Us!
                        </h1>
                        <p className="text-lg text-white/70 max-w-md mt-4">
                            Whether you're tackling a major project, building new habits, or just managing daily chores,
                            FocusQuest provides the structure and the fun to keep you going.
                            Join our community and start your journey to becoming more productive today!
                        </p>
                    </div>

                    {/* Right Column */}
                    <div className="md:w-1/2">
                        <img
                            src={questPageImg}
                            alt="A screenshot of the Quest Page"
                            className="rounded-2xl shadow-2xl w-full h-auto ring-1 ring-white/20"
                        />
                    </div>
                </div>

                {/* Divider */}
                <div className="my-12 border-t border-white/20"></div>

                {/* Game Elements */}
                <div className="text-center">
                    <h2 className="text-3xl font-bold text-white">Core Game Elements</h2>
                    <p className="text-lg text-white/70 max-w-2xl mx-auto mt-4">
                        We turn your to-do list into an adventure. Here are some of the mechanics you'll encounter on your quest for productivity:
                    </p>

                    <ul className="mt-6 text-left max-w-md mx-auto space-y-3 text-white/70">
                        <li className="flex items-start gap-3">
                            <span className="font-bold text-amber-300">-</span>
                            <span><strong className="text-white">Experience Points (XP):</strong> Earn XP for every task you complete and watch your level rise.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="font-bold text-amber-300">-</span>
                            <span><strong className="text-white">Daily Quests:</strong> Unlock special rewards for slaying the daily monster.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="font-bold text-amber-300">-</span>
                            <span><strong className="text-white">Customization:</strong> Use your progress to unlock new themes, avatars, or other fun cosmetic rewards.</span>
                        </li>
                    </ul>
                </div>

                <div className="text-center mt-12">
                    <button
                        onClick={() => navigate('/')}
                        className="glass-btn text-white px-8 py-4 rounded-full text-xl font-semibold shadow-lg cursor-pointer"
                    >
                        ← Back to Home
                    </button>
                </div>

            </div>
        </section>
    );
};

export default About;
