import { useState } from "react";
import {
  Target,
  Plus,
  Flame,
  CheckCircle2,
  Archive,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  BookOpen,
  Sparkles,
  Calendar,
  MoreVertical,
  MessageSquare,
  X,
  ArrowRight,
  TrendingUp,
  Users,
  Code,
  Presentation,
  Brain,
  Zap,
} from "lucide-react";

// ─── Color tokens (matching Trellis dark theme) ───
const colors = {
  bg: "#0f1419",
  card: "#1a2029",
  cardBorder: "#2a3441",
  cardBorderHover: "rgba(20,184,166,0.3)",
  surface: "#232d3a",
  surfaceLight: "#2a3441",
  text: "#f3f4f6",
  textSecondary: "#9ca3af",
  textMuted: "#6b7280",
  primary: "#14b8a6",
  primaryDim: "rgba(20,184,166,0.12)",
  primaryBorder: "rgba(20,184,166,0.25)",
  green: "#22c55e",
  greenDim: "rgba(34,197,94,0.12)",
  amber: "#f59e0b",
  amberDim: "rgba(245,158,11,0.12)",
  red: "#ef4444",
  purple: "#a78bfa",
  purpleDim: "rgba(167,139,250,0.1)",
  blue: "#60a5fa",
};

// ─── Goal categories with icons and colors ───
const CATEGORIES = [
  { id: "skill", label: "Skill Development", icon: Brain, color: colors.primary, bgColor: colors.primaryDim },
  { id: "career", label: "Career Growth", icon: TrendingUp, color: colors.green, bgColor: colors.greenDim },
  { id: "project", label: "Project Milestone", icon: Target, color: colors.blue, bgColor: "rgba(96,165,250,0.12)" },
  { id: "leadership", label: "Leadership", icon: Users, color: colors.purple, bgColor: colors.purpleDim },
];

const CATEGORY_PLACEHOLDERS = {
  skill: "e.g., Get comfortable leading sprint retrospectives",
  career: "e.g., Move into a senior developer role by Q4",
  project: "e.g., Launch the new onboarding flow for v2.0",
  leadership: "e.g., Mentor two junior developers this quarter",
};

const CATEGORY_TIPS = {
  skill: "Good skill goals are specific enough that you'd know when you've achieved them. Instead of 'get better at presenting,' try 'deliver 3 team presentations by Q3.'",
  career: "Career goals work best with a clear timeline and measurable milestones. Think about what evidence would show you've grown.",
  project: "Project milestones should have a clear definition of done. Break larger deliverables into checkpoints you can celebrate along the way.",
  leadership: "Leadership goals can be hard to measure. Try anchoring them to specific actions — meetings led, people mentored, initiatives started.",
};

const GOAL_SUGGESTIONS = {
  dev: [
    "Contribute to 2 open-source projects this quarter",
    "Reduce average PR review turnaround to under 4 hours",
    "Learn a new framework and build a proof of concept",
  ],
  design: [
    "Run 3 user testing sessions this quarter",
    "Create a component library for the design system",
    "Present a UX case study to the team",
  ],
  general: [
    "Improve public speaking by presenting at 2 team meetings",
    "Complete a professional certification",
    "Build a stronger feedback habit — give feedback weekly",
  ],
};

// ─── Sample data ───
const SAMPLE_GOALS = [
  {
    id: "1",
    title: "Get comfortable leading sprint retrospectives",
    category: "skill",
    targetDate: "2026-06-30",
    milestones: [
      { id: "m1", title: "Shadow 2 retros run by experienced facilitators", done: true },
      { id: "m2", title: "Co-facilitate a retro with Josh", done: true },
      { id: "m3", title: "Solo-facilitate 3 retros", done: false },
      { id: "m4", title: "Get feedback from team on facilitation style", done: false },
    ],
    description: "I want to become a confident facilitator so I can take this off Josh's plate and grow my leadership skills.",
    status: "active",
    daysLeft: 75,
    hasRelatedFeedback: true,
  },
  {
    id: "2",
    title: "Reduce average PR review turnaround to under 4 hours",
    category: "project",
    targetDate: "2026-05-15",
    milestones: [
      { id: "m5", title: "Audit current review times for baseline", done: true },
      { id: "m6", title: "Set up PR notification workflow", done: false },
    ],
    description: null,
    status: "active",
    daysLeft: 29,
    hasRelatedFeedback: false,
  },
  {
    id: "3",
    title: "Complete AWS Solutions Architect certification",
    category: "career",
    targetDate: null,
    milestones: [],
    description: null,
    status: "active",
    daysLeft: null,
    hasRelatedFeedback: false,
  },
];

