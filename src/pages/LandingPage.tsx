import Navbar     from '../components/landing/Navbar';
import Hero       from '../components/landing/Hero';
import PainPoints from '../components/landing/PainPoints';
import HowItWorks from '../components/landing/HowItWorks';
import Stats      from '../components/landing/Stats';
import Features   from '../components/landing/Features';
import Security   from '../components/landing/Security';
import Pricing    from '../components/landing/Pricing';
import FinalCTA   from '../components/landing/FinalCTA';
import Footer     from '../components/landing/Footer';

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <Hero />
      <PainPoints />
      <HowItWorks />
      <Stats />
      <Features />
      <Security />
      <Pricing />
      <FinalCTA />
      <Footer />
    </>
  );
}
