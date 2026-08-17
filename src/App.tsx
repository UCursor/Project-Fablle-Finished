import React, { useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';
import { Sun, Moon } from 'lucide-react';
import { Liquid } from './components/Liquid';
import { VideoDistortion } from './components/VideoDistortion';

export default function App() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('fable-theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark-mode');
      document.body.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
      document.body.classList.remove('dark-mode');
    }
    localStorage.setItem('fable-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  useEffect(() => {
    // Initialize Lenis smooth scroll
    const lenis = new Lenis({
      smoothWheel: true,
      lerp: 0.08,
    });

    let rafId: number;
    function raf(time: number) {
      const stage = stageRef.current;
      if (stage) {
        const rect = stage.getBoundingClientRect();
        const distance = Math.abs(rect.top + rect.height / 2 - window.innerHeight / 2);
        const influence = Math.min(1, Math.max(0, 1 - distance / (window.innerHeight * 1.5)));
        lenis.options.lerp = 0.08 + influence * 0.18;
      }

      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  const handleNavClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    const targetId = event.currentTarget.getAttribute('href');
    if (!targetId || !targetId.startsWith('#')) return;

    const target = document.querySelector(targetId);
    if (!target) return;

    event.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });

    target.classList.remove('flash-highlight');
    void (target as HTMLElement).offsetWidth;
    target.classList.add('flash-highlight');

    setTimeout(() => {
      target.classList.remove('flash-highlight');
    }, 300);
  };

  return (
    <div className={`app-container ${theme === 'dark' ? 'dark-mode' : ''}`}>
      {/* Topbar */}
      <div className="topbar">
        <div className="top-left">
          <img
            className="logo"
            src="/Images/Logo.png"
            width="38px"
            height="38px"
            alt="Logo"
            onError={(e) => {
              const target = e.currentTarget;
              if (target.src !== window.location.origin + '/Logo.png') {
                target.src = '/Logo.png';
              }
            }}
          />
        </div>

        <div className="top-right">
          <a href="#footer" className="TRT nav-link" onClick={handleNavClick}>
            Contacts
          </a>
          <a href="#about" className="TRT nav-link" onClick={handleNavClick}>
            About
          </a>
          <a href="#socials" className="TRT nav-link" onClick={handleNavClick}>
            Socials
          </a>

          <button
            type="button"
            className="theme-toggle-btn"
            onClick={toggleTheme}
            aria-label="Toggle light and dark mode"
          >
            {theme === 'light' ? (
              <>
                <Moon size={14} />
                <span>Dark</span>
              </>
            ) : (
              <>
                <Sun size={14} />
                <span>Light</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Hero Section with Fluid Liquid Color-Inverting Mask */}
      <div className="hero-liquid-wrapper">
        <Liquid
          className="w-full h-full"
          force={1.3}
          radius={0.35}
          curl={2.2}
          pressureIterations={4}
          pressure={0.8}
          intensity={2.8}
          distortion={0.4}
          blend={5}
          densityDissipation={0.96}
          velocityDissipation={0.99}
          simResolution={128}
          dyeResolution={512}
          color={[1, 1, 1]}
          invertMask={true}
        >
          <div className="Content">
            <h1 className="Title">Fable</h1>
            <p className="Description">Building the Modern Web</p>
          </div>
        </Liquid>
      </div>

      {/* Video Stage with Interactive Fluid Displacement Distortion */}
      <div className="video-stage" aria-label="Featured video section" ref={stageRef}>
        <video
          className="Video video-backdrop"
          src="Videos/Silk.mp4"
          autoPlay
          muted
          loop
          playsInline
        />
        <div className="video-window">
          <VideoDistortion videoSrc="Videos/Silk.mp4" className="video-foreground" />
        </div>
      </div>

      {/* About Section (Unaffected, fluid goes under) */}
      <div className="About" id="about">
        <p className="AboutTitle">About Us:</p>
        <p className="AboutDescription">
          <span className="AboutSpan">I am a Developer Who is</span> dedicated to creating innovative solutions for the modern web.
        </p>
      </div>

      {/* Socials / Work Section (Unaffected) */}
      <section id="socials" className="socials-section">
        <p className="WorkTitle">Want to work with us?</p>
        <p className="WorkDn">Reach Out Using Our Socials</p>
        <p className="WorkDb">Discord/Github</p>
      </section>

      {/* Footer */}
      <footer id="footer">
        <div className="Footer">
          <a
            href="https://github.com/UCursor"
            target="_blank"
            rel="noopener noreferrer"
            className="social-link github-link"
          >
            <img src="/Icons/github.svg" alt="GitHub" className="SocialIcon github-icon" />
          </a>

          <p className="FooterText">© 2026 Project Fable. All rights reserved.</p>

          <a
            href="https://discord.gg/rK7eqVp53k"
            target="_blank"
            rel="noopener noreferrer"
            className="social-link discord-link"
          >
            <p className="discord">Join our Discord</p>
          </a>
        </div>
      </footer>
    </div>
  );
}
