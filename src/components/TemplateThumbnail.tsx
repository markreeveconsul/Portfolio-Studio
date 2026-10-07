import './template-thumbnail.css';
export function TemplateThumbnail({ template }: { template: string }) {
  const resume = template === 'resume',
    showcase = template === 'showcase',
    modern = template === 'modern',
    creative = template === 'creative';
  const ink = creative ? '#713e2c' : modern ? '#234b4b' : '#273e43';
  return (
    <svg className="template-thumbnail" viewBox="0 0 240 150" aria-hidden="true" focusable="false">
      <rect width="240" height="150" fill={creative ? '#fff7ed' : '#fff'} />
      {modern && <rect width="78" height="150" fill="#e6eeeb" />}
      <g fill={ink}>
        <rect x="18" y="18" width={showcase ? 130 : resume ? 95 : 60} height={showcase ? 12 : 7} />
        <rect x="18" y={showcase ? 36 : 31} width="42" height="3" opacity=".35" />
      </g>
      {modern ? (
        <g fill={ink}>
          <circle cx="37" cy="66" r="14" opacity=".2" />
          {[40, 74, 108].map((y) => (
            <g key={y}>
              <rect x="94" y={y} width="60" height="4" />
              <rect x="94" y={y + 11} width="124" height="3" opacity=".2" />
              <rect x="94" y={y + 18} width="95" height="3" opacity=".2" />
            </g>
          ))}
        </g>
      ) : showcase ? (
        <g fill={ink}>
          {[61, 99].map((y, i) => (
            <g key={y}>
              <text x="18" y={y + 7} fontSize="8">
                0{i + 1}
              </text>
              <rect x="43" y={y} width="115" height="6" />
              <rect x="43" y={y + 13} width="173" height="3" opacity=".2" />
              <rect x="18" y={y + 29} width="198" height="1" opacity=".2" />
            </g>
          ))}
        </g>
      ) : creative ? (
        <g fill={ink}>
          <rect x="18" y="52" width="85" height="75" fill="#efdfca" />
          <rect x="116" y="52" width="105" height="75" fill="#efdfca" />
          <rect x="26" y="64" width="59" height="5" />
          <rect x="125" y="64" width="65" height="5" />
          {[80, 90, 100].map((y) => (
            <g key={y} opacity=".2">
              <rect x="26" y={y} width="64" height="3" />
              <rect x="125" y={y} width="79" height="3" />
            </g>
          ))}
        </g>
      ) : (
        <g fill={ink}>
          {[52, 80, 108].map((y) => (
            <g key={y}>
              <rect
                x="18"
                y={y}
                width={resume ? 198 : 54}
                height={resume ? 1 : 4}
                opacity={resume ? 0.4 : 1}
              />
              {resume && <rect x="18" y={y + 7} width="46" height="3" />}
              <rect
                x={resume ? 78 : 18}
                y={y + 11}
                width={resume ? 138 : 198}
                height="3"
                opacity=".25"
              />
              <rect
                x={resume ? 78 : 18}
                y={y + 18}
                width={resume ? 108 : 152}
                height="3"
                opacity=".15"
              />
            </g>
          ))}
        </g>
      )}
    </svg>
  );
}
