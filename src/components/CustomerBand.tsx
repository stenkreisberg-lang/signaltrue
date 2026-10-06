import { useEffect, useRef } from 'react';

type Customer = {
  name: string;
  strong?: string;
  logo?: string;
};

const customers: Customer[] = [
  { name: 'Tehnopol' },
  { name: 'Nobel Digital', strong: 'Nobel' },
  { name: 'Cleveron' },
  { name: 'Sharewell', strong: 'Share' },
  { name: 'Rutwol' },
];

const Wordmark = ({ customer }: { customer: Customer }) => {
  if (!customer.strong) return <span className="customer-wordmark">{customer.name}</span>;
  const rest = customer.name.slice(customer.strong.length);
  return (
    <span className="customer-wordmark">
      <b>{customer.strong}</b>
      <i>{rest}</i>
    </span>
  );
};

const CustomerBand = () => {
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = carouselRef.current;
    if (!element) return undefined;
    const setWidth = () => {
      element.style.setProperty('--customer-carousel-width', `${element.clientWidth}px`);
    };
    setWidth();
    const observer = new ResizeObserver(setWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const track = [...customers, ...customers];

  return (
    <section className="border-b border-border bg-background py-10" aria-labelledby="customer-band-label">
      <div className="mx-auto max-w-6xl px-4">
        <p id="customer-band-label" className="mb-6 text-center text-caption uppercase tracking-[0.12em] text-muted-foreground">
          Organisations where SignalTrue has been used or evaluated
        </p>
        <div className="customer-carousel" ref={carouselRef}>
          <ul className="customer-track">
            {track.map((customer, index) => (
              <li className="customer-slide" key={`${customer.name}-${index}`} aria-hidden={index >= customers.length}>
                {customer.logo ? <img src={customer.logo} alt={customer.name} loading="lazy" /> : <Wordmark customer={customer} />}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default CustomerBand;
