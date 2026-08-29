const WorkloadMigrationSection = () => (
  <section className="bg-[#F8FAFC] py-16 lg:py-20">
    <div className="container mx-auto px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 max-w-3xl">
          <p className="mb-4 text-caption font-bold uppercase tracking-wider text-brand">
            Workload migration
          </p>
          <h2 className="mb-5 text-section font-bold text-[#0F172A]">
            Less activity in one place does not always mean less demand.
          </h2>
          <p className="text-body text-[#475569]">
            SignalTrue compares related channels, times and teams. When the intended measure
            improves but demand rises elsewhere, it raises a question for workers and leaders to
            investigate—not an automatic conclusion.
          </p>
        </div>

        <figure className="overflow-x-auto rounded-container border border-[#E2E8F0] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)] sm:p-6">
          <svg
            className="h-auto min-w-[640px] w-full"
            viewBox="0 0 760 330"
            role="img"
            aria-label="Across the control review, meeting load falls by 31 percent at week zero and remains lower, while chat coordination rises through week zero and reaches 22 percent above baseline. The trends cross around week two."
          >
            <rect x="349" y="26" width="371" height="250" fill="var(--color-brand-softer)" />

            <line x1="68" y1="86" x2="720" y2="86" stroke="var(--color-border)" />
            <line x1="68" y1="216" x2="720" y2="216" stroke="var(--color-border)" />
            <line x1="68" y1="276" x2="720" y2="276" stroke="var(--color-border-strong)" />

            <text x="68" y="46" fill="var(--color-text)" fontSize="13" fontWeight="700">
              Meeting load
            </text>
            <text x="68" y="176" fill="var(--color-text)" fontSize="13" fontWeight="700">
              Chat coordination
            </text>

            <line
              x1="349"
              y1="20"
              x2="349"
              y2="276"
              stroke="var(--color-border-strong)"
              strokeWidth="1"
            />
            <text x="349" y="16" fill="var(--color-text-muted)" fontSize="12" textAnchor="middle">
              control implemented
            </text>

            <polyline
              points="68,72 115,69 162,73 209,68 256,71 303,69 349,70 396,118 443,126 490,129 537,127 584,130 631,128 678,130 720,128"
              fill="none"
              stroke="var(--dir-less)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <text x="608" y="112" fill="var(--dir-less)" fontSize="13" fontWeight="700">
              ↓ 31% meetings
            </text>

            <polyline
              points="68,226 115,224 162,221 209,217 256,210 303,199 349,188 396,169 443,145 490,128 537,113 584,101 631,88 678,76 720,67"
              fill="none"
              stroke="var(--dir-more)"
              strokeWidth="3"
              strokeDasharray="8 5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <text x="586" y="56" fill="var(--dir-more)" fontSize="13" fontWeight="700">
              ↑ 22% chat
            </text>

            {[-6, -4, -2, 0, 2, 4, 6].map((week, index) => (
              <g key={week}>
                <line
                  x1={68 + index * 108.67}
                  y1="276"
                  x2={68 + index * 108.67}
                  y2="281"
                  stroke="var(--color-border-strong)"
                />
                <text
                  x={68 + index * 108.67}
                  y="299"
                  fill="var(--color-text-muted)"
                  fontSize="12"
                  textAnchor="middle"
                >
                  {week > 0 ? `+${week}` : week}
                </text>
              </g>
            ))}
            <text x="394" y="321" fill="var(--color-text-muted)" fontSize="12" textAnchor="middle">
              weeks from control implementation
            </text>
          </svg>

          <figcaption className="mt-4 border-t border-[#E2E8F0] pt-4 text-caption font-semibold text-[#334155]">
            Meeting load fell. Coordination did not. Whether one caused the other is a question for
            the team, not for the data.
          </figcaption>
        </figure>
      </div>
    </div>
  </section>
);

export default WorkloadMigrationSection;
