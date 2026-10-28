import { motion } from "framer-motion";

import { usePersonaCms } from "@/features/personas/shared/usePersonaCms";

const WoWiHero = () => {
  const { cms, tx } = usePersonaCms("wohnungswirtschaft");
  return (
    <section className="bg-background">
      <div className="container mx-auto pt-16 pb-12 lg:pt-24 lg:pb-16">
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} className="text-sm text-muted-foreground mb-6">
          {tx("hero", "eyebrow")}
        </motion.p>
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="text-4xl md:text-5xl lg:text-[3.5rem] font-heading font-normal leading-[1.15] text-foreground max-w-4xl">
          {tx("hero", "headline")}
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.15 }} className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-3xl mt-6 font-heading">
          {tx("hero", "subheadline")}
        </motion.p>
        <motion.p initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.25 }} className="text-base text-muted-foreground leading-relaxed max-w-2xl mt-6">
          {tx("hero", "intro")}
        </motion.p>
      </div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.3 }} className="w-full">
        <img src={cms.asset("hero", "image", "")} alt={tx("hero", "imageAlt")} className="w-full h-[50vh] lg:h-[70vh] object-cover" width={1920} height={1080} />
      </motion.div>
    </section>
  );
};

export default WoWiHero;
