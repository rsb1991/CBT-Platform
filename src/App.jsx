import { useState, useEffect, useCallback, useRef } from "react";
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
const ThemeCtx = { dark: true }; // mutable object, avoids full React context overhead
const getTheme = () => ThemeCtx.dark;

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
      .select("id, number, subject, type, question_text, equation, diagram_url, diagram_data, option_a, option_b, option_c, option_d, correct, solution_text, solution_eq, paper_id")
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
      diagram_data:  q.diagram_data || "",
      options:       [q.option_a, q.option_b, q.option_c, q.option_d],
      correct:       q.correct,
      solution_text: q.solution_text || q.solution || "",
      solution_eq:   q.solution_eq || "",
      year:          2025,
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
function LandingScreen({ onStudent, onAdmin }) {
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0f0c29 0%,#302b63 50%,#24243e 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Crimson Pro', Georgia, serif", padding: "1.5rem" }}>
      <div style={{ width: "100%", maxWidth: 460, textAlign: "center" }}>
        <div style={{ display: "inline-block", background: "rgba(168,85,247,0.2)", border: "1px solid rgba(168,85,247,0.5)", borderRadius: 99, padding: "6px 20px", fontSize: 12, color: "#c084fc", letterSpacing: 2, textTransform: "uppercase", marginBottom: 24, fontFamily: "monospace" }}>
          NTA NEET UG 2025
        </div>
        <h1 style={{ color: "#fff", fontSize: "2.2rem", fontWeight: 700, margin: "0 0 10px" }}>
          Mock Test Platform
        </h1>
        <p style={{ color: "#64748b", margin: "0 0 48px", fontSize: 15 }}>Select your role to continue</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <button onClick={onStudent} style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.35)", borderRadius: 16, padding: "32px 20px", cursor: "pointer", fontFamily: "inherit", textAlign: "center" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(99,102,241,0.25)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(99,102,241,0.12)"}>
            <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>&#127891;</div>
            <div style={{ color: "#a5b4fc", fontWeight: 700, fontSize: "1.1rem", marginBottom: 8 }}>Student</div>
            <div style={{ color: "#64748b", fontSize: 13 }}>Login to take the mock exam</div>
          </button>
          <button onClick={onAdmin} style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.3)", borderRadius: 16, padding: "32px 20px", cursor: "pointer", fontFamily: "inherit", textAlign: "center" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(168,85,247,0.22)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(168,85,247,0.1)"}>
            <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>&#128736;</div>
            <div style={{ color: "#c084fc", fontWeight: 700, fontSize: "1.1rem", marginBottom: 8 }}>Admin</div>
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
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0f0c29 0%,#302b63 50%,#24243e 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Crimson Pro', Georgia, serif", padding: "1.5rem" }}>
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
const aempty = () => ({ number: "", subject: "Physics", question_text: "", equation: "", diagram_data: "", option_a: "", option_b: "", option_c: "", option_d: "", correct: "0", solution_text: "", solution_eq: "" });
const SUBJ_COLORS_A = { Physics: "#6366f1", Chemistry: "#f59e0b", Botany: "#22c55e", Zoology: "#f43f5e" };

