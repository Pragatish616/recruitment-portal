// Current Date
import {
  ManageAccounts,
  Trophy,
  Campaign,
  ConnectWithoutContact,
  DesignServices,
  Palette,
  Language,
  Mobile2,
  SportsEsports,
  Analytics,
  Hub,
  Link,
  Cloud,
} from "@material-symbols-svg/react/outlined";

// Recruitment deadline (single source of truth)
// Previously hardcoded separately in both the submit-form API route and
// CountdownTimer's default prop as "2026-08-23", a date already in the past.
// Both now import this constant instead, and it is overridable via env so a
// live deadline extension doesn't require touching code.
export const APPLICATION_DEADLINE =
  process.env.NEXT_PUBLIC_APPLICATION_DEADLINE || "2026-12-31T23:59:59+05:30";

// Single source of truth for the shared "why join" question key, used to
// read/write the same Questions map entry from FormComp (client) and
// submit-form (server validation) without risking the two copies drifting.
export const JOIN_QUESTION = "Why do you want to join Organization Name?";

export const curDay = new Date().getDay();
export const curYear = new Date().getFullYear();
export const curDate = new Date().getDate();
export const curMonth = new Date().getMonth();
export const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// Contact Links
export const LINKS = {
  instagram: "#",
  discord: "#",
  gmail: "#",
  linkedin: "#",
  x: "#",
};

// Department Details
//
// Names/descriptions here match the ones from two unused, now-deleted
// constants (technicalCards/nonTechnicalCards) that carried real English
// copy for these same department ids but were never wired into any page --
// these `reviews` entries had scrambled placeholder text instead. Restored
// by id (verified 1:1, all 12 accounted for). One technicalCards entry
// ("Open Source") pointed at an id that doesn't exist among these 12 and
// its icon asset didn't exist either, so it isn't represented here.
//
// `category` groups departments into the two sections shown on
// /departments ("Technical" / "Non-Technical").
export const reviews = [
  {
      id: "c21ca066-ab4d-40a3-943c-f170d6312bdc",
      icon: ManageAccounts,
      tone: "#8ab4f8",
      name: "Management",
      description: "The backbone of the organization, turning vision into reality by planning, executing, and improvising. Oversees events, operations, and growth, ensuring smooth functioning, success, and impactful experiences.",
      category: "non-technical",
    },
    {
      id: "4499a966-2740-4c36-88dd-8916a909fc77",
      icon: Campaign,
      tone: "#FF7A6B",
      name: "Publicity",
      description: "Drives online presence with creative campaigns, video editing, and storytelling, boosting engagement, promoting events, and showcasing the club to inspire participation and community growth.",
      category: "non-technical",
    },
    {
      id: "3936d5a2-acd9-4a98-ac97-42c2c92f5c02",
      icon: ConnectWithoutContact,
      tone: "#FFD45E",
      name: "Outreach",
      description: "Builds partnerships and expands outreach by connecting with communities, sponsors, and collaborators, ensuring diverse opportunities and impactful collaborations both within and beyond campus.",
      category: "non-technical",
    },
    {
      id: "e2ed9c2c-c36c-457f-a8bb-cf2e8bc7c2e1",
      icon: DesignServices,
      tone: "#FF7A6B",
      name: "UI/UX",
      description: "Designs visually appealing, user-friendly digital interfaces with a focus on accessibility, usability, and aesthetics, ensuring products provide enjoyable, intuitive, and meaningful user experiences.",
      category: "technical",
    },
    {
      id: "d3beefc1-f8b0-4202-b26c-36e9804b6636",
      icon: Palette,
      tone: "#FFD45E",
      name: "Design",
      description: "Creates stunning visuals, event posters, and branding materials that capture the organization's identity, ensuring every design communicates creativity, professionalism, and excitement to engage the community.",
      category: "non-technical",
    },
    {
      id: "8143de1d-db17-42fa-958d-13b10804f894",
      icon: Language,
      tone: "#8AB4F8",
      name: "Web Development",
      description: "Designs, develops, and maintains responsive, high-performance websites for projects and events, using modern web technologies to enhance accessibility, user experience, and community engagement online.",
      category: "technical",
    },
    {
      id: "339f0f8a-72f2-44b9-92ab-2b0d4dcfa0f6",
      icon: Mobile2,
      tone: "#6EE7A0",
      name: "App Development",
      description: "Builds intuitive, impactful mobile applications, improving accessibility, interaction, and convenience for members and event participants through functional, user-focused design.",
      category: "technical",
    },
    {
      id: "9055864f-c7dc-44cd-91d5-8759d32a496a",
      icon: SportsEsports,
      tone: "#FF7A6B",
      name: "Game Development",
      description: "Combines creativity and technical skills to design engaging, entertaining games, giving members hands-on experience with real-world game development tools, engines, and production workflows.",
      category: "technical",
    },
    {
      id: "c0f3b1d1-ce05-45f6-9e34-ac9443fc5fcb",
      icon: Analytics,
      tone: "#8AB4F8",
      name: "Data Science",
      description: "Applies AI, machine learning, and analytics to transform data into actionable insights, helping solve problems, build predictive models, and inspire innovation across projects.",
      category: "technical",
    },
    {
      id: "a1d920df-9eb9-49eb-b3a4-e4a3d1245ede",
      icon: Cloud,
      tone: "#FFD45E",
      name: "Cloud & DevOps",
      description: "Explores cloud computing, infrastructure, and automation by building scalable applications, hosting hands-on workshops, and educating members about cloud platforms, containerization, CI/CD pipelines, and DevOps practices.",
      category: "technical",
    },
    {
      id: "6a89c4e2-7b19-4f32-821e-9821a41b5201",
      icon: Hub,
      tone: "#FF7A6B",
      name: "Blockchain",
      description: "Explores decentralized apps, smart contracts, and Web3 development, giving members hands-on experience with blockchain protocols and tools.",
      category: "technical",
    },
    {
      id: "3e9ac635-01d4-495e-aa87-a7335a2403c2",
      icon: Trophy,
      tone: "#6EE7A0",
      name: "Competitive Programming",
      description: "Promotes problem-solving skills through coding contests, hackathons, and peer learning, helping members sharpen algorithms, logic, and efficiency while preparing for real-world tech challenges.",
      category: "technical",
    },
];

