/**
 * Dev seed: catalog + demo providers, listings, bookings and reviews.
 * Destructive — wipes app data first. Refuses to run in production.
 *
 *   pnpm db:seed
 *
 * Demo logins (password: password123)
 *   client@dastaras.dev    — a client with booking history
 *   provider@dastaras.dev  — a provider with listings and incoming requests
 */
import {
  booking,
  bookingEvent,
  category,
  listing,
  providerProfile,
  review,
  service,
  user,
} from "@dastaras/db";
import { bookingTotal, type City } from "@dastaras/shared";
import { avg, count, eq, sql } from "drizzle-orm";
import { auth } from "../auth";
import { db, pool } from "../db";
import { env } from "../env";

if (env.NODE_ENV === "production") throw new Error("Refusing to seed a production database");

const PASSWORD = "password123";

const CATALOG = [
  {
    slug: "cleaning",
    name: "Cleaning",
    icon: "Sparkles",
    description: "Spotless homes and offices, from routine cleans to deep scrubs.",
    services: [
      "General cleaning",
      "Deep cleaning",
      "Carpet & sofa cleaning",
      "Window cleaning",
      "Move-in / move-out cleaning",
    ],
  },
  {
    slug: "plumbing",
    name: "Plumbing",
    icon: "Droplets",
    description: "Leaks, fittings, tanks and everything water.",
    services: ["Leak repair", "Pipe fitting", "Water tank cleaning", "Bathroom fittings"],
  },
  {
    slug: "electrical",
    name: "Electrical",
    icon: "Zap",
    description: "Safe wiring, UPS and solar by experienced electricians.",
    services: [
      "Wiring & repairs",
      "UPS & inverter installation",
      "Fan & light installation",
      "Solar panel installation",
    ],
  },
  {
    slug: "appliance-repair",
    name: "Appliance repair",
    icon: "AirVent",
    description: "AC service, fridges, washing machines and geysers.",
    services: [
      "AC installation & service",
      "Refrigerator repair",
      "Washing machine repair",
      "Geyser repair",
    ],
  },
  {
    slug: "handyman",
    name: "Handyman",
    icon: "Hammer",
    description: "Carpentry, painting, assembly and odd jobs.",
    services: ["Furniture assembly", "Carpentry", "Painting", "Home repairs"],
  },
  {
    slug: "personal-care",
    name: "Personal care",
    icon: "HeartHandshake",
    description: "Trusted help for children, elders, pets and the kitchen.",
    services: ["Childcare", "Elderly care", "Pet care", "Cooking & meal prep"],
  },
  {
    slug: "gardening",
    name: "Gardening",
    icon: "Sprout",
    description: "Lawns, planting and tree care.",
    services: ["Lawn care", "Garden design & planting", "Tree trimming"],
  },
  {
    slug: "home-security",
    name: "Home security",
    icon: "ShieldCheck",
    description: "CCTV, locks and alarm systems installed right.",
    services: ["CCTV installation", "Lock repair & installation", "Alarm systems"],
  },
  {
    slug: "moving",
    name: "Moving & transport",
    icon: "Truck",
    description: "House shifting, furniture moving and drivers on demand.",
    services: ["House shifting", "Furniture moving", "Driver on demand"],
  },
];

type ProviderSeed = {
  name: string;
  email: string;
  city: City;
  headline: string;
  years: number;
  verified: boolean;
  listings: { service: string; title: string; rate: number; area: string; description: string }[];
};

