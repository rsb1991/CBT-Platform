import React, { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import QuestionRenderer from "./QuestionRenderer";

// 
// SUPABASE CONFIG  replace with your project URL & anon key
// 
const SUPABASE_URL = "https://wsfbzwgdfxxhedccodua.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzZmJ6d2dkZnh4aGVkY2NvZHVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MTM0NzksImV4cCI6MjA5NTM4OTQ3OX0.I6RVwV8PXB-3NFWAQxK-KuvBbSnlI7ilKKVRpciJkt0";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 
// CONSTANTS
// 
const SUBJECTS = ["Physics", "Chemistry", "Botany", "Zoology"];
const TOTAL_TIME = 3 * 60 * 60;
const MARKS_CORRECT = 4;
const MARKS_WRONG = -1;
const QUESTIONS_PER_SUBJECT = 45;
const SESSION_KEY = "neet_exam_session"; // localStorage key for exam persistence
const SCREEN = { LANDING: "landing", AUTH: "auth", ADMIN_AUTH: "admin_auth", ADMIN: "admin", DASHBOARD: "dashboard", INSTRUCTIONS: "instructions", EXAM: "exam", RESULT: "result" };
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || "admin@neet2025.in";
const ADMIN_PASS  = import.meta.env.VITE_ADMIN_PASS  || "Neet@Admin#2025";
const AVAILABLE_YEARS = [2024, 2023, 2022, 2021, 2020, 2019, 2018];

// Theme context - shared across all components
const ThemeCtx = { dark: true, branding: {} }; // mutable object shared across all screens
const getTheme = () => ThemeCtx.dark;
const getBranding = () => ThemeCtx.branding;

// Helper: compute background style from branding
const brandingBg = (b = {}) => {
  if (b.bg_type === "solid" && b.bg_solid_color)
    return { background: b.bg_solid_color };
  if (b.bg_type === "image" && b.bg_image_data)
    return { backgroundImage: "url(" + b.bg_image_data + ")", backgroundSize: "cover", backgroundPosition: "center" };
  if (b.bg_gradient_from && b.bg_gradient_to)
    return { background: "linear-gradient(135deg," + b.bg_gradient_from + " 0%," + b.bg_gradient_to + " 50%," + b.bg_gradient_from + " 100%)" };
  return { background: "linear-gradient(135deg,#0f0c29 0%,#302b63 50%,#24243e 100%)" };
};
const brandingFont = (b = {}) => b.font_family || "'Crimson Pro', Georgia, serif";
const brandingTitle = (b = {}) => b.title_color || "#ffffff";
const brandingTagline = (b = {}) => b.tagline_color || "#94a3b8";

// 
// FULL 180-QUESTION BANK (45 per subject)
// In production these come from Supabase. This local bank is the demo fallback.
// 
const buildLocalQuestions = (year) => {
  // We generate year-tagged versions so the year selector is meaningful
  const seed = year % 100;
  const physics = [
    { text: "A ball is thrown vertically upward with velocity 20 m/s. Max height (g=10):", options: ["10 m","20 m","30 m","40 m"], correct: 1, solution: "h = u/2g = 400/20 = 20 m." },
    { text: "The SI unit of electric field intensity is:", options: ["C/m","N/C","Nm","J/C"], correct: 1, solution: "E = F/q  N/C." },
    { text: "Work done moving 2C across 12V potential difference:", options: ["6 J","10 J","24 J","14 J"], correct: 2, solution: "W = qV = 212 = 24 J." },
    { text: "Dimensional formula of power is:", options: ["[MLT]","[MLT]","[MLT]","[MLT]"], correct: 1, solution: "Power = Work/Time = [MLT]/[T] = [MLT]." },
    { text: "Which law states that electric flux  enclosed charge?", options: ["Coulomb's","Faraday's","Gauss's","Ampere's"], correct: 2, solution: "Gauss's Law:  = Q/." },
    { text: "A concave mirror has focal length 15 cm. Radius of curvature:", options: ["7.5 cm","15 cm","30 cm","45 cm"], correct: 2, solution: "R = 2f = 30 cm." },
    { text: "The refractive index of glass is 1.5. Speed of light in glass (c=310):", options: ["110","210","310","410"], correct: 1, solution: "v = c/n = 310/1.5 = 210 m/s." },
    { text: "Which particle has zero rest mass?", options: ["Electron","Proton","Neutron","Photon"], correct: 3, solution: "Photons are massless particles of light." },
    { text: "The phenomenon of bending of light around obstacles is:", options: ["Reflection","Refraction","Diffraction","Polarization"], correct: 2, solution: "Diffraction is the bending of light around edges of obstacles." },
    { text: "Half-life of radioactive substance is 20 min. After 60 min, fraction remaining:", options: ["1/2","1/4","1/8","1/16"], correct: 2, solution: "60/20 = 3 half-lives  (1/2) = 1/8." },
    { text: "Ohm's law relates:", options: ["V and I","V and R","I and R","P and I"], correct: 0, solution: "V = IR; Ohm's law relates voltage (V) and current (I)." },
    { text: "Which mirror is used as a rear-view mirror?", options: ["Plane","Concave","Convex","Parabolic"], correct: 2, solution: "Convex mirror gives wide field of view  used as rear-view." },
    { text: "SI unit of magnetic flux:", options: ["Tesla","Weber","Gauss","Henry"], correct: 1, solution: "Magnetic flux is measured in Weber (Wb)." },
    { text: "Photoelectric effect was explained by:", options: ["Maxwell","Planck","Einstein","Bohr"], correct: 2, solution: "Einstein explained the photoelectric effect using photons (Nobel 1921)." },
    { text: "When a body moves in a circle, centripetal acceleration = ?", options: ["vr","v/r","v/r","r/v"], correct: 2, solution: "a_c = v/r directed towards centre." },
    { text: "The energy of a photon with frequency  is:", options: ["h","h/","h","h"], correct: 2, solution: "E = h (Planck's equation)." },
    { text: "Transformer works on the principle of:", options: ["Self-induction","Mutual induction","Eddy currents","Magnetism"], correct: 1, solution: "Transformer uses mutual electromagnetic induction." },
    { text: "Newton's 2nd law: F = ma. SI unit of force:", options: ["Joule","Watt","Newton","Pascal"], correct: 2, solution: "Force is measured in Newtons (N = kgm/s)." },
    { text: "Which has highest penetrating power?", options: ["Alpha","Beta","Gamma","X-ray"], correct: 2, solution: "Gamma rays have the highest penetrating power." },
    { text: "In a series LCR circuit at resonance:", options: ["XL > XC","XC > XL","XL = XC","Z = XL"], correct: 2, solution: "At resonance, XL = XC, so impedance Z = R (minimum)." },
    { text: "A convex lens is also called:", options: ["Diverging lens","Converging lens","Plane lens","Concave lens"], correct: 1, solution: "Convex (converging) lens brings parallel rays to a focus." },
    { text: "The escape velocity from Earth's surface (g=10, R=6400 km):", options: ["8 km/s","11.2 km/s","15 km/s","7 km/s"], correct: 1, solution: "v_e = (2gR)  11.2 km/s." },
    { text: "In which state is pressure exerted equally in all directions?", options: ["Solid","Liquid","Gas","Plasma"], correct: 1, solution: "Pascal's law: pressure in fluids acts equally in all directions." },
    { text: "The angle of incidence equals angle of reflection  this is:", options: ["Snell's law","Law of reflection","Brewster's law","Diffraction"], correct: 1, solution: "First law of reflection: angle of incidence = angle of reflection." },
    { text: "De Broglie wavelength  = h/p. This represents:", options: ["Wave nature of light","Wave nature of matter","Particle nature","None"], correct: 1, solution: "De Broglie: matter (particles) also has wave properties." },
    { text: "Capacitance of a parallel plate capacitor ", options: ["d/A","A/d","1/Ad","Ad"], correct: 1, solution: "C = A/d; capacity proportional to plate area A and inversely to distance d." },
    { text: "SI unit of pressure:", options: ["Newton","Pascal","Joule","Bar"], correct: 1, solution: "Pressure is measured in Pascal (Pa = N/m)." },
    { text: "Which type of wave cannot travel through vacuum?", options: ["Light","Radio","Sound","X-ray"], correct: 2, solution: "Sound is a mechanical (longitudinal) wave requiring a medium." },
    { text: "Lenz's law is related to:", options: ["Refraction","Electromagnetic induction","Electrostatics","Gravitation"], correct: 1, solution: "Lenz's law determines the direction of induced EMF." },
    { text: "Which quantity is conserved in elastic collision?", options: ["KE only","Momentum only","Both KE and momentum","Neither"], correct: 2, solution: "Elastic collision: both kinetic energy and momentum are conserved." },
    { text: "The nucleus of an atom contains:", options: ["Electrons only","Protons & electrons","Protons & neutrons","Neutrons only"], correct: 2, solution: "Nucleus contains protons (positive) and neutrons (neutral)." },
    { text: "Magnetic field due to a long straight current-carrying wire ", options: ["r","1/r","r","1/r"], correct: 1, solution: "B = I/2r  inversely proportional to distance r." },
    { text: "The phenomenon responsible for formation of rainbow is:", options: ["Reflection only","Refraction only","Dispersion & TIR","Diffraction"], correct: 2, solution: "Rainbow forms by dispersion and total internal reflection in droplets." },
    { text: "In a p-n junction diode, forward bias causes:", options: ["Wider depletion layer","Narrower depletion layer","No change","Reverse current"], correct: 1, solution: "Forward bias reduces/narrows the depletion layer, allowing current." },
    { text: "The first law of thermodynamics is a statement of:", options: ["Conservation of momentum","Conservation of energy","Entropy","Newton's 2nd law"], correct: 1, solution: "1st law: U = Q  W (conservation of energy)." },
    { text: "Velocity of sound is maximum in:", options: ["Air","Water","Steel","Vacuum"], correct: 2, solution: "Sound travels fastest in solids; v_steel  5000 m/s." },
    { text: "A body of mass m at height h has PE =", options: ["mgh","mgh","mg/h","mgh"], correct: 1, solution: "Gravitational potential energy = mgh." },
    { text: "Which gate gives output 1 only when all inputs are 1?", options: ["OR","AND","NAND","NOR"], correct: 1, solution: "AND gate: output is 1 only when ALL inputs are 1." },
    { text: "The time period of a simple pendulum depends on:", options: ["Mass","Length & g","Amplitude","All of these"], correct: 1, solution: "T = 2(L/g); independent of mass and small amplitude." },
    { text: "Huygen's principle is used to explain:", options: ["Photoelectric effect","Wave propagation","Nuclear fission","Electrolysis"], correct: 1, solution: "Huygens' principle describes propagation of wave fronts." },
    { text: "The ratio of nuclear density to atomic density is approximately:", options: ["10","10","10","10"], correct: 3, solution: "Nuclear density (~10 kg/m) >> atomic density by factor ~10." },
    { text: "Which electromagnetic wave has the longest wavelength?", options: ["Gamma","X-ray","Radio","UV"], correct: 2, solution: "Radio waves have wavelengths from mm to km  longest in EM spectrum." },
    { text: "Angle of minimum deviation for a prism depends on:", options: ["Refractive index & angle of prism","Colour only","Size only","Density only"], correct: 0, solution: "_min depends on both the refractive index () and prism angle (A)." },
    { text: "Bohr's atomic model explained the spectrum of:", options: ["All atoms","Hydrogen atom","Noble gases","Heavy metals"], correct: 1, solution: "Bohr's model successfully explains the hydrogen spectrum." },
    { text: "In photoelectric effect, stopping potential depends on:", options: ["Intensity","Frequency of light","Metal area","None"], correct: 1, solution: "Stopping potential V = (h  )/e; depends only on frequency." },
  ];
  const chemistry = [
    { text: "Hybridization of carbon in diamond:", options: ["sp","sp","sp","spd"], correct: 2, solution: "Diamond: each C forms 4 -bonds  sp hybridized." },
    { text: "Which is a Lewis acid?", options: ["NH","HO","BF","OH"], correct: 2, solution: "BF is electron-deficient; accepts lone pairs  Lewis acid." },
    { text: "Moles in 18g of water:", options: ["0.5","1","1.5","2"], correct: 1, solution: "M(HO)=18 g/mol; 18/18 = 1 mol." },
    { text: "The IUPAC name of CHCHO is:", options: ["Methanol","Ethanal","Ethanol","Methanal"], correct: 1, solution: "CHCHO is ethanal (acetaldehyde)." },
    { text: "Which gas is produced when zinc reacts with dilute HSO?", options: ["O","SO","H","CO"], correct: 2, solution: "Zn + HSO  ZnSO + H" },
    { text: "pH of a neutral solution at 25C:", options: ["0","7","14","1"], correct: 1, solution: "At 25C, neutral water has pH = 7." },
    { text: "Avogadro's number is:", options: ["6.02210","6.02210","6.02210","3.01110"], correct: 0, solution: "N = 6.02210 mol." },
    { text: "Which bond is present in NaCl?", options: ["Covalent","Ionic","Metallic","Hydrogen"], correct: 1, solution: "NaCl is an ionic compound  Na and Cl ions." },
    { text: "Alkanes have the general formula:", options: ["CH","CH","CH","CH"], correct: 1, solution: "Saturated hydrocarbons (alkanes): CH." },
    { text: "Which is the strongest oxidising agent among halogens?", options: ["F","Cl","Br","I"], correct: 0, solution: "Fluorine is the most electronegative element  strongest oxidiser." },
    { text: "The number of protons in an atom defines its:", options: ["Mass number","Atomic number","Neutron number","Valency"], correct: 1, solution: "Atomic number Z = number of protons." },
    { text: "Arrhenius acid is a substance that:", options: ["Accepts H","Donates OH","Donates H","Accepts OH"], correct: 2, solution: "Arrhenius acid donates H ions in water." },
    { text: "The gas law PV = nRT is called:", options: ["Boyle's","Charles'","Ideal Gas","Van der Waals"], correct: 2, solution: "PV = nRT is the ideal (perfect) gas equation." },
    { text: "Which element has the highest electronegativity?", options: ["Oxygen","Chlorine","Fluorine","Nitrogen"], correct: 2, solution: "Fluorine has electronegativity 4.0 (Pauling scale)  highest of all." },
    { text: "Functional group in alcohols:", options: ["-CHO","-OH","-COOH","-NH"], correct: 1, solution: "Alcohols contain the hydroxyl (-OH) functional group." },
    { text: "The process of gaining electrons is called:", options: ["Oxidation","Reduction","Combustion","Sublimation"], correct: 1, solution: "Reduction: gain of electrons (OIL RIG)." },
    { text: "Which catalyst is used in Haber process?", options: ["VO","Pt","Fe","Ni"], correct: 2, solution: "Iron (Fe) with KO/AlO promoters catalyses N + H  NH." },
    { text: "Normality = Molarity  n-factor. This relation holds for:", options: ["All solutions","Acids & bases only","Redox only","Salts only"], correct: 0, solution: "N = M  n-factor applies to all solute types." },
    { text: "The orbital with the highest energy in ground state H:", options: ["1s","2s","2p","3s"], correct: 0, solution: "H ground state has one electron in 1s." },
    { text: "Which type of isomerism is shown by CHCHOH and CHOCH?", options: ["Chain","Position","Functional group","Optical"], correct: 2, solution: "Same molecular formula CHO but different functional groups  functional isomerism." },
    { text: "Enthalpy change (H) at constant pressure equals:", options: ["U","q_p","G","S"], correct: 1, solution: "At constant pressure, H = q_p (heat absorbed)." },
    { text: "Which noble gas is used in advertisement signs?", options: ["He","Ar","Ne","Kr"], correct: 2, solution: "Neon glows red-orange in discharge tubes  used in neon signs." },
    { text: "Equilibrium constant K depends on:", options: ["Concentration","Pressure","Temperature","Catalyst"], correct: 2, solution: "K changes only with temperature; concentration/pressure shift position, not K." },
    { text: "SN2 reaction proceeds with:", options: ["Retention","Racemisation","Inversion","No stereochemistry"], correct: 2, solution: "SN2: backside attack  Walden inversion of configuration." },
    { text: "Which salt undergoes anionic hydrolysis?", options: ["NaCl","CHCOONa","NHCl","NaHCO"], correct: 1, solution: "CHCOONa is salt of weak acid + strong base  anion hydrolyses." },
    { text: "Hybridization of N in NH:", options: ["sp","sp","sp","spd"], correct: 2, solution: "N in NH: 3 bond pairs + 1 lone pair  sp hybridized." },
    { text: "Colligative properties depend on:", options: ["Nature of solute","Number of solute particles","Size of solute","Charge of solute"], correct: 1, solution: "Colligative properties depend only on the number of solute particles." },
    { text: "Boiling point of water at higher altitude:", options: ["100C","More than 100C","Less than 100C","Same"], correct: 2, solution: "Lower atmospheric pressure at altitude  water boils below 100C." },
    { text: "Which reaction type is CH + Cl  CHCl + HCl (in light)?", options: ["Addition","Substitution","Elimination","Rearrangement"], correct: 1, solution: "Free-radical substitution of H by Cl in alkanes." },
    { text: "The VSEPR model predicts shape based on:", options: ["Bond length","Electron pair repulsion","Nuclear charge","Atomic radius"], correct: 1, solution: "VSEPR: electron pairs (bonding + lone) repel each other to minimise repulsion." },
    { text: "Which oxide is amphoteric?", options: ["NaO","CaO","AlO","SO"], correct: 2, solution: "AlO reacts with both acids and bases  amphoteric oxide." },
    { text: "Rate of reaction increases with temperature because:", options: ["More collisions only","More effective collisions","Less activation energy","All"], correct: 1, solution: "Higher T  higher KE  more molecules have E  E_a  more effective collisions." },
    { text: "Galvanic cell converts:", options: ["Electrical to chemical","Chemical to electrical","Heat to electrical","Mechanical to electrical"], correct: 1, solution: "Galvanic (voltaic) cells convert chemical energy to electrical energy." },
    { text: "The standard electrode potential of SHE is:", options: ["+1 V","1 V","0 V","Variable"], correct: 2, solution: "Standard Hydrogen Electrode (SHE) is the reference: E = 0.00 V." },
    { text: "Phenol reacts with FeCl to give:", options: ["Yellow","Blue","Violet","Red"], correct: 2, solution: "Phenol + FeCl  violet/purple complex (characteristic test)." },
    { text: "Which process is used to obtain pure copper?", options: ["Zone refining","Electrolytic refining","Vapour phase","Distillation"], correct: 1, solution: "Copper is purified by electrolytic refining." },
    { text: "Molecular formula of glucose:", options: ["CHO","CHO","CHO","CHO"], correct: 1, solution: "Glucose: CHO (hexose sugar)." },
    { text: "The shape of PCl molecule:", options: ["Trigonal planar","Square planar","Trigonal bipyramidal","Octahedral"], correct: 2, solution: "PCl: spd hybridized  trigonal bipyramidal." },
    { text: "Raoult's law is applicable to:", options: ["All solutions","Ideal solutions","Ionic solutions","Gaseous mixtures"], correct: 1, solution: "Raoult's law applies strictly to ideal solutions." },
    { text: "Nessler's reagent detects:", options: ["NO","NH","SO","Cl"], correct: 1, solution: "Nessler's reagent (K[HgI]/KOH) gives reddish-brown ppt with NH." },
    { text: "Peptide bond is formed between:", options: ["Two carboxyl groups","Two amino groups","Amino & carboxyl groups","Two hydroxyl groups"], correct: 2, solution: "Peptide bond (CONH) forms between COOH of one AA and NH of another." },
    { text: "Which polymer is used in making Teflon?", options: ["Polystyrene","Polytetrafluoroethylene","Polyethylene","PVC"], correct: 1, solution: "Teflon is polytetrafluoroethylene (PTFE)." },
    { text: "Diazotisation reaction involves:", options: ["OH group","NH group","NO group","COOH group"], correct: 1, solution: "Primary aromatic amines (NH) undergo diazotisation with NaNO/HCl." },
    { text: "Beer-Lambert law relates absorbance to:", options: ["Temperature","Concentration & path length","Refractive index","Pressure"], correct: 1, solution: "A = cl; absorbance proportional to concentration (c) and path length (l)." },
  ];
  const botany = [
    { text: "Organelle known as 'powerhouse of the cell':", options: ["Ribosome","Lysosome","Mitochondria","Golgi Body"], correct: 2, solution: "Mitochondria produce ATP  called the powerhouse." },
    { text: "Photosynthesis occurs in:", options: ["Nucleus","Mitochondria","Vacuole","Chloroplast"], correct: 3, solution: "Chloroplasts contain chlorophyll, site of photosynthesis." },
    { text: "Conversion of glucose to ethanol by yeast:", options: ["Aerobic respiration","Fermentation","Photosynthesis","Transpiration"], correct: 1, solution: "Anaerobic fermentation by yeast: glucose  ethanol + CO." },
    { text: "Which plant tissue is responsible for growth?", options: ["Meristematic","Permanent","Epidermal","Vascular"], correct: 0, solution: "Meristematic tissue contains actively dividing cells." },
    { text: "The process of water movement through xylem is driven by:", options: ["Root pressure","Transpiration pull","Osmosis","Diffusion"], correct: 1, solution: "Transpiration pull (cohesion-tension theory) is the main driving force." },
    { text: "DNA replication is:", options: ["Conservative","Semi-conservative","Dispersive","Random"], correct: 1, solution: "Watson & Crick proposed semi-conservative replication (confirmed by Meselson-Stahl)." },
    { text: "Photoperiodism was first described by:", options: ["Darwin","Garner & Allard","Went","Blackman"], correct: 1, solution: "Garner and Allard (1920) discovered photoperiodism in tobacco." },
    { text: "The monomer of DNA is:", options: ["Amino acid","Glucose","Nucleotide","Fatty acid"], correct: 2, solution: "DNA is a polynucleotide; monomer = nucleotide (base + sugar + phosphate)." },
    { text: "Which pigment absorbs red and far-red light?", options: ["Chlorophyll","Carotenoid","Phytochrome","Xanthophyll"], correct: 2, solution: "Phytochrome exists in Pr (red-absorbing) and Pfr (far-red-absorbing) forms." },
    { text: "Krebs cycle occurs in:", options: ["Cytoplasm","Mitochondrial matrix","Inner membrane","Nucleus"], correct: 1, solution: "Krebs (TCA) cycle occurs in the mitochondrial matrix." },
    { text: "Calvin cycle is also called:", options: ["C3 cycle","C4 cycle","Hatch-Slack","Crassulacean"], correct: 0, solution: "Calvin cycle = C3 pathway; first stable product is 3-PGA." },
    { text: "The enzyme that fixes CO in C3 plants is:", options: ["PEP carboxylase","RuBisCO","Pyruvate kinase","ATP synthase"], correct: 1, solution: "RuBisCO (ribulose-1,5-bisphosphate carboxylase/oxygenase) fixes CO in C3 plants." },
    { text: "Auxin promotes cell elongation by:", options: ["Decreasing wall rigidity","Increasing wall plasticity","DNA synthesis","Protein degradation"], correct: 1, solution: "Auxin acidifies cell wall  increases plasticity  elongation." },
    { text: "Meiosis occurs in:", options: ["Somatic cells","Gamete mother cells","Nerve cells","Meristematic cells"], correct: 1, solution: "Meiosis (reduction division) occurs in gamete mother cells." },
    { text: "The scientific name of mango is:", options: ["Mangifera indica","Mangifera mango","Indica mangifera","Solanum mango"], correct: 0, solution: "Mango: Mangifera indica (family Anacardiaceae)." },
    { text: "Osmosis is the movement of:", options: ["Solute from high to low","Water from low to high solute","Water from high to low solute","All molecules"], correct: 2, solution: "Osmosis: water moves from hypotonic (low solute) to hypertonic (high solute)." },
    { text: "Which part of the flower develops into fruit?", options: ["Ovule","Ovary","Stigma","Receptacle"], correct: 1, solution: "Fruit develops from the ovary after fertilisation." },
    { text: "The double helix structure of DNA was proposed in:", options: ["1950","1953","1960","1944"], correct: 1, solution: "Watson & Crick proposed the double helix in 1953." },
    { text: "Cytokinesis in plant cells occurs by:", options: ["Cleavage furrow","Cell plate formation","Both","Neither"], correct: 1, solution: "In plants, a cell plate forms at the metaphase plate during cytokinesis." },
    { text: "Which plant hormone inhibits growth?", options: ["Auxin","Gibberellin","Cytokinin","Abscisic acid"], correct: 3, solution: "Abscisic acid (ABA) = stress hormone; inhibits growth, promotes dormancy." },
    { text: "The 'lock and key' model of enzyme action was proposed by:", options: ["Koshland","Emil Fischer","Michaelis","Pauling"], correct: 1, solution: "Emil Fischer (1894) proposed the lock-and-key model of enzyme specificity." },
    { text: "Root nodules fixing nitrogen are found in:", options: ["Cereals","Legumes","Grasses","Fungi"], correct: 1, solution: "Legumes host Rhizobium in root nodules for biological nitrogen fixation." },
    { text: "Which type of RNA carries amino acids to the ribosome?", options: ["mRNA","rRNA","tRNA","hnRNA"], correct: 2, solution: "tRNA (transfer RNA) carries specific amino acids to the ribosome during translation." },
    { text: "Lignin is found in:", options: ["Parenchyma","Collenchyma","Sclerenchyma","Epidermis"], correct: 2, solution: "Sclerenchyma cell walls are impregnated with lignin for mechanical support." },
    { text: "Apical dominance is caused by:", options: ["Cytokinin","Gibberellin","Auxin","Ethylene"], correct: 2, solution: "High auxin concentration from apical bud suppresses lateral bud growth." },
    { text: "The first organism used in recombinant DNA technology:", options: ["Yeast","E. coli","Agrobacterium","Bacillus"], correct: 1, solution: "E. coli was the first organism used in recombinant DNA technology (Boyer & Cohen, 1973)." },
    { text: "CAM photosynthesis is an adaptation for:", options: ["Aquatic plants","Xerophytes","Shade plants","Arctic plants"], correct: 1, solution: "CAM (Crassulacean Acid Metabolism) is found in desert succulents." },
    { text: "Pollen tube carries:", options: ["Female gametes","Male gametes","Both","Spores"], correct: 1, solution: "Pollen tube delivers two male gametes (sperm cells) to the ovule." },
    { text: "The Operon model of gene regulation was given by:", options: ["Jacob & Monod","Watson & Crick","Beadle & Tatum","Avery"], correct: 0, solution: "Jacob and Monod proposed the lac operon model for gene regulation (1961)." },
    { text: "Active transport requires:", options: ["No energy","ATP","Osmosis","Diffusion"], correct: 1, solution: "Active transport moves solutes against concentration gradient, requiring ATP." },
    { text: "Chlorophyll 'a' absorbs light maximally at:", options: ["430 nm & 662 nm","500 nm & 600 nm","400 nm & 700 nm","450 nm & 700 nm"], correct: 0, solution: "Chlorophyll a: max absorption at ~430 nm (blue) and ~662 nm (red)." },
    { text: "Which vitamin is synthesised in the skin in sunlight?", options: ["Vitamin A","Vitamin B","Vitamin C","Vitamin D"], correct: 3, solution: "UV light converts 7-dehydrocholesterol in skin to Vitamin D." },
    { text: "The term 'gene' was coined by:", options: ["Mendel","Morgan","Johannsen","de Vries"], correct: 2, solution: "Wilhelm Johannsen coined the term 'gene' in 1909." },
    { text: "Guttation occurs through:", options: ["Stomata","Hydathodes","Lenticels","Cuticle"], correct: 1, solution: "Guttation (exudation of liquid water) occurs through hydathodes." },
    { text: "Vernalisation refers to promotion of flowering by:", options: ["Light","Low temperature","High temperature","Drought"], correct: 1, solution: "Vernalisation = exposure to prolonged cold promotes flowering." },
    { text: "In angiosperms, triple fusion forms:", options: ["Zygote","Endosperm","Embryo","Seed coat"], correct: 1, solution: "Triple fusion: one sperm + 2 polar nuclei  triploid (3n) endosperm." },
    { text: "Which plastid stores starch?", options: ["Chloroplast","Chromoplast","Amyloplast","Elaioplast"], correct: 2, solution: "Amyloplasts (leucoplasts) store starch grains." },
    { text: "The first stable product of C4 cycle is:", options: ["3-PGA","OAA","Malate","RuBP"], correct: 1, solution: "In C4 plants, CO is first fixed into oxaloacetate (OAA)  a 4-carbon compound." },
    { text: "Binomial nomenclature was introduced by:", options: ["Darwin","Linnaeus","Lamarck","Whittaker"], correct: 1, solution: "Carl Linnaeus introduced the binomial nomenclature system." },
    { text: "Water potential of pure water is:", options: ["+1","1","0","Variable"], correct: 2, solution: "Pure water has maximum water potential = 0 (arbitrary reference)." },
    { text: "Which enzyme joins Okazaki fragments?", options: ["Helicase","Primase","DNA Ligase","DNA Polymerase I"], correct: 2, solution: "DNA Ligase seals nicks and joins Okazaki fragments on the lagging strand." },
    { text: "Photorespiration occurs in:", options: ["C3 plants","C4 plants","CAM plants","Bryophytes"], correct: 0, solution: "Photorespiration is significant in C3 plants (RuBisCO oxygenase activity)." },
    { text: "Which hormone promotes seed germination?", options: ["ABA","Ethylene","Gibberellin","Cytokinin"], correct: 2, solution: "Gibberellins promote seed germination and stem elongation." },
    { text: "The movement of phloem sap is explained by:", options: ["Cohesion-tension","Pressure flow hypothesis","Root pressure","Diffusion"], correct: 1, solution: "Munch's pressure flow (mass flow) hypothesis explains phloem translocation." },
  ];
  const zoology = [
    { text: "Scientific name of human being:", options: ["Homo sapiens","Homo erectus","Pan troglodytes","Gorilla gorilla"], correct: 0, solution: "Humans: Homo sapiens (kingdom Animalia, family Hominidae)." },
    { text: "Universal blood donor group:", options: ["A","B","AB","O"], correct: 3, solution: "Blood group O (Rh) lacks A & B antigens  universal donor." },
    { text: "Functional unit of kidney:", options: ["Neuron","Nephron","Alveolus","Villus"], correct: 1, solution: "Nephron filters blood; ~1 million per kidney." },
    { text: "The fluid-mosaic model of cell membrane was proposed by:", options: ["Danielli & Davson","Singer & Nicolson","Robertson","Gorter & Grendel"], correct: 1, solution: "Singer and Nicolson (1972) proposed the fluid mosaic model." },
    { text: "Insulin is secreted by:", options: ["-cells","-cells","-cells","F-cells"], correct: 1, solution: "-cells of islets of Langerhans secrete insulin." },
    { text: "The largest WBC is:", options: ["Neutrophil","Lymphocyte","Monocyte","Basophil"], correct: 2, solution: "Monocytes are the largest white blood cells." },
    { text: "Haemoglobin contains which metal?", options: ["Cu","Fe","Zn","Mg"], correct: 1, solution: "Haemoglobin contains iron (Fe) in its haem group." },
    { text: "Which part of brain controls body temperature?", options: ["Cerebrum","Cerebellum","Hypothalamus","Medulla"], correct: 2, solution: "Hypothalamus is the thermoregulatory centre of the brain." },
    { text: "The number of pairs of cranial nerves in humans:", options: ["10","12","31","21"], correct: 1, solution: "Humans have 12 pairs of cranial nerves." },
    { text: "Site of fertilisation in females:", options: ["Uterus","Ovary","Fallopian tube","Cervix"], correct: 2, solution: "Fertilisation normally occurs in the ampulla of the fallopian (uterine) tube." },
    { text: "Which vitamin is essential for blood clotting?", options: ["Vitamin A","Vitamin D","Vitamin K","Vitamin C"], correct: 2, solution: "Vitamin K is required for synthesis of clotting factors (II, VII, IX, X)." },
    { text: "The pacemaker of the heart is:", options: ["AV node","SA node","Bundle of His","Purkinje fibres"], correct: 1, solution: "SA (sinoatrial) node initiates the heartbeat  the natural pacemaker." },
    { text: "AIDS is caused by:", options: ["Bacteria","Fungus","Virus (HIV)","Protozoan"], correct: 2, solution: "AIDS: Acquired Immune Deficiency Syndrome caused by Human Immunodeficiency Virus." },
    { text: "Peristalsis is the movement of:", options: ["Blood","Food in alimentary canal","Urine","Lymph"], correct: 1, solution: "Peristalsis: rhythmic muscular contractions propel food through the gut." },
    { text: "The process by which organisms maintain internal stability:", options: ["Homeostasis","Metamorphosis","Osmoregulation","Thermoregulation"], correct: 0, solution: "Homeostasis is the maintenance of a stable internal environment." },
    { text: "Spermatogenesis occurs in:", options: ["Epididymis","Seminiferous tubules","Vas deferens","Prostate"], correct: 1, solution: "Spermatogenesis (sperm production) occurs in seminiferous tubules of testes." },
    { text: "The 'Central Dogma' of molecular biology is:", options: ["DNARNAProtein","RNADNAProtein","ProteinRNADNA","DNAProteinRNA"], correct: 0, solution: "Crick's Central Dogma: DNA is transcribed to RNA, which is translated to protein." },
    { text: "Which is the largest endocrine gland?", options: ["Adrenal","Thyroid","Pituitary","Pancreas"], correct: 1, solution: "Thyroid gland is the largest pure endocrine gland." },
    { text: "Phagocytosis is the engulfing of:", options: ["Gases","Solid particles","Liquids","Ions"], correct: 1, solution: "Phagocytosis = 'cell eating'  engulfing of solid particles/microbes." },
    { text: "Human genome has approximately how many protein-coding genes?", options: ["100,000","30,000","20,00025,000","2,000"], correct: 2, solution: "Human genome contains ~20,00025,000 protein-coding genes." },
    { text: "Which organ produces bile?", options: ["Pancreas","Gall bladder","Liver","Stomach"], correct: 2, solution: "Bile is produced by hepatocytes of the liver; stored in gall bladder." },
    { text: "Transcription is the synthesis of:", options: ["DNA from DNA","RNA from DNA","Protein from RNA","DNA from RNA"], correct: 1, solution: "Transcription: RNA polymerase synthesises mRNA from DNA template." },
    { text: "The 'fight or flight' hormone is:", options: ["Insulin","Adrenaline","Thyroxine","Cortisol"], correct: 1, solution: "Adrenaline (epinephrine) from adrenal medulla triggers fight-or-flight response." },
    { text: "Erythroblastosis fetalis occurs due to:", options: ["ABO incompatibility","Rh incompatibility","Both","Neither"], correct: 1, solution: "Rh incompatibility between Rh mother and Rh+ fetus causes haemolytic disease." },
    { text: "The protein coat of a virus is called:", options: ["Capsid","Envelope","Nucleic acid","Plasmid"], correct: 0, solution: "Capsid is the protein shell that surrounds a virus's nucleic acid." },
    { text: "Which type of immunity is provided by antibodies?", options: ["Innate","Cell-mediated","Humoral","Non-specific"], correct: 2, solution: "Humoral immunity: B-cells produce antibodies (immunoglobulins) in blood." },
    { text: "Spinal cord is enclosed in:", options: ["Skull","Vertebral column","Ribs","Sternum"], correct: 1, solution: "Spinal cord runs through the vertebral (spinal) column for protection." },
    { text: "ECG records activity of:", options: ["Brain","Muscle","Heart","Kidney"], correct: 2, solution: "Electrocardiogram (ECG) records the electrical activity of the heart." },
    { text: "Which blood cells lack a nucleus in maturity?", options: ["WBC","RBC","Platelets","Both B and C"], correct: 3, solution: "Mature RBCs and platelets (thrombocytes) lack a nucleus." },
    { text: "The hormone that regulates calcium levels:", options: ["ADH","PTH","LH","TSH"], correct: 1, solution: "Parathyroid hormone (PTH) raises blood calcium levels." },
    { text: "Henle's loop is found in:", options: ["Liver","Brain","Kidney","Heart"], correct: 2, solution: "Loop of Henle is part of the nephron in the kidney." },
    { text: "Corpus luteum secretes:", options: ["Estrogen only","Progesterone","FSH","LH"], correct: 1, solution: "Corpus luteum (ruptured follicle) secretes mainly progesterone." },
    { text: "Which cells produce antibodies?", options: ["T-lymphocytes","B-lymphocytes","NK cells","Macrophages"], correct: 1, solution: "Activated B-lymphocytes differentiate into plasma cells that secrete antibodies." },
    { text: "Acrosome reaction occurs in:", options: ["Egg","Sperm","Zygote","Embryo"], correct: 1, solution: "Acrosome (cap) of sperm releases enzymes to penetrate the zona pellucida of the egg." },
    { text: "Normal blood pressure (adult):", options: ["120/80","80/120","140/90","110/70"], correct: 0, solution: "Normal BP: systolic 120 mmHg / diastolic 80 mmHg." },
    { text: "Malaria is caused by:", options: ["Leishmania","Plasmodium","Trypanosoma","Entamoeba"], correct: 1, solution: "Malaria is caused by Plasmodium species (P. falciparum is most dangerous)." },
    { text: "Which gland is both exocrine and endocrine?", options: ["Thyroid","Adrenal","Pancreas","Pituitary"], correct: 2, solution: "Pancreas: exocrine (digestive enzymes via duct) + endocrine (insulin/glucagon)." },
    { text: "The contractile proteins in muscle fibre:", options: ["Collagen & elastin","Actin & myosin","Keratin & tubulin","Fibrin & fibrinogen"], correct: 1, solution: "Actin (thin) and myosin (thick) filaments generate muscle contraction." },
    { text: "Which connects muscle to bone?", options: ["Ligament","Cartilage","Tendon","Fascia"], correct: 2, solution: "Tendons (fibrous connective tissue) attach muscle to bone." },
    { text: "Zona pellucida is the layer surrounding:", options: ["Ovary","Uterus","Oocyte","Embryo"], correct: 2, solution: "Zona pellucida is the glycoprotein coat around the oocyte/early embryo." },
    { text: "PCR (Polymerase Chain Reaction) was invented by:", options: ["Watson","Mullis","Sanger","Boyer"], correct: 1, solution: "Kary Mullis invented PCR in 1983 (Nobel Prize 1993)." },
    { text: "Dialysis mimics the function of:", options: ["Heart","Liver","Kidney","Lungs"], correct: 2, solution: "Dialysis replaces the filtration/excretory function of failed kidneys." },
    { text: "Which disease is caused by deficiency of Vitamin B12?", options: ["Scurvy","Rickets","Pernicious anaemia","Pellagra"], correct: 2, solution: "Vitamin B12 deficiency causes pernicious (megaloblastic) anaemia." },
    { text: "The master gland of endocrine system:", options: ["Thyroid","Adrenal","Pituitary","Hypothalamus"], correct: 2, solution: "Pituitary gland is called the 'master gland'; it controls other endocrine glands." },
  ];

  const makeQs = (arr, subject) =>
    arr.map((q, i) => ({
      id: `${year}-${subject}-${i + 1}`,
      subject, number: i + 1, year,
      ...q,
      // Slightly vary options order by seed for different years
      options: seed % 2 === 0 ? q.options : q.options
    }));

  return [
    ...makeQs(physics, "Physics"),
    ...makeQs(chemistry, "Chemistry"),
    ...makeQs(botany, "Botany"),
    ...makeQs(zoology, "Zoology"),
  ];
};

// 
// UTILS
// 
const fmt = (s) => {
  const h = Math.floor(s / 3600).toString().padStart(2, "0");
  const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${h}:${m}:${sec}`;
};

const statusColor = (st) => ({
  answered: "#22c55e", marked: "#a855f7", "marked-answered": "#a855f7",
  "not-visited": "#374151", "not-answered": "#ef4444"
}[st] || "#374151");

// 
// SUPABASE HELPERS
// 
// 
// SUPABASE HELPERS  with full error handling & diagnosis
// 

const isSupabaseConfigured = () =>
  SUPABASE_URL && SUPABASE_ANON_KEY &&
  !SUPABASE_URL.includes("your-project") &&
  !SUPABASE_ANON_KEY.includes("your-anon") &&
  SUPABASE_URL.startsWith("https://");

// Translates raw Supabase/network errors into plain English
function friendlyError(error, context = "") {
  if (!error) return null;
  const msg = (error.message || error.toString()).toLowerCase();

  if (msg.includes("invalid api key") || msg.includes("invalid token") || msg.includes("jwt"))
    return "Your Supabase API key is invalid. Copy the anon key from Project Settings  API.";
  if (msg.includes("relation") && msg.includes("does not exist"))
    return `The "${context}" table does not exist. Run the SQL setup in Supabase SQL Editor.`;
  if (msg.includes("row-level security") || msg.includes("rls") || msg.includes("new row violates") || msg.includes("permission denied"))
    return `Permission denied on "${context}" table. Add a Row Level Security policy in Supabase  Authentication  Policies.`;
  if (msg.includes("invalid login") || msg.includes("invalid credentials") || msg.includes("email not confirmed"))
    return error.message; // pass these through as-is, they're already user-friendly
  if (msg.includes("network") || msg.includes("fetch") || msg.includes("failed to fetch") || msg.includes("networkerror"))
    return "Network error  check your internet connection and that your Supabase URL is correct.";
  if (msg.includes("not found") || msg.includes("404"))
    return "Supabase project not found. Check your Project URL in App.jsx line 8.";
  if (msg.includes("email already registered") || msg.includes("already registered"))
    return "This email is already registered. Try signing in instead.";
  if (msg.includes("password") && msg.includes("short"))
    return "Password must be at least 6 characters.";
  if (msg.includes("signup") && msg.includes("disabled"))
    return "Sign-ups are disabled in your Supabase project. Enable Email provider in Authentication  Providers.";

  return error.message || "Unknown error. Check the browser console (F12) for details.";
}

// Diagnose config issues before even calling Supabase
function diagnoseConfig() {
  if (!SUPABASE_URL || SUPABASE_URL.includes("your-project"))
    return "SUPABASE_URL is not set. Open App.jsx and replace the placeholder on line 8.";
  if (!SUPABASE_URL.startsWith("https://"))
    return "SUPABASE_URL must start with https://";
  if (SUPABASE_URL.endsWith("/"))
    return "SUPABASE_URL must NOT have a trailing slash. Remove the / at the end.";
  if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes("your-anon"))
    return "SUPABASE_ANON_KEY is not set. Open App.jsx and replace the placeholder on line 9.";
  if (!SUPABASE_ANON_KEY.startsWith("eyJ"))
    return "SUPABASE_ANON_KEY looks wrong  it should start with eyJ. Copy the anon key from Project Settings  API.";
  return null;
}

async function sbSignUp(email, password, name) {
  const configErr = diagnoseConfig();
  if (configErr) return { data: null, error: { message: configErr } };
  try {
    const { data, error } = await supabase.auth.signUp({
      email, password, options: { data: { full_name: name } }
    });
    return { data, error: error ? { message: friendlyError(error, "auth") } : null };
  } catch (e) {
    return { data: null, error: { message: friendlyError(e, "auth") } };
  }
}

async function sbSignIn(email, password) {
  const configErr = diagnoseConfig();
  if (configErr) return { data: null, error: { message: configErr } };
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error: error ? { message: friendlyError(error, "auth") } : null };
  } catch (e) {
    return { data: null, error: { message: friendlyError(e, "auth") } };
  }
}

async function sbSignOut() {
  try { await supabase.auth.signOut(); } catch (_) {}
}

// Returns { questions, error, source }
// source = "supabase" | "localStorage" | "local_fallback"
async function sbFetchQuestions(paperId = "NEET_2025") {
  const configErr = diagnoseConfig();
  if (configErr) return { questions: null, error: configErr, source: null };

  try {
    const { data, error } = await supabase
      .from("questions")
      .select("id, number, subject, type, question_text, equation, diagram_url, option_a, option_b, option_c, option_d, correct, solution_text, solution_eq, paper_id")
      .eq("paper_id", paperId)
      .order("number", { ascending: true });

    if (error) return { questions: null, error: friendlyError(error, "questions"), source: null };
    if (!data || data.length === 0) {
      return {
        questions: null,
        error: `No questions found with paper_id = "${paperId}". Add questions in Supabase  Table Editor  questions, or run the SQL insert script.`,
        source: null
      };
    }

    // Map DB columns  app format (supports text/equation/diagram types)
    const questions = data.map(q => ({
      id:            String(q.id),
      number:        q.number,
      subject:       q.subject,
      type:          q.type || "text",
      question_text: q.question_text || q.text || "",
      equation:      q.equation || "",
      diagram_url:   q.diagram_url || "",
      diagram_data:  "",  // loaded on-demand per question
      options:       [q.option_a, q.option_b, q.option_c, q.option_d],
      correct:       q.correct,
      solution_text:         q.solution_text || q.solution || "",
      solution_eq:           q.solution_eq || "",
      solution_diagram_data: "",  // loaded on-demand
      year:                  2025,
    }));

    return { questions, error: null, source: "supabase" };
  } catch (e) {
    return { questions: null, error: friendlyError(e, "questions"), source: null };
  }
}

// Returns { error } or null
async function sbSaveResult(userId, payload) {
  if (!isSupabaseConfigured()) return null;
  try {
    const { error } = await supabase
      .from("test_results")
      .insert([{ user_id: userId, ...payload, created_at: new Date().toISOString() }]);
    if (error) console.warn("Could not save result:", friendlyError(error, "test_results"));
  } catch (e) {
    console.warn("Could not save result:", e.message);
  }
}

// Returns array of history rows (never throws)
async function sbGetHistory(userId) {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await supabase
      .from("test_results")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) { console.warn("History fetch error:", friendlyError(error, "test_results")); return []; }
    return data || [];
  } catch (e) {
    console.warn("History fetch error:", e.message);
    return [];
  }
}

// 
// STYLES HELPERS
// 
const btn = (variant = "primary", extra = {}) => {
  const base = {
    border: "none", borderRadius: 10, padding: "11px 24px", fontWeight: 600,
    cursor: "pointer", fontSize: "0.9rem", fontFamily: "inherit", transition: "all 0.15s", ...extra
  };
  if (variant === "primary") return { ...base, background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "#fff" };
  if (variant === "success") return { ...base, background: "linear-gradient(135deg,#16a34a,#22c55e)", color: "#fff" };
  if (variant === "danger")  return { ...base, background: "linear-gradient(135deg,#b91c1c,#ef4444)", color: "#fff" };
  if (variant === "blue")    return { ...base, background: "linear-gradient(135deg,#1d4ed8,#2563eb)", color: "#fff" };
  if (variant === "ghost")   return { ...base, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", color: "#cbd5e1" };
  if (variant === "mark")    return { ...base, background: "rgba(168,85,247,0.2)", border: "1px solid rgba(168,85,247,0.5)", color: "#c084fc" };
  if (variant === "clear")   return { ...base, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" };
  return base;
};

const card = (extra = {}) => ({
  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: 16, ...extra
});

const input = { width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 10, padding: "11px 14px", color: "#e2e8f0", fontSize: "0.95rem",
  fontFamily: "inherit", outline: "none", boxSizing: "border-box" };

// 
// LANDING SCREEN
function LandingScreen({ onStudent, onAdmin, branding = {} }) {
  // Hide the pre-landing overlay (rendered in index.html for instant display)
  React.useEffect(() => {
    if (window.__hidePrelanding) window.__hidePrelanding();
  }, []);

  const bgType = branding.bg_type || "gradient";
  const bgStyle = bgType === "solid"
    ? { background: branding.bg_solid_color || "#0f172a" }
    : bgType === "image" && branding.bg_image_data
    ? { backgroundImage: "url(" + branding.bg_image_data + ")", backgroundSize: "cover", backgroundPosition: "center" }
    : { background: "linear-gradient(135deg," + (branding.bg_gradient_from || "#0f0c29") + " 0%," + (branding.bg_gradient_to || "#302b63") + " 50%," + (branding.bg_gradient_from || "#24243e") + " 100%)" };

  return (
    <div style={{ minHeight: "100vh", ...bgStyle, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Crimson Pro', Georgia, serif", padding: "1.5rem" }}>
      <div style={{ width: "100%", maxWidth: 460, textAlign: "center" }}>
        {/* Logo */}
        {(branding.logo_data || branding.logo_url) && (
          <img src={branding.logo_data || branding.logo_url} alt="logo"
            style={{ maxHeight: 90, maxWidth: 260, objectFit: "contain", display: "block", margin: "0 auto 20px", borderRadius: 8 }} />
        )}
        {/* Badge */}
        {branding.show_badge !== "false" && (
          <div style={{ display: "inline-block", background: "rgba(168,85,247,0.2)", border: "1px solid rgba(168,85,247,0.5)", borderRadius: 99, padding: "6px 20px", fontSize: 12, color: branding.badge_color||"#c084fc", letterSpacing: 2, textTransform: "uppercase", marginBottom: 24, fontFamily: branding.font_family||"monospace" }}>
            {branding.badge_text || "NTA NEET UG 2025"}
          </div>
        )}
        <h1 style={{ color: branding.title_color||"#fff", fontSize: "2.2rem", fontWeight: 700, margin: "0 0 10px", fontFamily: branding.font_family||"'Crimson Pro', Georgia, serif" }}>
          {branding.platform_name || "Mock Test Platform"}
        </h1>
        <p style={{ color: branding.tagline_color||"#64748b", margin: "0 0 48px", fontSize: 15, fontFamily: branding.font_family||"'Crimson Pro', Georgia, serif" }}>
          {branding.platform_tagline || "Select your role to continue"}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="mob-grid1">
          <button onClick={onStudent} style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.35)", borderRadius: 16, padding: "32px 20px", cursor: "pointer", fontFamily: "inherit", textAlign: "center" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(99,102,241,0.25)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(99,102,241,0.12)"}>
            <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>&#127891;</div>
            <div style={{ color: branding.card_text_color||"#a5b4fc", fontWeight: 700, fontSize: "1.1rem", marginBottom: 8, fontFamily: branding.font_family||"inherit" }}>Student</div>
            <div style={{ color: "#64748b", fontSize: 13 }}>Login to take the mock exam</div>
          </button>
          <button onClick={onAdmin} style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.3)", borderRadius: 16, padding: "32px 20px", cursor: "pointer", fontFamily: "inherit", textAlign: "center" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(168,85,247,0.22)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(168,85,247,0.1)"}>
            <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>&#128736;</div>
            <div style={{ color: branding.card_text_color||"#c084fc", fontWeight: 700, fontSize: "1.1rem", marginBottom: 8, fontFamily: branding.font_family||"inherit" }}>Admin</div>
            <div style={{ color: "#64748b", fontSize: 13 }}>Manage questions and results</div>
          </button>
        </div>
      </div>
    </div>
  );
}


// ADMIN AUTH SCREEN
function AdminAuthScreen({ onSuccess, onBack }) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [err,      setErr]      = useState("");
  const [loading,  setLoading]  = useState(false);

  const handleLogin = () => {
    setErr(""); setLoading(true);
    setTimeout(() => {
      if (email.trim() === ADMIN_EMAIL && password === ADMIN_PASS) {
        onSuccess();
      } else {
        setErr("Invalid admin credentials.");
      }
      setLoading(false);
    }, 400);
  };

  return (
    <div style={{ minHeight: "100vh", ...brandingBg(getBranding()), display: "flex", alignItems: "center", justifyContent: "center", fontFamily: brandingFont(getBranding()), padding: "1.5rem" }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 14, marginBottom: 24, fontFamily: "inherit" }}>
          &larr; Back
        </button>
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(168,85,247,0.25)", borderRadius: 20, padding: 28 }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>&#128736;</div>
            <h2 style={{ color: "#c084fc", margin: "0 0 6px", fontSize: "1.3rem", fontWeight: 700 }}>Admin Login</h2>
            <p style={{ color: "#64748b", margin: 0, fontSize: 13 }}>Restricted access</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ color: "#94a3b8", fontSize: 12, display: "block", marginBottom: 6 }}>Admin Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@example.com"
                style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "11px 14px", color: "#e2e8f0", fontSize: "0.95rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ color: "#94a3b8", fontSize: 12, display: "block", marginBottom: 6 }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password"
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "11px 14px", color: "#e2e8f0", fontSize: "0.95rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
            </div>
            {err && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 14px", color: "#f87171", fontSize: 13 }}>{err}</div>}
            <button onClick={handleLogin} disabled={loading}
              style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "#fff", border: "none", borderRadius: 10, padding: "13px", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", fontSize: "0.95rem", fontFamily: "inherit", opacity: loading ? 0.7 : 1 }}>
              {loading ? "Verifying..." : "Enter Admin Panel"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ADMIN PORTAL - image compression helper
const MAX_W_IMG = 800;
const QUALITY_IMG = 0.78;
function compressToBase64(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = img.width > MAX_W_IMG ? MAX_W_IMG / img.width : 1;
      const cv = document.createElement("canvas");
      cv.width  = Math.round(img.width  * scale);
      cv.height = Math.round(img.height * scale);
      cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
      const b64 = cv.toDataURL("image/jpeg", QUALITY_IMG);
      resolve({ b64, kb: Math.round((b64.length * 3) / 4 / 1024), w: cv.width, h: cv.height });
    };
    img.onerror = () => reject(new Error("Could not read image."));
    img.src = url;
  });
}
const abtn = (v) => {
  const b = { border: "none", borderRadius: 9, padding: "9px 18px", fontWeight: 600, cursor: "pointer", fontSize: "0.88rem", fontFamily: "inherit" };
  if (v === "primary") return { ...b, background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "#fff" };
  if (v === "success") return { ...b, background: "linear-gradient(135deg,#16a34a,#22c55e)", color: "#fff" };
  if (v === "danger")  return { ...b, background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" };
  if (v === "ghost")   return { ...b, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#cbd5e1" };
  if (v === "sm")      return { ...b, padding: "5px 12px", fontSize: "0.78rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8" };
  return b;
};
const ainput = { width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "10px 14px", color: "#e2e8f0", fontSize: "0.92rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box" };
const alabel = { color: "#94a3b8", fontSize: 11, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 };
const acard  = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 16 };
const aempty = () => ({ number: "", subject: "Physics", question_text: "", equation: "", diagram_data: "", option_a: "", option_b: "", option_c: "", option_d: "", correct: "0", solution_text: "", solution_eq: "", solution_diagram_data: "", paper_id: "NEET_2025", chapter: "", difficulty: "medium" });
const SUBJ_COLORS_A = { Physics: "#6366f1", Chemistry: "#f59e0b", Botany: "#22c55e", Zoology: "#f43f5e" };

// Helper mini-components for admin
function DeleteResultPanel({ supabase, onDone, abtn, ainput }) {
  const [rid, setRid] = React.useState("");
  const [msg, setMsg] = React.useState(null);
  const del = async () => {
    if (!rid.trim()) { setMsg("Enter a result ID."); return; }
    const { error } = await supabase.from("test_results").delete().eq("id", rid.trim());
    if (error) setMsg("Error: " + error.message);
    else { setMsg("Deleted successfully."); setRid(""); if(onDone) onDone(); }
  };
  return (
    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
      <input value={rid} onChange={e=>setRid(e.target.value)} placeholder="Result UUID..." style={{ ...ainput, flex:1, fontSize:12 }} />
      <button onClick={del} style={{ ...abtn("danger"), padding:"9px 16px", fontSize:12, whiteSpace:"nowrap" }}>Delete</button>
      {msg && <span style={{ color:msg.includes("Error")?"#f87171":"#4ade80", fontSize:12 }}>{msg}</span>}
    </div>
  );
}

function RemoveFromBatchesPanel({ supabase, abtn, ainput }) {
  const [email, setEmail] = React.useState("");
  const [msg,   setMsg]   = React.useState(null);
  const remove = async () => {
    if (!email.includes("@")) { setMsg("Enter a valid email."); return; }
    const { error, count } = await supabase.from("batch_members").delete().eq("email", email.trim().toLowerCase());
    if (error) setMsg("Error: " + error.message);
    else setMsg("Removed from all batches.");
  };
  return (
    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
      <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="student@example.com" style={{ ...ainput, flex:1, fontSize:12 }} />
      <button onClick={remove} style={{ ...abtn("danger"), padding:"9px 16px", fontSize:12, whiteSpace:"nowrap" }}>Remove</button>
      {msg && <span style={{ color:msg.includes("Error")?"#f87171":"#4ade80", fontSize:12 }}>{msg}</span>}
    </div>
  );
}

// ADMIN SCREEN - full page with CSV upload and Settings panel
function AdminScreen({ onSignOut }) {
  const [tab,       setTab]       = useState("add");
  const [form,      setForm]      = useState(aempty());
  const [questions, setQuestions] = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [imgInfo,   setImgInfo]   = useState(null);
  const [msg,       setMsg]       = useState(null);
  const [search,    setSearch]    = useState("");
  const [paperFilter, setPaperFilter] = useState("NEET_2025");
  const [subFilter, setSubFilter] = useState("All");
  const [editId,    setEditId]    = useState(null);
  const [csvMsg,    setCsvMsg]    = useState(null);
  const [csvPreview,setCsvPreview]= useState([]);
  const [csvLoading,setCsvLoading]= useState(false);
  const [imgBulkMsg,     setImgBulkMsg]     = useState(null);
  const [imgBulkFiles,   setImgBulkFiles]   = useState([]);
  const [imgBulkLoading, setImgBulkLoading] = useState(false);
  const [imgBulkProgress,setImgBulkProgress]= useState("");
  const [settings,  setSettings]  = useState({});
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg,    setSettingsMsg]    = useState(null);
  const [students,  setStudents]  = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [brandingForm,  setBrandingForm]  = useState({});
  const [brandingMsg,   setBrandingMsg]   = useState(null);
  const [brandingLoading,setBrandingLoading]=useState(false);
  const [studentTab,      setStudentTab]      = useState("results"); // results | add
  const [analyticsData,   setAnalyticsData]   = useState(null);
  const [analyticsLoading,setAnalyticsLoading]= useState(false);
  const [batches,         setBatches]         = useState([]);
  const [batchLoading,    setBatchLoading]     = useState(false);
  const [batchMsg,        setBatchMsg]         = useState(null);
  const [selectedBatch,   setSelectedBatch]    = useState(null); // batch object being edited
  const [batchForm,       setBatchForm]        = useState({ name:"", description:"" });
  const [batchSettings,   setBatchSettings]    = useState({});
  const [batchMembers,    setBatchMembers]     = useState([]);
  const [batchMemberInput,setBatchMemberInput] = useState(""); // paste emails
  const [batchMemberCsv,  setBatchMemberCsv]  = useState(null);
  const [batchView,       setBatchView]        = useState("list"); // list | edit | tests
  const [batchTests,      setBatchTests]       = useState([]);
  const [selectedTest,    setSelectedTest]     = useState(null);
  const [testForm,        setTestForm]         = useState({ name:"", description:"", paper_id:"NEET_2025", exam_window_start:"", exam_window_end:"", attempt_limit:"1", access_code:"", access_code_enabled:"false", resume_code:"", status:"scheduled", manual_release:"false" });
  const [batchTestView,   setBatchTestView]    = useState("list"); // list | create | edit | report
  const [testMsg,         setTestMsg]          = useState(null);
  const [testLoading,     setTestLoading]      = useState(false);
  const [testReports,     setTestReports]      = useState([]);
  const [testReportLoading,setTestReportLoading] = useState(false);
  const [addStudentRows,  setAddStudentRows]   = useState([{ email:"", password:"", name:"" }]);
  const [addStudentMsg,   setAddStudentMsg]    = useState(null);
  const [addStudentLoading,setAddStudentLoading] = useState(false);
  const [stuCsvMsg,       setStuCsvMsg]       = useState(null);
  const [stuCsvRows,      setStuCsvRows]      = useState(null);
  const [stuCsvPreview,   setStuCsvPreview]   = useState([]);
  const [stuCsvLoading,   setStuCsvLoading]   = useState(false);
  const [stuCsvProgress,  setStuCsvProgress]  = useState("");
  const afileRef   = useRef(null);
  const csvFileRef = useRef(null);

  useEffect(() => {
    if (tab === "list")     loadAll(paperFilter);
    if (tab === "settings") loadSettings();
    if (tab === "students") loadStudents();
    if (tab === "branding") (async () => {
      const defaults = {
        logo_data:"", logo_url:"", platform_name:"Mock Test Platform",
        platform_tagline:"Select your role to continue", bg_type:"gradient",
        bg_gradient_from:"#0f0c29", bg_gradient_to:"#302b63",
        bg_solid_color:"#0f172a", bg_image_data:"", accent_color:"#7c3aed",
        show_badge:"true", badge_text:"NTA NEET UG 2025",
        font_family:"Georgia, serif", title_color:"#ffffff",
        tagline_color:"#94a3b8", badge_color:"#c084fc", card_text_color:"#a5b4fc"
      };
      setBrandingForm(defaults); // show defaults immediately so UI is never blank
      try {
        const { data } = await supabase.from("branding").select("key,value");
        if (data && data.length > 0) {
          const b = { ...defaults };
          data.forEach(r => { b[r.key] = r.value; });
          setBrandingForm(b);
        }
      } catch (_) {}
    })();
  }, [tab]);

  const ff = (k, v) => setForm(p => ({ ...p, [k]: v }));

  //  Load all questions 
  const loadAll = async (pid) => {
    setLoading(true);
    const usePaper = pid || paperFilter || "NEET_2025";
    const { data, error } = await supabase.from("questions")
      .select("id,number,subject,type,question_text,equation,diagram_data,option_a,option_b,option_c,option_d,correct,solution_text,solution_eq,solution_diagram_data,paper_id")
      .eq("paper_id", usePaper).order("subject").order("number");
    if (!error) setQuestions(data || []);
    else setMsg({ type: "error", text: error.message });
    setLoading(false);
  };


  //  Load platform settings 
  const loadSettings = async () => {
    const { data } = await supabase.from("platform_settings").select("key,value");
    if (data) {
      const s = {};
      data.forEach(r => { s[r.key] = r.value; });
      setSettings(s);
    }
  };

  //  Save a single setting 
  const saveSetting = async (key, value) => {
    setSettings(p => ({ ...p, [key]: value }));
    await supabase.from("platform_settings")
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  };

  //  Save all settings at once 
  const saveAllSettings = async () => {
    setSavingSettings(true);
    const rows = Object.entries(settings).map(([key, value]) => ({
      key, value, updated_at: new Date().toISOString()
    }));
    const { error } = await supabase.from("platform_settings")
      .upsert(rows, { onConflict: "key" });
    setSavingSettings(false);
    if (error) setSettingsMsg({ type: "error", text: error.message });
    else {
      setSettingsMsg({ type: "success", text: "Settings saved successfully!" });
      setTimeout(() => setSettingsMsg(null), 3000);
    }
  };

  //  Load students 
  const [reportFilter,    setReportFilter]    = useState({ search:"", minScore:"", maxScore:"", dateFrom:"", dateTo:"", sortBy:"date", paperId:"", nameSearch:"" });
  const [studentReportEmail, setStudentReportEmail] = useState("");
  const [studentReportData,  setStudentReportData]  = useState([]);
  const [studentReportLoading, setStudentReportLoading] = useState(false);
  const [reportExpanded,  setReportExpanded]  = useState(null); // expanded row user_id+created_at

  const loadStudents = async () => {
    setLoadingStudents(true);
    const { data } = await supabase.from("test_results")
      .select("id, user_id, student_name, student_email, score, correct, wrong, unattempted, total, created_at, year, percentile, subject_times, paper_id")
      .order("created_at", { ascending: false })
      .limit(500);
    if (data) setStudents(data);
    setLoadingStudents(false);
  };

  // Download all reports as CSV
  const downloadReportsCSV = (rows) => {
    const header = "S.No,Name,Email,Paper ID,Date,Score,Percentage,Correct,Wrong,Unattempted,Percentile,Physics Time(s),Chemistry Time(s),Botany Time(s),Zoology Time(s)";
    const lines = rows.map((r, i) => {
      const d    = new Date(r.created_at).toLocaleDateString("en-IN");
      const pct  = Math.round((r.score / 720) * 100);
      const st   = r.subject_times || {};
      return [
        i+1, r.user_id.slice(0,12), d, r.score, pct+"%",
        r.correct, r.wrong, r.unattempted,
        r.percentile != null ? r.percentile+"%" : "N/A",
        st.Physics || 0, st.Chemistry || 0, st.Botany || 0, st.Zoology || 0
      ].join(",");
    });
    const csv  = header + "\n" + lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "exam_reports_" + new Date().toISOString().slice(0,10) + ".csv"; a.click();
    URL.revokeObjectURL(url);
  };

  //  Image compression 
  const handleImg = async (file) => {
    if (!file) return;
    if (!file.type.match(/image\/(jpe?g|png|webp)/i)) { setMsg({ type: "error", text: "Only JPG/PNG/WebP allowed." }); return; }
    setMsg({ type: "info", text: "Compressing..." });
    try {
      const { b64, kb, w, h } = await compressToBase64(file);
      ff("diagram_data", b64); setImgInfo({ kb, w, h });
      setMsg({ type: "success", text: "Image ready - " + w + "x" + h + "px, " + kb + "KB" });
    } catch (e) { setMsg({ type: "error", text: e.message }); }
  };

  //  Save single question 
  const handleSave = async () => {
    if (!form.number || isNaN(+form.number)) return setMsg({ type: "error", text: "Question number required." });
    if (!form.question_text.trim() && !form.equation.trim()) return setMsg({ type: "error", text: "Question text or equation required." });
    if (!form.option_a || !form.option_b || !form.option_c || !form.option_d) return setMsg({ type: "error", text: "All 4 options required." });
    setLoading(true);
    const payload = {
      number: +form.number, subject: form.subject,
      type: form.diagram_data && form.equation ? "equation+diagram" : form.diagram_data ? "diagram" : form.equation ? "equation" : "text",
      question_text: form.question_text, equation: form.equation,
      diagram_data: form.diagram_data, diagram_url: "",
      option_a: form.option_a, option_b: form.option_b, option_c: form.option_c, option_d: form.option_d,
      correct: +form.correct, solution_text: form.solution_text, solution_eq: form.solution_eq, solution_diagram_data: form.solution_diagram_data || "", paper_id: form.paper_id || "NEET_2025", chapter: form.chapter || "", difficulty: form.difficulty || "medium",
    };
    const { error } = editId
      ? await supabase.from("questions").update(payload).eq("id", editId)
      : await supabase.from("questions").insert([payload]);
    setLoading(false);
    if (error) { setMsg({ type: "error", text: error.message }); }
    else {
      setMsg({ type: "success", text: editId ? "Updated!" : "Saved!" });
      setForm(aempty()); setImgInfo(null); setEditId(null);
      setTimeout(() => setMsg(null), 3000);
    }
  };

  //  Edit question 
  const handleEdit = (q) => {
    setForm({ number: String(q.number), subject: q.subject || "Physics", question_text: q.question_text || "", equation: q.equation || "", diagram_data: q.diagram_data || "", option_a: q.option_a || "", option_b: q.option_b || "", option_c: q.option_c || "", option_d: q.option_d || "", correct: String(q.correct), solution_text: q.solution_text || "", solution_eq: q.solution_eq || "", solution_diagram_data: q.solution_diagram_data || "", paper_id: q.paper_id || "NEET_2025", chapter: q.chapter || "", difficulty: q.difficulty || "medium" });
    setImgInfo(q.diagram_data ? { kb: Math.round(q.diagram_data.length * 0.75 / 1024) } : null);
    setEditId(q.id); setTab("add");
  };

  //  Delete question 
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this question?")) return;
    const { error } = await supabase.from("questions").delete().eq("id", id);
    if (error) setMsg({ type: "error", text: error.message });
    else { loadAll(); setMsg({ type: "success", text: "Deleted." }); }
  };

  //  Delete ALL questions 
  const handleDeleteAll = async () => {
    if (!window.confirm("Delete ALL questions for paper '" + paperFilter + "'? Cannot be undone.")) return;
    const { error } = await supabase.from("questions").delete().eq("paper_id", paperFilter);
    if (error) setMsg({ type: "error", text: error.message });
    else { loadAll(); setMsg({ type: "success", text: "All questions deleted." }); }
  };

  //  CSV PARSER 
  // Expected CSV columns (header row required):
  // number,subject,question_text,equation,option_a,option_b,option_c,option_d,correct,solution_text,solution_eq
  // correct = 0(A) 1(B) 2(C) 3(D)
  const parseCSV = (text) => {
    const lines  = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return { rows: [], error: "CSV must have a header row and at least one data row." };

    const header = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_"));
    const required = ["number","subject","question_text","option_a","option_b","option_c","option_d","correct"];
    const missing = required.filter(r => !header.includes(r));
    if (missing.length) return { rows: [], error: "Missing columns: " + missing.join(", ") };

    const rows = [];
    const errors = [];
    for (let i = 1; i < lines.length; i++) {
      // Handle quoted fields with commas inside
      const cols = [];
      let cur = "", inQ = false;
      for (const ch of lines[i]) {
        if (ch === '"') { inQ = !inQ; }
        else if (ch === "," && !inQ) { cols.push(cur.trim()); cur = ""; }
        else { cur += ch; }
      }
      cols.push(cur.trim());

      const row = {};
      header.forEach((h, j) => { row[h] = (cols[j] || "").replace(/^"|"$/g, "").trim(); });

      if (!row.number || isNaN(+row.number)) { errors.push("Row " + i + ": invalid number"); continue; }
      if (!row.subject) { errors.push("Row " + i + ": missing subject"); continue; }
      if (!row.question_text && !row.equation) { errors.push("Row " + i + ": missing question_text"); continue; }
      if (!row.option_a || !row.option_b || !row.option_c || !row.option_d) { errors.push("Row " + i + ": missing options"); continue; }
      if (row.correct === "" || isNaN(+row.correct)) { errors.push("Row " + i + ": correct must be 0-3"); continue; }

      rows.push({
        number:        +row.number,
        subject:       row.subject,
        type:          row.equation ? "equation" : "text",
        question_text: row.question_text || "",
        equation:      row.equation || "",
        diagram_data:  "",
        diagram_url:   "",
        option_a:      row.option_a,
        option_b:      row.option_b,
        option_c:      row.option_c,
        option_d:      row.option_d,
        correct:       +row.correct,
        solution_text: row.solution_text || "",
        solution_eq:   row.solution_eq   || "",
        chapter:       row.chapter       || "",
        difficulty:    row.difficulty    || "medium",
        paper_id:      row.paper_id || "NEET_2025",
      });
    }
    return { rows, errors, error: null };
  };

  const handleCSVFile = (file) => {
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      setCsvMsg({ type: "error", text: "Please upload a .csv file." });
      return;
    }
    setCsvLoading(true);
    setCsvMsg({ type: "info", text: "Reading CSV..." });
    const reader = new FileReader();
    reader.onload = (e) => {
      const { rows, errors, error } = parseCSV(e.target.result);
      setCsvLoading(false);
      if (error) { setCsvMsg({ type: "error", text: error }); return; }
      setCsvPreview(rows.slice(0, 5));
      const errText = errors.length ? "\nWarnings: " + errors.slice(0, 3).join("; ") : "";
      setCsvMsg({ type: rows.length > 0 ? "success" : "error", text: rows.length + " questions ready to upload." + errText });
      // Store all parsed rows for upload
      csvFileRef._parsed = rows;
    };
    reader.readAsText(file);
  };

  const handleCSVUpload = async (replaceAll) => {
    const rows = csvFileRef._parsed;
    if (!rows || rows.length === 0) { setCsvMsg({ type: "error", text: "No valid rows to upload." }); return; }
    setCsvLoading(true);
    setCsvMsg({ type: "info", text: "Uploading..." });

    if (replaceAll) {
      await supabase.from("questions").delete().eq("paper_id", "NEET_2025");
    }

    // Upload in batches of 50
    let uploaded = 0, failed = 0;
    for (let i = 0; i < rows.length; i += 50) {
      const chunk = rows.slice(i, i + 50);
      const { error } = await supabase.from("questions").insert(chunk);
      if (error) failed += chunk.length;
      else uploaded += chunk.length;
      setCsvMsg({ type: "info", text: "Uploading... " + (uploaded + failed) + "/" + rows.length });
    }

    setCsvLoading(false);
    setCsvPreview([]);
    csvFileRef._parsed = null;
    if (failed > 0) setCsvMsg({ type: "error", text: uploaded + " uploaded, " + failed + " failed. Check for duplicate question numbers." });
    else setCsvMsg({ type: "success", text: uploaded + " questions uploaded successfully!" });
  };

  // Bulk image upload: compress all picked JPGs and match to questions by filename number
  const handleBulkImgFiles = async (files) => {
    setImgBulkMsg({ type: "info", text: "Reading " + files.length + " image files..." });
    const results = [];
    for (const file of Array.from(files)) {
      try {
        const b64 = await new Promise((res, rej) => {
          const img = new Image(), url = URL.createObjectURL(file);
          img.onload = () => {
            URL.revokeObjectURL(url);
            const scale = img.width > 800 ? 800/img.width : 1;
            const cv = document.createElement("canvas");
            cv.width  = Math.round(img.width  * scale);
            cv.height = Math.round(img.height * scale);
            cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
            res(cv.toDataURL("image/jpeg", 0.78));
          };
          img.onerror = () => rej(new Error("Cannot read " + file.name));
          img.src = url;
        });
        results.push({ name: file.name, b64 });
      } catch (e) {
        results.push({ name: file.name, b64: null, err: e.message });
      }
    }
    setImgBulkFiles(results);
    const ok  = results.filter(r => r.b64).length;
    const bad = results.filter(r => !r.b64).length;
    setImgBulkMsg({ type: ok > 0 ? "success" : "error", text: ok + " images ready" + (bad > 0 ? ", " + bad + " failed" : "") + ". Click Upload to save." });
  };

  const handleBulkImgUpload = async () => {
    const ready = imgBulkFiles.filter(r => r.b64);
    if (!ready.length) { setImgBulkMsg({ type: "error", text: "No images loaded. Select files first." }); return; }
    setImgBulkLoading(true);
    let done = 0, fail = 0;
    for (const img of ready) {
      const numMatch = img.name.match(/(\d+)/);
      if (!numMatch) { fail++; continue; }
      const qNum = parseInt(numMatch[1]);
      const { error } = await supabase
        .from("questions")
        .update({ diagram_data: img.b64, type: "diagram" })
        .eq("paper_id", "NEET_2025")
        .eq("number", qNum);
      if (error) fail++; else done++;
      setImgBulkProgress(done + fail + "/" + ready.length);
    }
    setImgBulkLoading(false);
    setImgBulkProgress("");
    setImgBulkFiles([]);
    setImgBulkMsg({ type: done > 0 ? "success" : "error", text: done + " images uploaded." + (fail > 0 ? " " + fail + " failed (no matching Q number found)." : "") });
  };

  // Create student accounts and add to batch in one step
  const createStudentsInBatch = async () => {
    const valid = addStudentRows.filter(r => r.email.includes("@") && r.password.length >= 6);
    if (!valid.length) { setAddStudentMsg({ type:"error", text:"Add at least one student with valid email and password (min 6 chars)." }); return; }
    setAddStudentLoading(true);
    setAddStudentMsg({ type:"info", text:"Creating accounts..." });
    let done = 0, fail = 0, failMsgs = [];
    for (const s of valid) {
      try {
        // Create Supabase auth account
        const { data, error } = await supabase.auth.signUp({
          email: s.email.trim().toLowerCase(),
          password: s.password,
          options: { data: { full_name: s.name.trim() } }
        });
        if (error) { fail++; failMsgs.push(s.email + ": " + error.message); continue; }
        // Add to batch members
        await supabase.from("batch_members").upsert([{ batch_id: selectedBatch.id, email: s.email.trim().toLowerCase() }], { onConflict: "batch_id,email" });
        done++;
      } catch (e) { fail++; failMsgs.push(s.email + ": " + e.message); }
    }
    setAddStudentLoading(false);
    let msg = done + " student(s) created and added to batch.";
    if (fail > 0) msg += " " + fail + " failed: " + failMsgs.slice(0,3).join("; ");
    setAddStudentMsg({ type: done > 0 ? "ok" : "error", text: msg });
    if (done > 0) {
      // Show downloadable credentials summary
      const created = valid.slice(0, done);
      const creds = "email,password,full_name\n" + created.map(s => s.email+","+s.password+","+(s.name||"")).join("\n");
      const blob = new Blob([creds], { type:"text/csv" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = (selectedBatch?.name||"batch").replace(/\s+/g,"_")+"_credentials.csv"; a.click();
      URL.revokeObjectURL(url);
      setAddStudentRows([{ email:"", password:"", name:"" }]);
      loadBatchDetail(selectedBatch);
    }
  };

  // Load tests for selected batch
  const loadBatchTests = async (batchId) => {
    setTestLoading(true);
    const { data } = await supabase.from("batch_tests")
      .select("*")
      .eq("batch_id", batchId)
      .order("created_at", { ascending: false });
    if (data) {
      // Fetch question counts per paper_id
      const paperIds = [...new Set(data.map(t => t.paper_id).filter(Boolean))];
      const counts = {};
      await Promise.all(paperIds.map(async pid => {
        const { count } = await supabase.from("questions")
          .select("id", { count: "exact", head: true })
          .eq("paper_id", pid);
        counts[pid] = count || 0;
      }));
      setBatchTests(data.map(t => ({ ...t, _qCount: counts[t.paper_id] ?? null })));
    } else {
      setBatchTests([]);
    }
    setTestLoading(false);
  };

  // Create test for batch
  const createBatchTest = async () => {
    if (!testForm.name.trim()) { setTestMsg({ type:"error", text:"Test name required." }); return; }
    if (!selectedBatch) return;
    const { error } = await supabase.from("batch_tests").insert([{
      batch_id: selectedBatch.id, name: testForm.name.trim(),
      description: testForm.description.trim(), paper_id: testForm.paper_id || "NEET_2025",
      exam_window_start: testForm.exam_window_start, exam_window_end: testForm.exam_window_end,
      attempt_limit: +testForm.attempt_limit || 1,
      access_code: testForm.access_code, access_code_enabled: testForm.access_code_enabled,
      resume_code: testForm.resume_code, status: testForm.status || "scheduled",
      manual_release: testForm.manual_release || "false"
    }]);
    if (error) { setTestMsg({ type:"error", text: error.message }); return; }
    setTestMsg({ type:"ok", text:"Test created!" });
    setTestForm({ name:"", description:"", paper_id:"NEET_2025", exam_window_start:"", exam_window_end:"", attempt_limit:"1", access_code:"", access_code_enabled:"false", resume_code:"", status:"scheduled" });
    loadBatchTests(selectedBatch.id);
  };

  // Update test
  const saveTest = async () => {
    if (!selectedTest) return;
    const { error } = await supabase.from("batch_tests").update({
      name: testForm.name, description: testForm.description,
      paper_id: testForm.paper_id, exam_window_start: testForm.exam_window_start,
      exam_window_end: testForm.exam_window_end, attempt_limit: +testForm.attempt_limit || 1,
      access_code: testForm.access_code, access_code_enabled: testForm.access_code_enabled,
      resume_code: testForm.resume_code, status: testForm.status,
      manual_release: testForm.manual_release || "false"
    }).eq("id", selectedTest.id);
    if (error) setTestMsg({ type:"error", text: error.message });
    else { setTestMsg({ type:"ok", text:"Test updated!" }); loadBatchTests(selectedBatch.id); }
  };

  // Delete test
  const deleteTest = async (id) => {
    if (!window.confirm("Delete this test? All attempts linked to it will be unlinked.")) return;
    await supabase.from("batch_tests").delete().eq("id", id);
    loadBatchTests(selectedBatch.id);
  };

  // Load test reports (all student attempts for a specific test)
  const loadTestReports = async (testId) => {
    setTestReportLoading(true);
    const { data } = await supabase.from("test_results")
      .select("id, user_id, student_name, student_email, score, correct, wrong, unattempted, total, created_at, percentile, subject_times")
      .eq("batch_test_id", testId)
      .order("score", { ascending: false });
    setTestReports(data || []);
    setTestReportLoading(false);
  };

  // Download test report as CSV
  const downloadTestReport = (testName, rows) => {
    const header = "Rank,Name,Email,Score,Percentage,Correct,Wrong,Unattempted,Percentile,Date";
    const lines = rows.map((r, i) => {
      const pct = Math.round((r.score/720)*100);
      const d   = new Date(r.created_at).toLocaleDateString("en-IN");
      const st  = r.subject_times || {};
      return [i+1, (r.student_name||"").replace(/,/g," "), (r.student_email||""), r.score, pct+"%", r.correct, r.wrong, r.unattempted, r.percentile!=null?r.percentile+"%":"N/A", d].join(",");
    });
    const csv  = header + "\n" + lines.join("\n");
    const blob = new Blob([csv], { type:"text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = testName.replace(/\s+/g,"_") + "_report.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const loadBatches = async () => {
    setBatchLoading(true);
    const { data } = await supabase.from("batches").select("*").order("created_at");
    if (data) setBatches(data);
    setBatchLoading(false);
  };

  // Load batch details (settings + members)
  const loadBatchDetail = async (batch) => {
    setSelectedBatch(batch);
    setBatchView("edit");
    setBatchMsg(null);
    // Load settings
    const { data: s } = await supabase.from("batch_settings").select("*").eq("batch_id", batch.id).single();
    setBatchSettings(s || {
      exam_enabled: "true", access_code: "", access_code_enabled: "false",
      resume_code: "", exam_window_start: "", exam_window_end: "",
      attempt_limit: "0", paper_id: "NEET_2025"
    });
    // Load members
    const { data: m } = await supabase.from("batch_members").select("email").eq("batch_id", batch.id).order("email");
    setBatchMembers(m || []);
  };

  // Create batch
  const createBatch = async () => {
    if (!batchForm.name.trim()) { setBatchMsg({ type:"error", text:"Batch name required." }); return; }
    const { data, error } = await supabase.from("batches").insert([{ name: batchForm.name.trim(), description: batchForm.description.trim() }]).select().single();
    if (error) { setBatchMsg({ type:"error", text: error.message }); return; }
    // Create default settings for new batch
    await supabase.from("batch_settings").insert([{ batch_id: data.id }]);
    setBatchForm({ name:"", description:"" });
    setBatchMsg({ type:"ok", text:"Batch created!" });
    loadBatches();
  };

  // Delete batch
  const deleteBatch = async (id) => {
    if (!window.confirm("Delete this batch? Members will be removed but student accounts remain.")) return;
    await supabase.from("batches").delete().eq("id", id);
    if (selectedBatch?.id === id) { setSelectedBatch(null); setBatchView("list"); }
    loadBatches();
  };

  // Save batch settings
  const saveBatchSettings = async () => {
    if (!selectedBatch) return;
    const { error } = await supabase.from("batch_settings").upsert({ batch_id: selectedBatch.id, ...batchSettings, updated_at: new Date().toISOString() }, { onConflict: "batch_id" });
    if (error) setBatchMsg({ type:"error", text: error.message });
    else setBatchMsg({ type:"ok", text:"Settings saved!" });
  };

  // Add members from textarea (paste emails)
  const addBatchMembers = async () => {
    const emails = batchMemberInput.split(/[,\n\s]+/).map(e => e.trim().toLowerCase()).filter(e => e.includes("@"));
    if (!emails.length) { setBatchMsg({ type:"error", text:"Enter at least one valid email." }); return; }
    const rows = emails.map(email => ({ batch_id: selectedBatch.id, email }));
    const { error } = await supabase.from("batch_members").upsert(rows, { onConflict: "batch_id,email" });
    if (error) setBatchMsg({ type:"error", text: error.message });
    else {
      setBatchMsg({ type:"ok", text: emails.length + " member(s) added." });
      setBatchMemberInput("");
      loadBatchDetail(selectedBatch);
    }
  };

  // Remove member from batch
  const removeBatchMember = async (email) => {
    await supabase.from("batch_members").delete().eq("batch_id", selectedBatch.id).eq("email", email);
    loadBatchDetail(selectedBatch);
  };

  // Add members from CSV file
  const handleBatchMemberCsv = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const emails = e.target.result.split(/[,\n\r\s]+/).map(x => x.trim().replace(/^"|"$/g,"").toLowerCase()).filter(x => x.includes("@"));
      setBatchMemberInput(emails.join("\n"));
      setBatchMsg({ type:"ok", text: emails.length + " emails loaded from CSV. Click Add Members." });
    };
    reader.readAsText(file);
  };

  useEffect(() => { if (tab === "batches") loadBatches(); }, [tab]);

  // Load question analytics
  const loadAnalytics = async () => {
    setAnalyticsLoading(true);
    // Fetch all results with answers
    const { data } = await supabase.from("test_results")
      .select("answers, score, subject_times, paper_id")
      .not("answers", "is", null)
      .limit(500);
    if (!data || !data.length) { setAnalyticsLoading(false); return; }
    // Fetch questions
    const { data: qs } = await supabase.from("questions")
      .select("id, number, subject, question_text, paper_id")
      .eq("paper_id", paperFilter || "NEET_2025");
    if (!qs) { setAnalyticsLoading(false); return; }
    // Compute per-question stats
    const qStats = {};
    qs.forEach(q => { qStats[q.id] = { q, attempts:0, correct:0, wrong:0, skip:0 }; });
    data.forEach(r => {
      const ans = r.answers || {};
      Object.entries(ans).forEach(([qid, ua]) => {
        if (!qStats[qid]) return;
        qStats[qid].attempts++;
        if (ua === undefined || ua === null) qStats[qid].skip++;
        // We don't have correct answer here, so track attempt only
      });
      // Also count via questions array
    });
    // Better approach: re-fetch with correct answers
    const { data: fullQs } = await supabase.from("questions")
      .select("id, number, subject, question_text, correct, paper_id")
      .eq("paper_id", paperFilter || "NEET_2025");
    if (!fullQs) { setAnalyticsLoading(false); return; }
    const stats = {};
    fullQs.forEach(q => { stats[q.id] = { q, attempts:0, correct:0, wrong:0, skip:0 }; });
    data.forEach(r => {
      const ans = r.answers || {};
      fullQs.forEach(q => {
        if (ans[q.id] === undefined) { if(stats[q.id]) stats[q.id].skip++; }
        else if (ans[q.id] === q.correct) { if(stats[q.id]) stats[q.id].correct++; }
        else { if(stats[q.id]) stats[q.id].wrong++; }
        if(stats[q.id]) stats[q.id].attempts++;
      });
    });
    const arr = Object.values(stats).filter(s => s.attempts > 0);
    arr.sort((a,b) => (a.correct/a.attempts) - (b.correct/b.attempts)); // hardest first
    setAnalyticsData({ byQ: arr, total: data.length });
    setAnalyticsLoading(false);
  };

  useEffect(() => { if (tab === "analytics") loadAnalytics(); }, [tab]);

  // Parse student CSV: email, password, full_name
  // Parse student CSV: email, password, full_name
  const parseStudentCSV = (text) => {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return { rows: [], err: "Need header row + data rows." };
    const header = lines[0].split(",").map(h => h.trim().toLowerCase());
    if (!header.includes("email")) return { rows: [], err: "CSV must have an 'email' column." };
    if (!header.includes("password")) return { rows: [], err: "CSV must have a 'password' column." };
    const rows = [], errs = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map(c => c.trim().replace(/^"|"$/g, ""));
      const row  = {};
      header.forEach((h, j) => { row[h] = cols[j] || ""; });
      if (!row.email || !row.email.includes("@")) { errs.push("Row " + i + ": invalid email"); continue; }
      if (!row.password || row.password.length < 6) { errs.push("Row " + i + ": password must be 6+ chars"); continue; }
      rows.push({ email: row.email.toLowerCase(), password: row.password, full_name: row.full_name || row.name || "" });
    }
    return { rows, errs, err: null };
  };

  const handleStudentCSVFile = (file) => {
    if (!file || !file.name.endsWith(".csv")) { setStuCsvMsg({ type: "error", text: "Upload a .csv file." }); return; }
    setStuCsvLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const { rows, errs, err } = parseStudentCSV(e.target.result);
      setStuCsvLoading(false);
      if (err) { setStuCsvMsg({ type: "error", text: err }); return; }
      setStuCsvRows(rows);
      setStuCsvPreview(rows.slice(0, 5));
      setStuCsvMsg({ type: rows.length > 0 ? "success" : "error", text: rows.length + " students ready to create." + (errs?.length ? " Warnings: " + errs.slice(0, 3).join("; ") : "") });
    };
    reader.readAsText(file);
  };

  const handleStudentCSVUpload = async () => {
    if (!stuCsvRows || !stuCsvRows.length) return;
    setStuCsvLoading(true);
    let done = 0, fail = 0, failDetails = [];
    for (const student of stuCsvRows) {
      setStuCsvProgress(done + fail + "/" + stuCsvRows.length);
      try {
        // Use Supabase admin signUp - creates account directly
        const { data, error } = await supabase.auth.signUp({
          email: student.email,
          password: student.password,
          options: { data: { full_name: student.full_name } }
        });
        if (error) { fail++; failDetails.push(student.email + ": " + error.message); }
        else done++;
      } catch (e) { fail++; failDetails.push(student.email + ": " + e.message); }
    }
    setStuCsvLoading(false);
    setStuCsvProgress("");
    setStuCsvRows(null);
    setStuCsvPreview([]);
    let txt = done + " students created successfully.";
    if (fail > 0) txt += " " + fail + " failed.";
    if (failDetails.length) txt += "\n" + failDetails.slice(0, 5).join("\n");
    setStuCsvMsg({ type: done > 0 ? "success" : "error", text: txt });
  };

  const saveBranding = async () => {
    setBrandingLoading(true);
    const entries = Object.entries(brandingForm).map(([key, value]) => ({ key, value: value || "" }));
    for (const entry of entries) {
      await supabase.from("branding").upsert(entry, { onConflict: "key" });
    }
    // Update localStorage cache + CSS variable so next visit shows updated branding instantly
    try {
      localStorage.setItem("neet_branding_cache", JSON.stringify(brandingForm));
      // Apply new background to body immediately for current session
      var bg = "";
      if (brandingForm.bg_type === "solid" && brandingForm.bg_solid_color) bg = brandingForm.bg_solid_color;
      else if (brandingForm.bg_type === "image" && brandingForm.bg_image_data) bg = "url(" + brandingForm.bg_image_data + ") center/cover no-repeat";
      else if (brandingForm.bg_gradient_from && brandingForm.bg_gradient_to) bg = "linear-gradient(135deg," + brandingForm.bg_gradient_from + " 0%," + brandingForm.bg_gradient_to + " 50%," + brandingForm.bg_gradient_from + " 100%)";
      if (bg) document.documentElement.style.setProperty("--landing-bg", bg);
    } catch (_) {}
    setBrandingLoading(false);
    setBrandingMsg({ type: "ok", text: "Branding saved! Changes are live on the landing page." });
  };

  //  Styles 
  const mstyle = (m) => !m ? {} : {
    borderRadius: 10, padding: "10px 14px", fontSize: 13, marginBottom: 14, whiteSpace: "pre-line",
    background: m.type === "error" ? "rgba(239,68,68,0.1)" : m.type === "success" ? "rgba(34,197,94,0.1)" : "rgba(99,102,241,0.1)",
    border: "1px solid " + (m.type === "error" ? "rgba(239,68,68,0.3)" : m.type === "success" ? "rgba(34,197,94,0.3)" : "rgba(99,102,241,0.3)"),
    color: m.type === "error" ? "#f87171" : m.type === "success" ? "#4ade80" : "#a5b4fc",
  };

  const settingInput = { ...ainput, fontSize: 13, padding: "8px 12px" };
  const filtered = questions.filter(q => (subFilter === "All" || q.subject === subFilter) && (!search || String(q.number).includes(search) || (q.question_text || "").toLowerCase().includes(search.toLowerCase())));

  return (
    <div style={{ minHeight: "100vh", ...brandingBg(getBranding()), fontFamily: brandingFont(getBranding()), color: "#e2e8f0" }}>
      
      <div style={{ background: "#0f172a", borderBottom: "1px solid rgba(168,85,247,0.2)", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ color: "#c084fc", fontWeight: 700, fontSize: "1rem" }}>CBT Admin Panel</span>
        <button onClick={onSignOut} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171", borderRadius: 8, padding: "7px 16px", cursor: "pointer", fontSize: 13, fontFamily: "inherit", fontWeight: 600 }}>Sign Out</button>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: 20 }}>
        
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {[["add","Add Question"],["csv","CSV Upload"],["list","All Questions (" + questions.length + ")"],["settings","Exam Settings"],["batches","Batches"],["students","Student Data"],["analytics","Analytics"],["branding","Branding"]].map(([t,l]) => (
            <button key={t} onClick={() => setTab(t)} style={abtn(tab===t?"primary":"ghost")}>{l + (t==="list" ? " (" + questions.length + ")" : "")}</button>
          ))}
        </div>

        
        {tab === "add" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {msg && <div style={mstyle(msg)}>{msg.text}</div>}
            {editId && (
              <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 10, padding: "10px 14px", color: "#fbbf24", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>{"Editing Q" + form.number + " - " + form.subject}</span>
                <button onClick={() => { setForm(aempty()); setEditId(null); setImgInfo(null); }} style={abtn("sm")}>Cancel</button>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "110px 1fr 1fr", gap: 12 }}>
              <div>
                <label style={alabel}>Q Number</label>
                <input type="number" min="1" max="180" value={form.number} onChange={e => ff("number", e.target.value)} placeholder="e.g. 5" style={ainput} />
              </div>
              <div>
                <label style={alabel}>Subject</label>
                <select value={form.subject} onChange={e => ff("subject", e.target.value)} style={{ ...ainput, cursor: "pointer" }}>
                  {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={alabel}>Paper ID</label>
                <input value={form.paper_id || "NEET_2025"} onChange={e => ff("paper_id", e.target.value)} placeholder="e.g. NEET_2025, BATCH_A" style={{ ...ainput, fontFamily: "monospace", fontSize: 12 }} />
                <div style={{ fontSize: 10, color: "#475569", marginTop: 3 }}>Which test set this belongs to</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={alabel}>Chapter (optional)</label>
                <input value={form.chapter || ""} onChange={e => ff("chapter", e.target.value)} placeholder="e.g. Kinematics, Optics" style={ainput} />
              </div>
              <div>
                <label style={alabel}>Difficulty</label>
                <select value={form.difficulty || "medium"} onChange={e => ff("difficulty", e.target.value)} style={{ ...ainput, cursor: "pointer" }}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>
            <div>
              <label style={alabel}>Question Text</label>
              <textarea rows={3} value={form.question_text} onChange={e => ff("question_text", e.target.value)} placeholder="Question here. LaTeX inline: $E = mc^2$" style={{ ...ainput, resize: "vertical", lineHeight: 1.65 }} />
            </div>
            <div>
              <label style={alabel}>Equation - LaTeX (optional)</label>
              <input value={form.equation} onChange={e => ff("equation", e.target.value)} placeholder="e.g. $$\\frac{1}{2}mv^2$$" style={{ ...ainput, fontFamily: "monospace", fontSize: 12 }} />
            </div>
            <div>
              <label style={alabel}>Diagram Image - JPG/PNG (stored in database)</label>
              <div onClick={() => afileRef.current && afileRef.current.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); handleImg(e.dataTransfer.files[0]); }}
                style={{ border: "2px dashed " + (form.diagram_data ? "rgba(34,197,94,0.4)" : "rgba(99,102,241,0.3)"), borderRadius: 12, padding: form.diagram_data ? 10 : 24, textAlign: "center", cursor: "pointer", background: form.diagram_data ? "rgba(34,197,94,0.05)" : "rgba(99,102,241,0.04)" }}>
                {form.diagram_data ? (
                  <div>
                    <img src={form.diagram_data} alt="preview" style={{ maxHeight: 200, maxWidth: "100%", objectFit: "contain", borderRadius: 8, display: "block", margin: "0 auto 8px" }} />
                    <div style={{ color: "#4ade80", fontSize: 12, marginBottom: 8 }}>{"Image loaded" + (imgInfo ? " - " + imgInfo.w + "x" + imgInfo.h + "px, " + imgInfo.kb + "KB" : "")}</div>
                    <div style={{ display:"flex", gap:8 }}>
                      <button onClick={e => { e.stopPropagation(); afileRef.current && afileRef.current.click(); }} style={{ ...abtn("primary"), padding: "5px 14px", fontSize: 12 }}>Replace Image</button>
                      <button onClick={e => { e.stopPropagation(); ff("diagram_data", ""); setImgInfo(null); }} style={{ ...abtn("danger"), padding: "5px 14px", fontSize: 12 }}>Remove</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>[ img ]</div>
                    <div style={{ color: "#94a3b8", fontSize: 14 }}>Click or drag and drop JPG/PNG</div>
                    <div style={{ color: "#475569", fontSize: 12, marginTop: 4 }}>Auto-compressed, stored in database</div>
                  </div>
                )}
              </div>
              <input ref={afileRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" style={{ display: "none" }} onChange={e => handleImg(e.target.files[0])} />
            </div>
            <div>
              <label style={alabel}>Options - click circle to mark correct answer</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {["a","b","c","d"].map((lt, i) => {
                  const ok = String(i) === form.correct;
                  return (
                    <div key={lt} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div onClick={() => ff("correct", String(i))} style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: ok ? "#22c55e" : "rgba(255,255,255,0.07)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", border: ok ? "2px solid #4ade80" : "2px solid transparent" }}>
                        {lt.toUpperCase()}
                      </div>
                      <input value={form["option_" + lt]} onChange={e => ff("option_" + lt, e.target.value)} placeholder={"Option " + lt.toUpperCase() + (ok ? " (correct)" : "")} style={{ ...ainput, flex: 1, borderColor: ok ? "rgba(34,197,94,0.4)" : undefined }} />
                    </div>
                  );
                })}
              </div>
              <div style={{ color: "#475569", fontSize: 11, marginTop: 5 }}>{"Correct: Option " + ["A","B","C","D"][+form.correct]}</div>
            </div>
            <div>
              <label style={alabel}>Solution</label>
              <textarea rows={2} value={form.solution_text} onChange={e => ff("solution_text", e.target.value)} placeholder="Explain the correct answer..." style={{ ...ainput, resize: "vertical", lineHeight: 1.6 }} />
            </div>
            <div>
              <label style={alabel}>Solution Equation - LaTeX (optional)</label>
              <input value={form.solution_eq} onChange={e => ff("solution_eq", e.target.value)} placeholder="e.g. $KE = \\frac{1}{2}mv^2$" style={{ ...ainput, fontFamily: "monospace", fontSize: 12 }} />
            </div>
            <div>
              <label style={alabel}>Solution Diagram Image (optional)</label>
              <div
                onClick={() => { const inp=document.createElement("input"); inp.type="file"; inp.accept="image/jpeg,image/jpg,image/png,image/webp"; inp.onchange=async e=>{ const f=e.target.files[0]; if(!f) return; setMsg({type:"info",text:"Compressing..."}); try { const {b64,kb,w,h}=await compressToBase64(f); ff("solution_diagram_data",b64); setMsg({type:"success",text:"Solution image ready - "+w+"x"+h+"px, "+kb+"KB"}); } catch(ex){setMsg({type:"error",text:ex.message});} }; inp.click(); }}
                onDragOver={e=>e.preventDefault()}
                onDrop={async e=>{ e.preventDefault(); const f=e.dataTransfer.files[0]; if(!f) return; try { const {b64,kb,w,h}=await compressToBase64(f); ff("solution_diagram_data",b64); setMsg({type:"success",text:"Solution image ready - "+w+"x"+h+"px, "+kb+"KB"}); } catch(ex){setMsg({type:"error",text:ex.message});} }}
                style={{ border:"2px dashed "+(form.solution_diagram_data?"rgba(99,102,241,0.5)":"rgba(99,102,241,0.2)"), borderRadius:8, padding:form.solution_diagram_data?8:14, textAlign:"center", cursor:"pointer", background:"rgba(99,102,241,0.03)", marginTop:4 }}>
                {form.solution_diagram_data ? (
                  <div>
                    <img src={form.solution_diagram_data} alt="sol" style={{ maxHeight:120, maxWidth:"100%", objectFit:"contain", borderRadius:6, display:"block", margin:"0 auto 6px" }} />
                    <div style={{ fontSize:11, color:"#4ade80", marginBottom:6 }}>Solution image ready</div>
                    <div style={{ display:"flex", gap:8 }}>
                      <button onClick={e=>{ e.stopPropagation(); const inp=document.createElement("input"); inp.type="file"; inp.accept="image/jpeg,image/jpg,image/png,image/webp"; inp.onchange=async ev=>{ try { const {b64,kb,w,h}=await compressToBase64(ev.target.files[0]); ff("solution_diagram_data",b64); setMsg({type:"success",text:"Solution image replaced - "+w+"x"+h+"px, "+kb+"KB"}); } catch(ex){} }; inp.click(); }} style={{ ...abtn("primary"), padding:"4px 12px", fontSize:11 }}>Replace</button>
                      <button onClick={e=>{ e.stopPropagation(); ff("solution_diagram_data",""); }} style={{ ...abtn("danger"), padding:"4px 12px", fontSize:11 }}>Remove</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ color:"#64748b", fontSize:12 }}>Click or drag JPG/PNG for solution diagram</div>
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
              <button onClick={handleSave} disabled={loading} style={{ ...abtn("success"), flex: 1, padding: "13px", fontSize: "1rem", opacity: loading ? 0.6 : 1 }}>
                {loading ? "Saving..." : editId ? "Update Question" : "Save Question"}
              </button>
              <button onClick={() => { setForm(aempty()); setEditId(null); setImgInfo(null); setMsg(null); }} style={abtn("ghost")}>Reset</button>
            </div>
          </div>
        )}

       
        {tab === "csv" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {csvMsg && <div style={mstyle(csvMsg)}>{csvMsg.text}</div>}

            
            <div style={{ ...acard, padding: "18px 20px" }}>
              <div style={{ color: "#a5b4fc", fontWeight: 700, marginBottom: 12, fontSize: "0.95rem" }}>CSV Format Guide</div>
              <p style={{ color: "#94a3b8", fontSize: 13, margin: "0 0 10px" }}>Your CSV file must have a header row with these exact column names:</p>
              <div style={{ background: "#070d1a", borderRadius: 8, padding: "12px 14px", fontFamily: "monospace", fontSize: 12, color: "#86efac", marginBottom: 12, overflowX: "auto" }}>
                number,subject,question_text,equation,option_a,option_b,option_c,option_d,correct,solution_text,solution_eq,chapter,difficulty,paper_id
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  ["number", "1 to 180 (integer)"],
                  ["subject", "Physics / Chemistry / Botany / Zoology"],
                  ["question_text", "Main question sentence"],
                  ["equation", "LaTeX e.g. $E=mc^2$ (leave blank if none)"],
                  ["option_a to d", "Text for each option"],
                  ["correct", "0=A, 1=B, 2=C, 3=D"],
                  ["solution_text", "Explanation of answer"],
                  ["chapter", "Topic name (optional)"],
                  ["difficulty", "easy / medium / hard (optional)"],
                  ["paper_id", "Test ID e.g. NEET_2025 (optional, defaults to NEET_2025)"],
                ].map(([k,v]) => (
                  <div key={k} style={{ fontSize: 12 }}>
                    <span style={{ color: "#fbbf24", fontFamily: "monospace" }}>{k}</span>
                    <span style={{ color: "#64748b" }}> - {v}</span>
                  </div>
                ))}
              </div>

              
              <button
                onClick={() => {
                  const sample = "number,subject,question_text,equation,image,option_a,option_b,option_c,option_d,correct,solution_text,solution_eq,chapter,difficulty,paper_id\n" +
                    "1,Physics,A ball thrown at 20 m/s max height (g=10):,,q1.jpg,10 m,20 m,30 m,40 m,1,h=u2/2g=20 m.,$h=\\frac{u^2}{2g}$,Kinematics,easy,NEET_2025\n" +
                    "2,Chemistry,Hybridization of carbon in diamond:,,,sp,sp2,sp3,sp3d,2,4 sigma bonds so sp3.,,Bonding,medium,NEET_2025\n" +
                    "3,Physics,SI unit of electric field:,,,C/m,N/C,N.m,J/C2,1,E=F/q so N/C.,,Electrostatics,easy,BATCH_B\n";
                  const blob = new Blob([sample], { type: "text/csv" });
                  const url  = URL.createObjectURL(blob);
                  const a    = document.createElement("a");
                  a.href = url; a.download = "sample_questions.csv"; a.click();
                  URL.revokeObjectURL(url);
                }}
                style={{ ...abtn("ghost"), marginTop: 14, fontSize: 12 }}
              >
                Download Sample CSV
              </button>
            </div>

            
            <div
              onClick={() => { const inp = document.createElement("input"); inp.type="file"; inp.accept=".csv"; inp.onchange=e=>handleCSVFile(e.target.files[0]); inp.click(); }}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleCSVFile(e.dataTransfer.files[0]); }}
              style={{ border: "2px dashed rgba(99,102,241,0.4)", borderRadius: 14, padding: 32, textAlign: "center", cursor: "pointer", background: "rgba(99,102,241,0.04)" }}
            >
              <div style={{ fontSize: 40, marginBottom: 10 }}>[ CSV ]</div>
              <div style={{ color: "#94a3b8", fontSize: 15, marginBottom: 6 }}>Click or drag and drop your CSV file here</div>
              <div style={{ color: "#475569", fontSize: 13 }}>Max 500 questions per upload</div>
            </div>

           
            {csvPreview.length > 0 && (
              <div style={{ ...acard }}>
                <div style={{ color: "#a5b4fc", fontWeight: 700, marginBottom: 10, fontSize: "0.9rem" }}>Preview (first 5 rows)</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {csvPreview.map((q, i) => (
                    <div key={i} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "10px 12px", fontSize: 12 }}>
                      <span style={{ color: "#fbbf24", marginRight: 8 }}>Q{q.number}</span>
                      <span style={{ color: "#818cf8", marginRight: 8 }}>{q.subject}</span>
                      <span style={{ color: "#c7d2fe" }}>{(q.question_text || q.equation || "").slice(0, 80)}</span>
                      <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
                        {[q.option_a,q.option_b,q.option_c,q.option_d].map((o,j) => (
                          <span key={j} style={{ color: j===q.correct?"#4ade80":"#64748b", background: j===q.correct?"rgba(34,197,94,0.1)":"rgba(255,255,255,0.03)", borderRadius: 5, padding: "2px 7px" }}>
                            {["A","B","C","D"][j]}) {(o||"").slice(0,20)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

           
            {csvFileRef._parsed && csvFileRef._parsed.length > 0 && (
              <div style={{ display: "flex", gap: 12 }}>
                <button onClick={() => handleCSVUpload(false)} disabled={csvLoading}
                  style={{ ...abtn("success"), flex: 1, opacity: csvLoading ? 0.6 : 1 }}>
                  {csvLoading ? "Uploading..." : "Add to Existing Questions"}
                </button>
                <button onClick={() => handleCSVUpload(true)} disabled={csvLoading}
                  style={{ ...abtn("danger"), flex: 1, opacity: csvLoading ? 0.6 : 1 }}>
                  {csvLoading ? "Uploading..." : "Replace All Questions"}
                </button>
              </div>
            )}

            {/* BULK IMAGE UPLOAD */}
            <div style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12, padding: "18px 20px", marginTop: 8 }}>
              <div style={{ color: "#fbbf24", fontWeight: 700, marginBottom: 8, fontSize: "0.95rem" }}>Step 2 (optional) - Bulk Image Upload</div>
              <p style={{ color: "#94a3b8", fontSize: 13, margin: "0 0 10px", lineHeight: 1.7 }}>
                Name your image files to match question numbers:
                <span style={{ color: "#fbbf24", fontFamily: "monospace", marginLeft: 6 }}>q1.jpg, q2.jpg, q5.jpg</span><br />
                Select all images at once - auto-matched to questions by number in filename.
              </p>
              <div style={{ background: "#070d1a", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 11, color: "#64748b" }}>
                <div style={{ color: "#a5b4fc", fontWeight: 600, marginBottom: 3 }}>Naming examples:</div>
                <div>q1.jpg, q2.jpg  matches Q1, Q2</div>
                <div>5.jpg, 10.jpg   also works</div>
                <div>physics_5.jpg   matches Q5</div>
              </div>
              {imgBulkMsg && <div style={mstyle(imgBulkMsg)}>{imgBulkMsg.text}</div>}
              {imgBulkProgress && <div style={{ color: "#a5b4fc", fontSize: 13, marginBottom: 8 }}>Uploading: {imgBulkProgress}</div>}
              {imgBulkFiles.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                  {imgBulkFiles.map((img, i) => (
                    <div key={i} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, background: img.b64 ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)", color: img.b64 ? "#4ade80" : "#f87171" }}>
                      {img.name}
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => { const inp = document.createElement("input"); inp.type="file"; inp.accept="image/jpeg,image/jpg,image/png,image/webp"; inp.multiple=true; inp.onchange=e=>handleBulkImgFiles(e.target.files); inp.click(); }}
                  style={{ ...abtn("ghost"), flex: 1 }}>
                  Select Image Files
                </button>
                <button
                  onClick={handleBulkImgUpload}
                  disabled={imgBulkLoading || imgBulkFiles.filter(r=>r.b64).length === 0}
                  style={{ ...abtn("success"), flex: 1, opacity: (imgBulkLoading || imgBulkFiles.filter(r=>r.b64).length===0) ? 0.5 : 1 }}>
                  {imgBulkLoading ? "Uploading..." : "Upload Images to Database"}
                </button>
              </div>
            </div>
          </div>
        )}

        
        {tab === "list" && (
          <div>
            {msg && <div style={mstyle(msg)}>{msg.text}</div>}
            <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ color: "#64748b", fontSize: 12, flexShrink: 0 }}>Paper ID:</span>
              <input value={paperFilter} onChange={e => setPaperFilter(e.target.value)} placeholder="e.g. NEET_2025" style={{ ...ainput, width: 160 }} />
              <button onClick={() => loadAll(paperFilter)} style={abtn("primary")}>Load</button>
              <span style={{ color: "#475569", fontSize: 11 }}>Tip: type paper_id and click Load to switch tests</span>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ ...ainput, flex: 1, minWidth: 160 }} />
              <select value={subFilter} onChange={e => setSubFilter(e.target.value)} style={{ ...ainput, width: 130, cursor: "pointer" }}>
                <option value="All">All Subjects</option>
                {SUBJECTS.map(s => <option key={s}>{s}</option>)}
              </select>
              <button onClick={handleDeleteAll} style={abtn("danger")}>Delete All</button>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
              {SUBJECTS.map(s => {
                const c = questions.filter(q => q.subject === s).length;
                return (
                  <div key={s} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "5px 12px", fontSize: 12 }}>
                    <span style={{ color: "#94a3b8" }}>{s + ": "}</span>
                    <span style={{ color: c >= 45 ? "#4ade80" : "#fbbf24", fontWeight: 700 }}>{c}</span>
                    <span style={{ color: "#475569" }}>/45</span>
                  </div>
                );
              })}
            </div>
            {loading ? (
              <div style={{ textAlign: "center", color: "#64748b", padding: 40 }}>Loading...</div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: "center", color: "#475569", padding: 40 }}>No questions found.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {filtered.map(q => (
                  <div key={q.id} style={{ ...acard, display: "flex", gap: 12, alignItems: "flex-start" }}>
                    {q.diagram_data ? (
                      <img src={q.diagram_data} alt="" style={{ width: 56, height: 40, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 56, height: 40, borderRadius: 6, background: "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#374151", fontSize: 12 }}>Q{q.number}</div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: SUBJ_COLORS_A[q.subject] || "#818cf8" }}>{"Q" + q.number + " - " + q.subject}</span>
                        {q.diagram_data && <span style={{ fontSize: 10, color: "#4ade80", background: "rgba(34,197,94,0.1)", padding: "1px 6px", borderRadius: 4 }}>image</span>}
                        {q.equation    && <span style={{ fontSize: 10, color: "#818cf8", background: "rgba(99,102,241,0.1)", padding: "1px 6px", borderRadius: 4 }}>eq</span>}
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "#c7d2fe", lineHeight: 1.4 }}>
                        {(q.question_text || q.equation || "(no text)").slice(0, 120)}
                      </div>
                      <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                        {[q.option_a, q.option_b, q.option_c, q.option_d].map((opt, i) => (
                          <span key={i} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 5, background: i === q.correct ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.03)", color: i === q.correct ? "#4ade80" : "#64748b" }}>
                            {["A","B","C","D"][i] + ") " + (opt || "").slice(0, 18) + ((opt || "").length > 18 ? "..." : "")}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5, flexShrink: 0 }}>
                      <button onClick={() => handleEdit(q)} style={abtn("sm")}>Edit</button>
                      <button onClick={() => handleDelete(q.id)} style={{ ...abtn("danger"), padding: "5px 12px", fontSize: "0.78rem" }}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

       
        {tab === "settings" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {settingsMsg && <div style={mstyle(settingsMsg)}>{settingsMsg.text}</div>}

            
            <div style={{ ...acard, padding: "20px 22px" }}>
              <div style={{ color: "#a5b4fc", fontWeight: 700, marginBottom: 16, fontSize: "0.95rem" }}>Exam Access</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ color: "#e2e8f0", fontSize: 14 }}>Exam Enabled</div>
                    <div style={{ color: "#64748b", fontSize: 12 }}>When off, no student can start the exam</div>
                  </div>
                  <button onClick={() => setSettings(p => ({ ...p, exam_enabled: p.exam_enabled === "false" ? "true" : "false" }))}
                    style={{ ...abtn(settings.exam_enabled !== "false" ? "success" : "ghost"), minWidth: 80 }}>
                    {settings.exam_enabled !== "false" ? "ON" : "OFF"}
                  </button>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ color: "#e2e8f0", fontSize: 14 }}>Access Code Required</div>
                    <div style={{ color: "#64748b", fontSize: 12 }}>Students must enter a code to start</div>
                  </div>
                  <button onClick={() => setSettings(p => ({ ...p, access_code_enabled: p.access_code_enabled === "true" ? "false" : "true" }))}
                    style={{ ...abtn(settings.access_code_enabled === "true" ? "success" : "ghost"), minWidth: 80 }}>
                    {settings.access_code_enabled === "true" ? "ON" : "OFF"}
                  </button>
                </div>

                {settings.access_code_enabled === "true" && (
                  <div>
                    <label style={alabel}>Exam Start Code</label>
                    <input value={settings.access_code || ""} onChange={e => setSettings(p => ({ ...p, access_code: e.target.value }))}
                      placeholder="Code required to begin the exam" style={settingInput} />
                  </div>
                )}

                {/* Resume code - always shown, separate from start code */}
                <div>
                  <div style={{ color: "#e2e8f0", fontSize: 14, marginBottom: 2 }}>Exam Resume Code</div>
                  <div style={{ color: "#64748b", fontSize: 12, marginBottom: 8 }}>Required when student switches tabs during exam</div>
                  <input value={settings.resume_code || ""} onChange={e => setSettings(p => ({ ...p, resume_code: e.target.value }))}
                    placeholder="Enter a separate code for resuming after tab switch" style={settingInput} />
                </div>
              </div>
            </div>

            
            <div style={{ ...acard, padding: "20px 22px" }}>
              <div style={{ color: "#a5b4fc", fontWeight: 700, marginBottom: 16, fontSize: "0.95rem" }}>Exam Time Window</div>
              <div style={{ color: "#64748b", fontSize: 12, marginBottom: 12 }}>Leave blank to allow access at any time</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={alabel}>Start Date & Time</label>
                  <input type="datetime-local" value={settings.exam_window_start || ""} onChange={e => setSettings(p => ({ ...p, exam_window_start: e.target.value }))} style={settingInput} />
                </div>
                <div>
                  <label style={alabel}>End Date & Time</label>
                  <input type="datetime-local" value={settings.exam_window_end || ""} onChange={e => setSettings(p => ({ ...p, exam_window_end: e.target.value }))} style={settingInput} />
                </div>
              </div>
            </div>

            
            <div style={{ ...acard, padding: "20px 22px" }}>
              <div style={{ color: "#a5b4fc", fontWeight: 700, marginBottom: 16, fontSize: "0.95rem" }}>Exam Rules</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={alabel}>Max Attempts Per Student</label>
                  <input type="number" min="0" value={settings.attempt_limit || "0"} onChange={e => setSettings(p => ({ ...p, attempt_limit: e.target.value }))} style={settingInput} placeholder="0 = unlimited" />
                  <div style={{ color: "#475569", fontSize: 11, marginTop: 4 }}>0 = unlimited attempts</div>
                </div>
                <div>
                  <label style={alabel}>NEET Exam Date (for countdown)</label>
                  <input type="date" value={settings.neet_exam_date || ""} onChange={e => setSettings(p => ({ ...p, neet_exam_date: e.target.value }))} style={settingInput} />
                </div>
              </div>
            </div>

            
            <div style={{ ...acard, padding: "20px 22px" }}>
              <div style={{ color: "#a5b4fc", fontWeight: 700, marginBottom: 16, fontSize: "0.95rem" }}>Features</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  ["webcam_enabled",      "Webcam Proctoring",    "Take random snapshots during exam"],
                  ["leaderboard_enabled", "Leaderboard",          "Show top scores tab on student dashboard"],
                  ["registration_approval","Approval Required",   "New students need admin approval to access exam"],
                ].map(([key, label, desc]) => (
                  <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ color: "#e2e8f0", fontSize: 14 }}>{label}</div>
                      <div style={{ color: "#64748b", fontSize: 12 }}>{desc}</div>
                    </div>
                    <button onClick={() => setSettings(p => ({ ...p, [key]: p[key] === "true" ? "false" : "true" }))}
                      style={{ ...abtn(settings[key] === "true" ? "success" : "ghost"), minWidth: 80 }}>
                      {settings[key] === "true" ? "ON" : "OFF"}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            
            <div style={{ ...acard, padding: "20px 22px" }}>
              <div style={{ color: "#a5b4fc", fontWeight: 700, marginBottom: 12, fontSize: "0.95rem" }}>Paper Settings</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={alabel}>Paper ID</label>
                  <input value="NEET_2025" disabled style={{ ...settingInput, opacity: 0.5, cursor: "not-allowed" }} />
                  <div style={{ color: "#475569", fontSize: 11, marginTop: 4 }}>Fixed - all questions use this ID</div>
                </div>
                <div>
                  <label style={alabel}>Default Font</label>
                  <select value={settings.hindi_font_enabled || "false"} onChange={e => setSettings(p => ({ ...p, hindi_font_enabled: e.target.value }))} style={{ ...settingInput, cursor: "pointer" }}>
                    <option value="false">English (Crimson Pro)</option>
                    <option value="true">Hindi (Kruti Dev)</option>
                  </select>
                </div>
              </div>
            </div>

            <button onClick={saveAllSettings} disabled={savingSettings}
              style={{ ...abtn("success"), padding: "13px", fontSize: "1rem", opacity: savingSettings ? 0.6 : 1 }}>
              {savingSettings ? "Saving..." : "Save All Settings"}
            </button>
          </div>
        )}

        
        {/*  BATCHES TAB  */}
        {tab === "batches" && (
          <div>
            {batchMsg && <div style={mstyle(batchMsg)}>{batchMsg.text}</div>}

            {batchView === "list" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Create new batch */}
                <div style={{ ...acard, padding: "18px 20px" }}>
                  <div style={{ color: "#a5b4fc", fontWeight: 700, marginBottom: 12 }}>Create New Batch</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10, marginBottom: 10 }}>
                    <div>
                      <label style={alabel}>Batch Name</label>
                      <input value={batchForm.name} onChange={e => setBatchForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Batch A, Morning Batch" style={ainput} />
                    </div>
                    <div>
                      <label style={alabel}>Description (optional)</label>
                      <input value={batchForm.description} onChange={e => setBatchForm(p => ({ ...p, description: e.target.value }))} placeholder="e.g. 50 students, 10am slot" style={ainput} />
                    </div>
                  </div>
                  <button onClick={createBatch} style={abtn("success")}>+ Create Batch</button>
                </div>

                {/* Batch list */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ color: "#a5b4fc", fontWeight: 700 }}>{"All Batches (" + batches.length + ")"}</div>
                    <button onClick={loadBatches} style={abtn("ghost")}>Refresh</button>
                  </div>
                  {batchLoading ? <div style={{ textAlign: "center", color: "#64748b", padding: 40 }}>Loading...</div>
                  : batches.length === 0 ? <div style={{ textAlign: "center", color: "#475569", padding: 40 }}>No batches yet. Create one above.</div>
                  : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {batches.map(b => (
                        <div key={b.id} style={{ ...acard, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                          <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 18 }}>B</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ color: "#e2e8f0", fontWeight: 700, fontSize: "0.95rem" }}>{b.name}</div>
                            {b.description && <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>{b.description}</div>}
                            <div style={{ color: "#475569", fontSize: 11, marginTop: 3 }}>Created {new Date(b.created_at).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" })}</div>
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => { setSelectedBatch(b); setBatchView("tests"); loadBatchTests(b.id); setTestMsg(null); setBatchTestView("list"); }} style={abtn("success")}>Tests</button>
                            <button onClick={() => loadBatchDetail(b)} style={abtn("primary")}>Members</button>
                            <button onClick={() => deleteBatch(b.id)} style={{ ...abtn("danger"), padding: "9px 12px" }}>Del</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/*  TESTS VIEW (multiple tests per batch)  */}
            {batchView === "tests" && selectedBatch && (
              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <button onClick={() => { setBatchView("list"); setSelectedBatch(null); setSelectedTest(null); setTestMsg(null); }} style={abtn("ghost")}>Back</button>
                  <div>
                    <div style={{ color:"#e2e8f0", fontWeight:700, fontSize:"1.1rem" }}>{selectedBatch.name} - Tests</div>
                    <div style={{ color:"#64748b", fontSize:12 }}>Schedule multiple tests on different dates</div>
                  </div>
                </div>

                {testMsg && <div style={mstyle(testMsg)}>{testMsg.text}</div>}

                {/* TEST LIST */}
                {batchTestView === "list" && (
                  <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                    <button onClick={() => { setSelectedTest(null); setTestForm({ name:"", description:"", paper_id:"NEET_2025", exam_window_start:"", exam_window_end:"", attempt_limit:"1", access_code:"", access_code_enabled:"false", resume_code:"", status:"scheduled", manual_release:"false" }); setBatchTestView("create"); }} style={{ ...abtn("success"), alignSelf:"flex-start" }}>+ Schedule New Test</button>

                    {testLoading ? <div style={{ textAlign:"center", color:"#64748b", padding:30 }}>Loading...</div>
                    : batchTests.length === 0 ? <div style={{ textAlign:"center", color:"#475569", padding:30 }}>No tests scheduled. Create one above.</div>
                    : (
                      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                        {batchTests.map(t => {
                          const now = new Date();
                          const st  = t.exam_window_start ? new Date(t.exam_window_start) : null;
                          const en  = t.exam_window_end   ? new Date(t.exam_window_end)   : null;
                          let statusLabel = "Scheduled", statusColor = "#fbbf24";
                          if (t.manual_release === "true") { statusLabel = "Released (manual)"; statusColor = "#4ade80"; }
                          else if (st && en) {
                            if (now < st) { statusLabel = "Upcoming"; statusColor = "#818cf8"; }
                            else if (now >= st && now <= en) { statusLabel = "ACTIVE NOW"; statusColor = "#4ade80"; }
                            else { statusLabel = "Completed"; statusColor = "#64748b"; }
                          }
                          return (
                            <div key={t.id} style={{ ...acard, padding:"14px 18px" }}>
                              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                                <div style={{ flex:1 }}>
                                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                                    <span style={{ color:"#e2e8f0", fontWeight:700 }}>{t.name}</span>
                                    <span style={{ fontSize:10, color:statusColor, background:"rgba(255,255,255,0.06)", padding:"2px 8px", borderRadius:99, fontWeight:600 }}>{statusLabel}</span>
                                  </div>
                                  {t.description && <div style={{ color:"#64748b", fontSize:12, marginTop:2 }}>{t.description}</div>}
                                  <div style={{ color:"#475569", fontSize:11, marginTop:4, display:"flex", gap:14, flexWrap:"wrap" }}>
                                    <span>Paper: <span style={{ color:"#a5b4fc" }}>{t.paper_id}</span>
                                    {t._qCount != null && <span style={{ marginLeft:6, color:t._qCount>0?"#4ade80":"#f87171", fontWeight:600, fontSize:11 }}>({t._qCount} Qs)</span>}
                                    </span>
                                    {st && <span>Start: {st.toLocaleString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</span>}
                                    {en && <span>End: {en.toLocaleString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</span>}
                                  </div>
                                </div>
                                <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                                  <button onClick={() => { setSelectedTest(t); loadTestReports(t.id); setBatchTestView("report"); }} style={{ ...abtn("primary"), padding:"7px 12px", fontSize:12 }}>Report</button>
                                  <button onClick={() => { setPaperFilter(t.paper_id); setTab("list"); loadAll(t.paper_id); }} style={{ ...abtn("ghost"), padding:"7px 12px", fontSize:12 }}>Questions</button>
                                  <button onClick={() => { setSelectedTest(t); setTestForm({ name:t.name, description:t.description||"", paper_id:t.paper_id, exam_window_start:t.exam_window_start||"", exam_window_end:t.exam_window_end||"", attempt_limit:String(t.attempt_limit||"1"), access_code:t.access_code||"", access_code_enabled:t.access_code_enabled||"false", resume_code:t.resume_code||"", status:t.status||"scheduled", manual_release:t.manual_release||"false" }); setBatchTestView("edit"); }} style={{ ...abtn("ghost"), padding:"7px 12px", fontSize:12 }}>Edit</button>
                                  <button onClick={() => deleteTest(t.id)} style={{ ...abtn("danger"), padding:"7px 10px", fontSize:12 }}>Del</button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* CREATE / EDIT TEST FORM */}
                {(batchTestView === "create" || batchTestView === "edit") && (
                  <div style={{ ...acard, padding:"20px 22px", display:"flex", flexDirection:"column", gap:14 }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                      <div style={{ color:"#a5b4fc", fontWeight:700 }}>{batchTestView === "edit" ? "Edit Test" : "Schedule New Test"}</div>
                      <button onClick={() => { setBatchTestView("list"); setSelectedTest(null); }} style={{ ...abtn("ghost"), fontSize:12, padding:"5px 12px" }}>Cancel</button>
                    </div>

                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                      <div>
                        <label style={alabel}>Test Name</label>
                        <input value={testForm.name} onChange={e=>setTestForm(p=>({...p,name:e.target.value}))} placeholder="e.g. Weekly Test 1, Full Mock 3" style={ainput} />
                      </div>
                      <div>
                        <label style={alabel}>Paper ID (question set)</label>
                        <input value={testForm.paper_id} onChange={e=>setTestForm(p=>({...p,paper_id:e.target.value}))} placeholder="e.g. BATCH_A_T1" style={ainput} />
                      </div>
                    </div>

                    <div>
                      <label style={alabel}>Description (optional)</label>
                      <input value={testForm.description} onChange={e=>setTestForm(p=>({...p,description:e.target.value}))} placeholder="e.g. Covers Mechanics and Thermodynamics" style={ainput} />
                    </div>

                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                      <div>
                        <label style={alabel}>Test Date & Start Time</label>
                        <input type="datetime-local" value={testForm.exam_window_start} onChange={e=>setTestForm(p=>({...p,exam_window_start:e.target.value}))} style={ainput} />
                      </div>
                      <div>
                        <label style={alabel}>End Time</label>
                        <input type="datetime-local" value={testForm.exam_window_end} onChange={e=>setTestForm(p=>({...p,exam_window_end:e.target.value}))} style={ainput} />
                      </div>
                    </div>

                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                      <div>
                        <label style={alabel}>Max Attempts</label>
                        <input type="number" min="1" value={testForm.attempt_limit} onChange={e=>setTestForm(p=>({...p,attempt_limit:e.target.value}))} style={ainput} />
                      </div>
                      <div>
                        <label style={alabel}>Resume Code (tab-switch)</label>
                        <input value={testForm.resume_code} onChange={e=>setTestForm(p=>({...p,resume_code:e.target.value}))} placeholder="Code to resume" style={ainput} />
                      </div>
                    </div>

                    {/* Access code toggle */}
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                      <div style={{ color:"#e2e8f0", fontSize:13 }}>Require Access Code to Start</div>
                      <button onClick={()=>setTestForm(p=>({...p,access_code_enabled:p.access_code_enabled==="true"?"false":"true"}))} style={{ ...abtn(testForm.access_code_enabled==="true"?"success":"ghost"), minWidth:70 }}>{testForm.access_code_enabled==="true"?"ON":"OFF"}</button>
                    </div>
                    {testForm.access_code_enabled === "true" && (
                      <div>
                        <label style={alabel}>Start Access Code</label>
                        <input value={testForm.access_code} onChange={e=>setTestForm(p=>({...p,access_code:e.target.value}))} placeholder="Code to begin test" style={ainput} />
                      </div>
                    )}

                    {/* Manual release toggle */}
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:"rgba(34,197,94,0.06)", borderRadius:8, padding:"10px 14px" }}>
                      <div>
                        <div style={{ color:"#e2e8f0", fontSize:13 }}>Release Now (manual override)</div>
                        <div style={{ color:"#64748b", fontSize:11 }}>Force-show this test to students regardless of date</div>
                      </div>
                      <button onClick={()=>setTestForm(p=>({...p,manual_release:p.manual_release==="true"?"false":"true"}))} style={{ ...abtn(testForm.manual_release==="true"?"success":"ghost"), minWidth:70 }}>{testForm.manual_release==="true"?"ON":"OFF"}</button>
                    </div>

                    <button onClick={batchTestView === "edit" ? saveTest : createBatchTest} style={{ ...abtn("success"), padding:"12px", fontSize:"1rem" }}>
                      {batchTestView === "edit" ? "Save Changes" : "Schedule Test"}
                    </button>
                  </div>
                )}

                {/* TEST REPORT (per-test rankings) */}
                {batchTestView === "report" && selectedTest && (
                  <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
                      <div>
                        <div style={{ color:"#a5b4fc", fontWeight:700 }}>{selectedTest.name} - Report</div>
                        <div style={{ color:"#64748b", fontSize:12 }}>{testReports.length} students attempted</div>
                      </div>
                      <div style={{ display:"flex", gap:8 }}>
                        <button onClick={() => setBatchTestView("list")} style={abtn("ghost")}>Back to Tests</button>
                        {testReports.length > 0 && <button onClick={() => downloadTestReport(selectedTest.name, testReports)} style={{ ...abtn("success"), fontSize:12, padding:"8px 16px" }}>Download CSV</button>}
                      </div>
                    </div>

                    {testReportLoading ? <div style={{ textAlign:"center", color:"#64748b", padding:30 }}>Loading...</div>
                    : testReports.length === 0 ? <div style={{ textAlign:"center", color:"#475569", padding:30 }}>No attempts yet for this test.</div>
                    : (
                      <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                        <div style={{ display:"grid", gridTemplateColumns:"50px 1fr 90px 70px 70px 70px", gap:8, padding:"8px 14px", background:"rgba(99,102,241,0.15)", borderRadius:"10px 10px 0 0", fontSize:10, color:"#64748b", textTransform:"uppercase", letterSpacing:0.5 }}>
                          <div>Rank</div><div>Student</div><div>Score</div>
                          <div style={{ color:"#4ade80" }}>Correct</div>
                          <div style={{ color:"#f87171" }}>Wrong</div>
                          <div>Skip</div>
                        </div>
                        {testReports.map((r, i) => {
                          const pct = Math.round((r.score/720)*100);
                          return (
                            <div key={r.id} style={{ display:"grid", gridTemplateColumns:"50px 1fr 90px 70px 70px 70px", gap:8, padding:"10px 14px", background:i%2===0?"rgba(255,255,255,0.025)":"rgba(255,255,255,0.015)", alignItems:"center" }}>
                              <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                                <span style={{ color:i<3?"#fbbf24":"#475569", fontWeight:700, fontSize:14 }}>{i+1}</span>
                              </div>
                              <div>
                                <div style={{ color:"#e2e8f0", fontSize:13, fontWeight:600 }}>{r.student_name || r.student_email?.split("@")[0] || "Student"}</div>
                                <div style={{ color:"#475569", fontSize:10 }}>{r.student_email}</div>
                              </div>
                              <div style={{ fontWeight:700, color:pct>=50?"#4ade80":"#f87171" }}>{r.score}<span style={{ color:"#374151", fontSize:10, fontWeight:400 }}>/720</span></div>
                              <div style={{ color:"#4ade80", fontWeight:600 }}>{r.correct}</div>
                              <div style={{ color:"#f87171", fontWeight:600 }}>{r.wrong}</div>
                              <div style={{ color:"#64748b" }}>{r.unattempted}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

                        {batchView === "edit" && selectedBatch && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button onClick={() => { setBatchView("list"); setSelectedBatch(null); setBatchMsg(null); }} style={abtn("ghost")}>Back</button>
                  <div>
                    <div style={{ color: "#e2e8f0", fontWeight: 700, fontSize: "1.1rem" }}>{selectedBatch.name}</div>
                    {selectedBatch.description && <div style={{ color: "#64748b", fontSize: 12 }}>{selectedBatch.description}</div>}
                  </div>
                </div>

                {/* CREATE + ADD STUDENTS */}
                <div style={{ ...acard, padding: "18px 20px" }}>
                  <div style={{ color: "#a5b4fc", fontWeight: 700, marginBottom: 4 }}>Add New Students</div>
                  <div style={{ color: "#64748b", fontSize: 12, marginBottom: 14 }}>Create accounts and add to this batch in one step.</div>

                  {addStudentMsg && <div style={mstyle(addStudentMsg)}>{addStudentMsg.text}</div>}

                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 2fr 32px", gap: 8 }}>
                      <div style={{ color: "#64748b", fontSize: 11, textTransform: "uppercase" }}>Email *</div>
                      <div style={{ color: "#64748b", fontSize: 11, textTransform: "uppercase" }}>Password * (min 6)</div>
                      <div style={{ color: "#64748b", fontSize: 11, textTransform: "uppercase" }}>Full Name</div>
                      <div />
                    </div>
                    {addStudentRows.map((row, i) => (
                      <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 2fr 2fr 32px", gap: 8, alignItems: "center" }}>
                        <input type="email" value={row.email} placeholder="email@example.com"
                          onChange={e => setAddStudentRows(p => p.map((r,j) => j===i ? { ...r, email: e.target.value } : r))}
                          style={{ ...ainput, padding: "8px 10px", fontSize: 12 }} />
                        <input type="text" value={row.password} placeholder="password"
                          onChange={e => setAddStudentRows(p => p.map((r,j) => j===i ? { ...r, password: e.target.value } : r))}
                          style={{ ...ainput, padding: "8px 10px", fontSize: 12, fontFamily: "monospace" }} />
                        <input type="text" value={row.name} placeholder="Name (optional)"
                          onChange={e => setAddStudentRows(p => p.map((r,j) => j===i ? { ...r, name: e.target.value } : r))}
                          style={{ ...ainput, padding: "8px 10px", fontSize: 12 }} />
                        <button onClick={() => setAddStudentRows(p => p.length > 1 ? p.filter((_,j) => j!==i) : [{ email:"", password:"", name:"" }])}
                          style={{ background:"none", border:"none", color:"#475569", cursor:"pointer", fontSize:18, padding:0 }}>x</button>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                    <button onClick={() => setAddStudentRows(p => [...p, { email:"", password:"", name:"" }])}
                      style={{ ...abtn("ghost"), fontSize: 12, padding: "7px 14px" }}>+ Add Row</button>
                    <button onClick={() => { const inp=document.createElement("input"); inp.type="file"; inp.accept=".csv"; inp.onchange=e=>{ const rd=new FileReader(); rd.onload=ev=>{ const text=ev.target.result; const rows=text.split("\n").slice(1).filter(l=>l.trim()).map(l=>{ const cols=(l.replace(/\r/g,"")+",,,").split(","); return { email:(cols[0]||"").trim(), password:(cols[1]||"").trim(), name:(cols[2]||"").trim() }; }).filter(r=>r.email.includes("@")); setAddStudentRows(rows.length?rows:[{email:"",password:"",name:""}]); setAddStudentMsg({type:"ok",text:rows.length+" rows loaded."}); }; rd.readAsText(e.target.files[0]); }; inp.click(); }}
                      style={{ ...abtn("ghost"), fontSize: 12, padding: "7px 14px" }}>Import CSV</button>
                    <button onClick={() => { const s="email,password,full_name\nstudent1@example.com,Pass@1234,Rahul Sharma\n"; const b=new Blob([s],{type:"text/csv"}); const u=URL.createObjectURL(b); const a=document.createElement("a"); a.href=u;a.download="template.csv";a.click();URL.revokeObjectURL(u); }}
                      style={{ ...abtn("ghost"), fontSize: 12, padding: "7px 14px" }}>Download Template</button>
                  </div>

                  <button onClick={createStudentsInBatch} disabled={addStudentLoading}
                    style={{ ...abtn("success"), padding: "11px 24px", opacity: addStudentLoading ? 0.6 : 1 }}>
                    {addStudentLoading ? "Creating..." : "Create " + addStudentRows.filter(r=>r.email.includes("@")&&r.password.length>=6).length + " Student(s) and Add to Batch"}
                  </button>
                </div>

                {/* CURRENT MEMBERS LIST */}
                <div style={{ ...acard, padding: "18px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ color: "#a5b4fc", fontWeight: 700 }}>{"Current Members (" + batchMembers.length + ")"}</div>
                    <button onClick={() => loadBatchDetail(selectedBatch)} style={{ ...abtn("ghost"), padding: "5px 10px", fontSize: 11 }}>Refresh</button>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={alabel}>Add existing accounts by email</label>
                    <textarea value={batchMemberInput} onChange={e => setBatchMemberInput(e.target.value)}
                      placeholder="existing@student.com"
                      style={{ ...ainput, minHeight: 50, resize: "vertical", lineHeight: 1.6, marginBottom: 8, fontSize: 12 }} />
                    <button onClick={addBatchMembers} style={{ ...abtn("primary"), fontSize: 12, padding: "7px 16px" }}>Add to Batch</button>
                  </div>
                  {batchMembers.length > 0 ? (
                    <div style={{ maxHeight: 260, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                      {batchMembers.map((m, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "7px 12px" }}>
                          <span style={{ color: "#c7d2fe", fontSize: 13 }}>{m.email}</span>
                          <button onClick={() => removeBatchMember(m.email)} style={{ background:"none", border:"none", color:"#64748b", cursor:"pointer", fontSize:16, padding:"0 4px" }}>x</button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", color: "#475569", padding: 16, fontSize: 13 }}>No members yet.</div>
                  )}
                </div>


                {/* Exam settings for this batch */}
                <div style={{ ...acard, padding: "18px 20px" }}>
                  <div style={{ color: "#a5b4fc", fontWeight: 700, marginBottom: 4 }}>Exam Settings for this Batch</div>
                  <div style={{ color: "#64748b", fontSize: 12, marginBottom: 16 }}>These override global settings for students in this batch.</div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {/* Exam enabled */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div><div style={{ color: "#e2e8f0", fontSize: 13 }}>Exam Enabled</div><div style={{ color: "#64748b", fontSize: 11 }}>Allow this batch to take the exam</div></div>
                      <button onClick={() => setBatchSettings(p => ({ ...p, exam_enabled: p.exam_enabled === "false" ? "true" : "false" }))} style={{ ...abtn(batchSettings.exam_enabled !== "false" ? "success" : "ghost"), minWidth: 70 }}>{batchSettings.exam_enabled !== "false" ? "ON" : "OFF"}</button>
                    </div>

                    {/* Access code */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div><div style={{ color: "#e2e8f0", fontSize: 13 }}>Access Code Required</div></div>
                      <button onClick={() => setBatchSettings(p => ({ ...p, access_code_enabled: p.access_code_enabled === "true" ? "false" : "true" }))} style={{ ...abtn(batchSettings.access_code_enabled === "true" ? "success" : "ghost"), minWidth: 70 }}>{batchSettings.access_code_enabled === "true" ? "ON" : "OFF"}</button>
                    </div>
                    {batchSettings.access_code_enabled === "true" && (
                      <div>
                        <label style={alabel}>Start Code</label>
                        <input value={batchSettings.access_code || ""} onChange={e => setBatchSettings(p => ({ ...p, access_code: e.target.value }))} placeholder="Code to start exam" style={{ ...ainput, marginBottom: 8 }} />
                      </div>
                    )}

                    {/* Resume code */}
                    <div>
                      <label style={alabel}>Resume Code (tab-switch lock)</label>
                      <input value={batchSettings.resume_code || ""} onChange={e => setBatchSettings(p => ({ ...p, resume_code: e.target.value }))} placeholder="Code to resume after tab switch" style={ainput} />
                    </div>

                    {/* Exam window */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div>
                        <label style={alabel}>Window Start</label>
                        <input type="datetime-local" value={batchSettings.exam_window_start || ""} onChange={e => setBatchSettings(p => ({ ...p, exam_window_start: e.target.value }))} style={ainput} />
                      </div>
                      <div>
                        <label style={alabel}>Window End</label>
                        <input type="datetime-local" value={batchSettings.exam_window_end || ""} onChange={e => setBatchSettings(p => ({ ...p, exam_window_end: e.target.value }))} style={ainput} />
                      </div>
                    </div>

                    {/* Attempt limit */}
                    <div>
                      <label style={alabel}>Max Attempts (0 = unlimited)</label>
                      <input type="number" min="0" value={batchSettings.attempt_limit || "0"} onChange={e => setBatchSettings(p => ({ ...p, attempt_limit: e.target.value }))} style={{ ...ainput, maxWidth: 180 }} />
                    </div>

                    {/* Paper ID */}
                    <div>
                      <label style={alabel}>Paper ID</label>
                      <input value={batchSettings.paper_id || "NEET_2025"} onChange={e => setBatchSettings(p => ({ ...p, paper_id: e.target.value }))} placeholder="e.g. NEET_2025, NEET_2024" style={{ ...ainput, maxWidth: 220 }} />
                      <div style={{ color: "#475569", fontSize: 11, marginTop: 4 }}>Questions with this paper_id will be shown to this batch</div>
                    </div>
                  </div>

                  <button onClick={saveBatchSettings} style={{ ...abtn("success"), marginTop: 16, padding: "12px 28px" }}>Save Batch Settings</button>
                </div>
              </div>
            )}
          </div>
        )}

                {tab === "students" && (
          <div>
            {/* Sub-tabs */}
            <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap:"wrap" }}>
              <button onClick={() => setStudentTab("results")}     style={abtn(studentTab === "results"     ? "primary" : "ghost")}>Exam Results</button>
              <button onClick={() => setStudentTab("studentcard")} style={abtn(studentTab === "studentcard" ? "primary" : "ghost")}>Student Report Card</button>
              <button onClick={() => setStudentTab("manage")}      style={abtn(studentTab === "manage"      ? "primary" : "ghost")}>Manage Students</button>
              <button onClick={() => setStudentTab("add")}         style={abtn(studentTab === "add"         ? "primary" : "ghost")}>Add Students via CSV</button>
            </div>

            {/* RESULTS SUB-TAB */}
            {studentTab === "results" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Header row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                  <div style={{ color: "#a5b4fc", fontWeight: 700, fontSize: "1rem" }}>{"Exam Reports (" + students.length + " attempts)"}</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={loadStudents} style={abtn("ghost")}>Refresh</button>
                    <button
                      onClick={() => {
                        // Apply current filters before downloading
                        let rows = [...students];
                        if (reportFilter.search)     rows = rows.filter(r => r.user_id.toLowerCase().includes(reportFilter.search.toLowerCase()));
                        if (reportFilter.nameSearch) rows = rows.filter(r => (r.student_name||"").toLowerCase().includes(reportFilter.nameSearch.toLowerCase()) || (r.student_email||"").toLowerCase().includes(reportFilter.nameSearch.toLowerCase()));
                        if (reportFilter.paperId)    rows = rows.filter(r => (r.paper_id||"").toLowerCase().includes(reportFilter.paperId.toLowerCase()));
                        if (reportFilter.minScore)   rows = rows.filter(r => r.score >= +reportFilter.minScore);
                        if (reportFilter.maxScore)   rows = rows.filter(r => r.score <= +reportFilter.maxScore);
                        if (reportFilter.dateFrom)   rows = rows.filter(r => new Date(r.created_at) >= new Date(reportFilter.dateFrom));
                        if (reportFilter.dateTo)     rows = rows.filter(r => new Date(r.created_at) <= new Date(reportFilter.dateTo + "T23:59:59"));
                        downloadReportsCSV(rows);
                      }}
                      style={{ ...abtn("success"), fontSize: 12, padding: "8px 16px" }}>
                      Download CSV
                    </button>
                  </div>
                </div>

                {/* Summary stats */}
                {students.length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                    {[
                      ["Total Attempts",    students.length,                                                                                              "#a5b4fc"],
                      ["Avg Score",         Math.round(students.reduce((a,r) => a+r.score, 0)/students.length) + "/720",                                 "#4ade80"],
                      ["Highest Score",     Math.max(...students.map(r => r.score)) + "/720",                                                            "#fbbf24"],
                      ["Pass Rate",         Math.round(students.filter(r => r.score>=360).length/students.length*100) + "%",                             "#f472b6"],
                    ].map(([l,v,c]) => (
                      <div key={l} style={{ ...acard, padding: "12px 14px", textAlign: "center" }}>
                        <div style={{ color: c, fontWeight: 700, fontSize: "1.15rem" }}>{v}</div>
                        <div style={{ color: "#64748b", fontSize: 11, marginTop: 3 }}>{l}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Filters */}
                <div style={{ ...acard, padding: "14px 16px" }}>
                  <div style={{ color: "#94a3b8", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Filter & Sort</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                    <div>
                      <label style={alabel}>Search User ID</label>
                      <input value={reportFilter.search} onChange={e => setReportFilter(p=>({...p,search:e.target.value}))} placeholder="Paste user ID..." style={{ ...ainput, fontSize: 12 }} />
                    </div>
                    <div>
                      <label style={alabel}>Min Score</label>
                      <input type="number" value={reportFilter.minScore} onChange={e => setReportFilter(p=>({...p,minScore:e.target.value}))} placeholder="0" style={{ ...ainput, fontSize: 12 }} />
                    </div>
                    <div>
                      <label style={alabel}>Max Score</label>
                      <input type="number" value={reportFilter.maxScore} onChange={e => setReportFilter(p=>({...p,maxScore:e.target.value}))} placeholder="720" style={{ ...ainput, fontSize: 12 }} />
                    </div>
                    <div>
                      <label style={alabel}>Date From</label>
                      <input type="date" value={reportFilter.dateFrom} onChange={e => setReportFilter(p=>({...p,dateFrom:e.target.value}))} style={{ ...ainput, fontSize: 12 }} />
                    </div>
                    <div>
                      <label style={alabel}>Date To</label>
                      <input type="date" value={reportFilter.dateTo} onChange={e => setReportFilter(p=>({...p,dateTo:e.target.value}))} style={{ ...ainput, fontSize: 12 }} />
                    </div>
                    <div>
                      <label style={alabel}>Sort By</label>
                      <select value={reportFilter.sortBy} onChange={e => setReportFilter(p=>({...p,sortBy:e.target.value}))} style={{ ...ainput, fontSize: 12, cursor: "pointer" }}>
                        <option value="date">Latest First</option>
                        <option value="date_asc">Oldest First</option>
                        <option value="score_desc">Highest Score</option>
                        <option value="score_asc">Lowest Score</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ gridColumn:"1/-1", display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginTop:4 }}>
                    <div>
                      <label style={alabel}>Student Name</label>
                      <input value={reportFilter.nameSearch} onChange={e=>setReportFilter(p=>({...p,nameSearch:e.target.value}))} placeholder="Name or email..." style={{ ...ainput, fontSize:12 }} />
                    </div>
                    <div>
                      <label style={alabel}>Paper ID (Batch)</label>
                      <input value={reportFilter.paperId} onChange={e=>setReportFilter(p=>({...p,paperId:e.target.value}))} placeholder="e.g. BATCH_A" style={{ ...ainput, fontSize:12 }} />
                    </div>
                  </div>
                  <button onClick={() => setReportFilter({ search:"", minScore:"", maxScore:"", dateFrom:"", dateTo:"", sortBy:"date", paperId:"", nameSearch:"" })}
                    style={{ ...abtn("ghost"), fontSize: 11, padding: "5px 12px", marginTop: 10 }}>Clear Filters</button>
                </div>

                {/* Results table */}
                {loadingStudents ? (
                  <div style={{ textAlign: "center", color: "#64748b", padding: 40 }}>Loading...</div>
                ) : students.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#475569", padding: 40 }}>No exam attempts yet.</div>
                ) : (() => {
                  // Apply filters
                  let rows = [...students];
                  if (reportFilter.search)     rows = rows.filter(r => r.user_id.toLowerCase().includes(reportFilter.search.toLowerCase()));
                  if (reportFilter.nameSearch) rows = rows.filter(r => (r.student_name||"").toLowerCase().includes(reportFilter.nameSearch.toLowerCase()) || (r.student_email||"").toLowerCase().includes(reportFilter.nameSearch.toLowerCase()));
                  if (reportFilter.paperId)    rows = rows.filter(r => (r.paper_id||"").toLowerCase().includes(reportFilter.paperId.toLowerCase()));
                  if (reportFilter.minScore)   rows = rows.filter(r => r.score >= +reportFilter.minScore);
                  if (reportFilter.maxScore)   rows = rows.filter(r => r.score <= +reportFilter.maxScore);
                  if (reportFilter.dateFrom)   rows = rows.filter(r => new Date(r.created_at) >= new Date(reportFilter.dateFrom));
                  if (reportFilter.dateTo)     rows = rows.filter(r => new Date(r.created_at) <= new Date(reportFilter.dateTo + "T23:59:59"));
                  // Sort
                  if (reportFilter.sortBy === "date")       rows.sort((a,b) => new Date(b.created_at)-new Date(a.created_at));
                  if (reportFilter.sortBy === "date_asc")   rows.sort((a,b) => new Date(a.created_at)-new Date(b.created_at));
                  if (reportFilter.sortBy === "score_desc") rows.sort((a,b) => b.score-a.score);
                  if (reportFilter.sortBy === "score_asc")  rows.sort((a,b) => a.score-b.score);

                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      {/* Table header */}
                      <div style={{ display: "grid", gridTemplateColumns: "28px 1fr 110px 90px 80px 80px 80px 70px", gap: 8, padding: "8px 14px", background: "rgba(99,102,241,0.15)", borderRadius: "10px 10px 0 0", fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>
                        <div>#</div>
                        <div>User</div>
                        <div>Date & Time</div>
                        <div>Score</div>
                        <div style={{ color: "#4ade80" }}>Correct</div>
                        <div style={{ color: "#f87171" }}>Wrong</div>
                        <div>Skip</div>
                        <div>Pctile</div>
                      </div>

                      {rows.length === 0 ? (
                        <div style={{ textAlign: "center", color: "#475569", padding: 20, fontSize: 13 }}>No results match filters.</div>
                      ) : rows.map((r, i) => {
                        const pct      = Math.round((r.score / 720) * 100);
                        const date     = new Date(r.created_at).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" });
                        const time     = new Date(r.created_at).toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" });
                        const isOpen   = reportExpanded === r.id;
                        const st       = r.subject_times || {};
                        const subjList = ["Physics","Chemistry","Botany","Zoology"];

                        return (
                          <div key={r.id || i}>
                            {/* Main row */}
                            <div
                              onClick={() => setReportExpanded(isOpen ? null : r.id)}
                              style={{ display: "grid", gridTemplateColumns: "28px 1fr 110px 90px 80px 80px 80px 70px", gap: 8, padding: "10px 14px", background: isOpen ? "rgba(99,102,241,0.1)" : (i%2===0 ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.015)"), cursor: "pointer", borderRadius: isOpen ? "0" : "0", alignItems: "center", transition: "background 0.15s" }}
                              onMouseEnter={e => e.currentTarget.style.background="rgba(99,102,241,0.08)"}
                              onMouseLeave={e => e.currentTarget.style.background=isOpen?"rgba(99,102,241,0.1)":(i%2===0?"rgba(255,255,255,0.025)":"rgba(255,255,255,0.015)")}>
                              <div style={{ color: "#475569", fontSize: 11 }}>{i+1}</div>
                              <div>
                                <div style={{ fontSize: 12, color: "#e2e8f0", fontWeight: 600 }}>{r.student_name || r.student_email?.split("@")[0] || r.user_id.slice(0,10)+"..."}</div>
                              <div style={{ fontSize: 10, color: "#475569" }}>{r.student_email || r.user_id.slice(0,12)+"..."}</div>
                                <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                                  <div style={{ height: 4, width: 60, background: "rgba(0,0,0,0.2)", borderRadius: 99 }}>
                                    <div style={{ height: "100%", borderRadius: 99, background: pct>=50?"#22c55e":"#ef4444", width: pct+"%" }} />
                                  </div>
                                  <span style={{ fontSize: 10, color: "#64748b" }}>{pct}%</span>
                                </div>
                              </div>
                              <div style={{ fontSize: 11, color: "#94a3b8" }}>{date}<br/><span style={{ color: "#475569" }}>{time}</span></div>
                              <div style={{ fontWeight: 700, color: pct>=50?"#4ade80":"#f87171", fontSize: "0.9rem" }}>{r.score}<span style={{ color: "#374151", fontWeight: 400, fontSize: 10 }}>/720</span></div>
                              <div style={{ color: "#4ade80", fontWeight: 600, fontSize: 13 }}>{r.correct}</div>
                              <div style={{ color: "#f87171", fontWeight: 600, fontSize: 13 }}>{r.wrong}</div>
                              <div style={{ color: "#64748b", fontSize: 13 }}>{r.unattempted}</div>
                              <div style={{ color: "#fbbf24", fontSize: 12 }}>{r.percentile != null ? r.percentile+"%" : ""}</div>
                            </div>

                            {/* Expanded detail row */}
                            {isOpen && (
                              <div style={{ background: "rgba(99,102,241,0.06)", borderTop: "1px solid rgba(99,102,241,0.15)", padding: "14px 18px", display: "flex", gap: 16, flexWrap: "wrap" }}>
                                {/* Subject time breakdown */}
                                <div style={{ flex: 1, minWidth: 200 }}>
                                  <div style={{ color: "#a5b4fc", fontSize: 11, fontWeight: 600, marginBottom: 8, textTransform: "uppercase" }}>Time per Subject</div>
                                  {subjList.map(s => {
                                    const t = st[s] || 0;
                                    const tot = subjList.reduce((a,b) => a+(st[b]||0), 0) || 1;
                                    return (
                                      <div key={s} style={{ marginBottom: 6 }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 2 }}>
                                          <span style={{ color: "#94a3b8" }}>{s}</span>
                                          <span style={{ color: "#64748b" }}>{Math.floor(t/60)}m {t%60}s</span>
                                        </div>
                                        <div style={{ height: 4, background: "rgba(0,0,0,0.2)", borderRadius: 99 }}>
                                          <div style={{ height: "100%", borderRadius: 99, background: "#6366f1", width: Math.round(t/tot*100)+"%" }} />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                                {/* Score breakdown */}
                                <div style={{ flex: 1, minWidth: 160 }}>
                                  <div style={{ color: "#a5b4fc", fontSize: 11, fontWeight: 600, marginBottom: 8, textTransform: "uppercase" }}>Score Breakdown</div>
                                  {[
                                    ["Correct",     r.correct,     "+"+r.correct*4+" marks",    "#4ade80"],
                                    ["Wrong",       r.wrong,       "-"+r.wrong+" marks",          "#f87171"],
                                    ["Unattempted", r.unattempted, "0 marks",                    "#64748b"],
                                    ["Total Score", r.score+"/720","",                           "#a5b4fc"],
                                  ].map(([l,v,extra,c]) => (
                                    <div key={l} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                                      <span style={{ color: "#94a3b8" }}>{l}</span>
                                      <span style={{ color: c, fontWeight: 600 }}>{v} <span style={{ color: "#475569", fontWeight: 400, fontSize: 10 }}>{extra}</span></span>
                                    </div>
                                  ))}
                                </div>
                                {/* Download individual report */}
                                <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 6 }}>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); downloadReportsCSV([r]); }}
                                    style={{ ...abtn("ghost"), fontSize: 11, padding: "6px 12px" }}>
                                    Download Row
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setStudentReportEmail(r.student_email || r.user_id); setStudentTab("studentcard"); }}
                                    style={{ ...abtn("primary"), fontSize: 11, padding: "6px 12px" }}>
                                    All Tests
                                  </button>
                                  <div style={{ fontSize: 10, color: "#374151", textAlign: "center" }}>{r.student_name || r.user_id.slice(0,8)}</div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Footer */}
                      {rows.length > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(99,102,241,0.08)", borderRadius: "0 0 10px 10px", fontSize: 12 }}>
                          <span style={{ color: "#64748b" }}>{"Showing " + rows.length + " of " + students.length + " attempts"}</span>
                          <button
                            onClick={() => downloadReportsCSV(rows)}
                            style={{ ...abtn("success"), fontSize: 11, padding: "6px 14px" }}>
                            Download Filtered CSV
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

        {/* BRANDING TAB */}

            {/* STUDENT REPORT CARD SUB-TAB */}
            {studentTab === "studentcard" && (
              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ color:"#a5b4fc", fontWeight:700, fontSize:"1rem" }}>Student Report Card</div>
                  <div style={{ color:"#64748b", fontSize:12 }}>All tests by one student</div>
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <input value={studentReportEmail} onChange={e=>setStudentReportEmail(e.target.value)}
                    placeholder="Enter student email or name, then press Enter"
                    style={{ ...ainput, flex:1 }}
                    onKeyDown={async e => { if (e.key !== "Enter") return; setStudentReportLoading(true); const q=studentReportEmail.trim(); const { data } = await supabase.from("test_results").select("id,student_name,student_email,test_name,paper_id,score,correct,wrong,unattempted,subject_times,created_at,batch_test_id,percentile").or("student_email.ilike.%"+q+"%,student_name.ilike.%"+q+"%").order("created_at",{ascending:true}); setStudentReportData(data||[]); setStudentReportLoading(false); }} />
                  <button onClick={async()=>{ setStudentReportLoading(true); const q=studentReportEmail.trim(); const {data}=await supabase.from("test_results").select("id,student_name,student_email,test_name,paper_id,score,correct,wrong,unattempted,subject_times,created_at,batch_test_id,percentile").or("student_email.ilike.%"+q+"%,student_name.ilike.%"+q+"%").order("created_at",{ascending:true}); setStudentReportData(data||[]); setStudentReportLoading(false); }} style={abtn("primary")}>Search</button>
                  {studentReportData.length > 0 && <button onClick={()=>downloadReportsCSV(studentReportData)} style={{ ...abtn("success"), fontSize:12 }}>CSV</button>}
                </div>

                {studentReportLoading ? <div style={{ textAlign:"center", color:"#64748b", padding:30 }}>Loading...</div>
                : studentReportData.length === 0 ? <div style={{ color:"#475569", fontSize:13, textAlign:"center", padding:20 }}>Search by email or name and press Enter or click Search.</div>
                : (() => {
                  const name  = studentReportData[0]?.student_name || studentReportData[0]?.student_email || "Student";
                  const avgSc = Math.round(studentReportData.reduce((a,r)=>a+r.score,0)/studentReportData.length);
                  const best  = Math.max(...studentReportData.map(r=>r.score));
                  const trend = studentReportData.length > 1
                    ? (studentReportData[studentReportData.length-1].score > studentReportData[0].score ? "Improving" : "Declining") : "Single test";
                  const trendCol = trend==="Improving"?"#4ade80":trend==="Declining"?"#f87171":"#64748b";
                  return (
                    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                      <div style={{ ...acard, padding:"14px 18px" }}>
                        <div style={{ color:"#e2e8f0", fontWeight:700, marginBottom:10 }}>{name}</div>
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
                          {[["Tests",studentReportData.length,"#a5b4fc"],["Best",best+"/720","#4ade80"],["Avg",avgSc+"/720","#fbbf24"],["Trend",trend,trendCol]].map(([l,v,c])=>(
                            <div key={l} style={{ background:"rgba(255,255,255,0.03)", borderRadius:8, padding:"8px 10px", textAlign:"center" }}>
                              <div style={{ color:c, fontWeight:700 }}>{v}</div>
                              <div style={{ color:"#64748b", fontSize:10, marginTop:2 }}>{l}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                      {studentReportData.length > 1 && (
                        <div style={{ ...acard, padding:"14px 18px" }}>
                          <div style={{ color:"#a5b4fc", fontSize:11, fontWeight:600, marginBottom:8, textTransform:"uppercase" }}>Score Trend</div>
                          <div style={{ display:"flex", alignItems:"flex-end", gap:4, height:70 }}>
                            {studentReportData.map((r,i)=>{ const h=Math.max(4,Math.round((r.score/720)*100)); return (
                              <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
                                <div style={{ fontSize:8, color:"#64748b" }}>{r.score}</div>
                                <div style={{ width:"100%", background:h>=50?"#6366f1":"#ef4444", borderRadius:"2px 2px 0 0", height:h*0.65+"%" }} />
                                <div style={{ fontSize:7, color:"#475569", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:36 }}>{r.test_name||"T"+(i+1)}</div>
                              </div>
                            );})}
                          </div>
                        </div>
                      )}
                      {studentReportData.map((r,i)=>{ const pct=Math.round((r.score/720)*100); const d=new Date(r.created_at).toLocaleDateString("en-IN",{day:"numeric",month:"short"}); const st=r.subject_times||{}; return (
                        <div key={r.id} style={{ ...acard, padding:"12px 16px", display:"flex", alignItems:"center", gap:12 }}>
                          <div style={{ width:36, height:36, borderRadius:"50%", background:pct>=50?"rgba(34,197,94,0.2)":"rgba(239,68,68,0.2)", border:"2px solid "+(pct>=50?"#22c55e":"#ef4444"), display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, color:pct>=50?"#4ade80":"#f87171", fontSize:11, flexShrink:0 }}>{pct}%</div>
                          <div style={{ flex:1 }}>
                            <div style={{ color:"#e2e8f0", fontWeight:600, fontSize:13 }}>{r.test_name||"Test "+(i+1)}</div>
                            <div style={{ color:"#475569", fontSize:11 }}>{d} | {r.paper_id}</div>
                            <div style={{ display:"flex", gap:8, fontSize:10, color:"#64748b", marginTop:2 }}>
                              {["Physics","Chemistry","Botany","Zoology"].map(s=><span key={s}>{s.slice(0,3)}: {Math.floor((st[s]||0)/60)}m</span>)}
                            </div>
                          </div>
                          <div style={{ textAlign:"right", flexShrink:0 }}>
                            <div style={{ color:"#e2e8f0", fontWeight:700 }}>{r.score}<span style={{ color:"#374151", fontSize:10, fontWeight:400 }}>/720</span></div>
                            <div style={{ fontSize:11 }}><span style={{ color:"#4ade80" }}>{r.correct}C</span> <span style={{ color:"#f87171" }}>{r.wrong}W</span> <span style={{ color:"#94a3b8" }}>{r.unattempted}S</span></div>
                            {r.percentile!=null && <div style={{ fontSize:10, color:"#818cf8" }}>{r.percentile}th %ile</div>}
                          </div>
                        </div>
                      );})}
                    </div>
                  );
                })()}
              </div>
            )}

                {/* ADD STUDENTS SUB-TAB */}
            {studentTab === "add" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {stuCsvMsg && <div style={mstyle(stuCsvMsg)}>{stuCsvMsg.text}</div>}

                {/* Format guide */}
                <div style={{ ...acard, padding: "18px 20px" }}>
                  <div style={{ color: "#a5b4fc", fontWeight: 700, marginBottom: 10 }}>CSV Format</div>
                  <div style={{ background: "#070d1a", borderRadius: 8, padding: "10px 14px", fontFamily: "monospace", fontSize: 12, color: "#86efac", marginBottom: 12, overflowX: "auto" }}>
                    email, password, full_name
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 14 }}>
                    {[
                      ["email",     "Student email address (required)"],
                      ["password",  "Login password, min 6 chars (required)"],
                      ["full_name", "Student full name (optional)"],
                    ].map(([k, v]) => (
                      <div key={k} style={{ fontSize: 12 }}>
                        <span style={{ color: "#fbbf24", fontFamily: "monospace" }}>{k}</span>
                        <span style={{ color: "#64748b" }}> - {v}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      const s = "email,password,full_name\nstudent1@example.com,Pass@1234,Rahul Sharma\nstudent2@example.com,Pass@5678,Priya Singh\nstudent3@example.com,Pass@9012,Amit Patel\n";
                      const b = new Blob([s], { type: "text/csv" });
                      const u = URL.createObjectURL(b);
                      const a = document.createElement("a");
                      a.href = u; a.download = "sample_students.csv"; a.click();
                      URL.revokeObjectURL(u);
                    }}
                    style={{ ...abtn("ghost"), fontSize: 12 }}>
                    Download Sample CSV
                  </button>
                </div>

                {/* Upload area */}
                <div
                  onClick={() => { const i = document.createElement("input"); i.type = "file"; i.accept = ".csv"; i.onchange = e => handleStudentCSVFile(e.target.files[0]); i.click(); }}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); handleStudentCSVFile(e.dataTransfer.files[0]); }}
                  style={{ border: "2px dashed rgba(99,102,241,0.4)", borderRadius: 12, padding: 28, textAlign: "center", cursor: "pointer", background: "rgba(99,102,241,0.04)" }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>[ CSV ]</div>
                  <div style={{ color: "#94a3b8", fontSize: 14 }}>Click or drag and drop student CSV here</div>
                  <div style={{ color: "#475569", fontSize: 12, marginTop: 4 }}>Each row creates one student account</div>
                </div>

                {/* Preview */}
                {stuCsvPreview.length > 0 && (
                  <div style={{ ...acard, padding: "14px 16px" }}>
                    <div style={{ color: "#a5b4fc", fontWeight: 700, marginBottom: 8 }}>Preview (first 5)</div>
                    {stuCsvPreview.map((s, i) => (
                      <div key={i} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "8px 12px", marginBottom: 6, fontSize: 12, display: "flex", gap: 12, alignItems: "center" }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(99,102,241,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#818cf8", fontWeight: 700, fontSize: 11, flexShrink: 0 }}>{i + 1}</div>
                        <div>
                          <div style={{ color: "#e2e8f0" }}>{s.full_name || "(no name)"}</div>
                          <div style={{ color: "#64748b" }}>{s.email}</div>
                        </div>
                        <div style={{ marginLeft: "auto", color: "#475569", fontFamily: "monospace", fontSize: 11 }}>{"*".repeat(s.password.length)}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Progress */}
                {stuCsvProgress && (
                  <div style={{ color: "#a5b4fc", fontSize: 13, textAlign: "center" }}>Creating accounts: {stuCsvProgress}</div>
                )}

                {/* Upload button */}
                {stuCsvRows && stuCsvRows.length > 0 && (
                  <button
                    onClick={handleStudentCSVUpload}
                    disabled={stuCsvLoading}
                    style={{ ...abtn("success"), padding: "13px", fontSize: "1rem", opacity: stuCsvLoading ? 0.6 : 1 }}>
                    {stuCsvLoading ? "Creating accounts..." : "Create " + stuCsvRows.length + " Student Accounts"}
                  </button>
                )}

                <div style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 10, padding: "12px 16px", fontSize: 12, color: "#94a3b8", lineHeight: 1.8 }}>
                  <span style={{ color: "#fbbf24", fontWeight: 600 }}>Note: </span>
                  Accounts are created using Supabase Auth. Students can log in immediately with the email and password you set. Share credentials with students separately.
                </div>
              </div>
            )}
          </div>
        )}
        {tab === "analytics" && (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ color:"#a5b4fc", fontWeight:700, fontSize:"1rem" }}>Question Analytics</div>
                <div style={{ color:"#64748b", fontSize:12, marginTop:2 }}>Paper: <span style={{ color:"#fbbf24" }}>{paperFilter||"NEET_2025"}</span>  sorted hardest first</div>
              </div>
              <button onClick={loadAnalytics} disabled={analyticsLoading} style={abtn("ghost")}>{analyticsLoading ? "Loading..." : "Refresh"}</button>
            </div>
            {analyticsLoading ? (
              <div style={{ textAlign:"center", color:"#64748b", padding:40 }}>Calculating from {analyticsData?.total||0} attempts...</div>
            ) : !analyticsData ? (
              <div style={{ textAlign:"center", color:"#475569", padding:40 }}>No data yet. Students need to attempt exams first.</div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                {/* Header */}
                <div style={{ display:"grid", gridTemplateColumns:"40px 60px 1fr 70px 70px 70px 90px", gap:8, padding:"8px 12px", background:"rgba(99,102,241,0.15)", borderRadius:"10px 10px 0 0", fontSize:10, color:"#64748b", textTransform:"uppercase", letterSpacing:0.5 }}>
                  <div>Q#</div><div>Subject</div><div>Question</div>
                  <div style={{ color:"#4ade80" }}>Correct</div>
                  <div style={{ color:"#f87171" }}>Wrong</div>
                  <div>Skip</div>
                  <div style={{ color:"#fbbf24" }}>Accuracy</div>
                </div>
                {analyticsData.byQ.map((s, i) => {
                  const acc = s.attempts > 0 ? Math.round(s.correct/s.attempts*100) : 0;
                  const accColor = acc >= 70 ? "#4ade80" : acc >= 40 ? "#fbbf24" : "#f87171";
                  return (
                    <div key={s.q.id} style={{ display:"grid", gridTemplateColumns:"40px 60px 1fr 70px 70px 70px 90px", gap:8, padding:"9px 12px", background:i%2===0?"rgba(255,255,255,0.025)":"rgba(255,255,255,0.015)", alignItems:"center" }}>
                      <div style={{ color:"#818cf8", fontWeight:700, fontSize:12 }}>Q{s.q.number}</div>
                      <div style={{ fontSize:10, color:"#94a3b8", background:"rgba(255,255,255,0.06)", borderRadius:4, padding:"2px 5px" }}>{s.q.subject.slice(0,4)}</div>
                      <div style={{ fontSize:11, color:"#c7d2fe" }}>{(s.q.question_text||"").slice(0,55)}{(s.q.question_text||"").length>55?"...":""}</div>
                      <div style={{ color:"#4ade80", fontWeight:600, fontSize:13 }}>{s.correct}</div>
                      <div style={{ color:"#f87171", fontWeight:600, fontSize:13 }}>{s.wrong}</div>
                      <div style={{ color:"#64748b", fontSize:13 }}>{s.skip}</div>
                      <div>
                        <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                          <div style={{ flex:1, height:5, background:"rgba(0,0,0,0.3)", borderRadius:99 }}>
                            <div style={{ height:"100%", borderRadius:99, background:accColor, width:acc+"%" }} />
                          </div>
                          <span style={{ color:accColor, fontWeight:700, fontSize:11, minWidth:32 }}>{acc}%</span>
                        </div>
                        <div style={{ fontSize:9, color:"#475569", marginTop:1 }}>{s.attempts} attempts</div>
                      </div>
                    </div>
                  );
                })}
                <div style={{ padding:"8px 12px", background:"rgba(99,102,241,0.08)", borderRadius:"0 0 10px 10px", fontSize:11, color:"#64748b" }}>
                  Based on {analyticsData.total} exam attempts. Sorted: lowest accuracy (hardest) first.
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "branding" && (
          <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
            {brandingMsg && <div style={mstyle(brandingMsg)}>{brandingMsg.text}</div>}
             {/* Live Preview */}
            <div style={{ ...acard, padding:0, overflow:"hidden" }}>
              <div style={{ padding:"10px 16px", borderBottom:"1px solid rgba(255,255,255,0.08)", color:"#a5b4fc", fontWeight:700, fontSize:12, textTransform:"uppercase" }}>Live Preview</div>
              <div style={{ height:160, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:8,
                ...( brandingForm.bg_type === "solid" ? { background: brandingForm.bg_solid_color || "#0f172a" }
                   : brandingForm.bg_type === "image" && brandingForm.bg_image_data ? { backgroundImage:"url("+brandingForm.bg_image_data+")", backgroundSize:"cover", backgroundPosition:"center" }
                   : { background:"linear-gradient(135deg,"+(brandingForm.bg_gradient_from||"#0f0c29")+" 0%,"+(brandingForm.bg_gradient_to||"#302b63")+" 100%)" }) }}>
                {(brandingForm.logo_data || brandingForm.logo_url) && <img src={brandingForm.logo_data||brandingForm.logo_url} alt="logo" style={{ maxHeight:48, maxWidth:140, objectFit:"contain", borderRadius:4 }} />}
                {brandingForm.show_badge !== "false" && <div style={{ background:"rgba(168,85,247,0.3)", borderRadius:99, padding:"3px 12px", fontSize:10, color:brandingForm.badge_color||"#c084fc", letterSpacing:1, fontFamily:brandingForm.font_family||"inherit" }}>{brandingForm.badge_text || "NTA NEET UG 2025"}</div>}
                <div style={{ color:brandingForm.title_color||"#fff", fontWeight:700, fontSize:"1.1rem", fontFamily:brandingForm.font_family||"inherit" }}>{brandingForm.platform_name || "Mock Test Platform"}</div>
                <div style={{ color:brandingForm.tagline_color||"rgba(255,255,255,0.5)", fontSize:12, fontFamily:brandingForm.font_family||"inherit" }}>{brandingForm.platform_tagline || "Select your role to continue"}</div>
              </div>
            </div>
             {/* Logo */}
            <div style={{ ...acard, padding:"18px 20px" }}>
              <div style={{ color:"#a5b4fc", fontWeight:700, marginBottom:12 }}>Logo</div>
              <div style={{ display:"flex", gap:12, alignItems:"flex-start", flexWrap:"wrap" }}>
                <div onClick={() => { const inp=document.createElement("input"); inp.type="file"; inp.accept="image/*"; inp.onchange=async e=>{ const f=e.target.files[0]; if(!f) return; try { const {b64}=await compressToBase64(f); setBrandingForm(p=>({...p,logo_data:b64,logo_url:""})); setBrandingMsg({type:"ok",text:"Logo ready."}); } catch(ex){ setBrandingMsg({type:"error",text:ex.message}); } }; inp.click(); }}
                  style={{ border:"2px dashed "+(brandingForm.logo_data||brandingForm.logo_url?"rgba(99,102,241,0.5)":"rgba(99,102,241,0.25)"), borderRadius:10, padding:brandingForm.logo_data?6:20, cursor:"pointer", textAlign:"center", minWidth:120 }}>
                  {(brandingForm.logo_data||brandingForm.logo_url) ? (<img src={brandingForm.logo_data||brandingForm.logo_url} alt="logo" style={{ maxHeight:60, maxWidth:160, objectFit:"contain", display:"block", margin:"0 auto 6px" }} />) : (<div style={{ color:"#64748b", fontSize:12 }}>Click to upload logo</div>)}
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:8, flex:1 }}>
                  {(brandingForm.logo_data||brandingForm.logo_url) && <button onClick={()=>setBrandingForm(p=>({...p,logo_data:"",logo_url:""}))} style={{ ...abtn("danger"), fontSize:12, padding:"6px 14px" }}>Remove Logo</button>}
                  <div><label style={alabel}>Or paste image URL</label><input value={brandingForm.logo_url||""} onChange={e=>setBrandingForm(p=>({...p,logo_url:e.target.value,logo_data:""}))} placeholder="https://example.com/logo.png" style={{ ...ainput, fontSize:12 }} /></div>
                </div>
              </div>
            </div>
             {/* Text */}
            <div style={{ ...acard, padding:"18px 20px" }}>
              <div style={{ color:"#a5b4fc", fontWeight:700, marginBottom:12 }}>Text</div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                <div><label style={alabel}>Platform Name</label><input value={brandingForm.platform_name||""} onChange={e=>setBrandingForm(p=>({...p,platform_name:e.target.value}))} placeholder="Mock Test Platform" style={ainput} /></div>
                <div><label style={alabel}>Tagline</label><input value={brandingForm.platform_tagline||""} onChange={e=>setBrandingForm(p=>({...p,platform_tagline:e.target.value}))} placeholder="Select your role to continue" style={ainput} /></div>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div style={{ color:"#e2e8f0", fontSize:13 }}>Show Badge</div>
                  <button onClick={()=>setBrandingForm(p=>({...p,show_badge:p.show_badge==="false"?"true":"false"}))} style={{ ...abtn(brandingForm.show_badge!=="false"?"success":"ghost"), minWidth:60 }}>{brandingForm.show_badge!=="false"?"ON":"OFF"}</button>
                </div>
                {brandingForm.show_badge !== "false" && <div><label style={alabel}>Badge Text</label><input value={brandingForm.badge_text||""} onChange={e=>setBrandingForm(p=>({...p,badge_text:e.target.value}))} placeholder="NTA NEET UG 2025" style={ainput} /></div>}
              </div>
            </div>
            {/* Font & Colors */}
            <div style={{ ...acard, padding:"18px 20px" }}>
              <div style={{ color:"#a5b4fc", fontWeight:700, marginBottom:12 }}>Font & Colors</div>
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

                {/* Font family */}
                <div>
                  <label style={alabel}>Font</label>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                    {[
                      ["Georgia, serif",           "Georgia"],
                      ["'Crimson Pro', Georgia, serif", "Crimson Pro"],
                      ["Arial, sans-serif",         "Arial"],
                      ["'Trebuchet MS', sans-serif","Trebuchet"],
                      ["'Courier New', monospace",  "Courier"],
                    ].map(([val, label]) => (
                      <button key={val}
                        onClick={() => setBrandingForm(p => ({ ...p, font_family: val }))}
                        style={{ ...abtn(brandingForm.font_family === val ? "primary" : "ghost"), fontSize: 12, padding: "6px 14px", fontFamily: val }}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <div style={{ marginTop:8 }}>
                    <label style={alabel}>Or enter custom font name</label>
                    <input value={brandingForm.font_family||""} onChange={e=>setBrandingForm(p=>({...p,font_family:e.target.value}))}
                      placeholder="e.g. 'Poppins', sans-serif"
                      style={{ ...ainput, fontSize:12, fontFamily: brandingForm.font_family||"inherit" }} />
                  </div>
                </div>

                {/* Text colors */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  {[
                    ["title_color",   "Title Color",   "#ffffff"],
                    ["tagline_color", "Tagline Color", "#94a3b8"],
                    ["badge_color",   "Badge Color",   "#c084fc"],
                    ["card_text_color","Card Text",    "#a5b4fc"],
                  ].map(([k, l, d]) => (
                    <div key={k}>
                      <label style={alabel}>{l}</label>
                      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                        <input type="color" value={brandingForm[k]||d}
                          onChange={e=>setBrandingForm(p=>({...p,[k]:e.target.value}))}
                          style={{ width:44, height:36, borderRadius:8, border:"none", cursor:"pointer" }} />
                        <input value={brandingForm[k]||d}
                          onChange={e=>setBrandingForm(p=>({...p,[k]:e.target.value}))}
                          style={{ ...ainput, flex:1, fontFamily:"monospace", fontSize:12 }} />
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            </div>

             {/* Background */}
            <div style={{ ...acard, padding:"18px 20px" }}>
              <div style={{ color:"#a5b4fc", fontWeight:700, marginBottom:12 }}>Background</div>
              <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
                {["gradient","solid","image"].map(t => (
                  <button key={t} onClick={()=>setBrandingForm(p=>({...p,bg_type:t}))} style={{ ...abtn(brandingForm.bg_type===t?"primary":"ghost"), fontSize:12, padding:"7px 16px", textTransform:"capitalize" }}>{t}</button>
                ))}
              </div>
              {(!brandingForm.bg_type || brandingForm.bg_type==="gradient") && (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  {[["bg_gradient_from","Gradient From","#0f0c29"],["bg_gradient_to","Gradient To","#302b63"]].map(([k,l,d]) => (
                    <div key={k}><label style={alabel}>{l}</label>
                      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                        <input type="color" value={brandingForm[k]||d} onChange={e=>setBrandingForm(p=>({...p,[k]:e.target.value}))} style={{ width:44, height:36, borderRadius:8, border:"none", cursor:"pointer" }} />
                        <input value={brandingForm[k]||d} onChange={e=>setBrandingForm(p=>({...p,[k]:e.target.value}))} style={{ ...ainput, flex:1, fontFamily:"monospace", fontSize:12 }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {brandingForm.bg_type === "solid" && (
                <div><label style={alabel}>Background Color</label>
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <input type="color" value={brandingForm.bg_solid_color||"#0f172a"} onChange={e=>setBrandingForm(p=>({...p,bg_solid_color:e.target.value}))} style={{ width:44, height:36, borderRadius:8, border:"none", cursor:"pointer" }} />
                    <input value={brandingForm.bg_solid_color||"#0f172a"} onChange={e=>setBrandingForm(p=>({...p,bg_solid_color:e.target.value}))} style={{ ...ainput, flex:1, fontFamily:"monospace", fontSize:12 }} />
                  </div>
                </div>
              )}
              {brandingForm.bg_type === "image" && (
                <div>
                  <div onClick={()=>{ const inp=document.createElement("input"); inp.type="file"; inp.accept="image/*"; inp.onchange=e=>{ const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=ev=>{ setBrandingForm(p=>({...p,bg_image_data:ev.target.result})); setBrandingMsg({type:"ok",text:"Image ready."}); }; r.readAsDataURL(f); }; inp.click(); }}
                    style={{ border:"2px dashed rgba(99,102,241,0.3)", borderRadius:10, padding:16, cursor:"pointer", textAlign:"center", marginBottom:8 }}>
                    {brandingForm.bg_image_data ? <div style={{ color:"#4ade80", fontSize:12 }}>Image loaded. Click to replace.</div> : <div style={{ color:"#64748b", fontSize:12 }}>Click to upload background image</div>}
                  </div>
                  {brandingForm.bg_image_data && <button onClick={()=>setBrandingForm(p=>({...p,bg_image_data:""}))} style={{ ...abtn("danger"), fontSize:11, padding:"5px 12px" }}>Remove Image</button>}
                </div>
              )}
            </div>
             <button onClick={saveBranding} disabled={brandingLoading} style={{ ...abtn("success"), padding:"13px", fontSize:"1rem", opacity:brandingLoading?0.6:1 }}>
              {brandingLoading ? "Saving..." : "Save Branding"}
            </button>
            <div style={{ fontSize:12, color:"#475569", textAlign:"center" }}>Changes apply on next page load. Students see updated branding when they visit the site.</div>
          </div>
        )}
             {/*  ANALYTICS TAB  */}

      </div>
    </div>
  );
}


// AUTH SCREEN
// 
function AuthScreen({ onAuth }) {
  const b = getBranding();
  const [mode, setMode] = useState("login"); // login | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const configured = isSupabaseConfigured();

  const handleSubmit = async () => {
    setErr(""); setLoading(true);
    if (!configured) {
      // Demo mode  bypass auth
      onAuth({ id: "demo-user", email: email || "demo@neet.in", user_metadata: { full_name: name || "Demo Student" } });
      setLoading(false); return;
    }
    const { data, error } = mode === "login"
      ? await sbSignIn(email, password)
      : await sbSignUp(email, password, name);
    setLoading(false);
    if (error) { setErr(error.message); return; }
    if (data?.user) onAuth(data.user);
    else setErr("Please check your email to confirm your account.");
  };

  return (
    <div style={{
      minHeight: "100vh", ...brandingBg(getBranding()),
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Crimson Pro', Georgia, serif", padding: "1.5rem"
    }}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-block", background: "rgba(168,85,247,0.2)", border: "1px solid rgba(168,85,247,0.5)", borderRadius: 99, padding: "6px 20px", fontSize: 12, color: "#c084fc", letterSpacing: 2, textTransform: "uppercase", marginBottom: 16, fontFamily: "monospace" }}>
            NTA  NEET UG 2025
          </div>
          <h1 style={{ color: "#fff", fontSize: "2rem", fontWeight: 700, margin: "0 0 6px", textShadow: "0 0 40px rgba(168,85,247,0.4)" }}>
            Mock Test Platform
          </h1>
          <p style={{ color: "#64748b", margin: 0, fontSize: 14 }}>Sign in to access tests & track your progress</p>
        </div>

        {!configured && (
          <div style={{ borderRadius: 10, marginBottom: 20, overflow: "hidden" }}>
            <div style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.4)", padding: "10px 14px", fontSize: 13, color: "#fbbf24" }}>
               <strong>Demo Mode</strong>  Supabase credentials not set. Enter any email to continue.
            </div>
            
            {(() => {
              const diag = diagnoseConfig();
              return diag ? (
                <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderTop: "none", padding: "10px 14px", fontSize: 12, color: "#fca5a5", lineHeight: 1.7 }}>
                   <strong>Fix:</strong> {diag}
                </div>
              ) : null;
            })()}
          </div>
        )}

        <div style={{ ...card(), padding: 28 }}>
         
          <div style={{ display: "flex", background: "rgba(0,0,0,0.3)", borderRadius: 10, padding: 4, marginBottom: 24 }}>
            {["login","signup"].map(m => (
              <button key={m} onClick={() => { setMode(m); setErr(""); }} style={{
                flex: 1, padding: "9px", borderRadius: 7, border: "none", cursor: "pointer",
                background: mode === m ? "rgba(99,102,241,0.4)" : "transparent",
                color: mode === m ? "#a5b4fc" : "#64748b", fontWeight: 600, fontSize: 14,
                fontFamily: "inherit", transition: "all 0.15s", textTransform: "capitalize"
              }}>{m === "login" ? "Sign In" : "Create Account"}</button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {mode === "signup" && (
              <div>
                <label style={{ color: "#94a3b8", fontSize: 13, display: "block", marginBottom: 6 }}>Full Name</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" style={input} />
              </div>
            )}
            <div>
              <label style={{ color: "#94a3b8", fontSize: 13, display: "block", marginBottom: 6 }}>Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={input} />
            </div>
            <div>
              <label style={{ color: "#94a3b8", fontSize: 13, display: "block", marginBottom: 6 }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="" style={input}
                onKeyDown={e => e.key === "Enter" && handleSubmit()} />
            </div>
            {err && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 14px", color: "#f87171", fontSize: 13 }}>{err}</div>}
            <button onClick={handleSubmit} disabled={loading} style={{ ...btn("primary"), padding: "13px", marginTop: 4, opacity: loading ? 0.6 : 1 }}>
              {loading ? "Please wait" : mode === "login" ? "Sign In " : "Create Account "}
            </button>
          </div>
        </div>

        
        {!configured && (
          <div style={{ marginTop: 20, ...card(), padding: "16px 18px", fontSize: 12, color: "#64748b", lineHeight: 1.7 }}>
            <strong style={{ color: "#818cf8" }}>To enable full backend:</strong>
            <ol style={{ margin: "8px 0 0 16px", padding: 0 }}>
              <li>Create a Supabase project at supabase.com</li>
              <li>Run the SQL schema (see README)</li>
              <li>Replace SUPABASE_URL & SUPABASE_ANON_KEY at top of file</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}

// 
// DASHBOARD
// 
function Dashboard({ user, onStart, onSignOut, settings }) {
  const [history,        setHistory]        = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [batchConfig, setBatchConfig] = useState(null);
  const [nextTest,    setNextTest]    = useState(null); // the next scheduled batch test
  const [tab,            setTab]            = useState("start"); // start | history | leaderboard
  const [accessCode,     setAccessCode]     = useState("");
  const [accessErr,      setAccessErr]      = useState("");
  const [leaderboard,    setLeaderboard]    = useState([]);
  const [loadingLB,      setLoadingLB]      = useState(false);

  // Countdown to NEET exam date
  // Effective settings: next-test settings override batch settings override global
  const eff = nextTest
    ? { ...settings, ...batchConfig, ...nextTest, paper_id: nextTest.paper_id, attempt_limit: String(nextTest.attempt_limit||"1") }
    : batchConfig ? { ...settings, ...batchConfig } : settings;

  const neetDate   = eff?.neet_exam_date ? new Date(eff.neet_exam_date) : new Date("2026-05-04");
  const daysLeft   = Math.max(0, Math.ceil((neetDate - new Date()) / (1000*60*60*24)));
  const attemptLimit = parseInt(eff?.attempt_limit || "0");
  // Count attempts for current test only (if in a batch test context), else count all
  const attemptsUsed = nextTest
    ? history.filter(r => r.batch_test_id === nextTest.id).length
    : history.length;
  const limitReached = attemptLimit > 0 && attemptsUsed >= attemptLimit;

  // Check if exam window is active (only block if window is configured)
  const isWindowBlocked = (() => {
    const start = eff?.exam_window_start ? new Date(eff.exam_window_start) : null;
    const end   = eff?.exam_window_end   ? new Date(eff.exam_window_end)   : null;
    if (!start || !end || isNaN(start) || isNaN(end)) return false; // no window set = always open
    const now = new Date();
    return now < start || now > end; // blocked if outside window
  })();

  const canStart = !limitReached && !isWindowBlocked;

  // Live exam window countdown - ticks every second
  const [windowTick, setWindowTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setWindowTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Compute exam window status
  const getWindowStatus = () => {
    const start = settings?.exam_window_start ? new Date(settings.exam_window_start) : null;
    const end   = settings?.exam_window_end   ? new Date(settings.exam_window_end)   : null;
    const now   = new Date();
    if (!start || !end || isNaN(start) || isNaN(end)) return null;
    if (now < start) return { phase: "upcoming", diff: start - now, label: "Exam opens in", end };
    if (now >= start && now <= end) return { phase: "open", diff: end - now, label: "Exam closes in", end };
    return { phase: "ended", diff: 0, label: "Exam ended", end };
  };

  const fmtCountdown = (ms) => {
    if (ms <= 0) return "00:00:00";
    const totalSec = Math.floor(ms / 1000);
    const d = Math.floor(totalSec / 86400);
    const h = Math.floor((totalSec % 86400) / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (d > 0) return d + "d " + String(h).padStart(2,"0") + "h " + String(m).padStart(2,"0") + "m";
    return String(h).padStart(2,"0") + ":" + String(m).padStart(2,"0") + ":" + String(s).padStart(2,"0");
  };

  const winStatus = getWindowStatus();

  useEffect(() => {
    (async () => {
      let local = [];
      try { local = JSON.parse(localStorage.getItem("neet_history_" + user.id) || "[]"); } catch (_) {}
      let remote = [];
      if (isSupabaseConfigured()) { remote = await sbGetHistory(user.id); }
      const merged = remote.length > 0 ? remote : local;
      setHistory(merged);
      setLoadingHistory(false);

      // Check if student is in a batch - apply batch settings
      if (user.email && isSupabaseConfigured()) {
        try {
          const { data: membership } = await supabase
            .from("batch_members")
            .select("batch_id, batches(name)")
            .eq("email", user.email.toLowerCase())
            .limit(1)
            .maybeSingle();
          if (membership?.batch_id) {
            const { data: bs } = await supabase
              .from("batch_settings")
              .select("*")
              .eq("batch_id", membership.batch_id)
              .maybeSingle();
            if (bs) setBatchConfig({ ...bs, batch_name: membership.batches?.name || "Unknown" });

            // Load scheduled tests for this batch and find the next visible one
            const { data: tests } = await supabase
              .from("batch_tests")
              .select("*")
              .eq("batch_id", membership.batch_id)
              .order("exam_window_start", { ascending: true });
            if (tests && tests.length) {
              const now = new Date();
              // A test is visible if: manually released, OR currently in window, OR upcoming within 7 days
              const visible = tests.filter(t => {
                if (t.manual_release === "true") return true;
                const st = t.exam_window_start ? new Date(t.exam_window_start) : null;
                const en = t.exam_window_end   ? new Date(t.exam_window_end)   : null;
                if (!st) return false;
                if (en && now > en) return false; // completed - hide
                const daysUntil = (st - now) / (1000*60*60*24);
                return daysUntil <= 7; // show if within a week or active
              });
              // Pick the soonest one (active first, then upcoming)
              visible.sort((a,b) => new Date(a.exam_window_start||0) - new Date(b.exam_window_start||0));
              if (visible.length) setNextTest({ ...visible[0], batch_id: membership.batch_id, batch_name: membership.batches?.name });
            }
          }
        } catch (_) {}
      }
    })();
  }, [user.id]);

  useEffect(() => {
    if (tab !== "leaderboard") return;
    if (settings?.leaderboard_enabled === "false") return;
    setLoadingLB(true);
    (async () => {
      let query = supabase.from("test_results")
        .select("user_id, student_name, student_email, score, test_name, created_at")
        .order("score", { ascending: false })
        .limit(50);
      // Filter to current test if in batch test context
      if (nextTest?.id) query = query.eq("batch_test_id", nextTest.id);
      const { data } = await query;
      if (data) setLeaderboard(data);
      setLoadingLB(false);
    })();
  }, [tab]);

  const handleStart = () => {
    // Check access code using effective (batch-aware) settings
    if (eff?.access_code_enabled === "true" && eff?.access_code) {
      const entered = accessCode.replace(/\s/g, "");
      const stored  = (eff.access_code || "").replace(/\s/g, "");
      if (!entered) { setAccessErr("Please enter the access code."); return; }
      if (entered !== stored) { setAccessErr("Invalid access code. Please try again."); return; }
    }
    if (eff?.exam_window_start && eff?.exam_window_end) {
      const now = new Date(), start = new Date(eff.exam_window_start), end = new Date(eff.exam_window_end);
      if (now < start || now > end) { setAccessErr("Exam not available now. Window: " + start.toLocaleString() + " to " + end.toLocaleString()); return; }
    }
    if (eff?.exam_enabled === "false") { setAccessErr("Exam access is currently disabled."); return; }
    setAccessErr("");
    onStart(eff?.paper_id || "NEET_2025", nextTest ? {
      batch_test_id:    nextTest.id,
      batch_id:         nextTest.batch_id,
      test_name:        nextTest.name,
      exam_window_end:  nextTest.exam_window_end || null,
    } : null);
  };

  const displayName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Student";
  const bestScore = history.length ? Math.max(...history.map(r => r.score)) : null;
  const avgScore  = history.length ? Math.round(history.reduce((s, r) => s + r.score, 0) / history.length) : null;

  return (
    <div style={{ minHeight: "100vh", ...brandingBg(getBranding()), fontFamily: brandingFont(getBranding()) }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&display=swap');
        @font-face { font-family: 'Kruti Dev 010'; src: local('Kruti Dev 010'); }
      `}</style>
     
      <div style={{ background: "#0f172a", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div>
          <span style={{ color: "#818cf8", fontWeight: 700, fontSize: "1.1rem" }}>NEET UG</span>
          <span style={{ color: "#475569", fontSize: 13, marginLeft: 10 }}>Mock Test Platform</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
         
          {daysLeft > 0 && (
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "5px 12px", fontSize: 12, color: "#f87171" }}>
              {daysLeft} days to NEET
            </div>
          )}
          

          

          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600 }}>{displayName}</div>
            <div style={{ color: "#475569", fontSize: 11 }}>{user.email}</div>
          </div>
          <button onClick={onSignOut} style={btn("ghost", { padding: "7px 14px", fontSize: 12 })}>Sign Out</button>
        </div>
      </div>

      {/* Exam window countdown banner */}
      {winStatus && (
        <div style={{
          background: winStatus.phase === "open"     ? "rgba(34,197,94,0.12)"
                    : winStatus.phase === "upcoming" ? "rgba(99,102,241,0.12)"
                    : "rgba(100,116,139,0.12)",
          borderBottom: "1px solid " + (winStatus.phase === "open" ? "rgba(34,197,94,0.25)" : winStatus.phase === "upcoming" ? "rgba(99,102,241,0.25)" : "rgba(100,116,139,0.2)"),
          padding: "12px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Pulsing dot */}
            <div style={{
              width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
              background: winStatus.phase === "open" ? "#22c55e" : winStatus.phase === "upcoming" ? "#818cf8" : "#64748b",
              boxShadow: winStatus.phase === "open" ? "0 0 0 3px rgba(34,197,94,0.3)" : "none",
              animation: winStatus.phase === "open" ? "pulse 1.5s infinite" : "none",
            }} />
            <div>
              <div style={{ color: winStatus.phase === "open" ? "#4ade80" : winStatus.phase === "upcoming" ? "#a5b4fc" : "#94a3b8", fontWeight: 700, fontSize: 13 }}>
                {winStatus.phase === "open" ? "Exam is OPEN now" : winStatus.phase === "upcoming" ? "Exam opens soon" : "Exam window has ended"}
              </div>
              <div style={{ color: "#64748b", fontSize: 12, marginTop: 1 }}>
                {winStatus.phase === "ended"
                  ? "The exam window has closed."
                  : winStatus.label + ": " + fmtCountdown(winStatus.diff)}
              </div>
            </div>
          </div>
          {/* Big countdown clock */}
          {winStatus.phase !== "ended" && (
            <div style={{
              background: winStatus.phase === "open" ? "rgba(34,197,94,0.15)" : "rgba(99,102,241,0.15)",
              border: "1px solid " + (winStatus.phase === "open" ? "rgba(34,197,94,0.3)" : "rgba(99,102,241,0.3)"),
              borderRadius: 10, padding: "8px 20px", textAlign: "center",
            }}>
              <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "1.4rem", color: winStatus.phase === "open" ? "#4ade80" : "#a5b4fc", letterSpacing: 2 }}>
                {fmtCountdown(winStatus.diff)}
              </div>
              <div style={{ color: "#64748b", fontSize: 10, marginTop: 2, textTransform: "uppercase", letterSpacing: 1 }}>
                {winStatus.phase === "open" ? "remaining" : "until open"}
              </div>
            </div>
          )}
          {/* Window times */}
          <div style={{ fontSize: 11, color: "#475569", textAlign: "right" }}>
            <div>Opens: {settings.exam_window_start ? new Date(settings.exam_window_start).toLocaleString("en-IN", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" }) : ""}</div>
            <div>Closes: {settings.exam_window_end ? new Date(settings.exam_window_end).toLocaleString("en-IN", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" }) : ""}</div>
          </div>
        </div>
      )}

      <style>{`@keyframes pulse { 0%,100%{box-shadow:0 0 0 3px rgba(34,197,94,0.3)} 50%{box-shadow:0 0 0 6px rgba(34,197,94,0.1)} }`}</style>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px" }}>

        {batchConfig && (
          <div style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: 10, padding: "8px 16px", marginBottom: nextTest ? 8 : 16, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#818cf8", flexShrink: 0 }} />
            <span style={{ color: "#a5b4fc", fontSize: 13, fontWeight: 600 }}>Batch: {batchConfig.batch_name}</span>
            <span style={{ color: "#475569", fontSize: 12, marginLeft: 4 }}>
              {nextTest ? nextTest.name : "Custom exam settings active"}
            </span>
          </div>
        )}

        {/* NEXT TEST CARD - shown when student is in a batch with a scheduled test */}
        {nextTest && (() => {
          const now = new Date();
          const st  = nextTest.exam_window_start ? new Date(nextTest.exam_window_start) : null;
          const en  = nextTest.exam_window_end   ? new Date(nextTest.exam_window_end)   : null;
          const isActive = nextTest.manual_release === "true" || (st && en && now >= st && now <= en);
          const isUpcoming = st && now < st;
          const msLeft = st ? st - now : 0;
          const daysLeft = Math.floor(msLeft / (1000*60*60*24));
          const hrsLeft  = Math.floor((msLeft % (1000*60*60*24)) / (1000*60*60));
          const minLeft  = Math.floor((msLeft % (1000*60*60)) / (1000*60));
          return (
            <div style={{ background: isActive ? "rgba(34,197,94,0.06)" : "rgba(99,102,241,0.06)", border: "1px solid " + (isActive ? "rgba(34,197,94,0.25)" : "rgba(99,102,241,0.2)"), borderRadius: 14, padding: "16px 20px", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: isActive ? "#22c55e" : "#818cf8", animation: isActive ? "pulse 2s infinite" : "none" }} />
                    <span style={{ color: isActive ? "#4ade80" : "#a5b4fc", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      {isActive ? "Test Active Now" : "Next Scheduled Test"}
                    </span>
                  </div>
                  <div style={{ color: "#e2e8f0", fontWeight: 700, fontSize: "1.05rem", marginBottom: 4 }}>{nextTest.name}</div>
                  {nextTest.description && <div style={{ color: "#64748b", fontSize: 12, marginBottom: 6 }}>{nextTest.description}</div>}
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12 }}>
                    {st && <span style={{ color: "#94a3b8" }}>Starts: {st.toLocaleString("en-IN", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })}</span>}
                    {en && <span style={{ color: "#94a3b8" }}>Ends: {en.toLocaleString("en-IN", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })}</span>}
                    <span style={{ color: "#64748b" }}>Paper: {nextTest.paper_id}</span>
                  </div>
                  {isUpcoming && msLeft > 0 && (
                    <div style={{ marginTop: 8, color: "#818cf8", fontSize: 12 }}>
                      Starts in: <span style={{ fontWeight: 700 }}>{daysLeft > 0 ? daysLeft+"d " : ""}{hrsLeft}h {minLeft}m</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }} className="mob-grid1">
          {[
            { label: "Tests Taken", value: history.length, color: "#818cf8" },
            { label: "Best Score", value: bestScore !== null ? `${bestScore}/720` : "", color: "#4ade80" },
            { label: "Avg Score", value: avgScore !== null ? `${avgScore}/720` : "", color: "#fbbf24" },
          ].map(s => (
            <div key={s.label} style={{ ...card(), padding: "20px 24px", textAlign: "center" }}>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        
        <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
          <button onClick={() => setTab("start")}       style={btn(tab==="start"?"primary":"ghost",{padding:"8px 18px",fontSize:13})}>Start Test</button>
          <button onClick={() => setTab("history")}     style={btn(tab==="history"?"primary":"ghost",{padding:"8px 18px",fontSize:13})}>Score History</button>
          {settings?.leaderboard_enabled !== "false" && (
            <button onClick={() => setTab("leaderboard")} style={btn(tab==="leaderboard"?"primary":"ghost",{padding:"8px 18px",fontSize:13})}>Leaderboard</button>
          )}
        </div>

       
        {tab === "start" && (
          <div style={{ ...card(), padding: 28 }}>
            <h2 style={{ color: "#e2e8f0", margin: "0 0 6px", fontSize: "1.2rem", fontWeight: 700 }}>{nextTest ? nextTest.name : "NEET UG 2025 - Mock Test"}</h2>
            <p style={{ color: "#64748b", margin: "0 0 20px", fontSize: 14 }}>{nextTest ? (nextTest.description || "Full-length mock examination") : "Full-length mock examination"}</p>

            
            {limitReached && (
              <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "12px 16px", marginBottom: 16, color: "#f87171", fontSize: 14 }}>
                You have used all {attemptLimit} allowed attempts for this exam.
              </div>
            )}
            {attemptLimit > 0 && !limitReached && (
              <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: "#fbbf24", fontSize: 13 }}>
                Attempts used: {attemptsUsed} / {attemptLimit}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 20 }}>
              {[["Questions","180"],["Duration","3 Hours"],["Max Marks","720"],["Correct","+4 marks"],["Wrong","-1 mark"],["Unattempted","0 marks"]].map(([l,v]) => (
                <div key={l} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "10px 14px" }}>
                  <div style={{ color: "#64748b", fontSize: 10, textTransform: "uppercase" }}>{l}</div>
                  <div style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 14, marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>

            
            {settings?.access_code_enabled === "true" && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ color: "#94a3b8", fontSize: 12, display: "block", marginBottom: 6 }}>Exam Access Code</label>
                <input value={accessCode} onChange={e => setAccessCode(e.target.value)}
                  placeholder="Enter the code provided by your instructor"
                  style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "10px 14px", color: "#e2e8f0", fontSize: "0.92rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
              </div>
            )}

            {accessErr && (
              <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 14px", color: "#f87171", fontSize: 13, marginBottom: 16 }}>{accessErr}</div>
            )}

            <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 20, fontSize: 13, color: "#fbbf24" }}>
              Do not refresh or close the browser during the test.
            </div>

            <button onClick={handleStart} disabled={!canStart}
              style={{ ...btn(canStart ? "success" : "ghost", { padding: "13px 0", fontSize: "1rem", width: "100%", borderRadius: 12 }), opacity: canStart ? 1 : 0.4, cursor: canStart ? "pointer" : "not-allowed" }}>
              {isWindowBlocked ? (winStatus?.phase === "upcoming" ? "Exam Not Started Yet" : "Exam Window Closed") : "Begin Mock Test"}
            </button>
          </div>
        )}

        
        {tab === "history" && (
          <div>
            {loadingHistory ? (
              <div style={{ textAlign: "center", color: "#64748b", padding: 40 }}>Loading history...</div>
            ) : history.length === 0 ? (
              <div style={{ ...card(), padding: 40, textAlign: "center", color: "#475569" }}>No tests taken yet. Start your first mock test!</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {history.map((r, i) => {
                  const pct2 = Math.round((r.score / 720) * 100);
                  const date = new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
                  return (
                    <div key={i} style={{ ...card(), padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ width: 48, height: 48, borderRadius: "50%", background: pct2>=50?"rgba(34,197,94,0.2)":"rgba(239,68,68,0.2)", border: "2px solid "+(pct2>=50?"#22c55e":"#ef4444"), display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: pct2>=50?"#4ade80":"#f87171", fontSize: 13, flexShrink: 0 }}>{pct2}%</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: "#c7d2fe", fontSize: "0.9rem" }}>{r.test_name || ("NEET " + r.year + " Mock")}</div>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{date}{r.paper_id && r.paper_id !== "NEET_2025" ? <span style={{ marginLeft: 8, color: "#475569" }}>{r.paper_id}</span> : ""}</div>
                        <div style={{ marginTop: 5, background: "rgba(0,0,0,0.3)", borderRadius: 99, height: 4, maxWidth: 200 }}>
                          <div style={{ height: "100%", borderRadius: 99, background: pct2>=50?"#22c55e":"#ef4444", width: Math.max(0,pct2)+"%" }} />
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#e2e8f0" }}>{r.score}</div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>/ 720</div>
                      </div>
                      <div style={{ textAlign: "right", fontSize: 11, color: "#64748b", flexShrink: 0 }}>
                        <div style={{ color: "#4ade80" }}>Correct: {r.correct}</div>
                        <div style={{ color: "#f87171" }}>Wrong: {r.wrong}</div>
                        {r.percentile != null && <div style={{ color: "#818cf8" }}>{r.percentile}th %ile</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

       
        {tab === "leaderboard" && (
          <div>
            <h3 style={{ color: "#a5b4fc", marginBottom: 14, fontSize: "1rem" }}>{nextTest ? ("Top Scores - " + nextTest.name) : "Top Scores - All Time"}</h3>
            {loadingLB ? (
              <div style={{ textAlign: "center", color: "#64748b", padding: 40 }}>Loading leaderboard...</div>
            ) : leaderboard.length === 0 ? (
              <div style={{ ...card(), padding: 40, textAlign: "center", color: "#475569" }}>No results yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {leaderboard.map((r, i) => {
                  const pct3 = Math.round((r.score / 720) * 100);
                  const isMe = r.user_id === user.id;
                  return (
                    <div key={i} style={{ ...card(), padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, border: isMe ? "1px solid rgba(99,102,241,0.4)" : undefined, background: isMe ? "rgba(99,102,241,0.08)" : undefined }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: i===0?"rgba(251,191,36,0.2)":i===1?"rgba(148,163,184,0.2)":i===2?"rgba(180,83,9,0.2)":"rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: i===0?"#fbbf24":i===1?"#94a3b8":i===2?"#b45309":"#64748b", fontSize: 14, flexShrink: 0 }}>{i+1}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "0.9rem", color: isMe ? "#a5b4fc" : "#c7d2fe", fontWeight: isMe ? 700 : 400 }}>
                          {isMe ? "You" : (r.student_name || r.student_email?.split("@")[0] || "Student " + (i+1))}
                        </div>
                        <div style={{ marginTop: 4, background: "rgba(0,0,0,0.3)", borderRadius: 99, height: 4, maxWidth: 200 }}>
                          <div style={{ height: "100%", borderRadius: 99, background: i===0?"#fbbf24":"#6366f1", width: pct3+"%" }} />
                        </div>
                      </div>
                      <div style={{ fontWeight: 700, color: "#e2e8f0", fontSize: "1.1rem" }}>{r.score}</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>/ 720</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// 
// INSTRUCTIONS
// 
function InstructionsScreen({ year, onBegin, onBack }) {
  const b = getBranding();
  const [agreed, setAgreed] = useState(false);
  return (
    <div style={{ minHeight: "100vh", ...brandingBg(b), fontFamily: brandingFont(b), padding: "2rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ maxWidth: 780, width: "100%" }}>
        <div style={{ ...card(), overflow: "hidden" }}>
          <div style={{ background: "linear-gradient(135deg,#1e1b4b,#312e81)", padding: "22px 30px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
            <h2 style={{ color: "#e2e8f0", margin: 0, fontSize: "1.4rem", fontWeight: 700 }}>General Instructions  NEET {year}</h2>
            <p style={{ color: "#818cf8", margin: "4px 0 0", fontSize: 14 }}>Read carefully before starting.</p>
          </div>
          <div style={{ padding: "26px 30px", color: "#cbd5e1", lineHeight: 1.8 }}>
            {[
              ["Exam Structure", ["180 questions: Physics (45), Chemistry (45), Botany (45), Zoology (45).", "Duration: 3 hours. No extra time."]],
              ["Marking Scheme", ["Correct answer: +4 marks.", "Incorrect answer: 1 mark (negative marking).", "Unattempted: 0 marks."]],
              ["Navigation", ["Use the right-side palette to jump to any question.", "Mark questions for review  return before submitting.", "'Save & Next' saves your answer and moves forward."]],
              ["Important", ["Do not refresh or close the tab during the exam.", "Timer auto-submits the test on expiry.", "Once submitted, the test cannot be resumed."]],
            ].map(([h, pts]) => (
              <div key={h} style={{ marginBottom: 20 }}>
                <h3 style={{ color: "#a5b4fc", fontSize: "0.95rem", fontWeight: 600, marginBottom: 6 }}>{h}</h3>
                <ul style={{ margin: 0, paddingLeft: 18 }}>{pts.map((p,i) => <li key={i} style={{ marginBottom: 4, fontSize: "0.92rem" }}>{p}</li>)}</ul>
              </div>
            ))}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 24 }}>
              {[["#374151","Not Visited"],["#ef4444","Not Answered"],["#22c55e","Answered"],["#a855f7","Marked for Review"]].map(([c,l]) => (
                <div key={l} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 6, background: c }} />
                  <span style={{ fontSize: 13 }}>{l}</span>
                </div>
              ))}
            </div>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 12, padding: 16 }}>
              <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ marginTop: 3, width: 16, height: 16, accentColor: "#6366f1", flexShrink: 0 }} />
              <span style={{ fontSize: "0.9rem", color: "#c7d2fe" }}>I have read all instructions and agree to follow examination rules.</span>
            </label>
          </div>
          <div style={{ padding: "18px 30px", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", justifyContent: "space-between" }}>
            <button onClick={onBack} style={btn("ghost")}> Back</button>
            <button onClick={onBegin} disabled={!agreed} style={{ ...btn("success"), opacity: agreed ? 1 : 0.4, cursor: agreed ? "pointer" : "not-allowed" }}>Start Exam </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 
// PALETTE
// 
const SUBJ_PAL_COLOR = { Physics:"#6366f1", Chemistry:"#f59e0b", Botany:"#22c55e", Zoology:"#f43f5e" };

function Palette({ questions, answers, currentIdx, onJump, marked, visited }) {
  const vis = visited || new Set([currentIdx]);
  const getStatus = (q) => {
    const i   = questions.indexOf(q);
    const ans = answers[q.id] !== undefined;
    const mk  = marked.has(q.id);
    if (mk && ans) return "marked-answered";
    if (mk)        return "marked";
    if (ans)       return "answered";
    if (vis.has(i) && !ans) return "not-answered"; // visited but unanswered = red
    return "not-visited"; // never visited = dark gray
  };

  const counts = {
    a: questions.filter(q => answers[q.id] !== undefined && !marked.has(q.id)).length,
    m: questions.filter(q => marked.has(q.id)).length,
    n: questions.filter((q,i) => vis.has(i) && answers[q.id] === undefined).length,
    v: questions.filter((q,i) => !vis.has(i)).length,
  };

  return (
    <div style={{ width: 230, background: "#0a1124", borderLeft: "1px solid rgba(255,255,255,0.07)", display: "flex", flexDirection: "column", flexShrink: 0, overflow: "hidden" }} className="mob-palette">

      {/* Stats row */}
      <div style={{ padding: "10px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
        {[["#22c55e",counts.a,"Ans"],["#a855f7",counts.m,"Mkd"],["#ef4444",counts.n,"NA"],["#374151",counts.v,"NV"]].map(([c,n,l]) => (
          <div key={l} style={{ display:"flex", alignItems:"center", gap:5, background:"rgba(255,255,255,0.03)", borderRadius:7, padding:"5px 7px" }}>
            <div style={{ width:8, height:8, borderRadius:2, background:c, flexShrink:0 }} />
            <span style={{ color:"#e2e8f0", fontSize:12, fontWeight:700 }}>{n}</span>
            <span style={{ color:"#475569", fontSize:10 }}>{l}</span>
          </div>
        ))}
      </div>

      {/* Subject colour legend */}
      <div style={{ padding:"6px 8px", borderBottom:"1px solid rgba(255,255,255,0.07)", display:"flex", flexWrap:"wrap", gap:4 }}>
        {SUBJECTS.map(s => (
          <span key={s} style={{ fontSize:9, color:SUBJ_PAL_COLOR[s], background:"rgba(255,255,255,0.04)", border:"1px solid "+SUBJ_PAL_COLOR[s]+"44", borderRadius:4, padding:"2px 6px", fontWeight:700 }}>
            {s.slice(0,3)} {questions.filter(q=>q.subject===s&&answers[q.id]!==undefined).length}/{questions.filter(q=>q.subject===s).length}
          </span>
        ))}
      </div>

      {/* Single scrollable grid  all subjects together */}
      <div style={{ flex:1, overflowY:"auto", padding:"8px" }}>
        {SUBJECTS.map(s => {
          const sqs = questions.filter(q => q.subject === s);
          if (!sqs.length) return null;
          return (
            <div key={s} style={{ marginBottom:10 }}>
              <div style={{ fontSize:9, color:SUBJ_PAL_COLOR[s], fontWeight:700, marginBottom:4, textTransform:"uppercase", letterSpacing:0.5 }}>{s}</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:4 }}>
                {sqs.map(q => {
                  const gi    = questions.indexOf(q);
                  const isCur = gi === currentIdx;
                  return (
                    <button key={q.id} onClick={() => onJump(gi)} title={s + " Q" + q.number}
                      className="pal-btn"
                      style={{ width:"100%", aspectRatio:"1", borderRadius:5,
                        border: isCur ? "2px solid "+SUBJ_PAL_COLOR[s] : "1.5px solid transparent",
                        background: statusColor(getStatus(q)), color:"#fff", fontSize:9, fontWeight:700,
                        cursor:"pointer", transition:"all 0.1s",
                        boxShadow: isCur ? "0 0 0 2px "+SUBJ_PAL_COLOR[s]+"55" : "none",
                      }}>
                      {q.number}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 
// EXAM SCREEN
// 
function ExamScreen({ questions, year, onFinish, settings, examWindowEnd }) {
  const restoreSession = () => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (s.questionIds && JSON.stringify(s.questionIds) !== JSON.stringify(questions.map(q => q.id))) return null;
      return s;
    } catch { return null; }
  };

  const saved = restoreSession();

  const [idx,           setIdx]          = useState(saved?.idx ?? 0);
  const [answers,       setAnswers]      = useState(saved?.answers ?? {});
  const [marked,        setMarked]       = useState(new Set(saved?.marked ?? []));
  const [visited,       setVisited]      = useState(new Set(saved?.visited ?? [0])); // track actually visited question indices
  const [bookmarks,     setBookmarks]    = useState(new Set(saved?.bookmarks ?? []));
  const [sel,           setSel]          = useState(null);
  // Calculate time remaining: if window_end is set, timer counts down to that, else use TOTAL_TIME
  const calcInitialTime = () => {
    if (saved?.timeLeft != null) return saved.timeLeft; // restore session
    const wEnd = settings?.exam_window_end ? new Date(settings.exam_window_end) : null;
    const wStart = settings?.exam_window_start ? new Date(settings.exam_window_start) : null;
    if (wEnd && wStart) {
      const windowDuration = Math.round((wEnd - wStart) / 1000); // full window in seconds
      const elapsed = Math.round((Date.now() - wStart.getTime()) / 1000); // already elapsed
      const remaining = windowDuration - elapsed;
      if (remaining > 0 && remaining < TOTAL_TIME) return remaining; // use window time
    }
    return TOTAL_TIME; // default 3 hours
  };
  const [timeLeft,      setTimeLeft]     = useState(calcInitialTime);
  const [showModal,     setShowModal]    = useState(false);
  const [restored,      setRestored]     = useState(!!saved);
  const [tabWarning,    setTabWarning]   = useState(false);
  const [tabSwitchCount,setTabSwitchCount] = useState(0);
  const [lockInput,     setLockInput]     = useState("");
  const [lockErr,       setLockErr]       = useState("");
  const [paused,        setPaused]       = useState(false);
  const [pauseCode,     setPauseCode]    = useState("");
  const [pauseErr,      setPauseErr]     = useState("");
  const [showPause,     setShowPause]    = useState(false);
  const [webcamStream,  setWebcamStream] = useState(null);
  const [webcamSnaps,   setWebcamSnaps]  = useState([]);
  // Time tracking per question
  const timePerQ    = useRef(saved?.timePerQ    || {});
  const subjectTimes= useRef(saved?.subjectTimes|| { Physics:0, Chemistry:0, Botany:0, Zoology:0 });
  const qStartTime  = useRef(Date.now());
  const timerRef    = useRef(null);
  const webcamRef   = useRef(null);
  const q = questions[idx];

  // Mark first question as visited on mount
  useEffect(() => { setVisited(p => { const n = new Set(p); n.add(0); return n; }); }, []);

  // Lazy-load diagram images for current question on demand
  useEffect(() => {
    if (!q?.id) return;
    if (q.diagram_data || q.solution_diagram_data) return; // already have it
    supabase.from("questions")
      .select("id, diagram_data, solution_diagram_data")
      .eq("id", q.id)
      .single()
      .then(({ data }) => {
        if (data?.diagram_data)          q.diagram_data          = data.diagram_data;
        if (data?.solution_diagram_data) q.solution_diagram_data = data.solution_diagram_data;
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q?.id]);

  // Webcam setup if enabled
  useEffect(() => {
    if (settings?.webcam_enabled === "true") {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          setWebcamStream(stream);
          if (webcamRef.current) webcamRef.current.srcObject = stream;
          // Take random snapshots every 2-5 minutes
          const snap = () => {
            if (webcamRef.current) {
              const cv = document.createElement("canvas");
              cv.width = 160; cv.height = 120;
              cv.getContext("2d").drawImage(webcamRef.current, 0, 0, 160, 120);
              setWebcamSnaps(p => [...p.slice(-10), { t: Date.now(), img: cv.toDataURL("image/jpeg", 0.5) }]);
            }
            setTimeout(snap, 120000 + Math.random() * 180000);
          };
          setTimeout(snap, 30000);
        })
        .catch(() => {});
    }
    return () => { if (webcamStream) webcamStream.getTracks().forEach(t => t.stop()); };
  }, []);

  // Session persistence
  useEffect(() => {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        questionIds: questions.map(q => q.id),
        idx, answers, marked: [...marked], bookmarks: [...bookmarks], visited: [...visited],
        timeLeft, year, timePerQ: timePerQ.current,
        subjectTimes: subjectTimes.current, savedAt: Date.now(),
      }));
    } catch (_) {}
  }, [idx, answers, marked, bookmarks, timeLeft]);

  // Track time per question on navigation
  const recordTime = (fromIdx) => {
    const elapsed = Math.round((Date.now() - qStartTime.current) / 1000);
    const fq = questions[fromIdx];
    if (fq) {
      timePerQ.current[fq.id] = (timePerQ.current[fq.id] || 0) + elapsed;
      subjectTimes.current[fq.subject] = (subjectTimes.current[fq.subject] || 0) + elapsed;
    }
    qStartTime.current = Date.now();
  };

  useEffect(() => { setSel(answers[q.id] ?? null); }, [idx]);

  const doFinish = useCallback(() => {
    clearInterval(timerRef.current);
    recordTime(idx);
    try { localStorage.removeItem(SESSION_KEY); } catch (_) {}
    if (webcamStream) webcamStream.getTracks().forEach(t => t.stop());
    onFinish(answers, marked, {
      timePerQ:     timePerQ.current,
      subjectTimes: subjectTimes.current,
      bookmarks:    [...bookmarks],
      webcamSnaps,
    });
  }, [answers, marked, bookmarks, webcamSnaps]);

  const [timerAlert, setTimerAlert] = useState(null); // "30min"|"15min"|"5min"

  // Timer - auto-submits when window closes or time runs out
  useEffect(() => {
    if (paused) { clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => {
      // Auto-submit when exam window explicitly ends (uses prop, not global settings)
      if (examWindowEnd) {
        const wEnd = new Date(examWindowEnd);
        const now  = new Date();
        // Safety: only trigger if window end is in the past AND exam started > 60s ago
        if (now > wEnd && (TOTAL_TIME - timeLeft) > 60) {
          clearInterval(timerRef.current);
          doFinish();
          return;
        }
      }
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); doFinish(); return 0; }
        if (t === 1800) setTimerAlert("30min");
        if (t === 900)  setTimerAlert("15min");
        if (t === 300)  setTimerAlert("5min");
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [doFinish, paused, settings]);

  // Right-click + tab switch blocker
  useEffect(() => {
    const block = (e) => e.preventDefault();
    const blockKeys = (e) => {
      if ((e.ctrlKey && ["c","u","s","p"].includes(e.key.toLowerCase())) ||
          (e.ctrlKey && e.shiftKey && ["i","j","c"].includes(e.key.toLowerCase())) ||
          e.key === "F12" || (e.altKey && e.key === "Tab")) e.preventDefault();
    };
    const handleVis = () => {
      if (document.hidden) {
        setTabWarning(true);
        setTabSwitchCount(c => c+1);
        setLockInput("");
        setLockErr("");
      }
    };
    // blur only triggers if tab actually switches, not just clicking within the page
    let blurTimer = null;
    const handleBlur = () => {
      blurTimer = setTimeout(() => {
        if (document.hidden) {
          setTabWarning(true);
          setTabSwitchCount(c => c+1);
          setLockInput("");
          setLockErr("");
        }
      }, 300);
    };
    const handleFocus = () => { if (blurTimer) clearTimeout(blurTimer); };
    document.addEventListener("contextmenu", block);
    document.addEventListener("keydown", blockKeys);
    document.addEventListener("visibilitychange", handleVis);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    document.body.style.userSelect = "none";
    document.body.style.webkitUserSelect = "none";
    return () => {
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("keydown", blockKeys);
      document.removeEventListener("visibilitychange", handleVis);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      if (blurTimer) clearTimeout(blurTimer);
      document.body.style.userSelect = "";
      document.body.style.webkitUserSelect = "";
    };
  }, []);

  const saveAndGo = (delta = 1) => {
    recordTime(idx);
    if (sel !== null) setAnswers(p => ({ ...p, [q.id]: sel }));
    const ni = idx + delta;
    if (ni >= 0 && ni < questions.length) {
      setVisited(p => { const n = new Set(p); n.add(ni); return n; });
      setIdx(ni);
    }
  };

  const toggleBookmark = () => {
    setBookmarks(p => { const n = new Set(p); n.has(q.id) ? n.delete(q.id) : n.add(q.id); return n; });
  };

  const clearResp = () => {
    setSel(null);
    setAnswers(p => { const n = { ...p }; delete n[q.id]; return n; });
  };

  const toggleMark = () => {
    if (sel !== null) setAnswers(p => ({ ...p, [q.id]: sel }));
    setMarked(p => { const n = new Set(p); n.has(q.id) ? n.delete(q.id) : n.add(q.id); return n; });
    if (idx < questions.length - 1) setIdx(i => i + 1);
  };

  //  Disable right-click, text selection, and common copy shortcuts 
  useEffect(() => {
    const block = (e) => e.preventDefault();
    const blockKeys = (e) => {
      // Block Ctrl+C, Ctrl+U (view source), Ctrl+S, Ctrl+Shift+I (devtools), F12
      if (
        (e.ctrlKey && ["c","u","s","p"].includes(e.key.toLowerCase())) ||
        (e.ctrlKey && e.shiftKey && ["i","j","c"].includes(e.key.toLowerCase())) ||
        e.key === "F12"
      ) e.preventDefault();
    };
    document.addEventListener("contextmenu", block);
    document.addEventListener("keydown", blockKeys);
    // Disable text selection via CSS
    document.body.style.userSelect = "none";
    document.body.style.webkitUserSelect = "none";
    return () => {
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("keydown", blockKeys);
      document.body.style.userSelect = "";
      document.body.style.webkitUserSelect = "";
    };
  }, []);

  const timerClr = timeLeft < 600 ? "#ef4444" : timeLeft < 1800 ? "#f59e0b" : "#22c55e";
  const attempted = Object.keys(answers).length;
  const subjectIdx = SUBJECTS.indexOf(q.subject);
  const subjectColors = ["#6366f1","#f59e0b","#22c55e","#f43f5e"];

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", ...brandingBg(getBranding()), fontFamily: brandingFont(getBranding()), color: "#e2e8f0" }}>
      
      <div style={{ background: "#0f172a", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, gap: 12 }}>
        <div>
          <span style={{ color: "#818cf8", fontWeight: 700, fontSize: "1rem" }}>NEET {year}</span>
          <span style={{ color: "#475569", fontSize: 12, marginLeft: 10 }}>Mock Examination</span>
        </div>
       
        <div style={{ display: "flex", gap: 6 }}>
          {SUBJECTS.map((s, i) => {
            const sqCount = questions.filter(x => x.subject === s && answers[x.id] !== undefined).length;
            const sqTotal = questions.filter(x => x.subject === s).length;
            const isActive = q.subject === s;
            return (
              <button key={s} onClick={() => setIdx(questions.findIndex(x => x.subject === s))} style={{
                padding: "5px 12px", borderRadius: 8, border: isActive ? `1.5px solid ${subjectColors[i]}` : "1.5px solid rgba(255,255,255,0.08)",
                background: isActive ? `rgba(${[99,102,241,245,158,11,34,197,94,244,63,94][i*3]},${[99,102,241,245,158,11,34,197,94,244,63,94][i*3+1]},${[99,102,241,245,158,11,34,197,94,244,63,94][i*3+2]},0.15)` : "transparent",
                color: isActive ? subjectColors[i] : "#64748b", fontSize: 12, fontWeight: 600, cursor: "pointer",
                fontFamily: "inherit", transition: "all 0.15s"
              }}>
                {s.slice(0,3)} {sqCount}/{sqTotal}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ background: "rgba(0,0,0,0.4)", border: `1px solid ${timerClr}`, borderRadius: 9, padding: "6px 14px", display: "flex", gap: 7, alignItems: "center" }}>
            <span style={{ color: timerClr, fontSize: 18 }}></span>
            <span style={{ color: timerClr, fontFamily: "monospace", fontSize: "1.1rem", fontWeight: 700 }}>{fmt(timeLeft)}</span>
          </div>
          <button onClick={() => setShowModal(true)} style={btn("danger", { padding: "8px 16px", fontSize: 12 })}>Submit</button>
        </div>
      </div>

      
      {restored && (
        <div style={{
          background: "rgba(34,197,94,0.12)", borderBottom: "1px solid rgba(34,197,94,0.25)",
          padding: "8px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
          fontSize: 13, color: "#4ade80", flexShrink: 0,
        }}>
          <span>Session restored - your answers and timer have been saved from your last visit.</span>
          <button onClick={() => setRestored(false)} style={{ background: "none", border: "none", color: "#4ade80", cursor: "pointer", fontSize: 16, padding: "0 4px" }}>x</button>
        </div>
      )}

      {/* TIMER WARNING BANNER */}
      {timerAlert && (
        <div style={{ background: timerAlert==="5min"?"rgba(239,68,68,0.15)":"rgba(245,158,11,0.12)", borderBottom:"1px solid "+(timerAlert==="5min"?"rgba(239,68,68,0.3)":"rgba(245,158,11,0.25)"), padding:"8px 18px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ fontSize:18 }}>{timerAlert==="5min"?"!":"!"}</div>
            <span style={{ color:timerAlert==="5min"?"#f87171":"#fbbf24", fontWeight:700, fontSize:14 }}>
              {timerAlert==="5min" ? "Only 5 minutes remaining!" : timerAlert==="15min" ? "15 minutes remaining" : "30 minutes remaining"}
            </span>
          </div>
          <button onClick={()=>setTimerAlert(null)} style={{ background:"none", border:"none", color:"#64748b", cursor:"pointer", fontSize:18 }}>x</button>
        </div>
      )}

      {/* TAB SWITCH LOCK SCREEN - covers entire exam, timer paused */}
      {tabWarning && (
        <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", fontFamily: "Georgia, serif" }}>
          <div style={{ background: "#0f172a", border: "2px solid rgba(239,68,68,0.5)", borderRadius: 20, padding: "40px 36px", maxWidth: 440, width: "90%", textAlign: "center" }}>
            {/* Warning icon */}
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(239,68,68,0.15)", border: "2px solid rgba(239,68,68,0.4)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 28 }}>!</div>
            <h2 style={{ color: "#f87171", margin: "0 0 8px", fontSize: "1.4rem", fontWeight: 700 }}>Exam Paused</h2>
            <p style={{ color: "#94a3b8", fontSize: 14, margin: "0 0 6px", lineHeight: 1.7 }}>
              You switched tabs or left the exam window.
            </p>
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "8px 16px", marginBottom: 24, display: "inline-block" }}>
              <span style={{ color: "#f87171", fontSize: 13, fontWeight: 700 }}>Violations: {tabSwitchCount}</span>
              <span style={{ color: "#f59e0b", fontSize: 12, marginLeft: 8 }}>| Timer still running</span>
            </div>
            <p style={{ color: "#64748b", fontSize: 13, margin: "0 0 20px" }}>
              Enter the <span style={{ color: "#fbbf24" }}>exam resume code</span> to continue.
            </p>
            <input
              type="password"
              value={lockInput}
              onChange={e => { setLockInput(e.target.value); setLockErr(""); }}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  const entered = lockInput.replace(/\s/g, "");
                  const stored  = (settings?.resume_code || settings?.access_code || "").replace(/\s/g, "");
                  if (entered === stored) {
                    setTabWarning(false); setLockInput(""); setLockErr("");
                  } else {
                    setLockErr("Incorrect code. Contact your invigilator.");
                  }
                }
              }}
              placeholder="Enter resume code"
              style={{ width: "100%", background: "rgba(255,255,255,0.07)", border: "1px solid " + (lockErr ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.15)"), borderRadius: 10, padding: "12px 16px", color: "#e2e8f0", fontSize: "1rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginBottom: 8, textAlign: "center", letterSpacing: 4 }}
              autoFocus
            />
            {lockErr && <div style={{ color: "#f87171", fontSize: 13, marginBottom: 10 }}>{lockErr}</div>}
            <button
              onClick={() => {
                const entered = lockInput.replace(/\s/g, "");
                const stored  = (settings?.resume_code || settings?.access_code || "").replace(/\s/g, "");
                if (entered === stored) {
                  setTabWarning(false); setLockInput(""); setLockErr("");
                } else {
                  setLockErr("Incorrect code. Contact your invigilator.");
                }
              }}
              style={{ ...btn("primary"), width: "100%", padding: "13px", fontSize: "1rem", marginTop: 4 }}>
              Resume Exam
            </button>
            <p style={{ color: "#374151", fontSize: 11, marginTop: 16, lineHeight: 1.6 }}>
              This violation has been recorded. Repeated violations may result in disqualification.
            </p>
          </div>
        </div>
      )}

     
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
         
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
            <span style={{ background: `rgba(${subjectColors[subjectIdx]},0.15)`, border: `1px solid ${subjectColors[subjectIdx]}44`, borderRadius: 7, padding: "3px 12px", color: subjectColors[subjectIdx], fontSize: 13, fontWeight: 600 }}>
              {q.subject}
            </span>
            <span style={{ color: "#475569", fontSize: 13 }}>Q{q.number} of {QUESTIONS_PER_SUBJECT}</span>
            <span style={{ color: "#374151", fontSize: 13 }}>({idx + 1} / {questions.length} overall)</span>
            {marked.has(q.id) && <span style={{ background: "rgba(168,85,247,0.2)", border: "1px solid rgba(168,85,247,0.4)", borderRadius: 7, padding: "3px 10px", color: "#a855f7", fontSize: 12 }}> Marked</span>}
          </div>

         
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 13, padding: "18px 20px", marginBottom: 4 }}>
            <div style={{ color: "#64748b", fontWeight: 700, marginBottom: 12, fontFamily: "monospace", fontSize: 13 }}>
              Q{q.number}.
            </div>
            <QuestionRenderer
              q={q}
              showSolution={false}
              selectedIdx={sel}
              onSelect={(i) => setSel(i)}
            />
          </div>

          
          <div style={{ display: "flex", gap: 10, marginTop: 28, flexWrap: "wrap", alignItems: "center" }}>
            <button onClick={toggleMark} style={btn("mark")}> {marked.has(q.id) ? "Unmark" : "Mark"} & Next</button>
            <button onClick={toggleBookmark} style={{
              ...btn("ghost"),
              borderColor: bookmarks.has(q.id) ? "rgba(245,158,11,0.8)" : "rgba(245,158,11,0.45)",
              color:       bookmarks.has(q.id) ? "#fbbf24" : "#f59e0b",
              background:  bookmarks.has(q.id) ? "rgba(245,158,11,0.12)" : "rgba(245,158,11,0.05)",
            }}>
              {bookmarks.has(q.id) ? "Bookmarked" : "Bookmark"}
            </button>
            <button onClick={clearResp} style={btn("clear")}>Clear</button>
            <div style={{ flex: 1 }} />
            {idx > 0 && <button onClick={() => saveAndGo(-1)} style={btn("ghost")}> Prev</button>}
            <button onClick={() => saveAndGo(1)} style={btn("blue")}>Save & Next </button>
          </div>
         
          <div style={{ display: "flex", gap: 8, marginTop: 10, padding: "6px 0", borderTop: "1px solid rgba(255,255,255,0.06)", flexWrap: "wrap" }}>
            {SUBJECTS.map(s => {
              const t = subjectTimes.current[s] || 0;
              const m = Math.floor(t/60), sec = t%60;
              const isActive = q.subject === s;
              return (
                <div key={s} style={{ fontSize: 11, color: isActive ? "#a5b4fc" : "#475569", background: isActive ? "rgba(99,102,241,0.1)" : "transparent", borderRadius: 6, padding: "3px 8px" }}>
                  {s.slice(0,3)}: {m}m {("0"+sec).slice(-2)}s
                </div>
              );
            })}
          </div>
        </div>

        <Palette questions={questions} answers={answers} currentIdx={idx}
          onJump={i => { setVisited(p => { const n=new Set(p); n.add(i); return n; }); setIdx(i); }}
          marked={marked} visited={visited} />
      </div>

     
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div style={{ ...card(), padding: 32, maxWidth: 420, width: "90%" }}>
            <h3 style={{ color: "#f1f5f9", margin: "0 0 10px", fontSize: "1.25rem" }}>Submit Examination?</h3>
            <p style={{ color: "#94a3b8", marginBottom: 18, lineHeight: 1.7, fontSize: "0.92rem" }}>
              Attempted <strong style={{ color: "#a5b4fc" }}>{attempted}</strong> of <strong>{questions.length}</strong> questions.
              {questions.length - attempted > 0 && <> <strong style={{ color: "#f87171" }}>{questions.length - attempted} unattempted.</strong></>}
            </p>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
              {SUBJECTS.map(s => {
                const total = questions.filter(x => x.subject === s).length;
                const done = questions.filter(x => x.subject === s && answers[x.id] !== undefined).length;
                return (
                  <div key={s} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "8px 12px", fontSize: 13 }}>
                    <span style={{ color: "#94a3b8" }}>{s}: </span>
                    <span style={{ color: done === total ? "#4ade80" : "#fbbf24", fontWeight: 600 }}>{done}/{total}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowModal(false)} style={{ ...btn("ghost"), flex: 1 }}>Continue</button>
              <button onClick={doFinish} style={{ ...btn("danger"), flex: 1 }}>Submit Now</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 
// RESULT SCREEN
// 
function ResultScreen({ questions, answers, year, user, meta, onDashboard, onSignOut }) {
  const [expandId,    setExpandId]    = useState(null);
  const [filterSub,   setFilterSub]   = useState("All");
  const [filterStatus,setFilterStatus]= useState("All");
  const [activeTab,   setActiveTab]   = useState("summary"); // summary | solutions | bookmarks | analytics

  let correct = 0, wrong = 0, unattempted = 0;
  questions.forEach(q => {
    if (answers[q.id] === undefined) unattempted++;
    else if (answers[q.id] === q.correct) correct++;
    else wrong++;
  });
  const score     = correct * MARKS_CORRECT + wrong * MARKS_WRONG;
  const pct       = Math.round((score / 720) * 100);
  const maxQ      = questions.length * MARKS_CORRECT;
  const timePerQ  = meta?.timePerQ     || {};
  const subTimes  = meta?.subjectTimes || {};
  const bookmarked= new Set(meta?.bookmarks || []);
  const percentile= meta?.percentile   ?? null;

  // Rank prediction based on historical NEET data
  const predictRank = (sc) => {
    if (sc >= 700) return "Under 100";
    if (sc >= 680) return "100 - 500";
    if (sc >= 650) return "500 - 1,000";
    if (sc >= 620) return "1,000 - 5,000";
    if (sc >= 600) return "5,000 - 10,000";
    if (sc >= 570) return "10,000 - 25,000";
    if (sc >= 540) return "25,000 - 50,000";
    if (sc >= 500) return "50,000 - 1,00,000";
    if (sc >= 450) return "1,00,000 - 2,50,000";
    if (sc >= 400) return "2,50,000 - 5,00,000";
    if (sc >= 360) return "5,00,000 - 8,00,000";
    return "Above 8,00,000";
  };

  // Avg time per question
  const times = Object.values(timePerQ);
  const avgTime = times.length ? Math.round(times.reduce((a,b) => a+b, 0) / times.length) : null;
  const slowestQ = times.length ? questions.find(q => timePerQ[q.id] === Math.max(...times)) : null;
  const fastestQ = times.length ? questions.find(q => timePerQ[q.id] === Math.min(...times.filter(t => t > 0))) : null;

  const subjectStats = SUBJECTS.map(s => {
    const qs = questions.filter(q => q.subject === s);
    const c = qs.filter(q => answers[q.id] === q.correct).length;
    const w = qs.filter(q => answers[q.id] !== undefined && answers[q.id] !== q.correct).length;
    return { subject: s, correct: c, wrong: w, total: qs.length, score: c * 4 + w * (-1), time: subTimes[s] || 0 };
  });

  // PDF download
  const downloadPDF = async () => {
    // Re-fetch full question data (options + images) before building PDF
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write("<html><body style='font-family:Arial;padding:40px;color:#333'><h2>Generating PDF...</h2><p>Please wait while we load question data.</p></body></html>");

    let fullQuestions = questions;
    try {
      const ids = questions.map(q => q.id).filter(Boolean);
      if (ids.length > 0) {
        const { data } = await supabase.from("questions")
          .select("id, number, subject, question_text, equation, option_a, option_b, option_c, option_d, correct, solution_text, solution_eq, diagram_data, solution_diagram_data")
          .in("id", ids);
        if (data && data.length > 0) {
          // Merge full data into questions array
          const map = {};
          data.forEach(q => { map[q.id] = q; });
          fullQuestions = questions.map(q => map[q.id] ? { ...q, ...map[q.id] } : q);
        }
      }
    } catch (_) {}

    win.document.open();
    const OPTS = ["A","B","C","D"];
    // Subject-wise summary
    const subjSummary = ["Physics","Chemistry","Botany","Zoology"].map(s => {
      const sq = fullQuestions.filter(q => q.subject === s);
      const c  = sq.filter(q => answers[q.id] === q.correct).length;
      const w  = sq.filter(q => answers[q.id] !== undefined && answers[q.id] !== q.correct).length;
      const u  = sq.filter(q => answers[q.id] === undefined).length;
      const sc = c*4 + w*(-1);
      return "<tr><td><b>" + s + "</b></td><td style='color:green'>" + c + "</td><td style='color:red'>" + w + "</td><td style='color:gray'>" + u + "</td><td><b>" + sc + "</b></td></tr>";
    }).join("");
    // Full question list with solutions
    const qRows = fullQuestions.map(q => {
      const ua = answers[q.id];
      const isC = ua === q.correct;
      const isW = ua !== undefined && !isC;
      const isU = ua === undefined;
      const status = isC ? "CORRECT" : isW ? "WRONG" : "UNATTEMPTED";
      const marks  = isC ? "+4" : isW ? "-1" : "0";
      const color  = isC ? "#16a34a" : isW ? "#dc2626" : "#6b7280";
      const optRows = ["a","b","c","d"].map((lt, i) => {
        const optText = q["option_" + lt] || "";
        const isAns   = ua === i;
        const isRight = q.correct === i;
        let bg = "transparent";
        if (isRight) bg = "#dcfce7";
        if (isAns && !isRight) bg = "#fee2e2";
        return "<div style='padding:4px 10px;margin:2px 0;background:" + bg + ";border-radius:4px;font-size:12px'><b>" + OPTS[i] + ") </b>" + optText + (isRight?" <span style='color:green'>(correct)</span>":"") + (isAns&&!isRight?" <span style='color:red'>(your answer)</span>":"") + "</div>";
      }).join("");
      const timeS = timePerQ[q.id] || 0;
      return "<div style='margin-bottom:18px;padding:14px;border:1px solid #e5e7eb;border-left:4px solid " + color + ";border-radius:6px;page-break-inside:avoid'>" +
        "<div style='display:flex;justify-content:space-between;margin-bottom:8px'>" +
        "<span style='font-weight:700;color:#374151'>Q" + q.number + " &nbsp; <span style='background:#f3f4f6;padding:2px 8px;border-radius:4px;font-size:11px'>" + q.subject + "</span></span>" +
        "<span style='background:" + (isC?"#dcfce7":isW?"#fee2e2":"#f9fafb") + ";color:" + color + ";padding:3px 10px;border-radius:99px;font-size:12px;font-weight:700'>" + status + " " + marks + "</span>" +
        "</div>" +
        "<p style='margin:0 0 10px;font-size:13px;color:#1f2937'>" + (q.question_text || q.equation || "") + "</p>" +
        (q.diagram_data ? "<img src='" + q.diagram_data + "' style='max-width:100%;max-height:200px;object-fit:contain;margin:6px 0;display:block;'/>" : "") +
        optRows +
        (q.solution_text ? "<div style='margin-top:10px;padding:8px 12px;background:#eff6ff;border-radius:4px;font-size:12px;color:#1e40af'><b>Solution: </b>" + q.solution_text + (q.solution_diagram_data ? "<br/><img src='" + q.solution_diagram_data + "' style='max-width:100%;max-height:160px;margin-top:6px;display:block;'/>" : "") + "</div>" : "") +
        "<div style='margin-top:6px;font-size:10px;color:#9ca3af'>Time spent: " + (Math.floor(timeS/60)+"m "+timeS%60+"s") + "</div>" +
        "</div>";
    }).join("");

    const pdfTitle = meta?.testName || ("NEET " + year + " Mock Test");
    win.document.write("<!DOCTYPE html><html><head><title>" + pdfTitle + " - Result</title>" +
      "<link rel=\"stylesheet\" href=\"https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css\">" +
      "<script src=\"https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js\"></scr" + "ipt>" +
      "<script src=\"https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js\"></scr" + "ipt>" +
      "<style>" +
      "body{font-family:Arial,sans-serif;padding:24px;color:#111;max-width:900px;margin:0 auto}" +
      "h1{color:#1e1b4b;border-bottom:3px solid #6366f1;padding-bottom:8px}" +
      "h2{color:#312e81;margin-top:28px}" +
      ".stat{display:inline-block;margin:8px;padding:12px 20px;background:#f3f4f6;border-radius:10px;text-align:center;min-width:100px}" +
      ".big{font-size:1.8em;font-weight:bold;color:#312e81}" +
      ".lbl{font-size:11px;color:#6b7280;margin-top:2px}" +
      "table{width:100%;border-collapse:collapse;margin-top:10px}" +
      "th{background:#312e81;color:#fff;padding:8px 10px;font-size:12px;text-align:left}" +
      "td{padding:7px 10px;font-size:12px;border-bottom:1px solid #f3f4f6}" +
      "@media print{.noprint{display:none}}" +
      ".katex{font-size:1em!important}" +
      "</style></head><body>" +
      "<h1>" + pdfTitle + " - Report</h1>" +
      "<p style='color:#6b7280;font-size:13px'>Generated on " + new Date().toLocaleString("en-IN") + "</p>" +
      "<div style='margin:16px 0'>" +
      "<div class='stat'><div class='big'>" + score + "</div><div class='lbl'>Score / 720</div></div>" +
      "<div class='stat'><div class='big'>" + pct + "%</div><div class='lbl'>Percentage</div></div>" +
      "<div class='stat'><div class='big'>" + correct + "</div><div class='lbl'>Correct</div></div>" +
      "<div class='stat'><div class='big'>" + wrong + "</div><div class='lbl'>Wrong</div></div>" +
      "<div class='stat'><div class='big'>" + unattempted + "</div><div class='lbl'>Unattempted</div></div>" +
      "<div class='stat'><div class='big'>" + (meta?.percentile != null ? meta.percentile + "%" : "") + "</div><div class='lbl'>Percentile</div></div>" +
      "<div class='stat'><div class='big' style='font-size:1.1em'>" + predictRank(score) + "</div><div class='lbl'>Predicted Rank</div></div>" +
      "</div>" +
      "<h2>Subject-wise Performance</h2>" +
      "<table><tr><th>Subject</th><th>Correct</th><th>Wrong</th><th>Unattempted</th><th>Score</th></tr>" + subjSummary + "</table>" +
      "<h2>All Questions with Solutions</h2>" +
      "<p style='font-size:12px;color:#6b7280;margin-bottom:16px'>Green border = correct &nbsp;|&nbsp; Red border = wrong &nbsp;|&nbsp; Gray border = unattempted</p>" +
      qRows +
      "<div class='noprint' style='text-align:center;margin-top:30px'><button onclick='window.print()' style='background:#312e81;color:#fff;border:none;padding:12px 32px;border-radius:8px;font-size:15px;cursor:pointer'>Print / Save as PDF</button></div>" +
      "<scr" + "ipt>" +
        "document.addEventListener('DOMContentLoaded', function() {" +
          "if (window.renderMathInElement) {" +
            "renderMathInElement(document.body, {" +
              "delimiters: [" +
                "{left:'$$',right:'$$',display:true}," +
                "{left:'$',right:'$',display:false}" +
              "]," +
              "throwOnError: false" +
            "});" +
          "}" +
        "});" +
      "</scr" + "ipt>" +
      "</body></html>");
    win.document.close();
  };

  let filtered = filterSub === "All" ? questions : questions.filter(q => q.subject === filterSub);
  if (filterStatus === "Correct")     filtered = filtered.filter(q => answers[q.id] === q.correct);
  if (filterStatus === "Wrong")       filtered = filtered.filter(q => answers[q.id] !== undefined && answers[q.id] !== q.correct);
  if (filterStatus === "Unattempted") filtered = filtered.filter(q => answers[q.id] === undefined);
  if (filterStatus === "Bookmarked")  filtered = filtered.filter(q => bookmarked.has(q.id));

  const rank_band = pct >= 65 ? { label: "Excellent", color: "#4ade80" } : pct >= 50 ? { label: "Good", color: "#fbbf24" } : pct >= 35 ? { label: "Average", color: "#f59e0b" } : { label: "Needs Work", color: "#f87171" };

  return (
    <div style={{ minHeight: "100vh", ...brandingBg(getBranding()), fontFamily: brandingFont(getBranding()), color: "#e2e8f0", paddingBottom: 60 }}>
     
      <div style={{ background: "linear-gradient(135deg,#1e1b4b,#312e81)", padding: "22px 28px", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: "0 0 4px", fontSize: "1.5rem", color: "#e2e8f0" }}>{meta?.testName || ("Test Completed - NEET " + year)}</h2>
          <p style={{ color: "#818cf8", margin: 0, fontSize: 14 }}>Detailed Performance Analysis</p>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <button onClick={downloadPDF} style={{ ...btn("ghost", { padding: "9px 18px" }), display: "flex", alignItems: "center", gap: 8 }}>
            Download PDF Report
          </button>
          {onSignOut && (
            <button onClick={onSignOut} style={{ background:"rgba(239,68,68,0.12)", border:"1px solid rgba(239,68,68,0.3)", color:"#f87171", borderRadius:8, padding:"9px 18px", cursor:"pointer", fontSize:13, fontFamily:"inherit" }}>
              Sign Out
            </button>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "22px 16px" }}>
        
        <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
          {[["summary","Summary"],["analytics","Analytics"],["solutions","Solutions"],["bookmarks","Bookmarks (" + bookmarked.size + ")"]].map(([t,l]) => (
            <button key={t} onClick={() => setActiveTab(t)} style={btn(activeTab===t?"primary":"ghost", { padding: "8px 18px", fontSize: 13 })}>{l}</button>
          ))}
        </div>

       
        {activeTab === "summary" && (
          <div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16, marginBottom: 20 }}>
              <div style={{ background: "linear-gradient(135deg,rgba(99,102,241,0.2),rgba(168,85,247,0.15))", border: "1px solid rgba(99,102,241,0.35)", borderRadius: 16, padding: "24px", textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ fontSize: "3.5rem", fontWeight: 700, color: "#a5b4fc", lineHeight: 1 }}>{score}</div>
                <div style={{ color: "#475569", fontSize: 14, marginTop: 4 }}>out of 720</div>
                <div style={{ marginTop: 12, background: "rgba(0,0,0,0.3)", borderRadius: 99, height: 7 }}>
                  <div style={{ height: "100%", borderRadius: 99, background: "linear-gradient(90deg,#6366f1,#a855f7)", width: Math.max(0,pct) + "%", transition: "width 1.5s" }} />
                </div>
                <div style={{ color: "#64748b", marginTop: 6, fontSize: 13 }}>{pct}%</div>
                <div style={{ marginTop: 8, color: rank_band.color, fontWeight: 700, fontSize: "0.9rem" }}>{rank_band.label}</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { label: "Correct",     value: correct,    extra: "+" + (correct*4) + " marks",  color: "#22c55e", bg: "rgba(34,197,94,0.1)"   },
                  { label: "Wrong",       value: wrong,      extra: "-" + wrong + " marks",         color: "#ef4444", bg: "rgba(239,68,68,0.1)"   },
                  { label: "Unattempted", value: unattempted,extra: "0 marks",                      color: "#64748b", bg: "rgba(100,116,139,0.1)" },
                  { label: "Accuracy",    value: correct+wrong>0 ? Math.round((correct/(correct+wrong))*100)+"%" : "N/A", extra: "", color: "#fbbf24", bg: "rgba(245,158,11,0.1)" },
                ].map(s => (
                  <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: "16px" }}>
                    <div style={{ fontSize: "1.8rem", fontWeight: 700, color: s.color }}>{s.value}</div>
                    <div style={{ color: "#64748b", fontSize: 12 }}>{s.label}</div>
                    {s.extra && <div style={{ color: s.color, fontSize: 11, marginTop: 3 }}>{s.extra}</div>}
                  </div>
                ))}
              </div>
            </div>

           
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
              <div style={{ ...card(), padding: "16px 18px" }}>
                <div style={{ color: "#64748b", fontSize: 12, marginBottom: 4 }}>Predicted NEET Rank</div>
                <div style={{ color: "#a5b4fc", fontWeight: 700, fontSize: "1.2rem" }}>{predictRank(score)}</div>
                <div style={{ color: "#475569", fontSize: 11, marginTop: 4 }}>Based on historical NEET cutoff data</div>
              </div>
              <div style={{ ...card(), padding: "16px 18px" }}>
                <div style={{ color: "#64748b", fontSize: 12, marginBottom: 4 }}>Your Percentile</div>
                <div style={{ color: "#4ade80", fontWeight: 700, fontSize: "1.2rem" }}>{percentile !== null ? percentile + "th percentile" : "Calculating..."}</div>
                <div style={{ color: "#475569", fontSize: 11, marginTop: 4 }}>Among all students on this platform</div>
              </div>
            </div>

            
            <h3 style={{ color: "#a5b4fc", marginBottom: 12, fontSize: "1rem" }}>Subject-wise Breakdown</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12, marginBottom: 20 }}>
              {subjectStats.map((s, i) => (
                <div key={s.subject} style={{ ...card(), padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontWeight: 600, color: "#c7d2fe", fontSize: "0.9rem" }}>{s.subject}</span>
                    <span style={{ color: subjectColors(i), fontWeight: 700, fontSize: "0.9rem" }}>{s.score}/{s.total * 4}</span>
                  </div>
                  <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 99, height: 5, marginBottom: 8 }}>
                    <div style={{ height: "100%", borderRadius: 99, background: subjectColors(i), width: (s.correct/s.total*100) + "%" }} />
                  </div>
                  <div style={{ display: "flex", gap: 12, fontSize: 12 }}>
                    <span style={{ color: "#4ade80" }}>Correct: {s.correct}</span>
                    <span style={{ color: "#f87171" }}>Wrong: {s.wrong}</span>
                    <span style={{ color: "#64748b", marginLeft: "auto" }}>{Math.round(s.time/60)}m</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        
        {activeTab === "analytics" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ ...card(), padding: "18px 20px" }}>
              <h3 style={{ color: "#a5b4fc", margin: "0 0 14px", fontSize: "1rem" }}>Time Analysis</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 16 }}>
                <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "12px", textAlign: "center" }}>
                  <div style={{ color: "#a5b4fc", fontWeight: 700, fontSize: "1.3rem" }}>{avgTime !== null ? avgTime + "s" : "N/A"}</div>
                  <div style={{ color: "#64748b", fontSize: 12 }}>Avg time per question</div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "12px", textAlign: "center" }}>
                  <div style={{ color: "#f87171", fontWeight: 700, fontSize: "1.3rem" }}>{slowestQ ? (timePerQ[slowestQ.id]||0) + "s" : "N/A"}</div>
                  <div style={{ color: "#64748b", fontSize: 12 }}>Slowest question{slowestQ ? " (Q" + slowestQ.number + ")" : ""}</div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "12px", textAlign: "center" }}>
                  <div style={{ color: "#4ade80", fontWeight: 700, fontSize: "1.3rem" }}>{fastestQ ? (timePerQ[fastestQ.id]||0) + "s" : "N/A"}</div>
                  <div style={{ color: "#64748b", fontSize: 12 }}>Fastest question{fastestQ ? " (Q" + fastestQ.number + ")" : ""}</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {SUBJECTS.map(s => {
                  const t = subTimes[s] || 0;
                  const total = Object.values(subTimes).reduce((a,b) => a+b, 0) || 1;
                  const pct2 = Math.round((t/total)*100);
                  return (
                    <div key={s}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                        <span style={{ color: "#94a3b8" }}>{s}</span>
                        <span style={{ color: "#64748b" }}>{Math.floor(t/60)}m {t%60}s ({pct2}%)</span>
                      </div>
                      <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 99, height: 6 }}>
                        <div style={{ height: "100%", borderRadius: 99, background: subjectColors(SUBJECTS.indexOf(s)), width: pct2 + "%" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            
            <div style={{ ...card(), padding: "18px 20px" }}>
              <h3 style={{ color: "#a5b4fc", margin: "0 0 12px", fontSize: "1rem" }}>Time per Question (seconds)</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {questions.map(q => {
                  const t = timePerQ[q.id] || 0;
                  const isCorrect = answers[q.id] === q.correct;
                  const isWrong   = answers[q.id] !== undefined && !isCorrect;
                  const heat = Math.min(1, t/120);
                  return (
                    <div key={q.id} title={"Q" + q.number + " " + q.subject + " " + t + "s"} style={{ width: 28, height: 28, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, background: isCorrect ? "rgba(34,197,94," + (0.2+heat*0.6) + ")" : isWrong ? "rgba(239,68,68," + (0.2+heat*0.6) + ")" : "rgba(100,116,139,0.2)", color: "#fff", cursor: "default" }}>
                      {q.number}
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 11, color: "#64748b" }}>
                <span style={{ color: "#4ade80" }}>Green = correct</span>
                <span style={{ color: "#f87171" }}>Red = wrong</span>
                <span>Darker = more time spent</span>
              </div>
            </div>
          </div>
        )}

       
{activeTab === "solutions" && (
  <div>

    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 14,
        flexWrap: "wrap",
        gap: 10
      }}
    >
      <h3
        style={{
          color: "#a5b4fc",
          margin: 0,
          fontSize: "1rem"
        }}
      >
        Solutions & Review ({filtered.length})
      </h3>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {["All","Correct","Wrong","Unattempted","Bookmarked"].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            style={btn(
              filterStatus === s ? "primary" : "ghost",
              { padding: "5px 12px", fontSize: 12 }
            )}
          >
            {s}
          </button>
        ))}
      </div>
    </div>

    <div
      style={{
        display: "flex",
        gap: 6,
        marginBottom: 16,
        flexWrap: "wrap"
      }}
    >
      {["All", ...SUBJECTS].map(s => (
        <button
          key={s}
          onClick={() => setFilterSub(s)}
          style={{
            ...btn(
              filterSub === s
                ? "primary"
                : "ghost",
              {
                padding: "5px 13px",
                fontSize: 12
              }
            )
          }}
        >
          {s}
        </button>
      ))}
    </div>

    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10
      }}
    >
      {filtered.map(q => {
        const userAns = answers[q.id];
        const isCorrect = userAns === q.correct;
        const isWrong =
          userAns !== undefined &&
          !isCorrect;

        const isOpen =
          expandId === q.id;

        return (
          <div
            key={q.id}
            style={{
              ...card(),
              border: `1px solid ${
                isCorrect
                  ? "rgba(34,197,94,0.3)"
                  : isWrong
                  ? "rgba(239,68,68,0.25)"
                  : "rgba(255,255,255,0.07)"
              }`,
              overflow: "hidden"
            }}
          >
            <div
              onClick={() =>
                setExpandId(
                  isOpen
                    ? null
                    : q.id
                )
              }
              style={{
                display: "flex",
                gap: 13,
                padding: "14px 18px",
                cursor: "pointer"
              }}
            >
              <div style={{ flex: 1 }}>
                {q.subject} Q{q.number}
              </div>
            </div>

            {isOpen && (
              <div
                style={{
                  borderTop:
                    "1px solid rgba(255,255,255,0.06)",
                  padding:
                    "14px 18px 18px 57px"
                }}
              >
                <QuestionRenderer
                  q={q}
                  showSolution={true}
                  userAnswer={userAns}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>

  </div>
)}
        
        {activeTab === "bookmarks" && (
          <div>
            {bookmarked.size === 0 ? (
              <div style={{ textAlign: "center", color: "#475569", padding: 40 }}>No bookmarks. Tap the Bookmark button during the exam to save questions for review.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {questions.filter(q => bookmarked.has(q.id)).map(q => {
                  const userAns = answers[q.id];
                  const isCorrect = userAns === q.correct;
                  return (
                    <div key={q.id} style={{ ...card(), border: "1px solid rgba(245,158,11,0.3)", overflow: "hidden" }}>
                      <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        <span style={{ fontSize: 11, color: "#fbbf24" }}>Bookmarked</span>
                        <span style={{ marginLeft: 10, fontSize: 11, color: "#64748b" }}>{q.subject} Q{q.number}</span>
                        <span style={{ marginLeft: 10, fontSize: 11, color: isCorrect ? "#4ade80" : "#f87171" }}>{isCorrect ? "Correct" : "Wrong"}</span>
                      </div>
                      <div style={{ padding: "14px 16px" }}>
                      <QuestionRenderer q={q} showSolution={true} userAnswer={userAns} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          }
            </div>        
        )}

        <div style={{ textAlign: "center", marginTop: 36, padding: "20px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14 }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>&#9989;</div>
          <div style={{ color: "#4ade80", fontWeight: 700, fontSize: "1.1rem", marginBottom: 6 }}>Test Submitted Successfully</div>
          <div style={{ color: "#64748b", fontSize: 13 }}>Your result has been saved. You may close this window.</div>
        </div>
      </div>
    </div>
  );
}

function subjectColors(i) {
  return ["#6366f1","#f59e0b","#22c55e","#f43f5e"][i % 4];
}

// 
// ROOT APP
// 
export default function App() {
  const [screen,       setScreen]       = useState(SCREEN.LANDING);
  const [user,         setUser]         = useState(null);
  const [year,         setYear]         = useState(2024);
  const [questions,    setQuestions]    = useState([]);
  const [finalAnswers, setFinalAnswers] = useState({});
  const [finalMeta,    setFinalMeta]    = useState({});   // time_per_q, subject_times, bookmarks
  const [activeTest,   setActiveTest]   = useState(null); // {batch_test_id, batch_id, test_name}
  const [branding,     setBranding]     = useState(() => {
    try {
      const cached = localStorage.getItem("neet_branding_cache");
      return cached ? JSON.parse(cached) : {};
    } catch (_) { return {}; }
  });
  const [brandingReady,setBrandingReady]= useState(true);
  const [examWindowEnd, setExamWindowEnd] = useState(null); // ISO string of window end for auto-submit
  const [loadingQ,     setLoadingQ]     = useState(false);
  const [loadingError, setLoadingError] = useState(null);
  const darkMode = true; // always dark
  const hindiMode = false;
  const [settings,     setSettings]     = useState({});   // platform_settings from Supabase

  // Sync theme to global context so all components can read it
  ThemeCtx.dark = darkMode;
  ThemeCtx.branding = branding;

  // Load platform settings + branding from Supabase on mount
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from("platform_settings").select("key,value");
        if (data) { const s = {}; data.forEach(r => { s[r.key] = r.value; }); setSettings(s); }
      } catch (_) {}
      try {
        const { data } = await supabase.from("branding").select("key,value");
        if (data && data.length > 0) {
          const b = {};
          data.forEach(r => { b[r.key] = r.value; });
          setBranding(b);
          try {
            localStorage.setItem("neet_branding_cache", JSON.stringify(b));
            var bg = b.bg_type === "solid" && b.bg_solid_color ? b.bg_solid_color
              : b.bg_type === "image" && b.bg_image_data ? "url(" + b.bg_image_data + ") center/cover no-repeat"
              : b.bg_gradient_from && b.bg_gradient_to ? "linear-gradient(135deg," + b.bg_gradient_from + " 0%," + b.bg_gradient_to + " 50%," + b.bg_gradient_from + " 100%)"
              : "";
            if (bg) document.documentElement.style.setProperty("--landing-bg", bg);
          } catch (_) {}
        }
        setBrandingReady(true);
      } catch (_) { setBrandingReady(true); }
    })();
  }, []);

  // Check for existing auth session + resume exam on mount
  useEffect(() => {
    // 1. Check if there's an active exam session in localStorage
    const tryResumeExam = (loggedInUser) => {
      try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) return false;
        const s = JSON.parse(raw);
        // Reject stale sessions older than 4 hours
        if (!s.savedAt || Date.now() - s.savedAt > 4 * 60 * 60 * 1000) {
          localStorage.removeItem(SESSION_KEY);
          return false;
        }
        // Restore the cached question list
        const cachedQs = localStorage.getItem("neet_questions_cache");
        if (!cachedQs) return false;
        const qs = JSON.parse(cachedQs);
        // Validate question IDs match
        if (!s.questionIds || s.questionIds.length !== qs.length) return false;
        setQuestions(qs);
        setYear(s.year || 2025);
        setScreen(SCREEN.EXAM);
        return true;
      } catch { return false; }
    };

    // 1b. Check for a recently submitted result (show result on reload instead of landing)
    const tryResumeResult = async (u) => {
      try {
        const raw = localStorage.getItem("neet_last_result");
        if (!raw) return false;
        const saved = JSON.parse(raw);
        // Only restore if saved within last 2 hours
        if (!saved?.savedAt || Date.now() - saved.savedAt > 2 * 60 * 60 * 1000) return false;
        if (!saved.questionIds?.length) return false;
        // Fetch questions by IDs to restore result screen
        const { data: qs } = await supabase.from("questions")
          .select("id, number, subject, type, question_text, equation, diagram_url, option_a, option_b, option_c, option_d, correct, solution_text, solution_eq, paper_id")
          .in("id", saved.questionIds.slice(0, 180));
        if (!qs || !qs.length) return false;
        // Sort by original order
        const ordered = saved.questionIds.map(id => qs.find(q => q.id === id)).filter(Boolean);
        setQuestions(ordered);
        setFinalAnswers(saved.answers || {});
        setFinalMeta(saved.meta || {});
        setScreen(SCREEN.RESULT);
        return true;
      } catch { return false; }
    };

    // 2. Auth state
    if (isSupabaseConfigured()) {
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (session?.user) {
          setUser(session.user);
          // Check for pending result first, then exam, then dashboard
          const hasResult = await tryResumeResult(session.user);
          if (!hasResult && !tryResumeExam(session.user)) setScreen(SCREEN.DASHBOARD);
        } else {
          setScreen(SCREEN.LANDING);
        }
      });
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
        if (session?.user) { setUser(session.user); }
        else { setUser(null); setScreen(SCREEN.LANDING); }
      });
      return () => subscription.unsubscribe();
    } else {
      // Demo mode  still try to resume exam if questions are cached
      tryResumeExam(null);
    }
  }, []);

  const handleAuth = (u) => { setUser(u); setScreen(SCREEN.DASHBOARD); };

  const handleSignOut = async () => {
    try { localStorage.removeItem(SESSION_KEY); } catch (_) {}
    await sbSignOut();
    setUser(null);
    setScreen(SCREEN.LANDING);
  };

  const handleStartYear = async (paperId, testMeta) => {
    const usePaperId = paperId || "NEET_2025";
    if (testMeta) setActiveTest(testMeta);
    else setActiveTest(null);
    // Store the exam window end so ExamScreen can auto-submit at the right time
    setExamWindowEnd(testMeta?.exam_window_end || null);
    setYear(2025);
    setLoadingQ(true);
    setLoadingError(null);

    const { questions: remote, error } = await sbFetchQuestions(usePaperId);

    if (error) {
      // Try localStorage cache as fallback
      const cached = localStorage.getItem("neet_questions_cache_" + usePaperId);
      if (cached) {
        try {
          setQuestions(JSON.parse(cached));
          setLoadingQ(false);
          setScreen(SCREEN.INSTRUCTIONS);
          return;
        } catch (_) {}
      }
      setLoadingError(error);
      setLoadingQ(false);
      return;
    }

    // Cache for offline resilience
    try { localStorage.setItem("neet_questions_cache_" + usePaperId, JSON.stringify(remote)); } catch (_) {}

    setQuestions(remote);
    setLoadingQ(false);
    setScreen(SCREEN.INSTRUCTIONS);
  };



  const handleFinish = async (ans, marked, meta) => {
    setFinalAnswers(ans);
    setFinalMeta(meta || {});
    // Persist result so page reload shows result instead of landing
    try {
      localStorage.setItem("neet_last_result", JSON.stringify({
        answers: ans,
        meta: meta || {},
        questionIds: questions.map(q => q.id),
        paper_id: questions[0]?.paper_id || "NEET_2025",
        savedAt: Date.now(),
      }));
    } catch (_) {}
    let correct = 0, wrong = 0, unattempted = 0;
    questions.forEach(q => {
      if (ans[q.id] === undefined) unattempted++;
      else if (ans[q.id] === q.correct) correct++;
      else wrong++;
    });
    const score = correct * MARKS_CORRECT + wrong * MARKS_WRONG;

    // Compute percentile from all past results
    let percentile = null;
    try {
      const { data: allResults } = await supabase.from("test_results").select("score");
      if (allResults && allResults.length > 0) {
        const below = allResults.filter(r => r.score < score).length;
        percentile = Math.round((below / allResults.length) * 100);
      }
    } catch (_) {}

    // Increment attempt count in student_profiles
    if (user) {
      try {
        await supabase.from("student_profiles")
          .upsert({ id: user.id, attempts: 1 }, { onConflict: "id", ignoreDuplicates: false });
        await supabase.rpc("increment_attempts", { uid: user.id }).catch(() => {});
      } catch (_) {}
    }

    const studentName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Student";
    if (meta && activeTest) meta.testName = activeTest.test_name;
    const payload = {
      year, score, correct, wrong, unattempted,
      total: questions.length, percentile,
      time_per_question: meta?.timePerQ || {},
      subject_times:     meta?.subjectTimes || {},
      bookmarks:         meta?.bookmarks || [],
      answers:           ans,
      student_name:      studentName,
      student_email:     user?.email || "",
      paper_id:          questions[0]?.paper_id || "NEET_2025",
      ...(activeTest ? {
        batch_test_id: activeTest.batch_test_id,
        batch_id:      activeTest.batch_id,
        test_name:     activeTest.test_name,
      } : {}),
    };

    // Save to localStorage
    if (user) {
      try {
        const key = "neet_history_" + user.id;
        const existing = JSON.parse(localStorage.getItem(key) || "[]");
        existing.unshift({ ...payload, created_at: new Date().toISOString() });
        localStorage.setItem(key, JSON.stringify(existing.slice(0, 30)));
      } catch (_) {}
    }

    // Save to Supabase
    if (isSupabaseConfigured() && user) {
      await sbSaveResult(user.id, payload);
    }

    setScreen(SCREEN.RESULT);
  };

  if (loadingQ) {
    return (
      <div style={{ height: "100vh", ...brandingBg(getBranding()), display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, fontFamily: brandingFont(getBranding()) }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", border: "3px solid rgba(99,102,241,0.3)", borderTop: "3px solid #6366f1", animation: "spin 0.8s linear infinite" }} />
        <div style={{ color: "#818cf8", fontSize: "1rem" }}>Loading question bank</div>
        <div style={{ color: "#475569", fontSize: 13 }}>Connecting to Supabase</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
      </div>
    );
  }

  // Show a clear error screen if questions failed to load
  if (loadingError) {
    // Detect what kind of error to show the right fix
    const isConfig   = loadingError.includes("not set") || loadingError.includes("placeholder") || loadingError.includes("trailing slash") || loadingError.includes("starts with");
    const isNoData   = loadingError.includes("No questions found");
    const isRLS      = loadingError.includes("Permission denied") || loadingError.includes("policy");
    const isNetwork  = loadingError.includes("Network error") || loadingError.includes("internet");
    const isTable    = loadingError.includes("does not exist");
    const isKey      = loadingError.includes("API key") || loadingError.includes("anon key");

    const steps = isConfig ? [
      "Open src/App.jsx in VS Code",
      "Go to supabase.com  your project  Settings  API",
      "Copy Project URL  paste on line 8 (replace the placeholder)",
      "Copy anon public key  paste on line 9",
      "Save the file (Ctrl+S)  page will auto-reload",
    ] : isNoData ? [
      "Go to supabase.com  your project  SQL Editor",
      "Paste the INSERT questions SQL from the earlier step",
      "Make sure paper_id = 'NEET_2025' in every row",
      "Click Run, then try again",
    ] : isRLS ? [
      "Go to supabase.com  your project  SQL Editor",
      "Run: create policy \"read questions\" on questions for select to authenticated using (true);",
      "Save and try again",
    ] : isTable ? [
      "Go to supabase.com  your project  SQL Editor",
      "Run the full table creation SQL from the setup step",
      "Then insert your questions and try again",
    ] : isKey ? [
      "Go to supabase.com  your project  Settings  API",
      "Copy the anon public key (starts with eyJ)",
      "Paste it on line 9 of src/App.jsx",
      "Save the file",
    ] : isNetwork ? [
      "Check your internet connection",
      "Verify SUPABASE_URL in App.jsx line 8 has no typos",
      "Make sure the URL has no trailing slash",
      "Try refreshing the page",
    ] : [
      "Open browser console (F12  Console tab)",
      "Click Begin Mock Test again",
      "Read the red error message and share it for help",
    ];

    return (
      <div style={{ height: "100vh", ...brandingBg(getBranding()), display: "flex", alignItems: "center", justifyContent: "center", fontFamily: brandingFont(getBranding()), padding: 24 }}>
        <div style={{ maxWidth: 560, width: "100%", background: "#0f172a", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 20, padding: 32 }}>
          
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}></div>
            <div>
              <div style={{ color: "#f87171", fontWeight: 700, fontSize: "1.1rem" }}>Could not load questions</div>
              <div style={{ color: "#64748b", fontSize: 13, marginTop: 2 }}>Supabase returned an error</div>
            </div>
          </div>

          
          <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "12px 16px", marginBottom: 24, color: "#fca5a5", fontSize: 14, lineHeight: 1.7 }}>
            {loadingError}
          </div>

          
          <div style={{ marginBottom: 24 }}>
            <div style={{ color: "#a5b4fc", fontWeight: 700, fontSize: 14, marginBottom: 12 }}>
              {isConfig ? " How to fix  set your credentials:" :
               isNoData ? " How to fix  add questions to Supabase:" :
               isRLS    ? " How to fix  add a security policy:" :
               isTable  ? " How to fix  create the table:" :
               isKey    ? " How to fix  update your API key:" :
               isNetwork? " How to fix  connection issue:" :
                          " How to debug:"}
            </div>
            <ol style={{ margin: 0, paddingLeft: 20, color: "#cbd5e1", fontSize: 14, lineHeight: 2 }}>
              {steps.map((s, i) => <li key={i}>{s}</li>)}
            </ol>
          </div>

         
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              onClick={() => { setLoadingError(null); handleStartYear(); }}
              style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "#fff", border: "none", borderRadius: 10, padding: "11px 24px", fontWeight: 600, cursor: "pointer", fontSize: "0.9rem", fontFamily: "inherit" }}
            >
               Retry
            </button>
            <button
              onClick={() => {
                setLoadingError(null);
                setYear(2025);
                setQuestions(buildLocalQuestions(2025));
                setScreen(SCREEN.INSTRUCTIONS);
              }}
              style={{ background: "rgba(255,255,255,0.07)", color: "#cbd5e1", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: "11px 24px", fontWeight: 600, cursor: "pointer", fontSize: "0.9rem", fontFamily: "inherit" }}
            >
               Use Demo Questions Instead
            </button>
            <button
              onClick={() => setLoadingError(null)}
              style={{ background: "transparent", color: "#64748b", border: "none", borderRadius: 10, padding: "11px 16px", cursor: "pointer", fontSize: "0.9rem", fontFamily: "inherit" }}
            >
               Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 3px; }
        input:-webkit-autofill { -webkit-box-shadow: 0 0 0 100px #1e293b inset !important; -webkit-text-fill-color: #e2e8f0 !important; }
        /* Prevent zoom on input focus on iOS/Android */
        input, select, textarea { font-size: 16px !important; }
        @keyframes pulse { 0%,100%{box-shadow:0 0 0 3px rgba(34,197,94,0.3)} 50%{box-shadow:0 0 0 6px rgba(34,197,94,0.1)} }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 700px) {
          /* General */
          .mob-full  { width: 100% !important; max-width: 100% !important; }
          .mob-hide  { display: none !important; }
          .mob-grid2 { grid-template-columns: 1fr 1fr !important; }
          .mob-grid1 { grid-template-columns: 1fr !important; }
          /* Exam: stack question ON TOP, palette as thin strip at bottom */
          .mob-col   { flex-direction: column !important; overflow: hidden !important; }
          /* Question area takes all available space */
          .mob-col > div:first-child { flex: 1 !important; min-height: 0 !important; overflow-y: auto !important; padding: 12px 14px !important; }
          /* Palette becomes a compact fixed-height strip at bottom */
          .mob-palette {
            width: 100% !important;
            height: 130px !important;
            min-height: 130px !important;
            max-height: 130px !important;
            border-left: none !important;
            border-top: 1px solid rgba(255,255,255,0.1) !important;
            flex-direction: row !important;
            overflow: hidden !important;
          }
          /* Stats row inside palette: horizontal compact */
          .mob-palette > div:nth-child(1) {
            display: flex !important;
            flex-direction: column !important;
            gap: 3px !important;
            padding: 6px !important;
            border-bottom: none !important;
            border-right: 1px solid rgba(255,255,255,0.07) !important;
            min-width: 60px !important;
            max-width: 60px !important;
            font-size: 10px !important;
          }
          /* Legend row: hide on mobile to save space */
          .mob-palette > div:nth-child(2) { display: none !important; }
          /* Grid scroll area: takes remaining width */
          .mob-pal-scroll {
            flex: 1 !important;
            display: flex !important;
            flex-direction: row !important;
            overflow-x: auto !important;
            gap: 6px !important;
            padding: 6px 8px !important;
            align-items: flex-start !important;
          }
          /* Each subject section in palette */
          .mob-pal-section {
            flex-shrink: 0 !important;
            min-width: 60px !important;
          }
          /* Question buttons in palette: smaller on mobile */
          .mob-pal-section .pal-btn {
            width: 22px !important;
            height: 22px !important;
            font-size: 8px !important;
          }
          /* Subject label in palette */
          .mob-pal-section > div:first-child { font-size: 7px !important; margin-bottom: 3px !important; }
          /* Palette question grid */
          .mob-pal-section > div:last-child { gap: 2px !important; }
          /* Hide subject tabs in header on mobile */
          .exam-subj-tabs { display: none !important; }
          /* Action buttons */
          .mob-action-row { gap: 5px !important; }
          .mob-action-row button { padding: 9px 8px !important; font-size: 11px !important; flex: 1 !important; min-width: 0 !important; }
          /* Time strip */
          .time-strip span { font-size: 9px !important; }
          /* Header */
          .exam-timer { font-size: 13px !important; padding: 4px 10px !important; }
        }
      `}</style>

      {screen === SCREEN.LANDING     && (
        <LandingScreen onStudent={() => setScreen(SCREEN.AUTH)} onAdmin={() => setScreen(SCREEN.ADMIN_AUTH)} branding={branding} />
      )}
      {screen === SCREEN.AUTH         && <AuthScreen onAuth={handleAuth} />}
      {screen === SCREEN.ADMIN_AUTH   && <AdminAuthScreen onSuccess={() => setScreen(SCREEN.ADMIN)} onBack={() => setScreen(SCREEN.LANDING)} />}
      {screen === SCREEN.ADMIN        && <AdminScreen onSignOut={() => setScreen(SCREEN.LANDING)} />}
      {screen === SCREEN.DASHBOARD    && user && <Dashboard user={user} onStart={handleStartYear} onSignOut={handleSignOut} settings={settings} />}
      {screen === SCREEN.INSTRUCTIONS && <InstructionsScreen year={year} onBegin={() => setScreen(SCREEN.EXAM)} onBack={() => { try { localStorage.removeItem(SESSION_KEY); } catch(_){} setScreen(SCREEN.DASHBOARD); }} />}
      {screen === SCREEN.EXAM         && <ExamScreen questions={questions} year={year} onFinish={handleFinish} settings={settings} examWindowEnd={examWindowEnd} />}
      {screen === SCREEN.RESULT       && (
        <ResultScreen questions={questions} answers={finalAnswers} year={year} user={user} meta={finalMeta}
          onDashboard={() => { try { localStorage.removeItem("neet_last_result"); } catch (_) {} setFinalAnswers({}); setFinalMeta({}); setScreen(SCREEN.DASHBOARD); }}
          onSignOut={handleSignOut} />
      )}
    </>
  );
}
