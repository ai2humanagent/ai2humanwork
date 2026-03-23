export type ServiceCategory =
  | "Hiring"
  | "Research"
  | "Companionship"
  | "Delivery"
  | "Creative"
  | "Tech"
  | "Writing"
  | "Events"
  | "Marketing"
  | "Home"
  | "Other";

export type Human = {
  id: string;
  name: string;
  handle: string;
  city: string;
  country: string;
  verified: boolean;
  rating: number;
  completedJobs: number;
  hourlyRate: number;
  skills: string[];
  languages: string[];
  avatarSeed: number;
};

export type HumanService = {
  id: string;
  providerId: string;
  title: string;
  shortDescription: string;
  description: string;
  category: ServiceCategory;
  price: number;
  pricing: "fixed" | "hourly";
  durationMinutes: number;
  verified: boolean;
  ratingCount: number;
};

export const seedHumans: Human[] = [
  {
    id: "h_kris_ming",
    name: "Kris Ming",
    handle: "krisming",
    city: "Shanghai",
    country: "China",
    verified: true,
    rating: 4.8,
    completedJobs: 129,
    hourlyRate: 50,
    skills: ["writing", "research", "onsite verification"],
    languages: ["English", "Chinese (Mandarin)"],
    avatarSeed: 1
  },
  {
    id: "h_louis_cubero",
    name: "Louis Cubero",
    handle: "louisc",
    city: "NYC",
    country: "United States",
    verified: true,
    rating: 4.9,
    completedJobs: 280,
    hourlyRate: 40,
    skills: ["creator ops", "social strategy", "ghostwriting"],
    languages: ["English", "Spanish"],
    avatarSeed: 2
  },
  {
    id: "h_patricia_tani",
    name: "Patricia Tani",
    handle: "patriciat",
    city: "San Francisco",
    country: "United States",
    verified: true,
    rating: 4.7,
    completedJobs: 85,
    hourlyRate: 45,
    skills: ["gaming", "community support", "companion tasks"],
    languages: ["English", "Japanese"],
    avatarSeed: 3
  },
  {
    id: "h_alistair_mcr",
    name: "Alistair",
    handle: "alistair_mcr",
    city: "Manchester",
    country: "United Kingdom",
    verified: false,
    rating: 4.3,
    completedJobs: 54,
    hourlyRate: 20,
    skills: ["delivery", "discord operations", "driving"],
    languages: ["English"],
    avatarSeed: 4
  },
  {
    id: "h_jimmy_harris",
    name: "Jimmy Harris",
    handle: "jimmyh",
    city: "Minneapolis",
    country: "United States",
    verified: true,
    rating: 4.6,
    completedJobs: 41,
    hourlyRate: 150,
    skills: ["legal ops", "compliance architecture", "workflow design"],
    languages: ["English"],
    avatarSeed: 5
  },
  {
    id: "h_humanaios",
    name: "HumanAIOS",
    handle: "humanaios",
    city: "Fort Walton Beach",
    country: "United States",
    verified: true,
    rating: 4.5,
    completedJobs: 63,
    hourlyRate: 75,
    skills: ["AI readiness", "operations consulting", "grant writing"],
    languages: ["English"],
    avatarSeed: 6
  },
  {
    id: "h_mihail_krsk",
    name: "Mihail",
    handle: "mihail_krsk",
    city: "Krasnoyarsk",
    country: "Russia",
    verified: true,
    rating: 4.6,
    completedJobs: 74,
    hourlyRate: 30,
    skills: ["on-site verification", "photo capture", "field checks"],
    languages: ["Russian", "English"],
    avatarSeed: 7
  },
  {
    id: "h_andy_pk",
    name: "Andy Pk",
    handle: "andy_pk",
    city: "Graz",
    country: "Austria",
    verified: true,
    rating: 4.9,
    completedJobs: 112,
    hourlyRate: 150,
    skills: ["in-person recon", "multisensory reports", "verification"],
    languages: ["English", "German"],
    avatarSeed: 8
  },
  {
    id: "h_onyx_hanoi",
    name: "Onyx",
    handle: "onyx_hanoi",
    city: "Hanoi",
    country: "Vietnam",
    verified: false,
    rating: 4.2,
    completedJobs: 39,
    hourlyRate: 20,
    skills: ["communication", "business development", "lead generation"],
    languages: ["English", "Vietnamese"],
    avatarSeed: 1
  },
  {
    id: "h_priscila_ml",
    name: "Priscila Sorenson",
    handle: "priscila_ml",
    city: "Fort Lauderdale",
    country: "United States",
    verified: true,
    rating: 4.9,
    completedJobs: 155,
    hourlyRate: 150,
    skills: ["LLM evaluation", "quant ML", "data science"],
    languages: ["English", "Portuguese"],
    avatarSeed: 2
  },
  {
    id: "h_diego_woo",
    name: "Diego Woo",
    handle: "diegowoo",
    city: "Vienna",
    country: "Austria",
    verified: true,
    rating: 4.7,
    completedJobs: 98,
    hourlyRate: 55,
    skills: ["logistics", "real estate checks", "event support"],
    languages: ["English", "German", "Spanish"],
    avatarSeed: 3
  },
  {
    id: "h_rahmat_pk",
    name: "Rahmat Ullah",
    handle: "rahmat_pk",
    city: "Peshawar",
    country: "Pakistan",
    verified: true,
    rating: 4.4,
    completedJobs: 58,
    hourlyRate: 35,
    skills: ["cargo pickup", "tour assistance", "local meetings"],
    languages: ["English", "Urdu"],
    avatarSeed: 4
  },
  {
    id: "h_kelvin_fung",
    name: "Kelvin Fung",
    handle: "kelvinfung",
    city: "Foshan",
    country: "China",
    verified: false,
    rating: 4.1,
    completedJobs: 24,
    hourlyRate: 45,
    skills: ["3d printing", "procurement", "trading"],
    languages: ["English", "Chinese (Mandarin)"],
    avatarSeed: 5
  },
  {
    id: "h_rob_texas",
    name: "Rob",
    handle: "rob_texas",
    city: "New Braunfels",
    country: "United States",
    verified: true,
    rating: 4.8,
    completedJobs: 101,
    hourlyRate: 55,
    skills: ["package pickup", "errands", "photo verification"],
    languages: ["English"],
    avatarSeed: 6
  },
  {
    id: "h_diogo_br",
    name: "Diogo",
    handle: "diogo_br",
    city: "Curitiba",
    country: "Brazil",
    verified: false,
    rating: 4.3,
    completedJobs: 46,
    hourlyRate: 40,
    skills: ["local errands", "pickup", "field coordination"],
    languages: ["Portuguese", "English"],
    avatarSeed: 7
  },
  {
    id: "h_hexdem_dev",
    name: "Hexdem",
    handle: "hexdem",
    city: "Izmir",
    country: "Türkiye",
    verified: true,
    rating: 4.7,
    completedJobs: 132,
    hourlyRate: 60,
    skills: ["full-stack", "backend", "automation scripting"],
    languages: ["English", "Turkish"],
    avatarSeed: 8
  }
];

