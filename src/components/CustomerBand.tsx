/*
 * Customer band
 *
 * Names the organizations measuring work health with SignalTrue, as a
 * continuously scrolling carousel showing three marks at a time.
 *
 * Marks are set in the site's own typeface and inherit the current text colour,
 * so they follow the page theme and stay optically consistent with each other:
 * one size, one tracking, with the compound names weighted two-tone. They are
 * SignalTrue's own typographic wordmarks, not the customers' logo artwork.
 *
 * To use a company's real logo, set `logo` to a file in /public and it renders
 * in place of the wordmark, grayscale at the same height. Keep their written
 * permission on record — Cleveron and Tehnopol both require it for
 * non-editorial use.
 */
import { useEffect, useRef } from 'react';

type Customer = {
  name: string;
  /** Leading part set in bold; the rest of `name` follows in regular weight. */
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
  if (!customer.strong) {
    return <span className="customer-wordmark">{customer.name}</span>;
  }

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

  // Slides are sized from the carousel's own width so exactly three are
  // visible regardless of the container or viewport.
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

  // The track holds two copies of the list; the animation scrolls exactly one
  // copy's width, so the sequence repeats without a visible jump.
  const track = [...customers, ...customers];

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

        <div className="customer-carousel" ref={carouselRef}>
          <ul className="customer-track">
            {track.map((customer, index) => (
              <li
                className="customer-slide"
                key={`${customer.name}-${index}`}
                aria-hidden={index >= customers.length}
              >
                {customer.logo ? (
                  <img src={customer.logo} alt={customer.name} loading="lazy" />
                ) : (
                  <Wordmark customer={customer} />
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default CustomerBand;
