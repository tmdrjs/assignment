import type {
  AboutParagraph,
  CareerEntry,
  ContactLink,
  Profile,
  Project,
  SkillGroup,
} from "../types/portfolio";

/**
 * ⚠️ 대괄호 `[ ]` 로 감싼 값은 placeholder다.
 * PRD 22절에 따라 확인되지 않은 정보는 만들어내지 않았다. 본인 정보로 교체해서 쓴다.
 */
export const profile: Profile = {
  name: "[이름]",
  role: "Frontend Developer",
  heroHeading: [
    "안녕하세요,",
    "사용자 경험을 코드로 만드는",
    "개발자 [이름]입니다.",
  ],
  heroSubtext:
    "웹과 모바일 환경에서 실제 사용자가 편리하게 사용할 수 있는 서비스를 만드는 것에 관심이 있습니다.",
};

/** About (PRD 6절) - 관심 분야 · 문제 해결 방식 · 학습 방식 · 협업 방식 */
export const about: AboutParagraph[] = [
  "[개발을 시작하게 된 계기를 한두 문장으로 작성합니다.]",
  "[관심 있는 분야와 문제를 해결할 때 중요하게 생각하는 것을 작성합니다.]",
  "[새로운 기술을 배우는 방식과 팀에서 협업하는 방식을 작성합니다.]",
];

/** Skills (PRD 3 · 7절) - 실제로 사용한 기술만 적는다. */
export const skillGroups: SkillGroup[] = [
  {
    category: "Frontend",
    items: [
      { name: "React" },
      { name: "React Native" },
      { name: "TypeScript" },
      { name: "JavaScript" },
      { name: "HTML" },
      { name: "CSS" },
    ],
  },
  {
    category: "Backend / Database",
    items: [{ name: "Supabase" }],
  },
  {
    category: "Tools",
    items: [
      { name: "Git" },
      { name: "GitHub" },
      { name: "VS Code" },
      { name: "Figma" },
    ],
  },
];

/** Projects (PRD 8절) - 실제 프로젝트로 교체한다. */
export const projects: Project[] = [
  {
    id: "project-1",
    name: "[프로젝트 이름]",
    summary: "[프로젝트 한 줄 설명]",
    stack: ["[사용 기술]"],
    period: "[기간]",
  },
];

/** Career / Education (PRD 12절) */
export const education: CareerEntry[] = [
  { title: "[학교명]", detail: "[전공]", period: "[기간]" },
];

export const activities: CareerEntry[] = [
  { title: "[활동명]", detail: "[역할 · 내용]", period: "[기간]" },
];

/** Contact (PRD 13절) */
export const contactLinks: ContactLink[] = [
  { label: "Email", value: "[이메일 주소]" },
  { label: "GitHub", value: "[GitHub URL]" },
];