// ─── Reusable components ───

function ProgressRing({ progress, size = 56 }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (circumference * progress) / 100;
  const color = progress === 100 ? colors.green : colors.primary;

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={radius} stroke={colors.surfaceLight} strokeWidth="4" fill="none" />
        <circle cx={size/2} cy={size/2} r={radius} stroke={color} strokeWidth="4" fill="none"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.5s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: colors.textSecondary }}>{Math.round(progress)}%</span>
      </div>
    </div>
  );
}

function Badge({ children, color = colors.textMuted, bg = colors.surface, icon: Icon }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 500,
      padding: "2px 8px", borderRadius: 6, color, backgroundColor: bg,
    }}>
      {Icon && <Icon size={12} />}
      {children}
    </span>
  );
}

function CategoryChip({ cat, selected, onClick }) {
  const Icon = cat.icon;
  const isSelected = selected === cat.id;
  return (
    <button onClick={() => onClick(cat.id)} style={{
      display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 10,
      border: `1.5px solid ${isSelected ? cat.color : colors.cardBorder}`,
      background: isSelected ? cat.bgColor : "transparent",
      color: isSelected ? cat.color : colors.textSecondary,
      cursor: "pointer", fontSize: 13, fontWeight: 500, transition: "all 0.15s ease",
      whiteSpace: "nowrap",
    }}>
      <Icon size={16} />
      {cat.label}
    </button>
  );
}

// ─── Goal Card (enhanced) ───

