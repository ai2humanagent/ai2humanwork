export type RentHuman = {
  id: string;
  name: string;
  headline: string;
  location: string;
  countryCode: string;
  bio: string;
  ratePerHour: number;
  views: number;
  tags: string[];
  skills: string[];
  languages: string[];
  email?: string;
  verified?: boolean;
  available?: boolean;
  avatarSeed: number;
  mode?: "detail" | "profile";
  about?: string;
};

export const rentHumans: RentHuman[] = [
  {
    id: "NRtarPz79FvY8r61uVcr",
    name: "Nick Barreira",
    headline: "bartender, writer, & editor.",
    location: "Atlanta, GA, US",
    countryCode: "US",
    bio: "Marketing-focused Content Writer and Editor with technical-writing depth and strong digital publishing execution.",
    ratePerHour: 50,
    views: 1682,
    tags: ["Copy Writing", "Copy Editing", "Marketing"],
    skills: ["Copy Writing", "Copy Editing", "Marketing", "Sales"],
    languages: ["English"],
    email: "nwbarreira@gmail.com",
    verified: true,
    available: true,
    avatarSeed: 1,
    mode: "detail",
    about:
      "Marketing-focused Content Writer and Editor with a technical-writing foundation and a talent for clear, persuasive content. Over a decade in high-volume hospitality sharpened client empathy, communication, and delivery discipline. Skilled in copywriting, content strategy, social media engagement, and translating complexity into practical narratives."
  },
  {
    id: "yLw1guaJW9UU4lo8G7wU",
    name: "kris ming",
    headline: "what you do",
    location: "shanghai, CN",
    countryCode: "CN",
    bio: "no bio",
    ratePerHour: 50,
    views: 110,
    tags: ["writing"],
    skills: ["writing"],
    languages: ["English", "Chinese (Mandarin)"],
    email: "ritsuyan4763@gmail.com",
    verified: false,
    available: true,
    avatarSeed: 2,
    mode: "profile",
    about: "available for AI fallback tasks in Shanghai and remote ops."
  },
  {
    id: "S9zM7qvSYpvRYNokyYIk",
    name: "Sane10. Gsurf",
    headline: "inversor",
    location: "Valencia, Carabobo, VE",
    countryCode: "VE",
    bio: "surfista trader e inversor",
    ratePerHour: 50,
    views: 10,
    tags: ["Tengo la hab..."],
    skills: ["Trading", "Research"],
    languages: ["Spanish"],
    available: true,
    avatarSeed: 3
  },
  {
    id: "oK4e9YwQf1JgKk8fV3mT",
    name: "walter Luiz Alves De ...",
    headline: "Aposentado por invalidez permwnente",
    location: "BR",
    countryCode: "BR",
    bio: "no bio",
    ratePerHour: 50,
    views: 1396,
    tags: [],
    skills: ["Local tasks"],
    languages: ["Portuguese"],
    verified: true,
    available: true,
    avatarSeed: 4
  },
  {
    id: "f9a7b856-ec1f-4435-8fa0-1f6788c0c033",
    name: "Stephanie Gardner",
    headline: "I am a wealth of knowledge and possess ...",
    location: "Phoenix, AZ, US",
    countryCode: "US",
    bio: "AI ops and support",
    ratePerHour: 55,
    views: 726,
    tags: ["support", "virtual assistant"],
    skills: ["Support", "Operations"],
    languages: ["English"],
    available: true,
    avatarSeed: 5
  },
  {
    id: "qV7sM2aP4dT9fJ8kN1cR",
    name: "JAGDEEP SINGH DHAKA",
    headline: "20 years experience in Procurement ...",
    location: "Delhi, IN",
    countryCode: "IN",
    bio: "procurement and sourcing",
    ratePerHour: 40,
    views: 680,
    tags: ["Procurement", "Sourcing"],
    skills: ["Procurement", "Logistics"],
    languages: ["English", "Hindi"],
    available: true,
    avatarSeed: 6
  },
  {
    id: "kM7tP0wQ2gF4aS9dL5zX",
    name: "David Herrera",
    headline: "Helping AI's complete their tasks",
    location: "Mexico City, MX",
    countryCode: "MX",
    bio: "onsite and remote fulfillment",
    ratePerHour: 60,
    views: 1903,
    tags: ["verification", "delivery", "support"],
    skills: ["Field Ops", "Delivery", "Verification"],
    languages: ["Spanish", "English"],
    verified: true,
    available: true,
    avatarSeed: 7
  },
  {
    id: "A3yN0wP7kL5mQ8rT1zXc",
    name: "Alejandro M",
    headline: "On-site verification specialist",
    location: "Madrid, ES",
    countryCode: "ES",
    bio: "photo + timestamp + receipt workflows",
    ratePerHour: 65,
    views: 884,
    tags: ["verification", "photos"],
    skills: ["Verification", "Retail checks"],
    languages: ["Spanish", "English"],
    available: true,
    avatarSeed: 8
  }
];

export function getHumanById(id: string): RentHuman | undefined {
  return rentHumans.find((human) => human.id === id);
}
