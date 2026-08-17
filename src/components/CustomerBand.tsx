/*
 * Customer band
 *
 * Names the organizations measuring work health with SignalTrue. Wordmarks are
 * used until logo files are supplied — to swap one in, add `logo` with an
 * imported/hosted image path and it renders in place of the text.
 */

type Customer = {
  name: string;
  logo?: string;
};

const customers: Customer[] = [
  { name: 'Tehnopol' },
  { name: 'Nobel Digital' },
  { name: 'Cleveron' },
  { name: 'Sharewell' },
  { name: 'Rutwol' },
];

const CustomerBand = () => {
  return (
    <section
      className="border-b border-border bg-background py-10"
      aria-labelledby="customer-band-label"
    >
      <div className="mx-auto max-w-6xl px-4">
        <p
          id="customer-band-label"
          className="mb-6 text-center text-xs uppercase tracking-[0.12em] text-muted-foreground"
        >
          Measuring work health at
        </p>
        <ul className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
          {customers.map((customer) => (
            <li key={customer.name}>
              {customer.logo ? (
                <img
                  src={customer.logo}
                  alt={customer.name}
                  className="h-8 w-auto opacity-75 transition-opacity hover:opacity-100"
                  loading="lazy"
                />
              ) : (
                <span className="whitespace-nowrap text-lg font-semibold text-foreground opacity-75 transition-opacity hover:opacity-100">
                  {customer.name}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default CustomerBand;
