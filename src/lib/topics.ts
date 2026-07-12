import type { SubjectId } from "./papers-data";

export type TopicEntry = { name: string; lessons: string[] };
export type SubjectTopics = { subject: string; topics: TopicEntry[] };

export const allTopics: SubjectTopics[] = [
  {
    subject: "Biology",
    topics: [
      {
        name: "Characteristics of Living Organisms",
        lessons: [
          "Characteristics of Living Organisms",
          "Classification Systems",
          "Features of Organisms",
        ],
      },
      {
        name: "Organisation of the Organism",
        lessons: [
          "Cell Structure",
          "Cell Size",
          "Organisation of Cells",
          "Magnification",
          "Unit Conversion",
        ],
      },
      {
        name: "Movement In & Out of Cells",
        lessons: [
          "Diffusion",
          "Factors Affecting Diffusion",
          "Water",
          "Osmosis",
          "Osmosis Experiments",
          "Osmosis in Plants & Animals",
          "Active Transport",
          "Transport Proteins",
        ],
      },
      {
        name: "Biological Molecules",
        lessons: ["Biological Molecules", "Chemicals & Life", "Food Tests", "DNA Structure"],
      },
      {
        name: "Enzymes",
        lessons: ["Enzymes", "Enzyme Investigations", "Enzyme Action", "Temperature", "pH"],
      },
      {
        name: "Plant Nutrition",
        lessons: [
          "Photosynthesis",
          "Chlorophyll",
          "Carbohydrates",
          "Minerals",
          "Required Conditions",
          "Rate of Photosynthesis",
          "Gas Exchange",
          "Equation",
          "Limiting Factors",
          "Leaf Structure",
          "Dicot Leaf",
        ],
      },
      {
        name: "Human Nutrition",
        lessons: [
          "Diet",
          "Deficiencies",
          "Digestive System",
          "Physical Digestion",
          "Teeth",
          "Stomach",
          "Emulsification",
          "Chemical Digestion",
          "Digestive Enzymes",
          "Hydrochloric Acid",
          "Starch Digestion",
          "Protein Digestion",
          "Bile",
          "Absorption",
          "Small Intestine Adaptations",
        ],
      },
      {
        name: "Transport in Plants",
        lessons: [
          "Xylem & Phloem",
          "Root Hair Cells",
          "Water Pathway",
          "Transpiration",
          "Temperature & Wind",
          "Transpiration Stream",
          "Humidity Effects",
          "Translocation",
        ],
      },
      {
        name: "Transport in Animals",
        lessons: [
          "Circulatory System",
          "Heart",
          "Heart Activity",
          "Coronary Heart Disease",
          "Heart Structure",
          "Heart Function",
          "Blood Vessels",
          "Circulation",
          "Blood",
          "Blood Clotting",
          "White Blood Cells",
          "Fibrinogen",
        ],
      },
      {
        name: "Diseases & Immunity",
        lessons: [
          "Pathogens",
          "Barriers",
          "Disease Control",
          "Active Immunity",
          "Antigens & Antibodies",
          "Vaccination",
          "Passive Immunity",
          "Breastfeeding",
          "Cholera",
        ],
      },
      {
        name: "Gas Exchange",
        lessons: [
          "Gas Exchange Surfaces",
          "Breathing System",
          "Inspired vs Expired Air",
          "Physical Activity",
          "Intercostal Muscles",
          "Cartilage",
          "Lung Pressure",
          "Protecting the Breathing System",
        ],
      },
      {
        name: "Respiration",
        lessons: ["Cell Respiration", "Aerobic Respiration", "Anaerobic Respiration"],
      },
      { name: "Excretion", lessons: ["Excretion", "Kidney", "Liver"] },
      {
        name: "Coordination & Response",
        lessons: [
          "Nervous System",
          "Neurones",
          "Reflex Arc",
          "Synapse",
          "Sense Organs",
          "Eye",
          "Hormones",
          "Insulin",
          "Homeostasis",
          "Temperature Control",
          "Tropisms",
        ],
      },
      { name: "Drugs", lessons: ["Drugs in Medicine"] },
      {
        name: "Reproduction",
        lessons: [
          "Asexual Reproduction",
          "Sexual Reproduction",
          "Plant Reproduction",
          "Human Reproduction",
          "Sex Hormones",
          "STIs",
        ],
      },
      {
        name: "Inheritance",
        lessons: [
          "Chromosomes",
          "Genes",
          "Inheritance of Sex",
          "Protein Synthesis",
          "Mitosis",
          "Meiosis",
          "Monohybrid Inheritance",
          "Codominance",
          "Sex-Linked Traits",
        ],
      },
      {
        name: "Variation & Selection",
        lessons: ["Variation", "Adaptations", "Natural Selection", "Artificial Selection"],
      },
      {
        name: "Ecology",
        lessons: [
          "Energy Transfer",
          "Food Chains",
          "Food Webs",
          "Pyramids",
          "Nutrient Cycles",
          "Populations",
        ],
      },
      {
        name: "Human Impact",
        lessons: [
          "Food Supply",
          "Biodiversity",
          "Water Pollution",
          "Other Pollution",
          "Sustainability",
          "Endangered Species",
          "Conservation",
        ],
      },
      {
        name: "Biotechnology",
        lessons: ["Useful Bacteria", "Biotechnology", "Genetic Modification"],
      },
    ],
  },
  {
    subject: "Chemistry",
    topics: [
      {
        name: "States of Matter",
        lessons: ["States of Matter", "Kinetic Theory", "Gas Pressure & Temperature", "Diffusion"],
      },
      {
        name: "Atomic Structure",
        lessons: [
          "Elements Compounds & Mixtures",
          "Atomic Structure",
          "Electronic Configuration",
          "Isotopes",
        ],
      },
      {
        name: "Bonding",
        lessons: [
          "Ions",
          "Ionic Bonding",
          "Ionic Lattice",
          "Ionic Properties",
          "Covalent Bonding",
          "Simple Molecules",
          "Molecular Properties",
          "Diamond",
          "Graphite",
          "Silicon Dioxide",
          "Metallic Bonding",
        ],
      },
      {
        name: "Stoichiometry",
        lessons: [
          "Formulae",
          "Empirical Formula",
          "Equations",
          "Ar & Mr",
          "Mole",
          "Mass & Moles",
          "Reacting Masses",
          "Concentration",
          "Titration",
          "Molecular Formula",
          "Percentage Yield",
          "Purity",
        ],
      },
      {
        name: "Electrochemistry",
        lessons: [
          "Electrolysis",
          "Molten Electrolysis",
          "Aqueous Electrolysis",
          "Half Equations",
          "Electroplating",
          "Hydrogen Fuel Cells",
        ],
      },
      {
        name: "Energetics",
        lessons: ["Exothermic & Endothermic", "Enthalpy", "Activation Energy", "Bond Energy"],
      },
      {
        name: "Chemical Reactions",
        lessons: [
          "Physical vs Chemical Change",
          "Rate Factors",
          "Collision Theory",
          "Rate Experiments",
          "Data Interpretation",
          "Reversible Reactions",
          "Equilibrium",
          "Haber Process",
          "Contact Process",
          "Oxidation",
          "Reduction",
          "Redox",
        ],
      },
      {
        name: "Acids Bases & Salts",
        lessons: [
          "Properties",
          "Acids & Alkalis",
          "Proton Transfer",
          "Strong & Weak Acids",
          "Oxides",
          "Preparing Soluble Salts",
          "Preparing Insoluble Salts",
          "Solubility Rules",
          "Hydrated & Anhydrous Salts",
        ],
      },
      {
        name: "Periodic Table",
        lessons: [
          "Periodic Table",
          "Periodic Trends",
          "Group I",
          "Group VII",
          "Displacement",
          "Transition Elements",
          "Noble Gases",
        ],
      },
      {
        name: "Metals",
        lessons: [
          "Metal Properties",
          "Uses",
          "Alloys",
          "Reactivity Series",
          "Rusting",
          "Galvanising",
          "Sacrificial Protection",
          "Extraction",
          "Iron Extraction",
          "Aluminium Extraction",
        ],
      },
      {
        name: "Environment",
        lessons: [
          "Water Tests",
          "Natural Water",
          "Water Treatment",
          "Fertilisers",
          "Air",
          "Greenhouse Gases",
          "Reducing Pollution",
          "Photosynthesis",
        ],
      },
      {
        name: "Organic Chemistry",
        lessons: [
          "Organic Formulae",
          "Homologous Series",
          "Saturated & Unsaturated",
          "Naming",
          "Fossil Fuels",
          "Alkanes",
          "Alkenes",
          "Addition Reactions",
          "Alcohols",
          "Carboxylic Acids",
          "Ethanoic Acid",
          "Esterification",
          "Polymers",
          "Addition Polymers",
          "Condensation Polymers",
          "Plastics",
          "Proteins",
        ],
      },
      {
        name: "Experimental Techniques",
        lessons: [
          "Apparatus",
          "Solutions",
          "Acid-Base Titrations",
          "Paper Chromatography",
          "Rf Values",
          "Separation Techniques",
          "Anion Tests",
          "Cation Tests",
          "Gas Tests",
        ],
      },
    ],
  },
  {
    subject: "Physics",
    topics: [
      {
        name: "Motion",
        lessons: [
          "Measurement",
          "Scalars & Vectors",
          "Motion",
          "Speed & Velocity",
          "Acceleration",
          "Distance-Time Graphs",
          "Speed-Time Graphs",
          "Acceleration from Graphs",
          "Freefall",
        ],
      },
      {
        name: "Mass Weight & Density",
        lessons: ["Mass & Weight", "Density", "Measuring Density", "Floating"],
      },
      {
        name: "Forces",
        lessons: [
          "Resultant Forces",
          "Newton's First Law",
          "Newton's Second Law",
          "Force & Extension",
          "Hooke's Law",
          "Circular Motion",
          "Friction",
        ],
      },
      { name: "Moments", lessons: ["Moments", "Equilibrium", "Centre of Gravity"] },
      { name: "Momentum", lessons: ["Momentum", "Impulse"] },
      {
        name: "Energy",
        lessons: [
          "Energy Stores",
          "Kinetic Energy",
          "Gravitational Potential Energy",
          "Conservation of Energy",
          "Work Done",
          "Power",
          "Efficiency",
        ],
      },
      {
        name: "Energy Sources",
        lessons: ["Solar", "Fuels", "Hydroelectric", "Geothermal", "Nuclear Fusion"],
      },
      { name: "Pressure", lessons: ["Pressure", "Liquid Pressure"] },
      {
        name: "Thermal Physics",
        lessons: [
          "States of Matter",
          "Molecular Model",
          "Gas Model",
          "Brownian Motion",
          "Absolute Temperature",
          "Thermal Expansion",
          "Specific Heat Capacity",
          "Melting & Boiling",
          "Evaporation",
          "Conduction",
          "Convection",
          "Radiation",
          "Greenhouse Effect",
          "Infrared",
          "Thermal Transfer",
        ],
      },
      {
        name: "Waves",
        lessons: [
          "Wave Properties",
          "Wave Equation",
          "Transverse & Longitudinal",
          "Wave Behaviour",
          "Ripple Tank",
          "Reflection",
          "Refraction",
          "Refractive Index",
          "Total Internal Reflection",
          "Ray Diagrams",
          "Real Images",
          "Virtual Images",
          "Correcting Sight",
          "Dispersion",
          "Electromagnetic Spectrum",
          "EM Waves",
          "Uses",
          "Dangers",
          "Communications",
          "Digital & Analogue",
          "Sound",
          "Speed of Sound",
          "Ultrasound",
        ],
      },
      {
        name: "Electricity & Magnetism",
        lessons: [
          "Magnetism",
          "Magnets",
          "Magnetic Fields",
          "Electric Charge",
          "Electric Fields",
          "Conductors & Insulators",
          "Current",
          "AC & DC",
          "EMF",
          "Potential Difference",
          "Resistance",
          "Resistance of a Wire",
          "Electrical Energy",
          "Electrical Power",
          "Circuit Components",
          "Current in Circuits",
          "Combined Resistance",
          "Potential Dividers",
          "Electrical Safety",
          "Electromagnetic Induction",
          "AC Generator",
          "Magnetic Effect of Current",
          "Motor Effect",
          "Electric Motors",
          "Transformers",
          "Transformer Calculations",
        ],
      },
      {
        name: "Nuclear Physics",
        lessons: [
          "Atom",
          "Nucleus",
          "Protons Neutrons & Electrons",
          "Fission",
          "Fusion",
          "Background Radiation",
          "Types of Radiation",
          "Ionising Power",
          "Radioactive Decay",
          "Half-Life",
          "Uses of Radiation",
          "Radiation Hazards",
        ],
      },
      {
        name: "Space Physics",
        lessons: [
          "Earth Moon & Sun",
          "Solar System",
          "Formation",
          "Light Speed",
          "Gravitational Field Strength",
          "Orbital Speed",
          "Elliptical Orbits",
          "Sun",
          "Universe Scale",
          "Star Formation",
          "Star Life Cycle",
          "Galactic Redshift",
          "Big Bang",
          "Age of the Universe",
        ],
      },
    ],
  },
];

const SUBJECT_KEY: Record<SubjectId, string> = {
  biology: "Biology",
  chemistry: "Chemistry",
  physics: "Physics",
};

export function getTopicsFor(subject: SubjectId): TopicEntry[] {
  const key = SUBJECT_KEY[subject];
  return allTopics.find((s) => s.subject === key)?.topics ?? [];
}

export function getFirstTopicAndLesson(subject: SubjectId): { topic: string; lesson: string } {
  const t = getTopicsFor(subject)[0];
  return { topic: t?.name ?? "", lesson: t?.lessons[0] ?? "" };
}

export function getLessonsFor(subject: SubjectId, topic: string): string[] {
  return getTopicsFor(subject).find((t) => t.name === topic)?.lessons ?? [];
}

/** Return the union of lessons across the given topics. */
export function getLessonsForTopics(subject: SubjectId, topics: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const t of topics) {
    for (const l of getLessonsFor(subject, t)) {
      if (!seen.has(l)) {
        seen.add(l);
        out.push(l);
      }
    }
  }
  return out;
}
