import { safeWebUrl } from '../features/portfolio/urls';
import github from '../assets/platforms/github.svg';
import facebook from '../assets/platforms/facebook.svg';
import instagram from '../assets/platforms/instagram.svg';
import youtube from '../assets/platforms/youtube.svg';
import x from '../assets/platforms/x.svg';
import tiktok from '../assets/platforms/tiktok.svg';
import './platform-icon.css';
const platforms = [
  { name: 'GitHub', domains: ['github.com'], icon: github },
  { name: 'Facebook', domains: ['facebook.com', 'fb.com'], icon: facebook },
  { name: 'Instagram', domains: ['instagram.com'], icon: instagram },
  { name: 'YouTube', domains: ['youtube.com', 'youtu.be'], icon: youtube },
  { name: 'X', domains: ['x.com', 'twitter.com'], icon: x },
  { name: 'TikTok', domains: ['tiktok.com'], icon: tiktok },
  { name: 'LinkedIn', domains: ['linkedin.com'], icon: '' },
];
export function platformForUrl(url: string) {
  const safe = safeWebUrl(url);
  if (!safe) return undefined;
  const host = new URL(safe).hostname.toLowerCase();
  return platforms.find((p) =>
    p.domains.some((domain) => host === domain || host.endsWith('.' + domain)),
  );
}
export function PlatformIcon({ url }: { url: string }) {
  const platform = platformForUrl(url);
  return (
    <span className="platform-icon" aria-hidden="true">
      {platform?.icon ? (
        <img src={platform.icon} alt="" width="18" height="18" />
      ) : platform?.name === 'LinkedIn' ? (
        <span className="linkedin-mark">in</span>
      ) : (
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        >
          <circle cx="12" cy="12" r="9" />
          <ellipse cx="12" cy="12" rx="4" ry="9" />
          <path d="M3 12h18M5 6h14M5 18h14" />
        </svg>
      )}
    </span>
  );
}