const PROVIDERS: ProviderSeed[] = [
  {
    name: "Imran Qureshi",
    email: "provider@dastaras.dev",
    city: "Lahore",
    headline: "Licensed electrician & solar installer",
    years: 11,
    verified: true,
    listings: [
      {
        service: "Wiring & repairs",
        title: "Home wiring, DB boxes and fault finding",
        rate: 1800,
        area: "DHA Phase 5",
        description:
          "Short circuits, tripping breakers, new points or a full rewire — I diagnose properly and fix it safely. Bring-your-own or I can source genuine Pakistan Cables material at market rate.",
      },
      {
        service: "Solar panel installation",
        title: "On-grid & hybrid solar systems, 3–15 kW",
        rate: 3500,
        area: "DHA Phase 5",
        description:
          "Site survey, load calculation, mounting, inverter setup and net-metering paperwork guidance. 40+ residential installs across Lahore.",
      },
      {
        service: "UPS & inverter installation",
        title: "UPS, inverter and battery installation",
        rate: 1500,
        area: "Gulberg",
        description:
          "Correct sizing for your load, neat wiring and a proper changeover so your fridge and fans stay on during loadshedding.",
      },
    ],
  },
  {
    name: "Ayesha Siddiqui",
    email: "ayesha@dastaras.dev",
    city: "Lahore",
    headline: "Deep-cleaning team lead",
    years: 6,
    verified: true,
    listings: [
      {
        service: "Deep cleaning",
        title: "Full-house deep clean with eco-friendly products",
        rate: 1200,
        area: "Johar Town",
        description:
          "Two-person team, kitchens de-greased, bathrooms de-scaled, fans and switchboards wiped. We bring all supplies and equipment.",
      },
      {
        service: "Move-in / move-out cleaning",
        title: "Move-in / move-out cleaning, empty homes",
        rate: 1400,
        area: "Johar Town",
        description:
          "Get your deposit back or start fresh — cupboards inside and out, windows, floors machine-scrubbed.",
      },
    ],
  },
  {
    name: "Bilal Ahmed",
    email: "bilal@dastaras.dev",
    city: "Karachi",
    headline: "AC technician — split & inverter units",
    years: 9,
    verified: true,
    listings: [
      {
        service: "AC installation & service",
        title: "AC service, gas refill & installation",
        rate: 2000,
        area: "Gulshan-e-Iqbal",
        description:
          "Jet-wash service, gas pressure check and refill, PCB diagnosis for inverter ACs. Installation with proper copper piping and bracket.",
      },
      {
        service: "Refrigerator repair",
        title: "Fridge & deep-freezer repair at home",
        rate: 1600,
        area: "Gulshan-e-Iqbal",
        description:
          "Not cooling, compressor issues, thermostat and gas leaks — most repairs done on the first visit.",
      },
    ],
  },
  {
    name: "Sana Malik",
    email: "sana@dastaras.dev",
    city: "Islamabad",
    headline: "Early-years educator & babysitter",
    years: 5,
    verified: true,
    listings: [
      {
        service: "Childcare",
        title: "Experienced babysitter for evenings & weekends",
        rate: 900,
        area: "F-10",
        description:
          "Montessori-trained, first-aid certified. Homework help, bedtime routines and screen-free play for ages 2–10.",
      },
    ],
  },
  {
    name: "Usman Tariq",
    email: "usman@dastaras.dev",
    city: "Rawalpindi",
    headline: "Plumber, 12 years on the tools",
    years: 12,
    verified: false,
    listings: [
      {
        service: "Leak repair",
        title: "Leak detection & repair — walls, roofs, taps",
        rate: 1300,
        area: "Bahria Town",
        description:
          "Seepage in walls, dripping mixers, running commodes. Moisture meter for hidden leaks so we don't break more tiles than needed.",
      },
      {
        service: "Water tank cleaning",
        title: "Underground & overhead tank cleaning",
        rate: 1100,
        area: "Bahria Town",
        description: "Drain, scrub, disinfect and refill. Photos before and after.",
      },
    ],
  },
  {
    name: "Hamza Farooq",
    email: "hamza@dastaras.dev",
    city: "Karachi",
    headline: "Carpenter & furniture fitter",
    years: 8,
    verified: true,
    listings: [
      {
        service: "Carpentry",
        title: "Custom carpentry, door & cabinet repair",
        rate: 1500,
        area: "Clifton",
        description:
          "Sticking doors, broken hinges, kitchen cabinet refits, wardrobes built to measure.",
      },
      {
        service: "Furniture assembly",
        title: "IKEA-style & imported furniture assembly",
        rate: 1000,
        area: "Clifton",
        description: "Beds, wardrobes, desks — assembled square and wall-anchored where needed.",
      },
    ],
  },
  {
    name: "Nadia Hussain",
    email: "nadia@dastaras.dev",
    city: "Lahore",
    headline: "Home chef — desi & continental",
    years: 7,
    verified: false,
    listings: [
      {
        service: "Cooking & meal prep",
        title: "Weekly meal prep & dawat cooking",
        rate: 1100,
        area: "Model Town",
        description:
          "Batch-cook a week of healthy meals, or let me handle the menu for your next dawat of up to 30 guests.",
      },
    ],
  },
  {
    name: "Kashif Mehmood",
    email: "kashif@dastaras.dev",
    city: "Islamabad",
    headline: "CCTV & smart-lock installer",
    years: 10,
    verified: true,
    listings: [
      {
        service: "CCTV installation",
        title: "HD CCTV with mobile viewing",
        rate: 2200,
        area: "G-11",
        description:
          "Hikvision/Dahua 2–16 camera systems, DVR/NVR setup, and remote viewing on your phone — cabling concealed neatly.",
      },
      {
        service: "Lock repair & installation",
        title: "Digital & smart door lock installation",
        rate: 1400,
        area: "G-11",
        description:
          "Fingerprint and PIN locks fitted on wooden or metal doors, plus traditional lock repair.",
      },
    ],
  },
  {
    name: "Faisal Iqbal",
    email: "faisal@dastaras.dev",
    city: "Lahore",
    headline: "Painter — interiors & exteriors",
    years: 14,
    verified: true,
    listings: [
      {
        service: "Painting",
        title: "Interior painting with putty & primer",
        rate: 1250,
        area: "Bahria Town",
        description:
          "Surface prep done right: scraping, putty, sanding, primer and two coats. Furniture covered and floors protected.",
      },
    ],
  },
  {
    name: "Rabia Khan",
    email: "rabia@dastaras.dev",
    city: "Karachi",
    headline: "Elderly-care attendant",
    years: 4,
    verified: false,
    listings: [
      {
        service: "Elderly care",
        title: "Compassionate day-care for elders",
        rate: 850,
        area: "PECHS",
        description:
          "Medication reminders, mobility support, meals and good company. Trained in basic nursing care.",
      },
    ],
  },
  {
    name: "Zain Abbas",
    email: "zain@dastaras.dev",
    city: "Rawalpindi",
    headline: "Movers with own Shehzore",
    years: 6,
    verified: true,
    listings: [
      {
        service: "House shifting",
        title: "Complete house shifting with packing",
        rate: 3000,
        area: "Saddar",
        description:
          "Team of four, bubble wrap and cartons included, furniture dismantled and reassembled at the new place.",
      },
    ],
  },
  {
    name: "Mariam Shah",
    email: "mariam@dastaras.dev",
    city: "Islamabad",
    headline: "Garden designer",
    years: 9,
    verified: true,
    listings: [
      {
        service: "Garden design & planting",
        title: "Garden makeovers & seasonal planting",
        rate: 1600,
        area: "E-7",
        description:
          "From a bare lawn to a planted garden: soil prep, native plants, drip irrigation and a care plan.",
      },
      {
        service: "Lawn care",
        title: "Monthly lawn care & mowing",
        rate: 800,
        area: "E-7",
        description: "Mowing, edging, fertilising and weeding on a regular schedule.",
      },
    ],
  },
];

