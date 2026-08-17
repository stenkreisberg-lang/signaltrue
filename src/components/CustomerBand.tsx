/*
 * Customer band
 *
 * Names the organizations measuring work health with SignalTrue, as a
 * continuously scrolling carousel showing three marks at a time.
 *
 * The files in /public/logos are SignalTrue-drawn typographic wordmarks, not
 * the customers' official logos — they give the band one consistent voice
 * without redistributing anyone's trademark artwork. To use a company's real
 * logo, replace its file with the asset they supply and keep the permission on
 * record; Cleveron and Tehnopol both require written approval for non-editorial
 * use. Every mark renders in grayscale at a uniform height either way.
 */
import { useEffect, useRef } from 'react';

type Customer = {
  name: string;
  logo?: string;
};

const customers: Customer[] = [
  { name: 'Tehnopol', logo: '/logos/tehnopol.svg' },
  { name: 'Nobel Digital', logo: '/logos/nobel-digital.svg' },
  { name: 'Cleveron', logo: '/logos/cleveron.svg' },
  { name: 'Sharewell', logo: '/logos/sharewell.svg' },
  { name: 'Rutwol', logo: '/logos/rutwol.svg' },
];

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
                  <span className="text-foreground">{customer.name}</span>
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
