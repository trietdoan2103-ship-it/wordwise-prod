interface RewardCardProps {
  /** Emoji or icon for the reward */
  icon: string;
  /** Reward name, e.g. "USA Stamp" */
  title: string;
  /** Category label, e.g. "Visa Stamp" */
  subtitle: string;
  /** Staggered animation delay in milliseconds */
  delay: number;
}

/**
 * RewardCard — displays a single unlocked reward (stamp, badge, or gift).
 *
 * Styled via `.reward-card` in globals.css.
 * Uses an inline `animationDelay` for staggered reveal.
 */
export default function RewardCard({
  icon,
  title,
  subtitle,
  delay,
}: RewardCardProps) {
  return (
    <div
      className="reward-card"
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className="reward-card-icon" aria-hidden="true">
        {icon}
      </span>
      <h3 className="reward-card-title">{title}</h3>
      <p className="reward-card-subtitle">{subtitle}</p>
    </div>
  );
}