const CLIENTS = [
  { name: "Midhat Karim", email: "client@dastaras.dev" },
  { name: "Omar Rashid", email: "omar@dastaras.dev" },
  { name: "Hira Aslam", email: "hira@dastaras.dev" },
  { name: "Ali Raza", email: "ali@dastaras.dev" },
];

const COMMENTS = [
  "Arrived on time and was very professional. Would book again.",
  "Great work, left the place cleaner than they found it.",
  "Explained the problem clearly and fixed it quickly.",
  "Fair price and excellent quality. Highly recommended!",
  "Good job overall, slightly late but called ahead.",
  "Very polite and careful with our furniture.",
  "Solved an issue two other people couldn't. Thank you!",
];

// Tiny deterministic PRNG so the seed is reproducible.
let s = 42;
const rand = () => (s = (s * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32;
const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)]!;

async function signUp(name: string, email: string, role: "client" | "provider") {
  const res = await auth.api.signUpEmail({ body: { name, email, password: PASSWORD, role } });
  return res.user.id;
}

async function main() {
  console.log("↺ wiping app data");
  await db.execute(
    sql`truncate table review, booking_event, booking, listing, provider_profile, service, category, session, account, verification, "user" restart identity cascade`,
  );

  console.log("◆ catalog");
  const serviceIds = new Map<string, number>();
  for (const [i, c] of CATALOG.entries()) {
    const [cat] = await db
      .insert(category)
      .values({
        slug: c.slug,
        name: c.name,
        icon: c.icon,
        description: c.description,
        sortOrder: i,
      })
      .returning();
    const rows = await db
      .insert(service)
      .values(
        c.services.map((name) => ({
          categoryId: cat!.id,
          name,
          slug: name
            .toLowerCase()
            .replace(/&/g, "and")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, ""),
        })),
      )
      .returning();
    for (const r of rows) serviceIds.set(r.name, r.id);
  }

  console.log("◆ users");
  const clientIds = [];
  for (const c of CLIENTS) clientIds.push(await signUp(c.name, c.email, "client"));

  const listingRows: { id: string; providerId: string; rate: number }[] = [];
  for (const p of PROVIDERS) {
    const id = await signUp(p.name, p.email, "provider");
    await db
      .update(providerProfile)
      .set({
        headline: p.headline,
        city: p.city,
        yearsExperience: p.years,
        verified: p.verified,
        bio: `${p.headline} based in ${p.city}. ${p.years} years of experience serving homes across the city.`,
      })
      .where(eq(providerProfile.userId, id));
    await db.update(user).set({ emailVerified: true }).where(eq(user.id, id));
    for (const l of p.listings) {
      const serviceId = serviceIds.get(l.service);
      if (!serviceId) throw new Error(`Unknown service ${l.service}`);
      const [row] = await db
        .insert(listing)
        .values({
          providerId: id,
          serviceId,
          title: l.title,
          description: l.description,
          hourlyRate: l.rate,
          city: p.city,
          area: l.area,
        })
        .returning();
      listingRows.push({ id: row!.id, providerId: id, rate: l.rate });
    }
  }

  console.log("◆ booking history & reviews");
  const DAY = 86_400_000;
  for (const l of listingRows) {
    const n = 2 + Math.floor(rand() * 6);
    for (let i = 0; i < n; i++) {
      const clientId = pick(clientIds);
      const hours = 1 + Math.floor(rand() * 4);
      const when = new Date(Date.now() - (5 + Math.floor(rand() * 120)) * DAY);
      when.setHours(9 + Math.floor(rand() * 8), 0, 0, 0);
      const [b] = await db
        .insert(booking)
        .values({
          listingId: l.id,
          clientId,
          providerId: l.providerId,
          status: "completed",
          scheduledAt: when,
          durationHours: hours,
          hourlyRate: l.rate,
          totalAmount: bookingTotal(l.rate, hours),
          address: "House 12, Street 4, demo address",
        })
        .returning();
      await db.insert(bookingEvent).values([
        {
          bookingId: b!.id,
          actorId: clientId,
          fromStatus: null,
          toStatus: "pending",
          createdAt: new Date(when.getTime() - 2 * DAY),
        },
        {
          bookingId: b!.id,
          actorId: l.providerId,
          fromStatus: "pending",
          toStatus: "accepted",
          createdAt: new Date(when.getTime() - DAY),
        },
        {
          bookingId: b!.id,
          actorId: l.providerId,
          fromStatus: "accepted",
          toStatus: "in_progress",
          createdAt: when,
        },
        {
          bookingId: b!.id,
          actorId: l.providerId,
          fromStatus: "in_progress",
          toStatus: "completed",
          createdAt: new Date(when.getTime() + hours * 3_600_000),
        },
      ]);
      if (rand() < 0.85) {
        await db.insert(review).values({
          bookingId: b!.id,
          listingId: l.id,
          reviewerId: clientId,
          providerId: l.providerId,
          rating: rand() < 0.7 ? 5 : rand() < 0.8 ? 4 : 3,
          comment: pick(COMMENTS),
          createdAt: new Date(when.getTime() + DAY),
        });
      }
    }
    const [agg] = await db
      .select({ avg: avg(review.rating), n: count() })
      .from(review)
      .where(eq(review.listingId, l.id));
    await db
      .update(listing)
      .set({ ratingAvg: Number(agg?.avg ?? 0), ratingCount: agg?.n ?? 0 })
      .where(eq(listing.id, l.id));
  }

  // Give the demo provider a couple of live requests to act on.
  const demoProvider = listingRows[0]!;
  const demoClient = clientIds[0]!;
  for (const [daysAhead, status] of [
    [2, "pending"],
    [4, "pending"],
    [6, "accepted"],
  ] as const) {
    const when = new Date(Date.now() + daysAhead * DAY);
    when.setHours(11, 0, 0, 0);
    const [b] = await db
      .insert(booking)
      .values({
        listingId: demoProvider.id,
        clientId: demoClient,
        providerId: demoProvider.providerId,
        status,
        scheduledAt: when,
        durationHours: 2,
        hourlyRate: demoProvider.rate,
        totalAmount: bookingTotal(demoProvider.rate, 2),
        address: "House 45-B, Block C, DHA Phase 5, Lahore",
        notes: "Main breaker trips when the AC and iron run together.",
      })
      .returning();
    await db
      .insert(bookingEvent)
      .values({ bookingId: b!.id, actorId: demoClient, fromStatus: null, toStatus: "pending" });
    if (status === "accepted")
      await db.insert(bookingEvent).values({
        bookingId: b!.id,
        actorId: demoProvider.providerId,
        fromStatus: "pending",
        toStatus: "accepted",
      });
  }

  console.log(
    `✔ seeded ${CATALOG.length} categories, ${serviceIds.size} services, ${PROVIDERS.length} providers, ${listingRows.length} listings`,
  );
  console.log(
    "  demo logins → client@dastaras.dev / provider@dastaras.dev  (password: password123)",
  );
}

await main();
await pool.end();
