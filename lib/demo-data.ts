// Demo data for the Proofly MVP frontend. None of this is connected to a database.
// It exists so the UI is inspectable end-to-end before Supabase is wired.

import type { LucideIcon } from "lucide-react";
import {
  Inbox,
  MousePointerClick,
  ShieldCheck,
  Sparkles,
  Wand2,
  Globe2,
  Quote,
  type LucideIcon as _LucideIcon,
} from "lucide-react";

export type TestimonialStatus = "pending" | "approved" | "rejected" | "hidden";

export interface Testimonial {
  id: string;
  authorName: string;
  authorEmail: string;
  authorRole?: string;
  authorCompany?: string;
  content: string;
  status: TestimonialStatus;
  featured: boolean;
  helpfulCount: number;
  createdAt: string; // ISO
}

export interface Project {
  id: string;
  slug: string;
  name: string;
  description: string;
  ctaLabel?: string;
  ctaUrl?: string;
  /**
   * Whether the wall is publicly visible. Demo fixtures are published; a
   * database-backed project reports its real `is_published` value.
   */
  isPublished?: boolean;
  createdAt: string;
  counts: {
    submitted: number;
    approved: number;
    pending: number;
    rejected: number;
  };
}

export interface DashboardSummary {
  totalProjects: number;
  totalApproved: number;
  totalPending: number;
  viewsLast7Days: number;
}

const now = () => new Date().toISOString();
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

export const DEMO_USER = {
  name: "Avery Chen",
  email: "avery@proofly.demo",
  workspace: "Avery's Workspace",
};

export const DEMO_PROJECTS: Project[] = [
  {
    id: "p_atlas",
    slug: "atlas-launch",
    name: "Atlas v2 launch",
    description: "Customer reactions from the Atlas v2 launch announcements.",
    ctaLabel: "Try Atlas free",
    ctaUrl: "https://example.com/atlas",
    isPublished: true,
    createdAt: daysAgo(28),
    counts: { submitted: 24, approved: 17, pending: 4, rejected: 3 },
  },
  {
    id: "p_acme",
    slug: "acme-customer-stories",
    name: "Acme customer stories",
    description: "Long-form case-study quotes from enterprise design partners.",
    isPublished: true,
    createdAt: daysAgo(14),
    counts: { submitted: 9, approved: 6, pending: 2, rejected: 1 },
  },
  {
    id: "p_agency",
    slug: "studio-porter",
    name: "Studio Porter portfolio",
    description: "Public wall for Studio Porter — selected client quotes.",
    isPublished: true,
    createdAt: daysAgo(5),
    counts: { submitted: 3, approved: 1, pending: 2, rejected: 0 },
  },
];

export const DEMO_TESTIMONIALS_BY_PROJECT: Record<string, Testimonial[]> = {
  p_atlas: [
    {
      id: "t1",
      authorName: "Maya Okafor",
      authorEmail: "maya@designworks.demo",
      authorRole: "Head of Design",
      authorCompany: "Designworks",
      content:
        "Atlas cut our review cycle from two days to twenty minutes. The moderation flow is the first one I've actually enjoyed using.",
      status: "pending",
      featured: false,
      helpfulCount: 0,
      createdAt: daysAgo(0),
    },
    {
      id: "t2",
      authorName: "Jordan Park",
      authorEmail: "j@northbeam.demo",
      authorRole: "Engineering Manager",
      authorCompany: "Northbeam",
      content:
        "We embedded the public wall on our marketing site the same hour we created it. Zero engineering effort, and it looks native.",
      status: "pending",
      featured: false,
      helpfulCount: 0,
      createdAt: daysAgo(0),
    },
    {
      id: "t3",
      authorName: "Priya Raman",
      authorEmail: "priya@loomcraft.demo",
      authorRole: "Founder",
      authorCompany: "Loomcraft",
      content:
        "I asked twelve customers for testimonials on a Monday and had eight published by Friday. Proofly turned a chore into a single afternoon.",
      status: "approved",
      featured: true,
      helpfulCount: 42,
      createdAt: daysAgo(2),
    },
    {
      id: "t4",
      authorName: "Diego Alvarez",
      authorEmail: "d@arclight.demo",
      authorRole: "CTO",
      authorCompany: "Arclight",
      content:
        "The row-level security model is exactly right. Our data isolation is enforced at the database, not in our app code.",
      status: "approved",
      featured: true,
      helpfulCount: 31,
      createdAt: daysAgo(3),
    },
    {
      id: "t5",
      authorName: "Sara Lindqvist",
      authorEmail: "sara@helio.demo",
      authorRole: "PM",
      authorCompany: "Helio",
      content: "Loved the speed of the public wall. Lighthouse score is excellent.",
      status: "approved",
      featured: false,
      helpfulCount: 12,
      createdAt: daysAgo(4),
    },
    {
      id: "t6",
      authorName: "Anonymous",
      authorEmail: "anon@example.demo",
      content: "I tried to submit spam. The honeypot caught me. Nice.",
      status: "rejected",
      featured: false,
      helpfulCount: 0,
      createdAt: daysAgo(5),
    },
    {
      id: "t7",
      authorName: "Kenji Watanabe",
      authorEmail: "k@quartz.demo",
      authorRole: "Marketing Lead",
      authorCompany: "Quartz",
      content: "I want to see a video testimonial feature next quarter.",
      status: "pending",
      featured: false,
      helpfulCount: 0,
      createdAt: daysAgo(0),
    },
    {
      id: "t8",
      authorName: "Lina Haddad",
      authorEmail: "lina@bloom.demo",
      authorRole: "Customer Success",
      authorCompany: "Bloom",
      content:
        "I asked for testimonials in a single Slack message and the response rate doubled compared with our old form.",
      status: "approved",
      featured: false,
      helpfulCount: 9,
      createdAt: daysAgo(6),
    },
  ],
  p_acme: [
    {
      id: "t9",
      authorName: "Marco Reyes",
      authorEmail: "marco@acme.demo",
      authorRole: "VP of Sales",
      authorCompany: "Acme",
      content: "We piloted Atlas with our top ten accounts. Nine renewed.",
      status: "approved",
      featured: true,
      helpfulCount: 18,
      createdAt: daysAgo(7),
    },
    {
      id: "t10",
      authorName: "Hannah Goldberg",
      authorEmail: "hannah@acme.demo",
      authorRole: "Director of Ops",
      authorCompany: "Acme",
      content: "Rollout was painless. The internal admin tools are the cleanest I've used.",
      status: "approved",
      featured: false,
      helpfulCount: 7,
      createdAt: daysAgo(9),
    },
    {
      id: "t11",
      authorName: "Sam Briggs",
      authorEmail: "sam@acme.demo",
      content: "Could you add a Slack notifier for new submissions?",
      status: "pending",
      featured: false,
      helpfulCount: 0,
      createdAt: daysAgo(1),
    },
  ],
  p_agency: [
    {
      id: "t12",
      authorName: "Wendy Park",
      authorEmail: "wendy@porter.demo",
      authorRole: "Studio Director",
      authorCompany: "Studio Porter",
      content: "We use this wall as our portfolio's social proof. Clean and fast.",
      status: "approved",
      featured: true,
      helpfulCount: 5,
      createdAt: daysAgo(4),
    },
    {
      id: "t13",
      authorName: "Theo Bauer",
      authorEmail: "theo@bauerhaus.demo",
      content: "I'd love to embed this in our agency site directly.",
      status: "pending",
      featured: false,
      helpfulCount: 0,
      createdAt: daysAgo(1),
    },
  ],
};

