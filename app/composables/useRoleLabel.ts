const ROLE_LABELS: Record<string, string> = {
  dev: "Developer",
  design: "Designer",
  qa: "QA",
  growth: "Growth",
  management: "Management",
};

export function useRoleLabel() {
  const getRoleLabel = (roleType: string | null | undefined): string | null => {
    if (!roleType) return null;
    return ROLE_LABELS[roleType] || roleType;
  };

  return { getRoleLabel };
}
