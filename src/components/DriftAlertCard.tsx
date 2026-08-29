import { ArrowDown, ArrowUp, CheckCircle2, CircleAlert, MessagesSquare } from 'lucide-react';

const evidence = [
  {
    label: 'Meeting load',
    value: '−31%',
    note: 'moved as intended',
    icon: ArrowDown,
    iconClass: 'text-[var(--dir-less)]',
  },
  {
    label: 'After-hours activity',
    value: '−25%',
    note: 'then reversed in the sustainability window',
    icon: ArrowUp,
    iconClass: 'text-[var(--dir-more)]',
  },
  {
    label: 'Chat load',
    value: '+22%',
    note: 'same team, same period',
    icon: ArrowUp,
    iconClass: 'text-[var(--dir-more)]',
  },
  {
    label: 'Data Ops',
    value: '+44%',
    note: 'a team the control never touched',
    icon: ArrowUp,
    iconClass: 'text-[var(--dir-more)]',
  },
];

const DriftAlertCard = () => {
  return (
    <div className="relative rounded-container border border-[#E2E8F0] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.08)] sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-brand" aria-hidden="true" />
            <span className="text-caption font-bold uppercase tracking-[0.12em] text-brand">
              Completed control review
            </span>
          </div>
          <h3 className="text-lead font-bold text-[#0F172A]">
            Removed three recurring status meetings
          </h3>
          <p className="mt-1 text-caption text-[#475569]">
            Before, after and sustainability periods compared
          </p>
        </div>
      </div>

      <div className="mb-5 space-y-2.5">
        {evidence.map((item) => (
          <div
            key={item.label}
            className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-control bg-[#F8FAFC] p-3"
          >
            <div className="rounded-control bg-[#F1F5F9] p-2">
              <item.icon className={`h-4 w-4 ${item.iconClass}`} aria-hidden="true" />
            </div>
            <div>
              <p className="text-caption font-semibold text-[#0F172A]">{item.label}</p>
              <p className="text-caption text-[#475569]">{item.note}</p>
            </div>
            <span className="text-caption font-bold text-[#0F172A]">{item.value}</span>
          </div>
        ))}
      </div>

      <div className="rounded-container border border-[#E2E8F0] bg-[#F8FAFC] p-4">
        <div className="flex gap-3">
          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
          <div>
            <p className="text-caption font-bold text-[#0F172A]">
              Possible workload migration. Initial improvement was not sustained.
            </p>
            <p className="mt-1 text-caption text-[#334155]">
              Mixed evidence — workers reported the work became harder.
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 border-t border-[#E2E8F0] pt-3 text-caption font-semibold text-[#475569]">
          <MessagesSquare className="h-4 w-4" aria-hidden="true" />
          Awaiting a human decision. SignalTrue never closes a case.
        </div>
      </div>
    </div>
  );
};

export default DriftAlertCard;
