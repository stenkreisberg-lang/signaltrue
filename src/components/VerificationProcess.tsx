import { ArrowRight, CalendarRange, PauseCircle, RefreshCw, ShieldCheck } from 'lucide-react';

const windows = [
  {
    label: 'Before',
    detail: 'Establish the team’s own baseline and record the intended change.',
    icon: CalendarRange,
  },
  {
    label: 'Buffer',
    detail: 'Allow the control to settle before drawing a comparison.',
    icon: PauseCircle,
  },
  {
    label: 'After',
    detail: 'Compare the same work-pattern measures after implementation.',
    icon: ShieldCheck,
  },
  {
    label: 'Sustainability',
    detail: 'Check whether the change held or the earlier pattern returned.',
    icon: RefreshCw,
  },
];

const VerificationProcess = () => (
  <section className="border-y border-[#E2E8F0] bg-white py-16 lg:py-20">
    <div className="container mx-auto px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <p className="mb-4 text-caption font-bold uppercase tracking-wider text-brand">
            How verification works
          </p>
          <h2 className="mb-4 text-section font-bold text-[#0F172A]">
            Compare the change, then check whether it held.
          </h2>
          <p className="text-body text-[#475569]">
            A control review keeps four periods distinct so an initial improvement is not mistaken
            for a durable result.
          </p>
        </div>

        <ol className="grid gap-4 md:grid-cols-4">
          {windows.map((window, index) => (
            <li
              key={window.label}
              className="relative rounded-container border border-[#E2E8F0] p-5"
            >
              <div className="mb-5 flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-container bg-brand-softer">
                  <window.icon className="h-5 w-5 text-brand" aria-hidden="true" />
                </div>
                {index < windows.length - 1 && (
                  <ArrowRight
                    className="hidden h-5 w-5 translate-x-8 text-[#94A3B8] md:block"
                    aria-hidden="true"
                  />
                )}
              </div>
              <p className="text-caption font-bold uppercase tracking-wider text-brand">
                {index + 1}. {window.label}
              </p>
              <p className="mt-2 text-caption text-[#475569]">{window.detail}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  </section>
);

export default VerificationProcess;
