import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import {
  MessageSquare, Target, Calendar, Star, ChevronRight, Clock, TrendingUp,
  CheckCircle2, AlertCircle, Send, Eye, ArrowUpRight, Sparkles, Flame, Plus,
  Users, FileCheck, BookOpen, UserCheck
} from "lucide-react";

// ─── Mock Data ───────────────────────────────────────────────────────────────

const USER = {
  name: "Alex",
  preferredName: "Alex",
  avatarUrl: null,
  buddyName: "Tobi Oluwole",
  buddyAvatar: null,
  role: "Growth",
};

const REVIEW = {
  scheduledDate: "2026-04-28",
  buddyName: "Tobi Oluwole",
  // Prep from the reviewee's perspective:
  hasCheckedFeedback: true,       // Have they looked at their recent feedback?
  goalsUpdated: false,            // Are goals current (updated in last 2 weeks)?
  bragBucketFresh: true,          // Added to brag bucket since last review?
  feedbackReceived: 6,            // Total feedback received since last review
  activeGoals: 3,
};

const FEEDBACK_ACTIVITY = [
  { week: "W1", given: 1, received: 0 },
  { week: "W2", given: 2, received: 1 },
  { week: "W3", given: 1, received: 2 },
  { week: "W4", given: 0, received: 1 },
  { week: "W5", given: 3, received: 2 },
  { week: "W6", given: 2, received: 3 },
  { week: "W7", given: 1, received: 1 },
  { week: "W8", given: 2, received: 2 },
  { week: "W9", given: 3, received: 1 },
  { week: "W10", given: 1, received: 3 },
  { week: "W11", given: 2, received: 2 },
  { week: "W12", given: 0, received: 1 },
];

const TIMELINE_EVENTS = [
  { id: 1, type: "feedback_received", text: "You received feedback from Tobi Oluwole", time: "2 hours ago", icon: "message", unread: true },
  { id: 2, type: "feedback_received", text: "You received feedback from Jess McAllister", time: "Yesterday", icon: "message", unread: true },
  { id: 3, type: "goal_milestone", text: "Milestone completed: \"Draft stakeholder update template\"", time: "Yesterday", icon: "target" },
  { id: 4, type: "brag", text: "You added to your brag bucket: \"Led first client demo solo\"", time: "2 days ago", icon: "star" },
  { id: 5, type: "feedback_given", text: "You submitted feedback for Matteo Rossi", time: "3 days ago", icon: "send" },
  { id: 6, type: "buddy_feedback", text: "Matteo submitted feedback for your buddy, Marcin Kowalski", time: "4 days ago", icon: "send" },
  { id: 7, type: "review_completed", text: "Review with Tobi completed", time: "2 weeks ago", icon: "calendar" },
];

const GOALS = [
  { id: 1, text: "Improve stakeholder communication", milestones: 3, completed: 2, targetDate: "2026-05-15" },
  { id: 2, text: "Lead a cross-team initiative", milestones: 4, completed: 1, targetDate: "2026-06-30" },
  { id: 3, text: "Build expertise in data storytelling", milestones: 2, completed: 0, targetDate: "2026-07-01" },
];

const SENTIMENT = { positive: 68, constructive: 22, neutral: 10 };

const THEMES = ["Communication", "Leadership", "Proactiveness", "Detail-oriented"];

// ─── Buddy Data (only shown if user IS a buddy for others) ──────────────────

const IS_BUDDY = true; // Toggle to show/hide buddy section