// Questionnaire Data
//
// `department` keys match `reviews[].name` above by id (see that comment)
// so FormComp can look up the right question set per department.
export const QuestionnaireData = [
  {
    department: "App Development",
    questions: [
      {
        name: "Which mobile app frameworks or languages have you worked with?",
        type: "generic",
        placeholder: "e.g., Flutter, React Native, Kotlin, Swift, or none yet"
      },
      {
        name: "Describe an app or project you've built or contributed to, even a small one. What did it do and what was your role?",
        type: "long-text",
        placeholder: "What it did, the tech you used, and what you're proudest of"
      },
      {
        name: "How comfortable are you with version control and collaborative workflows (e.g. Git, GitHub, code reviews)?",
        type: "generic",
        placeholder: "e.g., Beginner, comfortable with basics, confident with branching and PRs"
      },
      {
        name: "Describe a bug you struggled with and how you eventually solved it.",
        type: "generic",
        placeholder: "What the bug was, how you debugged it, and what fixed it"
      },
      {
        name: "If you could build one app for this club, what would it do and why?",
        type: "long-text",
        placeholder: "Your idea and the problem it solves"
      }
    ],
  },
  {
    department: "Blockchain",
    questions: [
      {
        name: "What draws you to blockchain and Web3 development? What have you explored so far (smart contracts, DeFi, NFTs, etc.)?",
        type: "long-text",
        placeholder: "Your interest area and any hands-on exposure so far"
      },
      {
        name: "Describe any blockchain project, tutorial, or smart contract you've built or experimented with, even a simple one.",
        type: "long-text",
        placeholder: "What you built, the chain/language used (e.g. Solidity, Rust), and what you learned"
      },
      {
        name: "Link to any relevant GitHub repo, project, or write-up (optional).",
        type: "short-text",
        placeholder: "GitHub link or portfolio URL"
      },
      {
        name: "How do you usually learn a new technical concept when there's no one around to ask?",
        type: "long-text",
        placeholder: "Your approach to self-directed learning"
      }
    ],
  },
  {
    department: "Cloud & DevOps",
    questions: [
      {
        name: "Years of experience with cloud platforms or DevOps tooling.",
        type: "short-text",
        placeholder: "e.g., None yet, under 1 year, 1-2 years"
      },
      {
        name: "Which cloud platforms or tools have you used or explored (e.g. AWS, GCP, Azure, Docker, Kubernetes, CI/CD pipelines)?",
        type: "generic",
        placeholder: "e.g., AWS, Docker, GitHub Actions, Kubernetes"
      },
      {
        name: "Describe a time you set up, deployed, or automated something end-to-end (a pipeline, a server, a containerized app).",
        type: "long-text",
        placeholder: "What you set up, the tools involved, and what problem it solved"
      },
      {
        name: "What interests you about cloud infrastructure and automation over other areas of development?",
        type: "long-text",
        placeholder: "What draws you to this space specifically"
      }
    ],
  },
  {
    department: "Competitive Programming",
    questions: [
      {
        name: "Codeforces handle (if any).",
        type: "short-text",
        placeholder: "e.g., tourist"
      },
      {
        name: "LeetCode or CodeChef handle (if any).",
        type: "short-text",
        placeholder: "Your profile username"
      },
      {
        name: "Highest contest rating achieved (any platform).",
        type: "short-text",
        placeholder: "e.g., 1500 on Codeforces"
      },
      {
        name: "Preferred programming language for contests.",
        type: "short-text",
        placeholder: "e.g., C++, Python"
      },
      {
        name: "Share links to your competitive programming profiles.",
        type: "generic",
        placeholder: "Codeforces / LeetCode / CodeChef / etc."
      },
      {
        name: "Describe a problem that took you a long time to solve. What was the key insight that cracked it?",
        type: "long-text",
        placeholder: "The approach you tried first, where you got stuck, and what finally worked"
      }
    ],
  },
  {
    department: "Data Science",
    questions: [
      {
        name: "What tools, libraries, or languages have you used for data analysis or machine learning (e.g. Python, pandas, scikit-learn, PyTorch)?",
        type: "generic",
        placeholder: "e.g., Python, pandas, NumPy, scikit-learn, PyTorch"
      },
      {
        name: "Describe a dataset or problem you've analyzed, even for a course or personal project. What did you find?",
        type: "generic",
        placeholder: "The dataset, your approach, and what you found or built"
      },
      {
        name: "How comfortable are you with the statistics and math behind machine learning (probability, linear algebra, etc.)?",
        type: "generic",
        placeholder: "e.g., Comfortable with the basics, still learning, strong foundation"
      },
      {
        name: "Link to a Kaggle profile, GitHub, or notebook you're proud of (optional).",
        type: "short-text",
        placeholder: "Kaggle / GitHub link"
      },
      {
        name: "Walk us through how you'd approach a messy, real-world dataset with missing and inconsistent values.",
        type: "long-text",
        placeholder: "Your step-by-step approach to cleaning and exploring the data"
      },
      {
        name: "Which excites you more: building models or communicating insights? Why, in one line?",
        type: "short-text",
        placeholder: "Pick one and give a one-line reason"
      },
      {
        name: "What's a real-world problem you'd want to solve with data, if you had the resources?",
        type: "long-text",
        placeholder: "The problem, why it matters, and roughly how you'd approach it"
      }
    ],
  },
  {
    department: "Design",
    questions: [
      {
        name: "What kind of design work do you enjoy most (posters, branding, social media graphics, motion/video), and why?",
        type: "long-text",
        placeholder: "Your favorite type of design work and what draws you to it"
      },
      {
        name: "Link to your portfolio, Instagram, Behance, or a Drive folder with your work.",
        type: "short-text",
        placeholder: "Portfolio / Instagram / Behance link"
      },
      {
        name: "Which design tools do you use most?",
        type: "short-text",
        placeholder: "e.g., Figma, Photoshop, Illustrator, Canva"
      },
      {
        name: "Describe a design you made that you're proud of. What was the brief and how did you approach it?",
        type: "generic",
        placeholder: "The brief, your process, and what you're proud of"
      },
      {
        name: "How do you handle feedback that conflicts with your creative vision for a piece?",
        type: "generic",
        placeholder: "Your approach to balancing feedback with your own instincts"
      },
      {
        name: "How would you design a poster to promote a club event? Walk us through your thinking in a few sentences.",
        type: "generic",
        placeholder: "Your approach: mood, colors, layout, what you'd emphasize"
      }
    ],
  },
  {
    department: "Game Development",
    questions: [
      {
        name: "Which game engines have you used?",
        type: "short-text",
        placeholder: "e.g., Unity, Unreal, Godot, or none yet"
      },
      {
        name: "What games have you built, even small prototypes or game-jam projects? Link them if you can.",
        type: "generic",
        placeholder: "What you built and a link (itch.io, GitHub, etc.) if available"
      },
      {
        name: "What's your favorite game (any genre) and what specifically about its design or mechanics makes it work?",
        type: "long-text",
        placeholder: "The game and what makes its design click for you"
      },
      {
        name: "Describe a game idea you've had. What's the core mechanic and why would it be fun?",
        type: "long-text",
        placeholder: "The core loop/mechanic and what makes it engaging"
      },
      {
        name: "Which part of game development interests you most: programming, art, sound, level design, or game design/systems?",
        type: "long-text",
        placeholder: "Pick your main interest and why"
      },
      {
        name: "Have you worked in a team on a creative project before? What was your role and one challenge you ran into?",
        type: "long-text",
        placeholder: "The project, your role, and a challenge you faced"
      },
      {
        name: "How would you go about learning a new engine or tool from scratch with limited documentation?",
        type: "generic",
        placeholder: "Your approach: tutorials, docs, community, trial and error, etc."
      }
    ],
  },
  {
    department: "Management",
    questions: [
      {
        name: "Have you organized or helped run an event before (college fest, workshop, competition)? Briefly describe your role.",
        type: "generic",
        placeholder: "The event and what you were responsible for"
      },
      {
        name: "How do you usually stay on top of deadlines and moving parts when coordinating something with multiple people?",
        type: "generic",
        placeholder: "Your approach to tracking tasks, people, and timelines"
      },
      {
        name: "Describe a time something went wrong during an event or project you were part of. How did you handle it?",
        type: "generic",
        placeholder: "What went wrong and how you responded in the moment"
      },
      {
        name: "Imagine you're managing logistics for a 200-person event (venue, budget, vendors, volunteers) with a 3-week runway. Walk us through your first week.",
        type: "long-text",
        placeholder: "Your priorities, who you'd talk to first, and what you'd lock down early"
      },
      {
        name: "Tell us about a time you had to convince a group of people (friends, teammates, a club) to do something your way. How did you approach it, and did it work?",
        type: "long-text",
        placeholder: "The situation, your approach, and the outcome"
      }
    ],
  },
  {
    department: "Outreach",
    questions: [
      {
        name: "How comfortable are you reaching out to strangers, companies, or other clubs to build a partnership or collaboration?",
        type: "generic",
        placeholder: "Your comfort level and any relevant experience"
      },
      {
        name: "Have you ever cold-emailed or cold-messaged someone (a sponsor, speaker, company) on behalf of a club or project? What happened?",
        type: "generic",
        placeholder: "Who you reached out to and how it went"
      },
      {
        name: "You need to find 3 sponsors for a college tech fest in a month with zero existing contacts. What's your plan?",
        type: "long-text",
        placeholder: "Your step-by-step approach to finding and pitching sponsors"
      },
      {
        name: "Describe a time you had to negotiate or persuade someone external to the club to say yes to something. What worked?",
        type: "long-text",
        placeholder: "The ask, your approach, and what got them to agree"
      },
      {
        name: "What's a community, company, or organization you think this club should partner with, and why?",
        type: "generic",
        placeholder: "The partner and the specific value it would bring"
      }
    ],
  },
  {
    department: "Publicity",
    questions: [
      {
        name: "What social media platforms or content formats are you most comfortable creating for?",
        type: "generic",
        placeholder: "e.g., Instagram Reels, carousel posts, YouTube edits"
      },
      {
        name: "Roughly how many hours a week can you dedicate to content creation during an active campaign?",
        type: "short-text",
        placeholder: "e.g., 2-4 hours"
      },
      {
        name: "What tools do you use for content creation or editing?",
        type: "generic",
        placeholder: "e.g., Canva, CapCut, Premiere Pro, Photoshop"
      }
    ],
  },
  {
    department: "UI/UX",
    questions: [
      {
        name: "Describe a UI or app design you find well-made and explain what specifically makes it work.",
        type: "long-text",
        placeholder: "The app/product and what makes its design effective"
      },
      {
        name: "Have you redesigned or improved an existing app/website interface, even informally? What did you change and why?",
        type: "long-text",
        placeholder: "What you changed and the reasoning behind it"
      },
      {
        name: "Link to your portfolio, Dribbble, Behance, or Figma community profile (if any).",
        type: "short-text",
        placeholder: "Portfolio / Figma / Dribbble link"
      },
      {
        name: "Which design tools do you use?",
        type: "generic",
        placeholder: "e.g., Figma, Adobe XD, Sketch"
      },
      {
        name: "Have you worked with a design system or component library before?",
        type: "short-text",
        placeholder: "e.g., No, but familiar with the concept"
      },
      {
        name: "How do you approach designing for accessibility (color contrast, screen readers, keyboard navigation, etc.)?",
        type: "generic",
        placeholder: "What accessibility considerations you keep in mind, if any"
      },
      {
        name: "Walk us through your design process from a brief to a finished mockup.",
        type: "generic",
        placeholder: "Your steps: research, wireframes, iteration, final design, etc."
      },
      {
        name: "Do you prefer working solo or pair-designing with another person?",
        type: "short-text",
        placeholder: "e.g., Solo, prefer pairing, depends on the project"
      },
      {
        name: "Any design communities or designers you follow for inspiration?",
        type: "short-text",
        placeholder: "e.g., specific designers, blogs, communities"
      },
      {
        name: "What's a product (app, website, or physical) whose UX you think is genuinely bad? What would you change?",
        type: "long-text",
        placeholder: "The product and the specific change you'd make"
      }
    ],
  },
  {
    department: "Web Development",
    questions: [
      {
        name: "Link your GitHub profile and describe 1-2 projects there you're most proud of.",
        type: "long-text",
        placeholder: "GitHub link plus a couple sentences on your best project(s)"
      },
      {
        name: "Why is \"it works on my machine\" a red flag in team development, and what concrete habits or setup choices do you use to ensure your code works on everyone else's environment too?",
        type: "generic",
        placeholder: "Your habits: lockfiles, env config, containers, documentation, etc."
      },
      {
        name: "Describe a bug that took you an unusually long time to track down. What was actually wrong, and how did you find it?",
        type: "long-text",
        placeholder: "What broke, your debugging process, and the actual root cause"
      },
      {
        name: "Given a slow-loading web page, what are the first three things you'd check to figure out why?",
        type: "long-text",
        placeholder: "e.g., network waterfall, bundle size, unoptimized images, render-blocking scripts"
      },
      {
        name: "Frontend framework or library you're most comfortable with.",
        type: "short-text",
        placeholder: "e.g., React, Vue, Svelte"
      },
      {
        name: "How do you approach making a website work well on both mobile and desktop?",
        type: "generic",
        placeholder: "Your approach to responsive design and testing across devices"
      },
      {
        name: "Have you worked with a backend or database before? Briefly describe what you built.",
        type: "generic",
        placeholder: "e.g., Node/Express + MongoDB, Firebase, Django -- what you built"
      },
      {
        name: "Preferred way to style a website.",
        type: "short-text",
        placeholder: "e.g., Tailwind CSS, plain CSS, styled-components"
      }
    ],
  },
];

// Sample Admin Data
export const sampleAdminHeader = [
  {
    Header: "SrNo",
    accessor: "srno",
  },
  {
    Header: "Name",
    accessor: "name",
  },
  {
    Header: "Email",
    accessor: "email",
  },
  {
    Header: "Department",
    accessor: "department",
  },
];

// Headers for CSV exports
export const CSV_Header = [
  {
    label: "Name",
    key: "Name",
  },
  {
    label: "Email",
    key: "Email",
  },
  {
    label: "Registration Number",
    key: "RegistrationNumber",
  },
  {
    label: "Phone",
    key: "Phone",
  },
  {
    label: "Department",
    key: "Department",
  },
  {
    label: "Shortlisted",
    key: "shortlisted",
  },
  {
    label: "Questions",
    key: "Questions",
  },
];

// Mailing Templates
export const mailingTemplate = {
  Interview:
    "<p>Edit content</p><br><p>Thank you for applying to Organization Name. We are excited to let you know that you have been shortlisted for joining the #dept Department!</p><p>We look forward to your active participation!</p>",
};

