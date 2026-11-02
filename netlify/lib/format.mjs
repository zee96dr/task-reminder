export function humanize(totalMinutes) {
  const d = Math.floor(totalMinutes / 1440);
  const h = Math.floor((totalMinutes % 1440) / 60);
  const m = totalMinutes % 60;
  const parts = [];
  if (d) parts.push(`${d} day${d > 1 ? "s" : ""}`);
  if (h) parts.push(`${h} hour${h > 1 ? "s" : ""}`);
  if (m) parts.push(`${m} minute${m > 1 ? "s" : ""}`);
  return parts.join(" ");
}

export function formatDeadline(iso) {
  const s = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Karachi",
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
  return `${s} (Asia/Karachi)`;
}

// Same layout for me and for the group.
export function buildMessage(task, minutes) {
  const lines = [`⏳ ${humanize(minutes)} remaining`, "", `📌 ${task.title}`];
  if (task.note && task.note.trim()) lines.push(`📝 ${task.note.trim()}`);
  lines.push(`🗓 Deadline: ${formatDeadline(task.deadline)}`);
  return lines.join("\n");
}
