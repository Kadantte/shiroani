import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Features } from './components/Features';
import { Preview } from './components/Preview';
import { BotSection } from './components/BotSection';
import { Download } from './components/Download';
import { Footer } from './components/Footer';

export function App() {
  return (
    <div className="grain relative min-h-screen">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Preview />
        <BotSection />
        <Download />
      </main>
      <Footer />
    </div>
  );
}