// ADMIN SCREEN - full page with CSV upload and Settings panel
function AdminScreen({ onSignOut }) {
  const [tab,       setTab]       = useState("add");
  const [form,      setForm]      = useState(aempty());
  const [questions, setQuestions] = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [imgInfo,   setImgInfo]   = useState(null);
  const [msg,       setMsg]       = useState(null);
  const [search,    setSearch]    = useState("");
  const [subFilter, setSubFilter] = useState("All");
  const [editId,    setEditId]    = useState(null);
  const [csvMsg,    setCsvMsg]    = useState(null);
  const [csvPreview,setCsvPreview]= useState([]);
  const [csvLoading,setCsvLoading]= useState(false);
  const [settings,  setSettings]  = useState({});
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg,    setSettingsMsg]    = useState(null);
  const [students,  setStudents]  = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const afileRef   = useRef(null);
  const csvFileRef = useRef(null);

  useEffect(() => {
    if (tab === "list")     loadAll();
    if (tab === "settings") loadSettings();
    if (tab === "students") loadStudents();
  }, [tab]);

  const ff = (k, v) => setForm(p => ({ ...p, [k]: v }));

  //  Load all questions 
  const loadAll = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("questions")
      .select("id,number,subject,type,question_text,equation,diagram_data,option_a,option_b,option_c,option_d,correct,solution_text,solution_eq,paper_id")
      .eq("paper_id", "NEET_2025").order("subject").order("number");
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
  const loadStudents = async () => {
    setLoadingStudents(true);
    const { data } = await supabase.from("test_results")
      .select("user_id, score, correct, wrong, unattempted, created_at, year")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data) setStudents(data);
    setLoadingStudents(false);
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
      correct: +form.correct, solution_text: form.solution_text, solution_eq: form.solution_eq, paper_id: "NEET_2025",
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
    setForm({ number: String(q.number), subject: q.subject || "Physics", question_text: q.question_text || "", equation: q.equation || "", diagram_data: q.diagram_data || "", option_a: q.option_a || "", option_b: q.option_b || "", option_c: q.option_c || "", option_d: q.option_d || "", correct: String(q.correct), solution_text: q.solution_text || "", solution_eq: q.solution_eq || "" });
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
    if (!window.confirm("Delete ALL questions? This cannot be undone.")) return;
    const { error } = await supabase.from("questions").delete().eq("paper_id", "NEET_2025");
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
        paper_id:      "NEET_2025",
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
    <div style={{ minHeight: "100vh", background: "#070d1a", fontFamily: "Georgia, serif", color: "#e2e8f0" }}>
      
      <div style={{ background: "#0f172a", borderBottom: "1px solid rgba(168,85,247,0.2)", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ color: "#c084fc", fontWeight: 700, fontSize: "1rem" }}>CBT Admin Panel</span>
        <button onClick={onSignOut} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171", borderRadius: 8, padding: "7px 16px", cursor: "pointer", fontSize: 13, fontFamily: "inherit", fontWeight: 600 }}>Sign Out</button>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: 20 }}>
        
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {[["add","Add Question"],["csv","CSV Upload"],["list","All Questions"],["settings","Exam Settings"],["students","Student Data"]].map(([t,l]) => (
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
            <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 12 }}>
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
                    <div style={{ color: "#4ade80", fontSize: 12, marginBottom: 6 }}>{"Image ready" + (imgInfo ? " - " + imgInfo.w + "x" + imgInfo.h + "px, " + imgInfo.kb + "KB" : "")}</div>
                    <button onClick={e => { e.stopPropagation(); ff("diagram_data", ""); setImgInfo(null); }} style={{ ...abtn("danger"), padding: "5px 14px", fontSize: 12 }}>Remove</button>
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
                number,subject,question_text,equation,option_a,option_b,option_c,option_d,correct,solution_text,solution_eq,chapter,difficulty
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
                ].map(([k,v]) => (
                  <div key={k} style={{ fontSize: 12 }}>
                    <span style={{ color: "#fbbf24", fontFamily: "monospace" }}>{k}</span>
                    <span style={{ color: "#64748b" }}> - {v}</span>
                  </div>
                ))}
              </div>

              
              <button
                onClick={() => {
                  const sample = "number,subject,question_text,equation,option_a,option_b,option_c,option_d,correct,solution_text,solution_eq,chapter,difficulty\n" +
                    "1,Physics,A ball is thrown upward at 20 m/s. Max height (g=10):,,10 m,20 m,30 m,40 m,1,h = u^2/2g = 400/20 = 20 m.,$h=\\frac{u^2}{2g}$,Kinematics,easy\n" +
                    "2,Chemistry,The hybridization of carbon in diamond:,,sp,sp2,sp3,sp3d,2,Diamond carbon forms 4 sigma bonds so sp3.,,Carbon,medium\n" +
                    "3,Physics,SI unit of electric field intensity:,,C/m,N/C,N.m,J/C2,1,E = F/q so unit is N/C.,,Electrostatics,easy\n";
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
          </div>
        )}

        
        {tab === "list" && (
          <div>
            {msg && <div style={mstyle(msg)}>{msg.text}</div>}
            <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ ...ainput, flex: 1, minWidth: 180 }} />
              <select value={subFilter} onChange={e => setSubFilter(e.target.value)} style={{ ...ainput, width: 130, cursor: "pointer" }}>
                <option value="All">All Subjects</option>
                {SUBJECTS.map(s => <option key={s}>{s}</option>)}
              </select>
              <button onClick={loadAll} style={abtn("ghost")}>Refresh</button>
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
                    <label style={alabel}>Access Code</label>
                    <input value={settings.access_code || ""} onChange={e => setSettings(p => ({ ...p, access_code: e.target.value }))}
                      placeholder="Enter the code students must type" style={settingInput} />
                  </div>
                )}
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

        
        {tab === "students" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ color: "#a5b4fc", fontWeight: 700 }}>{"Student Results (" + students.length + " attempts)"}</div>
              <button onClick={loadStudents} style={abtn("ghost")}>Refresh</button>
            </div>
            {loadingStudents ? (
              <div style={{ textAlign: "center", color: "#64748b", padding: 40 }}>Loading...</div>
            ) : students.length === 0 ? (
              <div style={{ textAlign: "center", color: "#475569", padding: 40 }}>No exam attempts yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 8 }}>
                  {[
                    ["Total Attempts", students.length],
                    ["Avg Score", Math.round(students.reduce((a,r) => a + r.score, 0) / students.length) + "/720"],
                    ["Highest", Math.max(...students.map(r => r.score)) + "/720"],
                    ["Pass Rate (50%+)", Math.round(students.filter(r => r.score >= 360).length / students.length * 100) + "%"],
                  ].map(([l,v]) => (
                    <div key={l} style={{ ...acard, padding: "12px", textAlign: "center" }}>
                      <div style={{ color: "#a5b4fc", fontWeight: 700, fontSize: "1.1rem" }}>{v}</div>
                      <div style={{ color: "#64748b", fontSize: 11, marginTop: 3 }}>{l}</div>
                    </div>
                  ))}
                </div>
                {students.map((r, i) => {
                  const pct = Math.round((r.score / 720) * 100);
                  const date = new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
                  return (
                    <div key={i} style={{ ...acard, display: "flex", alignItems: "center", gap: 14, padding: "12px 16px" }}>
                      <div style={{ width: 44, height: 44, borderRadius: "50%", background: pct>=50?"rgba(34,197,94,0.2)":"rgba(239,68,68,0.2)", border: "2px solid "+(pct>=50?"#22c55e":"#ef4444"), display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: pct>=50?"#4ade80":"#f87171", fontSize: 12, flexShrink: 0 }}>{pct}%</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, color: "#818cf8", fontFamily: "monospace" }}>{r.user_id.slice(0,8) + "..."}</div>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{date}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 700, color: "#e2e8f0" }}>{r.score} / 720</div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>C:{r.correct} W:{r.wrong} U:{r.unattempted}</div>
                      </div>
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


