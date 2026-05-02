import React from 'react';

interface Props {
  title: string;
  description?: React.ReactNode;
  eyebrow?: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<Props> = ({ title, description, eyebrow, actions }) => (
  <div className="flex items-start justify-between gap-4 mb-6 lg:mb-8 flex-wrap">
    <div className="min-w-0">
      {eyebrow && (
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[--accent-primary] mb-2">
          {eyebrow}
        </p>
      )}
      <h1 className="text-[22px] sm:text-[26px] font-bold text-white tracking-tight leading-tight">
        {title}
      </h1>
      {description && (
        <p className="text-sm text-[--text-secondary] mt-1.5 max-w-xl leading-relaxed">
          {description}
        </p>
      )}
    </div>
    {actions && <div className="flex items-center gap-2 shrink-0 flex-wrap">{actions}</div>}
  </div>
);

interface SectionProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const Section: React.FC<SectionProps> = ({ title, description, actions, children, className }) => (
  <section className={className}>
    {(title || actions) && (
      <div className="flex items-end justify-between gap-3 mb-3">
        <div>
          {title && <h2 className="text-sm font-semibold text-white">{title}</h2>}
          {description && <p className="text-xs text-[--text-muted] mt-0.5">{description}</p>}
        </div>
        {actions}
      </div>
    )}
    {children}
  </section>
);

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`rounded-xl bg-[--bg-secondary] border border-[--border] ${className}`}>
    {children}
  </div>
);

export const StatCard: React.FC<{
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  accent?: string;
  icon?: React.ReactNode;
}> = ({ label, value, hint, accent = 'var(--text-primary)', icon }) => (
  <div className="rounded-xl bg-[--bg-secondary] border border-[--border] p-4 flex items-start justify-between gap-3">
    <div className="min-w-0 flex-1">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[--text-muted] mb-1.5">{label}</p>
      <p className="text-2xl font-bold tabular-nums leading-none truncate" style={{ color: accent }}>{value}</p>
      {hint && <p className="text-[11px] text-[--text-muted] mt-2 truncate">{hint}</p>}
    </div>
    {icon && (
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', color: accent }}>
        {icon}
      </div>
    )}
  </div>
);