const BUDDEES = [
  {
    id: 1,
    name: "Marcin Kowalski",
    role: "Dev",
    initials: "MK",
    nextReview: "2026-05-05",
    feedbackToPublish: 3,
    feedbackTotal: 7,        // total received since last review
    lastFeedbackGiven: "3 days ago",
    goalsActive: 2,
    status: "on_track",      // on_track | needs_attention | review_soon
  },
  {
    id: 2,
    name: "Priya Sharma",
    role: "Design",
    initials: "PS",
    nextReview: "2026-04-18",
    feedbackToPublish: 1,
    feedbackTotal: 4,
    lastFeedbackGiven: "1 week ago",
    goalsActive: 3,
    status: "review_soon",
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysUntil(dateStr) {
  const now = new Date("2026-04-10");
  const target = new Date(dateStr);
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

function progressPercent(completed, total) {
  return total === 0 ? 0 : Math.round((completed / total) * 100);
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const colors = {
  bg: "#0f1419",
  surface: "#1a1f26",
  surfaceHover: "#222830",
  surfaceLight: "#252b33",
  border: "#2a3040",
  borderLight: "#343d4f",
  text: "#e8ecf1",
  textSecondary: "#8b95a5",
  textMuted: "#5c6778",
  teal: "#2dd4a8",
  tealDim: "rgba(45,212,168,0.12)",
  tealGlow: "rgba(45,212,168,0.25)",
  purple: "#a78bfa",
  purpleDim: "rgba(167,139,250,0.12)",
  amber: "#fbbf24",
  amberDim: "rgba(251,191,36,0.12)",
  blue: "#60a5fa",
  blueDim: "rgba(96,165,250,0.12)",
  rose: "#fb7185",
  roseDim: "rgba(251,113,133,0.12)",
  green: "#4ade80",
  greenDim: "rgba(74,222,128,0.12)",
};

// ─── Sub-Components ──────────────────────────────────────────────────────────

function ReviewCountdown() {
  const days = daysUntil(REVIEW.scheduledDate);

  const prepItems = [
    { label: "Review your recent feedback", done: REVIEW.hasCheckedFeedback, detail: `${REVIEW.feedbackReceived} received since last review`, href: "/feedback/inbox" },
    { label: "Update your goals", done: REVIEW.goalsUpdated, detail: `${REVIEW.activeGoals} active goals`, href: "/goals" },
    { label: "Add to your brag bucket", done: REVIEW.bragBucketFresh, detail: "Have wins ready to discuss", href: "/brag-bucket" },
  ];
  const prepDone = prepItems.filter(p => p.done).length;
  const percent = progressPercent(prepDone, prepItems.length);

  return (
    <div style={{
      background: `linear-gradient(135deg, ${colors.surface} 0%, ${colors.surfaceLight} 100%)`,
      border: `1px solid ${colors.border}`,
      borderRadius: 16,
      padding: 28,
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Subtle accent glow */}
      <div style={{
        position: "absolute", top: -40, right: -40,
        width: 120, height: 120,
        background: colors.tealGlow,
        borderRadius: "50%",
        filter: "blur(60px)",
        pointerEvents: "none",
      }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Calendar size={16} color={colors.teal} />
            <span style={{ fontSize: 12, fontWeight: 600, color: colors.teal, textTransform: "uppercase", letterSpacing: 1 }}>
              Next Review
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 48, fontWeight: 700, color: colors.text, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
              {days}
            </span>
            <span style={{ fontSize: 16, color: colors.textSecondary }}>days away</span>
          </div>
          <p style={{ fontSize: 14, color: colors.textSecondary, margin: 0 }}>
            April 28 with {REVIEW.buddyName}
          </p>
        </div>

        {/* Circular progress */}
        <div style={{ position: "relative", width: 80, height: 80, flexShrink: 0 }}>
          <svg viewBox="0 0 80 80" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="40" cy="40" r="34" fill="none" stroke={colors.border} strokeWidth="6" />
            <circle
              cx="40" cy="40" r="34" fill="none"
              stroke={colors.teal}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 34}`}
              strokeDashoffset={`${2 * Math.PI * 34 * (1 - percent / 100)}`}
              style={{ transition: "stroke-dashoffset 0.8s ease" }}
            />
          </svg>
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: colors.text }}>{prepDone}/{prepItems.length}</span>
            <span style={{ fontSize: 10, color: colors.textMuted }}>ready</span>
          </div>
        </div>
      </div>

      {/* Prep checklist — things the reviewee can do to prepare */}
      <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
          Prepare for your review
        </span>
        {prepItems.map((item, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 12px",
            background: item.done ? colors.tealDim : "transparent",
            border: item.done ? "none" : `1px solid transparent`,
            borderRadius: 8,
            cursor: "pointer",
            transition: "background 0.15s",
          }}
            onMouseEnter={e => { if (!item.done) e.currentTarget.style.background = colors.surfaceHover; }}
            onMouseLeave={e => { if (!item.done) e.currentTarget.style.background = "transparent"; }}
          >
            {item.done
              ? <CheckCircle2 size={16} color={colors.teal} />
              : <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${colors.textMuted}`, flexShrink: 0 }} />
            }
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{
                fontSize: 13, display: "block",
                color: item.done ? colors.teal : colors.text,
                opacity: item.done ? 0.85 : 1,
              }}>{item.label}</span>
              <span style={{ fontSize: 11, color: colors.textMuted }}>{item.detail}</span>
            </div>
            {!item.done && <ChevronRight size={14} color={colors.textMuted} />}
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickActions() {
  const actions = [
    { icon: <Send size={18} />, label: "Submit feedback", color: colors.teal, bg: colors.tealDim, href: "/feedback/give" },
    { icon: <Plus size={18} />, label: "Add to brag bucket", color: colors.amber, bg: colors.amberDim, href: "/brag-bucket" },
    { icon: <Target size={18} />, label: "Update goals", color: colors.purple, bg: colors.purpleDim, href: "/goals" },
  ];

  return (
    <div style={{ display: "flex", gap: 10 }}>
      {actions.map((a, i) => (
        <button key={i} style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          padding: "12px 16px",
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: 12,
          color: a.color,
          fontSize: 13, fontWeight: 500,
          cursor: "pointer",
          transition: "all 0.15s",
        }}
          onMouseEnter={e => { e.currentTarget.style.background = a.bg; e.currentTarget.style.borderColor = a.color + "40"; }}
          onMouseLeave={e => { e.currentTarget.style.background = colors.surface; e.currentTarget.style.borderColor = colors.border; }}
        >
          {a.icon}
          {a.label}
        </button>
      ))}
    </div>
  );
}

function ActivityFeed() {
  const iconMap = {
    message: <MessageSquare size={15} />,
    target: <Target size={15} />,
    star: <Star size={15} />,
    send: <Send size={15} />,
    calendar: <Calendar size={15} />,
  };
  const colorMap = {
    feedback_received: colors.teal,
    goal_milestone: colors.purple,
    brag: colors.amber,
    feedback_given: colors.blue,
    buddy_feedback: colors.blue,
    review_completed: colors.green,
  };

  return (
    <div style={{
      background: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: 16,
      padding: 24,
      flex: 1,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: colors.text }}>Recent Activity</h3>
        <span style={{ fontSize: 12, color: colors.textMuted, cursor: "pointer" }}>View all →</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {TIMELINE_EVENTS.map((event, i) => (
          <div key={event.id} style={{
            display: "flex", gap: 12, padding: "12px 0",
            borderBottom: i < TIMELINE_EVENTS.length - 1 ? `1px solid ${colors.border}` : "none",
            cursor: "pointer",
            alignItems: "flex-start",
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: colorMap[event.type] + "18",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: colorMap[event.type],
              flexShrink: 0,
              marginTop: 1,
            }}>
              {iconMap[event.icon]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                margin: 0, fontSize: 13, color: colors.text, lineHeight: 1.45,
                fontWeight: event.unread ? 600 : 400,
              }}>
                {event.text}
                {event.unread && (
                  <span style={{
                    display: "inline-block", width: 6, height: 6,
                    borderRadius: "50%", background: colors.teal,
                    marginLeft: 6, verticalAlign: "middle",
                  }} />
                )}
              </p>
              <span style={{ fontSize: 11, color: colors.textMuted }}>{event.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeedbackPulse() {
  return (
    <div style={{
      background: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: 16,
      padding: 24,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: colors.text }}>Feedback Pulse</h3>
        <span style={{ fontSize: 12, color: colors.textMuted }}>Last 12 weeks</span>
      </div>

      <ResponsiveContainer width="100%" height={140}>
        <AreaChart data={FEEDBACK_ACTIVITY} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="givenGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.teal} stopOpacity={0.3} />
              <stop offset="100%" stopColor={colors.teal} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="receivedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.purple} stopOpacity={0.3} />
              <stop offset="100%" stopColor={colors.purple} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="week" tick={{ fill: colors.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: colors.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              background: colors.surfaceLight, border: `1px solid ${colors.border}`,
              borderRadius: 8, fontSize: 12, color: colors.text,
            }}
          />
          <Area type="monotone" dataKey="given" stroke={colors.teal} fill="url(#givenGrad)" strokeWidth={2} name="Given" />
          <Area type="monotone" dataKey="received" stroke={colors.purple} fill="url(#receivedGrad)" strokeWidth={2} name="Received" />
        </AreaChart>
      </ResponsiveContainer>

      <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: colors.teal }} />
          <span style={{ fontSize: 12, color: colors.textSecondary }}>Given</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: colors.purple }} />
          <span style={{ fontSize: 12, color: colors.textSecondary }}>Received</span>
        </div>
      </div>
    </div>
  );
}

function GoalProgress() {
  return (
    <div style={{
      background: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: 16,
      padding: 24,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: colors.text }}>Goals</h3>
        <span style={{ fontSize: 12, color: colors.teal, cursor: "pointer", fontWeight: 500 }}>View all →</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {GOALS.map(goal => {
          const pct = progressPercent(goal.completed, goal.milestones);
          return (
            <div key={goal.id} style={{ cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: colors.text, fontWeight: 500 }}>{goal.text}</span>
                <span style={{ fontSize: 11, color: colors.textMuted, flexShrink: 0, marginLeft: 12 }}>
                  {goal.completed}/{goal.milestones}
                </span>
              </div>
              <div style={{
                height: 6, borderRadius: 3,
                background: colors.border,
                overflow: "hidden",
              }}>
                <div style={{
                  height: "100%", borderRadius: 3,
                  width: `${pct}%`,
                  background: pct === 100
                    ? colors.green
                    : pct > 50
                      ? colors.teal
                      : `linear-gradient(90deg, ${colors.purple}, ${colors.teal})`,
                  transition: "width 0.6s ease",
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InsightsBadge() {
  return (
    <div style={{
      background: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: 16,
      padding: 24,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <Sparkles size={16} color={colors.amber} />
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: colors.text }}>Feedback Themes</h3>
      </div>

      {/* Sentiment bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", gap: 2 }}>
          <div style={{ width: `${SENTIMENT.positive}%`, background: colors.teal, borderRadius: 4 }} />
          <div style={{ width: `${SENTIMENT.constructive}%`, background: colors.amber, borderRadius: 4 }} />
          <div style={{ width: `${SENTIMENT.neutral}%`, background: colors.textMuted, borderRadius: 4 }} />
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <span style={{ fontSize: 11, color: colors.teal }}>Positive {SENTIMENT.positive}%</span>
          <span style={{ fontSize: 11, color: colors.amber }}>Constructive {SENTIMENT.constructive}%</span>
          <span style={{ fontSize: 11, color: colors.textMuted }}>Neutral {SENTIMENT.neutral}%</span>
        </div>
      </div>

      {/* Theme tags */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {THEMES.map((theme, i) => (
          <span key={i} style={{
            padding: "5px 12px",
            borderRadius: 20,
            fontSize: 12, fontWeight: 500,
            background: [colors.tealDim, colors.purpleDim, colors.amberDim, colors.blueDim][i],
            color: [colors.teal, colors.purple, colors.amber, colors.blue][i],
          }}>
            {theme}
          </span>
        ))}
      </div>
    </div>
  );
}

function StreakBadge() {
  return (
    <div style={{
      background: `linear-gradient(135deg, ${colors.amberDim} 0%, transparent 100%)`,
      border: `1px solid ${colors.amber}30`,
      borderRadius: 16,
      padding: 24,
      display: "flex", alignItems: "center", gap: 16,
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: colors.amberDim,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Flame size={24} color={colors.amber} />
      </div>
      <div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{ fontSize: 28, fontWeight: 700, color: colors.amber, lineHeight: 1 }}>4</span>
          <span style={{ fontSize: 14, color: colors.textSecondary }}>week streak</span>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
          You've given feedback every week this month
        </p>
      </div>
    </div>
  );
}

function MiniStatRow() {
  const stats = [
    { label: "Unread feedback", value: "3", color: colors.teal, icon: <Eye size={14} /> },
    { label: "Pending to publish", value: "4", color: colors.amber, icon: <AlertCircle size={14} /> },
    { label: "Goals on track", value: "2/3", color: colors.purple, icon: <TrendingUp size={14} /> },
  ];

  return (
    <div style={{ display: "flex", gap: 10 }}>
      {stats.map((s, i) => (
        <div key={i} style={{
          flex: 1,
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: 12,
          padding: "14px 16px",
          display: "flex", alignItems: "center", gap: 10,
          cursor: "pointer",
          transition: "border-color 0.15s",
        }}
          onMouseEnter={e => e.currentTarget.style.borderColor = s.color + "50"}
          onMouseLeave={e => e.currentTarget.style.borderColor = colors.border}
        >
          <div style={{ color: s.color, opacity: 0.8 }}>{s.icon}</div>
          <div>
            <span style={{ fontSize: 20, fontWeight: 700, color: colors.text, lineHeight: 1 }}>{s.value}</span>
            <p style={{ margin: 0, fontSize: 11, color: colors.textMuted, marginTop: 2 }}>{s.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Buddy Section ───────────────────────────────────────────────────────────

function BuddeeCard({ buddee }) {
  const days = daysUntil(buddee.nextReview);
  const isUrgent = days <= 14;

  const statusColors = {
    on_track: { bg: colors.tealDim, text: colors.teal, label: "On track" },
    needs_attention: { bg: colors.amberDim, text: colors.amber, label: "Needs attention" },
    review_soon: { bg: colors.roseDim, text: colors.rose, label: `Review in ${days}d` },
  };
  const status = statusColors[buddee.status];

  return (
    <div style={{
      background: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: 14,
      padding: 20,
      cursor: "pointer",
      transition: "border-color 0.15s",
      flex: 1,
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = colors.purple + "50"}
      onMouseLeave={e => e.currentTarget.style.borderColor = colors.border}
    >
      {/* Header: Avatar + name + status */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: `linear-gradient(135deg, ${colors.purple}30, ${colors.teal}30)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, fontWeight: 600, color: colors.purple,
        }}>
          {buddee.initials}
        </div>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: colors.text, display: "block" }}>{buddee.name}</span>
          <span style={{ fontSize: 11, color: colors.textMuted }}>{buddee.role}</span>
        </div>
        <span style={{
          padding: "3px 10px", borderRadius: 12,
          fontSize: 11, fontWeight: 500,
          background: status.bg, color: status.text,
        }}>
          {status.label}
        </span>
      </div>

      {/* Key metrics */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <div style={{
          flex: 1, padding: "10px 12px", borderRadius: 8,
          background: buddee.feedbackToPublish > 0 ? colors.amberDim : colors.surfaceLight,
        }}>
          <span style={{
            fontSize: 18, fontWeight: 700, display: "block", lineHeight: 1,
            color: buddee.feedbackToPublish > 0 ? colors.amber : colors.text,
          }}>
            {buddee.feedbackToPublish}
          </span>
          <span style={{ fontSize: 10, color: colors.textMuted }}>To publish</span>
        </div>
        <div style={{ flex: 1, padding: "10px 12px", borderRadius: 8, background: colors.surfaceLight }}>
          <span style={{ fontSize: 18, fontWeight: 700, display: "block", lineHeight: 1, color: colors.text }}>
            {buddee.feedbackTotal}
          </span>
          <span style={{ fontSize: 10, color: colors.textMuted }}>Received</span>
        </div>
        <div style={{ flex: 1, padding: "10px 12px", borderRadius: 8, background: colors.surfaceLight }}>
          <span style={{ fontSize: 18, fontWeight: 700, display: "block", lineHeight: 1, color: colors.text }}>
            {buddee.goalsActive}
          </span>
          <span style={{ fontSize: 10, color: colors.textMuted }}>Goals</span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8 }}>
        {buddee.feedbackToPublish > 0 && (
          <button style={{
            flex: 1, padding: "8px 12px", borderRadius: 8,
            background: colors.purple, border: "none",
            color: "#fff", fontSize: 12, fontWeight: 500,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
            <FileCheck size={13} />
            Review & publish
          </button>
        )}
        <button style={{
          flex: buddee.feedbackToPublish > 0 ? 0 : 1,
          padding: "8px 12px", borderRadius: 8,
          background: "transparent", border: `1px solid ${colors.border}`,
          color: colors.textSecondary, fontSize: 12, fontWeight: 500,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          whiteSpace: "nowrap",
        }}>
          <Eye size={13} />
          View profile
        </button>
      </div>
    </div>
  );
}

function BuddySection() {
  const totalToPublish = BUDDEES.reduce((sum, b) => sum + b.feedbackToPublish, 0);
  const nextReviewBuddee = BUDDEES.reduce((earliest, b) =>
    daysUntil(b.nextReview) < daysUntil(earliest.nextReview) ? b : earliest
  );
  const nextDays = daysUntil(nextReviewBuddee.nextReview);

  return (
    <div>
      {/* Section header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: colors.purpleDim,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Users size={14} color={colors.purple} />
          </div>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: colors.text }}>Your Buddees</h2>
          <span style={{
            padding: "2px 8px", borderRadius: 10,
            fontSize: 11, fontWeight: 500,
            background: colors.purpleDim, color: colors.purple,
          }}>
            {BUDDEES.length}
          </span>
        </div>
        <span style={{ fontSize: 12, color: colors.purple, cursor: "pointer", fontWeight: 500 }}>
          View all →
        </span>
      </div>

      {/* Summary nudge bar */}
      {(totalToPublish > 0 || nextDays <= 14) && (
        <div style={{
          display: "flex", gap: 12, marginBottom: 14,
          padding: "12px 16px", borderRadius: 10,
          background: `linear-gradient(135deg, ${colors.purpleDim} 0%, transparent 100%)`,
          border: `1px solid ${colors.purple}20`,
          alignItems: "center",
        }}>
          <AlertCircle size={16} color={colors.purple} style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: colors.textSecondary }}>
            {totalToPublish > 0 && (
              <span>You have <strong style={{ color: colors.purple }}>{totalToPublish} feedback</strong> waiting to be published. </span>
            )}
            {nextDays <= 14 && (
              <span><strong style={{ color: colors.purple }}>{nextReviewBuddee.name}</strong>'s review is in {nextDays} days.</span>
            )}
          </span>
        </div>
      )}

      {/* Buddee cards */}
      <div style={{ display: "flex", gap: 14 }}>
        {BUDDEES.map(b => <BuddeeCard key={b.id} buddee={b} />)}
      </div>
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

export default function TrellisDashboard() {
  const [now, setNow] = useState(new Date("2026-04-10T09:30:00"));

  const getGreeting = () => {
    const h = now.getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: colors.bg,
      color: colors.text,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    }}>
      <div style={{
        maxWidth: 880,
        margin: "0 auto",
        padding: "48px 24px 80px",
      }}>
        {/* ── Header ── */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{
            margin: 0, fontSize: 28, fontWeight: 700,
            color: colors.text, lineHeight: 1.3,
          }}>
            {getGreeting()}, {USER.preferredName}
          </h1>
          <p style={{
            margin: 0, marginTop: 4,
            fontSize: 15, color: colors.textSecondary,
          }}>
            Your review with {REVIEW.buddyName} is in {daysUntil(REVIEW.scheduledDate)} days. Here's where you stand.
          </p>
        </div>

        {/* ── Quick Actions ── */}
        <div style={{ marginBottom: 20 }}>
          <QuickActions />
        </div>

        {/* ── Mini Stats ── */}
        <div style={{ marginBottom: 24 }}>
          <MiniStatRow />
        </div>

        {/* ── Primary: Review + Activity (2 columns) ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 16,
        }}>
          <ReviewCountdown />
          <ActivityFeed />
        </div>

        {/* ── Secondary: Streak + Feedback Pulse ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "280px 1fr",
          gap: 16,
          marginBottom: 16,
        }}>
          <StreakBadge />
          <FeedbackPulse />
        </div>

        {/* ── Tertiary: Goals + Insights ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
        }}>
          <GoalProgress />
          <InsightsBadge />
        </div>

        {/* ── Buddy Section (only if user is a buddy) ── */}
        {IS_BUDDY && (
          <>
            <div style={{
              height: 1,
              background: `linear-gradient(90deg, transparent, ${colors.border}, transparent)`,
              margin: "32px 0",
            }} />
            <BuddySection />
          </>
        )}
      </div>
    </div>
  );
}
