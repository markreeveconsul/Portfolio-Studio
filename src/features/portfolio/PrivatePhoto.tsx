import { useEffect, useState } from 'react';
import { photoService } from './photos';
import type { PhotoService } from './photos';

export function PrivatePhoto({
  path,
  name,
  service = photoService,
}: {
  path?: string | null;
  name: string;
  service?: PhotoService;
}) {
  const [image, setImage] = useState<{ path: string; url: string } | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    let objectUrl = '';
    setImage(null);
    setFailed(false);
    if (path)
      service
        .download(path)
        .then((blob) => {
          if (!active) return;
          objectUrl = URL.createObjectURL(blob);
          setImage({ path, url: objectUrl });
        })
        .catch(() => {
          if (active) setFailed(true);
        });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path, service]);
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('') || '?';
  return (
    <div className="private-photo">
      {image && image.path === path && !failed ? (
        <img
          className="portfolio-photo"
          src={image.url}
          alt={`${name || 'Your'} profile photo`}
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="portfolio-initials" aria-label="Profile initials">
          {initials}
        </span>
      )}
      {failed && <small>Photo unavailable</small>}
    </div>
  );
}