// AUTH SCREEN
// 
function AuthScreen({ onAuth }) {
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
      minHeight: "100vh", background: "linear-gradient(135deg,#0f0c29 0%,#302b63 50%,#24243e 100%)",
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
function Dashboard({ user, onStart, onSignOut, settings, darkMode, setDarkMode, hindiMode, setHindiMode }) {
  const [history,        setHistory]        = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [tab,            setTab]            = useState("start"); // start | history | leaderboard
  const [accessCode,     setAccessCode]     = useState("");
  const [accessErr,      setAccessErr]      = useState("");
  const [leaderboard,    setLeaderboard]    = useState([]);
  const [loadingLB,      setLoadingLB]      = useState(false);

  // Countdown to NEET exam date
  const neetDate   = settings?.neet_exam_date ? new Date(settings.neet_exam_date) : new Date("2026-05-04");
  const daysLeft   = Math.max(0, Math.ceil((neetDate - new Date()) / (1000*60*60*24)));
  const attemptLimit = parseInt(settings?.attempt_limit || "0");
  const attemptsUsed = history.length;
  const limitReached = attemptLimit > 0 && attemptsUsed >= attemptLimit;

  useEffect(() => {
    (async () => {
      let local = [];
      try { local = JSON.parse(localStorage.getItem("neet_history_" + user.id) || "[]"); } catch (_) {}
      let remote = [];
      if (isSupabaseConfigured()) { remote = await sbGetHistory(user.id); }
      const merged = remote.length > 0 ? remote : local;
      setHistory(merged);
      setLoadingHistory(false);
    })();
  }, [user.id]);

  useEffect(() => {
    if (tab !== "leaderboard") return;
    if (settings?.leaderboard_enabled === "false") return;
    setLoadingLB(true);
    (async () => {
      const { data } = await supabase.from("test_results")
        .select("user_id, score, created_at")
        .order("score", { ascending: false })
        .limit(50);
      if (data) setLeaderboard(data);
      setLoadingLB(false);
    })();
  }, [tab]);

  const handleStart = () => {
    // Check access code
    if (settings?.access_code_enabled === "true" && settings?.access_code) {
      if (accessCode.trim() !== settings.access_code.trim()) {
        setAccessErr("Invalid access code. Please try again.");
        return;
      }
    }
    // Check exam window
    if (settings?.exam_window_start && settings?.exam_window_end) {
      const now = new Date();
      const start = new Date(settings.exam_window_start);
      const end   = new Date(settings.exam_window_end);
      if (now < start || now > end) {
        setAccessErr("Exam is not available right now. Scheduled: " + start.toLocaleString() + " to " + end.toLocaleString());
        return;
      }
    }
    if (settings?.exam_enabled === "false") {
      setAccessErr("Exam access is currently disabled by the admin.");
      return;
    }
    setAccessErr("");
    onStart();
  };

  const displayName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Student";
  const bestScore = history.length ? Math.max(...history.map(r => r.score)) : null;
  const avgScore  = history.length ? Math.round(history.reduce((s, r) => s + r.score, 0) / history.length) : null;

  return (
    <div style={{ minHeight: "100vh", background: darkMode ? "#070d1a" : "#f1f5f9", fontFamily: hindiMode ? "'Kruti Dev 010', serif" : "'Crimson Pro', Georgia, serif", color: darkMode ? "#e2e8f0" : "#1e293b" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&display=swap');
        @font-face { font-family: 'Kruti Dev 010'; src: local('Kruti Dev 010'); }
      `}</style>
     
      <div style={{ background: darkMode ? "#0f172a" : "#fff", borderBottom: "1px solid " + (darkMode ? "rgba(255,255,255,0.08)" : "#e2e8f0"), padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
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
          
          <button onClick={() => setDarkMode(!darkMode)} style={{ ...btn("ghost", { padding: "6px 12px", fontSize: 12 }) }}>
            {darkMode ? "Light Mode" : "Dark Mode"}
          </button>
          
          <button onClick={() => setHindiMode(!hindiMode)} style={{ ...btn("ghost", { padding: "6px 12px", fontSize: 12 }) }}>
            {hindiMode ? "English Font" : "Hindi Font"}
          </button>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: darkMode ? "#e2e8f0" : "#1e293b", fontSize: 13, fontWeight: 600 }}>{displayName}</div>
            <div style={{ color: "#475569", fontSize: 11 }}>{user.email}</div>
          </div>
          <button onClick={onSignOut} style={btn("ghost", { padding: "7px 14px", fontSize: 12 })}>Sign Out</button>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px" }}>
       
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 32 }}>
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
            <h2 style={{ color: "#e2e8f0", margin: "0 0 6px", fontSize: "1.2rem", fontWeight: 700 }}>NEET UG 2025 - Mock Test</h2>
            <p style={{ color: "#64748b", margin: "0 0 20px", fontSize: 14 }}>Full-length mock examination</p>

            
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

            <button onClick={handleStart} disabled={limitReached}
              style={{ ...btn("success", { padding: "13px 0", fontSize: "1rem", width: "100%", borderRadius: 12 }), opacity: limitReached ? 0.5 : 1, cursor: limitReached ? "not-allowed" : "pointer" }}>
              Begin Mock Test
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
                        <div style={{ fontWeight: 600, color: "#c7d2fe", fontSize: "0.9rem" }}>NEET {r.year} Mock</div>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{date}</div>
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
            <h3 style={{ color: "#a5b4fc", marginBottom: 14, fontSize: "1rem" }}>Top Scores - NEET 2025</h3>
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
                          {isMe ? "You" : "Student " + (i+1)}
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
  const [agreed, setAgreed] = useState(false);
  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", fontFamily: "'Crimson Pro', Georgia, serif", padding: "2rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
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
function Palette({ questions, answers, currentIdx, onJump, marked }) {
  const [activeSub, setActiveSub] = useState(SUBJECTS[0]);
  const filtered = questions.filter(q => q.subject === activeSub);

  const getStatus = (q) => {
    const idx = questions.indexOf(q);
    const ans = answers[q.id] !== undefined;
    const mk = marked.has(q.id);
    if (mk && ans) return "marked-answered";
    if (mk) return "marked";
    if (ans) return "answered";
    if (idx < currentIdx) return "not-answered";
    return "not-visited";
  };

  const counts = {
    a: questions.filter(q => answers[q.id] !== undefined && !marked.has(q.id)).length,
    m: questions.filter(q => marked.has(q.id)).length,
    n: questions.filter((q,i) => answers[q.id] === undefined && i < currentIdx).length,
    v: questions.filter((q,i) => i > currentIdx).length,
  };

  return (
    <div style={{ width: 230, background: "#0a1124", borderLeft: "1px solid rgba(255,255,255,0.07)", display: "flex", flexDirection: "column", flexShrink: 0, overflow: "hidden" }}>
      
      <div style={{ padding: "10px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
        {[["#22c55e", counts.a, "Ans"],["#a855f7", counts.m, "Marked"],["#ef4444", counts.n, "NA"],["#374151", counts.v, "NV"]].map(([c,n,l]) => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.03)", borderRadius: 7, padding: "5px 7px" }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: c, flexShrink: 0 }} />
            <span style={{ color: "#e2e8f0", fontSize: 12, fontWeight: 700 }}>{n}</span>
            <span style={{ color: "#475569", fontSize: 10 }}>{l}</span>
          </div>
        ))}
      </div>
      
      <div style={{ padding: "7px 8px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        {SUBJECTS.map(s => (
          <button key={s} onClick={() => setActiveSub(s)} style={{
            display: "block", width: "100%", textAlign: "left", padding: "6px 10px",
            borderRadius: 7, marginBottom: 2, border: "none", cursor: "pointer",
            background: activeSub === s ? "rgba(99,102,241,0.25)" : "transparent",
            color: activeSub === s ? "#a5b4fc" : "#64748b", fontSize: 13,
            fontWeight: activeSub === s ? 600 : 400, fontFamily: "inherit", transition: "all 0.15s"
          }}>{s}</button>
        ))}
      </div>
      
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 8px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 5 }}>
          {filtered.map(q => {
            const gi = questions.indexOf(q);
            const isCur = gi === currentIdx;
            return (
              <button key={q.id} onClick={() => onJump(gi)} title={`Q${q.number}`} style={{
                width: "100%", aspectRatio: "1", borderRadius: 6,
                border: isCur ? "2px solid #fff" : "1.5px solid transparent",
                background: statusColor(getStatus(q)), color: "#fff", fontSize: 10,
                fontWeight: 700, cursor: "pointer", transition: "all 0.15s",
                boxShadow: isCur ? "0 0 0 2px rgba(255,255,255,0.25)" : "none"
              }}>{q.number}</button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// 
// EXAM SCREEN
// 
function ExamScreen({ questions, year, onFinish, settings }) {
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
  const [bookmarks,     setBookmarks]    = useState(new Set(saved?.bookmarks ?? []));
  const [sel,           setSel]          = useState(null);
  const [timeLeft,      setTimeLeft]     = useState(saved?.timeLeft ?? TOTAL_TIME);
  const [showModal,     setShowModal]    = useState(false);
  const [restored,      setRestored]     = useState(!!saved);
  const [tabWarning,    setTabWarning]   = useState(false);
  const [tabSwitchCount,setTabSwitchCount] = useState(0);
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
        idx, answers, marked: [...marked], bookmarks: [...bookmarks],
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

  // Timer
  useEffect(() => {
    if (paused) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); doFinish(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [doFinish, paused]);

  // Right-click + tab switch blocker
  useEffect(() => {
    const block = (e) => e.preventDefault();
    const blockKeys = (e) => {
      if ((e.ctrlKey && ["c","u","s","p"].includes(e.key.toLowerCase())) ||
          (e.ctrlKey && e.shiftKey && ["i","j","c"].includes(e.key.toLowerCase())) ||
          e.key === "F12" || (e.altKey && e.key === "Tab")) e.preventDefault();
    };
    const handleVis = () => { if (document.hidden) { setTabWarning(true); setTabSwitchCount(c => c+1); }};
    const handleBlur = () => { setTabWarning(true); setTabSwitchCount(c => c+1); };
    document.addEventListener("contextmenu", block);
    document.addEventListener("keydown", blockKeys);
    document.addEventListener("visibilitychange", handleVis);
    window.addEventListener("blur", handleBlur);
    document.body.style.userSelect = "none";
    document.body.style.webkitUserSelect = "none";
    return () => {
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("keydown", blockKeys);
      document.removeEventListener("visibilitychange", handleVis);
      window.removeEventListener("blur", handleBlur);
      document.body.style.userSelect = "";
      document.body.style.webkitUserSelect = "";
    };
  }, []);

  const saveAndGo = (delta = 1) => {
    recordTime(idx);
    if (sel !== null) setAnswers(p => ({ ...p, [q.id]: sel }));
    const ni = idx + delta;
    if (ni >= 0 && ni < questions.length) setIdx(ni);
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
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#070d1a", fontFamily: "'Crimson Pro', Georgia, serif", color: "#e2e8f0" }}>
      
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
          <span> Session restored  your answers and timer have been saved from your last visit.</span>
          <button onClick={() => setRestored(false)} style={{ background: "none", border: "none", color: "#4ade80", cursor: "pointer", fontSize: 16, padding: "0 4px" }}></button>
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

         
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 13, padding: "22px 26px", marginBottom: 4 }}>
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
            <button onClick={toggleBookmark} style={{ ...btn("ghost"), borderColor: bookmarks.has(q.id) ? "rgba(245,158,11,0.5)" : undefined, color: bookmarks.has(q.id) ? "#fbbf24" : undefined }}>
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

        <Palette questions={questions} answers={answers} currentIdx={idx} onJump={setIdx} marked={marked} />
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
function ResultScreen({ questions, answers, year, user, meta, onDashboard }) {
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
  const downloadPDF = () => {
    const win = window.open("", "_blank");
    const rows = questions.map(q => {
      const ua = answers[q.id];
      const status = ua === undefined ? "Unattempted" : ua === q.correct ? "Correct" : "Wrong";
      const marks  = ua === undefined ? 0 : ua === q.correct ? 4 : -1;
      return "<tr style='border-bottom:1px solid #eee'><td>" + q.number + "</td><td>" + q.subject + "</td><td>" + (q.question_text||"").slice(0,60) + "...</td><td>" + status + "</td><td>" + (marks > 0 ? "+" : "") + marks + "</td><td>" + (timePerQ[q.id] || 0) + "s</td></tr>";
    }).join("");
    win.document.write(`<!DOCTYPE html><html><head><title>NEET Result ${year}</title>
    <style>body{font-family:Arial,sans-serif;padding:20px}h1{color:#312e81}table{width:100%;border-collapse:collapse}th{background:#312e81;color:white;padding:8px}td{padding:6px;font-size:12px}.stat{display:inline-block;margin:10px;padding:10px 20px;background:#f3f4f6;border-radius:8px;text-align:center}.big{font-size:2em;font-weight:bold;color:#312e81}</style></head><body>
    <h1>NEET ${year} Mock Test Result</h1>
    <div class="stat"><div class="big">${score}</div><div>Score / 720</div></div>
    <div class="stat"><div class="big">${pct}%</div><div>Percentage</div></div>
    <div class="stat"><div class="big">${correct}</div><div>Correct</div></div>
    <div class="stat"><div class="big">${wrong}</div><div>Wrong</div></div>
    <div class="stat"><div class="big">${unattempted}</div><div>Unattempted</div></div>
    <div class="stat"><div class="big">${predictRank(score)}</div><div>Predicted Rank</div></div>
    <br/><br/><h2>Question-wise Analysis</h2>
    <table><tr><th>Q#</th><th>Subject</th><th>Question</th><th>Status</th><th>Marks</th><th>Time</th></tr>${rows}</table>
    </body></html>`);
    win.document.close();
    win.print();
  };

  let filtered = filterSub === "All" ? questions : questions.filter(q => q.subject === filterSub);
  if (filterStatus === "Correct")     filtered = filtered.filter(q => answers[q.id] === q.correct);
  if (filterStatus === "Wrong")       filtered = filtered.filter(q => answers[q.id] !== undefined && answers[q.id] !== q.correct);
  if (filterStatus === "Unattempted") filtered = filtered.filter(q => answers[q.id] === undefined);
  if (filterStatus === "Bookmarked")  filtered = filtered.filter(q => bookmarked.has(q.id));

  const rank_band = pct >= 65 ? { label: "Excellent", color: "#4ade80" } : pct >= 50 ? { label: "Good", color: "#fbbf24" } : pct >= 35 ? { label: "Average", color: "#f59e0b" } : { label: "Needs Work", color: "#f87171" };

  return (
    <div style={{ minHeight: "100vh", background: "#070d1a", fontFamily: "'Crimson Pro', Georgia, serif", color: "#e2e8f0", paddingBottom: 60 }}>
     
      <div style={{ background: "linear-gradient(135deg,#1e1b4b,#312e81)", padding: "22px 28px", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: "0 0 4px", fontSize: "1.5rem", color: "#e2e8f0" }}>Test Completed - NEET {year}</h2>
          <p style={{ color: "#818cf8", margin: 0, fontSize: 14 }}>Detailed Performance Analysis</p>
        </div>
        <button onClick={downloadPDF} style={{ ...btn("ghost", { padding: "9px 18px" }), display: "flex", alignItems: "center", gap: 8 }}>
          Download PDF Report
        </button>
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

        <div style={{ textAlign: "center", marginTop: 36 }}>
          <button onClick={onDashboard} style={btn("primary", { padding: "13px 38px", fontSize: "1rem" })}>Back to Dashboard</button>
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
  const [loadingQ,     setLoadingQ]     = useState(false);
  const [loadingError, setLoadingError] = useState(null);
  const [darkMode,     setDarkMode]     = useState(true);
  const [hindiMode,    setHindiMode]    = useState(false);
  const [settings,     setSettings]     = useState({});   // platform_settings from Supabase

  // Sync theme to global context so all components can read it
  ThemeCtx.dark = darkMode;

  // Load platform settings from Supabase on mount
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from("platform_settings").select("key,value");
        if (data) {
          const s = {};
          data.forEach(r => { s[r.key] = r.value; });
          setSettings(s);
          if (s.dark_mode_default === "false") setDarkMode(false);
          if (s.hindi_font_enabled === "true")  setHindiMode(true);
        }
      } catch (_) {}
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

    // 2. Auth state
    if (isSupabaseConfigured()) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setUser(session.user);
          if (!tryResumeExam(session.user)) setScreen(SCREEN.DASHBOARD);
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

  const handleStartYear = async () => {
    setYear(2025);
    setLoadingQ(true);
    setLoadingError(null);

    const { questions: remote, error } = await sbFetchQuestions("NEET_2025");

    if (error) {
      // Try localStorage cache first
      const cached = localStorage.getItem("neet_questions_cache");
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
    try { localStorage.setItem("neet_questions_cache", JSON.stringify(remote)); } catch (_) {}

    setQuestions(remote);
    setLoadingQ(false);
    setScreen(SCREEN.INSTRUCTIONS);
  };



  const handleFinish = async (ans, marked, meta) => {
    setFinalAnswers(ans);
    setFinalMeta(meta || {});
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

    const payload = {
      year, score, correct, wrong, unattempted,
      total: questions.length, percentile,
      time_per_question: meta?.timePerQ || {},
      subject_times:     meta?.subjectTimes || {},
      bookmarks:         meta?.bookmarks || [],
      answers:           ans,
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
      <div style={{ height: "100vh", background: "#070d1a", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, fontFamily: "Georgia, serif" }}>
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
      <div style={{ height: "100vh", background: "#070d1a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", padding: 24 }}>
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
        body { margin: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 3px; }
        input:-webkit-autofill { -webkit-box-shadow: 0 0 0 100px #1e293b inset !important; -webkit-text-fill-color: #e2e8f0 !important; }
      `}</style>

      {screen === SCREEN.LANDING     && <LandingScreen onStudent={() => setScreen(SCREEN.AUTH)} onAdmin={() => setScreen(SCREEN.ADMIN_AUTH)} />}
      {screen === SCREEN.AUTH         && <AuthScreen onAuth={handleAuth} />}
      {screen === SCREEN.ADMIN_AUTH   && <AdminAuthScreen onSuccess={() => setScreen(SCREEN.ADMIN)} onBack={() => setScreen(SCREEN.LANDING)} />}
      {screen === SCREEN.ADMIN        && <AdminScreen onSignOut={() => setScreen(SCREEN.LANDING)} />}
      {screen === SCREEN.DASHBOARD    && user && <Dashboard user={user} onStart={handleStartYear} onSignOut={handleSignOut} settings={settings} darkMode={darkMode} setDarkMode={setDarkMode} hindiMode={hindiMode} setHindiMode={setHindiMode} />}
      {screen === SCREEN.INSTRUCTIONS && <InstructionsScreen year={year} onBegin={() => setScreen(SCREEN.EXAM)} onBack={() => { try { localStorage.removeItem(SESSION_KEY); } catch(_){} setScreen(SCREEN.DASHBOARD); }} />}
      {screen === SCREEN.EXAM         && <ExamScreen questions={questions} year={year} onFinish={handleFinish} settings={settings} />}
      {screen === SCREEN.RESULT       && (
        <ResultScreen questions={questions} answers={finalAnswers} year={year} user={user} meta={finalMeta}
          onDashboard={() => setScreen(SCREEN.DASHBOARD)} />
      )}
    </>
  );
}