export const seedServices: HumanService[] = [
  {
    id: "svc_linkedin_ghostwriting",
    providerId: "h_kris_ming",
    title: "LinkedIn Ghostwriting - guaranteed 100k impressions",
    shortDescription: "High-performing LinkedIn post crafted for growth and conversion.",
    description:
      "I write a high-conviction LinkedIn post optimized for reach, saves, and profile visits. Includes hook strategy and CTA angle.",
    category: "Writing",
    price: 1000,
    pricing: "fixed",
    durationMinutes: 300,
    verified: true,
    ratingCount: 3
  },
  {
    id: "svc_influencer_101",
    providerId: "h_louis_cubero",
    title: "Influencer 101",
    shortDescription: "Brand growth coaching and practical creator execution plan.",
    description:
      "I audit your positioning and map a weekly posting + community engine.",
    category: "Creative",
    price: 40,
    pricing: "hourly",
    durationMinutes: 45,
    verified: true,
    ratingCount: 12
  },
  {
    id: "svc_twitter_ghostwriting",
    providerId: "h_louis_cubero",
    title: "Ghostwriting Twitter",
    shortDescription: "Viral-style X threads and posts for founder/operator accounts.",
    description:
      "I ghostwrite high-leverage posts based on your voice, goals, and launch context.",
    category: "Marketing",
    price: 2500,
    pricing: "fixed",
    durationMinutes: 15,
    verified: true,
    ratingCount: 7
  },
  {
    id: "svc_dad_advice",
    providerId: "h_patricia_tani",
    title: "Dad Advice",
    shortDescription: "Practical and direct human feedback when AI tone is not enough.",
    description:
      "Grounded perspective for decision stress, planning, and personal productivity.",
    category: "Companionship",
    price: 25,
    pricing: "hourly",
    durationMinutes: 60,
    verified: false,
    ratingCount: 3
  },
  {
    id: "svc_car_driver",
    providerId: "h_alistair_mcr",
    title: "Car Driver",
    shortDescription: "Local driver service for errands and delivery support.",
    description:
      "Available for driving tasks, package pickup, and scheduled errands with proof.",
    category: "Home",
    price: 10,
    pricing: "fixed",
    durationMinutes: 60,
    verified: false,
    ratingCount: 2
  },
  {
    id: "svc_human_experience_eval",
    providerId: "h_patricia_tani",
    title: "Human Experience & Behavioral Evaluation",
    shortDescription: "On-site behavior/usability observation with structured notes.",
    description:
      "Observation and assessment with notes, photos, and insight summary.",
    category: "Research",
    price: 125,
    pricing: "fixed",
    durationMinutes: 60,
    verified: true,
    ratingCount: 6
  },
  {
    id: "svc_ai_legal_architecture",
    providerId: "h_jimmy_harris",
    title: "AI Legal Product Architecture & Deployment",
    shortDescription: "Legal workflow AI architecture with governance and reliability.",
    description:
      "Design, validation, and deployment support for legal AI workflows.",
    category: "Tech",
    price: 150,
    pricing: "hourly",
    durationMinutes: 60,
    verified: true,
    ratingCount: 1
  },
  {
    id: "svc_room_layout",
    providerId: "h_alistair_mcr",
    title: "Room layout concept/design",
    shortDescription: "3D layout concept with utility constraints in mind.",
    description:
      "Room layout concepts with practical render directions from constraints.",
    category: "Home",
    price: 250,
    pricing: "hourly",
    durationMinutes: 60,
    verified: false,
    ratingCount: 1
  },
  {
    id: "svc_discord_memes",
    providerId: "h_alistair_mcr",
    title: "Post memes on your discord for a year",
    shortDescription: "Human-operated meme posting and community interaction plan.",
    description:
      "Long-term meme posting stream and active engagement for community health.",
    category: "Writing",
    price: 10000,
    pricing: "fixed",
    durationMinutes: 480,
    verified: false,
    ratingCount: 1
  },
  {
    id: "svc_ai_readiness",
    providerId: "h_humanaios",
    title: "AI Readiness Assessment",
    shortDescription: "Practical AI integration roadmap for real operations.",
    description:
      "Business readiness assessment with Monday-morning action plan.",
    category: "Tech",
    price: 75,
    pricing: "hourly",
    durationMinutes: 56,
    verified: true,
    ratingCount: 9
  },
  {
    id: "svc_market_research",
    providerId: "h_humanaios",
    title: "Research & Analysis",
    shortDescription: "Market research and competitive insight with delivery-ready docs.",
    description:
      "Data synthesis and competitor analysis with concise output and next actions.",
    category: "Research",
    price: 50,
    pricing: "hourly",
    durationMinutes: 58,
    verified: true,
    ratingCount: 4
  },
  {
    id: "svc_grant_business_plan",
    providerId: "h_humanaios",
    title: "Grant Writing & Business Planning",
    shortDescription: "Grant applications and practical business planning support.",
    description:
      "Grant packages and business planning documents with execution checkpoints.",
    category: "Research",
    price: 50,
    pricing: "hourly",
    durationMinutes: 60,
    verified: true,
    ratingCount: 4
  },
  {
    id: "svc_field_verification_krsk",
    providerId: "h_mihail_krsk",
    title: "On-site verification with photo evidence",
    shortDescription: "Physical site check with time/location proof package.",
    description:
      "I visit the location, capture photo/video proof, and deliver structured notes.",
    category: "Research",
    price: 30,
    pricing: "hourly",
    durationMinutes: 90,
    verified: true,
    ratingCount: 8
  },
  {
    id: "svc_recon_austria",
    providerId: "h_andy_pk",
    title: "In-person recon and verification",
    shortDescription: "Field recon in Austria with proof artifacts and summary.",
    description:
      "Multisensory field reports including photos, notes, and structured observations.",
    category: "Research",
    price: 150,
    pricing: "hourly",
    durationMinutes: 120,
    verified: true,
    ratingCount: 10
  },
  {
    id: "svc_hanoi_leadgen",
    providerId: "h_onyx_hanoi",
    title: "Local lead generation support",
    shortDescription: "Prospect list building and first-contact support for campaigns.",
    description:
      "I help source prospects, qualify leads, and support first outreach rounds.",
    category: "Marketing",
    price: 20,
    pricing: "hourly",
    durationMinutes: 90,
    verified: false,
    ratingCount: 2
  },
  {
    id: "svc_llm_eval_pack",
    providerId: "h_priscila_ml",
    title: "LLM Evaluation Pack",
    shortDescription: "Human-in-the-loop model evaluation and benchmark reporting.",
    description:
      "Design eval rubrics, run scorecards, and deliver actionable model quality report.",
    category: "Tech",
    price: 300,
    pricing: "fixed",
    durationMinutes: 180,
    verified: true,
    ratingCount: 14
  },
  {
    id: "svc_vienna_field_ops",
    providerId: "h_diego_woo",
    title: "Field ops in Austria and EU",
    shortDescription: "Pickups, meetings, signing, recon, and local verification tasks.",
    description:
      "Execute urgent local tasks with reliable communication and evidence capture.",
    category: "Delivery",
    price: 55,
    pricing: "hourly",
    durationMinutes: 90,
    verified: true,
    ratingCount: 11
  },
  {
    id: "svc_cargo_coordination",
    providerId: "h_rahmat_pk",
    title: "Cargo and goods transportation coordination",
    shortDescription: "Local transport coordination with handoff verification.",
    description:
      "Coordinate movement of goods with timing updates and confirmation photos.",
    category: "Delivery",
    price: 50,
    pricing: "fixed",
    durationMinutes: 120,
    verified: true,
    ratingCount: 5
  },
  {
    id: "svc_foshan_procurement",
    providerId: "h_kelvin_fung",
    title: "Foshan local procurement",
    shortDescription: "Source products and verify supplier availability locally.",
    description:
      "I perform local supplier checks, price collection, and sample verification.",
    category: "Hiring",
    price: 90,
    pricing: "fixed",
    durationMinutes: 120,
    verified: false,
    ratingCount: 1
  },
  {
    id: "svc_texas_pickups",
    providerId: "h_rob_texas",
    title: "Texas pickups, errands, and verifications",
    shortDescription: "Fast package pickup and local errand execution with proof.",
    description:
      "Coverage around Austin/San Antonio/New Braunfels with timestamped evidence.",
    category: "Delivery",
    price: 55,
    pricing: "hourly",
    durationMinutes: 75,
    verified: true,
    ratingCount: 13
  },
  {
    id: "svc_curitiba_errands",
    providerId: "h_diogo_br",
    title: "Curitiba local errands",
    shortDescription: "Pickup, delivery, and on-site checks in Curitiba area.",
    description:
      "Reliable local operations with short response windows and status updates.",
    category: "Home",
    price: 40,
    pricing: "hourly",
    durationMinutes: 80,
    verified: false,
    ratingCount: 3
  },
  {
    id: "svc_fullstack_fastfix",
    providerId: "h_hexdem_dev",
    title: "Full-stack bug fix sprint",
    shortDescription: "Rapid implementation and bug fixes for web products.",
    description:
      "From backend debugging to UI bugfixing with tested and documented patch sets.",
    category: "Tech",
    price: 25,
    pricing: "hourly",
    durationMinutes: 120,
    verified: true,
    ratingCount: 15
  },
  {
    id: "svc_biz_intro_hanoi",
    providerId: "h_onyx_hanoi",
    title: "Vietnam business intro call",
    shortDescription: "Business development intro and local context briefing.",
    description:
      "I provide market context and warm introductions for local business outreach.",
    category: "Events",
    price: 80,
    pricing: "fixed",
    durationMinutes: 60,
    verified: false,
    ratingCount: 2
  },
  {
    id: "svc_ops_playbook_us",
    providerId: "h_humanaios",
    title: "Operations playbook for AI teams",
    shortDescription: "Hands-on ops design for hybrid AI+human execution teams.",
    description:
      "I deliver an operations playbook with SLA guardrails and failure handling loops.",
    category: "Hiring",
    price: 120,
    pricing: "hourly",
    durationMinutes: 90,
    verified: true,
    ratingCount: 6
  }
];

const categoryOrder: ServiceCategory[] = [
  "Hiring",
  "Research",
  "Companionship",
  "Delivery",
  "Creative",
  "Tech",
  "Writing",
  "Events",
  "Marketing",
  "Home",
  "Other"
];

export function listHumans() {
  return seedHumans;
}

export function listServices() {
  return seedServices;
}

export function listCategories() {
  return categoryOrder;
}

export function getHumanById(id: string) {
  return seedHumans.find((human) => human.id === id) || null;
}

export function getServiceById(id: string) {
  return seedServices.find((service) => service.id === id) || null;
}

export function getServiceWithProvider(id: string) {
  const service = getServiceById(id);
  if (!service) return null;
  const provider = getHumanById(service.providerId);
  if (!provider) return null;
  return { service, provider };
}