function GoalCard({ goal, onViewDetails }) {
  const [showNotes, setShowNotes] = useState(false);
  const completedMilestones = goal.milestones.filter(m => m.done).length;
  const totalMilestones = goal.milestones.length;
  const progress = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;
  const cat = CATEGORIES.find(c => c.id === goal.category);

  const getDateBadge = () => {
    if (!goal.targetDate) return { label: "No target date", color: colors.textMuted, bg: colors.surface, icon: Calendar };
    if (goal.daysLeft <= 0) return { label: "Overdue", color: colors.red, bg: "rgba(239,68,68,0.12)", icon: Calendar };
    if (goal.daysLeft <= 7) return { label: `${goal.daysLeft} days left`, color: colors.amber, bg: colors.amberDim, icon: Calendar };
    if (goal.daysLeft <= 30) return { label: `${goal.daysLeft} days left`, color: colors.primary, bg: colors.primaryDim, icon: Calendar };
    return { label: `${goal.daysLeft} days left`, color: colors.green, bg: colors.greenDim, icon: Calendar };
  };

  const dateBadge = getDateBadge();

  return (
    <div style={{
      background: colors.card, border: `1px solid ${colors.cardBorder}`, borderRadius: 12,
      padding: 20, transition: "all 0.2s ease", cursor: "pointer",
    }}
    onMouseEnter={e => e.currentTarget.style.borderColor = colors.cardBorderHover}
    onMouseLeave={e => e.currentTarget.style.borderColor = colors.cardBorder}
    >
      <div style={{ display: "flex", gap: 16 }}>
        {/* Progress ring */}
        {totalMilestones > 0 && <ProgressRing progress={progress} />}

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: colors.text, lineHeight: 1.4, margin: 0 }}>
              {goal.title}
            </p>
            <button style={{ background: "none", border: "none", color: colors.textMuted, cursor: "pointer", padding: 4, flexShrink: 0 }}>
              <MoreVertical size={16} />
            </button>
          </div>

          {/* Meta badges */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            {cat && <Badge color={cat.color} bg={cat.bgColor} icon={cat.icon}>{cat.label}</Badge>}
            <Badge color={dateBadge.color} bg={dateBadge.bg} icon={dateBadge.icon}>{dateBadge.label}</Badge>
            {totalMilestones > 0 && (
              <Badge color={colors.textSecondary} bg={colors.surface}>
                {completedMilestones}/{totalMilestones} milestones
              </Badge>
            )}
          </div>

          {/* Related feedback nudge */}
          {goal.hasRelatedFeedback && (
            <div style={{
              marginTop: 12, padding: "8px 12px", borderRadius: 8,
              background: colors.primaryDim, border: `1px solid ${colors.primaryBorder}`,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <Sparkles size={14} style={{ color: colors.primary }} />
              <span style={{ fontSize: 12, color: colors.primary }}>
                Recent feedback relates to this goal
              </span>
              <ArrowRight size={12} style={{ color: colors.primary, marginLeft: "auto" }} />
            </div>
          )}

          {/* Stale goal nudge */}
          {totalMilestones === 0 && !goal.description && goal.status === "active" && (
            <div style={{
              marginTop: 12, padding: "8px 12px", borderRadius: 8,
              background: colors.amberDim, display: "flex", alignItems: "center", gap: 8,
            }}>
              <Lightbulb size={14} style={{ color: colors.amber }} />
              <span style={{ fontSize: 12, color: colors.amber }}>
                Add milestones to make progress easier to track
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
        <button style={{
          display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8,
          border: "none", background: colors.greenDim, color: colors.green,
          fontSize: 13, fontWeight: 500, cursor: "pointer",
        }}>
          <CheckCircle2 size={14} /> Mark Complete
        </button>
        <div style={{ marginLeft: "auto" }}>
          <button onClick={() => setShowNotes(!showNotes)} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 8,
            border: "none", background: "transparent", color: colors.textMuted,
            fontSize: 13, cursor: "pointer",
          }}>
            {showNotes ? <ChevronUp size={14} /> : <MessageSquare size={14} />}
            {showNotes ? "Hide Notes" : "Notes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Create Goal Modal (enhanced) ───

function CreateGoalModal({ isOpen, onClose }) {
  const [category, setCategory] = useState(null);
  const [title, setTitle] = useState("");
  const [showTemplate, setShowTemplate] = useState(false);
  const [targetDate, setTargetDate] = useState("");

  if (!isOpen) return null;

  const selectedCat = CATEGORIES.find(c => c.id === category);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
    }}>
      <div style={{
        background: colors.card, borderRadius: 16, width: "100%", maxWidth: 640,
        border: `1px solid ${colors.cardBorder}`, maxHeight: "90vh", overflow: "auto",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "20px 24px", borderBottom: `1px solid ${colors.cardBorder}`,
        }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: colors.text }}>Create New Goal</h2>
          <button onClick={onClose} style={{
            background: "none", border: "none", color: colors.textMuted, cursor: "pointer", padding: 4,
          }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Category Picker */}
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: colors.textSecondary, marginBottom: 10 }}>
              What kind of goal is this?
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {CATEGORIES.map(cat => (
                <CategoryChip key={cat.id} cat={cat} selected={category} onClick={setCategory} />
              ))}
            </div>
          </div>

          {/* Category tip */}
          {category && (
            <div style={{
              display: "flex", gap: 10, padding: "12px 14px", borderRadius: 10,
              background: colors.primaryDim, border: `1px solid ${colors.primaryBorder}`,
            }}>
              <Lightbulb size={16} style={{ color: colors.primary, flexShrink: 0, marginTop: 2 }} />
              <p style={{ margin: 0, fontSize: 13, color: colors.primary, lineHeight: 1.5 }}>
                {CATEGORY_TIPS[category]}
              </p>
            </div>
          )}

          {/* Title */}
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: colors.textSecondary, marginBottom: 8 }}>
              Title <span style={{ color: colors.red }}>*</span>
            </label>
            <input
              value={title} onChange={e => setTitle(e.target.value)}
              placeholder={category ? CATEGORY_PLACEHOLDERS[category] : "e.g., Improve public speaking skills"}
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 10, fontSize: 14,
                border: `1.5px solid ${colors.cardBorder}`, background: colors.surface,
                color: colors.text, outline: "none", boxSizing: "border-box",
              }}
              onFocus={e => e.target.style.borderColor = colors.primary}
              onBlur={e => e.target.style.borderColor = colors.cardBorder}
            />
            {title.length > 0 && title.length < 10 && (
              <p style={{ fontSize: 12, color: colors.red, marginTop: 4 }}>Minimum 10 characters</p>
            )}
          </div>

          {/* Description with template option */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: colors.textSecondary }}>
                Description (Optional)
              </label>
              {!showTemplate && (
                <button onClick={() => setShowTemplate(true)} style={{
                  display: "flex", alignItems: "center", gap: 4, background: "none", border: "none",
                  color: colors.primary, fontSize: 12, fontWeight: 500, cursor: "pointer",
                }}>
                  <BookOpen size={12} /> Use a template
                </button>
              )}
            </div>

            {showTemplate ? (
              <div style={{
                background: colors.surface, border: `1.5px solid ${colors.cardBorder}`,
                borderRadius: 10, padding: 16,
              }}>
                {/* Fake rich text toolbar */}
                <div style={{
                  display: "flex", gap: 2, paddingBottom: 10, marginBottom: 12,
                  borderBottom: `1px solid ${colors.cardBorder}`,
                }}>
                  {["B", "I", "List", "Tasks"].map(btn => (
                    <span key={btn} style={{
                      padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                      color: colors.textMuted, background: "transparent", cursor: "pointer",
                    }}>{btn}</span>
                  ))}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: colors.primary }}>Why this goal matters to me:</p>
                    <p style={{ margin: "4px 0 0", fontSize: 13, color: colors.textMuted, fontStyle: "italic" }}>What's driving this? How does it connect to your growth?</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: colors.primary }}>What success looks like:</p>
                    <p style={{ margin: "4px 0 0", fontSize: 13, color: colors.textMuted, fontStyle: "italic" }}>How will you know you've achieved this?</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: colors.primary }}>First step I'll take:</p>
                    <p style={{ margin: "4px 0 0", fontSize: 13, color: colors.textMuted, fontStyle: "italic" }}>What's one small action you can do this week?</p>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{
                background: colors.surface, border: `1.5px solid ${colors.cardBorder}`,
                borderRadius: 10, minHeight: 120,
              }}>
                <div style={{
                  display: "flex", gap: 2, padding: "8px 12px",
                  borderBottom: `1px solid ${colors.cardBorder}`,
                }}>
                  {["B", "I", "List", "Tasks"].map(btn => (
                    <span key={btn} style={{
                      padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                      color: colors.textMuted,
                    }}>{btn}</span>
                  ))}
                </div>
                <div style={{ padding: "12px 14px" }}>
                  <p style={{ margin: 0, fontSize: 13, color: colors.textMuted }}>
                    Add details, bullet points, or checklist items to track your progress
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Target Date with nudge */}
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: colors.textSecondary, marginBottom: 8 }}>
              Target Date (Optional)
            </label>
            <input
              type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)}
              style={{
                padding: "10px 14px", borderRadius: 10, fontSize: 14,
                border: `1.5px solid ${colors.cardBorder}`, background: colors.surface,
                color: colors.text, outline: "none", colorScheme: "dark",
              }}
            />
            {!targetDate && (
              <p style={{ fontSize: 12, color: colors.textMuted, marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
                <TrendingUp size={12} style={{ color: colors.green }} />
                <span>Goals with deadlines are more likely to get done</span>
              </p>
            )}
          </div>

          {/* Role-based suggestions */}
          {!title && (
            <div style={{
              background: colors.surface, borderRadius: 10, padding: 16,
              border: `1px solid ${colors.cardBorder}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <Zap size={14} style={{ color: colors.amber }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: colors.textSecondary }}>
                  Need ideas? Popular goals for developers:
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {GOAL_SUGGESTIONS.dev.map((s, i) => (
                  <button key={i} onClick={() => setTitle(s)} style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8,
                    border: `1px solid ${colors.cardBorder}`, background: "transparent",
                    color: colors.textSecondary, fontSize: 13, cursor: "pointer", textAlign: "left",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = colors.primaryBorder; e.currentTarget.style.color = colors.text; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = colors.cardBorder; e.currentTarget.style.color = colors.textSecondary; }}
                  >
                    <ArrowRight size={12} style={{ flexShrink: 0 }} />
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: "flex", justifyContent: "flex-end", gap: 10,
          padding: "16px 24px", borderTop: `1px solid ${colors.cardBorder}`,
        }}>
          <button onClick={onClose} style={{
            padding: "8px 16px", borderRadius: 8, border: "none",
            background: "transparent", color: colors.textSecondary, fontSize: 14,
            fontWeight: 500, cursor: "pointer",
          }}>Cancel</button>
          <button style={{
            padding: "8px 20px", borderRadius: 8, border: "none",
            background: title.length >= 10 ? colors.primary : colors.surfaceLight,
            color: title.length >= 10 ? "#fff" : colors.textMuted,
            fontSize: 14, fontWeight: 600, cursor: title.length >= 10 ? "pointer" : "default",
            transition: "all 0.15s ease",
          }}>Create Goal</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Goals Page ───

export default function GoalsPrototype() {
  const [activeTab, setActiveTab] = useState("active");
  const [showModal, setShowModal] = useState(false);

  const tabs = [
    { id: "active", label: "Active", icon: Flame, count: 3 },
    { id: "completed", label: "Completed", icon: CheckCircle2, count: 1 },
    { id: "archived", label: "Archived", icon: Archive, count: 2 },
  ];

  return (
    <div style={{ background: colors.bg, minHeight: "100vh", color: colors.text, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ display: "flex" }}>

        {/* Sidebar */}
        <div style={{
          width: 240, borderRight: `1px solid ${colors.cardBorder}`, padding: "24px 0",
          display: "flex", flexDirection: "column", height: "100vh", position: "sticky", top: 0,
          background: colors.bg,
        }}>
          <div style={{ padding: "0 20px", marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: colors.primary, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>T</span>
              </div>
              <span style={{ fontSize: 17, fontWeight: 700, color: colors.text }}>Trellis</span>
            </div>
          </div>

          {[
            { label: "Dashboard", active: false },
            { section: "PERSONAL" },
            { label: "Submit", active: false },
            { label: "Brag Bucket", active: false },
            { label: "Insights", active: false },
            { label: "Feedback", active: false, badge: 3 },
            { label: "Goals", active: true },
            { label: "Reviews", active: false },
            { section: "BUDDY" },
            { label: "Buddies", active: false },
            { label: "Feedback", active: false, badge: 1 },
            { label: "Goals", active: false },
            { label: "Reviews", active: false },
          ].map((item, i) =>
            item.section ? (
              <p key={i} style={{
                fontSize: 11, fontWeight: 600, color: colors.textMuted, letterSpacing: "0.05em",
                padding: "16px 20px 6px", margin: 0,
              }}>{item.section}</p>
            ) : (
              <div key={i} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "8px 20px", margin: "1px 8px", borderRadius: 8,
                background: item.active ? colors.primaryDim : "transparent",
                color: item.active ? colors.primary : colors.textSecondary,
                fontSize: 14, fontWeight: item.active ? 600 : 400,
                cursor: "pointer",
              }}>
                <span>{item.label}</span>
                {item.badge && (
                  <span style={{
                    background: colors.primary, color: "#fff", fontSize: 11, fontWeight: 600,
                    width: 20, height: 20, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
                  }}>{item.badge}</span>
                )}
              </div>
            )
          )}
        </div>

        {/* Main content */}
        <div style={{ flex: 1, padding: "32px 40px", maxWidth: 1100 }}>

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, color: colors.text }}>Goals</h1>
              <p style={{ margin: "8px 0 0", color: colors.textSecondary, fontSize: 15 }}>
                Track and manage your personal development goals
              </p>
            </div>
            <button onClick={() => setShowModal(true)} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 10,
              border: "none", background: colors.primary, color: "#fff", fontSize: 14,
              fontWeight: 600, cursor: "pointer",
            }}>
              <Plus size={16} /> Add Goal
            </button>
          </div>

          {/* Tabs */}
          <div style={{
            display: "flex", background: colors.surface, borderRadius: 12, padding: 4, marginBottom: 24,
          }}>
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                  flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "10px 16px", borderRadius: 10, border: "none",
                  background: isActive ? colors.card : "transparent",
                  color: isActive ? colors.text : colors.textMuted,
                  fontSize: 14, fontWeight: isActive ? 600 : 400, cursor: "pointer",
                  boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.2)" : "none",
                  transition: "all 0.15s ease",
                }}>
                  <Icon size={16} />
                  {tab.label}
                  {tab.count > 0 && (
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: "1px 7px", borderRadius: 10,
                      background: isActive ? colors.surfaceLight : "transparent",
                      color: isActive ? colors.textSecondary : colors.textMuted,
                    }}>{tab.count}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Goals Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
            {SAMPLE_GOALS.map(goal => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
          </div>
        </div>
      </div>

      {/* Modal */}
      <CreateGoalModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
}