export const DEMO_DASHBOARD_SUMMARY: DashboardSummary = {
  totalProjects: DEMO_PROJECTS.length,
  totalApproved: DEMO_PROJECTS.reduce((acc, p) => acc + p.counts.approved, 0),
  totalPending: DEMO_PROJECTS.reduce((acc, p) => acc + p.counts.pending, 0),
  viewsLast7Days: 1842,
};

export const FEATURE_HIGHLIGHTS: { title: string; description: string; icon: LucideIcon }[] = [
  {
    title: "One link, every channel",
    description: "Send a single collection link and let customers submit in under a minute.",
    icon: MousePointerClick,
  },
  {
    title: "Moderate before publish",
    description: "Approve, reject, feature, or hide — your wall only shows what you choose.",
    icon: ShieldCheck,
  },
  {
    title: "Beautiful public walls",
    description: "Server-rendered for SEO, fast on every device, embeddable anywhere.",
    icon: Sparkles,
  },
  {
    title: "Multi-tenant by design",
    description: "Row-level security at the database. Your data is yours, isolated by default.",
    icon: Globe2,
  },
  {
    title: "Built for the next video",
    description: "Capture recorded video testimonials in the browser — coming soon.",
    icon: Wand2,
  },
  {
    title: "Quote-friendly output",
    description: "Export approved testimonials as copy-ready blocks for your marketing site.",
    icon: Quote,
  },
];

export const PRICING_TIERS = [
  {
    name: "Free",
    price: "$0",
    cadence: "forever",
    blurb: "For solo founders publishing their first wall.",
    features: ["1 wall", "25 approved testimonials", "Public wall with default theme", "Email support"],
    cta: "Start free",
    href: "/signup",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$19",
    cadence: "/ month",
    blurb: "For growing teams that need more walls and more reach.",
    features: [
      "Unlimited walls",
      "Unlimited testimonials",
      "Embed widget (P1)",
      "Wall-level analytics (P1)",
      "Priority support",
    ],
    cta: "Start Pro trial",
    href: "/signup?plan=pro",
    highlighted: true,
  },
  {
    name: "Team",
    price: "Custom",
    cadence: "",
    blurb: "For agencies and marketing teams running many workspaces.",
    features: ["SSO & SAML", "Audit log", "Custom branding", "Dedicated success manager"],
    cta: "Contact sales",
    href: "mailto:sales@proofly.demo",
    highlighted: false,
  },
];

export const FAQS = [
  {
    q: "Is this real, or just a demo?",
    a: "Both. With a Supabase project connected, your walls and testimonials are stored per account and enforced by database row-level security. Without one, the app runs in demo mode with sample data so you can review the design.",
  },
  {
    q: "When I sign up, does anything actually happen?",
    a: "Yes. Your account is created in Supabase Auth, and a profile row is created for you automatically. Walls you create belong only to you — enforced at the database, not in application code.",
  },
  {
    q: "Will my testimonials be public?",
    a: "Only those you approve. The public wall renders approved entries; pending and rejected entries are private to your dashboard.",
  },
  {
    q: "Can I embed the wall on my own site?",
    a: "Embedding via iframe is on the roadmap. Right now the public wall is viewable at its own URL.",
  },
];
